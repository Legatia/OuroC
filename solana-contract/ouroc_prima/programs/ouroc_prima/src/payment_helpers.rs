use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};
use crate::constants::*;
use crate::data_structures::*;
use crate::errors::ErrorCode;
use crate::events::*;
use crate::crypto::*;

// ============================================================================
// Payment Helpers Module (USDC Only)
// ============================================================================

/// Core payment processing logic for USDC-only payments
pub fn process_payment_core<'info>(
    subscription: &mut Account<'info, Subscription>,
    config: &Account<'info, Config>,
    trigger_authority: &Signer<'info>,
    subscriber_token_account: &Account<'info, TokenAccount>,
    merchant_token_account: &Account<'info, TokenAccount>,
    icp_fee_token_account: &Account<'info, TokenAccount>,
    token_program: &Program<'info, Token>,
    program_id: &Pubkey,
    icp_signature: Option<[u8; 64]>,
    timestamp: i64,
    instructions_sysvar: &UncheckedAccount<'info>,
) -> Result<()> {
    require!(!config.paused, ErrorCode::ProgramPaused);
    require!(subscription.status == SubscriptionStatus::Active, ErrorCode::SubscriptionNotActive);

    // SECURITY: Validate fee collection address is set
    require!(
        config.icp_fee_collection_address.is_some(),
        ErrorCode::FeeCollectionAddressNotSet
    );

    let clock = Clock::get()?;

    // Authorization based on configured mode
    match config.authorization_mode {
        AuthorizationMode::ICPSignature => {
            // Original ICP signature verification
            require!(icp_signature.is_some(), ErrorCode::MissingSignature);
            let signature = icp_signature.unwrap();

            require!(
                clock.unix_timestamp >= subscription.next_payment_time,
                ErrorCode::PaymentNotDue
            );

            // Verify timestamp is recent (prevent replay attacks)
            let max_age_seconds = 300; // 5 minutes - reduced from 60 minutes for security
            require!(
                verify_timestamp(timestamp, clock.unix_timestamp, max_age_seconds)?,
                ErrorCode::SignatureExpired
            );

            // Create message that ICP canister should have signed
            let message = create_payment_message(
                &subscription.id,
                timestamp,
                subscription.amount
            );

            // Verify ICP canister signature
            let icp_public_key = config.icp_public_key.ok_or(ErrorCode::MissingICPKey)?;
            require!(
                verify_ed25519_ix(instructions_sysvar, &icp_public_key, &message)?,
                ErrorCode::InvalidSignature
            );

            // Update signature for next payment verification
            subscription.icp_canister_signature = signature;
        },
        AuthorizationMode::ManualOnly => {
            // Manual processing - subscriber or authorized party can trigger
            require!(
                trigger_authority.key() == subscription.subscriber ||
                trigger_authority.key() == config.authority,
                ErrorCode::UnauthorizedAccess
            );
            // No time restriction for manual processing
        },
        AuthorizationMode::TimeBased => {
            // Time-based processing - anyone can trigger if payment is due
            require!(
                clock.unix_timestamp >= subscription.next_payment_time,
                ErrorCode::PaymentNotDue
            );
        },
        AuthorizationMode::Hybrid => {
            // Multiple authorization methods
            let is_icp_valid = if let Some(_signature) = icp_signature {
                if let Some(icp_key) = config.icp_public_key {
                    let message = create_payment_message(
                        &subscription.id,
                        timestamp,
                        subscription.amount
                    );
                    verify_ed25519_ix(instructions_sysvar, &icp_key, &message).unwrap_or(false)
                } else { false }
            } else { false };

            let is_manual_valid = trigger_authority.key() == subscription.subscriber;
            let is_time_valid = clock.unix_timestamp >= subscription.next_payment_time;

            require!(
                is_icp_valid || (is_manual_valid && config.manual_processing_enabled) ||
                (is_time_valid && config.time_based_processing_enabled),
                ErrorCode::AuthorizationFailed
            );

            if is_icp_valid && icp_signature.is_some() {
                subscription.icp_canister_signature = icp_signature.unwrap();
            }
        }
    }

    // Execute USDC transfer from subscriber to merchant

    // Calculate fee (e.g., 1% of payment amount)
    let fee_config = &config.fee_config;
    let platform_fee = subscription.amount
        .checked_mul(fee_config.fee_percentage_basis_points as u64)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(BASIS_POINTS_DIVISOR)
        .ok_or(ErrorCode::MathOverflow)?;

    let merchant_amount = subscription.amount
        .checked_sub(platform_fee)
        .ok_or(ErrorCode::InsufficientAmount)?;

    // Use subscription PDA as authority (subscriber must delegate to this PDA)
    // Derive PDA signer seeds for CPI - Clone ID to avoid borrow issues
    let subscription_id = subscription.id.clone();
    let subscription_key = subscription.key();

    // Find the bump seed for this subscription PDA
    let (subscription_pda, bump) = Pubkey::find_program_address(
        &[b"subscription", subscription_id.as_bytes()],
        program_id
    );

    // Verify the subscription account matches the derived PDA
    require!(
        subscription_pda == subscription_key,
        ErrorCode::InvalidSubscriptionPDA
    );

    let seeds = &[
        b"subscription".as_ref(),
        subscription_id.as_bytes(),
        &[bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // EFFECTS: Update subscription state BEFORE external calls (CEI pattern)
    subscription.payments_made += 1;
    subscription.total_paid += subscription.amount;

    // Schedule next payment based on interval type
    if subscription.interval_seconds == -1 {
        // One-time payment: auto-cancel after payment
        subscription.status = SubscriptionStatus::Cancelled;
        msg!("One-time payment completed - subscription auto-cancelled");
    } else {
        // Recurring payment: schedule next payment relative to scheduled time (not current time) to prevent drift
        subscription.next_payment_time = subscription.next_payment_time
            .checked_add(subscription.interval_seconds)
            .ok_or(ErrorCode::MathOverflow)?;

        // Handle multiple missed payments by advancing until future
        while subscription.next_payment_time < clock.unix_timestamp {
            subscription.next_payment_time = subscription.next_payment_time
                .checked_add(subscription.interval_seconds)
                .ok_or(ErrorCode::MathOverflow)?;
        }
    }

    subscription.last_payment_time = Some(clock.unix_timestamp);

    // Get subscription account info after state updates
    let subscription_account_info = subscription.to_account_info();

    // INTERACTIONS: External token transfers AFTER state updates (CEI pattern)
    // Transfer merchant_amount to merchant via CPI with PDA authority
    let transfer_to_merchant = token::Transfer {
        from: subscriber_token_account.to_account_info(),
        to: merchant_token_account.to_account_info(),
        authority: subscription_account_info.clone(),
    };

    token::transfer(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            transfer_to_merchant,
            signer_seeds,
        ),
        merchant_amount,
    )?;

    msg!("Transferred {} micro-USDC to merchant", merchant_amount);

    // Transfer platform_fee to ICP canister fee collection account
    if platform_fee > 0 {
        let transfer_to_icp = token::Transfer {
            from: subscriber_token_account.to_account_info(),
            to: icp_fee_token_account.to_account_info(),
            authority: subscription_account_info.clone(),
        };

        token::transfer(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                transfer_to_icp,
                signer_seeds,
            ),
            platform_fee,
        )?;

        msg!("Transferred {} micro-USDC fee to ICP canister", platform_fee);
    }

    msg!(
        "Payment #{} processed: total={}, merchant={}, platform_fee={}",
        subscription.payments_made,
        subscription.amount,
        merchant_amount,
        platform_fee
    );

    // Emit payment event
    emit!(PaymentProcessed {
        subscription_id: subscription.id.clone(),
        payment_number: subscription.payments_made,
        amount: subscription.amount,
        merchant_amount,
        fee_amount: platform_fee,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// Helper functions for process_trigger
pub fn process_direct_usdc_payment(ctx: Context<crate::ProcessTrigger>) -> Result<()> {
    let subscription = &mut ctx.accounts.subscription;
    let config = &ctx.accounts.config;

    // Calculate fee (treasury gets X%, merchant gets rest)
    let payment_amount = subscription.amount;
    let fee_amount_u128 = (payment_amount as u128)
        .checked_mul(config.fee_config.fee_percentage_basis_points as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(BASIS_POINTS_DIVISOR as u128)
        .ok_or(ErrorCode::MathOverflow)?;
    // SECURITY: Safe cast with overflow check
    let fee_amount = u64::try_from(fee_amount_u128)
        .map_err(|_| ErrorCode::MathOverflow)?;
    let fee_amount = fee_amount.max(config.fee_config.min_fee_amount);
    let merchant_amount = payment_amount.checked_sub(fee_amount).ok_or(ErrorCode::InsufficientAmount)?;

    // Get data needed for CPI before mutating subscription
    let subscription_id = subscription.id.clone();

    // EFFECTS: Update subscription state BEFORE external calls (CEI pattern)
    subscription.last_payment_time = Some(Clock::get()?.unix_timestamp);
    subscription.payments_made = subscription.payments_made.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
    subscription.total_paid = subscription.total_paid.checked_add(payment_amount).ok_or(ErrorCode::MathOverflow)?;
    // Update escrow balance (merchant amount goes to escrow)
    subscription.escrow_balance = subscription.escrow_balance.checked_add(merchant_amount).ok_or(ErrorCode::MathOverflow)?;

    // Handle one-time vs recurring payments
    if subscription.interval_seconds == -1 {
        // One-time payment: auto-cancel after payment
        subscription.status = SubscriptionStatus::Cancelled;
        msg!("One-time payment completed - subscription auto-cancelled");
    } else {
        // Recurring: schedule next payment
        subscription.next_payment_time = subscription.next_payment_time
            .checked_add(subscription.interval_seconds)
            .ok_or(ErrorCode::MathOverflow)?;
    }

    // INTERACTIONS: External token transfers AFTER state updates (CEI pattern)
    let seeds = &[b"subscription", subscription_id.as_bytes(), &[ctx.bumps.subscription]];
    let signer_seeds = &[&seeds[..]];

    // Transfer fee to ICP treasury
    let transfer_fee_ix = anchor_spl::token::spl_token::instruction::transfer(
        ctx.accounts.token_program.key,
        &ctx.accounts.subscriber_token_account.key(),
        &ctx.accounts.icp_fee_usdc_account.key(),
        ctx.accounts.subscription_pda.key,
        &[],
        fee_amount,
    )?;

    anchor_lang::solana_program::program::invoke_signed(
        &transfer_fee_ix,
        &[
            ctx.accounts.subscriber_token_account.to_account_info(),
            ctx.accounts.icp_fee_usdc_account.to_account_info(),
            ctx.accounts.subscription_pda.to_account_info(),
        ],
        signer_seeds,
    )?;

    // Transfer remaining to ESCROW (not directly to merchant)
    let transfer_escrow_ix = anchor_spl::token::spl_token::instruction::transfer(
        ctx.accounts.token_program.key,
        &ctx.accounts.subscriber_token_account.key(),
        &ctx.accounts.escrow_usdc_account.key(),
        ctx.accounts.subscription_pda.key,
        &[],
        merchant_amount,
    )?;

    anchor_lang::solana_program::program::invoke_signed(
        &transfer_escrow_ix,
        &[
            ctx.accounts.subscriber_token_account.to_account_info(),
            ctx.accounts.escrow_usdc_account.to_account_info(),
            ctx.accounts.subscription_pda.to_account_info(),
        ],
        signer_seeds,
    )?;

    msg!("USDC payment processed to ESCROW: {} USDC (fee: {}, escrow: {}, escrow_balance: {})",
        payment_amount, fee_amount, merchant_amount, subscription.escrow_balance);

    // Emit payment event
    emit!(PaymentProcessed {
        subscription_id: subscription_id.clone(),
        payment_number: subscription.payments_made,
        amount: payment_amount,
        merchant_amount,
        fee_amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

pub fn send_notification_internal(ctx: Context<crate::ProcessTrigger>, memo: String) -> Result<()> {
    require!(memo.len() <= 566, ErrorCode::MemoTooLong);

    // 1. Transfer tiny SOL amount (0.000001 SOL = 1000 lamports)
    let notification_amount = 1000u64;

    let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.trigger_authority.key(),
        &ctx.accounts.subscriber.key(),
        notification_amount,
    );

    anchor_lang::solana_program::program::invoke(
        &transfer_ix,
        &[
            ctx.accounts.trigger_authority.to_account_info(),
            ctx.accounts.subscriber.to_account_info(),
        ],
    )?;

    // 2. Add SPL Memo instruction to make message visible in wallets
    let memo_ix = spl_memo::build_memo(
        memo.as_bytes(),
        &[&ctx.accounts.trigger_authority.key()],
    );

    anchor_lang::solana_program::program::invoke(
        &memo_ix,
        &[
            ctx.accounts.trigger_authority.to_account_info(),
            ctx.accounts.memo_program.to_account_info(),
        ],
    )?;

    msg!("Notification sent with memo: {}", memo);
    Ok(())
}