// Types module for Ouro-C Timer Canister

use candid::{CandidType, Deserialize};
use serde::{Serialize as SerdeSerialize};

pub type SubscriptionId = String;
pub type SolanaAddress = String;
pub type TransactionHash = String;
pub type Timestamp = u64;

// Constants
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

// License tiers for IP protection
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, SerdeSerialize)]
pub enum LicenseTier {
    Community,
    Enterprise,
    Beta,
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, SerdeSerialize)]
pub enum SubscriptionStatus {
    Active,
    Paused,
    Cancelled,
    Expired,
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, SerdeSerialize)]
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
pub struct CycleReport {
    pub current_balance: u64,
    pub threshold_balance: u64,
    pub auto_refill_enabled: bool,
    pub last_refill: Option<Timestamp>,
    pub total_consumed: u64,
    pub total_refilled: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct WalletBalance {
    pub lamports: u64,
    pub last_updated: Timestamp,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct WalletInfo {
    pub main_address: String,
    pub main_balance: u64,
    pub last_updated: Timestamp,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SystemMetrics {
    pub canister_id: String,
    pub cycle_balance: u64,
    pub memory_usage: u64,
    pub heap_size: u64,
    pub stable_memory_size: u64,
    pub total_instructions: u64,
    pub uptime_seconds: u64,
    pub timestamp: Timestamp,
}

// Timer management
#[derive(Clone, Debug)]
pub struct TimerInfo {
    pub subscription_id: SubscriptionId,
    pub timer_id: ic_cdk_timers::TimerId,
    pub execution_time: Timestamp,
    pub is_notification: bool,
}