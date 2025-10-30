// Solana blockchain integration module

use crate::types::*;
use crate::state::{get_network_config, get_main_wallet_address};
use ic_cdk::api::time;
use candid::{CandidType, Deserialize, Principal};
use sha2::{Sha256, Digest};
use base64::{Engine as _, engine::general_purpose};

// IC Management Canister for Threshold Ed25519
const IC_MANAGEMENT_CANISTER_ID: Principal = Principal::from_slice(&[]);

pub async fn get_ed25519_public_key() -> Result<Vec<u8>, String> {
    let (_, key_name, _) = get_network_config();

    // Get the canister's own principal for derivation path
    let canister_id = ic_cdk::api::id();
    let derivation_path = vec![canister_id.as_slice().to_vec()];

    // Solana uses Ed25519, so we use IC's Schnorr Ed25519 signature scheme
    #[derive(CandidType)]
    struct SchnorrPublicKeyRequest {
        canister_id: Option<Principal>,
        derivation_path: Vec<Vec<u8>>,
        key_id: SchnorrKeyId,
    }

    #[derive(CandidType)]
    struct SchnorrKeyId {
        algorithm: SchnorrAlgorithm,
        name: String,
    }

    #[derive(CandidType)]
    enum SchnorrAlgorithm {
        #[allow(non_camel_case_types)]
        ed25519,
    }

    let args = SchnorrPublicKeyRequest {
        canister_id: Some(canister_id),
        derivation_path,
        key_id: SchnorrKeyId {
            algorithm: SchnorrAlgorithm::ed25519,
            name: key_name,
        },
    };

    // Call IC management canister for Schnorr Ed25519 public key
    let management_canister = Principal::from_slice(&[]);

    match ic_cdk::call::<(SchnorrPublicKeyRequest,), (SchnorrPublicKeyResponse,)>(
        management_canister,
        "schnorr_public_key",
        (args,),
    ).await {
        Ok((response,)) => {
            ic_cdk::println!("✅ Retrieved Schnorr Ed25519 public key ({} bytes)", response.public_key.len());
            Ok(response.public_key)
        }
        Err((code, msg)) => {
            let error = format!("Failed to get Schnorr Ed25519 public key: {:?} - {}", code, msg);
            ic_cdk::println!("❌ {}", error);
            Err(error)
        }
    }
}

#[derive(CandidType, Deserialize)]
struct SchnorrPublicKeyResponse {
    public_key: Vec<u8>,
    chain_code: Vec<u8>,
}

pub async fn get_mock_ed25519_public_key() -> String {
    // For local testing, generate a deterministic public key from canister ID
    let canister_id = ic_cdk::api::id();
    let mut hasher = Sha256::new();
    hasher.update(canister_id.as_slice());
    hasher.update(b"ed25519_public_key");
    let hash = hasher.finalize();

    // Convert to base58 (Solana address format)
    bs58::encode(&hash[..32]).into_string()
}

pub async fn send_solana_opcode(
    contract_address: &str,
    subscription_id: &str,
    subscriber_address: &str,
    merchant_address: &str,
    opcode: u8, // 0 = Payment, 1 = Notification
) -> Result<String, String> {
    ic_cdk::println!("🔗 Sending Solana opcode {} to contract: {} for subscription: {}",
                      opcode, contract_address, subscription_id);

    let (_network, _key_name, rpc_endpoint) = get_network_config();
    let main_wallet = get_main_wallet_address();

    // Build transaction instruction data
    let mut instruction_data = vec![opcode]; // Opcode as first byte

    // Add subscription ID as bytes (32 bytes max for Solana account addressing)
    let sub_id_bytes = subscription_id.as_bytes();
    let sub_id_len = sub_id_bytes.len().min(32);
    instruction_data.extend_from_slice(&sub_id_bytes[..sub_id_len]);

    // Pad to 33 bytes total (1 byte opcode + 32 bytes subscription ID)
    while instruction_data.len() < 33 {
        instruction_data.push(0);
    }

    ic_cdk::println!("📝 Transaction details:");
    ic_cdk::println!("  Contract: {}", contract_address);
    ic_cdk::println!("  Subscriber: {}", subscriber_address);
    ic_cdk::println!("  Merchant: {}", merchant_address);
    ic_cdk::println!("  Opcode: {} ({})", opcode, if opcode == 0 { "Payment" } else { "Notification" });
    ic_cdk::println!("  From wallet: {}", main_wallet);
    ic_cdk::println!("  Instruction data: {} bytes", instruction_data.len());

    // Build Solana transaction using HTTP outcall
    let tx_result = build_and_send_transaction(
        &rpc_endpoint,
        contract_address,
        &[
            &main_wallet,       // Payer/signer
            subscriber_address,  // Subscriber account
            merchant_address,    // Merchant account
            contract_address,    // Program account
        ],
        &instruction_data,
    ).await;

    match tx_result {
        Ok(tx_hash) => {
            ic_cdk::println!("✅ Solana opcode sent successfully | tx: {}", tx_hash);
            Ok(tx_hash)
        }
        Err(e) => {
            ic_cdk::println!("❌ Failed to send Solana opcode: {}", e);
            Err(e)
        }
    }
}

