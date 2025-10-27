/**
 * OuroC Community Tier - Utility Functions
 *
 * Helper functions for subscription ID generation, interval conversion, etc.
 */

import { sha256 } from '@noble/hashes/sha256'
import { COMMUNITY_TIER_LIMITS } from './constants'

// ============================================================================
// Subscription ID Generation
// ============================================================================

/**
 * Generate a unique, deterministic subscription ID
 *
 * Uses SHA-256 hash of: merchant + subscriber + amount + interval
 * This ensures:
 * - Same subscription parameters = same ID (deterministic)
 * - Different plans from same merchant = different IDs
 * - Collision-resistant (16 hex characters = 64 bits)
 *
 * @param merchantAddress - Merchant's Solana wallet address
 * @param subscriberAddress - Subscriber's Solana wallet address
 * @param amountMicroUnits - Payment amount in micro-units (e.g., 10_000_000 for 10 USDC)
 * @param intervalSeconds - Payment interval in seconds
 * @returns Subscription ID in format "sub_XXXXXXXXXXXXXXXX" (20 chars total)
 *
 * @example
 * generateSubscriptionId(
 *   "MerchantPubkey...",
 *   "UserPubkey...",
 *   10_000_000,
 *   2_592_000
 * ) // => "sub_a1b2c3d4e5f6g7h8"
 */
export function generateSubscriptionId(
  merchantAddress: string,
  subscriberAddress: string,
  amountMicroUnits: number,
  intervalSeconds: number
): string {
  // Create deterministic input string
  const data = `${merchantAddress}:${subscriberAddress}:${amountMicroUnits}:${intervalSeconds}`

  // Hash with SHA-256
  const hashBytes = sha256(new TextEncoder().encode(data))

  // Convert to hex and take first 16 characters
  const hash = Array.from(hashBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, COMMUNITY_TIER_LIMITS.subscription_id_length)

  return `sub_${hash}`
}

// ============================================================================
// Interval Conversion
// ============================================================================

/**
 * Convert human-readable interval to seconds
 *
 * @param interval - Human-readable interval
 * @returns Interval in seconds
 *
 * @example
 * intervalToSeconds('monthly') // => 2592000 (30 days)
 */
export function intervalToSeconds(
  interval: 'daily' | 'weekly' | 'monthly' | 'yearly'
): number {
  switch (interval) {
    case 'daily':
      return 86400 // 24 hours
    case 'weekly':
      return 604800 // 7 days
    case 'monthly':
      return 2592000 // 30 days
    case 'yearly':
      return 31536000 // 365 days
    default:
      throw new Error(`Invalid interval: ${interval}`)
  }
}

/**
 * Convert seconds to human-readable interval (best approximation)
 *
 * @param seconds - Interval in seconds
 * @returns Human-readable interval
 *
 * @example
 * secondsToInterval(2592000) // => 'monthly'
 */
export function secondsToInterval(
  seconds: number
): 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' {
  if (seconds === 86400) return 'daily'
  if (seconds === 604800) return 'weekly'
  if (seconds === 2592000) return 'monthly'
  if (seconds === 31536000) return 'yearly'
  return 'custom'
}

// ============================================================================
// Amount Conversion
// ============================================================================

/**
 * Convert USDC amount to micro-units (6 decimals)
 *
 * @param amount - Amount in USDC (e.g., 10 for 10 USDC)
 * @returns Amount in micro-units (e.g., 10_000_000)
 * @throws Error if amount is invalid or out of safe range
 *
 * @example
 * toMicroUnits(10) // => 10_000_000
 * toMicroUnits(0.5) // => 500_000
 */
export function toMicroUnits(amount: number): number {
  // Validate input
  if (!Number.isFinite(amount) || isNaN(amount)) {
    throw new Error('Amount must be a valid number')
  }

  if (amount < 0) {
    throw new Error('Amount cannot be negative')
  }

  if (amount < COMMUNITY_TIER_LIMITS.min_amount_usdc) {
    throw new Error(
      `Amount must be at least ${COMMUNITY_TIER_LIMITS.min_amount_usdc} USDC`
    )
  }

  if (amount > COMMUNITY_TIER_LIMITS.max_amount_usdc) {
    throw new Error(
      `Amount exceeds maximum ${COMMUNITY_TIER_LIMITS.max_amount_usdc} USDC`
    )
  }

  return Math.floor(amount * 1_000_000)
}

