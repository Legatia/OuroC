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

// Token mint addresses (Devnet - only USDC available)
export const TOKEN_MINTS_DEVNET = {
  USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  USDT: null, // Not available on devnet
  PYUSD: null, // Not available on devnet
  DAI: null, // Not available on devnet
} as const

// Token metadata for display
export const TOKEN_METADATA = {
  USDC: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    icon: '🪙',
    color: '#2775CA',
    description: 'Circle\'s USDC stablecoin',
  },
  USDT: {
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    icon: '₮',
    color: '#26A17B',
    description: 'Tether\'s USDT stablecoin',
  },
  PYUSD: {
    name: 'PayPal USD',
    symbol: 'PYUSD',
    decimals: 6,
    icon: '🅿️',
    color: '#003087',
    description: 'PayPal\'s PYUSD stablecoin',
  },
  DAI: {
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: 18,
    icon: '💎',
    color: '#F5B542',
    description: 'MakerDAO\'s DAI stablecoin',
  },
} as const

// Helper function to get token mint address based on network
export function getTokenMint(token: SupportedToken, network: 'mainnet' | 'devnet'): string | null {
  if (network === 'mainnet') {
    return TOKEN_MINTS[token]
  } else {
    return TOKEN_MINTS_DEVNET[token]
  }
}

// Helper function to check if token is available on devnet
export function isTokenAvailableOnDevnet(token: SupportedToken): boolean {
  return TOKEN_MINTS_DEVNET[token] !== null
}

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
  // Core subscription fields (required)
  subscription_id: string // Must match Solana subscription ID
  solana_contract_address: SolanaAddress // Deployed Solana program address
  subscriber_address: SolanaAddress // Subscriber wallet
  merchant_address: SolanaAddress // Merchant wallet
  payment_token_mint: SolanaAddress // Token user chooses to pay with (USDC/USDT/PYUSD/DAI)
  amount: bigint // Payment amount in micro-units (e.g., 10_000_000 = 10 USDC)
  interval_seconds: bigint
  start_time?: [] | [Timestamp] // Optional timestamp for when subscription starts
  api_key: string // Ouro-C API key for license validation
  agent_metadata?: AgentMetadata // Optional: For AI agent subscriptions

  // X.402 HTTP-Native Payments (enabled by default)
  payment_method?: 'wallet' | 'x402' | 'email' // Default: 'x402' (HTTP-native payments)
  x402_config?: {
    // Developer manages their API endpoints (outside OuroC service scope)
    api_endpoint?: string // Developer's API that needs payment protection
    facilitator_url?: string // Defaults to OuroC facilitator
    payment_schemes?: string[] // Defaults: ['solana-usdc'] for community tier

    // AI agent delegation (enabled by default for community tier)
    agent_delegation?: {
      enabled: boolean // Default: true (AI agents can pay on behalf of users)
      agents: Record<string, {
        max_amount_per_transaction?: bigint // Per-transaction limit
        max_monthly_amount?: bigint // Monthly spending limit
        expires_at?: number // Delegation expiry timestamp
        enabled: boolean // Agent enabled/disabled
      }>
    }
  }
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
  subscriptionId?: string // Optional for notifications not tied to specific subscriptions
  title: string // Notification title for UI display
  message: string
  timestamp: Date | number // Accept both Date and number for flexibility
  read: boolean
  type: 'payment_success' | 'payment_failed' | 'low_balance' | 'subscription_expiring' | 'upcoming_payment' | 'payment_reminder' | 'subscription_created'
  metadata?: {
    amount?: bigint | string // Support both bigint and string representations
    token?: SupportedToken | string // Support both enum and string
    daysUntilPayment?: number
    paymentDate?: Timestamp
    merchantName?: string // For payment reminders
    source?: 'icp_canister' | 'solana_memo' | 'simulation' // Track notification source
    memo?: string // Original SPL memo for reference
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
  isListeningToTransactions?: boolean // Whether listening to Solana transactions
  simulatePaymentReminder?: (data: {
    merchantName: string
    amount: string
    token: string
    daysUntilPayment: number
  }) => void // For testing payment reminders
  parseSolanaMemo?: (memo: string) => OuroCNotification | null // Parse SPL memos
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