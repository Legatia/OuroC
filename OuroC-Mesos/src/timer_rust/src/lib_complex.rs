// Ouro-C Timer Canister in Rust
// A comprehensive subscription payment timer system with Solana integration

use ic_cdk::{
    api::{
        time,
        canister_balance,
        id,
    },
    export_candid,
    query,
    update,
    init,
    post_upgrade,
    pre_upgrade,
    storage::{stable_restore, stable_save},
    caller,
};
use ic_cdk_timers::set_timer;
use std::collections::HashMap;
use std::time::Duration;
use candid::{CandidType, Deserialize, Encode, Decode};
use serde::{Serialize as SerdeSerialize};
use anyhow::{Result, anyhow};
use sha2::{Sha256, Digest};

// Module declarations
mod solana_client;
mod authorization;
mod cycle_management;
mod threshold_ed25519;

// Re-export commonly used types and functions
pub use solana_client::*;
pub use authorization::*;
pub use cycle_management::*;
pub use threshold_ed25519::*;

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

pub type SubscriptionId = String;
pub type SolanaAddress = String;
pub type TransactionHash = String;
pub type Timestamp = u64;

pub const MAX_AMOUNT_USDC: u64 = 1_000_000_000_000; // 1M USDC (6 decimals)
pub const MIN_INTERVAL_SECONDS: u64 = 3600; // 1 hour minimum
pub const MAX_INTERVAL_SECONDS: u64 = 31536000; // 1 year maximum
pub const MAX_TOTAL_SUBSCRIPTIONS: usize = 10000;
pub const SUBSCRIPTION_ID_MAX_LENGTH: usize = 64;
pub const SUBSCRIPTION_ID_MIN_LENGTH: usize = 4;

// Failure handling constants
pub const MAX_CONSECUTIVE_FAILURES: u32 = 10;
pub const EXPONENTIAL_BACKOFF_BASE: u64 = 2;
pub const MAX_BACKOFF_MULTIPLIER: u64 = 16;

// Solana constants
pub const USDC_MINT_ADDRESS: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
pub const SYSTEM_PROGRAM_ID: &str = "11111111111111111111111111111111";
pub const TOKEN_PROGRAM_ID: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
pub const MEMO_PROGRAM_ID: &str = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

