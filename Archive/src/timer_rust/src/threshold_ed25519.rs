// Threshold Ed25519 signature management module

use crate::*;
use ed25519_dalek::{PublicKey, Signature, Verifier, PUBLIC_KEY_LENGTH};
use anyhow::{Result, anyhow};
use std::convert::TryFrom;

// IC Management Canister types for threshold signatures
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SchnorrKeyId {
    pub algorithm: Algorithm,
    pub name: String,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum Algorithm {
    #[serde(rename = "ed25519")]
    Ed25519,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SchnorrPublicKeyArgument {
    pub canister_id: Option<String>,
    pub derivation_path: Vec<Vec<u8>>,
    pub key_id: SchnorrKeyId,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SchnorrPublicKeyResult {
    pub public_key: Vec<u8>,
    pub chain_code: Vec<u8>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SignWithSchnorrArgument {
    pub message: Vec<u8>, // Note: Ed25519 signs the message directly, not a hash
    pub derivation_path: Vec<Vec<u8>>,
    pub key_id: SchnorrKeyId,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SignWithSchnorrResult {
    pub signature: Vec<u8>,
}

// Re-export types from main crate
pub use crate::{SolanaKeypair, SolanaTransaction, SolanaInstruction, SolanaAccountMeta};

pub struct ThresholdEd25519Manager {
    key_name: String,
    key_id: SchnorrKeyId,
}

impl ThresholdEd25519Manager {
    pub fn new(key_name: String) -> Self {
        let key_id = SchnorrKeyId {
            algorithm: Algorithm::Ed25519,
            name: key_name.clone(),
        };

        Self { key_name, key_id }
    }

    // Derive a Solana public key for this canister
    pub async fn derive_solana_keypair(&self, derivation_path: Vec<Vec<u8>>) -> Result<SolanaKeypair, String> {
        ic_cdk::print(&format!("🔑 Deriving Solana keypair with path: {:?}", derivation_path));

        let public_key_arg = SchnorrPublicKeyArgument {
            canister_id: None, // Use calling canister's ID
            derivation_path: derivation_path.clone(),
            key_id: self.key_id.clone(),
        };

        // In a real implementation, this would call the IC management canister
        // For now, we'll return a mock implementation
        match self.mock_schnorr_public_key(public_key_arg).await {
            Ok(result) => {
                let keypair = SolanaKeypair {
                    public_key: result.public_key,
                    derivation_path,
                };

                ic_cdk::print(&format!("✅ Derived Solana keypair with public key: {:?}",
                                      result.public_key));
                Ok(keypair)
            }
            Err(e) => {
                ic_cdk::print("❌ Failed to derive Solana keypair");
                Err(e)
            }
        }
    }

    // Sign a message using Ed25519 (for authentication or transactions)
    // Note: Ed25519 signs the message directly, not a hash
    pub async fn sign_message(&self, message: Vec<u8>, derivation_path: Vec<Vec<u8>>) -> Result<Vec<u8>, String> {
        ic_cdk::print("🔐 Signing message with Ed25519");

        let sign_arg = SignWithSchnorrArgument {
            message: message.clone(),
            derivation_path,
            key_id: self.key_id.clone(),
        };

        // In a real implementation, this would call the IC management canister
        match self.mock_sign_with_schnorr(sign_arg).await {
            Ok(result) => {
                ic_cdk::print("✅ Message signed successfully");
                Ok(result.signature)
            }
            Err(e) => {
                ic_cdk::print("❌ Failed to sign message");
                Err(e)
            }
        }
    }

    // Alias for backwards compatibility with transaction signing
    pub async fn sign_solana_transaction(&self, message_hash: Vec<u8>, derivation_path: Vec<Vec<u8>>) -> Result<Vec<u8>, String> {
        self.sign_message(message_hash, derivation_path).await
    }

    // Get the main canister keypair (using empty derivation path)
    pub async fn get_main_keypair(&self) -> Result<SolanaKeypair, String> {
        self.derive_solana_keypair(Vec::new()).await
    }

    // Get a subscription-specific keypair
    pub async fn get_subscription_keypair(&self, subscription_id: &str) -> Result<SolanaKeypair, String> {
        let derivation_path = vec![
            b"subscription".to_vec(),
            subscription_id.as_bytes().to_vec(),
        ];
        self.derive_solana_keypair(derivation_path).await
    }

    // Get a fee collection keypair
    pub async fn get_fee_collection_keypair(&self) -> Result<SolanaKeypair, String> {
        let derivation_path = vec![b"fee_collection".to_vec()];
        self.derive_solana_keypair(derivation_path).await
    }

    // Mock implementations (in production, these would be actual IC management canister calls)
    async fn mock_schnorr_public_key(&self, _arg: SchnorrPublicKeyArgument) -> Result<SchnorrPublicKeyResult, String> {
        // Mock implementation - return a 32-byte Ed25519 public key
        let mock_public_key = vec![
            0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09,
            0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11,
            0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19,
            0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x21,
        ];

        let mock_chain_code = vec![0u8; 32];

        Ok(SchnorrPublicKeyResult {
            public_key: mock_public_key,
            chain_code: mock_chain_code,
        })
    }

    async fn mock_sign_with_schnorr(&self, arg: SignWithSchnorrArgument) -> Result<SignWithSchnorrResult, String> {
        // Mock implementation - return a 64-byte Ed25519 signature
        let mock_signature = vec![
            0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37,
            0x38, 0x39, 0x3a, 0x3b, 0x3c, 0x3d, 0x3e, 0x3f,
            0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47,
            0x48, 0x49, 0x4a, 0x4b, 0x4c, 0x4d, 0x4e, 0x4f,
            0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57,
            0x58, 0x59, 0x5a, 0x5b, 0x5c, 0x5d, 0x5e, 0x5f,
            0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67,
            0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f,
        ];

        ic_cdk::print(&format!("🔐 Mock signing message of {} bytes", arg.message.len()));
        Ok(SignWithSchnorrResult {
            signature: mock_signature,
        })
    }
}

// Utility functions for Solana address conversion

pub fn public_key_to_base58(public_key: &[u8]) -> Result<String, String> {
    // Convert public key to base58 format for Solana
    if public_key.len() != 32 {
        return Err("Invalid public key length".to_string());
    }

    // Simple base58 implementation (in production, use a proper base58 library)
    let alphabet = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

    if public_key.is_empty() {
        return Ok(String::new());
    }

    // Count leading zeros
    let mut leading_zeros = 0;
    for &byte in public_key {
        if byte == 0 {
            leading_zeros += 1;
        } else {
            break;
        }
    }

    // Convert bytes to big integer
    let mut num: u128 = 0;
    for &byte in public_key {
        num = num * 256 + byte as u128;
    }

    // Convert to base58
    let mut result = String::new();
    while num > 0 {
        let remainder = (num % 58) as usize;
        let char = alphabet[remainder] as char;
        result.insert(0, char);
        num /= 58;
    }

    // Add leading '1's for leading zeros
    let mut prefix = String::new();
    for _ in 0..leading_zeros {
        prefix.push('1');
    }

    Ok(prefix + &result)
}

// Create SOL transfer instruction (System Program)
pub fn create_solana_transfer_instruction(
    from: &[u8],
    to: &[u8],
    lamports: u64,
) -> SolanaInstruction {
    // System Program ID (11111111111111111111111111111111)
    let system_program_id = vec![
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ];

    // System Program Transfer instruction
    // Format: [u32 instruction_index (2)] [u64 lamports (little-endian)]
    let mut instruction_data = vec![0u8; 12];
    instruction_data[0] = 2; // Instruction index: 2 (Transfer) as little-endian u32

    // Add lamports amount as little-endian u64
    let lamports_bytes = lamports.to_le_bytes();
    instruction_data[4..12].copy_from_slice(&lamports_bytes);

    SolanaInstruction {
        program_id: system_program_id,
        accounts: vec![
            SolanaAccountMeta {
                pubkey: from.to_vec(),
                is_signer: true,
                is_writable: true,  // From (must sign)
            },
            SolanaAccountMeta {
                pubkey: to.to_vec(),
                is_signer: false,
                is_writable: true,  // To
            },
        ],
        data: instruction_data,
    }
}

// Create USDC transfer instruction (SPL Token)
pub fn create_usdc_transfer_instruction(
    from_token_account: &[u8],
    to_token_account: &[u8],
    authority: &[u8],
    amount: u64,
) -> SolanaInstruction {
    // SPL Token Program ID (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)
    let token_program_id = vec![
        6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235, 121, 172,
        28, 180, 133, 237, 95, 91, 55, 145, 58, 140, 245, 133, 126, 255, 0, 169
    ];

    // SPL Token Transfer instruction (3) with amount in little-endian format
    let mut instruction_data = vec![0u8; 9];
    instruction_data[0] = 3; // Transfer instruction

    // Add amount as little-endian u64
    let amount_bytes = amount.to_le_bytes();
    instruction_data[1..9].copy_from_slice(&amount_bytes);

    SolanaInstruction {
        program_id: token_program_id,
        accounts: vec![
            SolanaAccountMeta {
                pubkey: from_token_account.to_vec(),
                is_signer: false,
                is_writable: true, // Source token account
            },
            SolanaAccountMeta {
                pubkey: to_token_account.to_vec(),
                is_signer: false,
                is_writable: true, // Destination token account
            },
            SolanaAccountMeta {
                pubkey: authority.to_vec(),
                is_signer: true,
                is_writable: false, // Authority (owner/delegate)
            },
        ],
        data: instruction_data,
    }
}

// Create a memo instruction for subscription identification
pub fn create_memo_instruction(memo: &str) -> SolanaInstruction {
    // Memo Program ID (MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr)
    let memo_program_id = vec![
        5, 78, 193, 174, 4, 69, 79, 136, 82, 14, 81, 17, 135, 15, 133, 51,
        179, 71, 239, 117, 54, 85, 249, 206, 246, 74, 138, 145, 180, 8, 213, 18
    ];

    SolanaInstruction {
        program_id: memo_program_id,
        accounts: vec![],
        data: memo.as_bytes().to_vec(),
    }
}

// Validate Ed25519 public key
pub fn validate_ed25519_public_key(public_key: &[u8]) -> Result<(), String> {
    if public_key.len() != PUBLIC_KEY_LENGTH {
        return Err(format!("Invalid public key length: expected {}, got {}",
                          PUBLIC_KEY_LENGTH, public_key.len()));
    }

    // Try to parse as Ed25519 public key
    match PublicKey::from_bytes(public_key) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Invalid Ed25519 public key: {:?}", e)),
    }
}

// Validate Ed25519 signature
pub fn validate_ed25519_signature(
    public_key: &[u8],
    message: &[u8],
    signature: &[u8],
) -> Result<(), String> {
    if signature.len() != 64 {
        return Err(format!("Invalid signature length: expected 64, got {}", signature.len()));
    }

    let pk = match PublicKey::from_bytes(public_key) {
        Ok(pk) => pk,
        Err(e) => return Err(format!("Invalid public key: {:?}", e)),
    };

    let sig_array: [u8; 64] = signature.try_into()
        .map_err(|_| "Invalid signature length".to_string())?;
    let sig = Signature::from_bytes(&sig_array);

    match pk.verify(message, &sig) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Signature verification failed: {:?}", e)),
    }
}

// Get Ed25519 public key for the canister
pub async fn get_ed25519_public_key(key_name: &str) -> Result<Vec<u8>, String> {
    let manager = ThresholdEd25519Manager::new(key_name.to_string());
    let keypair = manager.get_main_keypair().await?;
    Ok(keypair.public_key)
}

// Create payment authorization message for Solana contract
// Message format: subscription_id + timestamp + amount (matches Solana contract's crypto.rs)
pub async fn create_payment_authorization(
    key_name: &str,
    subscription_id: &str,
    amount: u64,
) -> Result<(Vec<u8>, i64), String> {
    let timestamp = (ic_cdk::api::time() / 1_000_000_000) as i64; // Convert nanoseconds to seconds

    // Create message matching Solana contract's create_payment_message format
    let mut message_buffer = Vec::new();

    // Add subscription_id bytes
    message_buffer.extend_from_slice(subscription_id.as_bytes());

    // Add timestamp as little-endian i64
    let timestamp_bytes = timestamp.to_le_bytes();
    message_buffer.extend_from_slice(&timestamp_bytes);

    // Add amount as little-endian u64
    let amount_bytes = amount.to_le_bytes();
    message_buffer.extend_from_slice(&amount_bytes);

    let message = message_buffer;

    // Sign with Ed25519 using empty derivation path (main canister key)
    let manager = ThresholdEd25519Manager::new(key_name.to_string());
    let signature = manager.sign_message(message, Vec::new()).await?;

    ic_cdk::print(&format!("🔐 Created payment authorization for {} at timestamp {}",
                              subscription_id, timestamp));

    Ok((signature, timestamp))
}

// Thread-local manager instances
thread_local! {
    static MAIN_KEY_MANAGER: std::cell::RefCell<ThresholdEd25519Manager> = std::cell::RefCell::new(
        ThresholdEd25519Manager::new("test_key_1".to_string())
    );
}

// Convenience functions using the global manager

pub async fn get_main_keypair() -> Result<SolanaKeypair, String> {
    MAIN_KEY_MANAGER.with(|manager| {
        manager.borrow().get_main_keypair()
    }).await
}

pub async fn sign_with_main_key(message: Vec<u8>) -> Result<Vec<u8>, String> {
    MAIN_KEY_MANAGER.with(|manager| {
        manager.borrow().sign_message(message, Vec::new())
    }).await
}

// Update key name based on network
pub fn update_key_name(network: &NetworkEnvironment) {
    let key_name = match network {
        NetworkEnvironment::Mainnet => "Ed25519:key_1",
        NetworkEnvironment::Devnet => "test_key_1",
        NetworkEnvironment::Testnet => "test_key_1",
    };

    MAIN_KEY_MANAGER.with(|manager| {
        *manager.borrow_mut() = ThresholdEd25519Manager::new(key_name.to_string());
    });

    ED25519_KEY_NAME.with(|k| *k.borrow_mut() = key_name.to_string());
}