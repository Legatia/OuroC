use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};
use std::str::FromStr;
use crate::constants::*;
use crate::data_structures::*;
use crate::errors::ErrorCode;
use crate::events::*;
use crate::payment_helpers::*;
use crate::crypto::*;

// ============================================================================
// Instruction Handlers Module
// ============================================================================

/// Initialize the subscription program
pub fn initialize(
    ctx: Context<crate::Initialize>,
    authorization_mode: AuthorizationMode,
    icp_public_key: Option<[u8; 32]>,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.authority.key();
    config.total_subscriptions = 0;
    config.paused = false;
    config.authorization_mode = authorization_mode;
    config.icp_public_key = icp_public_key;
    config.manual_processing_enabled = matches!(authorization_mode, AuthorizationMode::ManualOnly | AuthorizationMode::Hybrid);
    config.time_based_processing_enabled = matches!(authorization_mode, AuthorizationMode::TimeBased | AuthorizationMode::Hybrid);

    // SECURITY: No hardcoded fee address - must be set via update_fee_destination
    // This prevents single point of failure and enables proper governance
    config.icp_fee_collection_address = None; // Must be set explicitly by admin

    config.fee_config = FeeConfig {
        fee_percentage_basis_points: 200, // 2% fee (hardcoded)
        min_fee_amount: 1000, // 0.001 USDC minimum fee
    };

    msg!("⚠️ FEE COLLECTION ADDRESS NOT SET - Admin must call update_fee_destination() to set fee destination");
    msg!("Current authority: {:?}", ctx.accounts.authority.key());

    msg!("Ouro-C Subscriptions initialized by: {:?}", ctx.accounts.authority.key());
    msg!("Authorization mode: {:?}", authorization_mode);
    msg!("Fee percentage: 2% (200 basis points) - hardcoded");
    msg!("Fee collection address: CKEY8bppifSErEfP5cvX8hCnmQ2Yo911mosdRx7M3HxF");
    Ok(())
}

