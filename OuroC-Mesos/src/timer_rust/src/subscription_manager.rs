// Subscription management module

use crate::types::*;
use ic_cdk::{
    api::time,
    caller,
};
use std::collections::HashMap;

thread_local! {
    static SUBSCRIPTIONS: std::cell::RefCell<HashMap<String, Subscription>> = std::cell::RefCell::new(HashMap::new());
}

pub async fn create_subscription(req: CreateSubscriptionRequest) -> Result<SubscriptionId, String> {
    ic_cdk::println!("📝 Creating subscription: {}", req.subscription_id);

    // License validation
    match crate::license::validate_api_key(&req.api_key).await {
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

    if !crate::utils::is_valid_subscription_id(&req.subscription_id) {
        return Err("Subscription ID must be alphanumeric with - or _ only".to_string());
    }

    // Validate interval
    if req.interval_seconds < MIN_INTERVAL_SECONDS {
        return Err(format!("Minimum interval is {} seconds", MIN_INTERVAL_SECONDS));
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
    if !crate::utils::is_valid_solana_address(&req.solana_contract_address) {
        return Err("Invalid Solana contract address format".to_string());
    }
    if !crate::utils::is_valid_solana_address(&req.payment_token_mint) {
        return Err("Invalid payment token mint address format".to_string());
    }
    if !crate::utils::is_valid_solana_address(&req.subscriber_address) {
        return Err("Invalid subscriber address format".to_string());
    }
    if !crate::utils::is_valid_solana_address(&req.merchant_address) {
        return Err("Invalid merchant address format".to_string());
    }

    // Check if subscription already exists
    if SUBSCRIPTIONS.with(|s| s.borrow().contains_key(&req.subscription_id)) {
        return Err("Subscription ID already exists".to_string());
    }

    // Ensure canister is initialized
    if !crate::state::is_initialized() {
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

    // Schedule timers
    crate::timer::schedule_subscription_timer(&subscription);
    crate::timer::schedule_notification_timer(&subscription);

    // Consume license usage
    let _ = crate::license::consume_license_usage(&req.api_key).await;

    ic_cdk::println!("✅ Created subscription timer: {} for Solana contract: {}",
                      req.subscription_id, req.solana_contract_address);
    Ok(req.subscription_id)
}

pub fn get_subscription(id: SubscriptionId) -> Option<Subscription> {
    SUBSCRIPTIONS.with(|s| s.borrow().get(&id).cloned())
}

pub fn list_subscriptions() -> Vec<Subscription> {
    SUBSCRIPTIONS.with(|s| s.borrow().values().cloned().collect())
}

pub fn update_subscription_addresses(
    id: SubscriptionId,
    new_subscriber_address: Option<String>,
    new_merchant_address: Option<String>,
) -> Result<(), String> {
    SUBSCRIPTIONS.with(|s| {
        let mut subscriptions = s.borrow_mut();
        if let Some(subscription) = subscriptions.get_mut(&id) {
            if let Some(addr) = new_subscriber_address {
                if !crate::utils::is_valid_solana_address(&addr) {
                    return Err("Invalid subscriber address format".to_string());
                }
                subscription.subscriber_address = addr;
            }
            if let Some(addr) = new_merchant_address {
                if !crate::utils::is_valid_solana_address(&addr) {
                    return Err("Invalid merchant address format".to_string());
                }
                subscription.merchant_address = addr;
            }
            ic_cdk::println!("Updated subscription addresses for: {}", id);
            Ok(())
        } else {
            Err("Subscription not found".to_string())
        }
    })
}

pub async fn pause_subscription(id: SubscriptionId) -> Result<(), String> {
    SUBSCRIPTIONS.with(|s| {
        let mut subscriptions = s.borrow_mut();
        if let Some(subscription) = subscriptions.get_mut(&id) {
            subscription.status = SubscriptionStatus::Paused;
            crate::timer::cancel_timer(&id);
            crate::timer::cancel_notification_timer(&id);
            ic_cdk::println!("⏸️ Paused subscription: {}", id);
            Ok(())
        } else {
            Err("Subscription not found".to_string())
        }
    })
}

pub fn resume_subscription(id: SubscriptionId) -> Result<(), String> {
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
                crate::timer::schedule_subscription_timer(&sub_clone);
                crate::timer::schedule_notification_timer(&sub_clone);

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

pub async fn cancel_subscription(id: SubscriptionId) -> Result<(), String> {
    SUBSCRIPTIONS.with(|s| {
        let mut subscriptions = s.borrow_mut();
        if let Some(subscription) = subscriptions.get_mut(&id) {
            subscription.status = SubscriptionStatus::Cancelled;
            crate::timer::cancel_timer(&id);
            crate::timer::cancel_notification_timer(&id);
            ic_cdk::println!("❌ Cancelled subscription: {}", id);
            Ok(())
        } else {
            Err("Subscription not found".to_string())
        }
    })
}

pub fn cleanup_old_subscriptions(older_than_seconds: u64) -> usize {
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

    ic_cdk::println!("🧹 Cleaned up {} old subscriptions", cleanup_count);
    cleanup_count
}

pub fn get_overdue_subscriptions() -> Vec<SubscriptionId> {
    let now = time();
    SUBSCRIPTIONS.with(|s| {
        s.borrow().iter()
            .filter(|(_, sub)| {
                sub.status == SubscriptionStatus::Active && sub.next_execution < now
            })
            .map(|(id, _)| id.clone())
            .collect()
    })
}

// For timer callbacks
pub async fn trigger_subscription(subscription_id: String) {
    ic_cdk::println!("🚀 Triggering subscription: {}", subscription_id);

    let subscription = SUBSCRIPTIONS.with(|s| s.borrow().get(&subscription_id).cloned());

    if let Some(mut sub) = subscription {
        if sub.status == SubscriptionStatus::Active {
            // Send payment opcode
            let result = crate::solana::send_solana_opcode(
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
                    crate::timer::schedule_subscription_timer(&sub);
                    crate::timer::schedule_notification_timer(&sub);

                    ic_cdk::println!("💰 Payment trigger sent: {} | Next: {}", tx_hash, next_execution);
                }
                Err(error) => {
                    // Payment failed - increment failure count and apply exponential backoff
                    let new_failure_count = sub.failed_payment_count + 1;
                    ic_cdk::println!("❌ Payment trigger failed ({}): {}", new_failure_count, error);

                    if new_failure_count >= MAX_CONSECUTIVE_FAILURES {
                        // Too many failures - pause subscription
                        sub.status = SubscriptionStatus::Paused;
                        sub.failed_payment_count = new_failure_count;
                        sub.last_failure_time = Some(now);
                        sub.last_error = Some(error.clone());

                        SUBSCRIPTIONS.with(|s| s.borrow_mut().insert(subscription_id.clone(), sub));
                        ic_cdk::println!("⏸️ Subscription {} auto-paused after {} failures",
                                             subscription_id, MAX_CONSECUTIVE_FAILURES);
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
                        crate::timer::schedule_subscription_timer(&sub);
                        crate::timer::schedule_notification_timer(&sub);

                        ic_cdk::println!("🔄 Retrying with {}x backoff. Next: {}",
                                             backoff_multiplier, backoff_next_execution);
                    }
                }
            }
        } else {
            ic_cdk::println!("⏸️ Subscription {} is not active, skipping", subscription_id);
        }
    } else {
        ic_cdk::println!("❌ Subscription {} not found", subscription_id);
    }
}

pub async fn trigger_notification(subscription_id: String) {
    ic_cdk::println!("🔔 Triggering notification for subscription: {}", subscription_id);

    let subscription = SUBSCRIPTIONS.with(|s| s.borrow().get(&subscription_id).cloned());

    if let Some(sub) = subscription {
        if sub.status == SubscriptionStatus::Active {
            // Send notification opcode
            let result = crate::solana::send_solana_opcode(
                &sub.solana_contract_address,
                &subscription_id,
                &sub.subscriber_address,
                &sub.merchant_address,
                1, // Opcode 1 = Notification
            ).await;

            match result {
                Ok(tx_hash) => {
                    ic_cdk::println!("📧 Notification sent successfully for subscription: {} | tx: {}",
                                      subscription_id, tx_hash);
                }
                Err(error) => {
                    ic_cdk::println!("❌ Failed to send notification for subscription: {} | error: {}",
                                      subscription_id, error);
                }
            }
        } else {
            ic_cdk::println!("⏸️ Subscription {} is not active, skipping notification", subscription_id);
        }
    } else {
        ic_cdk::println!("❌ Subscription {} not found for notification", subscription_id);
    }
}

// For stable storage
pub fn get_all_subscriptions() -> HashMap<String, Subscription> {
    SUBSCRIPTIONS.with(|s| s.borrow().clone())
}

pub fn restore_subscriptions(subscriptions: HashMap<String, Subscription>) {
    SUBSCRIPTIONS.with(|s| *s.borrow_mut() = subscriptions);
}

pub fn get_subscription_count() -> usize {
    SUBSCRIPTIONS.with(|s| s.borrow().len())
}