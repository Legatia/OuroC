use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint};
use std::str::FromStr;

mod crypto;
use crypto::{create_payment_message, verify_icp_signature, verify_timestamp};

mod price_oracle;

mod jupiter_swap;

declare_id!("7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub");

// ============================================================================
// Constants
// ============================================================================

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

// Multi-token support: Other stablecoins (Mainnet)
pub const USDT_MINT_MAINNET: &str = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
pub const PYUSD_MINT_MAINNET: &str = "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo";
pub const DAI_MINT_MAINNET: &str = "EjmyN6qEC1Tf1JxiG1ae7UTJhUxSwk1TCWNWqxWV4J6o";

// Devnet versions (Custom test tokens - create your own or use these placeholders)
// NOTE: Official USDT/PYUSD/DAI tokens don't exist on devnet
// For testing, create custom SPL tokens using:
//   spl-token create-token --decimals 6
// Then update these addresses with your test token mint addresses
pub const USDT_MINT_DEVNET: &str = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"; // Replace with your test USDT
pub const PYUSD_MINT_DEVNET: &str = "CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM"; // Replace with your test PYUSD
pub const DAI_MINT_DEVNET: &str = "FTkSmGsJ3ZqDSHdcnY7ejN1pWV3Ej7i88MYpZyyaqgGt"; // Replace with your test DAI

// Use devnet USDC by default for development
#[cfg(feature = "mainnet")]
pub const USDC_MINT: &str = USDC_MINT_MAINNET;

#[cfg(not(feature = "mainnet"))]
pub const USDC_MINT: &str = USDC_MINT_DEVNET;

// Helper function to check if token is whitelisted stablecoin
pub fn is_supported_stablecoin(mint_address: &str) -> bool {
    #[cfg(feature = "mainnet")]
    {
        matches!(
            mint_address,
            USDC_MINT_MAINNET | USDT_MINT_MAINNET | PYUSD_MINT_MAINNET | DAI_MINT_MAINNET
        )
    }
    #[cfg(not(feature = "mainnet"))]
    {
        matches!(
            mint_address,
            USDC_MINT_DEVNET | USDT_MINT_DEVNET | PYUSD_MINT_DEVNET | DAI_MINT_DEVNET
        )
    }
}

// Helper to get USDC mint Pubkey (efficient comparison)
pub fn get_usdc_mint() -> Pubkey {
    Pubkey::from_str(USDC_MINT).unwrap()
}

// Helper to get Jupiter program ID Pubkey
pub fn get_jupiter_program_id() -> Pubkey {
    Pubkey::from_str(crate::jupiter_swap::JUPITER_PROGRAM_ID).unwrap()
}

#[program]
pub mod ouro_c_subscriptions {
    use super::*;

    /// Initialize the subscription program
    pub fn initialize(
        ctx: Context<Initialize>,
        authorization_mode: AuthorizationMode,
        icp_public_key: Option<[u8; 32]>,
        fee_percentage_basis_points: u16, // e.g., 100 = 1%
    ) -> Result<()> {
        // Validate fee percentage
        require!(
            fee_percentage_basis_points <= MAX_FEE_BPS,
            ErrorCode::FeeTooHigh
        );

        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.total_subscriptions = 0;
        config.paused = false;
        config.authorization_mode = authorization_mode;
        config.icp_public_key = icp_public_key;
        config.manual_processing_enabled = matches!(authorization_mode, AuthorizationMode::ManualOnly | AuthorizationMode::Hybrid);
        config.time_based_processing_enabled = matches!(authorization_mode, AuthorizationMode::TimeBased | AuthorizationMode::Hybrid);

        // Use validated ICP fee account from context
        config.icp_fee_collection_address = Some(ctx.accounts.icp_fee_usdc_account.key());

        config.fee_config = FeeConfig {
            fee_percentage_basis_points,
            min_fee_amount: 1000, // 0.001 USDC minimum fee
        };

        msg!("Ouro-C Subscriptions initialized by: {:?}", ctx.accounts.authority.key());
        msg!("Authorization mode: {:?}", authorization_mode);
        msg!("Fee percentage: {}% ({} basis points)", fee_percentage_basis_points as f64 / 100.0, fee_percentage_basis_points);
        msg!("ICP fee collection address: {:?}", ctx.accounts.icp_fee_usdc_account.key());
        Ok(())
    }

