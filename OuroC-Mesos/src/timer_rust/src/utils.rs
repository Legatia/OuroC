// Utility functions for validation, formatting, and common operations

use crate::types::*;

pub fn is_valid_subscription_id(id: &str) -> bool {
    if id.len() < SUBSCRIPTION_ID_MIN_LENGTH || id.len() > SUBSCRIPTION_ID_MAX_LENGTH {
        return false;
    }

    // Allow alphanumeric characters, hyphens, and underscores
    id.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_')
}

pub fn is_valid_solana_address(address: &str) -> bool {
    // Basic Solana address validation
    if address.len() < 32 || address.len() > 44 {
        return false;
    }

    // Check for valid base58 characters
    address.chars().all(|c| c.is_ascii_alphanumeric() || c == '1' || c == '2' || c == '3')
}

pub fn is_valid_timestamp(timestamp: u64) -> bool {
    // Check if timestamp is reasonable (not too far in the past or future)
    let now = ic_cdk::api::time();
    let one_year_ago = now - 365 * 24 * 60 * 60 * 1_000_000_000;
    let five_years_future = now + 5 * 365 * 24 * 60 * 60 * 1_000_000_000;

    timestamp >= one_year_ago && timestamp <= five_years_future
}

pub fn format_lamports_to_sol(lamports: u64) -> String {
    format!("{:.9}", lamports as f64 / 1_000_000_000.0)
}

pub fn format_timestamp_to_iso(timestamp: Timestamp) -> String {
    // Convert nanoseconds to seconds for basic formatting
    let seconds = timestamp / 1_000_000_000;
    format!("{} (Unix timestamp)", seconds)
}

pub fn calculate_next_execution(
    last_execution: Timestamp,
    interval_seconds: u64,
    current_time: Timestamp,
) -> Timestamp {
    let interval_nanos = interval_seconds * 1_000_000_000;

    if current_time >= last_execution + interval_nanos {
        // Already past due, schedule for next interval
        current_time + interval_nanos
    } else {
        // Schedule for next execution time
        last_execution + interval_nanos
    }
}

pub fn sanitize_string(input: &str, max_length: usize) -> String {
    let mut sanitized = String::new();
    let mut length = 0;

    for c in input.chars() {
        if length >= max_length {
            break;
        }

        // Allow alphanumeric, spaces, and common punctuation
        if c.is_alphanumeric() || c.is_whitespace() || "-_.,@#".contains(c) {
            sanitized.push(c);
            length += 1;
        }
    }

    sanitized.trim().to_string()
}

pub fn validate_amount(amount: u64) -> Result<(), String> {
    if amount == 0 {
        return Err("Amount must be greater than 0".to_string());
    }

    if amount > MAX_AMOUNT_USDC {
        return Err(format!("Amount exceeds maximum allowed ({})", MAX_AMOUNT_USDC));
    }

    Ok(())
}

pub fn validate_interval(interval_seconds: u64) -> Result<(), String> {
    if interval_seconds < MIN_INTERVAL_SECONDS {
        return Err(format!(
            "Interval too short (minimum {} seconds)",
            MIN_INTERVAL_SECONDS
        ));
    }

    if interval_seconds > MAX_INTERVAL_SECONDS {
        return Err(format!(
            "Interval too long (maximum {} seconds)",
            MAX_INTERVAL_SECONDS
        ));
    }

    Ok(())
}

pub fn hash_string(input: &str) -> String {
    use sha2::{Sha256, Digest};
    format!("{:x}", Sha256::digest(input.as_bytes()))
}

pub fn generate_unique_id(prefix: &str) -> String {
    let timestamp = ic_cdk::api::time();
    let random_suffix = format!("{:x}", timestamp)[0..8].to_string();
    format!("{}_{}", prefix, random_suffix)
}

pub fn calculate_backoff_delay(
    base_interval: u64,
    failure_count: u32,
    max_multiplier: u64,
) -> u64 {
    let multiplier = EXPONENTIAL_BACKOFF_BASE.pow(failure_count as u32).min(max_multiplier);
    base_interval * multiplier
}

pub fn is_system_degraded(
    failed_payments: u32,
    cycle_balance: u64,
    cycle_threshold: u64,
) -> bool {
    failed_payments > 5 || cycle_balance < cycle_threshold / 2
}

