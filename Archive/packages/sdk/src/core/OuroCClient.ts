import { Actor, HttpAgent } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { PublicKey, Connection } from '@solana/web3.js'
import {
  Subscription,
  CreateSubscriptionRequest,
  SubscriptionId,
  NotificationConfig,
  NotificationStatus,
  Result,
  OuroCError,
  BalanceInfo
} from './types'
import { SolanaPayments, SolanaPaymentConfig } from '../solana'
import { FirstPaymentHandler } from '../solana/FirstPaymentHandler'
import { idlFactory } from './canister.idl'

export interface CanisterHealth {
  status: 'healthy' | 'degraded' | 'offline'
  cycle_balance: bigint
  uptime_seconds: number
  subscription_count: number
  active_timers: number
  failed_payments: number
  memory_usage: number
  is_degraded: boolean
  degradation_reason?: string
}

// Generated IDL interface (would be auto-generated from canister)
interface OuroCCanister {
  create_subscription: (req: CreateSubscriptionRequest) => Promise<Result<SubscriptionId>>
  get_subscription: (id: SubscriptionId) => Promise<Result<Subscription>>
  list_subscriptions: (payer: string) => Promise<Subscription[]>
  pause_subscription: (id: SubscriptionId) => Promise<Result<null>>
  resume_subscription: (id: SubscriptionId) => Promise<Result<null>>
  cancel_subscription: (id: SubscriptionId) => Promise<Result<null>>

  // Notification functions
  set_notification_config: (subscriptionId: SubscriptionId, config: NotificationConfig) => Promise<Result<null>>
  get_notification_config: (subscriptionId: SubscriptionId) => Promise<Result<NotificationConfig>>
  get_balance_monitoring_status: () => Promise<NotificationStatus>
  check_balance_and_send_reminders: (subscriptionId: SubscriptionId) => Promise<Result<string>>

  // Utility functions
  initialize_canister: () => Promise<Result<{ main_address: string; fee_address: string }>>
  get_canister_status: () => Promise<{
    is_initialized: boolean
    subscription_count: bigint
    active_timers: bigint
  }>

  // Health monitoring functions
  get_canister_health: () => Promise<CanisterHealth>
  get_overdue_subscriptions: () => Promise<SubscriptionId[]>
  emergency_pause_all: () => Promise<Result<number>>
}

export class OuroCClient {
  private actor: OuroCCanister | null = null
  private agent: HttpAgent | null = null
  private connection: Connection
  private canisterId: string
  private network: string
  private solanaPayments: SolanaPayments
  private firstPaymentHandler: FirstPaymentHandler
  private healthCheckTimer: NodeJS.Timeout | null = null
  private healthCheckInterval: number = 30000 // 30 seconds default
  private onHealthChange?: (health: CanisterHealth) => void
  private onOverdueSubscriptions?: (subscriptionIds: SubscriptionId[]) => void
  private lastHealthStatus: CanisterHealth['status'] = 'healthy'
  private initializationPromise: Promise<void> | null = null

  constructor(
    canisterId: string,
    network: 'mainnet' | 'testnet' | 'devnet' | 'local' = 'mainnet',
    icpHost?: string,
    solanaConfig?: Partial<SolanaPaymentConfig>
  ) {
    this.canisterId = canisterId
    this.network = network

    // Initialize Solana connection
    const solanaEndpoint = this.getSolanaEndpoint(network)
    this.connection = new Connection(solanaEndpoint, 'confirmed')

    // Initialize Solana payments
    this.solanaPayments = new SolanaPayments({
      connection: this.connection,
      ...solanaConfig
    })

    // Initialize first payment handler
    this.firstPaymentHandler = new FirstPaymentHandler(this.connection)

    // Initialize ICP agent and store the promise
    this.initializationPromise = this.initializeAgent(icpHost)
  }

  /**
   * Wait for the client to be fully initialized
   */
  async waitForInitialization(): Promise<void> {
    if (this.initializationPromise) {
      try {
        await this.initializationPromise
      } catch (error) {
        // Suppress console error - already logged
      }
    }
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.actor !== null
  }

