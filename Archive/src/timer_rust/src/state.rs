// State management module

use crate::types::*;
use std::collections::HashMap;
use ic_cdk::api::{time, canister_balance, caller};
use candid::{CandidType, Deserialize};

// Thread-local state
thread_local! {
    // Network configuration
    static NETWORK_ENV: std::cell::RefCell<NetworkEnvironment> = std::cell::RefCell::new(NetworkEnvironment::Devnet);
    static ED25519_KEY_NAME: std::cell::RefCell<String> = std::cell::RefCell::new("test_key_1".to_string());
    static SOLANA_RPC_ENDPOINT: std::cell::RefCell<String> = std::cell::RefCell::new("https://api.devnet.solana.com".to_string());

    // Wallet addresses
    static MAIN_WALLET_ADDRESS: std::cell::RefCell<String> = std::cell::RefCell::new(String::new());
    static CURRENT_FEE_ADDRESS: std::cell::RefCell<String> = std::cell::RefCell::new("CKEY8bppifSErEfP5cvX8hCnmQ2Yo911mosdRx7M3HxF".to_string());
    static PROPOSED_FEE_ADDRESS: std::cell::RefCell<Option<String>> = std::cell::RefCell::new(None);
    static FEE_ADDRESS_PROPOSAL_TIME: std::cell::RefCell<Option<Timestamp>> = std::cell::RefCell::new(None);

    // Configuration
    static IS_INITIALIZED: std::cell::RefCell<bool> = std::cell::RefCell::new(false);
    static AUTO_CYCLE_REFILL: std::cell::RefCell<bool> = std::cell::RefCell::new(true);
    static CYCLE_THRESHOLD: std::cell::RefCell<u64> = std::cell::RefCell::new(5_000_000_000_000);

    // Fee configuration
    static FEE_CONFIG: std::cell::RefCell<FeeConfig> = std::cell::RefCell::new(FeeConfig {
        trigger_fee_lamports: 5000,
        gas_reserve_lamports: 5000,
        cycle_refill_ratio: 0.3,
    });

    // Health monitoring
    static CANISTER_START_TIME: std::cell::RefCell<Timestamp> = std::cell::RefCell::new(time());
    static FAILED_PAYMENT_COUNT: std::cell::RefCell<u32> = std::cell::RefCell::new(0);
    static HEALTH_CHECK_COUNTER: std::cell::RefCell<u64> = std::cell::RefCell::new(0);
}

// State structure for stable storage
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CanisterState {
    pub subscriptions: HashMap<String, Subscription>,
    pub admin_list: Vec<String>,
    pub read_only_users: Vec<String>,
    pub network_env: NetworkEnvironment,
    pub ed25519_key_name: String,
    pub solana_rpc_endpoint: String,
    pub main_wallet_address: String,
    pub current_fee_address: String,
    pub proposed_fee_address: Option<String>,
    pub fee_address_proposal_time: Option<Timestamp>,
    pub is_initialized: bool,
    pub auto_cycle_refill: bool,
    pub cycle_threshold: u64,
    pub fee_config: FeeConfig,
    pub canister_start_time: Timestamp,
    pub failed_payment_count: u32,
    pub health_check_counter: u64,
}

// Network configuration functions
pub fn set_network(network: NetworkEnvironment) -> Result<(), String> {
    if IS_INITIALIZED.with(|i| *i.borrow()) {
        return Err("Cannot change network after initialization".to_string());
    }

    NETWORK_ENV.with(|cell| *cell.borrow_mut() = network.clone());

    // Update RPC endpoint and key name based on network
    let (endpoint, _key_name) = match network {
        NetworkEnvironment::Mainnet => {
            SOLANA_RPC_ENDPOINT.with(|e| *e.borrow_mut() = "https://api.mainnet-beta.solana.com".to_string());
            ED25519_KEY_NAME.with(|k| *k.borrow_mut() = "Ed25519:key_1".to_string());
            ("https://api.mainnet-beta.solana.com", "Ed25519:key_1")
        }
        NetworkEnvironment::Devnet => {
            SOLANA_RPC_ENDPOINT.with(|e| *e.borrow_mut() = "https://api.devnet.solana.com".to_string());
            ED25519_KEY_NAME.with(|k| *k.borrow_mut() = "test_key_1".to_string());
            ("https://api.devnet.solana.com", "test_key_1")
        }
        NetworkEnvironment::Testnet => {
            SOLANA_RPC_ENDPOINT.with(|e| *e.borrow_mut() = "https://api.testnet.solana.com".to_string());
            ED25519_KEY_NAME.with(|k| *k.borrow_mut() = "test_key_1".to_string());
            ("https://api.testnet.solana.com", "test_key_1")
        }
    };

    ic_cdk::println!("Network set to {:?} with endpoint: {}", network, endpoint);
    Ok(())
}

