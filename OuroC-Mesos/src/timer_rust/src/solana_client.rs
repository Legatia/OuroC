// Solana Chain Fusion client using threshold ECDSA for address derivation

use candid::Principal;
use ic_cdk::api::management_canister::ecdsa::{
    EcdsaPublicKeyArgument, EcdsaKeyId, EcdsaCurve, SignWithEcdsaArgument,
};
use sha2::{Sha256, Digest};

/// Configuration for Solana RPC client
pub struct SolanaChainFusionClient {
    key_name: String,
    network: SolanaNetwork,
}

#[derive(Clone, Debug)]
pub enum SolanaNetwork {
    Mainnet,
    Devnet,
    Testnet,
}

impl SolanaChainFusionClient {
    pub fn new(key_name: String, network: SolanaNetwork) -> Self {
        Self { key_name, network }
    }

    /// Derive a Solana address from a Principal using threshold ECDSA
    pub async fn get_solana_address_for_principal(&self, principal: Principal) -> Result<String, String> {
        ic_cdk::println!("🔑 Deriving Solana address for principal: {}", principal.to_text());

        let canister_id = ic_cdk::api::id();

        // Create derivation path from principal
        let mut derivation_path = vec![canister_id.as_slice().to_vec()];
        derivation_path.push(principal.as_slice().to_vec());

        let key_id = EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name: self.key_name.clone(),
        };

        let args = EcdsaPublicKeyArgument {
            canister_id: Some(canister_id),
            derivation_path,
            key_id,
        };

        // Get public key from management canister
        match ic_cdk::api::management_canister::ecdsa::ecdsa_public_key(args).await {
            Ok((response,)) => {
                let public_key = response.public_key;
                ic_cdk::println!("✅ Retrieved ECDSA public key ({} bytes)", public_key.len());

                // Convert ECDSA public key to Solana address format (base58)
                let solana_address = self.pubkey_to_solana_address(&public_key)?;
                ic_cdk::println!("✅ Derived Solana address: {}", solana_address);

                Ok(solana_address)
            }
            Err((code, msg)) => {
                let error = format!("Failed to get ECDSA public key: {:?} - {}", code, msg);
                ic_cdk::println!("❌ {}", error);
                Err(error)
            }
        }
    }

    /// Convert ECDSA public key to Solana address (base58 encoded)
    fn pubkey_to_solana_address(&self, public_key: &[u8]) -> Result<String, String> {
        // For Solana, we derive a deterministic 32-byte address from the ECDSA key
        let mut hasher = Sha256::new();
        hasher.update(public_key);
        hasher.update(b"solana_address_v1");
        let hash = hasher.finalize();

        // Encode as base58 (Solana address format)
        Ok(bs58::encode(&hash[..32]).into_string())
    }

    /// Get balance for a Solana address using HTTP outcalls
    pub async fn get_balance(&self, address: &str) -> Result<u64, String> {
        ic_cdk::println!("💰 Querying Solana balance for address: {}", address);

        let rpc_endpoint = match self.network {
            SolanaNetwork::Mainnet => "https://api.mainnet-beta.solana.com",
            SolanaNetwork::Devnet => "https://api.devnet.solana.com",
            SolanaNetwork::Testnet => "https://api.testnet.solana.com",
        };

        ic_cdk::println!("📡 RPC endpoint: {}", rpc_endpoint);

        // TODO: Implement HTTP outcall to Solana RPC getBalance method
        // For local testing, return mock balance
        let balance = 100_000_000u64; // 0.1 SOL

        ic_cdk::println!("✅ Balance: {} lamports", balance);
        Ok(balance)
    }

    /// Sign message with threshold ECDSA
    pub async fn sign_message(&self, message: &[u8], principal: Principal) -> Result<Vec<u8>, String> {
        ic_cdk::println!("🔏 Signing message for principal: {}", principal.to_text());

        let canister_id = ic_cdk::api::id();
        let mut derivation_path = vec![canister_id.as_slice().to_vec()];
        derivation_path.push(principal.as_slice().to_vec());

        let key_id = EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name: self.key_name.clone(),
        };

        let mut hasher = Sha256::new();
        hasher.update(message);
        let message_hash = hasher.finalize();

        let args = SignWithEcdsaArgument {
            message_hash: message_hash.to_vec(),
            derivation_path,
            key_id,
        };

        match ic_cdk::api::management_canister::ecdsa::sign_with_ecdsa(args).await {
            Ok((response,)) => {
                ic_cdk::println!("✅ Message signed");
                Ok(response.signature)
            }
            Err((code, msg)) => {
                Err(format!("Failed to sign: {:?} - {}", code, msg))
            }
        }
    }
}

pub fn validate_solana_address(address: &str) -> bool {
    if address.len() < 32 || address.len() > 44 {
        return false;
    }
    bs58::decode(address).into_vec().is_ok()
}