  private getSolanaEndpoint(network: string): string {
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

  private async initializeAgent(icpHost?: string): Promise<void> {
    try {
      const host = icpHost || this.getICPHost()
      this.agent = new HttpAgent({ host })

      // Fetch root key for local development
      if (this.network === 'local') {
        await this.agent.fetchRootKey()
      }

      // Create actor
      this.actor = Actor.createActor<OuroCCanister>(
        this.getIDL(),
        {
          agent: this.agent,
          canisterId: Principal.fromText(this.canisterId)
        }
      )
    } catch (error) {
      throw new OuroCError(
        'Failed to initialize ICP connection',
        'ICP_CONNECTION_ERROR',
        error
      )
    }
  }

  private getICPHost(): string {
    switch (this.network) {
      case 'local':
        return 'http://localhost:4944'
      default:
        return 'https://ic0.app'
    }
  }

  private getIDL(): any {
    return idlFactory
  }

  // Subscription management
  async createSubscription(request: CreateSubscriptionRequest, walletAdapter?: any): Promise<SubscriptionId> {
    if (!this.actor) throw new OuroCError('Client not initialized', 'NOT_INITIALIZED')

    try {
      // Step 1: Create subscription timer on ICP
      const result = await this.actor.create_subscription(request)

      if (!('ok' in result)) {
        throw new OuroCError(
          `Failed to create ICP subscription: ${result.err}`,
          'CREATE_SUBSCRIPTION_ERROR'
        )
      }

      const subscriptionId = result.ok

      // Step 2: Execute first payment if wallet adapter is provided
      console.log('DEBUG: walletAdapter received:', walletAdapter)
      console.log('DEBUG: walletAdapter type:', typeof walletAdapter)
      console.log('DEBUG: walletAdapter truthy?', !!walletAdapter)

      if (walletAdapter) {
        console.log('Executing first payment with wallet adapter...')

        try {
          const subscriberPubkey = new PublicKey(request.subscriber_address)
          const merchantPubkey = new PublicKey(request.merchant_address)
          const usdcMint = new PublicKey(request.payment_token_mint)
          const amount = Number(request.amount)

          // Check balance first
          const { hasEnough, balance } = await this.firstPaymentHandler.checkBalance(
            subscriberPubkey,
            amount,
            usdcMint
          )

          if (!hasEnough) {
            throw new OuroCError(
              `Insufficient USDC. Need ${amount / 1_000_000} USDC, have ${balance / 1_000_000} USDC`,
              'INSUFFICIENT_BALANCE'
            )
          }

          // Execute payment
          const paymentSignature = await this.firstPaymentHandler.executeFirstPayment(
            subscriberPubkey,
            merchantPubkey,
            amount,
            usdcMint,
            walletAdapter
          )

          console.log(`✅ First payment completed: ${paymentSignature}`)
        } catch (error: any) {
          console.error('First payment failed:', error)
          // Note: ICP subscription is already created, but first payment failed
          throw new OuroCError(
            `Subscription created but first payment failed: ${error.message}`,
            'FIRST_PAYMENT_FAILED',
            error
          )
        }
      } else {
        console.warn('No wallet adapter provided - skipping first payment')
      }

      return subscriptionId
    } catch (error) {
      if (error instanceof OuroCError) throw error

      // Log the full error for debugging
      console.error('Full error creating subscription:', error)
      console.error('Error type:', typeof error)
      console.error('Error message:', (error as any)?.message)
      console.error('Error stack:', (error as any)?.stack)

      throw new OuroCError(
        `Unexpected error creating subscription: ${(error as any)?.message || String(error)}`,
        'UNKNOWN_ERROR',
        error
      )
    }
  }

  async getSubscription(subscriptionId: SubscriptionId): Promise<Subscription> {
    if (!this.actor) throw new OuroCError('Client not initialized', 'NOT_INITIALIZED')

    try {
      const result = await this.actor.get_subscription(subscriptionId)

      if ('ok' in result) {
        return result.ok
      } else {
        throw new OuroCError(
          `Subscription not found: ${result.err}`,
          'SUBSCRIPTION_NOT_FOUND'
        )
      }
    } catch (error) {
      if (error instanceof OuroCError) throw error
      throw new OuroCError(
        'Failed to fetch subscription',
        'FETCH_ERROR',
        error
      )
    }
  }

  async listSubscriptions(payer: string): Promise<Subscription[]> {
    if (!this.actor) throw new OuroCError('Client not initialized', 'NOT_INITIALIZED')

    try {
      return await this.actor.list_subscriptions(payer)
    } catch (error) {
      throw new OuroCError(
        'Failed to list subscriptions',
        'LIST_ERROR',
        error
      )
    }
  }

  async pauseSubscription(subscriptionId: SubscriptionId): Promise<void> {
    if (!this.actor) throw new OuroCError('Client not initialized', 'NOT_INITIALIZED')

    try {
      const result = await this.actor.pause_subscription(subscriptionId)

      if ('err' in result) {
        throw new OuroCError(
          `Failed to pause subscription: ${result.err}`,
          'PAUSE_ERROR'
        )
      }
    } catch (error) {
      if (error instanceof OuroCError) throw error
      throw new OuroCError(
        'Unexpected error pausing subscription',
        'UNKNOWN_ERROR',
        error
      )
    }
  }

  async resumeSubscription(subscriptionId: SubscriptionId): Promise<void> {
    if (!this.actor) throw new OuroCError('Client not initialized', 'NOT_INITIALIZED')

    try {
      const result = await this.actor.resume_subscription(subscriptionId)

      if ('err' in result) {
        throw new OuroCError(
          `Failed to resume subscription: ${result.err}`,
          'RESUME_ERROR'
        )
      }
    } catch (error) {
      if (error instanceof OuroCError) throw error
      throw new OuroCError(
        'Unexpected error resuming subscription',
        'UNKNOWN_ERROR',
        error
      )
    }
  }

  async cancelSubscription(subscriptionId: SubscriptionId): Promise<void> {
    if (!this.actor) throw new OuroCError('Client not initialized', 'NOT_INITIALIZED')

    try {
      const result = await this.actor.cancel_subscription(subscriptionId)

      if ('err' in result) {
        throw new OuroCError(
          `Failed to cancel subscription: ${result.err}`,
          'CANCEL_ERROR'
        )
      }
    } catch (error) {
      if (error instanceof OuroCError) throw error
      throw new OuroCError(
        'Unexpected error cancelling subscription',
        'UNKNOWN_ERROR',
        error
      )
    }
  }

  // Notification management
  async setNotificationConfig(
    subscriptionId: SubscriptionId,
    config: NotificationConfig
  ): Promise<void> {
    if (!this.actor) throw new OuroCError('Client not initialized', 'NOT_INITIALIZED')

    try {
      const result = await this.actor.set_notification_config(subscriptionId, config)

      if ('err' in result) {
        throw new OuroCError(
          `Failed to set notification config: ${result.err}`,
          'NOTIFICATION_CONFIG_ERROR'
        )
      }
    } catch (error) {
      if (error instanceof OuroCError) throw error
      throw new OuroCError(
        'Unexpected error setting notification config',
        'UNKNOWN_ERROR',
        error
      )
    }
  }

  async getNotificationStatus(): Promise<NotificationStatus> {
    if (!this.actor) throw new OuroCError('Client not initialized', 'NOT_INITIALIZED')

    try {
      return await this.actor.get_balance_monitoring_status()
    } catch (error) {
      throw new OuroCError(
        'Failed to get notification status',
        'NOTIFICATION_STATUS_ERROR',
        error
      )
    }
  }

  async checkBalanceAndSendReminders(subscriptionId: SubscriptionId): Promise<string> {
    if (!this.actor) throw new OuroCError('Client not initialized', 'NOT_INITIALIZED')

    try {
      const result = await this.actor.check_balance_and_send_reminders(subscriptionId)

      if ('ok' in result) {
        return result.ok
      } else {
        throw new OuroCError(
          `Failed to check balance: ${result.err}`,
          'BALANCE_CHECK_ERROR'
        )
      }
    } catch (error) {
      if (error instanceof OuroCError) throw error
      throw new OuroCError(
        'Unexpected error checking balance',
        'UNKNOWN_ERROR',
        error
      )
    }
  }

  // Solana utilities
  async getBalance(publicKey: PublicKey): Promise<bigint> {
    try {
      const balance = await this.connection.getBalance(publicKey)
      return BigInt(balance)
    } catch (error) {
      throw new OuroCError(
        'Failed to fetch Solana balance',
        'SOLANA_BALANCE_ERROR',
        error
      )
    }
  }

  async getBalanceInfo(
    publicKey: PublicKey,
    requiredAmount: bigint
  ): Promise<BalanceInfo> {
    const current = await this.getBalance(publicKey)
    const sufficient = current >= requiredAmount * BigInt(110) / BigInt(100) // 110% buffer

    return {
      current,
      required: requiredAmount,
      sufficient,
      daysUntilPayment: 0 // Would be calculated based on subscription
    }
  }

  // Utility methods
  lamportsToSOL(lamports: bigint): number {
    return Number(lamports) / 1_000_000_000
  }

  SOLToLamports(sol: number): bigint {
    return BigInt(Math.floor(sol * 1_000_000_000))
  }

  formatSOL(lamports: bigint, decimals: number = 4): string {
    const sol = this.lamportsToSOL(lamports)
    return `${sol.toFixed(decimals)} SOL`
  }

  // Connection status
  isConnected(): boolean {
    return this.actor !== null && this.agent !== null
  }

  getCanisterId(): string {
    return this.canisterId
  }

  getNetwork(): string {
    return this.network
  }

  // Health monitoring methods
  async getCanisterHealth(): Promise<CanisterHealth> {
    if (!this.actor) throw new OuroCError('Client not initialized', 'NOT_INITIALIZED')

    try {
      return await this.actor.get_canister_health()
    } catch (error) {
      // If we can't reach the canister, it's offline
      return {
        status: 'offline',
        cycle_balance: BigInt(0),
        uptime_seconds: 0,
        subscription_count: 0,
        active_timers: 0,
        failed_payments: 0,
        memory_usage: 0,
        is_degraded: true,
        degradation_reason: 'Canister unreachable'
      }
    }
  }

  // Get overdue subscriptions that need manual collection
  async getOverdueSubscriptions(): Promise<SubscriptionId[]> {
    if (!this.actor) throw new OuroCError('Client not initialized', 'NOT_INITIALIZED')

    try {
      return await this.actor.get_overdue_subscriptions()
    } catch (error) {
      throw new OuroCError(
        'Failed to get overdue subscriptions',
        'OVERDUE_SUBSCRIPTIONS_ERROR',
        error
      )
    }
  }

  // Process manual payment collection via Solana (this would integrate with your Solana program)
  async processManualPayment(
    subscriptionId: SubscriptionId,
    walletAdapter: any // Solana wallet adapter
  ): Promise<string> {
    if (!walletAdapter?.connected) {
      throw new OuroCError('Wallet not connected', 'WALLET_NOT_CONNECTED')
    }

    try {
      // Get subscription details
      const subscription = await this.getSubscription(subscriptionId)

      // Integrate with Solana program for manual payment
      const txSignature = await this.sendSolanaPayment(subscription, walletAdapter)

      return txSignature
    } catch (error) {
      if (error instanceof OuroCError) throw error
      throw new OuroCError(
        'Failed to process manual payment',
        'MANUAL_PAYMENT_ERROR',
        error
      )
    }
  }

  // Private method to handle Solana payment using SolanaPayments
  private async sendSolanaPayment(subscription: Subscription, walletAdapter: any): Promise<string> {
    try {
      // Try subscription program first, fallback to direct payment
      try {
        return await this.solanaPayments.processSubscriptionPayment(subscription, walletAdapter)
      } catch (error) {
        if (error instanceof OuroCError && error.code === 'PROGRAM_NOT_CONFIGURED') {
          // Fallback to direct SOL transfer
          console.log('Using direct payment fallback')
          return await this.solanaPayments.processDirectPayment(subscription, walletAdapter)
        }
        throw error
      }
    } catch (error) {
      if (error instanceof OuroCError) throw error
      throw new OuroCError(
        'Failed to process Solana payment',
        'SOLANA_PAYMENT_ERROR',
        error
      )
    }
  }

  // Get payment preview for user confirmation
  async getPaymentPreview(subscriptionId: SubscriptionId): Promise<{
    fromAddress: string
    toAddress: string
    amountSOL: number
    amountLamports: bigint
    estimatedFee: number
  }> {
    try {
      const subscription = await this.getSubscription(subscriptionId)
      return await this.solanaPayments.getPaymentPreview(subscription)
    } catch (error) {
      if (error instanceof OuroCError) throw error
      throw new OuroCError(
        'Failed to get payment preview',
        'PAYMENT_PREVIEW_ERROR',
        error
      )
    }
  }

  // Validate balance before payment
  async validatePayerBalance(
    payerAddress: string,
    paymentAmount: bigint
  ): Promise<{
    balance: bigint
    sufficient: boolean
    shortfall?: bigint
  }> {
    try {
      return await this.solanaPayments.validatePayerBalance(payerAddress, paymentAmount)
    } catch (error) {
      if (error instanceof OuroCError) throw error
      throw new OuroCError(
        'Failed to validate payer balance',
        'BALANCE_VALIDATION_ERROR',
        error
      )
    }
  }

  startHealthMonitoring(options?: {
    intervalMs?: number
    onHealthChange?: (health: CanisterHealth) => void
    onOverdueSubscriptions?: (subscriptionIds: SubscriptionId[]) => void
  }): void {
    // Stop existing timer if running
    this.stopHealthMonitoring()

    // Set options
    if (options?.intervalMs) {
      this.healthCheckInterval = options.intervalMs
    }
    if (options?.onHealthChange) {
      this.onHealthChange = options.onHealthChange
    }
    if (options?.onOverdueSubscriptions) {
      this.onOverdueSubscriptions = options.onOverdueSubscriptions
    }

    // Start the health check timer
    this.healthCheckTimer = setInterval(async () => {
      try {
        const health = await this.getCanisterHealth()

        // Check if health status changed
        if (health.status !== this.lastHealthStatus) {
          this.lastHealthStatus = health.status
          this.onHealthChange?.(health)
        }

        // Check for overdue subscriptions that need manual collection
        if (health.is_degraded || health.status === 'offline') {
          try {
            const overdueSubscriptions = await this.getOverdueSubscriptions()
            if (overdueSubscriptions.length > 0) {
              this.onOverdueSubscriptions?.(overdueSubscriptions)
            }
          } catch (error) {
            console.warn('Failed to check overdue subscriptions:', error)
          }
        }

      } catch (error) {
        console.warn('Health check failed:', error)

        // If health check fails, consider canister offline
        const offlineHealth: CanisterHealth = {
          status: 'offline',
          cycle_balance: BigInt(0),
          uptime_seconds: 0,
          subscription_count: 0,
          active_timers: 0,
          failed_payments: 0,
          memory_usage: 0,
          is_degraded: true,
          degradation_reason: 'Health check failed'
        }

        if (this.lastHealthStatus !== 'offline') {
          this.lastHealthStatus = 'offline'
          this.onHealthChange?.(offlineHealth)
        }
      }
    }, this.healthCheckInterval)

    // Perform initial health check
    this.getCanisterHealth().then(health => {
      this.lastHealthStatus = health.status
      this.onHealthChange?.(health)
    }).catch(() => {
      // Initial check failed - canister is offline
      this.lastHealthStatus = 'offline'
      this.onHealthChange?.({
        status: 'offline',
        cycle_balance: BigInt(0),
        uptime_seconds: 0,
        subscription_count: 0,
        active_timers: 0,
        failed_payments: 0,
        memory_usage: 0,
        is_degraded: true,
        degradation_reason: 'Initial health check failed'
      })
    })
  }

  stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }

  isHealthMonitoringActive(): boolean {
    return this.healthCheckTimer !== null
  }

  getHealthCheckInterval(): number {
    return this.healthCheckInterval
  }

  getLastHealthStatus(): CanisterHealth['status'] {
    return this.lastHealthStatus
  }
}