// Ouro-C Timer Canister (Rust) - Main Entry Point
// A comprehensive subscription payment timer system with Solana integration

// Import all modules
mod types;
mod state;
mod subscription_manager;
mod authorization;
mod timer;
mod license;
mod solana;
mod sol_rpc;      // NEW: SOL RPC client wrapper
mod solana_rpc;   // NEW: Solana integration using SOL RPC canister
mod solana_client;
mod nonce_manager; // NEW: Durable nonce management
mod utils;
mod health;
mod threshold_ed25519;

// Import types for use in public API
use types::*;

use ic_cdk::{
    api::{time, id},
    export_candid,
    query,
    update,
    init,
    post_upgrade,
    pre_upgrade,
    storage::{stable_restore, stable_save},
};

use ic_cdk::api::management_canister::http_request::{HttpResponse, TransformArgs};

// =============================================================================
// INITIALIZATION & UPGRADES
// =============================================================================

#[init]
fn init() {
    ic_cdk::println!("🚀 Ouro-C Timer Canister (Rust) initializing...");
    state::init();
    timer::start_blockhash_refresh_timer();
    ic_cdk::println!("✅ Ouro-C Timer Canister (Rust) initialized successfully");
}

#[pre_upgrade]
fn pre_upgrade() {
    ic_cdk::println!("💾 Saving state before upgrade...");

    // Collect all state data
    let subscriptions = subscription_manager::get_all_subscriptions();
    let _encrypted_metadata = state::get_all_encrypted_metadata();
    let admin_list = authorization::get_admin_list();
    let read_only_users = authorization::get_read_only_users_list();
    let (network_env, ed25519_key_name, solana_rpc_endpoint) = state::get_network_config();
    let main_wallet_address = state::get_main_wallet_address();
    let current_fee_address = state::get_current_fee_address();
    let (proposed_fee_address, fee_address_proposal_time) = {
        let (_current, proposed, time) = state::get_fee_governance_status();
        (proposed, time)
    };
    let is_initialized = state::is_initialized();
    let auto_cycle_refill = state::is_auto_refill_enabled();
    let cycle_threshold = state::get_cycle_threshold();
    let fee_config = state::get_fee_config().unwrap_or_else(|_| types::FeeConfig {
        trigger_fee_lamports: 5000,
        gas_reserve_lamports: 5000,
        cycle_refill_ratio: 0.3,
    });
    let canister_start_time = state::get_canister_start_time();
    let failed_payment_count = state::get_failed_payment_count();
    let health_check_counter = state::get_health_check_counter();

    // Create state structure for stable storage
    let canister_state = state::create_canister_state(
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
    );

    match stable_save((&canister_state,)) {
        Ok(_) => ic_cdk::println!("✅ State saved successfully"),
        Err(e) => ic_cdk::println!("❌ Failed to save state: {:?}", e),
    }
}

#[post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("🔄 Restoring state after upgrade...");

    match stable_restore::<(state::CanisterState,)>() {
        Ok((canister_state,)) => {
            // Restore all state
            state::restore_canister_state(canister_state.clone());

            // Restore timers
            let (active_timers, notification_timers) = timer::get_all_timers();
            timer::restore_timers(active_timers, notification_timers);

            // Start blockhash refresh timer
            timer::start_blockhash_refresh_timer();

            ic_cdk::println!("✅ State restored successfully. {} subscriptions loaded",
                              canister_state.subscriptions.len());
        }
        Err(e) => {
            ic_cdk::println!("❌ Failed to restore state: {:?}. Starting fresh.", e);
            init();
        }
    }
}

// =============================================================================
// PUBLIC API - NETWORK CONFIGURATION
// =============================================================================

#[update]
async fn set_network(network: NetworkEnvironment) -> Result<(), String> {
    state::set_network(network)
}

#[query]
fn get_network_config() -> (NetworkEnvironment, String, String) {
    state::get_network_config()
}

// =============================================================================
// PUBLIC API - CANISTER INITIALIZATION
// =============================================================================

#[update]
async fn initialize_canister() -> Result<(String, String), String> {
    state::initialize_canister().await
}

// =============================================================================
// PUBLIC API - SUBSCRIPTION MANAGEMENT
// =============================================================================

