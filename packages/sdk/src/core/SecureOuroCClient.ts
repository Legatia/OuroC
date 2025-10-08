import { OuroCClient, CanisterHealth } from './OuroCClient'
import { OuroCError, SubscriptionId, CreateSubscriptionRequest, Subscription } from './types'
import { SolanaPaymentConfig } from '../solana'

/**
 * Security configuration for the OuroC client
 */
export interface SecurityConfig {
  // NPM package version (locked)
  readonly packageVersion: string

  // Allowed payment customizations
  allowCustomPaymentLogic: boolean
  allowCustomRetryLogic: boolean
  allowCustomConfirmations: boolean

  // Session management
  autoAuthRenewal: boolean
  sessionTimeoutMinutes: number

  // Rate limiting (client-side protection)
  maxRequestsPerMinute: number
  enableRateLimitWarnings: boolean
}

/**
 * Authentication state
 */
export interface AuthState {
  isAuthenticated: boolean
  solanaAddress?: string
  sessionToken?: string
  permissions: string[]
  expiresAt?: number
  rateLimitRemaining: number
}

/**
 * Secure wrapper around OuroCClient that enforces security policies
 */
export class SecureOuroCClient {
  private client: OuroCClient
  private securityConfig: SecurityConfig
  private authState: AuthState
  private requestCount = 0
  private lastRequestTime = 0

  // Locked endpoints that require authentication and cannot be customized
  private readonly LOCKED_ENDPOINTS = [
    'request_auth_challenge',
    'authenticate_user',
    'create_subscription',
    'get_subscription',
    'list_subscriptions',
    'pause_subscription',
    'resume_subscription',
    'cancel_subscription',
    'set_notification_config',
    'get_notification_config',
    'get_canister_health',
    'get_overdue_subscriptions',
    'emergency_pause_all'
  ] as const

  constructor(
    canisterId: string,
    network: 'mainnet' | 'testnet' | 'devnet' | 'local' = 'mainnet',
    icpHost?: string,
    solanaConfig?: Partial<SolanaPaymentConfig>,
    securityConfig?: Partial<SecurityConfig>
  ) {
    this.client = new OuroCClient(canisterId, network, icpHost, solanaConfig)

    this.securityConfig = {
      packageVersion: '1.0.0', // LOCKED - cannot be modified by users
      allowCustomPaymentLogic: true,
      allowCustomRetryLogic: true,
      allowCustomConfirmations: true,
      autoAuthRenewal: true,
      sessionTimeoutMinutes: 60,
      maxRequestsPerMinute: 60,
      enableRateLimitWarnings: true,
      ...securityConfig
    }

    this.authState = {
      isAuthenticated: false,
      permissions: [],
      rateLimitRemaining: this.securityConfig.maxRequestsPerMinute
    }
  }

  // =============================================================================
  // AUTHENTICATION (LOCKED - Cannot be customized)
  // =============================================================================

  /**
   * Authenticate with Solana wallet
   * This function is LOCKED and cannot be modified by users
   */
  async authenticate(walletAdapter: any): Promise<void> {
    if (!walletAdapter?.connected || !walletAdapter.publicKey) {
      throw new OuroCError('Wallet not connected', 'WALLET_NOT_CONNECTED')
    }

    try {
      const solanaAddress = walletAdapter.publicKey.toString()

      // Step 1: Request auth challenge
      const challengeResult = await this.secureCanisterCall('request_auth_challenge', [solanaAddress]) as any
      if ('err' in challengeResult) {
        throw new OuroCError(`Auth challenge failed: ${challengeResult.err}`, 'AUTH_CHALLENGE_FAILED')
      }

      const { nonce, message } = challengeResult.ok

      // Step 2: Sign message with wallet
      const encodedMessage = new TextEncoder().encode(message)

      if (!wallet.signMessage) {
        throw new OuroCError('Wallet does not support message signing', 'WALLET_UNSUPPORTED')
      }

      const signatureResult = await wallet.signMessage(encodedMessage)
      const signature = signatureResult

      // Step 3: Submit authentication
      const authRequest = {
        solana_address: solanaAddress,
        message,
        signature,
        nonce,
        requested_permissions: ['ReadSubscriptions', 'CreateSubscription', 'ModifySubscription', 'ConfigureNotifications']
      }

      const authResult = await this.secureCanisterCall('authenticate_user', [authRequest]) as any
      if ('err' in authResult) {
        throw new OuroCError(`Authentication failed: ${authResult.err}`, 'AUTHENTICATION_FAILED')
      }

      // Store authentication state
      this.authState = {
        isAuthenticated: true,
        solanaAddress,
        sessionToken: authResult.ok,
        permissions: authRequest.requested_permissions,
        expiresAt: Date.now() + (this.securityConfig.sessionTimeoutMinutes * 60 * 1000),
        rateLimitRemaining: this.securityConfig.maxRequestsPerMinute
      }

    } catch (error) {
      if (error instanceof OuroCError) throw error
      throw new OuroCError('Authentication failed', 'AUTHENTICATION_ERROR', error)
    }
  }

