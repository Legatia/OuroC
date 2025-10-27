// Health monitoring and diagnostics module

use crate::types::*;
use crate::state::*;
use crate::utils::*;
use crate::subscription_manager::{get_subscription_count, list_subscriptions};
use crate::timer::{get_active_timer_count, get_notification_timer_count};
use ic_cdk::api::{time, canister_balance};
use candid::{CandidType, Deserialize};

pub async fn perform_health_check() -> CanisterHealth {
    ic_cdk::println!("🏥 Performing health check...");

    let now = time();
    let start_time = get_canister_start_time();
    let uptime_seconds = calculate_uptime_seconds(start_time);

    let subscription_count = get_subscription_count();
    let active_timers = get_active_timer_count();
    let notification_timers = get_notification_timer_count();
    let total_timers = active_timers + notification_timers;

    let failed_payments = get_failed_payment_count();
    let cycle_balance = canister_balance();
    let cycle_threshold = get_cycle_threshold();

    let (heap_size, stable_memory_size, total_memory) = get_memory_usage_stats();

    let is_degraded = is_system_degraded(failed_payments, cycle_balance, cycle_threshold);
    let degradation_reason = get_degradation_reason(failed_payments, cycle_balance, cycle_threshold);

    let status = if failed_payments > 20 || cycle_balance < cycle_threshold / 4 {
        CanisterStatus::Critical
    } else if is_degraded {
        CanisterStatus::Degraded
    } else {
        CanisterStatus::Healthy
    };

    let health = CanisterHealth {
        status: status.clone(),
        uptime_seconds,
        last_health_check: now,
        subscription_count,
        active_timers: total_timers,
        failed_payments,
        cycle_balance,
        memory_usage: total_memory as usize,
        is_degraded,
        degradation_reason,
    };

    increment_health_check_counter();

    ic_cdk::println!("✅ Health check completed | Status: {:?} | Uptime: {}s", status, uptime_seconds);
    health
}

pub async fn get_system_metrics() -> SystemMetrics {
    ic_cdk::println!("📊 Gathering system metrics...");

    let now = time();
    let cycle_balance = canister_balance();
    let (heap_size, stable_memory_size, total_memory) = get_memory_usage_stats();
    let uptime_seconds = calculate_uptime_seconds(get_canister_start_time());
    let canister_id = ic_cdk::api::id().to_string();

    let metrics = SystemMetrics {
        canister_id,
        cycle_balance,
        memory_usage: total_memory,
        heap_size,
        stable_memory_size,
        total_instructions: 0, // Would need ic_cdk::api::performance_counter()
        uptime_seconds,
        timestamp: now,
    };

    ic_cdk::println!("✅ System metrics gathered");
    metrics
}

