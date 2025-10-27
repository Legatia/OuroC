use anchor_lang::prelude::*;

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

    #[msg("Unsupported payment token - must be USDC")]
    UnsupportedPaymentToken,

    #[msg("Memo message too long - maximum 566 bytes")]
    MemoTooLong,

    #[msg("Invalid reminder days - must be between 1 and 30 days")]
    InvalidReminderDays,

    #[msg("Invalid merchant name - must be between 1 and 32 characters")]
    InvalidMerchantName,

    #[msg("Invalid opcode - must be 0 (payment) or 1 (notification)")]
    InvalidOpcode,

    #[msg("Fee collection address not set - admin must call update_fee_destination")]
    FeeCollectionAddressNotSet,

    #[msg("Replay attack detected - timestamp already used")]
    ReplayAttack,

    #[msg("Token swap not implemented - only USDC supported")]
    SwapNotImplemented,
}