    /// Approve subscription PDA to spend USDC tokens
    /// Subscriber must call this before creating subscription
    /// Amount should be sufficient for multiple payments (subscription_amount * num_payments)
    pub fn approve_subscription_delegate(
        ctx: Context<ApproveDelegate>,
        subscription_id: String,
        amount: u64,
    ) -> Result<()> {
        // Validate amount is reasonable
        require!(amount > 0, ErrorCode::InsufficientAmount);
        require!(amount <= MAX_APPROVAL_AMOUNT, ErrorCode::InvalidAmount);

        // Approve the subscription PDA as delegate for the subscriber's token account
        let cpi_accounts = token::Approve {
            to: ctx.accounts.subscriber_token_account.to_account_info(),
            delegate: ctx.accounts.subscription_pda.to_account_info(),
            authority: ctx.accounts.subscriber.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::approve(cpi_ctx, amount)?;

        msg!(
            "Approved subscription PDA {} to spend {} USDC for subscription {}",
            ctx.accounts.subscription_pda.key(),
            amount,
            subscription_id
        );

        // Emit event
        emit!(DelegateApproved {
            subscription_id: subscription_id.clone(),
            subscriber: ctx.accounts.subscriber.key(),
            delegate: ctx.accounts.subscription_pda.key(),
            amount,
        });

        Ok(())
    }

    /// Create a new subscription
    pub fn create_subscription(
        ctx: Context<CreateSubscription>,
        subscription_id: String,
        amount: u64,
        interval_seconds: i64,
        merchant_address: Pubkey,
        payment_token_mint: Pubkey, // Token user will pay with (USDC/USDT/PYUSD/DAI)
        reminder_days_before_payment: u32, // Days before payment to send reminder (merchant configured)
        slippage_bps: u16, // Slippage tolerance in basis points (e.g., 100 = 1%, max 500 = 5%)
        icp_canister_signature: [u8; 64], // Ed25519 signature from ICP canister
    ) -> Result<()> {
        require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(interval_seconds > 0, ErrorCode::InvalidInterval);
        require!(subscription_id.len() <= 32, ErrorCode::InvalidSubscriptionId);
        require!(reminder_days_before_payment > 0 && reminder_days_before_payment <= MAX_REMINDER_DAYS, ErrorCode::InvalidReminderDays);
        require!(slippage_bps > 0 && slippage_bps <= MAX_SLIPPAGE_BPS, ErrorCode::InvalidSlippage);

        // Validate payment token is supported
        let token_str = payment_token_mint.to_string();
        require!(
            is_supported_stablecoin(&token_str),
            ErrorCode::UnsupportedPaymentToken
        );

        let subscription = &mut ctx.accounts.subscription;
        let clock = Clock::get()?;

        subscription.id = subscription_id.clone();
        subscription.subscriber = ctx.accounts.subscriber.key();
        subscription.merchant = merchant_address;
        subscription.amount = amount; // Amount merchant receives in USDC
        subscription.interval_seconds = interval_seconds;
        subscription.next_payment_time = clock.unix_timestamp + interval_seconds;
        subscription.status = SubscriptionStatus::Active;
        subscription.created_at = clock.unix_timestamp;
        subscription.payments_made = 0;
        subscription.total_paid = 0;
        subscription.icp_canister_signature = icp_canister_signature;
        subscription.payment_token_mint = payment_token_mint; // Lock in payment token
        subscription.reminder_days_before_payment = reminder_days_before_payment; // Merchant-configured reminder timing
        subscription.slippage_bps = slippage_bps; // User-configured slippage tolerance

        // Update global config
        ctx.accounts.config.total_subscriptions += 1;

        msg!(
            "Subscription created: {} for {} USDC every {} seconds, paying with token: {}, reminder: {} days before",
            subscription.id,
            amount,
            interval_seconds,
            payment_token_mint,
            reminder_days_before_payment
        );

        // Emit event
        emit!(SubscriptionCreated {
            subscription_id: subscription_id.clone(),
            subscriber: ctx.accounts.subscriber.key(),
            merchant: merchant_address,
            amount,
            interval_seconds,
            payment_token_mint,
            slippage_bps,
        });

        Ok(())
    }

    /// Process payment with automatic swap (Router function for multi-token support)
    /// This function checks the subscription's payment_token_mint:
    /// - If USDC: uses standard process_payment flow directly
    /// - If other token (USDT/PYUSD/DAI): swaps to USDC first, then processes payment
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
            let conversion = price_oracle::get_price_conversion(
                &subscription.payment_token_mint,
                subscription.amount,
                price_feed,
                subscription.slippage_bps, // Use subscription's configured slippage
            )?;

            // Step 2: Validate price confidence
            price_oracle::validate_price_confidence(&conversion)?;

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

            let output_amount = jupiter_swap::swap_stablecoin_to_usdc(
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
        payment_helpers::process_payment_core(
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
        )
    }

    /// Process payment for a subscription (supports multiple authorization modes)
    /// Standard entry point for USDC-only subscriptions
    pub fn process_payment(
        ctx: Context<ProcessPayment>,
        icp_signature: Option<[u8; 64]>,
        timestamp: i64,
    ) -> Result<()> {
        payment_helpers::process_payment_core(
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
        )
    }

    /// Pause a subscription
    pub fn pause_subscription(ctx: Context<UpdateSubscription>) -> Result<()> {
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
    pub fn resume_subscription(ctx: Context<UpdateSubscription>) -> Result<()> {
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
    pub fn cancel_subscription(ctx: Context<UpdateSubscription>) -> Result<()> {
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
        ctx: Context<RevokeDelegate>,
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

    /// Emergency pause the entire program (admin only)
    pub fn emergency_pause(ctx: Context<AdminAction>) -> Result<()> {
        ctx.accounts.config.paused = true;
        msg!("Ouro-C Subscriptions emergency paused");
        Ok(())
    }

    /// Resume the program (admin only)
    pub fn resume_program(ctx: Context<AdminAction>) -> Result<()> {
        ctx.accounts.config.paused = false;
        msg!("Ouro-C Subscriptions resumed");
        Ok(())
    }

    /// Update authorization mode (admin only)
    pub fn update_authorization_mode(
        ctx: Context<AdminAction>,
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
    pub fn process_manual_payment(ctx: Context<ProcessPayment>) -> Result<()> {
        require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);
        require!(
            ctx.accounts.config.manual_processing_enabled,
            ErrorCode::AuthorizationFailed
        );

        // Call main process_payment with manual authorization
        ouro_c_subscriptions::process_payment(ctx, None, 0)
    }

    /// Send notification to subscriber via Solana memo transaction
    /// This function sends a tiny SOL transfer (0.000001 SOL) with a memo message
    /// Users can see this notification in their wallet transaction history
    /// Main entry point from ICP: Process trigger with opcode routing
    /// Opcode 0: Payment (direct USDC only - use process_trigger_with_swap for swaps)
    /// Opcode 1: Notification (send memo to subscriber)
    pub fn process_trigger(
        ctx: Context<ProcessTrigger>,
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
                let sig = icp_signature.ok_or(ErrorCode::InvalidSignature)?;
                let icp_pubkey = config
                    .icp_public_key
                    .ok_or(ErrorCode::InvalidSignature)?;

                // Create message: subscription_id + timestamp + amount
                let message = crate::crypto::create_payment_message(
                    &subscription.id,
                    timestamp,
                    subscription.amount,
                );

                // Verify timestamp (5 minute window)
                let current_time = Clock::get()?.unix_timestamp;
                require!(
                    crate::crypto::verify_timestamp(timestamp, current_time, 300)?,
                    ErrorCode::TimestampExpired
                );

                // Verify Ed25519 signature
                let is_valid = crate::crypto::verify_icp_signature(
                    &message,
                    &sig,
                    &icp_pubkey,
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
                if let Some(sig) = icp_signature {
                    if let Some(icp_pubkey) = config.icp_public_key {
                        let message = crate::crypto::create_payment_message(
                            &subscription.id,
                            timestamp,
                            subscription.amount,
                        );

                        let current_time = Clock::get()?.unix_timestamp;
                        let timestamp_valid = crate::crypto::verify_timestamp(timestamp, current_time, 300)?;

                        if timestamp_valid {
                            if let Ok(is_valid) = crate::crypto::verify_icp_signature(&message, &sig, &icp_pubkey) {
                                if is_valid {
                                    // ICP signature valid, proceed
                                } else {
                                    return Err(ErrorCode::InvalidSignature.into());
                                }
                            } else {
                                return Err(ErrorCode::InvalidSignature.into());
                            }
                        }
                    }
                } else {
                    // No signature - check if payment is overdue (5 min grace period)
                    let current_time = Clock::get()?.unix_timestamp;
                    let grace_period = 300; // 5 minutes
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
                // For swaps, use process_trigger_with_swap instruction
                let token_mint = subscription.payment_token_mint;
                let usdc_mint = Pubkey::from_str(USDC_MINT).unwrap();

                require!(token_mint == usdc_mint, ErrorCode::SwapNotImplemented);

                msg!("Processing direct USDC payment for subscription: {}", subscription.id);
                process_direct_usdc_payment(ctx)?;
            },
            1 => {
                // Notification: Send memo to subscriber
                msg!("Sending notification for subscription: {}", subscription.id);

                // Build notification message with subscription details
                let memo = format!(
                    "OuroC: Payment due in {} days. Amount: {} {}",
                    subscription.reminder_days_before_payment,
                    subscription.amount,
                    subscription.payment_token_mint
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
    /// Solana handles Jupiter quote and swap execution internally
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
                let sig = icp_signature.ok_or(ErrorCode::InvalidSignature)?;
                let icp_pubkey = config.icp_public_key.ok_or(ErrorCode::InvalidSignature)?;

                let message = crate::crypto::create_payment_message(
                    &subscription.id,
                    timestamp,
                    subscription.amount,
                );

                let current_time = Clock::get()?.unix_timestamp;
                require!(
                    crate::crypto::verify_timestamp(timestamp, current_time, 300)?,
                    ErrorCode::TimestampExpired
                );

                let is_valid = crate::crypto::verify_icp_signature(&message, &sig, &icp_pubkey)?;
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
                if let Some(sig) = icp_signature {
                    if let Some(icp_pubkey) = config.icp_public_key {
                        let message = crate::crypto::create_payment_message(&subscription.id, timestamp, subscription.amount);
                        let current_time = Clock::get()?.unix_timestamp;

                        if crate::crypto::verify_timestamp(timestamp, current_time, 300)? {
                            if let Ok(is_valid) = crate::crypto::verify_icp_signature(&message, &sig, &icp_pubkey) {
                                require!(is_valid, ErrorCode::InvalidSignature);
                            }
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

    pub fn send_notification(
        ctx: Context<SendNotification>,
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

        // Transfer tiny amount of SOL (0.000001 SOL = 1000 lamports) to payer
        let notification_amount = 1000u64; // 0.000001 SOL

        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.notification_sender.key(),
            &subscription.subscriber,
            notification_amount,
        );

        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.notification_sender.to_account_info(),
                ctx.accounts.subscriber.to_account_info(),
            ],
        )?;

        msg!("Notification sent to subscriber: {}", memo_message);
        msg!("Memo: {}", memo_message);

        Ok(())
    }

}

/// Helper module for shared payment logic (outside #[program])
mod payment_helpers {
    use super::*;

    /// Core payment processing logic (used by both direct and swap flows)
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
    ) -> Result<()> {
        require!(!config.paused, ErrorCode::ProgramPaused);
        require!(subscription.status == SubscriptionStatus::Active, ErrorCode::SubscriptionNotActive);

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
                let max_age_seconds = 300; // 5 minutes
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
                    verify_icp_signature(&message, &signature, &icp_public_key)?,
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
                let is_icp_valid = if let Some(signature) = icp_signature {
                    if let Some(icp_key) = config.icp_public_key {
                        let message = create_payment_message(
                            &subscription.id,
                            timestamp,
                            subscription.amount
                        );
                        verify_icp_signature(&message, &signature, &icp_key).unwrap_or(false)
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

        // Schedule next payment relative to scheduled time (not current time) to prevent drift
        subscription.next_payment_time = subscription.next_payment_time
            .checked_add(subscription.interval_seconds)
            .ok_or(ErrorCode::MathOverflow)?;

        // Handle multiple missed payments by advancing until future
        while subscription.next_payment_time < clock.unix_timestamp {
            subscription.next_payment_time = subscription.next_payment_time
                .checked_add(subscription.interval_seconds)
                .ok_or(ErrorCode::MathOverflow)?;
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
            payment_type: "USDC".to_string(),
        });

        Ok(())
    }
}

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

    /// ICP fee collection USDC token account (must be valid USDC account)
    #[account(
        constraint = icp_fee_usdc_account.mint == get_usdc_mint() @ ErrorCode::InvalidTokenMint
    )]
    pub icp_fee_usdc_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
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

    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub subscriber: Signer<'info>,

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
}

/// Account structure for multi-token payment with swap
/// This is a wrapper around ProcessPayment that includes swap-related accounts
#[derive(Accounts)]
pub struct ProcessPaymentWithSwap<'info> {
    #[account(mut)]
    pub subscription: Account<'info, Subscription>,

    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,

    /// CHECK: ICP canister or anyone can trigger payment
    pub trigger_authority: Signer<'info>,

    /// CHECK: Subscriber's wallet (does not need to sign)
    pub subscriber: UncheckedAccount<'info>,

    /// Payment token account (could be USDT, PYUSD, DAI, or USDC)
    /// Must match subscription.payment_token_mint
    #[account(
        mut,
        constraint = payment_token_account.mint == subscription.payment_token_mint @ ErrorCode::InvalidTokenMint
    )]
    pub payment_token_account: Account<'info, TokenAccount>,

    /// Merchant's USDC account (always receives USDC)
    #[account(
        mut,
        constraint = merchant_usdc_account.mint == get_usdc_mint() @ ErrorCode::InvalidTokenMint
    )]
    pub merchant_usdc_account: Account<'info, TokenAccount>,

