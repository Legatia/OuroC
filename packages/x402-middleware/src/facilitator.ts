/**
 * X.402 Facilitator Service
 *
 * Implements the facilitator server component of the X.402 protocol
 * Handles payment verification and settlement for HTTP-native payments
 *
 * Protocol spec: https://github.com/coinbase/x402
 */

import {
  X402PaymentRequest,
  X402PaymentResponse,
  X402PaymentVerification,
  X402PaymentScheme,
  X402Error,
  X402ErrorCode,
  X402_SUPPORTED_SCHEMES
} from '@ouroc/sdk/x402'

export interface FacilitatorConfig {
  supportedSchemes: string[]        // Enabled payment schemes
  merchantAddress: string           // Merchant wallet address
  network: 'devnet' | 'mainnet'    // Solana network
  verifyTransactions: boolean       // Whether to verify on-chain payments
  cacheTime: number                 // Payment verification cache time (ms)
}

export interface PaymentSession {
  id: string
  request: X402PaymentRequest
  status: 'pending' | 'processing' | 'confirmed' | 'failed'
  transactionId?: string
  verificationUrl?: string
  createdAt: number
  expiresAt: number
  error?: string
}

/**
 * X.402 Facilitator Service
 *
 * Handles payment processing and verification for X.402 protocol
 */
export class X402Facilitator {
  private config: FacilitatorConfig
  private sessions: Map<string, PaymentSession> = new Map()
  private verifications: Map<string, X402PaymentVerification> = new Map()

  constructor(config: FacilitatorConfig) {
    this.config = config
  }

  /**
   * Process a payment request
   */
  async processPayment(request: X402PaymentRequest): Promise<X402PaymentResponse> {
    const sessionId = this.generateSessionId()

    // Validate payment scheme
    const scheme = this.getPaymentScheme(request.paymentScheme)
    if (!scheme) {
      return {
        success: false,
        error: `Unsupported payment scheme: ${request.paymentScheme}`
      }
    }

    // Validate amount
    if (request.amount < (scheme.minAmount || 0n)) {
      return {
        success: false,
        error: `Amount ${request.amount} is below minimum ${scheme.minAmount}`
      }
    }

    if (scheme.maxAmount && request.amount > scheme.maxAmount) {
      return {
        success: false,
        error: `Amount ${request.amount} exceeds maximum ${scheme.maxAmount}`
      }
    }

    // Create payment session
    const session: PaymentSession = {
      id: sessionId,
      request,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + 600000 // 10 minutes
    }

    this.sessions.set(sessionId, session)

    try {
      // Process payment based on scheme
      const result = await this.processPaymentByScheme(request, scheme)

      if (result.success) {
        session.status = 'confirmed'
        session.transactionId = result.transactionId
        session.verificationUrl = `${this.getBaseUrl()}/verify/${result.transactionId}`

        // Cache verification
        const verification: X402PaymentVerification = {
          transactionId: result.transactionId!,
          status: 'confirmed',
          amount: request.amount,
          currency: scheme.token,
          timestamp: Date.now(),
          block: result.block,
          confirmations: result.confirmations
        }
        this.verifications.set(result.transactionId!, verification)

        return {
          success: true,
          transactionId: result.transactionId,
          verificationUrl: session.verificationUrl,
          receipt: session.id
        }
      } else {
        session.status = 'failed'
        session.error = result.error
        return {
          success: false,
          error: result.error || 'Payment processing failed'
        }
      }

    } catch (error) {
      session.status = 'failed'
      session.error = error instanceof Error ? error.message : 'Unknown error'

      return {
        success: false,
        error: session.error
      }
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(transactionId: string): Promise<X402PaymentVerification | null> {
    // Check cache first
    const cached = this.verifications.get(transactionId)
    if (cached && (Date.now() - cached.timestamp) < this.config.cacheTime) {
      return cached
    }

    try {
      // Get payment scheme from transaction
      const verification = await this.verifyTransactionOnChain(transactionId)

      if (verification) {
        // Update cache
        this.verifications.set(transactionId, verification)
        return verification
      }

      return null

    } catch (error) {
      console.error('Payment verification failed:', error)
      return null
    }
  }

  /**
   * Get payment session status
   */
  getSession(sessionId: string): PaymentSession | null {
    const session = this.sessions.get(sessionId)
    if (!session || Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId)
      return null
    }
    return session
  }

  /**
   * Process payment based on scheme
   */
  private async processPaymentByScheme(
    request: X402PaymentRequest,
    scheme: X402PaymentScheme
  ): Promise<{ success: boolean; transactionId?: string; error?: string; block?: number; confirmations?: number }> {
    switch (scheme.name) {
      case 'solana-usdc':
        return this.processSolanaUSDCPayment(request, scheme)
      default:
        return {
          success: false,
          error: `Payment scheme ${scheme.name} not implemented`
        }
    }
  }

  /**
   * Process Solana USDC payment
   */
  private async processSolanaUSDCPayment(
    request: X402PaymentRequest,
    scheme: X402PaymentScheme
  ): Promise<{ success: boolean; transactionId?: string; error?: string; block?: number; confirmations?: number }> {
    try {
      // For now, simulate payment processing
      // In a real implementation, this would:
      // 1. Validate the signed transaction
      // 2. Submit transaction to Solana network
      // 3. Wait for confirmation
      // 4. Verify the payment details

      if (!request.transaction) {
        // For demo purposes, generate a mock transaction
        const mockTransactionId = this.generateTransactionId()
        return {
          success: true,
          transactionId: mockTransactionId,
          block: 123456789,
          confirmations: 1
        }
      }

      // Validate and submit real transaction
      const result = await this.submitSolanaTransaction(request.transaction, scheme)
      return result

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      }
    }
  }