pub fn get_network_config() -> (NetworkEnvironment, String, String) {
    (
        NETWORK_ENV.with(|n| n.borrow().clone()),
        ED25519_KEY_NAME.with(|k| k.borrow().clone()),
        SOLANA_RPC_ENDPOINT.with(|e| e.borrow().clone()),
    )
}

// Canister initialization
pub async fn initialize_canister() -> Result<(String, String), String> {
    ic_cdk::println!("🔧 Initializing canister with Threshold Ed25519 wallets...");

    // Mock main wallet address (in production, this would use IC management canister)
    let main_address = crate::solana::get_mock_ed25519_public_key().await;

    MAIN_WALLET_ADDRESS.with(|w| *w.borrow_mut() = main_address.clone());
    IS_INITIALIZED.with(|i| *i.borrow_mut() = true);

    let fee_address = CURRENT_FEE_ADDRESS.with(|f| f.borrow().clone());

    ic_cdk::println!("✅ Canister initialized with main wallet: {} | Fee wallet managed by Solana contract", main_address);
    Ok((main_address, fee_address))
}

pub fn is_initialized() -> bool {
    IS_INITIALIZED.with(|i| *i.borrow())
}

// Fee configuration
pub fn update_fee_config(new_config: FeeConfig) -> Result<(), String> {
    crate::authorization::require_admin()?;
    FEE_CONFIG.with(|f| *f.borrow_mut() = new_config.clone());
    ic_cdk::println!("Fee configuration updated");
    Ok(())
}

pub fn get_fee_config() -> Result<FeeConfig, String> {
    crate::authorization::require_read_access()?;
    Ok(FEE_CONFIG.with(|f| f.borrow().clone()))
}

// Cycle management
pub fn get_cycle_balance() -> u64 {
    canister_balance()
}

pub fn set_cycle_threshold(new_threshold: u64) {
    crate::authorization::require_admin().ok();
    CYCLE_THRESHOLD.with(|t| *t.borrow_mut() = new_threshold);
    ic_cdk::println!("Cycle threshold updated to: {}", new_threshold);
}

pub fn enable_auto_refill(enabled: bool) {
    crate::authorization::require_admin().ok();
    AUTO_CYCLE_REFILL.with(|a| *a.borrow_mut() = enabled);
    ic_cdk::println!("Auto-refill {}", if enabled { "enabled" } else { "disabled" });
}

pub fn get_cycle_threshold() -> u64 {
    CYCLE_THRESHOLD.with(|t| *t.borrow())
}

pub fn is_auto_refill_enabled() -> bool {
    AUTO_CYCLE_REFILL.with(|a| *a.borrow())
}

// Wallet functions
pub fn get_main_wallet_address() -> String {
    MAIN_WALLET_ADDRESS.with(|w| w.borrow().clone())
}

pub fn get_current_fee_address() -> String {
    CURRENT_FEE_ADDRESS.with(|f| f.borrow().clone())
}

pub fn set_main_wallet_address(address: String) {
    MAIN_WALLET_ADDRESS.with(|w| *w.borrow_mut() = address);
}

// Fee governance
pub fn propose_fee_address_change(new_address: String) -> Result<(), String> {
    crate::authorization::require_admin()?;

    if !crate::utils::is_valid_solana_address(&new_address) {
        return Err("Invalid Solana address format".to_string());
    }

    PROPOSED_FEE_ADDRESS.with(|p| *p.borrow_mut() = Some(new_address.clone()));
    FEE_ADDRESS_PROPOSAL_TIME.with(|t| *t.borrow_mut() = Some(time()));

    ic_cdk::println!("Proposed fee address change to: {}", new_address);
    Ok(())
}