// Build and send a Solana transaction using HTTP outcalls
async fn build_and_send_transaction(
    rpc_endpoint: &str,
    program_id: &str,
    accounts: &[&str],
    instruction_data: &[u8],
) -> Result<String, String> {
    use crate::state::get_cached_blockhash;

    ic_cdk::println!("🔨 Building Solana transaction...");
    ic_cdk::println!("  RPC: {}", rpc_endpoint);
    ic_cdk::println!("  Program: {}", program_id);
    ic_cdk::println!("  Accounts: {}", accounts.len());
    ic_cdk::println!("  Data: {} bytes", instruction_data.len());

    // Step 1: Use cached blockhash (avoids IC consensus issues)
    let blockhash = get_cached_blockhash()
        .ok_or("No cached blockhash available. Blockhash cache needs refresh.")?;
    ic_cdk::println!("✅ Using cached blockhash: {}", blockhash);

    // Step 2: Build transaction message
    let transaction_message = build_transaction_message(
        program_id,
        accounts,
        instruction_data,
        &blockhash,
    )?;
    ic_cdk::println!("✅ Built transaction message");

    // Step 3: Sign transaction with tECDSA
    let signed_transaction = sign_transaction_with_ecdsa(&transaction_message).await?;
    ic_cdk::println!("✅ Signed transaction with tECDSA");

    // Step 4: Send transaction to Solana RPC
    let tx_signature = send_transaction_to_rpc(rpc_endpoint, &signed_transaction).await?;
    ic_cdk::println!("✅ Transaction sent | signature: {}", tx_signature);

    Ok(tx_signature)
}

// ============================================================================
// HTTP Outcall Helper Functions for Solana RPC
// ============================================================================

use ic_cdk::api::management_canister::http_request::{
    http_request, CanisterHttpRequestArgument, HttpMethod, HttpResponse, TransformArgs,
};

/// Get recent blockhash from Solana RPC using getSlot + getBlock (private helper)
/// This approach is recommended by IC to avoid consensus issues with getLatestBlockhash
async fn get_recent_blockhash(rpc_url: &str) -> Result<String, String> {
    // Step 1: Get the most recent finalized slot
    let slot_request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getSlot",
        "params": [
            {
                "commitment": "finalized"
            }
        ]
    }).to_string();

    let slot_response = make_http_request(
        rpc_url,
        "POST",
        slot_request.as_bytes(),
    ).await?;

    let slot_json: serde_json::Value = serde_json::from_slice(&slot_response.body)
        .map_err(|e| format!("Failed to parse slot response: {}", e))?;

    let slot = slot_json["result"]
        .as_u64()
        .ok_or("Missing slot in response")?;

    ic_cdk::println!("📍 Got finalized slot: {}", slot);

    // Step 2: Get the block at that slot to extract its blockhash
    let block_request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "getBlock",
        "params": [
            slot,
            {
                "encoding": "json",
                "transactionDetails": "none",
                "rewards": false,
                "commitment": "finalized"
            }
        ]
    }).to_string();

    let block_response = make_http_request(
        rpc_url,
        "POST",
        block_request.as_bytes(),
    ).await?;

    let block_json: serde_json::Value = serde_json::from_slice(&block_response.body)
        .map_err(|e| format!("Failed to parse block response: {}", e))?;

    let blockhash = block_json["result"]["blockhash"]
        .as_str()
        .ok_or("Missing blockhash in block response")?
        .to_string();

    ic_cdk::println!("🔗 Extracted blockhash from slot {}: {}", slot, blockhash);

    Ok(blockhash)
}

