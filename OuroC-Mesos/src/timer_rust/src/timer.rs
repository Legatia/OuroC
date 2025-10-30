// Timer management module

use crate::types::*;
use ic_cdk_timers::{set_timer, clear_timer};
use std::time::Duration;
use std::collections::HashMap;

thread_local! {
    static ACTIVE_TIMERS: std::cell::RefCell<HashMap<String, TimerInfo>> = std::cell::RefCell::new(HashMap::new());
    static NOTIFICATION_TIMERS: std::cell::RefCell<HashMap<String, TimerInfo>> = std::cell::RefCell::new(HashMap::new());
}

pub fn schedule_subscription_timer(subscription: &Subscription) {
    let now = ic_cdk::api::time();
    let delay_nanos = if subscription.next_execution > now {
        subscription.next_execution - now
    } else {
        0
    };

    let delay_seconds = delay_nanos / 1_000_000_000;
    let subscription_id = subscription.id.clone();

    ic_cdk::println!("⏰ Scheduling timer for subscription {} in {} seconds",
                      subscription.id, delay_seconds);

    let timer_id = set_timer(Duration::from_nanos(delay_nanos), move || {
        let id = subscription_id.clone();
        ic_cdk::spawn(async move {
            crate::subscription_manager::trigger_subscription(id).await;
        });
    });

    // Store timer info
    let timer_info = TimerInfo {
        subscription_id: subscription.id.clone(),
        timer_id,
        execution_time: subscription.next_execution,
        is_notification: false,
    };
    ACTIVE_TIMERS.with(|t| t.borrow_mut().insert(subscription.id.clone(), timer_info));
}

pub fn schedule_notification_timer(subscription: &Subscription) {
    // Only schedule notifications for intervals > 1 day (86400 seconds)
    const ONE_DAY_SECONDS: u64 = 86400;

    if subscription.interval_seconds <= ONE_DAY_SECONDS {
        ic_cdk::println!("⏭️ Skipping notification for subscription {} (interval {} seconds < 1 day)",
                          subscription.id, subscription.interval_seconds);
        return;
    }

    let notification_time = subscription.next_execution - (24 * 60 * 60 * 1_000_000_000); // 24 hours before
    let now = ic_cdk::api::time();

    if notification_time > now {
        let delay_nanos = notification_time - now;
        let subscription_id = subscription.id.clone();

        let timer_id = set_timer(Duration::from_nanos(delay_nanos), move || {
            let id = subscription_id.clone();
            ic_cdk::spawn(async move {
                crate::subscription_manager::trigger_notification(id).await;
            });
        });

        // Store notification timer info
        let timer_info = TimerInfo {
            subscription_id: subscription.id.clone(),
            timer_id,
            execution_time: notification_time,
            is_notification: true,
        };
        NOTIFICATION_TIMERS.with(|t| t.borrow_mut().insert(subscription.id.clone(), timer_info));

        ic_cdk::println!("🔔 Scheduled notification for subscription: {} (interval {} seconds > 1 day)",
                          subscription.id, subscription.interval_seconds);
    }
}

pub fn cancel_timer(subscription_id: &str) {
    ACTIVE_TIMERS.with(|timers| {
        if let Some(timer_info) = timers.borrow_mut().remove(subscription_id) {
            ic_cdk::println!("🗑️ Cancelling timer for subscription: {}", subscription_id);
            // Actually cancel the IC CDK timer
            ic_cdk_timers::clear_timer(timer_info.timer_id);
            ic_cdk::println!("✅ Timer {} cancelled successfully", subscription_id);
        }
    });
}

pub fn cancel_notification_timer(subscription_id: &str) {
    NOTIFICATION_TIMERS.with(|timers| {
        if let Some(timer_info) = timers.borrow_mut().remove(subscription_id) {
            ic_cdk::println!("🗑️ Cancelling notification timer for subscription: {}", subscription_id);
            // Actually cancel the IC CDK timer
            ic_cdk_timers::clear_timer(timer_info.timer_id);
            ic_cdk::println!("✅ Notification timer {} cancelled successfully", subscription_id);
        }
    });
}

pub fn get_active_timer_count() -> usize {
    ACTIVE_TIMERS.with(|t| t.borrow().len())
}

pub fn get_notification_timer_count() -> usize {
    NOTIFICATION_TIMERS.with(|t| t.borrow().len())
}

pub fn get_all_timers() -> (HashMap<String, TimerInfo>, HashMap<String, TimerInfo>) {
    (
        ACTIVE_TIMERS.with(|t| t.borrow().clone()),
        NOTIFICATION_TIMERS.with(|t| t.borrow().clone()),
    )
}

pub fn restore_timers(active: HashMap<String, TimerInfo>, notification: HashMap<String, TimerInfo>) {
    ACTIVE_TIMERS.with(|t| *t.borrow_mut() = active);
    NOTIFICATION_TIMERS.with(|t| *t.borrow_mut() = notification);
}

// ============================================================================
// Blockhash Cache Refresh Timer
// ============================================================================

/// Start blockhash refresh timer - DISABLED
/// Using durable nonces instead of blockhashes to avoid IC consensus issues
pub fn start_blockhash_refresh_timer() {
    ic_cdk::println!("✅ Blockhash refresh timer disabled - using durable nonces instead");
    // No longer needed since we use durable nonces for all Solana transactions
}