/// Update fee collection address (admin only)
/// Allows changing where platform fees are sent
/// Can be used to upgrade to multisig or change wallets
pub fn update_fee_destination(
    ctx: Context<crate::UpdateFeeDestination>,
    new_fee_address: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let old_address = config.icp_fee_collection_address;

    // Update the fee collection address
    config.icp_fee_collection_address = Some(new_fee_address);

    msg!(
        "Fee destination updated from {:?} to {}",
        old_address,
        new_fee_address
    );

    // Emit event for transparency
    emit!(FeeDestinationUpdated {
        old_address,
        new_address: new_fee_address,
        updated_by: ctx.accounts.authority.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Approve subscription PDA to spend USDC tokens
/// Subscriber must call this before creating subscription
/// Automatically calculates one year of delegation: amount × (365 days / interval)
/// This balances convenience (one approval per year) with security (not unlimited)
pub fn approve_subscription_delegate(
    ctx: Context<crate::ApproveDelegate>,
    subscription_id: String,
    amount: u64,
    interval_seconds: i64,
) -> Result<()> {
    // Enhanced amount validation
    require!(amount > 0, ErrorCode::InsufficientAmount);
    require!(amount >= 1000, ErrorCode::InsufficientAmount); // Minimum 0.001 USDC
    require!(amount <= MAX_APPROVAL_AMOUNT, ErrorCode::InvalidAmount);

    // Calculate one year of delegation automatically
    let delegation_amount = crate::constants::calculate_one_year_delegation(amount, interval_seconds)?;

    // Validate subscription ID format and content
    require!(subscription_id.len() > 0, ErrorCode::InvalidSubscriptionId);
    require!(subscription_id.len() <= 32, ErrorCode::InvalidSubscriptionId);
    require!(
        subscription_id.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-'),
        ErrorCode::InvalidSubscriptionId
    );

    // Approve the subscription PDA as delegate for the subscriber's token account
    let cpi_accounts = token::Approve {
        to: ctx.accounts.subscriber_token_account.to_account_info(),
        delegate: ctx.accounts.subscription_pda.to_account_info(),
        authority: ctx.accounts.subscriber.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    token::approve(cpi_ctx, delegation_amount)?;

    msg!(
        "Approved subscription PDA {} to spend {} USDC for subscription {} ({} USDC per payment × {} payments ≈ 1 year)",
        ctx.accounts.subscription_pda.key(),
        delegation_amount,
        subscription_id,
        amount,
        delegation_amount / amount.max(1)
    );

    // Emit event
    emit!(DelegateApproved {
        subscription_id: subscription_id.clone(),
        subscriber: ctx.accounts.subscriber.key(),
        delegate: ctx.accounts.subscription_pda.key(),
        amount: delegation_amount,
    });

    Ok(())
}

/// Create a new subscription
pub fn create_subscription(
    ctx: Context<crate::CreateSubscription>,
    subscription_id: String,
    amount: u64,
    interval_seconds: i64,
    merchant_address: Pubkey,
    merchant_name: String, // Merchant's app/business name for notifications (max 32 chars)
    reminder_days_before_payment: u32, // Days before payment to send reminder (merchant configured)
    icp_canister_signature: [u8; 64], // Ed25519 signature from ICP canister
) -> Result<()> {
    require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);

    // Enhanced input validation
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(amount >= 1000, ErrorCode::InvalidAmount); // Minimum 0.001 USDC
    require!(amount <= 1_000_000_000_000_000, ErrorCode::InvalidAmount); // Maximum 1B USDC

    // Interval validation: -1 for one-time, or >= 10 seconds for recurring (10s for demo purposes)
    require!(interval_seconds == -1 || interval_seconds >= 10, ErrorCode::InvalidInterval);
    require!(interval_seconds <= 365 * 24 * 60 * 60, ErrorCode::InvalidInterval); // Maximum 1 year

    // Validate subscription ID format and content
    require!(subscription_id.len() > 0, ErrorCode::InvalidSubscriptionId);
    require!(subscription_id.len() <= 32, ErrorCode::InvalidSubscriptionId);
    require!(
        subscription_id.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-'),
        ErrorCode::InvalidSubscriptionId
    );

    // Enhanced merchant name validation
    require!(merchant_name.len() > 0 && merchant_name.len() <= 32, ErrorCode::InvalidMerchantName);
    require!(
        merchant_name.chars().all(|c| c.is_alphanumeric() || c.is_whitespace() || c == '_' || c == '-' || c == '&' || c == '@' || c == '.'),
        ErrorCode::InvalidMerchantName
    );

    // Enhanced reminder days validation
    require!(reminder_days_before_payment > 0 && reminder_days_before_payment <= MAX_REMINDER_DAYS, ErrorCode::InvalidReminderDays);

    // Additional security: Prevent unreasonable payment amounts
    let amount_usdc = amount as f64 / 1_000_000.0;
    require!(amount_usdc <= 1_000_000.0, ErrorCode::InvalidAmount); // Max $1M per payment

    let subscription = &mut ctx.accounts.subscription;
    let clock = Clock::get()?;

    // Derive escrow PDA for this subscription
    let (escrow_pda, _bump) = crate::constants::derive_escrow_pda(&subscription_id, ctx.program_id);

    subscription.id = subscription_id.clone();
    subscription.subscriber = ctx.accounts.subscriber.key();
    subscription.merchant = merchant_address;
    subscription.merchant_name = merchant_name.clone(); // Store merchant name for notifications
    subscription.amount = amount; // Amount merchant receives in USDC
    subscription.interval_seconds = interval_seconds;
    // For one-time payments (interval = -1), payment is due immediately
    // For recurring, payment is due after the interval
    subscription.next_payment_time = if interval_seconds == -1 {
        clock.unix_timestamp // One-time: due immediately
    } else {
        clock.unix_timestamp + interval_seconds // Recurring: due after interval
    };
    subscription.status = SubscriptionStatus::Active;
    subscription.created_at = clock.unix_timestamp;
    subscription.payments_made = 0;
    subscription.total_paid = 0;
    subscription.icp_canister_signature = icp_canister_signature;
    subscription.reminder_days_before_payment = reminder_days_before_payment; // Merchant-configured reminder timing
    subscription.escrow_pda = escrow_pda; // Store escrow PDA for off-ramp integration
    subscription.escrow_balance = 0; // Initial balance is 0

    // Automatically approve delegation (one-click UX improvement)
    // Calculate one year of delegation to minimize user interactions
    let delegation_amount = crate::constants::calculate_one_year_delegation(amount, interval_seconds)?;

    let cpi_accounts = token::Approve {
        to: ctx.accounts.subscriber_token_account.to_account_info(),
        delegate: ctx.accounts.subscription_pda.to_account_info(),
        authority: ctx.accounts.subscriber.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    token::approve(cpi_ctx, delegation_amount)?;

    msg!(
        "Auto-approved subscription PDA {} to spend {} USDC ({} USDC × {} payments ≈ 1 year)",
        ctx.accounts.subscription_pda.key(),
        delegation_amount,
        amount,
        delegation_amount / amount.max(1)
    );

    // Update global config
    ctx.accounts.config.total_subscriptions += 1;

    msg!(
        "Subscription created: {} for {} USDC every {} seconds, reminder: {} days before, escrow: {}",
        subscription.id,
        amount,
        interval_seconds,
        reminder_days_before_payment,
        escrow_pda
    );

    // Emit event
    emit!(SubscriptionCreated {
        subscription_id: subscription_id.clone(),
        subscriber: ctx.accounts.subscriber.key(),
        merchant: merchant_address,
        amount,
        interval_seconds,
    });

    Ok(())
}

/// Process payment with automatic swap (Router function for multi-token support)
/// COMMENTED OUT - Only USDC supported
/*
pub fn process_payment_with_swap<'info>(
    ctx: Context<'_, '_, '_, 'info, ProcessPaymentWithSwap<'info>>,
    icp_signature: Option<[u8; 64]>,
    timestamp: i64,
) -> Result<()> {
    let subscription = &ctx.accounts.subscription;

    // Check if payment token is USDC - if so, skip swap
    let usdc_mint_str = subscription.payment_token_mint.to_string();
    let is_usdc = usdc_mint_str == USDC_MINT;

    let _usdc_amount = if is_usdc {
        // Standard USDC payment - no swap needed
        msg!("Payment token is USDC, using standard payment flow");
        subscription.amount
    } else {
        // Non-USDC stablecoin - swap via Jupiter with Pyth oracle validation
        msg!("Payment token is non-USDC ({}), swapping to USDC via Jupiter", usdc_mint_str);

        // Step 1: Get price from Pyth oracle for validation
        let price_feed = &ctx.accounts.price_feed;
        let conversion = crate::price_oracle::get_price_conversion(
            &subscription.payment_token_mint,
            subscription.amount,
            price_feed,
            subscription.slippage_bps, // Use subscription's configured slippage
        )?;

        // Step 2: Validate price confidence
        crate::price_oracle::validate_price_confidence(&conversion)?;

        msg!(
            "Oracle validation: {} {} → min {} USDC (1% slippage protection)",
            conversion.input_amount,
            usdc_mint_str,
            conversion.output_amount_min
        );

        // Step 3: Execute swap via Jupiter
        let jupiter_program = &ctx.accounts.jupiter_program;
        let source_token_account = &ctx.accounts.payment_token_account;
        let _temp_usdc_account = &ctx.accounts.temp_usdc_account; // Reserved for future swap implementation
        let subscriber_authority = &ctx.accounts.subscriber;
        let source_mint = &ctx.accounts.payment_token_mint;
        let usdc_mint_account = &ctx.accounts.usdc_mint;

        // Get remaining accounts for Jupiter routing
        let remaining_accounts = ctx.remaining_accounts;

        let output_amount = crate::jupiter_swap::swap_stablecoin_to_usdc(
            jupiter_program,
            source_token_account,
            &mut ctx.accounts.temp_usdc_account,
            subscriber_authority,
            source_mint,
            usdc_mint_account,
            subscription.amount,
            conversion.output_amount_min, // Slippage protection from oracle
            remaining_accounts,
            &ctx.accounts.token_program,
        )?;

        msg!("Swap completed: received {} USDC", output_amount);

        // Use the actual swapped USDC amount for payment
        output_amount
    };

    // Execute standard payment processing logic (works for both USDC and post-swap)
    process_payment_core(
        &mut ctx.accounts.subscription,
        &ctx.accounts.config,
        &ctx.accounts.trigger_authority,
        &ctx.accounts.payment_token_account,
        &ctx.accounts.merchant_usdc_account,
        &ctx.accounts.icp_fee_usdc_account,
        &ctx.accounts.token_program,
        ctx.program_id,
        icp_signature,
        timestamp,
        &ctx.accounts.instructions_sysvar,
    )
}
*/

/// Process payment for a subscription (supports multiple authorization modes)
/// Standard entry point for USDC-only subscriptions
pub fn process_payment(
    ctx: Context<crate::ProcessPayment>,
    icp_signature: Option<[u8; 64]>,
    timestamp: i64,
) -> Result<()> {
    process_payment_core(
        &mut ctx.accounts.subscription,
        &ctx.accounts.config,
        &ctx.accounts.trigger_authority,
        &ctx.accounts.subscriber_token_account,
        &ctx.accounts.merchant_token_account,
        &ctx.accounts.icp_fee_token_account,
        &ctx.accounts.token_program,
        ctx.program_id,
        icp_signature,
        timestamp,
        &ctx.accounts.instructions_sysvar,
    )
}

/// Pause a subscription
pub fn pause_subscription(ctx: Context<crate::UpdateSubscription>) -> Result<()> {
    let subscription = &mut ctx.accounts.subscription;
    require!(subscription.status == SubscriptionStatus::Active, ErrorCode::SubscriptionNotActive);

    let clock = Clock::get()?;
    let subscription_id = subscription.id.clone();

    subscription.status = SubscriptionStatus::Paused;

    msg!("Subscription {} paused", subscription_id);

    emit!(SubscriptionPaused {
        subscription_id,
        paused_at: clock.unix_timestamp,
    });

    Ok(())
}

/// Resume a subscription
pub fn resume_subscription(ctx: Context<crate::UpdateSubscription>) -> Result<()> {
    let subscription = &mut ctx.accounts.subscription;
    require!(subscription.status == SubscriptionStatus::Paused, ErrorCode::SubscriptionNotPaused);

    let clock = Clock::get()?;
    let subscription_id = subscription.id.clone();

    subscription.status = SubscriptionStatus::Active;
    subscription.next_payment_time = clock.unix_timestamp + subscription.interval_seconds;

    msg!("Subscription {} resumed", subscription_id);

    emit!(SubscriptionResumed {
        subscription_id,
        resumed_at: clock.unix_timestamp,
    });

    Ok(())
}

/// Cancel a subscription
pub fn cancel_subscription(ctx: Context<crate::UpdateSubscription>) -> Result<()> {
    let subscription = &mut ctx.accounts.subscription;
    require!(
        subscription.status == SubscriptionStatus::Active ||
        subscription.status == SubscriptionStatus::Paused,
        ErrorCode::SubscriptionAlreadyCancelled
    );

    let clock = Clock::get()?;
    let subscription_id = subscription.id.clone();
    let total_payments = subscription.payments_made;
    let total = subscription.total_paid;

    subscription.status = SubscriptionStatus::Cancelled;

    msg!("Subscription {} cancelled", subscription_id);

    emit!(SubscriptionCancelled {
        subscription_id,
        cancelled_at: clock.unix_timestamp,
        total_payments_made: total_payments,
        total_paid: total,
    });

    Ok(())
}

/// Revoke subscription PDA delegate (after cancellation)
pub fn revoke_subscription_delegate(
    ctx: Context<crate::RevokeDelegate>,
) -> Result<()> {
    // Revoke the subscription PDA's delegate authority
    let cpi_accounts = token::Revoke {
        source: ctx.accounts.subscriber_token_account.to_account_info(),
        authority: ctx.accounts.subscriber.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    token::revoke(cpi_ctx)?;

    msg!("Revoked subscription PDA delegate for {}", ctx.accounts.subscription.id);
    Ok(())
}

/// Merchant claims USDC from escrow after off-ramp API confirmation
/// This allows merchants to withdraw funds from escrow once fiat transfer is complete
pub fn claim_from_escrow(
    ctx: Context<crate::ClaimFromEscrow>,
    subscription_id: String,
    amount: u64,
) -> Result<()> {
    let subscription = &mut ctx.accounts.subscription;

    // Validate claim amount
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(amount <= subscription.escrow_balance, ErrorCode::InsufficientAmount);

    // Get escrow PDA bump for signing
    let (_escrow_pda, bump) = crate::constants::derive_escrow_pda(&subscription_id, ctx.program_id);
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"escrow",
        subscription_id.as_bytes(),
        &[bump],
    ]];

    // Transfer from escrow to merchant
    let transfer_to_merchant = token::Transfer {
        from: ctx.accounts.escrow_token_account.to_account_info(),
        to: ctx.accounts.merchant_token_account.to_account_info(),
        authority: ctx.accounts.escrow_pda.to_account_info(),
    };

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_to_merchant,
            signer_seeds,
        ),
        amount,
    )?;

    // Update escrow balance
    subscription.escrow_balance = subscription.escrow_balance
        .checked_sub(amount)
        .ok_or(ErrorCode::MathOverflow)?;

    msg!(
        "Merchant claimed {} micro-USDC from escrow for subscription {}. Remaining escrow: {}",
        amount,
        subscription_id,
        subscription.escrow_balance
    );

    Ok(())
}

/// Emergency pause the entire program (admin only)
pub fn emergency_pause(ctx: Context<crate::AdminAction>) -> Result<()> {
    ctx.accounts.config.paused = true;
    msg!("Ouro-C Subscriptions emergency paused");
    Ok(())
}

/// Resume the program (admin only)
pub fn resume_program(ctx: Context<crate::AdminAction>) -> Result<()> {
    ctx.accounts.config.paused = false;
    msg!("Ouro-C Subscriptions resumed");
    Ok(())
}

/// Update authorization mode (admin only)
pub fn update_authorization_mode(
    ctx: Context<crate::AdminAction>,
    new_mode: AuthorizationMode,
    icp_public_key: Option<[u8; 32]>,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.authorization_mode = new_mode;
    config.icp_public_key = icp_public_key;
    config.manual_processing_enabled = matches!(new_mode, AuthorizationMode::ManualOnly | AuthorizationMode::Hybrid);
    config.time_based_processing_enabled = matches!(new_mode, AuthorizationMode::TimeBased | AuthorizationMode::Hybrid);

    msg!("Authorization mode updated to: {:?}", new_mode);
    Ok(())
}

/// Manual payment processing (subscriber only)
pub fn process_manual_payment(ctx: Context<crate::ProcessPayment>) -> Result<()> {
    require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);
    require!(
        ctx.accounts.config.manual_processing_enabled,
        ErrorCode::AuthorizationFailed
    );

    // Call main process_payment with manual authorization
    process_payment(ctx, None, 0)
}

