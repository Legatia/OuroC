/**
 * OuroC Community Tier - Hardcoded Constants
 *
 * All infrastructure addresses are pre-configured for simplicity.
 * Merchants only need to specify network ('mainnet' | 'devnet').
 */

// ============================================================================
// ICP Canister IDs
// ============================================================================

export const OUROC_CANISTER_IDS = {
  mainnet: '7tbxr-naaaa-aaaao-qkrca-cai', // OuroC_timer on IC mainnet
  devnet: '7tbxr-naaaa-aaaao-qkrca-cai',  // Same for devnet (ICP doesn't have separate devnet)
} as const

export const ICP_HOSTS = {
  mainnet: 'https://ic0.app',
  devnet: 'https://ic0.app',
} as const

// ============================================================================
// Solana Program IDs
// ============================================================================

export const SOLANA_PROGRAM_IDS = {
  mainnet: '7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub', // Deployed program
  devnet: '7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub',  // Same program ID for devnet
} as const

// ============================================================================
// Fee Collection (Platform Treasury)
// ============================================================================

// Fee collection USDC account (same for both networks)
export const ICP_FEE_COLLECTION_ADDRESS = 'CKEY8bppifSErEfP5cvX8hCnmQ2Yo911mosdRx7M3HxF' as const

// Community tier fee configuration (hardcoded, non-configurable)
export const COMMUNITY_TIER_FEE = {
  percentage: 2,           // 2% fee
  basis_points: 200,       // 200 basis points
  description: 'Community tier transaction fee (hardcoded)',
  merchant_receives: 98,   // Merchant gets 98%
  platform_receives: 2,    // Platform gets 2%
} as const

// ============================================================================
// USDC Token Mint Addresses
// ============================================================================

export const USDC_MINTS = {
  mainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Official USDC mainnet
  devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',  // USDC devnet
} as const

// ============================================================================
// Solana RPC Endpoints
// ============================================================================

export const SOLANA_RPC_ENDPOINTS = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
} as const

// ============================================================================
// Community Tier Constraints
// ============================================================================

export const COMMUNITY_TIER_LIMITS = {
  // Payment constraints
  min_amount_usdc: 0.001,          // 0.001 USDC minimum
  max_amount_usdc: 1_000_000,      // 1M USDC maximum per payment

  // Interval constraints
  min_interval_seconds: 3600,      // 1 hour minimum
  max_interval_seconds: 31536000,  // 1 year maximum

  // Subscription ID constraints
  subscription_id_length: 16,      // 16 character hash
} as const

// ============================================================================
// Community Tier Notification Settings (HARDCODED)
// ============================================================================

/**
 * Notification reminder timing for Community tier
 * HARDCODED and NON-CONFIGURABLE
 *
 * Users will ALWAYS receive notifications 24 hours (1 day) before payment
 * This cannot be changed by merchants or subscribers
 */
export const COMMUNITY_NOTIFICATION_CONFIG = {
  reminder_days_before_payment: 1,  // HARDCODED: Always 1 day (24 hours)
  enabled: true,                    // HARDCODED: Always enabled
  configurable: false,              // Cannot be changed by merchants
  description: 'Payment reminder sent 24 hours before next payment',
} as const

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get canister ID for network
 */
export function getCanisterId(network: 'mainnet' | 'devnet'): string {
  return OUROC_CANISTER_IDS[network]
}

/**
 * Get ICP host for network
 */
export function getICPHost(network: 'mainnet' | 'devnet'): string {
  return ICP_HOSTS[network]
}

/**
 * Get Solana program ID for network
 */
export function getProgramId(network: 'mainnet' | 'devnet'): string {
  return SOLANA_PROGRAM_IDS[network]
}

/**
 * Get USDC mint address for network
 */
export function getUSDCMint(network: 'mainnet' | 'devnet'): string {
  return USDC_MINTS[network]
}

/**
 * Get Solana RPC endpoint for network
 */
export function getSolanaRPC(network: 'mainnet' | 'devnet'): string {
  return SOLANA_RPC_ENDPOINTS[network]
}

/**
 * Get fee collection address (same for all networks)
 */
export function getFeeCollectionAddress(): string {
  return ICP_FEE_COLLECTION_ADDRESS
}

/**
 * Calculate merchant amount after fee
 * @param amount - Full payment amount in USDC (e.g., 10)
 * @returns Object with merchant amount and platform fee
 */
export function calculateFees(amount: number): {
  total: number
  merchantAmount: number
  platformFee: number
  merchantPercentage: number
  platformPercentage: number
} {
  const platformFee = amount * (COMMUNITY_TIER_FEE.percentage / 100)
  const merchantAmount = amount - platformFee

  return {
    total: amount,
    merchantAmount,
    platformFee,
    merchantPercentage: COMMUNITY_TIER_FEE.merchant_receives,
    platformPercentage: COMMUNITY_TIER_FEE.platform_receives,
  }
}