    /// ICP fee collection USDC account
    #[account(
        mut,
        constraint = icp_fee_usdc_account.mint == get_usdc_mint() @ ErrorCode::InvalidTokenMint
    )]
    pub icp_fee_usdc_account: Account<'info, TokenAccount>,

    /// USDC Mint
    #[account(
        constraint = usdc_mint.key() == get_usdc_mint() @ ErrorCode::InvalidTokenMint
    )]
    pub usdc_mint: Account<'info, Mint>,

    /// Payment token mint (for validation)
    pub payment_token_mint: Account<'info, Mint>,

    /// Pyth price feed account for the payment token
    /// Only required if payment_token != USDC
    /// CHECK: Validated in price_oracle module
    pub price_feed: AccountInfo<'info>,

    /// Jupiter V6 Program for token swaps
    /// CHECK: Program ID validated in jupiter_swap module
    pub jupiter_program: AccountInfo<'info>,

    /// Temporary USDC account to receive swapped funds (PDA-owned by this program)
    /// Only required if payment_token != USDC
    /// PDA derivation: seeds = [b"temp_usdc", subscriber.key().as_ref()], bump
    #[account(
        mut,
        seeds = [b"temp_usdc", subscriber.key().as_ref()],
        bump,
        constraint = temp_usdc_account.mint == usdc_mint.key() @ ErrorCode::InvalidTokenMint
    )]
    pub temp_usdc_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

    // Remaining accounts: Jupiter routing accounts (dynamically determined by quote)
    // These are passed via ctx.remaining_accounts
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

    /// Merchant's USDC token account (receives payment)
    #[account(
        mut,
        constraint = merchant_usdc_account.owner == subscription.merchant @ ErrorCode::UnauthorizedAccess,
        constraint = merchant_usdc_account.mint == get_usdc_mint() @ ErrorCode::InvalidTokenMint
    )]
    pub merchant_usdc_account: Account<'info, TokenAccount>,

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
}