pub fn execute_fee_address_change() -> Result<(), String> {
    crate::authorization::require_admin()?;

    let proposed = PROPOSED_FEE_ADDRESS.with(|p| p.borrow().clone());
    if let Some(new_address) = proposed {
        CURRENT_FEE_ADDRESS.with(|f| *f.borrow_mut() = new_address.clone());
        PROPOSED_FEE_ADDRESS.with(|p| *p.borrow_mut() = None);
        FEE_ADDRESS_PROPOSAL_TIME.with(|t| *t.borrow_mut() = None);

        ic_cdk::println!("Fee address changed to: {}", new_address);
        Ok(())
    } else {
        Err("No proposed fee address change".to_string())
    }
}

pub fn cancel_fee_address_proposal() -> Result<(), String> {
    crate::authorization::require_admin()?;

    PROPOSED_FEE_ADDRESS.with(|p| *p.borrow_mut() = None);
    FEE_ADDRESS_PROPOSAL_TIME.with(|t| *t.borrow_mut() = None);

    ic_cdk::println!("Fee address proposal cancelled");
    Ok(())
}

pub fn get_fee_governance_status() -> (String, Option<String>, Option<Timestamp>) {
    let current = CURRENT_FEE_ADDRESS.with(|f| f.borrow().clone());
    let proposed = PROPOSED_FEE_ADDRESS.with(|p| p.borrow().clone());
    let proposal_time = FEE_ADDRESS_PROPOSAL_TIME.with(|t| *t.borrow());

    (current, proposed, proposal_time)
}

// Health monitoring
pub fn get_canister_start_time() -> Timestamp {
    CANISTER_START_TIME.with(|t| *t.borrow())
}

pub fn get_failed_payment_count() -> u32 {
    FAILED_PAYMENT_COUNT.with(|f| *f.borrow())
}

pub fn increment_failed_payment_count() {
    FAILED_PAYMENT_COUNT.with(|f| *f.borrow_mut() += 1);
}

pub fn get_health_check_counter() -> u64 {
    HEALTH_CHECK_COUNTER.with(|c| *c.borrow())
}

pub fn increment_health_check_counter() {
    HEALTH_CHECK_COUNTER.with(|c| *c.borrow_mut() += 1);
}

// For stable storage
pub fn create_canister_state(
    subscriptions: HashMap<String, Subscription>,
    admin_list: Vec<String>,
    read_only_users: Vec<String>,
    network_env: NetworkEnvironment,
    ed25519_key_name: String,
    solana_rpc_endpoint: String,
    main_wallet_address: String,
    current_fee_address: String,
    proposed_fee_address: Option<String>,
    fee_address_proposal_time: Option<Timestamp>,
    is_initialized: bool,
    auto_cycle_refill: bool,
    cycle_threshold: u64,
    fee_config: FeeConfig,
    canister_start_time: Timestamp,
    failed_payment_count: u32,
    health_check_counter: u64,
) -> CanisterState {
    CanisterState {
        subscriptions,
        admin_list,
        read_only_users,
        network_env,
        ed25519_key_name,
        solana_rpc_endpoint,
        main_wallet_address,
        current_fee_address,
        proposed_fee_address,
        fee_address_proposal_time,
        is_initialized,
        auto_cycle_refill,
        cycle_threshold,
        fee_config,
        canister_start_time,
        failed_payment_count,
        health_check_counter,
    }
}

pub fn restore_canister_state(state: CanisterState) {
    crate::subscription_manager::restore_subscriptions(state.subscriptions);
    crate::authorization::restore_admins(state.admin_list, state.read_only_users);

    NETWORK_ENV.with(|n| *n.borrow_mut() = state.network_env);
    ED25519_KEY_NAME.with(|k| *k.borrow_mut() = state.ed25519_key_name);
    SOLANA_RPC_ENDPOINT.with(|e| *e.borrow_mut() = state.solana_rpc_endpoint);
    MAIN_WALLET_ADDRESS.with(|w| *w.borrow_mut() = state.main_wallet_address);
    CURRENT_FEE_ADDRESS.with(|f| *f.borrow_mut() = state.current_fee_address);
    PROPOSED_FEE_ADDRESS.with(|p| *p.borrow_mut() = state.proposed_fee_address);
    FEE_ADDRESS_PROPOSAL_TIME.with(|t| *t.borrow_mut() = state.fee_address_proposal_time);
    IS_INITIALIZED.with(|i| *i.borrow_mut() = state.is_initialized);
    AUTO_CYCLE_REFILL.with(|a| *a.borrow_mut() = state.auto_cycle_refill);
    CYCLE_THRESHOLD.with(|c| *c.borrow_mut() = state.cycle_threshold);
    FEE_CONFIG.with(|f| *f.borrow_mut() = state.fee_config);
    CANISTER_START_TIME.with(|t| *t.borrow_mut() = state.canister_start_time);
    FAILED_PAYMENT_COUNT.with(|f| *f.borrow_mut() = state.failed_payment_count);
    HEALTH_CHECK_COUNTER.with(|h| *h.borrow_mut() = state.health_check_counter);
}

