/**
 * OuroC Core SDK - Framework-agnostic implementation
 *
 * Core features:
 * - X.402 HTTP-native payments
 * - Subscription management via ICP timers
 * - Multi-token support with Jupiter integration
 * - IPFS transaction recording
 * - Simple configuration (7 essential options)
 */

import { Actor, HttpAgent } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { PublicKey, Connection } from '@solana/web3.js'

// Core types - simplified for minimal SDK
export interface OuroCConfig {
  // Required
  canisterId: string

  // Network settings
  network?: 'mainnet' | 'devnet' | 'local'

  // Essential X.402 configuration
  x402Enabled?: boolean        // Default: true

  // Essential subscription configuration
  supportedTokens?: string[]   // Default: ['USDC']
  feePercentage?: number        // Default: 1% (100 basis points)
  maxSlippage?: number        // Default: 5% (500 basis points)

  // Essential automation
  notifications?: boolean         // Default: true
  autoProcessing?: boolean       // Default: true
}

export interface SubscriptionRequest {
  subscription_id: string
  subscriber_address: string
  merchant_address: string
  amount: bigint              // Amount in smallest token units
  payment_token_mint: string
  interval_seconds: bigint
  start_time: []               // Empty array = start immediately
  api_key?: string             // Optional: For validation
}

export interface Subscription {
  id: string
  subscriber: string
  merchant: string
  amount: bigint
  payment_token_mint: string
  interval_seconds: bigint
  next_payment_time: bigint
  status: 'active' | 'paused' | 'cancelled'
  created_at: bigint
  payments_made: bigint
  total_paid: bigint
}

export interface X402PaymentRequest {
  amount: number               // Payment amount in human-readable units
  recipient: string           // Merchant wallet address
  token?: string              // Token to pay with (default: USDC)
  reference?: string           // Optional reference for tracking
}

export interface X402PaymentResponse {
  success: boolean
  transaction?: string        // Solana transaction signature
  ipfsHash?: string         // IPFS hash of transaction record
  error?: string
}

export interface PaymentRecord {
  transactionId: string
  subscriptionId: string
  amount: bigint
  token: string
  timestamp: bigint
  merchantAddress: string
  ipfsHash: string
  jupiterSwap?: {
    fromToken: string
    toToken: string
    swapAmount: bigint
    outputAmount: bigint
  }
}

// ICP canister interface based on actual Candid definitions
interface OuroCCanister {
  // Core subscription functions
  create_subscription: (req: SubscriptionRequest) => Promise<{ ok: string } | { err: string }>
  get_subscription: (id: string) => Promise<{ ok: Subscription } | { err: string }>
  pause_subscription: (id: string) => Promise<{ ok: null } | { err: string }>
  resume_subscription: (id: string) => Promise<{ ok: null } | { err: string }>
  cancel_subscription: (id: string) => Promise<{ ok: null } | { err: string }>

  // Utility functions
  ping: () => Promise<{ status: string; timestamp: bigint; version: string }>
  get_canister_health: () => Promise<{
    active_subscriptions: bigint
    active_timers: bigint
    cycle_balance: bigint
    degradation_reason?: string
    failed_payments: bigint
    is_degraded: boolean
    last_health_check: bigint
    memory_usage: bigint
    status: { Critical: string } | { Degraded: string } | { Healthy: string } | { Offline: string }
    subscription_count: bigint
    uptime_seconds: bigint
  }>

  // Note: X.402 functionality is handled at protocol level, not in canister
  // Real payments happen through Solana, not ICP
}

/**
 * Core OuroC SDK Class - Framework agnostic
 */
export class OuroC {
  private actor: OuroCCanister | null = null
  private agent: HttpAgent | null = null
  private connection: Connection
  private config: Required<OuroCConfig, 'canisterId'>
  private isInitialized = false

  constructor(config: OuroCConfig) {
    this.config = {
      network: 'mainnet',
      x402Enabled: true,
      supportedTokens: ['USDC'],
      feePercentage: 1, // 1%
      maxSlippage: 5, // 5%
      notifications: true,
      autoProcessing: true,
      ...config
    }

    // Initialize Solana connection
    const endpoint = this.getSolanaEndpoint()
    this.connection = new Connection(endpoint, 'confirmed')
  }

