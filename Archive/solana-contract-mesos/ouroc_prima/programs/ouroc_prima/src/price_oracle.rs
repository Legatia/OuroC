use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

/// Supported stablecoins for price oracle conversion
pub const USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
pub const USDT_MINT: &str = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
pub const PYUSD_MINT: &str = "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo";

/// Pyth price feed IDs (these are the actual Pyth feed IDs for each token/USD pair)
/// Get latest from: https://pyth.network/developers/price-feed-ids
pub mod pyth_feeds {
    // USDC/USD - reference price (should always be ~1.00)
    pub const USDC_USD: &str = "Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX";

    // USDT/USD
    pub const USDT_USD: &str = "HT2PLQBcG5EiCcNSaMHAjSgd9F98ecpATbk4Sk5oYuM";

    // PYUSD/USD
    pub const PYUSD_USD: &str = "9zXQxpYH3kYhtoybmZfUNNCRVuud7fY9jswTg1hLyT8k";
}

/// Price oracle result with conversion rate
#[derive(Debug)]
pub struct PriceConversion {
    pub input_amount: u64,
    pub output_amount_min: u64,  // With slippage protection
    pub exchange_rate: i64,       // Price with 8 decimals
    pub confidence_interval: u64,
}

/// Get price conversion from input token to USDC
/// Uses Pyth oracle for real-time pricing with configurable slippage tolerance
pub fn get_price_conversion(
    input_token_mint: &Pubkey,
    input_amount: u64,
    price_update: &AccountInfo,
    slippage_bps: u16, // Slippage tolerance in basis points (e.g., 100 = 1%)
) -> Result<PriceConversion> {
    let input_mint_str = input_token_mint.to_string();

    // Get the Pyth feed ID for this token
    let feed_id_hex = match input_mint_str.as_str() {
        USDC_MINT => pyth_feeds::USDC_USD,
        USDT_MINT => pyth_feeds::USDT_USD,
        PYUSD_MINT => pyth_feeds::PYUSD_USD,
        _ => return Err(crate::price_oracle::PriceErrorCode::UnsupportedToken.into()),
    };

    // Parse Pyth price feed
    let feed_id = get_feed_id_from_hex(feed_id_hex)
        .map_err(|_| crate::price_oracle::PriceErrorCode::InvalidPriceFeed)?;

    let price_update_data = PriceUpdateV2::try_from_slice(&price_update.data.borrow())
        .map_err(|_| crate::price_oracle::PriceErrorCode::InvalidPriceUpdate)?;

    let price = price_update_data
        .get_price_no_older_than(
            &Clock::get()?,
            60, // Max 60 seconds old
            &feed_id,
        )
        .map_err(|_| crate::price_oracle::PriceErrorCode::PriceTooOld)?;

    // Pyth prices have different exponents, normalize to 8 decimals
    // Price format: price * 10^exponent
    let normalized_price = if price.exponent >= 0 {
        let multiplier = 10i64.checked_pow(price.exponent as u32)
            .ok_or(crate::price_oracle::PriceErrorCode::PriceOutOfBounds)?;
        price.price.checked_mul(multiplier)
            .ok_or(crate::price_oracle::PriceErrorCode::PriceOutOfBounds)?
    } else {
        let divisor = 10i64.checked_pow((-price.exponent) as u32)
            .ok_or(crate::price_oracle::PriceErrorCode::PriceOutOfBounds)?;
        price.price.checked_div(divisor)
            .ok_or(crate::price_oracle::PriceErrorCode::PriceOutOfBounds)?
    };

    msg!("Pyth price for {}: ${} (confidence: ±${})",
        input_mint_str,
        normalized_price,
        price.conf
    );

    // For stablecoins, price should be very close to 1.00
    // Sanity check: price should be between $0.95 and $1.05
    require!(
        normalized_price > 95_000_000 && normalized_price < 105_000_000,
        crate::price_oracle::PriceErrorCode::PriceOutOfBounds
    );

    // Calculate output amount
    // Both USDC and USDT have 6 decimals, so direct conversion
    // Apply configurable slippage protection
    let output_amount_exact = input_amount; // Stablecoins are 1:1
    let slippage_multiplier = 10000u64.checked_sub(slippage_bps as u64)
        .ok_or(crate::price_oracle::PriceErrorCode::PriceOutOfBounds)?;
    let output_amount_min = (output_amount_exact * slippage_multiplier) / 10000;

    Ok(PriceConversion {
        input_amount,
        output_amount_min,
        exchange_rate: normalized_price,
        confidence_interval: price.conf,
    })
}

/// Validate that the price is within acceptable confidence bounds
pub fn validate_price_confidence(conversion: &PriceConversion) -> Result<()> {
    // Confidence should be less than 0.5% of price
    let max_confidence = (conversion.exchange_rate.abs() as u64) / 200; // 0.5%

    require!(
        conversion.confidence_interval <= max_confidence,
        crate::price_oracle::PriceErrorCode::PriceConfidenceTooLow
    );

    Ok(())
}

// Error codes
#[error_code]
pub enum PriceErrorCode {
    #[msg("Unsupported token for price oracle")]
    UnsupportedToken,

    #[msg("Invalid Pyth price feed ID")]
    InvalidPriceFeed,

    #[msg("Invalid Pyth price update data")]
    InvalidPriceUpdate,

    #[msg("Price data is too old (>60 seconds)")]
    PriceTooOld,

    #[msg("Price is out of acceptable bounds for stablecoin")]
    PriceOutOfBounds,

    #[msg("Price confidence interval too high")]
    PriceConfidenceTooLow,
}