/// Send notification to subscriber via Solana memo transaction
/// This function sends a tiny SOL transfer (0.000001 SOL) with a memo message
/// Users can see this notification in their wallet transaction history
/// Main entry point from ICP: Process trigger with opcode routing
/// Opcode 0: Payment (direct USDC only - use process_trigger_with_swap for swaps)
/// Opcode 1: Notification (send memo to subscriber)
pub fn process_trigger(
    ctx: Context<crate::ProcessTrigger>,
    opcode: u8,
    icp_signature: Option<[u8; 64]>,
    timestamp: i64,
) -> Result<()> {
    require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);

    let subscription = &ctx.accounts.subscription;
    let config = &ctx.accounts.config;

    // Verify trigger authority based on authorization mode
    match config.authorization_mode {
        AuthorizationMode::ICPSignature => {
            // ICP signature required
            let _sig = icp_signature.ok_or(ErrorCode::InvalidSignature)?;
            let icp_pubkey = config
                .icp_public_key
                .ok_or(ErrorCode::InvalidSignature)?;

            // Create message: subscription_id + timestamp + amount
            let message = create_payment_message(
                &subscription.id,
                timestamp,
                subscription.amount,
            );

            // Verify timestamp (5 minute window for production security)
            let current_time = Clock::get()?.unix_timestamp;
            require!(
                verify_timestamp(timestamp, current_time, 300)?,
                ErrorCode::TimestampExpired
            );

            // Verify Ed25519 signature using precompile
            let is_valid = verify_ed25519_ix(
                &ctx.accounts.instructions_sysvar,
                &icp_pubkey,
                &message,
            )?;

            require!(is_valid, ErrorCode::InvalidSignature);
        }
        AuthorizationMode::ManualOnly => {
            // Verify signer is subscriber or merchant
            let signer = ctx.accounts.trigger_authority.key();
            require!(
                signer == subscription.subscriber || signer == subscription.merchant,
                ErrorCode::UnauthorizedAccess
            );
        }
        AuthorizationMode::TimeBased => {
            // Anyone can trigger if payment is due
            let current_time = Clock::get()?.unix_timestamp;
            require!(
                current_time >= subscription.next_payment_time,
                ErrorCode::PaymentNotDue
            );
        }
        AuthorizationMode::Hybrid => {
            // Try ICP signature first, fallback to manual if overdue
            if let Some(_sig) = icp_signature {
                if let Some(icp_pubkey) = config.icp_public_key {
                    let message = create_payment_message(
                        &subscription.id,
                        timestamp,
                        subscription.amount,
                    );

                    let current_time = Clock::get()?.unix_timestamp;
                    let timestamp_valid = verify_timestamp(timestamp, current_time, 300)?;

                    if timestamp_valid {
                        let is_valid = verify_ed25519_ix(
                            &ctx.accounts.instructions_sysvar,
                            &icp_pubkey,
                            &message,
                        )?;

                        if is_valid {
                            // ICP signature valid, proceed
                        } else {
                            return Err(ErrorCode::InvalidSignature.into());
                        }
                    }
                }
            } else {
                // No signature - check if payment is overdue (5 min grace period)
                let current_time = Clock::get()?.unix_timestamp;
                let grace_period = 60; // 1 minute
                require!(
                    current_time >= subscription.next_payment_time + grace_period,
                    ErrorCode::PaymentNotDue
                );

                // Verify signer is authorized
                let signer = ctx.accounts.trigger_authority.key();
                require!(
                    signer == subscription.subscriber || signer == subscription.merchant,
                    ErrorCode::UnauthorizedAccess
                );
            }
        }
    }

    match opcode {
        0 => {
            // Payment: Direct USDC only
            msg!("Processing direct USDC payment for subscription: {}", subscription.id);
            process_direct_usdc_payment(ctx)?;
        },
        1 => {
            // Notification: Send memo to subscriber
            msg!("Sending notification for subscription: {}", subscription.id);

            // Build notification message with merchant name and subscription details
            let memo = format!(
                "{}: Payment due in {} days. Amount: {} USDC",
                subscription.merchant_name,
                subscription.reminder_days_before_payment,
                subscription.amount as f64 / 1_000_000.0
            );

            send_notification_internal(ctx, memo)?;
        },
        _ => {
            return Err(ErrorCode::InvalidOpcode.into());
        }
    }

    Ok(())
}