/**
 * Convert micro-units to USDC amount (6 decimals)
 *
 * @param microUnits - Amount in micro-units (e.g., 10_000_000)
 * @returns Amount in USDC (e.g., 10.0)
 *
 * @example
 * fromMicroUnits(10_000_000) // => 10.0
 * fromMicroUnits(500_000) // => 0.5
 */
export function fromMicroUnits(microUnits: number | bigint): number {
  return Number(microUnits) / 1_000_000
}

/**
 * Format USDC amount with proper decimals
 *
 * @param microUnits - Amount in micro-units
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "10.00 USDC")
 *
 * @example
 * formatUSDC(10_000_000) // => "10.00 USDC"
 * formatUSDC(10_500_000, 6) // => "10.500000 USDC"
 */
export function formatUSDC(
  microUnits: number | bigint,
  decimals: number = 2
): string {
  const amount = fromMicroUnits(microUnits)
  return `${amount.toFixed(decimals)} USDC`
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate interval is within allowed range
 *
 * @param seconds - Interval in seconds
 * @throws Error if interval is invalid
 */
export function validateInterval(seconds: number): void {
  if (seconds < COMMUNITY_TIER_LIMITS.min_interval_seconds) {
    throw new Error(
      `Interval must be at least ${COMMUNITY_TIER_LIMITS.min_interval_seconds} seconds (1 hour)`
    )
  }

  if (seconds > COMMUNITY_TIER_LIMITS.max_interval_seconds) {
    throw new Error(
      `Interval cannot exceed ${COMMUNITY_TIER_LIMITS.max_interval_seconds} seconds (1 year)`
    )
  }
}

/**
 * Get hardcoded reminder days for Community tier
 *
 * Community tier always uses 1 day (24 hours) notification timing.
 * This is non-configurable and always enabled.
 *
 * @returns Always returns 1 (24 hours before payment)
 */
export function getCommunityReminderDays(): number {
  // Import from constants to ensure consistency
  const { COMMUNITY_NOTIFICATION_CONFIG } = require('./constants')
  return COMMUNITY_NOTIFICATION_CONFIG.reminder_days_before_payment
}

/**
 * Validate Solana address format
 *
 * @param address - Solana address to validate
 * @throws Error if address is invalid
 */
export function validateSolanaAddress(address: string): void {
  // Basic validation: should be base58 string, 32-44 characters
  if (!address || typeof address !== 'string') {
    throw new Error('Address must be a string')
  }

  if (address.length < 32 || address.length > 44) {
    throw new Error('Invalid Solana address length')
  }

  // Check for valid base58 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/
  if (!base58Regex.test(address)) {
    throw new Error('Invalid Solana address format')
  }
}

// ============================================================================
// Time Utilities
// ============================================================================

/**
 * Calculate next payment time
 *
 * @param intervalSeconds - Payment interval in seconds
 * @param startTime - Optional start time (default: now)
 * @returns Next payment timestamp in seconds
 */
export function calculateNextPayment(
  intervalSeconds: number,
  startTime?: number
): number {
  const now = startTime || Math.floor(Date.now() / 1000)
  return now + intervalSeconds
}

/**
 * Format timestamp to human-readable date
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted date string
 *
 * @example
 * formatTimestamp(1704067200) // => "2024-01-01 00:00:00"
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleString()
}

/**
 * Calculate days until payment
 *
 * @param nextPaymentTime - Next payment timestamp in seconds
 * @returns Days until payment (rounded down)
 */
export function daysUntilPayment(nextPaymentTime: number): number {
  const now = Math.floor(Date.now() / 1000)
  const secondsUntil = nextPaymentTime - now
  return Math.floor(secondsUntil / 86400)
}
