use anchor_lang::prelude::*;
use std::str::FromStr;

// ============================================================================
// Constants
// ============================================================================

// SPL Memo Program for wallet-visible notifications
pub const SPL_MEMO_PROGRAM_ID: &str = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

// Program ID
pub const PROGRAM_ID: &str = "7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub";

// Helper to get program ID as Pubkey
pub fn get_program_id() -> Pubkey {
    Pubkey::from_str(PROGRAM_ID).unwrap()
}

// Basis points constants
pub const BASIS_POINTS_DIVISOR: u64 = 10000; // 100% = 10000 basis points
pub const MAX_FEE_BPS: u16 = 1000; // 10% maximum fee
pub const MAX_SLIPPAGE_BPS: u16 = 500; // 5% maximum slippage
pub const MAX_APPROVAL_AMOUNT: u64 = 1_000_000_000_000; // 1M USDC (6 decimals)
pub const MAX_REMINDER_DAYS: u32 = 30; // Maximum days before payment for reminder

// Timestamp validation
pub const MAX_TIMESTAMP_DRIFT: i64 = 300; // 5 minutes max drift for signature validation

// USDC Mint Addresses
pub const USDC_MINT_MAINNET: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
pub const USDC_MINT_DEVNET: &str = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

// Use devnet USDC by default for development
#[cfg(feature = "mainnet")]
pub const USDC_MINT: &str = USDC_MINT_MAINNET;

#[cfg(not(feature = "mainnet"))]
pub const USDC_MINT: &str = USDC_MINT_DEVNET;

// Helper function to check if token is USDC (only supported token)
pub fn is_supported_token(mint_address: &str) -> bool {
    let usdc_mint = if cfg!(feature = "mainnet") {
        USDC_MINT_MAINNET
    } else {
        USDC_MINT_DEVNET
    };
    mint_address == usdc_mint
}

// Helper to get USDC mint Pubkey (efficient comparison)
pub fn get_usdc_mint() -> Pubkey {
    Pubkey::from_str(USDC_MINT).unwrap()
}

// Derive escrow PDA for a subscription
pub fn derive_escrow_pda(subscription_id: &str, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"escrow", subscription_id.as_bytes()],
        program_id,
    )
}

/// Calculate required delegation amount for one year of payments
/// Formula: amount × (seconds_in_year / interval_seconds)
/// This ensures users approve exactly one year of payments, balancing convenience and security
pub fn calculate_one_year_delegation(amount: u64, interval_seconds: i64) -> Result<u64> {
    const SECONDS_IN_YEAR: i64 = 365 * 24 * 60 * 60; // 31,536,000 seconds

    // Handle one-time payments (interval = -1)
    if interval_seconds == -1 {
        return Ok(amount);
    }

    // Ensure interval is positive
    if interval_seconds <= 0 {
        return Err(anchor_lang::error::Error::from(anchor_lang::error::ErrorCode::AccountNotInitialized));
    }

    // Calculate number of payments in one year
    let payments_per_year = (SECONDS_IN_YEAR / interval_seconds) as u64;

    // Add 1 extra payment as buffer (in case of clock drift or early payments)
    let total_payments = payments_per_year.checked_add(1)
        .ok_or(anchor_lang::error::ErrorCode::AccountNotInitialized)?;

    // Calculate total delegation needed
    let total_delegation = (amount as u128)
        .checked_mul(total_payments as u128)
        .ok_or(anchor_lang::error::ErrorCode::AccountNotInitialized)?;

    // Ensure it doesn't exceed u64 or max approval amount
    let delegation = u64::try_from(total_delegation)
        .map_err(|_| anchor_lang::error::ErrorCode::AccountNotInitialized)?;

    if delegation > MAX_APPROVAL_AMOUNT {
        return Ok(MAX_APPROVAL_AMOUNT); // Cap at max
    }

    Ok(delegation)
}