#[update]
async fn create_subscription(req: CreateSubscriptionRequest) -> Result<SubscriptionId, String> {
    subscription_manager::create_subscription(req).await
}

#[query]
fn get_subscription(id: SubscriptionId) -> Option<Subscription> {
    subscription_manager::get_subscription(id)
}

#[query]
fn list_subscriptions() -> Vec<Subscription> {
    subscription_manager::list_subscriptions()
}

#[update]
async fn update_subscription_addresses(
    id: SubscriptionId,
    new_subscriber_address: Option<String>,
    new_merchant_address: Option<String>,
) -> Result<(), String> {
    subscription_manager::update_subscription_addresses(id, new_subscriber_address, new_merchant_address)
}

#[update]
async fn pause_subscription(id: SubscriptionId) -> Result<(), String> {
    subscription_manager::pause_subscription(id).await
}

#[update]
async fn resume_subscription(id: SubscriptionId) -> Result<(), String> {
    subscription_manager::resume_subscription(id)
}

#[update]
async fn cancel_subscription(id: SubscriptionId) -> Result<(), String> {
    subscription_manager::cancel_subscription(id).await
}

#[update]
fn cleanup_old_subscriptions(older_than_seconds: u64) -> candid::Nat {
    let count = subscription_manager::cleanup_old_subscriptions(older_than_seconds);
    candid::Nat::from(count)
}

#[query]
async fn get_overdue_subscriptions() -> Vec<SubscriptionId> {
    subscription_manager::get_overdue_subscriptions()
}

// =============================================================================
// PUBLIC API - WALLET FUNCTIONS
// =============================================================================

#[update]
async fn get_ed25519_public_key() -> Result<String, String> {
    // Use REAL tECDSA public key from IC management canister
    let pubkey_bytes = solana::get_ed25519_public_key().await?;

    // Convert to base58 (Solana address format)
    let pubkey_base58 = bs58::encode(&pubkey_bytes).into_string();

    ic_cdk::println!("🔑 Retrieved real Ed25519 public key: {}", pubkey_base58);
    Ok(pubkey_base58)
}

#[update]
async fn get_solana_address_for_caller() -> Result<String, String> {
    let caller = ic_cdk::caller();
    let (network_env, key_name, _rpc_endpoint) = state::get_network_config();

    ic_cdk::println!("🔍 Debug - Network: {:?}, Key: {}, RPC: {}", network_env, key_name, _rpc_endpoint);

    let network = match network_env {
        NetworkEnvironment::Mainnet => solana_client::SolanaNetwork::Mainnet,
        NetworkEnvironment::Devnet => solana_client::SolanaNetwork::Devnet,
        NetworkEnvironment::Testnet => solana_client::SolanaNetwork::Testnet,
    };

    let client = solana_client::SolanaChainFusionClient::new(key_name, network);
    client.get_solana_address_for_principal(caller).await
}

#[update]
async fn get_balance_for_address(address: String) -> Result<u64, String> {
    if !solana_client::validate_solana_address(&address) {
        return Err("Invalid Solana address format".to_string());
    }

    let (network_env, key_name, _rpc_endpoint) = state::get_network_config();

    let network = match network_env {
        NetworkEnvironment::Mainnet => solana_client::SolanaNetwork::Mainnet,
        NetworkEnvironment::Devnet => solana_client::SolanaNetwork::Devnet,
        NetworkEnvironment::Testnet => solana_client::SolanaNetwork::Testnet,
    };

    let client = solana_client::SolanaChainFusionClient::new(key_name, network);
    client.get_balance(&address).await
}

#[update]
async fn get_balance_for_caller() -> Result<u64, String> {
    // Get Solana address for caller
    let address = get_solana_address_for_caller().await?;
    // Get balance for that address
    get_balance_for_address(address).await
}

#[update]
async fn get_wallet_addresses() -> Result<WalletInfo, String> {
    let main_address = state::get_main_wallet_address();
    if main_address.is_empty() {
        return Err("Canister not initialized".to_string());
    }

    let main_balance = solana::get_solana_balance(&main_address).await.unwrap_or(0);
    let now = time();

    Ok(WalletInfo {
        main_address,
        main_balance,
        last_updated: now,
    })
}