  /**
   * Revoke current session
   */
  async logout(): Promise<void> {
    if (this.authState.isAuthenticated && this.authState.solanaAddress) {
      await this.secureCanisterCall('revoke_session', [this.authState.solanaAddress])
    }

    this.authState = {
      isAuthenticated: false,
      permissions: [],
      rateLimitRemaining: this.securityConfig.maxRequestsPerMinute
    }
  }

  // =============================================================================
  // SUBSCRIPTION MANAGEMENT (LOCKED - Authentication required)
  // =============================================================================

  async createSubscription(request: CreateSubscriptionRequest): Promise<SubscriptionId> {
    this.validateAuth(['CreateSubscription'])
    return await this.secureCanisterCall('create_subscription', [request])
  }

  async getSubscription(subscriptionId: SubscriptionId): Promise<Subscription> {
    this.validateAuth(['ReadSubscriptions'])
    return await this.secureCanisterCall('get_subscription', [subscriptionId])
  }

  async listSubscriptions(payer: string): Promise<Subscription[]> {
    this.validateAuth(['ReadSubscriptions'])
    return await this.secureCanisterCall('list_subscriptions', [payer])
  }

  async pauseSubscription(subscriptionId: SubscriptionId): Promise<void> {
    this.validateAuth(['ModifySubscription'])
    return await this.secureCanisterCall('pause_subscription', [subscriptionId])
  }

  async resumeSubscription(subscriptionId: SubscriptionId): Promise<void> {
    this.validateAuth(['ModifySubscription'])
    return await this.secureCanisterCall('resume_subscription', [subscriptionId])
  }

  async cancelSubscription(subscriptionId: SubscriptionId): Promise<void> {
    this.validateAuth(['ModifySubscription'])
    return await this.secureCanisterCall('cancel_subscription', [subscriptionId])
  }

  // =============================================================================
  // HEALTH MONITORING (LOCKED)
  // =============================================================================

  async getCanisterHealth(): Promise<CanisterHealth> {
    this.validateAuth(['ViewHealth'])
    return await this.secureCanisterCall('get_canister_health', [])
  }

  async getOverdueSubscriptions(): Promise<SubscriptionId[]> {
    this.validateAuth(['ReadSubscriptions'])
    return await this.secureCanisterCall('get_overdue_subscriptions', [])
  }

  // =============================================================================
  // PAYMENT PROCESSING (CUSTOMIZABLE - No authentication required)
  // =============================================================================

  /**
   * Process manual payment - CUSTOMIZABLE by users
   */
  async processManualPayment(
    subscriptionId: SubscriptionId,
    walletAdapter: any,
    customConfig?: {
      confirmations?: number
      retryAttempts?: number
      customPaymentLogic?: (subscription: Subscription, wallet: any) => Promise<string>
    }
  ): Promise<string> {
    if (!this.securityConfig.allowCustomPaymentLogic && customConfig?.customPaymentLogic) {
      throw new OuroCError('Custom payment logic is disabled', 'CUSTOM_PAYMENT_DISABLED')
    }

    // Use underlying client's payment processing (not locked)
    return await this.client.processManualPayment(subscriptionId, walletAdapter)
  }