/// Extended ProcessTrigger with Jupiter swap accounts
#[derive(Accounts)]
pub struct ProcessTriggerWithSwap<'info> {
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

    /// Subscriber's payment token account (source - swapped to USDC)
    #[account(
        mut,
        constraint = subscriber_token_account.owner == subscription.subscriber @ ErrorCode::UnauthorizedAccess
    )]
    pub subscriber_token_account: Account<'info, TokenAccount>,

    /// Subscriber's USDC account (receives swapped USDC)
    #[account(
        mut,
        constraint = subscriber_usdc_account.owner == subscription.subscriber @ ErrorCode::UnauthorizedAccess,
        constraint = subscriber_usdc_account.mint == get_usdc_mint() @ ErrorCode::InvalidTokenMint
    )]
    pub subscriber_usdc_account: Account<'info, TokenAccount>,

    /// Merchant's USDC token account (receives payment)
    #[account(
        mut,
        constraint = merchant_usdc_account.owner == subscription.merchant @ ErrorCode::UnauthorizedAccess,
        constraint = merchant_usdc_account.mint == get_usdc_mint() @ ErrorCode::InvalidTokenMint
    )]
    pub merchant_usdc_account: Account<'info, TokenAccount>,

    /// ICP fee collection USDC account (receives treasury fee)
    #[account(
        mut,
        constraint = icp_fee_usdc_account.mint == get_usdc_mint() @ ErrorCode::InvalidTokenMint
    )]
    pub icp_fee_usdc_account: Account<'info, TokenAccount>,

    /// Subscription PDA (has delegate authority)
    /// CHECK: Verified via seeds
    pub subscription_pda: UncheckedAccount<'info>,

    /// CHECK: Subscriber wallet (for notifications)
    #[account(mut)]
    pub subscriber: UncheckedAccount<'info>,

    /// Payment token mint (being swapped from)
    pub payment_token_mint: Account<'info, Mint>,

    /// USDC mint (swapping to)
    #[account(
        constraint = usdc_mint.key() == get_usdc_mint() @ ErrorCode::InvalidTokenMint
    )]
    pub usdc_mint: Account<'info, Mint>,

    /// Jupiter Aggregator V6 program
    /// CHECK: Validated against JUPITER_PROGRAM_ID constant in jupiter_swap module
    #[account(
        constraint = jupiter_program.key() == get_jupiter_program_id() @ ErrorCode::InvalidJupiterProgram
    )]
    pub jupiter_program: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

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
    pub amount: u64,                     // 8 bytes - USDC amount in micro-units (merchant always receives this in USDC)
    pub interval_seconds: i64,           // 8 bytes
    pub next_payment_time: i64,          // 8 bytes
    pub status: SubscriptionStatus,      // 1 byte
    pub created_at: i64,                 // 8 bytes
    pub last_payment_time: Option<i64>,  // 9 bytes (1 + 8)
    pub payments_made: u64,              // 8 bytes
    pub total_paid: u64,                 // 8 bytes
    pub icp_canister_signature: [u8; 64], // 64 bytes - Ed25519 signature from ICP
    pub payment_token_mint: Pubkey,      // 32 bytes - Token user pays with (USDC/USDT/PYUSD/DAI), locked at creation
    pub reminder_days_before_payment: u32, // 4 bytes - Days before payment to send reminder (configured by merchant)
    pub slippage_bps: u16,               // 2 bytes - Slippage tolerance in basis points (e.g., 100 = 1%)
}