#[update]
async fn get_wallet_balances() -> Result<WalletBalance, String> {
    let main_address = state::get_main_wallet_address();
    if main_address.is_empty() {
        return Err("Canister not initialized".to_string());
    }

    let balance = solana::get_solana_balance(&main_address).await.unwrap_or(0);
    let now = time();

    Ok(WalletBalance {
        lamports: balance,
        last_updated: now,
    })
}

#[query]
async fn get_comprehensive_wallet_info() -> Result<WalletInfo, String> {
    get_wallet_addresses().await
}

#[query]
async fn get_comprehensive_wallet_info_v1() -> Result<WalletInfo, String> {
    get_wallet_addresses().await
}

// =============================================================================
// PUBLIC API - FEE CONFIGURATION
// =============================================================================

#[update]
async fn update_fee_config(new_config: FeeConfig) -> Result<(), String> {
    state::update_fee_config(new_config)
}

#[query]
async fn get_fee_config() -> Result<FeeConfig, String> {
    state::get_fee_config()
}

// =============================================================================
// PUBLIC API - CYCLE MANAGEMENT
// =============================================================================

#[query]
async fn get_cycle_status() -> CycleReport {
    let current = state::get_cycle_balance();
    let threshold = state::get_cycle_threshold();
    let auto_refill = state::is_auto_refill_enabled();

    CycleReport {
        current_balance: current,
        threshold_balance: threshold,
        auto_refill_enabled: auto_refill,
        last_refill: None,
        total_consumed: 0,
        total_refilled: 0,
    }
}

#[update]
async fn refill_cycles_from_fees() -> Result<u64, String> {
    authorization::require_admin()?;
    // Mock implementation
    let cycles_refilled = 1_000_000_000_000; // 1T cycles
    ic_cdk::println!("Cycles refilled: {}", cycles_refilled);
    Ok(cycles_refilled)
}

#[update]
async fn set_cycle_threshold(new_threshold: u64) {
    state::set_cycle_threshold(new_threshold)
}

#[update]
async fn enable_auto_refill(enabled: bool) {
    state::enable_auto_refill(enabled)
}

#[query]
async fn monitor_cycles() -> Result<bool, String> {
    // Mock implementation
    Ok(true)
}

// =============================================================================
// PUBLIC API - HEALTH MONITORING
// =============================================================================

#[query]
async fn get_canister_status() -> (bool, String, u64, u64, u64) {
    let cycles = state::get_cycle_balance();
    let is_healthy = cycles > 100_000_000_000; // More than 0.1T cycles
    let status = if is_healthy { "healthy".to_string() } else { "degraded".to_string() };
    let now = time();
    let uptime = now - state::get_canister_start_time();

    (is_healthy, status, uptime, cycles, subscription_manager::get_subscription_count() as u64)
}

#[query]
async fn get_canister_health() -> CanisterHealth {
    health::perform_health_check().await
}

#[query]
async fn get_system_metrics() -> SystemMetrics {
    health::get_system_metrics().await
}

#[query]
async fn get_detailed_health_report() -> health::DetailedHealthReport {
    health::get_detailed_health_report().await
}

#[query]
async fn check_wallet_health() -> health::WalletHealthReport {
    health::check_wallet_health().await
}

#[query]
async fn perform_emergency_health_check() -> health::EmergencyHealthReport {
    health::perform_emergency_health_check().await
}

#[query]
async fn get_subscription_health_metrics() -> health::SubscriptionHealthMetrics {
    health::get_subscription_health_metrics().await
}

#[query]
fn ping() -> (String, Timestamp, String) {
    ("ok".to_string(), time(), "1.0.0".to_string())
}

// =============================================================================
// PUBLIC API - EMERGENCY FUNCTIONS
// =============================================================================

#[update]
async fn emergency_pause_all() -> Result<candid::Nat, String> {
    let subscriptions = subscription_manager::list_subscriptions();
    let mut paused_count: usize = 0;

    for subscription in subscriptions {
        if subscription.status == SubscriptionStatus::Active {
            if subscription_manager::pause_subscription(subscription.id.clone()).await.is_ok() {
                paused_count += 1;
            }
        }
    }

    ic_cdk::println!("🚨 EMERGENCY: Paused {} subscriptions", paused_count);
    Ok(candid::Nat::from(paused_count))
}

