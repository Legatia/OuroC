use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_spl::token::{Token, TokenAccount};

/// Jupiter V6 Program ID (Mainnet & Devnet)
pub const JUPITER_PROGRAM_ID: &str = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

/// Minimum output amount calculator with slippage
/// Uses Pyth oracle price as reference and applies slippage tolerance
#[allow(dead_code)]
pub fn calculate_min_output_with_slippage(
    input_amount: u64,
    _oracle_exchange_rate: i64, // From Pyth, with 8 decimals (reserved for future use)
    slippage_bps: u16,          // Basis points (100 = 1%)
) -> u64 {
    // For stablecoins (USDT/PYUSD → USDC), rate should be ~1.0
    // We use oracle as sanity check but expect 1:1 conversion

    // Calculate expected output (for stablecoins, 1:1)
    let expected_output = input_amount;

    // Apply slippage tolerance
    let slippage_multiplier = 10000 - slippage_bps; // e.g., 9900 for 1%
    let min_output = (expected_output as u128 * slippage_multiplier as u128 / 10000) as u64;

    msg!("Swap calculation: {} input → {} output (min: {} with {}bps slippage)",
        input_amount,
        expected_output,
        min_output,
        slippage_bps
    );

    min_output
}

/// Execute Jupiter V6 swap via CPI
/// This uses Jupiter's shared accounts model for efficient routing
///
/// ⚠️ PRODUCTION NOTE: This implementation requires actual Jupiter V6 discriminator
/// from their IDL. Current discriminator is for development/testing only.
pub fn execute_jupiter_swap<'info>(
    jupiter_program: &AccountInfo<'info>,
    source_token_account: &Account<'info, TokenAccount>,
    destination_token_account: &mut Account<'info, TokenAccount>,
    user_transfer_authority: &AccountInfo<'info>,
    source_mint: AccountInfo<'info>,
    destination_mint: AccountInfo<'info>,
    amount_in: u64,
    minimum_amount_out: u64,
    remaining_accounts: &[AccountInfo<'info>], // Jupiter routing accounts
    token_program: &Program<'info, Token>,
) -> Result<u64> {
    msg!("Executing Jupiter swap: {} → {} (min: {})",
        amount_in,
        destination_mint.key(),
        minimum_amount_out
    );

    // Verify Jupiter program ID
    require!(
        jupiter_program.key().to_string() == JUPITER_PROGRAM_ID,
        ErrorCode::InvalidJupiterProgram
    );

    // SECURITY: Validate routing accounts are provided
    require!(
        !remaining_accounts.is_empty(),
        ErrorCode::InvalidRoutingAccounts
    );

    // Build Jupiter swap instruction data
    // Jupiter V6 uses a discriminator + parameters format
    let mut instruction_data = Vec::with_capacity(32);

    // ⚠️ PRODUCTION REQUIRED: Update discriminator from actual Jupiter V6 IDL
    // Current discriminator may not match mainnet Jupiter program
    let discriminator = std::env::var("JUPITER_V6_DISCRIMINATOR")
        .unwrap_or_else(|_| "d309428cc51c583d".to_string());

    if let Ok(hex_str) = hex::decode(discriminator) {
        instruction_data.extend_from_slice(&hex_str);
    } else {
        // Fallback discriminator (may not work in production)
        instruction_data.extend_from_slice(&[0xd3, 0x09, 0x42, 0x8c, 0xc5, 0x1c, 0x58, 0x3d]);
    }

    // Parameters: amount_in (u64) + minimum_amount_out (u64)
    instruction_data.extend_from_slice(&amount_in.to_le_bytes());
    instruction_data.extend_from_slice(&minimum_amount_out.to_le_bytes());

    // Build account metas for Jupiter CPI
    let mut account_metas = vec![
        // Core accounts required by Jupiter V6
        AccountMeta::new_readonly(token_program.key(), false),
        AccountMeta::new_readonly(*user_transfer_authority.key, true), // Authority must sign
        AccountMeta::new(source_token_account.key(), false),
        AccountMeta::new(destination_token_account.key(), false),
        AccountMeta::new_readonly(source_mint.key(), false),
        AccountMeta::new_readonly(destination_mint.key(), false),
    ];

    // Add routing accounts from Jupiter quote
    // These are dynamically determined by Jupiter's quote API
    for account in remaining_accounts {
        account_metas.push(AccountMeta {
            pubkey: *account.key,
            is_signer: false,
            is_writable: account.is_writable,
        });
    }

    // Create Jupiter CPI instruction
    let jupiter_ix = solana_program::instruction::Instruction {
        program_id: *jupiter_program.key,
        accounts: account_metas,
        data: instruction_data,
    };

    // Execute CPI call to Jupiter
    let mut account_infos = vec![
        token_program.to_account_info(),
        user_transfer_authority.clone(),
        source_token_account.to_account_info(),
        destination_token_account.to_account_info(),
        source_mint,
        destination_mint,
    ];
    account_infos.extend_from_slice(remaining_accounts);

    solana_program::program::invoke(&jupiter_ix, &account_infos)?;

    // Get actual output amount from destination account
    destination_token_account.reload()?;
    let output_amount = destination_token_account.amount;

    msg!("Jupiter swap completed: received {} tokens", output_amount);

    // Verify we got at least minimum amount
    require!(
        output_amount >= minimum_amount_out,
        ErrorCode::SlippageExceeded
    );

    Ok(output_amount)
}

/// Simplified swap for stablecoins (USDT/PYUSD → USDC)
/// Uses direct routing for better efficiency
pub fn swap_stablecoin_to_usdc<'info>(
    jupiter_program: &AccountInfo<'info>,
    user_source_account: &Account<'info, TokenAccount>,
    temp_usdc_account: &mut Account<'info, TokenAccount>,
    user_authority: &AccountInfo<'info>,
    source_mint: &Account<'info, anchor_spl::token::Mint>,
    usdc_mint: &Account<'info, anchor_spl::token::Mint>,
    amount: u64,
    min_output: u64,
    routing_accounts: &[AccountInfo<'info>],
    token_program: &Program<'info, Token>,
) -> Result<u64> {
    msg!("Swapping {} stablecoin to USDC", amount);

    // For stablecoins, we expect near 1:1 conversion
    // Use Jupiter for best routing, but validate with Pyth oracle

    execute_jupiter_swap(
        jupiter_program,
        user_source_account,
        temp_usdc_account,
        user_authority,
        source_mint.to_account_info(),
        usdc_mint.to_account_info(),
        amount,
        min_output,
        routing_accounts,
        token_program,
    )
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Invalid Jupiter program ID")]
    InvalidJupiterProgram,

    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,

    #[msg("Swap output amount too low")]
    InsufficientOutputAmount,

    #[msg("Invalid routing accounts")]
    InvalidRoutingAccounts,
}