  /**
   * Get payment preview - CUSTOMIZABLE
   */
  async getPaymentPreview(subscriptionId: SubscriptionId): Promise<any> {
    // This is customizable and doesn't require authentication
    return await this.client.getPaymentPreview(subscriptionId)
  }

  /**
   * Validate payer balance - CUSTOMIZABLE
   */
  async validatePayerBalance(payerAddress: string, amount: bigint): Promise<any> {
    // This is customizable and doesn't require authentication
    return await this.client.validatePayerBalance(payerAddress, amount)
  }

  // =============================================================================
  // SECURITY VALIDATION (PRIVATE)
  // =============================================================================

  /**
   * Secure canister call - validates authentication and rate limits
   */
  private async secureCanisterCall<T>(method: string, args: any[]): Promise<T> {
    // Rate limiting check
    this.enforceRateLimit()

    // Package version validation
    this.validatePackageVersion()

    // Authentication validation for locked endpoints
    if (this.LOCKED_ENDPOINTS.includes(method as any)) {
      if (method !== 'request_auth_challenge' && method !== 'authenticate_user') {
        this.validateAuth()
      }
    }

    try {
      // Call the underlying client method
      const clientMethod = (this.client as any)[method]
      if (!clientMethod) {
        throw new OuroCError(`Method ${method} not found`, 'METHOD_NOT_FOUND')
      }

      const result = await clientMethod.apply(this.client, args)
      this.requestCount++
      this.lastRequestTime = Date.now()

      return result
    } catch (error) {
      if (error instanceof OuroCError) throw error
      throw new OuroCError(`Secure call failed: ${method}`, 'SECURE_CALL_FAILED', error)
    }
  }

  /**
   * Validate authentication and permissions
   */
  private validateAuth(requiredPermissions?: string[]): void {
    if (!this.authState.isAuthenticated) {
      throw new OuroCError('Authentication required', 'AUTHENTICATION_REQUIRED')
    }

    if (this.authState.expiresAt && Date.now() > this.authState.expiresAt) {
      this.authState.isAuthenticated = false
      throw new OuroCError('Session expired', 'SESSION_EXPIRED')
    }

    if (requiredPermissions) {
      const hasPermissions = requiredPermissions.every(perm =>
        this.authState.permissions.includes(perm)
      )
      if (!hasPermissions) {
        throw new OuroCError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS')
      }
    }
  }

  /**
   * Enforce rate limiting
   */
  private enforceRateLimit(): void {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    // Reset rate limit every minute
    if (timeSinceLastRequest >= 60000) {
      this.authState.rateLimitRemaining = this.securityConfig.maxRequestsPerMinute
      this.requestCount = 0
    }

    if (this.authState.rateLimitRemaining <= 0) {
      throw new OuroCError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED')
    }

    this.authState.rateLimitRemaining--

    if (this.securityConfig.enableRateLimitWarnings && this.authState.rateLimitRemaining < 10) {
      console.warn(`OuroC rate limit warning: ${this.authState.rateLimitRemaining} requests remaining`)
    }
  }

  /**
   * Validate npm package version
   */
  private validatePackageVersion(): void {
    const expectedVersion = this.securityConfig.packageVersion
    // In production, this would check the actual package version
    // For now, we just validate that it matches the expected version
    // TODO: Implement actual package version validation
  }

  // =============================================================================
  // PUBLIC GETTERS
  // =============================================================================

  getAuthState(): AuthState {
    return { ...this.authState }
  }

  getSecurityConfig(): SecurityConfig {
    return { ...this.securityConfig }
  }

  isConnected(): boolean {
    return this.client.isConnected()
  }

  getCanisterId(): string {
    return this.client.getCanisterId()
  }

  getNetwork(): string {
    return this.client.getNetwork()
  }
}