#[update]
async fn resume_operations() -> Result<candid::Nat, String> {
    let subscriptions = subscription_manager::list_subscriptions();
    let mut resumed_count: usize = 0;

    for subscription in subscriptions {
        if subscription.status == SubscriptionStatus::Paused {
            if subscription_manager::resume_subscription(subscription.id.clone()).is_ok() {
                resumed_count += 1;
            }
        }
    }

    ic_cdk::println!("🔄 RECOVERY: Resumed {} subscriptions", resumed_count);
    Ok(candid::Nat::from(resumed_count))
}

#[update]
async fn report_health_metrics() {
    let health = health::perform_health_check().await;
    ic_cdk::println!("Health Report: {:?}", health);
}

// =============================================================================
// PUBLIC API - FEE GOVERNANCE
// =============================================================================

#[update]
async fn propose_fee_address_change(new_address: String) -> Result<(), String> {
    state::propose_fee_address_change(new_address)
}

#[update]
async fn execute_fee_address_change() -> Result<(), String> {
    state::execute_fee_address_change()
}

#[update]
async fn cancel_fee_address_proposal() -> Result<(), String> {
    state::cancel_fee_address_proposal()
}

#[query]
async fn get_fee_governance_status() -> (String, Option<String>, Option<Timestamp>) {
    state::get_fee_governance_status()
}

#[query]
async fn get_current_fee_address() -> String {
    state::get_current_fee_address()
}

// =============================================================================
// PUBLIC API - ADMIN WITHDRAWAL FUNCTIONS
// =============================================================================

#[update]
async fn admin_withdraw_sol(
    recipient: String,
    amount: u64,
    _derivation_path: Option<Vec<Vec<u8>>>,
) -> Result<String, String> {
    authorization::require_admin()?;

    if !utils::is_valid_solana_address(&recipient) {
        return Err("Invalid recipient address".to_string());
    }

    if amount < 5_000_000 {
        return Err("Minimum withdrawal is 0.005 SOL".to_string());
    }

    // Mock implementation
    let tx_hash = format!("mock_withdraw_tx_{}", time());
    ic_cdk::println!("SOL withdrawal: {} to {} | tx: {}", amount, recipient, tx_hash);

    Ok(tx_hash)
}

#[update]
async fn admin_withdraw_token(
    recipient: String,
    token_mint: String,
    amount: u64,
    _derivation_path: Option<Vec<Vec<u8>>>,
) -> Result<String, String> {
    authorization::require_admin()?;

    if !utils::is_valid_solana_address(&recipient) {
        return Err("Invalid recipient address".to_string());
    }

    if !utils::is_valid_solana_address(&token_mint) {
        return Err("Invalid token mint address".to_string());
    }

    // Mock implementation
    let tx_hash = format!("mock_token_withdraw_tx_{}", time());
    ic_cdk::println!("Token withdrawal: {} of {} to {} | tx: {}", amount, token_mint, recipient, tx_hash);

    Ok(tx_hash)
}

// =============================================================================
// PUBLIC API - ENCRYPTED METADATA
// =============================================================================

#[update]
async fn store_encrypted_metadata(
    subscription_id: String,
    encrypted_data: Vec<u8>,
    iv: Vec<u8>,
    data_hash: String,
) -> Result<(), String> {
    state::store_encrypted_metadata(subscription_id, encrypted_data, iv, data_hash)
}

#[query]
async fn get_encrypted_metadata(subscription_id: String) -> Option<EncryptedMetadata> {
    state::get_encrypted_metadata(subscription_id)
}

#[update]
async fn delete_encrypted_metadata(subscription_id: String) -> Result<(), String> {
    state::delete_encrypted_metadata(subscription_id)
}

#[query]
async fn list_encrypted_metadata() -> Result<Vec<String>, String> {
    state::list_encrypted_metadata()
}

// =============================================================================
// PUBLIC API - AUTHORIZATION
// =============================================================================

#[update]
async fn add_admin(new_admin: String) -> Result<(), String> {
    authorization::add_admin(new_admin).await
}

#[update]
async fn remove_admin(admin_to_remove: String) -> Result<(), String> {
    authorization::remove_admin(admin_to_remove).await
}

#[update]
async fn add_read_only_user(user: String) -> Result<(), String> {
    authorization::add_read_only_user(user).await
}