  private getSolanaEndpoint(): string {
    switch (this.config.network) {
      case 'mainnet': return 'https://api.mainnet-beta.solana.com'
      case 'devnet': return 'https://api.devnet.solana.com'
      case 'local': return 'http://localhost:8899'
      default: return 'https://api.devnet.solana.com'
    }
  }

  private getICPHost(): string {
    switch (this.config.network) {
      case 'local': return 'http://localhost:4944'
      default: return 'https://ic0.app'
    }
  }

  /**
   * Create mock actor for demo purposes
   * In production, this would be replaced with real canister actor
   */
  private createMockActor(): OuroCCanister {
    return {
      create_subscription: async (req: SubscriptionRequest) => {
        // Mock successful subscription creation
        const mockId = `mock_sub_${Date.now()}`
        console.log(`🔄 Mock creating subscription: ${req.subscription_id}`)
        return { ok: mockId }
      },
      get_subscription: async (id: string) => {
        // Mock subscription retrieval
        return { ok: {
          id,
          subscriber: 'mock_subscriber',
          merchant: 'mock_merchant',
          amount: 29000000n,
          payment_token_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          interval_seconds: 2592000n,
          next_payment_time: BigInt(Date.now() + 2592000000),
          status: 'active' as const,
          created_at: BigInt(Date.now()),
          payments_made: 0n,
          total_paid: 0n
        }}
      },
      pause_subscription: async (id: string) => {
        console.log(`🔄 Mock pausing subscription: ${id}`)
        return { ok: null }
      },
      resume_subscription: async (id: string) => {
        console.log(`🔄 Mock resuming subscription: ${id}`)
        return { ok: null }
      },
      cancel_subscription: async (id: string) => {
        console.log(`🔄 Mock cancelling subscription: ${id}`)
        return { ok: null }
      },
      record_transaction_ipfs: async (record: PaymentRecord) => {
        // Mock IPFS recording
        const mockIpfsHash = `mock_ipfs_${Date.now()}`
        console.log(`🔄 Mock recording transaction to IPFS: ${record.transactionId}`)
        return { ok: mockIpfsHash }
      }
    }
  }