/// Process trigger with Jupiter swap (opcode 0 only for non-USDC tokens)
/// COMMENTED OUT - Only USDC supported
/*
pub fn process_trigger_with_swap(
    ctx: Context<ProcessTriggerWithSwap>,
    icp_signature: Option<[u8; 64]>,
    timestamp: i64,
) -> Result<()> {
    require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);

    let subscription = &ctx.accounts.subscription;
    let config = &ctx.accounts.config;

    // Verify token is NOT USDC (swap only needed for other tokens)
    let token_mint = subscription.payment_token_mint;
    let usdc_mint = Pubkey::from_str(USDC_MINT).unwrap();

    require!(token_mint != usdc_mint, ErrorCode::InvalidTokenMint);

    // Verify trigger authority (same logic as process_trigger)
    match config.authorization_mode {
        AuthorizationMode::ICPSignature => {
            let _sig = icp_signature.ok_or(ErrorCode::InvalidSignature)?;
            let icp_pubkey = config.icp_public_key.ok_or(ErrorCode::InvalidSignature)?;

            let message = create_payment_message(
                &subscription.id,
                timestamp,
                subscription.amount,
            );

            let current_time = Clock::get()?.unix_timestamp;
            require!(
                verify_timestamp(timestamp, current_time, 300)?,
                ErrorCode::TimestampExpired
            );

            let is_valid = verify_ed25519_ix(
                &ctx.accounts.instructions_sysvar,
                &icp_pubkey,
                &message,
            )?;
            require!(is_valid, ErrorCode::InvalidSignature);
        }
        AuthorizationMode::ManualOnly => {
            let signer = ctx.accounts.trigger_authority.key();
            require!(
                signer == subscription.subscriber || signer == subscription.merchant,
                ErrorCode::UnauthorizedAccess
            );
        }
        AuthorizationMode::TimeBased => {
            let current_time = Clock::get()?.unix_timestamp;
            require!(
                current_time >= subscription.next_payment_time,
                ErrorCode::PaymentNotDue
            );
        }
        AuthorizationMode::Hybrid => {
            if let Some(_sig) = icp_signature {
                if let Some(icp_pubkey) = config.icp_public_key {
                    let message = create_payment_message(&subscription.id, timestamp, subscription.amount);
                    let current_time = Clock::get()?.unix_timestamp;

                    if verify_timestamp(timestamp, current_time, 300)? {
                        let is_valid = verify_ed25519_ix(
                            &ctx.accounts.instructions_sysvar,
                            &icp_pubkey,
                            &message,
                        )?;
                        require!(is_valid, ErrorCode::InvalidSignature);
                    }
                }
            } else {
                let current_time = Clock::get()?.unix_timestamp;
                require!(
                    current_time >= subscription.next_payment_time + 300,
                    ErrorCode::PaymentNotDue
                );

                let signer = ctx.accounts.trigger_authority.key();
                require!(
                    signer == subscription.subscriber || signer == subscription.merchant,
                    ErrorCode::UnauthorizedAccess
                );
            }
        }
    }

    msg!("Processing swap payment for subscription: {} (token: {})",
        subscription.id, token_mint);

    // Solana fetches Jupiter quote and executes swap internally
    process_swap_then_split(ctx)?;

    Ok(())
}
*/