#[update]
async fn remove_read_only_user(user: String) -> Result<(), String> {
    authorization::remove_read_only_user(user).await
}

#[query]
async fn get_admins() -> Result<Vec<String>, String> {
    authorization::get_admins().await
}

#[query]
async fn get_read_only_users() -> Result<Vec<String>, String> {
    authorization::get_read_only_users().await
}

#[update]
async fn initialize_first_admin() -> Result<(), String> {
    authorization::initialize_first_admin().await
}

#[update]
async fn add_controller_admin(new_admin: String) -> Result<(), String> {
    authorization::add_controller_admin(new_admin).await
}

#[query]
async fn debug_admin_info() -> String {
    authorization::debug_admin_info().await
}

// =============================================================================
// PUBLIC API - LICENSE VALIDATION
// =============================================================================

#[query]
async fn get_license_info(api_key: String) -> Result<LicenseValidationResult, String> {
    license::validate_api_key(&api_key).await
}

// =============================================================================
// PUBLIC API - SCHNORR SIGNATURES FOR SOLANA
// =============================================================================

/// Get the canister's Ed25519 public key bytes for Solana contract verification
/// Returns raw 32-byte public key that should be configured in Solana contract
/// For base58 format, use get_ed25519_public_key() instead
#[query]
async fn get_ed25519_public_key_bytes() -> Result<Vec<u8>, String> {
    let (_, key_name, _) = state::get_network_config();
    threshold_ed25519::get_ed25519_public_key(&key_name).await
}

/// Generate a payment authorization signature for Solana contract
/// Returns (signature_bytes, timestamp) tuple
///
/// The signature is for the message: subscription_id + timestamp + amount
/// This matches the Solana contract's create_payment_message format
#[update]
async fn generate_payment_signature(
    subscription_id: String,
    amount: u64,
) -> Result<(Vec<u8>, i64), String> {
    ic_cdk::println!("🔐 Generating payment signature for subscription: {}", subscription_id);

    let (_, key_name, _) = state::get_network_config();

    match threshold_ed25519::create_payment_authorization(&key_name, &subscription_id, amount).await {
        Ok((signature, timestamp)) => {
            ic_cdk::println!("✅ Generated signature: {} bytes", signature.len());
            Ok((signature, timestamp))
        }
        Err(e) => {
            ic_cdk::println!("❌ Failed to generate signature: {}", e);
            Err(e)
        }
    }
}

/// Create a subscription with payment authorization
/// This combines subscription creation with signature generation
#[update]
async fn create_subscription_with_signature(
    subscription_id: String,
    solana_contract_address: String,
    payment_token_mint: String,
    amount: u64,
    subscriber_address: String,
    merchant_address: String,
    interval_seconds: i64,
    start_time: Option<u64>,
    api_key: String,
) -> Result<(String, Vec<u8>, i64), String> {
    // First validate the license
    license::validate_api_key(&api_key).await
        .map_err(|e| format!("License validation failed: {}", e))?;

    // Create the subscription request struct
    let req = CreateSubscriptionRequest {
        subscription_id: subscription_id.clone(),
        solana_contract_address,
        payment_token_mint,
        amount,
        subscriber_address,
        merchant_address,
        interval_seconds: interval_seconds as u64,
        start_time,
        api_key,
    };

    // Create the subscription
    let sub_result = subscription_manager::create_subscription(req).await?;

    // Generate the payment signature
    let (signature, timestamp) = generate_payment_signature(subscription_id.clone(), amount).await?;

    ic_cdk::println!("✅ Created subscription with signature");
    Ok((sub_result, signature, timestamp))
}

// =============================================================================
// HTTP TRANSFORM FUNCTION
// =============================================================================

/// Transform function to make HTTP responses deterministic for consensus
#[query]
fn transform_http_response(raw: TransformArgs) -> HttpResponse {
    let mut response = raw.response;

    // Strip out non-deterministic headers that might cause consensus issues
    response.headers.retain(|header| {
        let name_lower = header.name.to_lowercase();
        // Keep only essential headers
        name_lower == "content-type" || name_lower == "content-length"
    });

    response
}

// =============================================================================
// CANDID EXPORT
// =============================================================================

// Export all the public functions for Candid interface generation
export_candid!();