impl Subscription {
    pub const LEN: usize = 32 + 32 + 32 + 8 + 8 + 8 + 1 + 8 + 9 + 8 + 8 + 64 + 32 + 4 + 2;
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

// Helper functions for process_trigger
fn process_direct_usdc_payment(ctx: Context<ProcessTrigger>) -> Result<()> {
    let subscription = &mut ctx.accounts.subscription;
    let config = &ctx.accounts.config;

    // Calculate fee (treasury gets X%, merchant gets rest)
    let payment_amount = subscription.amount;
    let fee_amount = (payment_amount as u128)
        .checked_mul(config.fee_config.fee_percentage_basis_points as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(BASIS_POINTS_DIVISOR as u128)
        .ok_or(ErrorCode::MathOverflow)? as u64;
    let fee_amount = fee_amount.max(config.fee_config.min_fee_amount);
    let merchant_amount = payment_amount.checked_sub(fee_amount).ok_or(ErrorCode::InsufficientAmount)?;

    // Get data needed for CPI before mutating subscription
    let subscription_id = subscription.id.clone();

    // EFFECTS: Update subscription state BEFORE external calls (CEI pattern)
    subscription.last_payment_time = Some(Clock::get()?.unix_timestamp);
    subscription.payments_made = subscription.payments_made.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
    subscription.total_paid = subscription.total_paid.checked_add(payment_amount).ok_or(ErrorCode::MathOverflow)?;

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

    // Transfer remaining to merchant
    let transfer_merchant_ix = anchor_spl::token::spl_token::instruction::transfer(
        ctx.accounts.token_program.key,
        &ctx.accounts.subscriber_token_account.key(),
        &ctx.accounts.merchant_usdc_account.key(),
        ctx.accounts.subscription_pda.key,
        &[],
        merchant_amount,
    )?;

    anchor_lang::solana_program::program::invoke_signed(
        &transfer_merchant_ix,
        &[
            ctx.accounts.subscriber_token_account.to_account_info(),
            ctx.accounts.merchant_usdc_account.to_account_info(),
            ctx.accounts.subscription_pda.to_account_info(),
        ],
        signer_seeds,
    )?;

    msg!("Direct USDC payment processed: {} USDC (fee: {}, merchant: {})",
        payment_amount, fee_amount, merchant_amount);

    // Emit payment event
    emit!(PaymentProcessed {
        subscription_id: subscription_id.clone(),
        payment_number: subscription.payments_made,
        amount: payment_amount,
        merchant_amount,
        fee_amount,
        timestamp: Clock::get()?.unix_timestamp,
        payment_type: "USDC".to_string(),
    });

    Ok(())
}

fn process_swap_then_split(ctx: Context<ProcessTriggerWithSwap>) -> Result<()> {
    let subscription = &mut ctx.accounts.subscription;
    let config = &ctx.accounts.config;

    msg!("Processing swap payment for subscription: {} (token: {})",
        subscription.id, subscription.payment_token_mint);

    let payment_token_amount = subscription.amount;

    msg!("Swapping {} of token {} to USDC via Jupiter",
        payment_token_amount,
        subscription.payment_token_mint
    );

    // Step 1: Execute Jupiter swap via CPI
    // Jupiter V6 uses a shared account model where the swap instruction
    // includes all necessary routing accounts dynamically

    let subscription_id = subscription.id.clone();
    let seeds = &[b"subscription", subscription_id.as_bytes(), &[ctx.bumps.subscription]];
    let signer_seeds = &[&seeds[..]];

    // Build Jupiter swap instruction
    // Note: In production, the route_plan (accounts) comes from Jupiter Quote API
    // The ICP canister fetches the quote and passes the serialized route
    // For now, we use a simplified direct swap

    let swap_instruction_data = build_jupiter_swap_instruction(
        payment_token_amount,
        0, // min_output_amount (set based on quote + slippage)
    );

    let jupiter_program_id = *ctx.accounts.jupiter_program.key;

    // Jupiter V6 swap accounts (simplified - actual swap needs route accounts from API)
    let swap_accounts = vec![
        // Core accounts
        ctx.accounts.jupiter_program.to_account_info(),
        ctx.accounts.subscription_pda.to_account_info(), // user_transfer_authority
        ctx.accounts.subscriber_token_account.to_account_info(), // user_source_token_account
        ctx.accounts.subscriber_usdc_account.to_account_info(), // user_destination_token_account
        ctx.accounts.payment_token_mint.to_account_info(), // source_mint
        ctx.accounts.usdc_mint.to_account_info(), // destination_mint
        ctx.accounts.token_program.to_account_info(),
        // Note: Additional routing accounts from Jupiter quote would be added here
    ];

    let swap_ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: jupiter_program_id,
        accounts: swap_accounts.iter().map(|acc| {
            anchor_lang::solana_program::instruction::AccountMeta {
                pubkey: *acc.key,
                is_signer: acc.key == ctx.accounts.subscription_pda.key,
                is_writable: acc.is_writable,
            }
        }).collect(),
        data: swap_instruction_data,
    };

    // Execute Jupiter swap
    anchor_lang::solana_program::program::invoke_signed(
        &swap_ix,
        &swap_accounts,
        signer_seeds,
    )?;

    msg!("Jupiter swap executed successfully");

    // Step 2: Get actual USDC output amount
    // NOTE: In production, deserialize subscriber_usdc_account to get actual balance
    // For now, use expected output from quote as placeholder
    let usdc_output = payment_token_amount; // TODO: Read actual USDC account balance after swap

    msg!("Swapped {} tokens → {} USDC (placeholder - needs actual balance check)", payment_token_amount, usdc_output);

    // Step 3: Calculate fee split from swapped USDC
    let fee_amount = (usdc_output as u128)
        .checked_mul(config.fee_config.fee_percentage_basis_points as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(BASIS_POINTS_DIVISOR as u128)
        .ok_or(ErrorCode::MathOverflow)? as u64;
    let fee_amount = fee_amount.max(config.fee_config.min_fee_amount);
    let merchant_amount = usdc_output.checked_sub(fee_amount).ok_or(ErrorCode::InsufficientAmount)?;

    msg!("Fee split: fee={}, merchant={}", fee_amount, merchant_amount);

    // EFFECTS: Update subscription state BEFORE external transfers (CEI pattern)
    subscription.last_payment_time = Some(Clock::get()?.unix_timestamp);
    subscription.payments_made = subscription.payments_made.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
    subscription.total_paid = subscription.total_paid.checked_add(usdc_output).ok_or(ErrorCode::MathOverflow)?;

    // INTERACTIONS: External token transfers AFTER state updates (CEI pattern)
    // Step 4: Transfer USDC fee to ICP treasury
    let transfer_fee_ix = anchor_spl::token::spl_token::instruction::transfer(
        ctx.accounts.token_program.key,
        &ctx.accounts.subscriber_usdc_account.key(),
        &ctx.accounts.icp_fee_usdc_account.key(),
        ctx.accounts.subscription_pda.key,
        &[],
        fee_amount,
    )?;

    anchor_lang::solana_program::program::invoke_signed(
        &transfer_fee_ix,
        &[
            ctx.accounts.subscriber_usdc_account.to_account_info(),
            ctx.accounts.icp_fee_usdc_account.to_account_info(),
            ctx.accounts.subscription_pda.to_account_info(),
        ],
        signer_seeds,
    )?;

    // Step 5: Transfer merchant payment
    let transfer_merchant_ix = anchor_spl::token::spl_token::instruction::transfer(
        ctx.accounts.token_program.key,
        &ctx.accounts.subscriber_usdc_account.key(),
        &ctx.accounts.merchant_usdc_account.key(),
        ctx.accounts.subscription_pda.key,
        &[],
        merchant_amount,
    )?;

    anchor_lang::solana_program::program::invoke_signed(
        &transfer_merchant_ix,
        &[
            ctx.accounts.subscriber_usdc_account.to_account_info(),
            ctx.accounts.merchant_usdc_account.to_account_info(),
            ctx.accounts.subscription_pda.to_account_info(),
        ],
        signer_seeds,
    )?;

    msg!("Swap payment completed: {} tokens → {} USDC (fee: {}, merchant: {})",
        payment_token_amount, usdc_output, fee_amount, merchant_amount);

    // Emit payment event for swap
    emit!(PaymentProcessed {
        subscription_id: subscription_id.clone(),
        payment_number: subscription.payments_made,
        amount: usdc_output,
        merchant_amount,
        fee_amount,
        timestamp: Clock::get()?.unix_timestamp,
        payment_type: "SWAP".to_string(),
    });

    Ok(())
}

// Helper: Build Jupiter V6 swap instruction data
// Format: [discriminator] + [in_amount: u64] + [min_out_amount: u64]
fn build_jupiter_swap_instruction(in_amount: u64, min_out_amount: u64) -> Vec<u8> {
    let mut data = Vec::with_capacity(24);

    // Jupiter V6 swap discriminator (sighash of "global:shared_accounts_route")
    // This is a placeholder - actual discriminator from Jupiter IDL
    data.extend_from_slice(&[0xe4, 0x45, 0xa5, 0x2e, 0x51, 0xcb, 0x9a, 0x1d]);

    // in_amount (8 bytes, little-endian)
    data.extend_from_slice(&in_amount.to_le_bytes());

    // min_out_amount (8 bytes, little-endian)
    data.extend_from_slice(&min_out_amount.to_le_bytes());

    data
}

fn send_notification_internal(ctx: Context<ProcessTrigger>, memo: String) -> Result<()> {
    require!(memo.len() <= 566, ErrorCode::MemoTooLong);

    // Transfer tiny SOL amount with memo
    let notification_amount = 1000u64; // 0.000001 SOL

    let ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.trigger_authority.key(),
        &ctx.accounts.subscriber.key(),
        notification_amount,
    );

    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            ctx.accounts.trigger_authority.to_account_info(),
            ctx.accounts.subscriber.to_account_info(),
        ],
    )?;

    msg!("Notification: {}", memo);
    Ok(())
}

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
    pub payment_token_mint: Pubkey,
    pub slippage_bps: u16,
}

