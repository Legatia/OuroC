/**
 * Utility functions for OuroC SDK
 * Provides helper functions for subscription management
 */

import { SupportedToken } from '../core/types'

/**
 * Convert interval string to seconds
 * @param interval - Human-readable interval ('daily', 'weekly', 'monthly', 'yearly')
 * @param customInterval - Custom interval in seconds (overrides default)
 * @returns Number of seconds
 */
export function getIntervalSeconds(interval: string, customInterval?: number): number {
  if (customInterval) return customInterval

  switch (interval.toLowerCase()) {
    case 'daily':
      return 24 * 60 * 60 // 1 day
    case 'weekly':
      return 7 * 24 * 60 * 60 // 7 days
    case 'monthly':
      return 30 * 24 * 60 * 60 // 30 days
    case 'yearly':
      return 365 * 24 * 60 * 60 // 365 days
    default:
      return 30 * 24 * 60 * 60 // Default to monthly
  }
}

/**
 * Generate unique subscription ID
 * @param prefix - Optional prefix for the ID
 * @returns Unique subscription ID string
 */
export function generateSubscriptionId(prefix?: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  const cleanPrefix = prefix ? prefix.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() : 'sub'
  return `${cleanPrefix}_${timestamp}_${random}`
}

/**
 * Convert token amount to micro-units (6 decimals for stablecoins)
 * @param amount - Amount in tokens (e.g., 10 for 10 USDC)
 * @returns Amount in micro-units (e.g., 10_000_000)
 * @throws Error if amount is invalid or out of safe range
 */
export function toMicroUnits(amount: number): bigint {
  // Validate input
  if (!Number.isFinite(amount) || isNaN(amount)) {
    throw new Error('Amount must be a valid number')
  }

  if (amount < 0) {
    throw new Error('Amount cannot be negative')
  }

  // Check for overflow - max safe integer divided by 1M to prevent overflow
  const MAX_SAFE_AMOUNT = Number.MAX_SAFE_INTEGER / 1_000_000
  if (amount > MAX_SAFE_AMOUNT) {
    throw new Error(`Amount exceeds maximum safe value (${MAX_SAFE_AMOUNT.toFixed(2)} tokens)`)
  }

  return BigInt(Math.floor(amount * 1_000_000))
}

/**
 * Convert micro-units to token amount (6 decimals for stablecoins)
 * @param microUnits - Amount in micro-units (e.g., 10_000_000)
 * @returns Amount in tokens (e.g., 10.0)
 */
export function fromMicroUnits(microUnits: bigint): number {
  return Number(microUnits) / 1_000_000
}

/**
 * Format token amount with decimals
 * @param microUnits - Amount in micro-units
 * @param token - Token symbol
 * @returns Formatted string (e.g., "10.000000 USDC")
 */
export function formatTokenAmount(microUnits: bigint, token: string): string {
  const amount = fromMicroUnits(microUnits)
  return `${amount.toFixed(6)} ${token}`
}

/**
 * Get token mint address based on network
 * @param token - Token type
 * @param network - Network ('mainnet' | 'devnet')
 * @returns Token mint address or null if not available
 */
export function getTokenMint(token: SupportedToken, network: 'mainnet' | 'devnet'): string | null {
  const TOKEN_MINTS = {
    USDC: {
      mainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
    },
    USDT: {
      mainnet: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      devnet: null // Not available on devnet
    },
    PYUSD: {
      mainnet: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
      devnet: null // Not available on devnet
    },
    DAI: {
      mainnet: 'EjmyN6qEC1Tf1JxiG1ae7UTJhUxSwk1TCWNWqxWV4J6o',
      devnet: null // Not available on devnet
    }
  }

  return TOKEN_MINTS[token]?.[network] || null
}

/**
 * Check if token is available on devnet
 * @param token - Token type to check
 * @returns Boolean indicating availability
 */