pub fn get_degradation_reason(
    failed_payments: u32,
    cycle_balance: u64,
    cycle_threshold: u64,
) -> Option<String> {
    if failed_payments > 5 {
        Some(format!("High payment failure count: {}", failed_payments))
    } else if cycle_balance < cycle_threshold / 2 {
        Some(format!("Low cycle balance: {} < {}", cycle_balance, cycle_threshold / 2))
    } else {
        None
    }
}

pub fn validate_api_key_format(api_key: &str) -> Result<(), String> {
    if api_key.is_empty() {
        return Err("API key cannot be empty".to_string());
    }

    if api_key.len() < 10 {
        return Err("API key too short (minimum 10 characters)".to_string());
    }

    if api_key.len() > 100 {
        return Err("API key too long (maximum 100 characters)".to_string());
    }

    // Check for valid characters
    if !api_key.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
        return Err("API key contains invalid characters".to_string());
    }

    Ok(())
}

pub fn parse_network_environment(network_str: &str) -> Result<NetworkEnvironment, String> {
    match network_str.to_lowercase().as_str() {
        "mainnet" | "main" => Ok(NetworkEnvironment::Mainnet),
        "devnet" | "dev" => Ok(NetworkEnvironment::Devnet),
        "testnet" | "test" => Ok(NetworkEnvironment::Testnet),
        _ => Err(format!("Invalid network environment: {}", network_str)),
    }
}

pub fn format_subscription_status(status: &SubscriptionStatus) -> &'static str {
    match status {
        SubscriptionStatus::Active => "Active",
        SubscriptionStatus::Paused => "Paused",
        SubscriptionStatus::Cancelled => "Cancelled",
        SubscriptionStatus::Expired => "Expired",
    }
}

pub fn format_canister_status(status: &CanisterStatus) -> &'static str {
    match status {
        CanisterStatus::Healthy => "Healthy",
        CanisterStatus::Degraded => "Degraded",
        CanisterStatus::Critical => "Critical",
        CanisterStatus::Offline => "Offline",
    }
}

pub fn truncate_address(address: &str, start_len: usize, end_len: usize) -> String {
    if address.len() <= start_len + end_len {
        address.to_string()
    } else {
        format!(
            "{}...{}",
            &address[..start_len],
            &address[address.len() - end_len..]
        )
    }
}

pub fn get_memory_usage_stats() -> (u64, u64, u64) {
    // Mock memory usage statistics
    let heap_size = 50 * 1024 * 1024; // 50MB
    let stable_memory_size = 10 * 1024 * 1024; // 10MB
    let total_memory = heap_size + stable_memory_size;

    (heap_size, stable_memory_size, total_memory)
}

pub fn calculate_uptime_seconds(start_time: Timestamp) -> u64 {
    let now = ic_cdk::api::time();
    if now > start_time {
        (now - start_time) / 1_000_000_000
    } else {
        0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_subscription_id() {
        assert!(is_valid_subscription_id("valid-id-123"));
        assert!(is_valid_subscription_id("test_subscription"));
        assert!(!is_valid_subscription_id("a")); // Too short
        assert!(!is_valid_subscription_id("id with spaces"));
        assert!(!is_valid_subscription_id("id@with#symbols"));
    }

    #[test]
    fn test_solana_address_validation() {
        assert!(is_valid_solana_address("11111111111111111111111111111112"));
        assert!(!is_valid_solana_address("too_short"));
        assert!(!is_valid_solana_address("invalid@address"));
    }

    #[test]
    fn test_amount_validation() {
        assert!(validate_amount(100).is_ok());
        assert!(validate_amount(0).is_err());
        assert!(validate_amount(MAX_AMOUNT_USDC + 1).is_err());
    }

    #[test]
    fn test_interval_validation() {
        assert!(validate_interval(MIN_INTERVAL_SECONDS).is_ok());
        assert!(validate_interval(3600).is_ok());
        assert!(validate_interval(MIN_INTERVAL_SECONDS - 1).is_err());
        assert!(validate_interval(MAX_INTERVAL_SECONDS + 1).is_err());
    }
}