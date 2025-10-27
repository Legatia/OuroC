// Threshold Ed25519 signature management module

use crate::types::*;
use candid::{CandidType, Deserialize, Principal};
use ed25519_dalek::{VerifyingKey as PublicKey, Signature, Verifier, PUBLIC_KEY_LENGTH};

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
    pub canister_id: Option<Principal>,
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

// Define Solana types needed for signing
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SolanaKeypair {
    pub public_key: Vec<u8>,
    pub derivation_path: Vec<Vec<u8>>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SolanaTransaction {
    pub instructions: Vec<SolanaInstruction>,
    pub recent_blockhash: Vec<u8>,
    pub fee_payer: Vec<u8>,
}

// Re-export types from solana module
pub use crate::solana::{SolanaInstruction, SolanaAccountMeta};

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

        // Call the IC management canister for real Schnorr public key
        match self.real_schnorr_public_key(public_key_arg).await {
            Ok(result) => {
                ic_cdk::print(&format!("✅ Derived Solana keypair with public key: {} bytes", result.public_key.len()));

                let keypair = SolanaKeypair {
                    public_key: result.public_key,
                    derivation_path,
                };

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

        // Call the IC management canister for real Schnorr signature
        match self.real_sign_with_schnorr(sign_arg).await {
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

    // Real IC management canister implementations using direct ic_cdk::call
    async fn real_schnorr_public_key(&self, arg: SchnorrPublicKeyArgument) -> Result<SchnorrPublicKeyResult, String> {
        ic_cdk::print("📞 Calling IC management canister for Schnorr public key...");

        // Management canister principal
        let mgmt_canister = Principal::management_canister();

        // Call the management canister directly
        let (result,): (SchnorrPublicKeyResult,) = ic_cdk::call(
            mgmt_canister,
            "schnorr_public_key",
            (arg,)
        )
        .await
        .map_err(|e| format!("schnorr_public_key call failed: {:?}", e))?;

        ic_cdk::print(&format!("✅ Got public key: {} bytes", result.public_key.len()));
        Ok(result)
    }

    async fn real_sign_with_schnorr(&self, arg: SignWithSchnorrArgument) -> Result<SignWithSchnorrResult, String> {
        ic_cdk::print(&format!("📞 Calling IC management canister to sign {} bytes...", arg.message.len()));

        // Management canister principal
        let mgmt_canister = candid::Principal::management_canister();

        // Call the management canister directly with cycles for signing
        // Schnorr signing requires ~26.2B cycles
        let (result,): (SignWithSchnorrResult,) = ic_cdk::api::call::call_with_payment(
            mgmt_canister,
            "sign_with_schnorr",
            (arg,),
            27_000_000_000, // 27 billion cycles (increased to cover actual requirement)
        )
        .await
        .map_err(|e| format!("sign_with_schnorr call failed: {:?}", e))?;

        ic_cdk::print(&format!("✅ Got signature: {} bytes", result.signature.len()));
        Ok(result)
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

// Note: Solana transaction construction functions removed
// The Solana frontend/contract handles transaction building
// ICP canister only needs to sign pre-built messages

// Validate Ed25519 public key
pub fn validate_ed25519_public_key(public_key: &[u8]) -> Result<(), String> {
    if public_key.len() != PUBLIC_KEY_LENGTH {
        return Err(format!("Invalid public key length: expected {}, got {}",
                          PUBLIC_KEY_LENGTH, public_key.len()));
    }

    // Convert to fixed size array
    let pk_array: [u8; PUBLIC_KEY_LENGTH] = public_key.try_into()
        .map_err(|_| "Invalid public key length".to_string())?;

    // Try to parse as Ed25519 public key
    match PublicKey::from_bytes(&pk_array) {
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

    if public_key.len() != PUBLIC_KEY_LENGTH {
        return Err(format!("Invalid public key length: expected {}, got {}", PUBLIC_KEY_LENGTH, public_key.len()));
    }

    // Convert to fixed size arrays
    let pk_array: [u8; PUBLIC_KEY_LENGTH] = public_key.try_into()
        .map_err(|_| "Invalid public key length".to_string())?;

    let pk = match PublicKey::from_bytes(&pk_array) {
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
    let manager = MAIN_KEY_MANAGER.with(|m| m.borrow().key_name.clone());
    let mgr = ThresholdEd25519Manager::new(manager);
    mgr.get_main_keypair().await
}

pub async fn sign_with_main_key(message: Vec<u8>) -> Result<Vec<u8>, String> {
    let manager = MAIN_KEY_MANAGER.with(|m| m.borrow().key_name.clone());
    let mgr = ThresholdEd25519Manager::new(manager);
    mgr.sign_message(message, Vec::new()).await
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
}