// License tiers for IP protection
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum LicenseTier {
    Community,
    Enterprise,
    Beta,
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum SubscriptionStatus {
    Active,
    Paused,
    Cancelled,
    Expired,
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum NetworkEnvironment {
    Mainnet,
    Devnet,
    Testnet,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Subscription {
    pub id: SubscriptionId,
    pub solana_contract_address: SolanaAddress,
    pub subscriber_address: SolanaAddress,
    pub merchant_address: SolanaAddress,
    pub payment_token_mint: String,
    pub interval_seconds: u64,
    pub next_execution: Timestamp,
    pub status: SubscriptionStatus,
    pub created_at: Timestamp,
    pub last_triggered: Option<Timestamp>,
    pub trigger_count: u64,
    pub failed_payment_count: u32,
    pub last_failure_time: Option<Timestamp>,
    pub last_error: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EncryptedMetadata {
    pub subscription_id: SubscriptionId,
    pub encrypted_data: Vec<u8>,
    pub iv: Vec<u8>,
    pub data_hash: String,
    pub encrypted_by: String, // Principal as string
    pub created_at: Timestamp,
    pub version: u8,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CreateSubscriptionRequest {
    pub subscription_id: String,
    pub solana_contract_address: SolanaAddress,
    pub payment_token_mint: String,
    pub amount: u64,
    pub subscriber_address: SolanaAddress,
    pub merchant_address: SolanaAddress,
    pub interval_seconds: u64,
    pub start_time: Option<Timestamp>,
    pub api_key: String,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct FeeConfig {
    pub trigger_fee_lamports: u64,
    pub gas_reserve_lamports: u64,
    pub cycle_refill_ratio: f64,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SolanaRpcConfig {
    pub endpoint: String,
    pub commitment: String,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SolanaKeypair {
    pub public_key: Vec<u8>,
    pub derivation_path: Vec<Vec<u8>>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SolanaInstruction {
    pub program_id: Vec<u8>,
    pub accounts: Vec<SolanaAccountMeta>,
    pub data: Vec<u8>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SolanaAccountMeta {
    pub pubkey: Vec<u8>,
    pub is_signer: bool,
    pub is_writable: bool,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SolanaTransaction {
    pub recent_blockhash: String,
    pub instructions: Vec<SolanaInstruction>,
    pub fee_payer: Vec<u8>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct WalletBalance {
    pub lamports: u64,
    pub last_updated: Timestamp,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CycleReport {
    pub current_balance: u64,
    pub threshold_balance: u64,
    pub auto_refill_enabled: bool,
    pub last_refill: Option<Timestamp>,
    pub total_consumed: u64,
    pub total_refilled: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CanisterHealth {
    pub status: CanisterStatus,
    pub uptime_seconds: u64,
    pub last_health_check: Timestamp,
    pub subscription_count: usize,
    pub active_timers: usize,
    pub failed_payments: u32,
    pub cycle_balance: u64,
    pub memory_usage: usize,
    pub is_degraded: bool,
    pub degradation_reason: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum CanisterStatus {
    Healthy,
    Degraded,
    Critical,
    Offline,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct LicenseValidationResult {
    pub is_valid: bool,
    pub developer_id: Option<String>,
    pub tier: Option<LicenseTier>,
    pub rate_limit_remaining: usize,
    pub expires_at: Timestamp,
    pub message: String,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SolanaRpcError {
    pub code: i32,
    pub message: String,
    pub data: Option<String>,
}

// Generic RPC response wrapper
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum RpcResponse<T> {
    Ok(T),
    Err(SolanaRpcError),
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct GetBalanceResult {
    pub value: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct GetLatestBlockhashResult {
    pub blockhash: String,
    pub last_valid_block_height: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SendTransactionResult {
    pub signature: String,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct GetBalanceParams {
    pub address: String,
    pub commitment: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct GetLatestBlockhashParams {
    pub commitment: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SendTransactionParams {
    pub transaction: Vec<u8>,
    pub encoding: Option<String>,
    pub skip_preflight: Option<bool>,
    pub preflight_commitment: Option<String>,
    pub max_retries: Option<u64>,
    pub min_context_slot: Option<u64>,
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

thread_local! {
    static SUBSCRIPTIONS: std::cell::RefCell<HashMap<String, Subscription>> = std::cell::RefCell::new(HashMap::new());
    static ENCRYPTED_METADATA: std::cell::RefCell<HashMap<String, EncryptedMetadata>> = std::cell::RefCell::new(HashMap::new());
    static ADMIN_LIST: std::cell::RefCell<Vec<String>> = std::cell::RefCell::new(Vec::new());
    static READ_ONLY_USERS: std::cell::RefCell<Vec<String>> = std::cell::RefCell::new(Vec::new());

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
    static CYCLE_THRESHOLD: std::cell::RefCell<u64> = std::cell::RefCell::new(5_000_000_000_000); // 5T cycles

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

// =============================================================================
// INITIALIZATION & UPGRADES
// =============================================================================

#[init]
fn init() {
    ic_cdk::print("🚀 Ouro-C Timer Canister (Rust) initializing...");

    // Set initial configuration
    let start_time = time();
    CANISTER_START_TIME.with(|cell| *cell.borrow_mut() = start_time);

    // Initialize with default values
    NETWORK_ENV.with(|cell| *cell.borrow_mut() = NetworkEnvironment::Devnet);
    ED25519_KEY_NAME.with(|cell| *cell.borrow_mut() = "test_key_1".to_string());
    SOLANA_RPC_ENDPOINT.with(|cell| *cell.borrow_mut() = "https://api.devnet.solana.com".to_string());

    ic_cdk::print("✅ Ouro-C Timer Canister (Rust) initialized successfully");
}

#[pre_upgrade]
fn pre_upgrade() {
    ic_cdk::print("💾 Saving state before upgrade...");

    // Save all state to stable storage
    let state = CanisterState {
        subscriptions: SUBSCRIPTIONS.with(|s| s.borrow().clone()),
        encrypted_metadata: ENCRYPTED_METADATA.with(|m| m.borrow().clone()),
        admin_list: ADMIN_LIST.with(|a| a.borrow().clone()),
        read_only_users: READ_ONLY_USERS.with(|r| r.borrow().clone()),
        network_env: NETWORK_ENV.with(|n| n.borrow().clone()),
        ed25519_key_name: ED25519_KEY_NAME.with(|k| k.borrow().clone()),
        solana_rpc_endpoint: SOLANA_RPC_ENDPOINT.with(|e| e.borrow().clone()),
        main_wallet_address: MAIN_WALLET_ADDRESS.with(|w| w.borrow().clone()),
        current_fee_address: CURRENT_FEE_ADDRESS.with(|f| f.borrow().clone()),
        proposed_fee_address: PROPOSED_FEE_ADDRESS.with(|p| p.borrow().clone()),
        fee_address_proposal_time: FEE_ADDRESS_PROPOSAL_TIME.with(|t| t.borrow().clone()),
        is_initialized: IS_INITIALIZED.with(|i| i.borrow().clone()),
        auto_cycle_refill: AUTO_CYCLE_REFILL.with(|a| a.borrow().clone()),
        cycle_threshold: CYCLE_THRESHOLD.with(|c| c.borrow().clone()),
        fee_config: FEE_CONFIG.with(|f| f.borrow().clone()),
        canister_start_time: CANISTER_START_TIME.with(|t| t.borrow().clone()),
        failed_payment_count: FAILED_PAYMENT_COUNT.with(|f| f.borrow().clone()),
        health_check_counter: HEALTH_CHECK_COUNTER.with(|h| h.borrow().clone()),
    };

    match stable_save((&state,)) {
        Ok(_) => ic_cdk::print("✅ State saved successfully"),
        Err(e) => ic_cdk::print(&format!("❌ Failed to save state: {:?}", e)),
    }
}

#[post_upgrade]
fn post_upgrade() {
    ic_cdk::print("🔄 Restoring state after upgrade...");

    // Restore state from stable storage
    match stable_restore::<(CanisterState,)>() {
        Ok((state,)) => {
            SUBSCRIPTIONS.with(|s| *s.borrow_mut() = state.subscriptions);
            ENCRYPTED_METADATA.with(|m| *m.borrow_mut() = state.encrypted_metadata);
            ADMIN_LIST.with(|a| *a.borrow_mut() = state.admin_list);
            READ_ONLY_USERS.with(|r| *r.borrow_mut() = state.read_only_users);
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

            ic_cdk::print!("✅ State restored successfully. {} subscriptions loaded",
                          SUBSCRIPTIONS.with(|s| s.borrow().len()));
        }
        Err(e) => {
            ic_cdk::print(&format!("❌ Failed to restore state: {:?}. Starting fresh.", e));
            // Initialize fresh state
            init();
        }
    }
}

// State structure for stable storage
#[derive(CandidType, Deserialize, Clone, Debug)]
struct CanisterState {
    subscriptions: HashMap<String, Subscription>,
    encrypted_metadata: HashMap<String, EncryptedMetadata>,
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
}

// =============================================================================
// NETWORK CONFIGURATION
// =============================================================================

#[update]
async fn set_network(network: NetworkEnvironment) -> Result<(), String> {
    if IS_INITIALIZED.with(|i| *i.borrow()) {
        return Err("Cannot change network after initialization".to_string());
    }

    NETWORK_ENV.with(|cell| *cell.borrow_mut() = network.clone());

    // Update RPC endpoint and key name based on network
    let (endpoint, key_name) = match network {
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

    ic_cdk::print(&format!("Network set to {:?} with endpoint: {}", network, endpoint));
    Ok(())
}

#[query]
fn get_network_config() -> (NetworkEnvironment, String, String) {
    (
        NETWORK_ENV.with(|n| n.borrow().clone()),
        SOLANA_RPC_ENDPOINT.with(|e| e.borrow().clone()),
        ED25519_KEY_NAME.with(|k| k.borrow().clone()),
    )
}

// =============================================================================
// CANISTER INITIALIZATION
// =============================================================================

#[update]
async fn initialize_canister() -> Result<(String, String), String> {
    ic_cdk::print("🔧 Initializing canister with Threshold Ed25519 wallets...");

    // Initialize main wallet using IC management canister
    let main_keypair_result = get_main_keypair().await?;
    let main_address = public_key_to_base58(&main_keypair_result.public_key)?;

    MAIN_WALLET_ADDRESS.with(|w| *w.borrow_mut() = main_address.clone());
    IS_INITIALIZED.with(|i| *i.borrow_mut() = true);

    let fee_address = CURRENT_FEE_ADDRESS.with(|f| f.borrow().clone());

    ic_cdk::print(&format!("✅ Canister initialized with main wallet: {} | Fee wallet managed by Solana contract", main_address));
    Ok((main_address, fee_address))
}

// =============================================================================
// SUBSCRIPTION MANAGEMENT
// =============================================================================

#[update]
async fn create_subscription(req: CreateSubscriptionRequest) -> Result<SubscriptionId, String> {
    ic_cdk::print(&format!("📝 Creating subscription: {}", req.subscription_id));

    // License validation
    match validate_api_key(&req.api_key).await {
        Ok(license_info) => {
            if license_info.rate_limit_remaining == 0 {
                return Err("Rate limit exceeded. Please upgrade your plan or wait for reset.".to_string());
            }

            // Check tier limits
            match license_info.tier {
                Some(LicenseTier::Community) => {
                    let user_subscriptions = SUBSCRIPTIONS.with(|s| {
                        s.borrow().values()
                            .filter(|sub| sub.solana_contract_address == req.solana_contract_address)
                            .count()
                    });
                    if user_subscriptions >= 10 {
                        return Err("Community tier limit reached (10 subscriptions). Upgrade to Enterprise for unlimited access.".to_string());
                    }
                }
                Some(LicenseTier::Beta) => {
                    let user_subscriptions = SUBSCRIPTIONS.with(|s| {
                        s.borrow().values()
                            .filter(|sub| sub.solana_contract_address == req.solana_contract_address)
                            .count()
                    });
                    if user_subscriptions >= 100 {
                        return Err("Beta tier limit reached (100 subscriptions).".to_string());
                    }
                }
                Some(LicenseTier::Enterprise) => {
                    // No limits for enterprise
                }
                None => {
                    return Err("Invalid license tier".to_string());
                }
            }

            ic_cdk::print(&format!("✅ License validated for tier: {:?}", license_info.tier));
        }
        Err(error) => {
            ic_cdk::print(&format!("❌ License validation failed: {}", error));
            return Err(format!("License validation failed: {}", error));
        }
    }

    // Validate subscription ID
    let id_len = req.subscription_id.len();
    if id_len < SUBSCRIPTION_ID_MIN_LENGTH {
        return Err(format!("Subscription ID too short (min {} chars)", SUBSCRIPTION_ID_MIN_LENGTH));
    }
    if id_len > SUBSCRIPTION_ID_MAX_LENGTH {
        return Err(format!("Subscription ID too long (max {} chars)", SUBSCRIPTION_ID_MAX_LENGTH));
    }

    if !is_valid_subscription_id(&req.subscription_id) {
        return Err("Subscription ID must be alphanumeric with - or _ only".to_string());
    }

    // Validate interval
    if req.interval_seconds < MIN_INTERVAL_SECONDS {
        return Err(format!("Minimum interval is {} seconds (1 hour)", MIN_INTERVAL_SECONDS));
    }
    if req.interval_seconds > MAX_INTERVAL_SECONDS {
        return Err(format!("Maximum interval is {} seconds (1 year)", MAX_INTERVAL_SECONDS));
    }

    // Validate amount
    if req.amount == 0 {
        return Err("Amount must be greater than 0".to_string());
    }
    if req.amount > MAX_AMOUNT_USDC {
        return Err("Amount exceeds maximum allowed (1M USDC)".to_string());
    }

    // Validate Solana addresses
    if !is_valid_solana_address(&req.solana_contract_address) {
        return Err("Invalid Solana contract address format".to_string());
    }
    if !is_valid_solana_address(&req.payment_token_mint) {
        return Err("Invalid payment token mint address format".to_string());
    }
    if !is_valid_solana_address(&req.subscriber_address) {
        return Err("Invalid subscriber address format".to_string());
    }
    if !is_valid_solana_address(&req.merchant_address) {
        return Err("Invalid merchant address format".to_string());
    }

    // Check if subscription already exists
    if SUBSCRIPTIONS.with(|s| s.borrow().contains_key(&req.subscription_id)) {
        return Err("Subscription ID already exists".to_string());
    }

    // Ensure canister is initialized
    if !IS_INITIALIZED.with(|i| *i.borrow()) {
        return Err("Canister not initialized. Call initialize_canister() first".to_string());
    }

    let now = time();
    let start_time = req.start_time.unwrap_or(now + req.interval_seconds * 1_000_000_000);

    let subscription = Subscription {
        id: req.subscription_id.clone(),
        solana_contract_address: req.solana_contract_address,
        subscriber_address: req.subscriber_address,
        merchant_address: req.merchant_address,
        payment_token_mint: req.payment_token_mint,
        interval_seconds: req.interval_seconds,
        next_execution: start_time,
        status: SubscriptionStatus::Active,
        created_at: now,
        last_triggered: None,
        trigger_count: 0,
        failed_payment_count: 0,
        last_failure_time: None,
        last_error: None,
    };

    // Store subscription
    SUBSCRIPTIONS.with(|s| s.borrow_mut().insert(req.subscription_id.clone(), subscription.clone()));

    // Schedule timers
    schedule_subscription_timer(&subscription);
    schedule_notification_timer(&subscription);

    // Consume license usage
    let _ = consume_license_usage(&req.api_key).await;

    let contract_addr = req.solana_contract_address.clone();
    ic_cdk::print(&format!("✅ Created subscription timer: {} for Solana contract: {}",
                          req.subscription_id, contract_addr));
    Ok(req.subscription_id)
}

#[query]
fn get_subscription(id: SubscriptionId) -> Option<Subscription> {
    SUBSCRIPTIONS.with(|s| s.borrow().get(&id).cloned())
}

#[query]
fn list_subscriptions() -> Vec<Subscription> {
    SUBSCRIPTIONS.with(|s| s.borrow().values().cloned().collect())
}

#[update]
async fn pause_subscription(id: SubscriptionId) -> Result<(), String> {
    SUBSCRIPTIONS.with(|s| {
        let mut subscriptions = s.borrow_mut();
        if let Some(subscription) = subscriptions.get_mut(&id) {
            subscription.status = SubscriptionStatus::Paused;
            // Cancel timers (implementation would need timer tracking)
            ic_cdk::print(&format!("⏸️ Paused subscription: {}", id));
            Ok(())
        } else {
            Err("Subscription not found".to_string())
        }
    })
}

#[update]
async fn resume_subscription(id: SubscriptionId) -> Result<(), String> {
    SUBSCRIPTIONS.with(|s| {
        let mut subscriptions = s.borrow_mut();
        if let Some(subscription) = subscriptions.get_mut(&id) {
            if subscription.status == SubscriptionStatus::Paused {
                subscription.status = SubscriptionStatus::Active;
                let now = time();
                subscription.next_execution = now + subscription.interval_seconds * 1_000_000_000;

                // Reschedule timers
                drop(subscriptions); // Release borrow
                let sub_clone = SUBSCRIPTIONS.with(|s| s.borrow().get(&id).cloned().unwrap());
                schedule_subscription_timer(&sub_clone);
                schedule_notification_timer(&sub_clone);

                ic_cdk::print(&format!("▶️ Resumed subscription: {}", id));
                Ok(())
            } else {
                Err("Subscription is not paused".to_string())
            }
        } else {
            Err("Subscription not found".to_string())
        }
    })
}

#[update]
async fn cancel_subscription(id: SubscriptionId) -> Result<(), String> {
    SUBSCRIPTIONS.with(|s| {
        let mut subscriptions = s.borrow_mut();
        if let Some(subscription) = subscriptions.get_mut(&id) {
            subscription.status = SubscriptionStatus::Cancelled;
            // Cancel timers
            ic_cdk::print(&format!("❌ Cancelled subscription: {}", id));
            Ok(())
        } else {
            Err("Subscription not found".to_string())
        }
    })
}

#[update]
fn cleanup_old_subscriptions(older_than_seconds: u64) -> usize {
    let now = time();
    let cutoff_time = now - older_than_seconds * 1_000_000_000;
    let mut cleanup_count = 0;

    let to_remove: Vec<String> = SUBSCRIPTIONS.with(|s| {
        s.borrow().iter()
            .filter(|(_, sub)| {
                (sub.status == SubscriptionStatus::Cancelled || sub.status == SubscriptionStatus::Expired)
                    && sub.next_execution < cutoff_time
            })
            .map(|(id, _)| id.clone())
            .collect()
    });

    for id in to_remove {
        SUBSCRIPTIONS.with(|s| s.borrow_mut().remove(&id));
        cleanup_count += 1;
    }

    ic_cdk::print(&format!("🧹 Cleaned up {} old subscriptions", cleanup_count));
    cleanup_count
}

// =============================================================================
// TIMER FUNCTIONS
// =============================================================================

fn schedule_subscription_timer(subscription: &Subscription) {
    let now = time();
    let delay_nanos = if subscription.next_execution > now {
        subscription.next_execution - now
    } else {
        0
    };

    let delay_seconds = delay_nanos / 1_000_000_000;
    let subscription_id = subscription.id.clone();

    ic_cdk::print(&format!("⏰ Scheduling timer for subscription {} in {} seconds",
                          subscription.id, delay_seconds));

    let sub_id = subscription_id.clone();
    set_timer(Duration::from_nanos(delay_nanos), move || {
        ic_cdk::spawn_local(async move {
            trigger_subscription(sub_id).await;
        });
    });
}

fn schedule_notification_timer(subscription: &Subscription) {
    let notification_time = subscription.next_execution - (24 * 60 * 60 * 1_000_000_000); // 24 hours before
    let now = time();

    if notification_time > now {
        let delay_nanos = notification_time - now;
        let subscription_id = subscription.id.clone();

        let sub_id = subscription_id.clone();
        set_timer(Duration::from_nanos(delay_nanos), move || {
            ic_cdk::spawn_local(async move {
                trigger_notification(sub_id).await;
            });
        });

        ic_cdk::print(&format!("🔔 Scheduled notification for subscription: {}", subscription.id));
    }
}

async fn trigger_subscription(subscription_id: String) {
    ic_cdk::print(&format!("🚀 Triggering subscription: {}", subscription_id));

    let subscription = SUBSCRIPTIONS.with(|s| s.borrow().get(&subscription_id).cloned());

    if let Some(mut sub) = subscription {
        if sub.status == SubscriptionStatus::Active {
            // Send payment opcode
            let result = send_solana_opcode(
                &sub.solana_contract_address,
                &subscription_id,
                &sub.subscriber_address,
                &sub.merchant_address,
                0, // Opcode 0 = Payment
            ).await;

            let now = time();
            let next_execution = now + sub.interval_seconds * 1_000_000_000;

            match result {
                Ok(tx_hash) => {
                    // Success - reset failure count and schedule next
                    sub.next_execution = next_execution;
                    sub.last_triggered = Some(now);
                    sub.trigger_count += 1;
                    sub.failed_payment_count = 0;
                    sub.last_failure_time = None;
                    sub.last_error = None;

                    SUBSCRIPTIONS.with(|s| s.borrow_mut().insert(subscription_id.clone(), sub.clone()));
                    schedule_subscription_timer(&sub);
                    schedule_notification_timer(&sub);

                    ic_cdk::print(&format!("💰 Payment trigger sent: {} | Next: {}", tx_hash, next_execution));
                }
                Err(error) => {
                    // Payment failed - increment failure count and apply exponential backoff
                    let new_failure_count = sub.failed_payment_count + 1;
                    ic_cdk::print(&format!("❌ Payment trigger failed ({}): {}", new_failure_count, error));

                    if new_failure_count >= MAX_CONSECUTIVE_FAILURES {
                        // Too many failures - pause subscription
                        sub.status = SubscriptionStatus::Paused;
                        sub.failed_payment_count = new_failure_count;
                        sub.last_failure_time = Some(now);
                        sub.last_error = Some(error.clone());

                        SUBSCRIPTIONS.with(|s| s.borrow_mut().insert(subscription_id.clone(), sub));
                        ic_cdk::print(&format!("⏸️ Subscription {} auto-paused after {} failures",
                                             subscription_id, MAX_CONSECUTIVE_FAILURES));
                    } else {
                        // Apply exponential backoff
                        let backoff_multiplier = EXPONENTIAL_BACKOFF_BASE.pow(new_failure_count)
                            .min(MAX_BACKOFF_MULTIPLIER);
                        let backoff_interval = sub.interval_seconds * backoff_multiplier;
                        let backoff_next_execution = now + backoff_interval * 1_000_000_000;

                        sub.next_execution = backoff_next_execution;
                        sub.failed_payment_count = new_failure_count;
                        sub.last_failure_time = Some(now);
                        sub.last_error = Some(error.clone());

                        SUBSCRIPTIONS.with(|s| s.borrow_mut().insert(subscription_id.clone(), sub.clone()));
                        schedule_subscription_timer(&sub);
                        schedule_notification_timer(&sub);

                        ic_cdk::print(&format!("🔄 Retrying with {}x backoff. Next: {}",
                                             backoff_multiplier, backoff_next_execution));
                    }
                }
            }
        } else {
            ic_cdk::print(&format!("⏸️ Subscription {} is not active, skipping", subscription_id));
        }
    } else {
        ic_cdk::print(&format!("❌ Subscription {} not found", subscription_id));
    }
}

async fn trigger_notification(subscription_id: String) {
    ic_cdk::print(&format!("🔔 Triggering notification for subscription: {}", subscription_id));

    let subscription = SUBSCRIPTIONS.with(|s| s.borrow().get(&subscription_id).cloned());

    if let Some(sub) = subscription {
        if sub.status == SubscriptionStatus::Active {
            // Send notification opcode
            let result = send_solana_opcode(
                &sub.solana_contract_address,
                &subscription_id,
                &sub.subscriber_address,
                &sub.merchant_address,
                1, // Opcode 1 = Notification
            ).await;

            match result {
                Ok(tx_hash) => {
                    ic_cdk::print(&format!("📧 Notification sent successfully for subscription: {} | tx: {}",
                                          subscription_id, tx_hash));
                }
                Err(error) => {
                    ic_cdk::print(&format!("❌ Failed to send notification for subscription: {} | error: {}",
                                          subscription_id, error));
                }
            }
        } else {
            ic_cdk::print(&format!("⏸️ Subscription {} is not active, skipping notification", subscription_id));
        }
    } else {
        ic_cdk::print(&format!("❌ Subscription {} not found for notification", subscription_id));
    }
}

// =============================================================================
// SOLANA INTEGRATION
// =============================================================================

async fn send_solana_opcode(
    contract_address: &str,
    subscription_id: &str,
    subscriber_address: &str,
    merchant_address: &str,
    opcode: u8,
) -> Result<String, String> {
    let opcode_name = if opcode == 0 { "Payment" } else { "Notification" };
    ic_cdk::print(&format!("🔨 Sending opcode {} ({}) for subscription: {}", opcode, opcode_name, subscription_id));

    // Get current RPC configuration
    let rpc_config = SOLANA_RPC_ENDPOINT.with(|e| SolanaRpcConfig {
        endpoint: e.borrow().clone(),
        commitment: "confirmed".to_string(),
    });

    let solana_client = SolanaClient::new(&rpc_config);

    // Get recent blockhash
    let blockhash = match solana_client.get_latest_blockhash().await {
        Ok(hash) => hash,
        Err(e) => return Err(format!("Failed to get blockhash: {}", e)),
    };

    // Get main keypair
    let keypair = match get_main_keypair().await {
        Ok(kp) => kp,
        Err(e) => return Err(format!("Failed to get keypair: {}", e)),
    };

    // Build instruction data
    let mut instruction_data = Vec::new();
    instruction_data.push(opcode); // Opcode
    let timestamp_bytes = time().to_le_bytes();
    instruction_data.extend_from_slice(&timestamp_bytes);

    // Build accounts (simplified)
    let accounts = vec![
        SolanaAccountMeta {
            pubkey: contract_address.as_bytes().to_vec(),
            is_signer: false,
            is_writable: true,
        },
        SolanaAccountMeta {
            pubkey: subscriber_address.as_bytes().to_vec(),
            is_signer: false,
            is_writable: false,
        },
        SolanaAccountMeta {
            pubkey: merchant_address.as_bytes().to_vec(),
            is_signer: false,
            is_writable: false,
        },
    ];

    let instruction = SolanaInstruction {
        program_id: contract_address.as_bytes().to_vec(),
        accounts,
        data: instruction_data,
    };

    let transaction = SolanaTransaction {
        recent_blockhash: blockhash,
        instructions: vec![instruction],
        fee_payer: keypair.public_key.clone(),
    };

    // Serialize transaction (simplified)
    let serialized_tx = serialize_transaction(&transaction);

    // Sign transaction
    let signature = match sign_with_main_key(serialized_tx).await {
        Ok(sig) => sig,
        Err(e) => return Err(format!("Failed to sign transaction: {}", e)),
    };

    // Send transaction
    match solana_client.send_transaction(signature).await {
        Ok(tx_hash) => {
            ic_cdk::print(&format!("✅ {} transaction sent: {}", opcode_name, tx_hash));
            Ok(tx_hash)
        }
        Err(e) => Err(format!("Failed to send transaction: {}", e)),
    }
}

// Simplified transaction serialization
fn serialize_transaction(_transaction: &SolanaTransaction) -> Vec<u8> {
    // This is a simplified implementation
    // In production, implement proper Solana transaction serialization
    b"mock_serialized_transaction".to_vec()
}

// The get_main_keypair function is now provided by the threshold_ed25519 module
// public_key_to_base58 function is also provided by the threshold_ed25519 module

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

fn is_valid_subscription_id(id: &str) -> bool {
    // Length validation
    let id_len = id.len();
    if id_len < SUBSCRIPTION_ID_MIN_LENGTH || id_len > SUBSCRIPTION_ID_MAX_LENGTH {
        return false;
    }

    // Prevent null bytes and control characters
    if id.contains('\u{0}') || id.contains('\n') || id.contains('\r') || id.contains('\t') {
        return false;
    }

    // Prevent path traversal attempts
    if id.contains("../") || id.contains("..\\") || id.contains("/etc/") || id.contains("/usr/") {
        return false;
    }

    // Prevent script injection attempts
    if id.contains("<script") || id.contains("javascript:") || id.contains("data:") {
        return false;
    }

    // Prevent SQL injection patterns
    let sql_patterns = ["SELECT", "INSERT", "DELETE", "DROP", "UNION", "'", "\""];
    for pattern in &sql_patterns {
        if id.to_uppercase().contains(pattern) {
            return false;
        }
    }

    // Check allowed characters only
    for char in id.chars() {
        let is_alphanumeric = char.is_ascii_alphanumeric();
        let is_allowed_special = char == '-' || char == '_';

        if !(is_alphanumeric || is_allowed_special) {
            return false;
        }
    }

    // Prevent sequential characters (prevent automated attacks)
    let chars: Vec<char> = id.chars().collect();
    if chars.len() >= 3 {
        let mut consecutive_same = 0;
        let mut last_char: Option<char> = None;

        for char in chars {
            if let Some(last) = last_char {
                if last == char {
                    consecutive_same += 1;
                    if consecutive_same >= 3 {
                        return false; // No more than 3 same chars in a row
                    }
                } else {
                    consecutive_same = 0;
                }
            }
            last_char = Some(char);
        }
    }

    true
}

fn is_valid_solana_address(address: &str) -> bool {
    let length = address.len();

    // Length validation: Solana addresses are base58 encoded and typically 32-44 characters
    if length < 32 || length > 44 {
        return false;
    }

    // Prevent null bytes and control characters
    if address.contains('\u{0}') || address.contains('\n') || address.contains('\r') || address.contains('\t') {
        return false;
    }

    // Prevent dangerous characters that shouldn't be in base58
    let dangerous_chars = ['0', 'O', 'I', 'l'];
    for char in dangerous_chars {
        if address.contains(char) {
            return false; // These characters aren't used in base58
        }
    }

    // Prevent path traversal and injection attempts
    let injection_patterns = ["../", "..\\", "<script", "javascript:", "SELECT", "INSERT", "'", "\""];
    for pattern in &injection_patterns {
        if address.contains(pattern) {
            return false;
        }
    }

    true
}

// =============================================================================
// LICENSE VALIDATION
// =============================================================================

async fn validate_api_key(api_key: &str) -> Result<LicenseValidationResult, String> {
    // Check for shared Community API key
    if api_key == "ouro_community_shared_2025_demo_key" {
        return Ok(LicenseValidationResult {
            is_valid: true,
            developer_id: None,
            tier: Some(LicenseTier::Community),
            rate_limit_remaining: 10,
            expires_at: time() + (60 * 60 * 1_000_000_000), // 1 hour
            message: "Valid Community license (shared key)".to_string(),
        });
    }

    // Check for valid API key format
    if !api_key.starts_with("ouro_") {
        return Err("Invalid API key format".to_string());
    }

    // Mock validation for other API keys
    Ok(LicenseValidationResult {
        is_valid: true,
        developer_id: None,
        tier: Some(LicenseTier::Community),
        rate_limit_remaining: 10,
        expires_at: time() + (60 * 60 * 1_000_000_000),
        message: "Valid license (mock validation)".to_string(),
    })
}

async fn consume_license_usage(api_key: &str) -> Result<(), String> {
    // Mock consumption for MVP
    ic_cdk::print(&format!("License usage consumed for API key: {}", api_key));
    Ok(())
}

// =============================================================================
// HEALTH MONITORING
// =============================================================================

#[query]
fn get_canister_health() -> CanisterHealth {
    let now = time();
    let uptime = now - CANISTER_START_TIME.with(|t| *t.borrow()) / 1_000_000_000;

    let subscription_count = SUBSCRIPTIONS.with(|s| s.borrow().len());
    let active_timers = 0; // Would track actual timer count
    let failed_payments = FAILED_PAYMENT_COUNT.with(|f| *f.borrow());
    let cycle_balance = ic_cdk::api::canister_balance();
    let memory_usage = 0; // Would use heap_size in real implementation

    let (status, is_degraded, degradation_reason) = determine_health_status(cycle_balance);

    // Update health check timestamp
    HEALTH_CHECK_COUNTER.with(|c| *c.borrow_mut() += 1);

    CanisterHealth {
        status,
        uptime_seconds: uptime,
        last_health_check: now,
        subscription_count,
        active_timers,
        failed_payments,
        cycle_balance,
        memory_usage,
        is_degraded,
        degradation_reason,
    }
}

fn determine_health_status(cycle_balance: u64) -> (CanisterStatus, bool, Option<String>) {
    // Critical: Very low cycles
    if cycle_balance < 100_000_000_000 {
        return (CanisterStatus::Critical, true, Some("Critical: Very low cycle balance".to_string()));
    }

    // Degraded: Low cycles or high failure rate
    if cycle_balance < 500_000_000_000 {
        return (CanisterStatus::Degraded, true, Some("Warning: Low cycle balance".to_string()));
    }

    // Degraded: High failure rate
    let failed_payments = FAILED_PAYMENT_COUNT.with(|f| *f.borrow());
    if failed_payments > 10 {
        return (CanisterStatus::Degraded, true, Some("Warning: High payment failure rate".to_string()));
    }

    // Degraded: Too many active subscriptions
    let subscription_count = SUBSCRIPTIONS.with(|s| s.borrow().len());
    if subscription_count > 10000 {
        return (CanisterStatus::Degraded, true, Some("Warning: High subscription load".to_string()));
    }

    // Healthy
    (CanisterStatus::Healthy, false, None)
}

#[query]
fn ping() -> (String, Timestamp, String) {
    ("ok".to_string(), time(), "1.0.0".to_string())
}

// =============================================================================
// EMERGENCY FUNCTIONS
// =============================================================================

#[update]
async fn emergency_pause_all() -> Result<usize, String> {
    let mut paused_count = 0;

    SUBSCRIPTIONS.with(|s| {
        let mut subscriptions = s.borrow_mut();
        for (sub_id, subscription) in subscriptions.iter_mut() {
            if subscription.status == SubscriptionStatus::Active {
                subscription.status = SubscriptionStatus::Paused;
                paused_count += 1;
            }
        }
    });

    ic_cdk::print(&format!("🚨 EMERGENCY: Paused {} subscriptions", paused_count));
    Ok(paused_count)
}

#[update]
async fn resume_operations() -> Result<usize, String> {
    let mut resumed_count = 0;

    let to_resume: Vec<String> = SUBSCRIPTIONS.with(|s| {
        s.borrow().iter()
            .filter(|(_, sub)| sub.status == SubscriptionStatus::Paused)
            .map(|(id, _)| id.clone())
            .collect()
    });

    for sub_id in to_resume {
        if let Ok(_) = resume_subscription(sub_id.clone()).await {
            resumed_count += 1;
        }
    }

    ic_cdk::print(&format!("🔄 RECOVERY: Resumed {} subscriptions", resumed_count));
    Ok(resumed_count)
}

// =============================================================================
// CANDID EXPORT
// =============================================================================

// Export all the public functions for Candid interface generation
export_candid!();