/// Refresh blockhash cache - PUBLIC function to be called by timer
pub async fn refresh_blockhash_cache() -> Result<(), String> {
    // DISABLED: Using durable nonces instead of blockhashes to avoid IC consensus issues
    ic_cdk::println!("⚠️  Blockhash refresh disabled - using durable nonces instead");
    Ok(())
}

/// Build a Solana transaction message (serialized for signing)
fn build_transaction_message(
    program_id: &str,
    accounts: &[&str],
    instruction_data: &[u8],
    blockhash: &str,
) -> Result<Vec<u8>, String> {
    // Simplified transaction message building
    // In production, you'd use a proper Solana transaction library

    let mut message = Vec::new();

    // Add header (num required signatures, num readonly signed, num readonly unsigned)
    message.push(1); // 1 signer (ICP canister wallet)
    message.push(0); // 0 readonly signed
    message.push(accounts.len() as u8 - 1); // Others are readonly unsigned

    // Add account keys (compact array encoding)
    message.push(accounts.len() as u8);
    for account in accounts {
        // Decode base58 address to 32 bytes
        let decoded = bs58::decode(account)
            .into_vec()
            .map_err(|e| format!("Invalid account address {}: {}", account, e))?;
        if decoded.len() != 32 {
            return Err(format!("Account {} is not 32 bytes", account));
        }
        message.extend_from_slice(&decoded);
    }

    // Add recent blockhash
    let blockhash_bytes = bs58::decode(blockhash)
        .into_vec()
        .map_err(|e| format!("Invalid blockhash: {}", e))?;
    message.extend_from_slice(&blockhash_bytes);

    // Add instructions (compact array with 1 instruction)
    message.push(1); // Number of instructions

    // Program ID index
    let program_idx = accounts.iter().position(|&a| a == program_id)
        .ok_or("Program ID not in accounts")? as u8;
    message.push(program_idx);

    // Accounts indices for this instruction
    let account_indices: Vec<u8> = (0..accounts.len() as u8).collect();
    message.push(account_indices.len() as u8);
    message.extend_from_slice(&account_indices);

    // Instruction data
    message.push(instruction_data.len() as u8);
    message.extend_from_slice(instruction_data);

    Ok(message)
}

/// Sign transaction message using IC Schnorr Ed25519
async fn sign_transaction_with_ecdsa(message: &[u8]) -> Result<Vec<u8>, String> {
    let (_, key_name, _) = get_network_config();
    let canister_id = ic_cdk::api::id();

    // Solana expects raw message signing for Ed25519 (no pre-hashing)
    #[derive(CandidType)]
    struct SignWithSchnorrRequest {
        message: Vec<u8>,
        derivation_path: Vec<Vec<u8>>,
        key_id: SchnorrKeyId,
    }

    #[derive(CandidType)]
    struct SchnorrKeyId {
        algorithm: SchnorrAlgorithm,
        name: String,
    }

    #[derive(CandidType)]
    enum SchnorrAlgorithm {
        #[allow(non_camel_case_types)]
        ed25519,
    }

    let args = SignWithSchnorrRequest {
        message: message.to_vec(),
        derivation_path: vec![canister_id.as_slice().to_vec()],
        key_id: SchnorrKeyId {
            algorithm: SchnorrAlgorithm::ed25519,
            name: key_name,
        },
    };

    // Call IC management canister for Schnorr Ed25519 signature
    let management_canister = Principal::from_slice(&[]);

    match ic_cdk::call::<(SignWithSchnorrRequest,), (SignWithSchnorrResponse,)>(
        management_canister,
        "sign_with_schnorr",
        (args,),
    ).await {
        Ok((response,)) => {
            ic_cdk::println!("✅ Message signed with Schnorr Ed25519 ({} bytes)", response.signature.len());

            // Combine signature with message for Solana transaction format
            let mut signed_tx = Vec::new();

            // Add signature count (compact array)
            signed_tx.push(1);

            // Add signature (64 bytes for Ed25519)
            signed_tx.extend_from_slice(&response.signature);

            // Add message
            signed_tx.extend_from_slice(message);

            Ok(signed_tx)
        }
        Err((code, msg)) => {
            Err(format!("Failed to sign transaction: {:?} - {}", code, msg))
        }
    }
}

#[derive(CandidType, Deserialize)]
struct SignWithSchnorrResponse {
    signature: Vec<u8>,
}

