import { PublicKey, Connection } from '@solana/web3.js'

export interface SubscriptionStatusResult {
  isActive: boolean
  isOverdue: boolean
  isPaused: boolean
  timeUntilNextPayment: number // seconds
  lastPaymentTime: number | null
  nextPaymentTime: number
  shouldShowManualTrigger: boolean
  status: 'active' | 'overdue' | 'paused' | 'cancelled'
  message: string
}

export enum AuthorizationMode {
  ICPSignature = 0,
  ManualOnly = 1,
  TimeBased = 2,
  Hybrid = 3
}

export interface SubscriptionData {
  id: string
  subscriber: PublicKey
  merchant: PublicKey
  subscriberTokenAccount: PublicKey
  merchantTokenAccount: PublicKey
  icpFeeTokenAccount: PublicKey
  amount: number
  icpFeePercentage: number
  intervalSeconds: number
  lastPaymentTime: number | null
  nextPaymentTime: number
  status: number // 0: Active, 1: Paused, 2: Cancelled
  createdAt: number
  authorizationMode: AuthorizationMode
}

/**
 * Checks the status of a subscription and determines if manual trigger is needed
 * @param subscriptionData - The subscription data from the Solana program
 * @param gracePeriodSeconds - Grace period before marking as overdue (default: 300 seconds = 5 minutes)
 * @returns Detailed subscription status information
 */
export function checkSubscriptionStatus(
  subscriptionData: SubscriptionData,
  gracePeriodSeconds: number = 300
): SubscriptionStatusResult {
  const currentTime = Math.floor(Date.now() / 1000)

  // Check subscription status from on-chain data
  const isPaused = subscriptionData.status === 1
  const isCancelled = subscriptionData.status === 2
  const isActive = subscriptionData.status === 0

  // Calculate time until next payment
  const timeUntilNextPayment = subscriptionData.nextPaymentTime - currentTime

  // Check if payment is overdue (beyond grace period)
  const isOverdue = isActive && timeUntilNextPayment < -gracePeriodSeconds

  // Determine if manual trigger button should be shown based on authorization mode
  let shouldShowManualTrigger = false

  if (isActive) {
    switch (subscriptionData.authorizationMode) {
      case AuthorizationMode.ICPSignature:
        // Never show manual trigger - ICP only
        shouldShowManualTrigger = false
        break

      case AuthorizationMode.ManualOnly:
        // Always show manual trigger for authorized users
        shouldShowManualTrigger = true
        break

      case AuthorizationMode.TimeBased:
        // Show when payment is due
        shouldShowManualTrigger = timeUntilNextPayment <= 0
        break

      case AuthorizationMode.Hybrid:
        // Show when payment is overdue (ICP failed as fallback)
        shouldShowManualTrigger = isOverdue
        break
    }
  }

  // Determine overall status
  let status: 'active' | 'overdue' | 'paused' | 'cancelled'
  let message: string

  if (isCancelled) {
    status = 'cancelled'
    message = 'Subscription has been cancelled'
  } else if (isPaused) {
    status = 'paused'
    message = 'Subscription is paused'
  } else if (isOverdue) {
    status = 'overdue'
    message = `Payment is overdue by ${formatDuration(Math.abs(timeUntilNextPayment))}`
  } else if (isActive) {
    status = 'active'
    if (timeUntilNextPayment <= 60) {
      message = 'Payment is due now'
    } else {
      message = `Next payment in ${formatDuration(timeUntilNextPayment)}`
    }
  } else {
    status = 'active'
    message = 'Unknown status'
  }

  return {
    isActive,
    isOverdue,
    isPaused,
    timeUntilNextPayment,
    lastPaymentTime: subscriptionData.lastPaymentTime,
    nextPaymentTime: subscriptionData.nextPaymentTime,
    shouldShowManualTrigger,
    status,
    message
  }
}

/**
 * Formats a duration in seconds to a human-readable string
 */
export function formatDuration(seconds: number): string {
  const absSeconds = Math.abs(seconds)

  const days = Math.floor(absSeconds / 86400)
  const hours = Math.floor((absSeconds % 86400) / 3600)
  const minutes = Math.floor((absSeconds % 3600) / 60)
  const secs = Math.floor(absSeconds % 60)

  const parts: string[] = []

  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(' ')
}

/**
 * Fetches subscription data from Solana blockchain
 */
export async function fetchSubscriptionData(
  connection: Connection,
  subscriptionPda: PublicKey
): Promise<SubscriptionData | null> {
  try {
    const accountInfo = await connection.getAccountInfo(subscriptionPda)

    if (!accountInfo) {
      return null
    }

    // Parse account data (simplified - in production use Anchor's account decoder)
    // This is a placeholder - actual implementation would use Anchor's IDL
    const data = accountInfo.data

    // NOTE: This is pseudocode - actual deserialization depends on Anchor's format
    // You would normally use:
    // const program = new Program(IDL, programId, provider)
    // const subscription = await program.account.subscription.fetch(subscriptionPda)

    console.warn('fetchSubscriptionData: Implement proper Anchor account deserialization')

    return null
  } catch (error) {
    console.error('Error fetching subscription data:', error)
    return null
  }
}

/**
 * Monitors subscription status and calls callback when manual trigger is needed
 */
export function watchSubscriptionStatus(
  subscriptionData: SubscriptionData,
  onStatusChange: (status: SubscriptionStatusResult) => void,
  intervalMs: number = 5000
): () => void {
  const checkStatus = () => {
    const status = checkSubscriptionStatus(subscriptionData)
    onStatusChange(status)
  }

  // Check immediately
  checkStatus()

  // Set up interval
  const intervalId = setInterval(checkStatus, intervalMs)

  // Return cleanup function
  return () => clearInterval(intervalId)
}
