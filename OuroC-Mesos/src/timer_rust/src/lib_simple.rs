// Simplified Ouro-C Timer Canister in Rust
// A comprehensive subscription payment timer system with Solana integration

use ic_cdk::{
    api::time,
    export_candid,
    query,
    update,
    init,
    post_upgrade,
    pre_upgrade,
    storage::{stable_restore, stable_save},
    caller,
};
use std::collections::HashMap;
use candid::{CandidType, Deserialize};

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
pub struct CanisterHealth {
    pub status: CanisterStatus,
    pub uptime_seconds: u64,
    pub subscription_count: usize,
    pub failed_payments: u32,
    pub cycle_balance: u64,
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
    pub tier: Option<LicenseTier>,
    pub rate_limit_remaining: usize,
    pub expires_at: Timestamp,
    pub message: String,
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

thread_local! {
    static SUBSCRIPTIONS: std::cell::RefCell<HashMap<String, Subscription>> = std::cell::RefCell::new(HashMap::new());
    static ADMIN_LIST: std::cell::RefCell<Vec<String>> = std::cell::RefCell::new(Vec::new());

    // Network configuration
    static NETWORK_ENV: std::cell::RefCell<NetworkEnvironment> = std::cell::RefCell::new(NetworkEnvironment::Devnet);
    static IS_INITIALIZED: std::cell::RefCell<bool> = std::cell::RefCell::new(false);
    static MAIN_WALLET_ADDRESS: std::cell::RefCell<String> = std::cell::RefCell::new(String::new());

    // Health monitoring
    static CANISTER_START_TIME: std::cell::RefCell<Timestamp> = std::cell::RefCell::new(time());
    static FAILED_PAYMENT_COUNT: std::cell::RefCell<u32> = std::cell::RefCell::new(0);
}

// State structure for stable storage
#[derive(CandidType, Deserialize, Clone, Debug)]
struct CanisterState {
    subscriptions: HashMap<String, Subscription>,
    admin_list: Vec<String>,
    network_env: NetworkEnvironment,
    is_initialized: bool,
    main_wallet_address: String,
    canister_start_time: Timestamp,
    failed_payment_count: u32,
}

// =============================================================================
// INITIALIZATION & UPGRADES
// =============================================================================

#[init]
fn init() {
    ic_cdk::println!("🚀 Ouro-C Timer Canister (Rust) initializing...");

    // Set initial configuration
    let start_time = time();
    CANISTER_START_TIME.with(|cell| *cell.borrow_mut() = start_time);

    ic_cdk::println!("✅ Ouro-C Timer Canister (Rust) initialized successfully");
}

#[pre_upgrade]
fn pre_upgrade() {
    ic_cdk::println!("💾 Saving state before upgrade...");

    // Save all state to stable storage
    let state = CanisterState {
        subscriptions: SUBSCRIPTIONS.with(|s| s.borrow().clone()),
        admin_list: ADMIN_LIST.with(|a| a.borrow().clone()),
        network_env: NETWORK_ENV.with(|n| n.borrow().clone()),
        is_initialized: IS_INITIALIZED.with(|i| i.borrow().clone()),
        main_wallet_address: MAIN_WALLET_ADDRESS.with(|w| w.borrow().clone()),
        canister_start_time: CANISTER_START_TIME.with(|t| t.borrow().clone()),
        failed_payment_count: FAILED_PAYMENT_COUNT.with(|f| f.borrow().clone()),
    };

    match stable_save((&state,)) {
        Ok(_) => ic_cdk::println!("✅ State saved successfully"),
        Err(e) => ic_cdk::println!("❌ Failed to save state: {:?}", e),
    }
}

#[post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("🔄 Restoring state after upgrade...");

    // Restore state from stable storage
    match stable_restore::<(CanisterState,)>() {
        Ok((state,)) => {
            SUBSCRIPTIONS.with(|s| *s.borrow_mut() = state.subscriptions);
            ADMIN_LIST.with(|a| *a.borrow_mut() = state.admin_list);
            NETWORK_ENV.with(|n| *n.borrow_mut() = state.network_env);
            IS_INITIALIZED.with(|i| *i.borrow_mut() = state.is_initialized);
            MAIN_WALLET_ADDRESS.with(|w| *w.borrow_mut() = state.main_wallet_address);
            CANISTER_START_TIME.with(|t| *t.borrow_mut() = state.canister_start_time);
            FAILED_PAYMENT_COUNT.with(|f| *f.borrow_mut() = state.failed_payment_count);

            ic_cdk::println!("✅ State restored successfully. {} subscriptions loaded",
                              SUBSCRIPTIONS.with(|s| s.borrow().len()));
        }
        Err(e) => {
            ic_cdk::println!("❌ Failed to restore state: {:?}. Starting fresh.", e);
            init();
        }
    }
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

    ic_cdk::println!("Network set to {:?}", network);
    Ok(())
}

#[query]
fn get_network_config() -> (NetworkEnvironment, bool) {
    (
        NETWORK_ENV.with(|n| n.borrow().clone()),
        IS_INITIALIZED.with(|i| *i.borrow()),
    )
}

// =============================================================================
// CANISTER INITIALIZATION
// =============================================================================