pub fn send_notification(
    ctx: Context<crate::SendNotification>,
    memo_message: String,
) -> Result<()> {
    require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);
    require!(memo_message.len() <= 566, ErrorCode::MemoTooLong);

    let subscription = &ctx.accounts.subscription;

    // Verify the notification sender is authorized (ICP canister or admin)
    require!(
        ctx.accounts.notification_sender.key() == ctx.accounts.config.authority,
        ErrorCode::UnauthorizedAccess
    );

    // 1. Transfer tiny amount of SOL (0.000001 SOL = 1000 lamports) to subscriber
    let notification_amount = 1000u64; // 0.000001 SOL

    let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.notification_sender.key(),
        &subscription.subscriber,
        notification_amount,
    );

    anchor_lang::solana_program::program::invoke(
        &transfer_ix,
        &[
            ctx.accounts.notification_sender.to_account_info(),
            ctx.accounts.subscriber.to_account_info(),
        ],
    )?;

    // 2. Add SPL Memo instruction to make message visible in wallets
    let memo_ix = spl_memo::build_memo(
        memo_message.as_bytes(),
        &[&ctx.accounts.notification_sender.key()],
    );

    anchor_lang::solana_program::program::invoke(
        &memo_ix,
        &[
            ctx.accounts.notification_sender.to_account_info(),
            ctx.accounts.memo_program.to_account_info(),
        ],
    )?;

    msg!("Notification sent to subscriber with memo: {}", memo_message);

    Ok(())
}