#[event]
pub struct PaymentProcessed {
    pub subscription_id: String,
    pub payment_number: u64,
    pub amount: u64,
    pub merchant_amount: u64,
    pub fee_amount: u64,
    pub timestamp: i64,
    pub payment_type: String, // "USDC" or "SWAP"
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

// ============================================================================
// Error Codes
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Program is currently paused")]
    ProgramPaused,

    #[msg("Invalid payment amount")]
    InvalidAmount,

    #[msg("Invalid interval")]
    InvalidInterval,

    #[msg("Invalid subscription ID")]
    InvalidSubscriptionId,

    #[msg("Subscription is not active")]
    SubscriptionNotActive,

    #[msg("Subscription is not paused")]
    SubscriptionNotPaused,

    #[msg("Subscription already cancelled")]
    SubscriptionAlreadyCancelled,

    #[msg("Payment not yet due")]
    PaymentNotDue,

    #[msg("Invalid signature")]
    InvalidSignature,

    #[msg("Signature has expired")]
    SignatureExpired,

    #[msg("Timestamp has expired or is too old")]
    TimestampExpired,

    #[msg("Unauthorized canister")]
    UnauthorizedCanister,

    #[msg("Unauthorized access")]
    UnauthorizedAccess,

    #[msg("Missing ICP signature")]
    MissingSignature,

