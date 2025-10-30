// Suppress deprecation warning from Anchor's #[program] macro
// This is an Anchor framework issue, not our code
#![allow(deprecated)]

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint};
use std::str::FromStr;

// Import modules
mod constants;
mod events;
mod errors;
mod data_structures;
mod payment_helpers;
mod instruction_handlers;
mod crypto;

// Re-export commonly used items
pub use constants::*;
pub use events::*;
pub use data_structures::*;

// ============================================================================
// Account Structures
// ============================================================================

use crate::constants::*;
use crate::data_structures::*;
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(subscription_id: String)]
pub struct ApproveDelegate<'info> {
    /// Subscription PDA that will be approved as delegate
    /// CHECK: PDA derived from subscription_id
    #[account(
        seeds = [b"subscription", subscription_id.as_bytes()],
        bump
    )]
    pub subscription_pda: UncheckedAccount<'info>,

    /// Subscriber's USDC token account
    #[account(mut)]
    pub subscriber_token_account: Account<'info, TokenAccount>,

    /// Subscriber (must sign to approve delegation)
    #[account(mut)]
    pub subscriber: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Config::LEN,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Context for updating fee collection address
#[derive(Accounts)]
pub struct UpdateFeeDestination<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::UnauthorizedAccess
    )]
    pub config: Account<'info, Config>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(subscription_id: String)]
pub struct CreateSubscription<'info> {
    #[account(
        init,
        payer = subscriber,
        space = 8 + Subscription::LEN,
        seeds = [b"subscription", subscription_id.as_bytes()],
        bump
    )]
    pub subscription: Account<'info, Subscription>,

    /// Subscription PDA (same as subscription account key, for delegation)
    /// CHECK: PDA derived from subscription_id
    #[account(
        seeds = [b"subscription", subscription_id.as_bytes()],
        bump
    )]
    pub subscription_pda: UncheckedAccount<'info>,

    /// Subscriber's USDC token account (for automatic delegation)
    #[account(mut)]
    pub subscriber_token_account: Account<'info, TokenAccount>,

    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub subscriber: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessPayment<'info> {
    #[account(mut)]
    pub subscription: Account<'info, Subscription>,

    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,

    /// CHECK: ICP canister or anyone can trigger payment (not subscriber)
    pub trigger_authority: Signer<'info>,

    /// CHECK: This is the subscriber's wallet (does not need to sign)
    pub subscriber: UncheckedAccount<'info>,

    /// USDC Token accounts with mint verification
    #[account(
        mut,
        constraint = subscriber_token_account.mint == usdc_mint.key() @ ErrorCode::InvalidTokenMint
    )]
    pub subscriber_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = merchant_token_account.mint == usdc_mint.key() @ ErrorCode::InvalidTokenMint
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = icp_fee_token_account.mint == usdc_mint.key() @ ErrorCode::InvalidTokenMint
    )]
    pub icp_fee_token_account: Account<'info, TokenAccount>,

    /// USDC Mint - must be the official USDC mint
    #[account(
        constraint = usdc_mint.key() == get_usdc_mint() @ ErrorCode::InvalidTokenMint
    )]
    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

    /// CHECK: Instructions sysvar for Ed25519 signature verification
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,
}


#[derive(Accounts)]
pub struct UpdateSubscription<'info> {
    #[account(
        mut,
        has_one = subscriber @ ErrorCode::UnauthorizedAccess
    )]
    pub subscription: Account<'info, Subscription>,

    pub subscriber: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevokeDelegate<'info> {
    #[account(
        has_one = subscriber @ ErrorCode::UnauthorizedAccess
    )]
    pub subscription: Account<'info, Subscription>,

    /// Subscriber's USDC token account
    #[account(mut)]
    pub subscriber_token_account: Account<'info, TokenAccount>,

    /// Subscriber (must sign to revoke delegation)
    pub subscriber: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump,
        has_one = authority @ ErrorCode::UnauthorizedAccess
    )]
    pub config: Account<'info, Config>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SendNotification<'info> {
    #[account(
        seeds = [b"subscription", subscription.id.as_bytes()],
        bump
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,

    /// CHECK: Notification sender (must be authorized - ICP canister or admin)
    #[account(mut)]
    pub notification_sender: Signer<'info>,

    /// CHECK: Subscriber wallet (receives notification)
    #[account(mut)]
    pub subscriber: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,

    /// CHECK: SPL Memo Program
    #[account(address = Pubkey::from_str(SPL_MEMO_PROGRAM_ID).unwrap())]
    pub memo_program: UncheckedAccount<'info>,
}

