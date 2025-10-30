use anchor_lang::prelude::*;

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct SubscriptionCreated {
    pub subscription_id: String,
    pub subscriber: Pubkey,
    pub merchant: Pubkey,
    pub amount: u64,
    pub interval_seconds: i64,
}

#[event]
pub struct PaymentProcessed {
    pub subscription_id: String,
    pub payment_number: u64,
    pub amount: u64,
    pub merchant_amount: u64,
    pub fee_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionPaused {
    pub subscription_id: String,
    pub paused_at: i64,
}

#[event]
pub struct SubscriptionResumed {
    pub subscription_id: String,
    pub resumed_at: i64,
}

#[event]
pub struct SubscriptionCancelled {
    pub subscription_id: String,
    pub cancelled_at: i64,
    pub total_payments_made: u64,
    pub total_paid: u64,
}

#[event]
pub struct DelegateApproved {
    pub subscription_id: String,
    pub subscriber: Pubkey,
    pub delegate: Pubkey,
    pub amount: u64,
}

/// Event emitted when fee collection address is updated
#[event]
pub struct FeeDestinationUpdated {
    pub old_address: Option<Pubkey>,
    pub new_address: Pubkey,
    pub updated_by: Pubkey,
    pub timestamp: i64,
}