  /**
   * Initialize ICP connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      const host = this.getICPHost()
      this.agent = new HttpAgent({ host })

      // Fetch root key for local development
      if (this.config.network === 'local') {
        await this.agent.fetchRootKey()
      }

      // For now, use mock actor to avoid IDL factory issues
      // TODO: Implement proper IDL factory integration for production
      this.actor = this.createMockActor()

      this.isInitialized = true
      console.log('✅ OuroC Core SDK initialized (using mock actor)')
    } catch (error) {
      throw new Error(`Failed to initialize ICP connection: ${error}`)
    }
  }

  private getMinimalIDL(): any {
    // Return IDL factory function that creates the interface definition
    // Based on actual Candid definitions from timer canister
    return ({ IDL }) => {
      // Type definitions
      const SubscriptionStatus = IDL.Variant({
        'Active': IDL.Null,
        'Cancelled': IDL.Null,
        'Expired': IDL.Null,
        'Paused': IDL.Null
      });

      const Subscription = IDL.Record({
        'created_at': IDL.Int,
        'failed_payment_count': IDL.Nat,
        'id': IDL.Text,
        'interval_seconds': IDL.Nat64,
        'last_error': IDL.Opt(IDL.Text),
        'last_failure_time': IDL.Opt(IDL.Int),
        'last_triggered': IDL.Opt(IDL.Int),
        'merchant_address': IDL.Text,
        'next_execution': IDL.Int,
        'payment_token_mint': IDL.Text,
        'solana_contract_address': IDL.Text,
        'status': SubscriptionStatus,
        'subscriber_address': IDL.Text,
        'trigger_count': IDL.Nat
      });

      const CreateSubscriptionRequest = IDL.Record({
        'amount': IDL.Nat64,
        'api_key': IDL.Text,
        'interval_seconds': IDL.Nat64,
        'merchant_address': IDL.Text,
        'payment_token_mint': IDL.Text,
        'solana_contract_address': IDL.Text,
        'start_time': IDL.Opt(IDL.Int),
        'subscriber_address': IDL.Text,
        'subscription_id': IDL.Text
      });

      const CanisterHealth = IDL.Record({
        'active_timers': IDL.Nat,
        'cycle_balance': IDL.Nat,
        'degradation_reason': IDL.Opt(IDL.Text),
        'failed_payments': IDL.Nat,
        'is_degraded': IDL.Bool,
        'last_health_check': IDL.Int,
        'memory_usage': IDL.Nat,
        'status': IDL.Variant({
          'Critical': IDL.Null,
          'Degraded': IDL.Null,
          'Healthy': IDL.Null,
          'Offline': IDL.Null
        }),
        'subscription_count': IDL.Nat,
        'uptime_seconds': IDL.Nat
      });

      // Result types
      const Result = IDL.Variant({
        'err': IDL.Text,
        'ok': IDL.Null
      });

      const Result_1 = IDL.Variant({
        'err': IDL.Text,
        'ok': IDL.Nat
      });

      const Result_13 = IDL.Variant({
        'err': IDL.Text,
        'ok': IDL.Text
      });

      // Return the service interface
      return IDL.Service({
        'create_subscription': IDL.Func(
          [CreateSubscriptionRequest],
          [Result_13],
          []
        ),
        'get_subscription': IDL.Func(
          [IDL.Text],
          [IDL.Opt(Subscription)],
          ['query']
        ),
        'pause_subscription': IDL.Func(
          [IDL.Text],
          [Result],
          []
        ),
        'resume_subscription': IDL.Func(
          [IDL.Text],
          [Result],
          []
        ),
        'cancel_subscription': IDL.Func(
          [IDL.Text],
          [Result],
          []
        ),
        'ping': IDL.Func(
          [],
          [IDL.Record({
            'status': IDL.Text,
            'timestamp': IDL.Int,
            'version': IDL.Text
          })],
          ['query']
        ),
        'get_canister_health': IDL.Func(
          [],
          [CanisterHealth],
          ['query']
        ),
        'list_subscriptions': IDL.Func(
          [],
          [IDL.Vec(Subscription)],
          ['query']
        ),
        'get_system_metrics': IDL.Func(
          [],
          [IDL.Record({
            'active_subscriptions': IDL.Nat,
            'cycle_balance_estimate': IDL.Nat,
            'failed_payments': IDL.Nat,
            'paused_subscriptions': IDL.Nat,
            'total_payments_processed': IDL.Nat,
            'total_subscriptions': IDL.Nat,
            'uptime_seconds': IDL.Nat
          })],
          ['query']
        )
      });
    };
  }

  /**
   * Create new subscription
   */
  async createSubscription(request: SubscriptionRequest): Promise<string> {
    await this.ensureInitialized()

    if (!this.actor) {
      throw new Error('ICP actor not initialized')
    }

    try {
      const result = await this.actor.create_subscription(request)

      if ('ok' in result) {
        console.log(`✅ Subscription created: ${result.ok}`)
        return result.ok
      } else {
        throw new Error(`Failed to create subscription: ${result.err}`)
      }
    } catch (error) {
      throw new Error(`Subscription creation failed: ${error}`)
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<Subscription> {
    await this.ensureInitialized()

    if (!this.actor) {
      throw new Error('ICP actor not initialized')
    }

    try {
      const result = await this.actor.get_subscription(subscriptionId)

      if ('ok' in result) {
        return result.ok
      } else {
        throw new Error(`Subscription not found: ${result.err}`)
      }
    } catch (error) {
      throw new Error(`Failed to get subscription: ${error}`)
    }
  }

  /**
   * Pause subscription
   */
  async pauseSubscription(subscriptionId: string): Promise<void> {
    await this.ensureInitialized()

    if (!this.actor) {
      throw new Error('ICP actor not initialized')
    }

    try {
      const result = await this.actor.pause_subscription(subscriptionId)

      if ('err' in result) {
        throw new Error(`Failed to pause subscription: ${result.err}`)
      }
    } catch (error) {
      throw new Error(`Failed to pause subscription: ${error}`)
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.ensureInitialized()

    if (!this.actor) {
      throw new Error('ICP actor not initialized')
    }

    try {
      const result = await this.actor.cancel_subscription(subscriptionId)

      if ('err' in result) {
        throw new Error(`Failed to cancel subscription: ${result.err}`)
      }
    } catch (error) {
      throw new Error(`Failed to cancel subscription: ${error}`)
    }
  }

  /**
   * Create X.402 HTTP payment request (Solana only)
   *
   * Note: This requires a Solana private key to sign transactions.
   * In production, you would integrate with a wallet adapter instead.
   */
  async createX402Payment(
    request: X402PaymentRequest,
    privateKey?: string
  ): Promise<X402PaymentResponse> {
    if (!this.config.x402Enabled) {
      return {
        success: false,
        error: 'X.402 payments are disabled in configuration'
      }
    }

    try {
      // Import X.402 client
      const { createX402Payment: createPayment } = await import('../x402/client')

      // Determine network
      const network = this.config.network === 'mainnet' ? 'mainnet' : 'devnet'

      // If no private key provided, return error
      if (!privateKey) {
        return {
          success: false,
          error: 'Private key required for X.402 payments. Use wallet integration in production.'
        }
      }

      console.log(`🔄 Creating X.402 Solana payment: ${request.amount} ${request.token || 'USDC'}`)

      // Create real X.402 payment
      const result = await createPayment(privateKey, request, network)

      if (result.success) {
        console.log(`✅ X.402 payment created successfully`)

        // Optional: Record to IPFS if transaction exists
        if (result.transaction) {
          // IPFS recording would happen here
          console.log(`📝 Transaction: ${result.transaction}`)
        }
      }

      return result
    } catch (error: any) {
      return {
        success: false,
        error: `X.402 payment failed: ${error.message || error}`
      }
    }
  }

  /**
   * Record transaction to IPFS
   */
  async recordTransaction(record: PaymentRecord): Promise<string> {
    await this.ensureInitialized()

    if (!this.actor) {
      throw new Error('ICP actor not initialized')
    }

    try {
      const result = await this.actor.record_transaction_ipfs(record)

      if ('ok' in result) {
        console.log(`✅ Transaction recorded to IPFS: ${result.ok}`)
        return result.ok
      } else {
        throw new Error(`Failed to record transaction: ${result.err}`)
      }
    } catch (error) {
      throw new Error(`IPFS recording failed: ${error}`)
    }
  }

  /**
   * Process Solana payment with IPFS recording
   */
  async processPayment(
    subscriptionId: string,
    amount: number,
    recipient: string,
    tokenMint: string = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Default USDC
    signature?: string
  ): Promise<{ success: boolean; ipfsHash?: string; error?: string }> {
    try {
      // If signature provided, record directly
      if (signature) {
        const record: PaymentRecord = {
          transactionId: signature,
          subscriptionId,
          amount: BigInt(Math.floor(amount * 1_000_000)), // Convert to smallest units
          token: tokenMint,
          timestamp: BigInt(Date.now()),
          merchantAddress: recipient,
          ipfsHash: '' // Will be set by canister
        }

        const ipfsHash = await this.recordTransaction(record)

        return {
          success: true,
          ipfsHash
        }
      }

      // Otherwise, create X.402 payment request
      const x402Request: X402PaymentRequest = {
        amount,
        recipient,
        token: tokenMint,
        reference: subscriptionId
      }

      return await this.createX402Payment(x402Request)

    } catch (error) {
      return {
        success: false,
        error: `Payment processing failed: ${error}`
      }
    }
  }

  /**
   * Check connection status
   */
  async getConnectionStatus(): Promise<'connected' | 'disconnected' | 'connecting'> {
    try {
      if (!this.isInitialized) {
        return 'connecting'
      }

      if (!this.actor) {
        return 'disconnected'
      }

      // Simple ping to canister
      await this.actor.get_subscription('ping')
      return 'connected'
    } catch {
      return 'disconnected'
    }
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<OuroCConfig> {
    return this.config
  }

  /**
   * Get supported tokens
   */
  getSupportedTokens(): string[] {
    return this.config.supportedTokens || ['USDC']
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }
}