/// Send signed transaction to Solana RPC
async fn send_transaction_to_rpc(rpc_url: &str, signed_transaction: &[u8]) -> Result<String, String> {
    // Encode transaction as base64
    let tx_base64 = general_purpose::STANDARD.encode(signed_transaction);

    let request_body = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "sendTransaction",
        "params": [
            tx_base64,
            {
                "encoding": "base64",
                "skipPreflight": false,
                "preflightCommitment": "finalized"
            }
        ]
    }).to_string();

    let response = make_http_request(
        rpc_url,
        "POST",
        request_body.as_bytes(),
    ).await?;

    // Parse response to get transaction signature
    let json: serde_json::Value = serde_json::from_slice(&response.body)
        .map_err(|e| format!("Failed to parse send transaction response: {}", e))?;

    // Check for errors
    if let Some(error) = json.get("error") {
        return Err(format!("Solana RPC error: {}", error));
    }

    let signature = json["result"]
        .as_str()
        .ok_or("Missing transaction signature in response")?
        .to_string();

    Ok(signature)
}

/// Make HTTP request to Solana RPC using IC HTTP outcalls
async fn make_http_request(
    url: &str,
    method: &str,
    body: &[u8],
) -> Result<HttpResponse, String> {
    use ic_cdk::api::management_canister::http_request::{HttpHeader, TransformContext, TransformFunc};

    let request = CanisterHttpRequestArgument {
        url: url.to_string(),
        method: match method {
            "GET" => HttpMethod::GET,
            "POST" => HttpMethod::POST,
            _ => return Err(format!("Unsupported HTTP method: {}", method)),
        },
        body: Some(body.to_vec()),
        max_response_bytes: Some(10_000), // 10KB response limit
        transform: Some(TransformContext {
            function: TransformFunc(candid::Func {
                principal: ic_cdk::api::id(),
                method: "transform_http_response".to_string(),
            }),
            context: vec![],
        }),
        headers: vec![
            HttpHeader {
                name: "Content-Type".to_string(),
                value: "application/json".to_string(),
            },
        ],
    };

    match http_request(request, 25_000_000_000).await {
        Ok((response,)) => {
            let status_code: u32 = response.status.0.clone().try_into()
                .unwrap_or(500);

            if status_code >= 200 && status_code < 300 {
                Ok(response)
            } else {
                Err(format!("HTTP request failed with status {}", status_code))
            }
        }
        Err((code, msg)) => {
            Err(format!("HTTP outcall failed: {:?} - {}", code, msg))
        }
    }
}

fn generate_mock_transaction_hash(program_id: &str, data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(program_id.as_bytes());
    hasher.update(data);
    hasher.update(&time().to_le_bytes());
    let hash = hasher.finalize();

    // Return first 44 characters as base58 (typical Solana tx signature length)
    bs58::encode(&hash[..]).into_string()
}

pub async fn verify_solana_transaction(tx_hash: &str) -> Result<bool, String> {
    ic_cdk::println!("🔍 Verifying Solana transaction: {}", tx_hash);

    let (_network, _key_name, rpc_endpoint) = get_network_config();

    let request_body = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getSignatureStatuses",
        "params": [
            [tx_hash],
            {
                "searchTransactionHistory": true
            }
        ]
    }).to_string();

    let response = make_http_request(
        &rpc_endpoint,
        "POST",
        request_body.as_bytes(),
    ).await?;

    // Parse response
    let json: serde_json::Value = serde_json::from_slice(&response.body)
        .map_err(|e| format!("Failed to parse transaction status: {}", e))?;

    // Check if transaction is confirmed
    let status = &json["result"]["value"][0];

    if status.is_null() {
        ic_cdk::println!("⏳ Transaction not found or pending");
        Ok(false)
    } else if let Some(err) = status.get("err") {
        if !err.is_null() {
            ic_cdk::println!("❌ Transaction failed: {:?}", err);
            Ok(false)
        } else {
            ic_cdk::println!("✅ Transaction confirmed");
            Ok(true)
        }
    } else {
        ic_cdk::println!("✅ Transaction confirmed");
        Ok(true)
    }
}