/// Context for merchant to claim USDC from escrow after off-ramp confirmation
#[derive(Accounts)]
#[instruction(subscription_id: String)]
pub struct ClaimFromEscrow<'info> {
    #[account(
        mut,
        seeds = [b"subscription", subscription_id.as_bytes()],
        bump,
        has_one = merchant @ ErrorCode::UnauthorizedAccess
    )]
    pub subscription: Account<'info, Subscription>,

    /// Escrow PDA token account (holds USDC before claim)
    #[account(
        mut,
        constraint = escrow_token_account.owner == subscription.escrow_pda @ ErrorCode::UnauthorizedAccess,
        constraint = escrow_token_account.mint == get_usdc_mint() @ ErrorCode::InvalidTokenMint
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// Merchant's USDC token account (receives claimed funds)
    #[account(
        mut,
        constraint = merchant_token_account.owner == subscription.merchant @ ErrorCode::UnauthorizedAccess,
        constraint = merchant_token_account.mint == get_usdc_mint() @ ErrorCode::InvalidTokenMint
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,

    /// Merchant (must sign to claim)
    pub merchant: Signer<'info>,

    /// Escrow PDA (has authority over escrow token account)
    /// CHECK: Verified via seeds
    #[account(
        seeds = [b"escrow", subscription_id.as_bytes()],
        bump
    )]
    pub escrow_pda: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ProcessTrigger<'info> {
    #[account(
        mut,
        seeds = [b"subscription", subscription.id.as_bytes()],
        bump
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,

    /// ICP canister authority (verified via signature)
    pub trigger_authority: Signer<'info>,

    /// Subscriber's USDC token account (source of payment)
    #[account(
        mut,
        constraint = subscriber_token_account.owner == subscription.subscriber @ ErrorCode::UnauthorizedAccess,
        constraint = subscriber_token_account.mint == get_usdc_mint() @ ErrorCode::InvalidTokenMint,
        constraint = subscriber_token_account.delegate.is_some() @ ErrorCode::DelegateNotSet,
        constraint = subscriber_token_account.delegated_amount >= subscription.amount @ ErrorCode::InsufficientDelegation
    )]
    pub subscriber_token_account: Account<'info, TokenAccount>,

    /// Escrow USDC token account (receives payment before off-ramp)
    #[account(
        mut,
        constraint = escrow_usdc_account.owner == subscription.escrow_pda @ ErrorCode::UnauthorizedAccess,
        constraint = escrow_usdc_account.mint == get_usdc_mint() @ ErrorCode::InvalidTokenMint
    )]
    pub escrow_usdc_account: Account<'info, TokenAccount>,

    /// ICP fee collection USDC account (receives treasury fee)
    #[account(
        mut,
        constraint = icp_fee_usdc_account.mint == get_usdc_mint() @ ErrorCode::InvalidTokenMint
    )]
    pub icp_fee_usdc_account: Account<'info, TokenAccount>,

    /// USDC Mint for validation
    pub usdc_mint: Account<'info, Mint>,

    /// Subscription PDA (has delegate authority)
    /// CHECK: Verified via seeds
    pub subscription_pda: UncheckedAccount<'info>,

    /// CHECK: Subscriber wallet (for notifications)
    #[account(mut)]
    pub subscriber: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

    /// CHECK: SPL Memo Program
    #[account(address = Pubkey::from_str(SPL_MEMO_PROGRAM_ID).unwrap())]
    pub memo_program: UncheckedAccount<'info>,

    /// CHECK: Instructions sysvar for Ed25519 signature verification
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,
}


declare_id!("CFEtrptTe5eFXpZtB3hr1VMGuWF9oXguTnUFUaeVgeyT");

#[program]
pub mod ouroc_prima {
    use super::*;

    /// Initialize the subscription program
    pub fn initialize(
        ctx: Context<Initialize>,
        authorization_mode: AuthorizationMode,
        icp_public_key: Option<[u8; 32]>,
    ) -> Result<()> {
        instruction_handlers::initialize(
            ctx,
            authorization_mode,
            icp_public_key,
        )
    }

    /// Update fee collection address (admin only)
    pub fn update_fee_destination(
        ctx: Context<UpdateFeeDestination>,
        new_fee_address: Pubkey,
    ) -> Result<()> {
        instruction_handlers::update_fee_destination(ctx, new_fee_address)
    }

    /// Approve subscription PDA to spend USDC tokens
    /// Automatically calculates one year of delegation based on amount and interval
    pub fn approve_subscription_delegate(
        ctx: Context<ApproveDelegate>,
        subscription_id: String,
        amount: u64,
        interval_seconds: i64,
    ) -> Result<()> {
        instruction_handlers::approve_subscription_delegate(ctx, subscription_id, amount, interval_seconds)
    }

