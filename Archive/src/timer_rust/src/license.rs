// License validation module for API key management and tier limits

use crate::types::*;
use std::collections::HashMap;

thread_local! {
    static LICENSE_CACHE: std::cell::RefCell<HashMap<String, LicenseValidationResult>> = std::cell::RefCell::new(HashMap::new());
    static RATE_LIMIT_TRACKER: std::cell::RefCell<HashMap<String, (usize, Timestamp)>> = std::cell::RefCell::new(HashMap::new());
}

pub async fn validate_api_key(api_key: &str) -> Result<LicenseValidationResult, String> {
    ic_cdk::println!("🔑 Validating API key...");

    // Check cache first
    if let Some(cached_result) = LICENSE_CACHE.with(|cache| {
        let cache = cache.borrow();
        let now = ic_cdk::api::time();
        cache.get(api_key)
            .filter(|result| result.expires_at > now)
            .cloned()
    }) {
        ic_cdk::println!("✅ Using cached license validation");
        return Ok(cached_result);
    }

    // Mock validation - in production, this would call an external license service
    let result = mock_license_validation(api_key).await?;

    // Cache the result
    LICENSE_CACHE.with(|cache| {
        cache.borrow_mut().insert(api_key.to_string(), result.clone());
    });

    Ok(result)
}

pub async fn consume_license_usage(api_key: &str) -> Result<(), String> {
    let now = ic_cdk::api::time();

    RATE_LIMIT_TRACKER.with(|tracker| {
        let mut tracker = tracker.borrow_mut();
        if let Some((count, last_reset)) = tracker.get_mut(api_key) {
            // Reset if day has passed
            if now - *last_reset > 24 * 60 * 60 * 1_000_000_000 {
                *count = 1;
                *last_reset = now;
            } else {
                *count += 1;
            }
        } else {
            tracker.insert(api_key.to_string(), (1, now));
        }
    });

    ic_cdk::println!("📊 License usage consumed for API key");
    Ok(())
}

fn get_rate_limit_remaining(api_key: &str) -> usize {
    RATE_LIMIT_TRACKER.with(|tracker| {
        if let Some((count, _)) = tracker.borrow().get(api_key) {
            match get_license_tier(api_key) {
                Some(LicenseTier::Community) => 1000 - count,
                Some(LicenseTier::Beta) => 10000 - count,
                Some(LicenseTier::Enterprise) => 100000 - count,
                None => 0,
            }
        } else {
            1000 // Default limit
        }
    })
}

fn get_license_tier(api_key: &str) -> Option<LicenseTier> {
    // Mock tier determination based on API key pattern
    if api_key == "ouro_community_shared_2025_demo_key" || api_key.starts_with("comm_") || api_key.starts_with("ouro_") {
        Some(LicenseTier::Community)
    } else if api_key.starts_with("beta_") {
        Some(LicenseTier::Beta)
    } else if api_key.starts_with("ent_") {
        Some(LicenseTier::Enterprise)
    } else {
        None
    }
}

async fn mock_license_validation(api_key: &str) -> Result<LicenseValidationResult, String> {
    // In production, make HTTP outcall to license registry
    let now = ic_cdk::api::time();
    let expires_at = now + 30 * 24 * 60 * 60 * 1_000_000_000; // 30 days

    if api_key.is_empty() {
        return Ok(LicenseValidationResult {
            is_valid: false,
            developer_id: None,
            tier: None,
            rate_limit_remaining: 0,
            expires_at,
            message: "API key is required".to_string(),
        });
    }

    let tier = get_license_tier(api_key);
    let rate_limit_remaining = get_rate_limit_remaining(api_key);

    match tier {
        Some(LicenseTier::Community) => {
            Ok(LicenseValidationResult {
                is_valid: true,
                developer_id: Some(format!("dev_{}", api_key.len())),
                tier: Some(LicenseTier::Community),
                rate_limit_remaining,
                expires_at,
                message: "Community license valid".to_string(),
            })
        }
        Some(LicenseTier::Beta) => {
            Ok(LicenseValidationResult {
                is_valid: true,
                developer_id: Some(format!("dev_{}", api_key.len())),
                tier: Some(LicenseTier::Beta),
                rate_limit_remaining,
                expires_at,
                message: "Beta license valid".to_string(),
            })
        }
        Some(LicenseTier::Enterprise) => {
            Ok(LicenseValidationResult {
                is_valid: true,
                developer_id: Some(format!("dev_{}", api_key.len())),
                tier: Some(LicenseTier::Enterprise),
                rate_limit_remaining,
                expires_at,
                message: "Enterprise license valid".to_string(),
            })
        }
        None => {
            Ok(LicenseValidationResult {
                is_valid: false,
                developer_id: None,
                tier: None,
                rate_limit_remaining: 0,
                expires_at,
                message: "Invalid API key format".to_string(),
            })
        }
    }
}

pub fn clear_license_cache() {
    LICENSE_CACHE.with(|cache| cache.borrow_mut().clear());
    RATE_LIMIT_TRACKER.with(|tracker| tracker.borrow_mut().clear());
    ic_cdk::println!("🗑️ License cache cleared");
}

pub fn get_license_stats() -> (usize, usize) {
    let cached_count = LICENSE_CACHE.with(|cache| cache.borrow().len());
    let active_keys = RATE_LIMIT_TRACKER.with(|tracker| tracker.borrow().len());
    (cached_count, active_keys)
}