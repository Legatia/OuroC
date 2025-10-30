// Nonce account management for durable Solana transactions
// This module manages durable nonces to eliminate blockhash timing issues

use crate::sol_rpc::create_sol_rpc_client;
use crate::state::get_main_wallet_address;
use sol_rpc_client::nonce::nonce_from_account;
use solana_hash::Hash;
use solana_instruction::{AccountMeta, Instruction};
use solana_message::Message;
use solana_pubkey::Pubkey;
use std::str::FromStr;

// System program ID (hardcoded for compatibility)
pub const SYSTEM_PROGRAM_ID: Pubkey = Pubkey::new_from_array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);

/// Configuration for nonce account
pub struct NonceConfig {
    /// The canister's Solana address (payer/authority)
    pub authority: String,
    /// Derived nonce account address
    pub nonce_account: String,
}

impl NonceConfig {
    /// Create nonce config from canister's main wallet
    pub fn from_main_wallet() -> Result<Self, String> {
        let main_wallet = get_main_wallet_address();
        let authority_pubkey = Pubkey::from_str(&main_wallet)
            .map_err(|e| format!("Invalid main wallet address: {}", e))?;

        // Use the manually created nonce account address
        let nonce_account = Pubkey::from_str("A8CgmkD62QatJCEDh8pcN123SyXbQmjKwfvz3qJYPg2Z")
            .map_err(|e| format!("Invalid nonce account address: {}", e))?;

        Ok(Self {
            authority: main_wallet,
            nonce_account: nonce_account.to_string(),
        })
    }

    /// Derive nonce account address from authority
    fn derive_nonce_account(authority: &Pubkey) -> Pubkey {
        let seeds = [
            authority.as_ref(),
            b"nonce-account",
        ];

        // Find program address for system program with these seeds
        Pubkey::find_program_address(&seeds, &SYSTEM_PROGRAM_ID).0
    }

    /// Get the current nonce value from the blockchain
    pub async fn get_current_nonce(&self) -> Result<Hash, String> {
        let client = create_sol_rpc_client();
        let nonce_pubkey = Pubkey::from_str(&self.nonce_account)
            .map_err(|e| format!("Invalid nonce account address: {}", e))?;

        ic_cdk::println!("🔍 Fetching nonce from account: {}", self.nonce_account);

        let account_info = client
            .get_account_info(nonce_pubkey)
            .send()
            .await;

        let nonce_hash = match account_info {
            sol_rpc_types::MultiRpcResult::Consistent(result) => {
                match result {
                    Ok(Some(account)) => {
                        nonce_from_account(&account)
                            .map_err(|e| format!("Failed to extract nonce: {:?}", e))?
                    }
                    Ok(None) => {
                        return Err("Nonce account not found. Please create it first.".to_string());
                    }
                    Err(e) => {
                        return Err(format!("RPC error getting nonce account: {:?}", e));
                    }
                }
            }
            sol_rpc_types::MultiRpcResult::Inconsistent(_) => {
                return Err("Inconsistent nonce account responses from RPC providers".to_string());
            }
        };

        ic_cdk::println!("✅ Current nonce: {}", nonce_hash);
        Ok(nonce_hash)
    }

    /// Create instruction to advance nonce account
    pub fn create_advance_nonce_instruction(&self) -> Instruction {
        let nonce_pubkey = Pubkey::from_str(&self.nonce_account).unwrap();
        let authority_pubkey = Pubkey::from_str(&self.authority).unwrap();

        Instruction {
            program_id: SYSTEM_PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(nonce_pubkey, false),
                AccountMeta::new_readonly(authority_pubkey, true),
            ],
            data: vec![2, 0, 0, 0], // Advance nonce instruction
        }
    }

    /// Create instruction to initialize nonce account (for one-time setup)
    pub fn create_initialize_nonce_instruction(&self) -> Instruction {
        let nonce_pubkey = Pubkey::from_str(&self.nonce_account).unwrap();
        let authority_pubkey = Pubkey::from_str(&self.authority).unwrap();

        Instruction {
            program_id: SYSTEM_PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(nonce_pubkey, false),
                AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
                AccountMeta::new_readonly(authority_pubkey, true),
            ],
            data: vec![0, 0, 0, 0], // Initialize nonce instruction
        }
    }
}

/// Create a transaction using durable nonce instead of blockhash
pub fn create_nonce_transaction(
    instructions: Vec<Instruction>,
    payer: &Pubkey,
    nonce: &Hash,
    nonce_account: &Pubkey,
) -> Message {
    // Manual advance nonce instruction
    let nonce_instruction = Instruction {
        program_id: SYSTEM_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*nonce_account, false),
            AccountMeta::new_readonly(*payer, true),
        ],
        data: vec![2, 0, 0, 0], // Advance nonce instruction
    };

    let mut all_instructions = vec![nonce_instruction];
    all_instructions.extend(instructions);

    Message::new_with_blockhash(
        &all_instructions,
        Some(payer),
        nonce,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nonce_account_derivation() {
        let authority = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let nonce_account = NonceConfig::derive_nonce_account(&authority);

        // Should produce a deterministic result
        assert!(nonce_account != Pubkey::default());
    }
}