  /**
   * Submit Solana transaction
   */
  private async submitSolanaTransaction(
    transaction: string,
    scheme: X402PaymentScheme
  ): Promise<{ success: boolean; transactionId?: string; error?: string; block?: number; confirmations?: number }> {
    // This would integrate with Solana RPC
    // For now, return mock success
    return {
      success: true,
      transactionId: this.generateTransactionId(),
      block: 123456789,
      confirmations: 1
    }
  }

  /**
   * Verify transaction on-chain
   */
  private async verifyTransactionOnChain(transactionId: string): Promise<X402PaymentVerification | null> {
    // This would query the blockchain to verify transaction
    // For now, return cached verification or null
    return this.verifications.get(transactionId) || null
  }

  /**
   * Get payment scheme by name
   */
  private getPaymentScheme(schemeName: string): X402PaymentScheme | null {
    return X402_SUPPORTED_SCHEMES.find(scheme => scheme.name === schemeName) || null
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return 'sess_' + Math.random().toString(36).substring(2, 15) +
                   Math.random().toString(36).substring(2, 15)
  }

  /**
   * Generate transaction ID
   */
  private generateTransactionId(): string {
    return 'txn_' + Math.random().toString(36).substring(2, 15) +
                   Math.random().toString(36).substring(2, 15)
  }

  /**
   * Get base URL for verification URLs
   */
  private getBaseUrl(): string {
    // In a real implementation, this would be the actual facilitator URL
    return 'https://facilitator.ouroc.network'
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = Date.now()
    for (const [id, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(id)
      }
    }
  }

  /**
   * Get facilitator statistics
   */
  getStats(): {
    totalSessions: number
    activeSessions: number
    confirmedSessions: number
    failedSessions: number
    cachedVerifications: number
  } {
    const sessions = Array.from(this.sessions.values())
    const now = Date.now()

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'pending' && now < s.expiresAt).length,
      confirmedSessions: sessions.filter(s => s.status === 'confirmed').length,
      failedSessions: sessions.filter(s => s.status === 'failed').length,
      cachedVerifications: this.verifications.size
    }
  }
}

/**
 * Create Express.js middleware for X.402 facilitator
 */
export function createX402FacilitatorMiddleware(config: FacilitatorConfig) {
  const facilitator = new X402Facilitator(config)

  return {
    // Process payment endpoint
    async handlePayment(req: any, res: any): Promise<void> {
      try {
        const paymentRequest: X402PaymentRequest = req.body
        const result = await facilitator.processPayment(paymentRequest)

        res.status(result.success ? 200 : 400).json(result)
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        })
      }
    },

    // Verify payment endpoint
    async handleVerification(req: any, res: any): Promise<void> {
      try {
        const { transactionId } = req.params
        const verification = await facilitator.verifyPayment(transactionId)

        if (verification) {
          res.json(verification)
        } else {
          res.status(404).json({ error: 'Transaction not found' })
        }
      } catch (error) {
        res.status(500).json({ error: 'Verification failed' })
      }
    },

    // Get session status endpoint
    async handleSession(req: any, res: any): Promise<void> {
      try {
        const { sessionId } = req.params
        const session = facilitator.getSession(sessionId)

        if (session) {
          res.json(session)
        } else {
          res.status(404).json({ error: 'Session not found' })
        }
      } catch (error) {
        res.status(500).json({ error: 'Failed to get session' })
      }
    },

    // Get facilitator stats
    async handleStats(req: any, res: any): Promise<void> {
      try {
        const stats = facilitator.getStats()
        res.json(stats)
      } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' })
      }
    },

    // Get facilitator instance
    getFacilitator(): X402Facilitator {
      return facilitator
    }
  }
}