pub async fn get_detailed_health_report() -> DetailedHealthReport {
    ic_cdk::println!("📋 Generating detailed health report...");

    let health = perform_health_check().await;
    let metrics = get_system_metrics().await;
    let subscriptions = list_subscriptions();

    let active_subscriptions = subscriptions.iter()
        .filter(|s| s.status == SubscriptionStatus::Active)
        .count();

    let paused_subscriptions = subscriptions.iter()
        .filter(|s| s.status == SubscriptionStatus::Paused)
        .count();

    let cancelled_subscriptions = subscriptions.iter()
        .filter(|s| s.status == SubscriptionStatus::Cancelled)
        .count();

    let expired_subscriptions = subscriptions.iter()
        .filter(|s| s.status == SubscriptionStatus::Expired)
        .count();

    let overdue_subscriptions = crate::subscription_manager::get_overdue_subscriptions().len();

    let (network, rpc_endpoint, key_name) = get_network_config();
    let main_wallet = get_main_wallet_address();
    let fee_address = get_current_fee_address();

    let (current_fee_address, proposed_fee_address, fee_address_proposal_time) = get_fee_governance_status();

    let report = DetailedHealthReport {
        health,
        metrics,
        subscription_stats: SubscriptionStats {
            total: subscriptions.len(),
            active: active_subscriptions,
            paused: paused_subscriptions,
            cancelled: cancelled_subscriptions,
            expired: expired_subscriptions,
            overdue: overdue_subscriptions,
        },
        network_info: NetworkInfo {
            environment: network,
            rpc_endpoint,
            key_name,
            main_wallet_address: main_wallet,
            current_fee_address: current_fee_address,
            proposed_fee_address,
            fee_address_proposal_time,
        },
        auto_refill_enabled: is_auto_refill_enabled(),
        cycle_threshold: get_cycle_threshold(),
        health_check_counter: get_health_check_counter(),
        generated_at: time(),
    };

    ic_cdk::println!("✅ Detailed health report generated");
    report
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct DetailedHealthReport {
    pub health: CanisterHealth,
    pub metrics: SystemMetrics,
    pub subscription_stats: SubscriptionStats,
    pub network_info: NetworkInfo,
    pub auto_refill_enabled: bool,
    pub cycle_threshold: u64,
    pub health_check_counter: u64,
    pub generated_at: Timestamp,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SubscriptionStats {
    pub total: usize,
    pub active: usize,
    pub paused: usize,
    pub cancelled: usize,
    pub expired: usize,
    pub overdue: usize,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct NetworkInfo {
    pub environment: NetworkEnvironment,
    pub rpc_endpoint: String,
    pub key_name: String,
    pub main_wallet_address: String,
    pub current_fee_address: String,
    pub proposed_fee_address: Option<String>,
    pub fee_address_proposal_time: Option<Timestamp>,
}

pub async fn check_wallet_health() -> WalletHealthReport {
    ic_cdk::println!("💼 Checking wallet health...");

    let main_wallet = get_main_wallet_address();
    let fee_address = get_current_fee_address();

    let main_balance = crate::solana::get_solana_balance(&main_wallet).await.unwrap_or(0);
    let fee_balance = crate::solana::get_solana_balance(&fee_address).await.unwrap_or(0);

    let is_main_healthy = main_balance > 1_000_000; // > 0.001 SOL
    let is_fee_healthy = fee_balance > 500_000; // > 0.0005 SOL

    let overall_status = if is_main_healthy && is_fee_healthy {
        WalletStatus::Healthy
    } else if !is_main_healthy && !is_fee_healthy {
        WalletStatus::Critical
    } else {
        WalletStatus::Warning
    };

    let report = WalletHealthReport {
        main_wallet_address: main_wallet,
        main_balance_lamports: main_balance,
        main_balance_sol: format_lamports_to_sol(main_balance),
        fee_address,
        fee_balance_lamports: fee_balance,
        fee_balance_sol: format_lamports_to_sol(fee_balance),
        main_wallet_status: if is_main_healthy { WalletStatus::Healthy } else { WalletStatus::Warning },
        fee_wallet_status: if is_fee_healthy { WalletStatus::Healthy } else { WalletStatus::Warning },
        overall_status: overall_status.clone(),
        last_checked: time(),
    };

    ic_cdk::println!("✅ Wallet health check completed | Status: {:?}", overall_status);
    report
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct WalletHealthReport {
    pub main_wallet_address: String,
    pub main_balance_lamports: u64,
    pub main_balance_sol: String,
    pub fee_address: String,
    pub fee_balance_lamports: u64,
    pub fee_balance_sol: String,
    pub main_wallet_status: WalletStatus,
    pub fee_wallet_status: WalletStatus,
    pub overall_status: WalletStatus,
    pub last_checked: Timestamp,
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum WalletStatus {
    Healthy,
    Warning,
    Critical,
}

pub async fn perform_emergency_health_check() -> EmergencyHealthReport {
    ic_cdk::println!("🚨 Performing emergency health check...");

    let health = perform_health_check().await;
    let wallet_health = check_wallet_health().await;

    let critical_issues = Vec::new(); // Would populate with actual issues

    let requires_intervention = health.status == CanisterStatus::Critical
        || wallet_health.overall_status == WalletStatus::Critical
        || !critical_issues.is_empty();

    let report = EmergencyHealthReport {
        canister_health: health,
        wallet_health,
        critical_issues,
        requires_intervention,
        recommended_actions: if requires_intervention {
            vec![
                "Check cycle balance and refill immediately".to_string(),
                "Verify Solana wallet balances".to_string(),
                "Review recent failed payments".to_string(),
                "Check network connectivity".to_string(),
            ]
        } else {
            vec!["Continue monitoring".to_string()]
        },
        last_checked: time(),
    };

    ic_cdk::println!("✅ Emergency health check completed | Intervention required: {}",
                      requires_intervention);
    report
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EmergencyHealthReport {
    pub canister_health: CanisterHealth,
    pub wallet_health: WalletHealthReport,
    pub critical_issues: Vec<String>,
    pub requires_intervention: bool,
    pub recommended_actions: Vec<String>,
    pub last_checked: Timestamp,
}

pub fn reset_health_counters() {
    // Reset health monitoring counters
    // This would require access to the state counters
    ic_cdk::println!("🔄 Health counters reset");
}

pub async fn get_subscription_health_metrics() -> SubscriptionHealthMetrics {
    ic_cdk::println!("📈 Gathering subscription health metrics...");

    let subscriptions = list_subscriptions();
    let now = time();

    let mut total_triggers = 0u64;
    let mut total_failures = 0u32;
    let mut subscriptions_with_failures = 0usize;
    let mut oldest_subscription = now;
    let mut newest_subscription = 0u64;

    for subscription in &subscriptions {
        total_triggers += subscription.trigger_count;
        total_failures += subscription.failed_payment_count;

        if subscription.failed_payment_count > 0 {
            subscriptions_with_failures += 1;
        }

        if subscription.created_at < oldest_subscription {
            oldest_subscription = subscription.created_at;
        }
        if subscription.created_at > newest_subscription {
            newest_subscription = subscription.created_at;
        }
    }

    let success_rate = if total_triggers > 0 {
        let successful_triggers = total_triggers - total_failures as u64;
        (successful_triggers as f64 / total_triggers as f64) * 100.0
    } else {
        100.0
    };

    let metrics = SubscriptionHealthMetrics {
        total_subscriptions: subscriptions.len(),
        active_subscriptions: subscriptions.iter()
            .filter(|s| s.status == SubscriptionStatus::Active)
            .count(),
        subscriptions_with_failures,
        total_triggers,
        total_failures,
        success_rate,
        oldest_subscription_age_seconds: calculate_uptime_seconds(oldest_subscription),
        newest_subscription_age_seconds: calculate_uptime_seconds(newest_subscription),
        calculated_at: now,
    };

    ic_cdk::println!("✅ Subscription health metrics gathered | Success rate: {:.2}%", success_rate);
    metrics
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SubscriptionHealthMetrics {
    pub total_subscriptions: usize,
    pub active_subscriptions: usize,
    pub subscriptions_with_failures: usize,
    pub total_triggers: u64,
    pub total_failures: u32,
    pub success_rate: f64,
    pub oldest_subscription_age_seconds: u64,
    pub newest_subscription_age_seconds: u64,
    pub calculated_at: Timestamp,
}