export function isTokenAvailableOnDevnet(token: SupportedToken): boolean {
  return getTokenMint(token, 'devnet') !== null
}

/**
 * Get Solana RPC endpoint for network
 * @param network - Network configuration
 * @returns Solana RPC endpoint URL
 */
export function getSolanaEndpoint(network: 'mainnet' | 'testnet' | 'devnet' | 'local'): string {
  switch (network) {
    case 'mainnet':
      return 'https://api.mainnet-beta.solana.com'
    case 'testnet':
      return 'https://api.testnet.solana.com'
    case 'devnet':
      return 'https://api.devnet.solana.com'
    case 'local':
      return 'http://localhost:8899'
    default:
      return 'https://api.mainnet-beta.solana.com'
  }
}

/**
 * Get ICP host URL for network
 * @param network - Network configuration
 * @returns ICP host URL
 */
export function getICPHost(network: 'mainnet' | 'testnet' | 'devnet' | 'local'): string {
  switch (network) {
    case 'local':
      return 'http://localhost:4944'
    default:
      return 'https://ic0.app'
  }
}

/**
 * Get default community canister ID for network
 * @param network - Network configuration
 * @returns Community canister ID
 */
export function getCommunityCanisterId(network: 'mainnet' | 'devnet'): string {
  switch (network) {
    case 'mainnet':
      return 'placeholder-mainnet-timer-canister' // TODO: Replace with actual mainnet timer canister
    case 'devnet':
      return '7tbxr-naaaa-aaaao-qkrca-cai' // Devnet timer canister
    default:
      return '7tbxr-naaaa-aaaao-qkrca-cai' // Default to devnet
  }
}

/**
 * Get license registry canister ID
 * @returns License registry canister ID
 */
export function getLicenseRegistryCanisterId(): string {
  return 'gbuo5-iyaaa-aaaao-qkuba-cai' // License registry canister
}

/**
 * Get default API key for community tier
 * @returns Community API key
 */
export function getCommunityApiKey(): string {
  return 'ouro_community_shared_2025_demo_key'
}

/**
 * Validate Solana address format
 * @param address - Solana address to validate
 * @returns True if address format is valid
 */
export function isValidSolanaAddress(address: string): boolean {
  // Basic validation - Solana addresses are 44 characters with specific base58 format
  if (!address || typeof address !== 'string') return false

  // Remove any whitespace
  const cleanAddress = address.trim()

  // Check length (Solana addresses are typically 44 characters)
  if (cleanAddress.length < 32 || cleanAddress.length > 44) return false

  // Basic character validation (base58 characters)
  const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  return cleanAddress.split('').every(char => base58Chars.includes(char))
}

/**
 * Get subscription configuration from plan definition
 * @param plan - Plan configuration
 * @param network - Network configuration
 * @returns Formatted subscription request
 */
export function createSubscriptionRequest(
  plan: {
    name: string
    price: number
    token: SupportedToken
    interval: string
    features: string[]
    customInterval?: number
  },
  config: {
    solanaContractAddress: string
    merchantAddress: string
    network: 'mainnet' | 'devnet'
    reminderDays?: number
  }
): {
  subscription_id: string
  solana_contract_address: string
  subscriber_address: string // Will be filled by wallet
  merchant_address: string
  payment_token_mint: string
  amount: bigint
  reminder_days_before_payment: number
  interval_seconds: bigint
  api_key: string
} {
  return {
    subscription_id: generateSubscriptionId(plan.name),
    solana_contract_address: config.solanaContractAddress,
    subscriber_address: '', // Will be filled by wallet
    merchant_address: config.merchantAddress,
    payment_token_mint: getTokenMint(plan.token, config.network) || '',
    amount: toMicroUnits(plan.price),
    reminder_days_before_payment: config.reminderDays || 3,
    interval_seconds: BigInt(getIntervalSeconds(plan.interval, plan.customInterval)),
    api_key: getCommunityApiKey()
  }
}