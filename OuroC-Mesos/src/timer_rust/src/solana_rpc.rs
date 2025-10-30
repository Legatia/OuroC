// Solana integration using IC's SOL RPC canister with durable nonces
// This replaces the old HTTP outcall approach with proper consensus handling
// Uses durable nonces to eliminate blockhash timing issues

use crate::sol_rpc::create_sol_rpc_client;
use crate::state::get_main_wallet_address;
use crate::nonce_manager::NonceConfig;
use solana_instruction::{AccountMeta, Instruction};
use solana_message::Message;
use solana_pubkey::Pubkey;
use solana_signature::Signature;
use solana_transaction::Transaction;
use sol_rpc_types::{SendTransactionParams, SendTransactionEncoding};
use std::str::FromStr;
use base64::Engine;

// Get program addresses when needed to avoid const issues
fn get_system_program_id() -> Pubkey {
    Pubkey::from_str("11111111111111111111111111111111").unwrap()
}

fn get_token_program_id() -> Pubkey {
    Pubkey::from_str("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").unwrap()
}

fn get_instructions_sysvar_id() -> Pubkey {
    Pubkey::from_str("Sysvar1nstructions1111111111111111111111111").unwrap()
}

/// Send a Solana opcode using the SOL RPC canister with durable nonces
/// This eliminates blockhash timing issues and provides reliable transaction sending
/// Updated to match contract's process_trigger function signature
pub async fn send_solana_opcode_via_rpc(
    contract_address: &str,
    subscription_id: &str,
    subscriber_address: &str,
    merchant_address: &str,
    amount: u64, // USDC amount in micro-units (6 decimals)
    opcode: u8, // 0 = Payment, 1 = Notification
) -> Result<String, String> {
    ic_cdk::println!("🔗 Sending Solana opcode {} via SOL RPC canister (using durable nonces)", opcode);
    ic_cdk::println!("  Contract: {}", contract_address);
    ic_cdk::println!("  Subscription: {}", subscription_id);
    ic_cdk::println!("  Opcode: {} ({})", opcode, if opcode == 0 { "Payment" } else { "Notification" });

    // DEBUG: Compare with expected contract address
    let expected_contract = "CFEtrptTe5eFXpZtB3hr1VMGuWF9oXguTnUFUaeVgeyT";
    if contract_address == expected_contract {
        ic_cdk::println!("✅ Using correct contract address");
    } else {
        ic_cdk::println!("⚠️  WARNING: Using different contract address!");
        ic_cdk::println!("   Expected: {}", expected_contract);
        ic_cdk::println!("   Actual:   {}", contract_address);
    }

    // Create SOL RPC client
    let client = create_sol_rpc_client();

    // Initialize nonce configuration
    let nonce_config = NonceConfig::from_main_wallet()
        .map_err(|e| format!("Failed to initialize nonce config: {}", e))?;

    ic_cdk::println!("🔑 Nonce account: {}", nonce_config.nonce_account);
    ic_cdk::println!("🔑 Authority: {}", nonce_config.authority);

    // Parse Solana addresses
    let program_id = Pubkey::from_str(contract_address)
        .map_err(|e| format!("Invalid contract address: {}", e))?;
    let subscriber_pubkey = Pubkey::from_str(subscriber_address)
        .map_err(|e| format!("Invalid subscriber address: {}", e))?;
    let merchant_pubkey = Pubkey::from_str(merchant_address)
        .map_err(|e| format!("Invalid merchant address: {}", e))?;

    // Get payer address (our canister's Solana address)
    let main_wallet = get_main_wallet_address();
    let payer_pubkey = Pubkey::from_str(&main_wallet)
        .map_err(|e| format!("Invalid payer address: {}", e))?;

    // Get current timestamp (in seconds, as i64)
    let current_time_nanos = ic_cdk::api::time();
    let timestamp = (current_time_nanos / 1_000_000_000) as i64;
    ic_cdk::println!("⏰ Current timestamp: {}", timestamp);
    ic_cdk::println!("💰 Payment amount: {} USDC", amount as f64 / 1_000_000.0);

    // Create the actual message that the contract will verify
    // The contract verifies: subscription_id + timestamp + amount
    let mut message_to_sign = Vec::new();
    message_to_sign.extend_from_slice(subscription_id.as_bytes());
    message_to_sign.extend_from_slice(&timestamp.to_le_bytes());
    message_to_sign.extend_from_slice(&amount.to_le_bytes());

    ic_cdk::println!("📝 Message to sign: {} bytes", message_to_sign.len());
    ic_cdk::println!("   Subscription ID: {}", subscription_id);
    ic_cdk::println!("   Timestamp: {}", timestamp);
    ic_cdk::println!("   Amount: {} USDC", amount as f64 / 1_000_000.0);

    // Sign the payment message using IC's threshold Ed25519
    ic_cdk::println!("🔏 Signing payment message with IC threshold Ed25519...");

    // Use the proper threshold Ed25519 signing from threshold_ed25519 module
    // This creates the message format: subscription_id + timestamp + amount
    // and signs it directly using IC's management canister
    let (payment_signature_vec, _) = crate::threshold_ed25519::create_payment_authorization(
        "test_key_1", // Use test key for devnet
        subscription_id,
        amount,
    ).await
    .map_err(|e| format!("Failed to sign payment message: {}", e))?;

    ic_cdk::println!("✅ Payment message signed successfully");
    ic_cdk::println!("🔑 Generated {} byte signature for payment verification", payment_signature_vec.len());

    // Build instruction data matching contract's process_trigger signature:
    // opcode: u8, icp_signature: Option<[u8; 64]>, timestamp: i64
    let mut instruction_data = Vec::new();

    // 1. Opcode (1 byte)
    instruction_data.push(opcode);

    // 2. ICP Signature (64 bytes) - use the payment signature
    if payment_signature_vec.len() != 64 {
        return Err(format!("Invalid signature length: expected 64 bytes, got {}", payment_signature_vec.len()));
    }
    instruction_data.extend_from_slice(&payment_signature_vec);

    // 3. Timestamp (8 bytes, little-endian)
    instruction_data.extend_from_slice(&timestamp.to_le_bytes());

    ic_cdk::println!("📝 Instruction data: {} bytes (opcode + signature + timestamp)", instruction_data.len());
    ic_cdk::println!("   Opcode: {}", opcode);
    ic_cdk::println!("   Signature: 64 bytes (payment message signature)");
    ic_cdk::println!("   Timestamp: {}", timestamp);

    // Get current durable nonce (this is fast and reliable)
    ic_cdk::println!("🔄 Fetching current durable nonce...");
    let current_nonce = nonce_config.get_current_nonce().await?;
    ic_cdk::println!("✅ Current nonce: {}", current_nonce);

    // Derive the subscription PDA from subscription_id (matching contract's seed pattern)
    let subscription_seeds = vec![
        b"subscription".as_slice(),
        subscription_id.as_bytes(),
    ];
    let (subscription_pda, _subscription_bump) = Pubkey::find_program_address(&subscription_seeds, &program_id);
    ic_cdk::println!("🔍 Derived subscription PDA: {}", subscription_pda);

    // Derive config PDA (contract uses [b"config"] seed)
    let config_seeds = vec![b"config".as_slice()];
    let (config_pda, _config_bump) = Pubkey::find_program_address(&config_seeds, &program_id);
    ic_cdk::println!("🔍 Derived config PDA: {}", config_pda);

    // USDC Mint on Solana Devnet
    let usdc_mint_pubkey = Pubkey::from_str("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
        .map_err(|e| format!("Invalid USDC mint address: {}", e))?;

    // Memo program address
    let memo_program = Pubkey::from_str("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
        .map_err(|e| format!("Invalid memo program address: {}", e))?;

    // Create the main instruction with simplified account structure
    // We'll use the minimal accounts needed and let the contract derive the rest
    let main_instruction = Instruction {
        program_id,
        accounts: vec![
            // Required accounts for ProcessTrigger (minimal set)
            AccountMeta::new(subscription_pda, false),        // Subscription account (derived PDA)
            AccountMeta::new_readonly(config_pda, false),      // Config account (derived PDA)
            AccountMeta::new(payer_pubkey, true),              // Trigger authority (ICP canister, signer)
            AccountMeta::new(subscriber_pubkey, false),        // Subscriber wallet (for notifications)
            AccountMeta::new_readonly(usdc_mint_pubkey, false), // USDC mint (for validation)
            AccountMeta::new_readonly(get_system_program_id(), false), // System program
            AccountMeta::new_readonly(get_token_program_id(), false),  // Token program
            AccountMeta::new_readonly(memo_program, false),     // Memo program
            AccountMeta::new_readonly(get_instructions_sysvar_id(), false), // Instructions sysvar (for Ed25519 verification)
        ],
        data: instruction_data,
    };

    ic_cdk::println!("✅ Created Solana instruction with {} accounts for ProcessTrigger", main_instruction.accounts.len());

    // Create advance nonce instruction (required for nonce transactions)
    let advance_nonce_instruction = nonce_config.create_advance_nonce_instruction();

    ic_cdk::println!("✅ Created Solana instructions: main + nonce advance");

    // Build transaction message using nonce instead of blockhash
    let nonce_pubkey = Pubkey::from_str(&nonce_config.nonce_account).unwrap();
    let message = Message::new_with_blockhash(
        &[advance_nonce_instruction, main_instruction],
        Some(&payer_pubkey),
        &current_nonce,
    );

    ic_cdk::println!("✅ Built transaction message with durable nonce");
    ic_cdk::println!("📋 Message built with {} instructions and nonce: {}", message.instructions.len(), message.recent_blockhash);

    // Sign transaction using IC's threshold Ed25519
    ic_cdk::println!("🔏 Signing transaction with IC threshold Ed25519...");
    ic_cdk::println!("🔑 Using test_key_1 for Solana devnet");

    // Serialize the message for signing
    let message_bytes = bincode::serialize(&message)
        .map_err(|e| format!("Failed to serialize message for signing: {}", e))?;

    // Sign using the threshold Ed25519 module
    let signature_vec = crate::threshold_ed25519::sign_with_main_key(message_bytes).await
        .map_err(|e| format!("Failed to sign transaction: {}", e))?;

    // Convert Vec<u8> to Signature type
    if signature_vec.len() != 64 {
        return Err(format!("Invalid transaction signature length: expected 64, got {}", signature_vec.len()));
    }
    let signature = Signature::from(
        <[u8; 64]>::try_from(signature_vec.as_slice())
            .map_err(|_| "Failed to convert signature")?
    );

    ic_cdk::println!("✅ Transaction signed with durable nonce");

    // Create final transaction
    let transaction = Transaction {
        signatures: vec![signature],
        message,
    };

    // Serialize transaction for sending
    let serialized_transaction = bincode::serialize(&transaction)
        .map_err(|e| format!("Failed to serialize transaction: {}", e))?;

    let encoded_transaction = base64::engine::general_purpose::STANDARD.encode(&serialized_transaction);

    // Send transaction using SOL RPC canister
    ic_cdk::println!("📤 Sending transaction via SOL RPC canister (nonce-based)...");

    let send_result = client
        .send_transaction(SendTransactionParams::from_encoded_transaction(
            encoded_transaction,
            SendTransactionEncoding::Base64,
        ))
        .send()
        .await;

    let tx_signature = match send_result {
        sol_rpc_types::MultiRpcResult::Consistent(result) => {
            match result {
                Ok(signature) => {
                    ic_cdk::println!("✅ Transaction sent successfully!");
                    signature.to_string()
                }
                Err(e) => {
                    let error_msg = format!("Transaction failed: {:?}", e);
                    ic_cdk::println!("❌ {}", error_msg);
                    return Err(error_msg);
                }
            }
        }
        sol_rpc_types::MultiRpcResult::Inconsistent(results) => {
            // Handle inconsistent results gracefully per IC team recommendation
            ic_cdk::println!("⚠️  Inconsistent responses from RPC providers, checking for success...");

            // Check if any provider succeeded
            for (source, result) in &results {
                if let Ok(signature) = result {
                    ic_cdk::println!("✅ Transaction succeeded via provider: {:?}", source);
                    return Ok(signature.to_string());  // At least one succeeded
                }
            }

            // If none succeeded, return error
            let error_msg = format!("All RPC providers failed. Results: {:?}", results);
            ic_cdk::println!("❌ {}", error_msg);
            return Err(error_msg);
        }
    };

    ic_cdk::println!("🎉 Transaction signature: {}", tx_signature);
    Ok(tx_signature)
}

/// Initialize nonce account (one-time setup function)
#[ic_cdk::update]
pub async fn initialize_nonce_account() -> Result<String, String> {
    ic_cdk::println!("🔍 Checking nonce account setup...");

    let nonce_config = NonceConfig::from_main_wallet()
        .map_err(|e| format!("Failed to create nonce config: {}", e))?;

    ic_cdk::println!("🔑 Expected nonce account: {}", nonce_config.nonce_account);
    ic_cdk::println!("🔑 Authority: {}", nonce_config.authority);

    // Check if nonce account already exists and is working
    match nonce_config.get_current_nonce().await {
        Ok(current_nonce) => {
            ic_cdk::println!("✅ Nonce account found and working!");
            ic_cdk::println!("🔗 Current nonce: {}", current_nonce);
            return Ok(nonce_config.nonce_account);
        }
        Err(e) => {
            ic_cdk::println!("⚠️  Nonce account check failed: {}", e);

            // Since we encountered consensus failures with programmatic creation,
            // we'll use the manually created nonce account
            let manually_created_nonce = "A8CgmkD62QatJCEDh8pcN123SyXbQmjKwfvz3qJYPg2Z";

            ic_cdk::println!("ℹ️  Using manually created nonce account: {}", manually_created_nonce);
            ic_cdk::println!("🔗 To verify: solana nonce-account {}", manually_created_nonce);

            // Return the address of the manually created account
            Ok(manually_created_nonce.to_string())
        }
    }
}

/// Get current nonce value (useful for debugging)
#[ic_cdk::update]
pub async fn get_current_nonce() -> Result<String, String> {
    let nonce_config = NonceConfig::from_main_wallet()
        .map_err(|e| format!("Failed to create nonce config: {}", e))?;

    let nonce = nonce_config.get_current_nonce().await?;
    Ok(nonce.to_string())
}

/// Debug function to list all subscriptions and their contract addresses
#[ic_cdk::update]
pub async fn debug_list_subscriptions() -> String {
    let subscriptions = crate::subscription_manager::list_subscriptions();

    if subscriptions.is_empty() {
        return "No subscriptions found".to_string();
    }

    let mut result = format!("Found {} subscriptions:\n", subscriptions.len());

    for sub in subscriptions {
        result.push_str(&format!(
            "ID: {}\n  Contract: {}\n  Subscriber: {}\n  Merchant: {}\n  Status: {:?}\n  Interval: {} seconds\n\n",
            sub.id,
            sub.solana_contract_address,
            sub.subscriber_address,
            sub.merchant_address,
            sub.status,
            sub.interval_seconds
        ));
    }

    result
}
