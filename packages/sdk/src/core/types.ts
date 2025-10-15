import { PublicKey } from '@solana/web3.js'

// Core types matching the ICP canister interface
export type SubscriptionId = string
export type SolanaAddress = string
export type Timestamp = bigint

// Supported stablecoins for payment
export type SupportedToken = 'USDC' | 'USDT' | 'PYUSD' | 'DAI'

// Token mint addresses (Mainnet)
export const TOKEN_MINTS = {
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  PYUSD: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
  DAI: 'EjmyN6qEC1Tf1JxiG1ae7UTJhUxSwk1TCWNWqxWV4J6o',
} as const

export interface Subscription {
  id: SubscriptionId
  solana_contract_address: SolanaAddress // Deployed Solana program
  solana_payer: SolanaAddress
  solana_receiver: SolanaAddress
  subscriber_usdc_account: SolanaAddress // Subscriber's token account
  merchant_usdc_account: SolanaAddress // Merchant's USDC account
  icp_fee_usdc_account: SolanaAddress // ICP fee collection account
  payment_token_mint: SolanaAddress // Token user pays with (USDC/USDT/PYUSD/DAI) - locked at creation
  amount: bigint // Payment amount in micro-units (e.g., 10_000_000 = 10 USDC) - locked at creation
  reminder_days_before_payment: number // Days before payment to send reminder - merchant configured
  interval_seconds: bigint
  next_payment: Timestamp
  is_active: boolean
  created_at: Timestamp
  last_triggered?: Timestamp
  trigger_count: number
  agent_metadata?: AgentMetadata // Optional: For AI agent subscriptions
}

// Agent-to-Agent (A2A) Payment Support
export interface AgentMetadata {
  agent_id: string // Unique identifier for the AI agent
  owner_address: SolanaAddress // Human/entity that authorized this agent
  agent_type: 'autonomous' | 'supervised' // Autonomy level
  max_payment_per_interval?: bigint // Optional spending limit per interval
  description?: string // What this agent does (e.g., "OpenAI API payment agent")
}

export interface CreateSubscriptionRequest {
  subscription_id: string // Must match Solana subscription ID
  solana_contract_address: SolanaAddress // Deployed Solana program address
  subscriber_address: SolanaAddress // Subscriber wallet
  merchant_address: SolanaAddress // Merchant wallet
  payment_token_mint: SolanaAddress // Token user chooses to pay with (USDC/USDT/PYUSD/DAI)
  amount: bigint // Payment amount in micro-units (e.g., 10_000_000 = 10 USDC)
  reminder_days_before_payment: number // Days before payment to send reminder (e.g., 3 = 3 days before)
  interval_seconds: bigint
  start_time?: [] | [Timestamp] // Optional timestamp for when subscription starts
  agent_metadata?: AgentMetadata // Optional: For AI agent subscriptions
}

// Notification system types
export type NotificationChannel =
  | { Email: string }
  | { Discord: string }
  | { Slack: string }
  | { Webhook: string }
  | { PushNotification: PushSubscriptionConfig }
  | 'OnChain'

export interface PushSubscriptionConfig {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string
  deviceId?: string
}

export interface NotificationConfig {
  payer_channels: NotificationChannel[]
  dapp_channels: NotificationChannel[]
  reminder_days: number[]
  enabled: boolean
  push_enabled?: boolean // NEW: Enable push notifications
}

export interface NotificationStatus {
  pending_notifications: number
  monitored_subscriptions: number
  enabled: boolean
  push_subscriptions?: number // NEW: Number of active push subscriptions
}

// SDK Configuration
export interface OuroCConfig {
  canisterId: string
  network: 'mainnet' | 'testnet' | 'devnet' | 'local'
  icpHost?: string
  theme?: OuroCTheme
  notifications?: NotificationConfig
  onError?: (error: Error, context: string) => void
  onSubscriptionCreate?: (subscription: Subscription) => void
  onPaymentSuccess?: (paymentHash: string) => void
  onBalanceLow?: (balance: bigint) => void
}

// Theme system
export interface OuroCTheme {
  colors: {
    primary: string
    secondary: string
    background: string
    surface: string
    text: string
    textSecondary: string
    success: string
    warning: string
    error: string
  }
  fonts: {
    primary: string
    monospace: string
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
  borderRadius: {
    sm: string
    md: string
    lg: string
  }
  shadows: {
    sm: string
    md: string
    lg: string
  }
}

// Component props
export interface SubscriptionCardProps {
  planName: string
  price: number // Token amount (e.g., 10 for 10 USDC)
  token?: SupportedToken // Token type (default: USDC)
  interval: 'daily' | 'weekly' | 'monthly' | 'yearly'
  features: string[]
  popular?: boolean
  customInterval?: number // custom interval in seconds
  reminderDays?: number // Days before payment to send reminder (default: 3)
  className?: string
  onSubscribe: (plan: SubscriptionPlan) => void | Promise<void>
}

export interface SubscriptionPlan {
  id: string
  name: string
  price: number // Token amount
  token: SupportedToken // Token type (USDC/USDT/PYUSD/DAI)
  interval: string
  intervalSeconds: number
  features: string[]
  reminderDays: number // Days before payment to send reminder
}

// Hook return types
export interface UseSubscriptionReturn {
  subscriptions: Subscription[]
  loading: boolean
  error: string | null
  create: (request: CreateSubscriptionRequest) => Promise<SubscriptionId>
  pause: (subscriptionId: SubscriptionId) => Promise<void>
  resume: (subscriptionId: SubscriptionId) => Promise<void>
  cancel: (subscriptionId: SubscriptionId) => Promise<void>
  refresh: () => Promise<void>
}

// OuroC notification type (avoiding conflict with browser Notification)
export interface OuroCNotification {
  id: string
  subscriptionId: string
  message: string
  timestamp: number
  read: boolean
  type: 'payment_success' | 'payment_failed' | 'low_balance' | 'subscription_expiring' | 'upcoming_payment'
  metadata?: {
    amount?: bigint
    token?: SupportedToken
    daysUntilPayment?: number
    paymentDate?: Timestamp
  }
}

// Push notification specific types
export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: {
    subscriptionId: string
    type: OuroCNotification['type']
    url?: string
  }
  requireInteraction?: boolean
}

export interface PushNotificationPermission {
  state: 'granted' | 'denied' | 'default'
  subscription: PushSubscription | null
}

export interface UseNotificationsReturn {
  notifications: OuroCNotification[]
  unreadCount: number
  loading: boolean
  error: string | null
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  refresh: () => Promise<void>
}

export interface UseBalanceReturn {
  balance: bigint | null
  balanceSOL: number | null
  loading: boolean
  error: string | null
  isLowBalance: boolean
  refresh: () => Promise<void>
}

export interface UseOuroCReturn {
  isConnected: boolean
  publicKey: PublicKey | null
  connect: () => Promise<void>
  disconnect: () => void
  canisterId: string
  network: string
}

// Error types
export class OuroCError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message)
    this.name = 'OuroCError'
  }
}

// Result types matching Motoko Result
export type Result<T, E = string> =
  | { ok: T }
  | { err: E }

// Utility types
export interface BalanceInfo {
  current: bigint
  required: bigint
  sufficient: boolean
  daysUntilPayment: number
}

export interface PaymentHistory {
  subscriptionId: SubscriptionId
  transactionHash: string
  amount: bigint
  timestamp: Timestamp
  status: 'success' | 'failed' | 'pending'
}

// Utility functions
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