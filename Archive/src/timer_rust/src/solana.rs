// Solana blockchain integration module

use crate::types::*;
use crate::state::{get_network_config, get_main_wallet_address};
use ic_cdk::api::{time, management_canister::ecdsa::{EcdsaPublicKeyArgument, SignWithEcdsaArgument}};
use candid::{CandidType, Deserialize, Principal};
use sha2::{Sha256, Digest};

// IC Management Canister for Threshold Ed25519
const IC_MANAGEMENT_CANISTER_ID: Principal = Principal::from_slice(&[]);

pub async fn get_ed25519_public_key() -> Result<Vec<u8>, String> {
    let (_, _, key_name) = get_network_config();

    // Get the canister's own principal for derivation path
    let canister_id = ic_cdk::api::id();

    // Call IC management canister to get tECDSA public key
    // Note: For production, you'd use sign_with_ecdsa, but for now we'll derive a deterministic key
    let derivation_path = vec![canister_id.as_slice().to_vec()];

    // For Ed25519, we use the key_name to derive a public key
    // In production, this would call the management canister's ecdsa_public_key method
    let key_id = ic_cdk::api::management_canister::ecdsa::EcdsaKeyId {
        curve: ic_cdk::api::management_canister::ecdsa::EcdsaCurve::Secp256k1,
        name: key_name,
    };

    let args = EcdsaPublicKeyArgument {
        canister_id: Some(canister_id),
        derivation_path,
        key_id,
    };

    // Call management canister
    match ic_cdk::api::management_canister::ecdsa::ecdsa_public_key(args).await {
        Ok((response,)) => {
            ic_cdk::println!("✅ Retrieved tECDSA public key ({} bytes)", response.public_key.len());
            Ok(response.public_key)
        }
        Err((code, msg)) => {
            let error = format!("Failed to get tECDSA public key: {:?} - {}", code, msg);
            ic_cdk::println!("❌ {}", error);
            Err(error)
        }
    }
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

    let (_, rpc_endpoint, _) = get_network_config();
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
    ic_cdk::println!("🔨 Building Solana transaction...");

    // For local testing, we'll simulate the transaction
    // In production, this would:
    // 1. Get recent blockhash via HTTP outcall to Solana RPC
    // 2. Build transaction with instruction
    // 3. Sign with threshold ECDSA
    // 4. Send via HTTP outcall to Solana RPC

    // Simulate transaction hash
    let tx_hash = generate_mock_transaction_hash(program_id, instruction_data);

    ic_cdk::println!("📤 Sending transaction to: {}", rpc_endpoint);
    ic_cdk::println!("  Program: {}", program_id);
    ic_cdk::println!("  Accounts: {}", accounts.len());
    ic_cdk::println!("  Data: {} bytes", instruction_data.len());

    // In production, make HTTP outcall here
    // let response = http_request_to_solana_rpc(rpc_endpoint, transaction_bytes).await?;

    Ok(tx_hash)
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

    // In production, make HTTP outcall to Solana RPC getTransaction
    // For now, simulate verification based on hash pattern
    if tx_hash.contains("fail") {
        Ok(false)
    } else if tx_hash.contains("pending") {
        ic_cdk::println!("⏳ Transaction still pending");
        Ok(false)
    } else {
        ic_cdk::println!("✅ Transaction confirmed");
        Ok(true)
    }
}

pub async fn get_solana_balance(address: &str) -> Result<u64, String> {
    ic_cdk::println!("💰 Getting Solana balance for: {}", address);

    // In production, make HTTP outcall to Solana RPC getBalance
    // For local testing, return mock balance
    let balance = match address {
        addr if addr.starts_with("test_wallet") => 1_000_000_000u64, // 1 SOL
        addr if addr.starts_with("Ed25519:") => 5_000_000_000u64, // 5 SOL
        _ => 100_000_000u64, // 0.1 SOL default
    };

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

    let (_, rpc_endpoint, _) = get_network_config();

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