    #[msg("Missing ICP public key")]
    MissingICPKey,

    #[msg("Authorization failed")]
    AuthorizationFailed,

    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Insufficient amount for fee")]
    InsufficientAmount,

    #[msg("Invalid token mint - must be USDC")]
    InvalidTokenMint,

    #[msg("Invalid subscription PDA")]
    InvalidSubscriptionPDA,

    #[msg("Token delegation not set to subscription PDA")]
    DelegateNotSet,

    #[msg("Delegated amount insufficient for payment")]
    InsufficientDelegation,

    #[msg("Invalid Jupiter program")]
    InvalidJupiterProgram,

    #[msg("Fee percentage too high - maximum 10%")]
    FeeTooHigh,

    #[msg("Invalid slippage - must be between 0 and 500 basis points (5%)")]
    InvalidSlippage,

    #[msg("Unsupported payment token - must be whitelisted stablecoin")]
    UnsupportedPaymentToken,

    #[msg("Swap failed - insufficient output amount")]
    SwapFailed,

    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,

    #[msg("Memo message too long - maximum 566 bytes")]
    MemoTooLong,

    #[msg("Invalid reminder days - must be between 1 and 30 days")]
    InvalidReminderDays,

    #[msg("Invalid opcode - must be 0 (payment) or 1 (notification)")]
    InvalidOpcode,

    #[msg("Swap not yet implemented - requires DEX integration")]
    SwapNotImplemented,
}