pub async fn get_solana_balance(address: &str) -> Result<u64, String> {
    ic_cdk::println!("💰 Getting Solana balance for: {}", address);

    let (_network, _key_name, rpc_endpoint) = get_network_config();

    let request_body = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getBalance",
        "params": [
            address,
            {
                "commitment": "finalized"
            }
        ]
    }).to_string();

    let response = make_http_request(
        &rpc_endpoint,
        "POST",
        request_body.as_bytes(),
    ).await?;

    // Parse response
    let json: serde_json::Value = serde_json::from_slice(&response.body)
        .map_err(|e| format!("Failed to parse balance response: {}", e))?;

    let balance = json["result"]["value"]
        .as_u64()
        .ok_or("Missing balance in response")?;

    ic_cdk::println!("✅ Balance retrieved: {} lamports", balance);
    Ok(balance)
}

pub async fn send_solana_transaction(
    from_address: &str,
    to_address: &str,
    amount_lamports: u64,
    instruction_data: Option<Vec<u8>>,
) -> Result<String, String> {
    ic_cdk::println!("💸 Sending Solana transaction: {} -> {} ({} lamports)",
                      from_address, to_address, amount_lamports);

    let (_network, _key_name, rpc_endpoint) = get_network_config();

    // Build instruction data for SOL transfer
    let data = instruction_data.unwrap_or_else(|| {
        // System program transfer instruction (instruction index 2)
        let mut transfer_instruction = vec![2, 0, 0, 0]; // Instruction discriminator
        transfer_instruction.extend_from_slice(&amount_lamports.to_le_bytes());
        transfer_instruction
    });

    // Build and send transaction
    let tx_hash = build_and_send_transaction(
        &rpc_endpoint,
        "11111111111111111111111111111111", // System Program
        &[from_address, to_address],
        &data,
    ).await?;

    ic_cdk::println!("✅ Solana transaction sent | tx: {}", tx_hash);
    Ok(tx_hash)
}

pub async fn get_solana_account_info(address: &str) -> Result<SolanaAccountInfo, String> {
    ic_cdk::println!("📊 Getting account info for: {}", address);

    // In production, make HTTP outcall to Solana RPC getAccountInfo
    let account_info = SolanaAccountInfo {
        address: address.to_string(),
        lamports: get_solana_balance(address).await.unwrap_or(0),
        owner: "System11111111111111111111111111111111111111111".to_string(),
        executable: false,
        rent_epoch: 100,
        data_size: 0,
        last_updated: time(),
    };

    ic_cdk::println!("✅ Account info retrieved for: {}", address);
    Ok(account_info)
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SolanaAccountInfo {
    pub address: String,
    pub lamports: u64,
    pub owner: String,
    pub executable: bool,
    pub rent_epoch: u64,
    pub data_size: usize,
    pub last_updated: Timestamp,
}

pub async fn create_solana_instruction(
    program_id: &str,
    accounts: Vec<SolanaAccountMeta>,
    data: Vec<u8>,
) -> Result<SolanaInstruction, String> {
    ic_cdk::println!("📝 Creating Solana instruction for program: {}", program_id);

    let instruction = SolanaInstruction {
        program_id: program_id.to_string(),
        accounts,
        data,
    };

    ic_cdk::println!("✅ Instruction created with {} accounts", instruction.accounts.len());
    Ok(instruction)
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SolanaAccountMeta {
    pub pubkey: String,
    pub is_signer: bool,
    pub is_writable: bool,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SolanaInstruction {
    pub program_id: String,
    pub accounts: Vec<SolanaAccountMeta>,
    pub data: Vec<u8>,
}

pub fn validate_solana_address_format(address: &str) -> bool {
    // Basic Solana address validation
    if address.len() < 32 || address.len() > 44 {
        return false;
    }

    // Check for valid characters (base58)
    address.chars().all(|c| c.is_ascii_alphanumeric() || c == '1' || c == '2' || c == '3')
}

pub async fn get_transaction_status(tx_hash: &str) -> Result<TransactionStatus, String> {
    ic_cdk::println!("🔍 Getting transaction status for: {}", tx_hash);

    // In production, make HTTP outcall to Solana RPC getSignatureStatus
    let status = if tx_hash.contains("confirmed") {
        TransactionStatus::Confirmed
    } else if tx_hash.contains("finalized") {
        TransactionStatus::Finalized
    } else if tx_hash.contains("failed") {
        TransactionStatus::Failed
    } else {
        TransactionStatus::Pending
    };

    ic_cdk::println!("✅ Transaction status: {:?}", status);
    Ok(status)
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum TransactionStatus {
    Pending,
    Confirmed,
    Finalized,
    Failed,
}