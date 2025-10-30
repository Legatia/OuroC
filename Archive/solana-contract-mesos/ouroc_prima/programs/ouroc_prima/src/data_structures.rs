use anchor_lang::prelude::*;

// ============================================================================
// Data Structures
// ============================================================================

#[account]
pub struct Config {
    pub authority: Pubkey,
    pub total_subscriptions: u64,
    pub paused: bool,
    pub authorization_mode: AuthorizationMode,
    pub icp_public_key: Option<[u8; 32]>,
    pub manual_processing_enabled: bool,
    pub time_based_processing_enabled: bool,
    pub fee_config: FeeConfig,
    pub icp_fee_collection_address: Option<Pubkey>, // ICP canister's Solana wallet for fees
}

impl Config {
    pub const LEN: usize = 32 + 8 + 1 + 1 + 33 + 1 + 1 + FeeConfig::LEN + 33;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct FeeConfig {
    pub fee_percentage_basis_points: u16, // e.g., 100 = 1%, 10 = 0.1%
    pub min_fee_amount: u64,               // Minimum fee in micro-USDC
}

impl FeeConfig {
    pub const LEN: usize = 2 + 8;
}

#[account]
pub struct Subscription {
    pub id: String,                      // 32 bytes max
    pub subscriber: Pubkey,              // 32 bytes
    pub merchant: Pubkey,                // 32 bytes
    pub merchant_name: String,           // 32 bytes max - Merchant's app/business name for notifications
    pub amount: u64,                     // 8 bytes - USDC amount in micro-units
    pub payment_token_mint: Pubkey,      // 32 bytes - Token mint address (USDC, USDT, etc.)
    pub interval_seconds: i64,           // 8 bytes - Positive for recurring, -1 for one-time
    pub next_payment_time: i64,          // 8 bytes
    pub status: SubscriptionStatus,      // 1 byte
    pub created_at: i64,                 // 8 bytes
    pub last_payment_time: Option<i64>,  // 9 bytes (1 + 8)
    pub payments_made: u64,              // 8 bytes
    pub total_paid: u64,                 // 8 bytes
    pub icp_canister_signature: Option<[u8; 64]>, // 65 bytes - Ed25519 signature from ICP (optional at creation)
}

impl Subscription {
    pub const LEN: usize = 32 + 32 + 32 + 32 + 8 + 32 + 8 + 8 + 1 + 8 + 9 + 8 + 8 + 65;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum SubscriptionStatus {
    Active,
    Paused,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum AuthorizationMode {
    ICPSignature,      // Original ICP canister authorization
    ManualOnly,        // Manual payment processing by subscriber
    TimeBased,         // Time-based automatic processing
    Hybrid,            // Multiple authorization methods enabled
}