#[update]
async fn initialize_canister() -> Result<(String, String), String> {
    ic_cdk::println!("🔧 Initializing canister with Ed25519 wallets...");

    // Mock main wallet address (in production, this would use IC management canister)
    let main_address = "MockMainWallet123456789ABCDEF".to_string();

    MAIN_WALLET_ADDRESS.with(|w| *w.borrow_mut() = main_address.clone());
    IS_INITIALIZED.with(|i| *i.borrow_mut() = true);

    let fee_address = "CKEY8bppifSErEfP5cvX8hCnmQ2Yo911mosdRx7M3HxF".to_string();

    ic_cdk::println!("✅ Canister initialized with main wallet: {} | Fee wallet managed by Solana contract", main_address);
    Ok((main_address, fee_address))
}

// =============================================================================
// SUBSCRIPTION MANAGEMENT
// =============================================================================

#[update]
async fn create_subscription(req: CreateSubscriptionRequest) -> Result<SubscriptionId, String> {
    ic_cdk::println!("📝 Creating subscription: {}", req.subscription_id);

    // License validation (simplified)
    match validate_api_key(&req.api_key).await {
        Ok(license_info) => {
            if license_info.rate_limit_remaining == 0 {
                return Err("Rate limit exceeded".to_string());
            }

            ic_cdk::println!("✅ License validated for tier: {:?}", license_info.tier);
        }
        Err(error) => {
            ic_cdk::println!("❌ License validation failed: {}", error);
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
        solana_contract_address: req.solana_contract_address.clone(),
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

    ic_cdk::println!("✅ Created subscription timer: {} for Solana contract: {}",
                              req.subscription_id, req.solana_contract_address);
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
            ic_cdk::println!("⏸️ Paused subscription: {}", id);
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

                ic_cdk::println!("▶️ Resumed subscription: {}", id);
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
            ic_cdk::println!("❌ Cancelled subscription: {}", id);
            Ok(())
        } else {
            Err("Subscription not found".to_string())
        }
    })
}

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

    // Check allowed characters only
    for char in id.chars() {
        let is_alphanumeric = char.is_ascii_alphanumeric();
        let is_allowed_special = char == '-' || char == '_';

        if !(is_alphanumeric || is_allowed_special) {
            return false;
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
        tier: Some(LicenseTier::Community),
        rate_limit_remaining: 10,
        expires_at: time() + (60 * 60 * 1_000_000_000),
        message: "Valid license (mock validation)".to_string(),
    })
}

// =============================================================================
// HEALTH MONITORING
// =============================================================================

#[query]
fn get_canister_health() -> CanisterHealth {
    let now = time();
    let uptime = now - CANISTER_START_TIME.with(|t| *t.borrow()) / 1_000_000_000;

    let subscription_count = SUBSCRIPTIONS.with(|s| s.borrow().len());
    let failed_payments = FAILED_PAYMENT_COUNT.with(|f| *f.borrow());
    let cycle_balance = ic_cdk::api::canister_balance();

    let (status, is_degraded, degradation_reason) = determine_health_status(cycle_balance);

    CanisterHealth {
        status,
        uptime_seconds: uptime,
        subscription_count,
        failed_payments,
        cycle_balance,
        is_degraded,
        degradation_reason,
    }
}

fn determine_health_status(cycle_balance: u64) -> (CanisterStatus, bool, Option<String>) {
    // Critical: Very low cycles
    if cycle_balance < 100_000_000_000 {
        return (CanisterStatus::Critical, true, Some("Critical: Very low cycle balance".to_string()));
    }

    // Degraded: Low cycles
    if cycle_balance < 500_000_000_000 {
        return (CanisterStatus::Degraded, true, Some("Warning: Low cycle balance".to_string()));
    }

    // Healthy
    (CanisterStatus::Healthy, false, None)
}

#[query]
fn ping() -> (String, Timestamp, String) {
    ("ok".to_string(), time(), "1.0.0".to_string())
}

// =============================================================================
// ADMIN FUNCTIONS
// =============================================================================

#[update]
fn add_admin(new_admin: String) -> Result<(), String> {
    let caller_str = caller().to_string();

    // Simple admin check (in production, use proper authorization)
    if ADMIN_LIST.with(|admins| admins.borrow().is_empty()) {
        ADMIN_LIST.with(|admins| admins.borrow_mut().push(caller_str.clone()));
    }

    if !ADMIN_LIST.with(|admins| admins.borrow().contains(&caller_str)) {
        return Err("Unauthorized: Admin access required".to_string());
    }

    ADMIN_LIST.with(|admins| {
        let mut admins = admins.borrow_mut();
        if !admins.contains(&new_admin) {
            admins.push(new_admin.clone());
            ic_cdk::println!("➕ Admin added: {} added {}", caller_str, new_admin);
            Ok(())
        } else {
            Err("Principal is already an admin".to_string())
        }
    })
}

#[query]
fn get_admins() -> Result<Vec<String>, String> {
    let caller_str = caller().to_string();

    if !ADMIN_LIST.with(|admins| admins.borrow().contains(&caller_str)) {
        return Err("Unauthorized: Admin access required".to_string());
    }

    Ok(ADMIN_LIST.with(|admins| admins.borrow().clone()))
}

// =============================================================================
// CANDID EXPORT
// =============================================================================

// Export all the public functions for Candid interface generation
export_candid!();