// Initialize state
pub fn init() {
    // Set initial configuration
    let start_time = time();
    CANISTER_START_TIME.with(|cell| *cell.borrow_mut() = start_time);

    // Initialize with default values
    NETWORK_ENV.with(|n| *n.borrow_mut() = NetworkEnvironment::Devnet);
    ED25519_KEY_NAME.with(|k| *k.borrow_mut() = "test_key_1".to_string());
    SOLANA_RPC_ENDPOINT.with(|e| *e.borrow_mut() = "https://api.devnet.solana.com".to_string());

    ic_cdk::println!("✅ State initialized successfully");
}

// Encrypted metadata
thread_local! {
    static ENCRYPTED_METADATA: std::cell::RefCell<HashMap<String, crate::types::EncryptedMetadata>> = std::cell::RefCell::new(HashMap::new());
}

pub fn store_encrypted_metadata(
    subscription_id: String,
    encrypted_data: Vec<u8>,
    iv: Vec<u8>,
    data_hash: String,
) -> Result<(), String> {
    let caller_str = caller().to_string();

    // Validate data hash
    use sha2::{Sha256, Digest};
    let calculated_hash = format!("{:x}", Sha256::digest(&encrypted_data));
    if calculated_hash != data_hash {
        return Err("Data hash mismatch".to_string());
    }

    let metadata = crate::types::EncryptedMetadata {
        subscription_id: subscription_id.clone(),
        encrypted_data,
        iv,
        data_hash,
        encrypted_by: caller_str,
        created_at: time(),
        version: 1,
    };

    ENCRYPTED_METADATA.with(|m| m.borrow_mut().insert(subscription_id.clone(), metadata));
    ic_cdk::println!("Encrypted metadata stored for subscription: {}", subscription_id);

    Ok(())
}

pub fn get_encrypted_metadata(subscription_id: String) -> Option<crate::types::EncryptedMetadata> {
    ENCRYPTED_METADATA.with(|m| m.borrow().get(&subscription_id).cloned())
}

pub fn delete_encrypted_metadata(subscription_id: String) -> Result<(), String> {
    let caller_str = caller().to_string();

    ENCRYPTED_METADATA.with(|m| {
        if let Some(metadata) = m.borrow().get(&subscription_id) {
            if metadata.encrypted_by != caller_str {
                return Err("Only the encryptor can delete metadata".to_string());
            }
        }

        if m.borrow_mut().remove(&subscription_id).is_some() {
            ic_cdk::println!("Encrypted metadata deleted for subscription: {}", subscription_id);
            Ok(())
        } else {
            Err("Metadata not found".to_string())
        }
    })
}

pub fn list_encrypted_metadata() -> Result<Vec<String>, String> {
    let caller_str = caller().to_string();

    let metadata_list: Vec<String> = ENCRYPTED_METADATA.with(|m| {
        m.borrow().iter()
            .filter(|(_, metadata)| metadata.encrypted_by == caller_str)
            .map(|(id, _)| id.clone())
            .collect()
    });

    Ok(metadata_list)
}

pub fn get_all_encrypted_metadata() -> HashMap<String, crate::types::EncryptedMetadata> {
    ENCRYPTED_METADATA.with(|m| m.borrow().clone())
}

pub fn restore_encrypted_metadata(metadata: HashMap<String, crate::types::EncryptedMetadata>) {
    ENCRYPTED_METADATA.with(|m| *m.borrow_mut() = metadata);
}