    /// Create a new subscription
    pub fn create_subscription(
        ctx: Context<CreateSubscription>,
        subscription_id: String,
        amount: u64,
        interval_seconds: i64,
        merchant_address: Pubkey,
        merchant_name: String, // Merchant's app/business name for notifications (max 32 chars)
        reminder_days_before_payment: u32, // Days before payment to send reminder (merchant configured)
        icp_canister_signature: [u8; 64], // Ed25519 signature from ICP canister
    ) -> Result<()> {
        instruction_handlers::create_subscription(
            ctx,
            subscription_id,
            amount,
            interval_seconds,
            merchant_address,
            merchant_name,
            reminder_days_before_payment,
            icp_canister_signature,
        )
    }

    /// Process payment with automatic swap (Router function for multi-token support)
    // COMMENTED OUT - Only USDC supported
    // pub fn process_payment_with_swap<'info>(
    //     ctx: Context<'_, '_, '_, 'info, ProcessPaymentWithSwap<'info>>,
    //     icp_signature: Option<[u8; 64]>,
    //     timestamp: i64,
    // ) -> Result<()> {
    //     instruction_handlers::process_payment_with_swap(ctx, icp_signature, timestamp)
    // }

    /// Process payment for a subscription (supports multiple authorization modes)
    pub fn process_payment(
        ctx: Context<ProcessPayment>,
        icp_signature: Option<[u8; 64]>,
        timestamp: i64,
    ) -> Result<()> {
        instruction_handlers::process_payment(ctx, icp_signature, timestamp)
    }

    /// Pause a subscription
    pub fn pause_subscription(ctx: Context<UpdateSubscription>) -> Result<()> {
        instruction_handlers::pause_subscription(ctx)
    }

    /// Resume a subscription
    pub fn resume_subscription(ctx: Context<UpdateSubscription>) -> Result<()> {
        instruction_handlers::resume_subscription(ctx)
    }

    /// Cancel a subscription
    pub fn cancel_subscription(ctx: Context<UpdateSubscription>) -> Result<()> {
        instruction_handlers::cancel_subscription(ctx)
    }

    /// Revoke subscription PDA delegate (after cancellation)
    pub fn revoke_subscription_delegate(
        ctx: Context<RevokeDelegate>,
    ) -> Result<()> {
        instruction_handlers::revoke_subscription_delegate(ctx)
    }

    /// Merchant claims USDC from escrow after off-ramp confirmation
    pub fn claim_from_escrow(
        ctx: Context<ClaimFromEscrow>,
        subscription_id: String,
        amount: u64,
    ) -> Result<()> {
        instruction_handlers::claim_from_escrow(ctx, subscription_id, amount)
    }

    /// Emergency pause the entire program (admin only)
    pub fn emergency_pause(ctx: Context<AdminAction>) -> Result<()> {
        instruction_handlers::emergency_pause(ctx)
    }

    /// Resume the program (admin only)
    pub fn resume_program(ctx: Context<AdminAction>) -> Result<()> {
        instruction_handlers::resume_program(ctx)
    }

    /// Update authorization mode (admin only)
    pub fn update_authorization_mode(
        ctx: Context<AdminAction>,
        new_mode: AuthorizationMode,
        icp_public_key: Option<[u8; 32]>,
    ) -> Result<()> {
        instruction_handlers::update_authorization_mode(ctx, new_mode, icp_public_key)
    }

    /// Manual payment processing (subscriber only)
    pub fn process_manual_payment(ctx: Context<ProcessPayment>) -> Result<()> {
        instruction_handlers::process_manual_payment(ctx)
    }

    /// Main entry point from ICP: Process trigger with opcode routing
    pub fn process_trigger(
        ctx: Context<ProcessTrigger>,
        opcode: u8,
        icp_signature: Option<[u8; 64]>,
        timestamp: i64,
    ) -> Result<()> {
        instruction_handlers::process_trigger(ctx, opcode, icp_signature, timestamp)
    }

    /// Process trigger with Jupiter swap (opcode 0 only for non-USDC tokens)
    // COMMENTED OUT - Only USDC supported
    // pub fn process_trigger_with_swap(
    //     ctx: Context<ProcessTriggerWithSwap>,
    //     icp_signature: Option<[u8; 64]>,
    //     timestamp: i64,
    // ) -> Result<()> {
    //     instruction_handlers::process_trigger_with_swap(ctx, icp_signature, timestamp)
    // }

    /// Send notification to subscriber via Solana memo transaction
    pub fn send_notification(
        ctx: Context<SendNotification>,
        memo_message: String,
    ) -> Result<()> {
        instruction_handlers::send_notification(ctx, memo_message)
    }
}