/**
 * X.402 Server Middleware
 *
 * Express.js/Next.js middleware for implementing X.402 protocol on servers
 * Generates 402 Payment Required responses with X-PAYMENT headers
 *
 * Protocol spec: https://github.com/coinbase/x402
 */

import { Request, Response, NextFunction } from 'express'
import {
  X402PaymentHeader,
  X402PaymentVerification,
  X402MiddlewareConfig,
  X402Error,
  X402ErrorCode
} from '@ouroc/sdk/x402'

export interface X402MiddlewareOptions {
  // Path-based payment requirements
  requirePaymentFor?: string[]
  // Amount rules for different paths/operations
  amountRules?: Record<string, bigint>
  // Custom payment logic
  customPaymentCheck?: (req: Request) => Promise<{
    required: boolean
    amount?: bigint
    currency?: string
    memo?: string
  }>
  // Payment verification handler
  onPaymentVerified?: (req: Request, verification: X402PaymentVerification) => Promise<void>
  // Error handler
  onPaymentError?: (req: Request, error: X402Error) => void
}

/**
 * X.402 Middleware Class
 */
export class X402Middleware {
  private config: X402MiddlewareConfig
  private options: X402MiddlewareOptions
  private paymentCache: Map<string, X402PaymentVerification> = new Map()

  constructor(config: X402MiddlewareConfig, options: X402MiddlewareOptions = {}) {
    this.config = config
    this.options = {
      requirePaymentFor: [],
      amountRules: {},
      ...options
    }
  }

  /**
   * Express.js middleware function
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check if payment verification is present
        const verificationHeader = req.headers['x-payment-verification'] as string

        if (verificationHeader) {
          // Payment verification provided - validate it
          const verification = await this.validatePaymentVerification(verificationHeader, req)

          if (verification) {
            // Payment verified - continue
            if (this.options.onPaymentVerified) {
              await this.options.onPaymentVerified(req, verification)
            }
            return next()
          } else {
            // Invalid verification
            const error = new X402Error(
              'Invalid payment verification',
              X402ErrorCode.PAYMENT_VERIFICATION_FAILED
            )

            if (this.options.onPaymentError) {
              this.options.onPaymentError(req, error)
            }

            return res.status(402).json({
              error: 'Payment verification failed',
              code: 'INVALID_VERIFICATION'
            })
          }
        }

        // Check if payment is required for this path
        const paymentRequirement = await this.checkPaymentRequired(req)

        if (paymentRequirement.required) {
          // Payment required - send 402 response with X-PAYMENT header
          const paymentHeader: X402PaymentHeader = {
            facilitator: this.config.facilitatorUrl,
            paymentSchemes: this.config.enabledSchemes,
            amount: paymentRequirement.amount,
            currency: paymentRequirement.currency || 'USDC',
            recipient: this.config.merchantAddress,
            memo: paymentRequirement.memo,
            expiresAt: Date.now() + 300000 // 5 minutes
          }

          return res
            .status(402)
            .set('X-PAYMENT', JSON.stringify(paymentHeader))
            .json({
              error: 'Payment required',
              paymentDetails: paymentHeader,
              message: 'Please complete payment to access this resource'
            })
        }

        // No payment required - continue
        next()

      } catch (error) {
        console.error('X.402 middleware error:', error)

        const x402Error = error instanceof X402Error ? error :
          new X402Error(
            'Internal payment processing error',
            X402ErrorCode.FACILITATOR_ERROR
          )

        if (this.options.onPaymentError) {
          this.options.onPaymentError(req, x402Error)
        }

        res.status(500).json({
          error: 'Payment processing error',
          code: x402Error.code
        })
      }
    }
  }

  /**
   * Check if payment is required for the current request
   */
  private async checkPaymentRequired(req: Request): Promise<{
    required: boolean
    amount?: bigint
    currency?: string
    memo?: string
  }> {
    // Custom payment check takes precedence
    if (this.options.customPaymentCheck) {
      return await this.options.customPaymentCheck(req)
    }

    // Path-based payment requirements
    const path = req.path
    const method = req.method

    // Check if this path/operation requires payment
    for (const pattern of this.options.requirePaymentFor || []) {
      if (this.matchesPattern(path, method, pattern)) {
        const amount = this.getAmountForPath(path, method)
        return {
          required: true,
          amount,
          currency: 'USDC',
          memo: `${method} ${path}`
        }
      }
    }

    // No payment required
    return { required: false }
  }

  /**
   * Validate payment verification header
   */
  private async validatePaymentVerification(
    verificationHeader: string,
    req: Request
  ): Promise<X402PaymentVerification | null> {
    try {
      const verification = JSON.parse(verificationHeader) as {
        verificationUrl: string
        transactionId: string
        timestamp: number
        signature?: string
      }

      // Check timestamp (prevent replay attacks)
      const maxAge = this.config.cacheTime || 300000 // 5 minutes default
      if (Date.now() - verification.timestamp > maxAge) {
        return null
      }

      // Check cache first
      const cached = this.paymentCache.get(verification.transactionId)
      if (cached) {
        return cached
      }

      // Verify payment with facilitator
      const response = await fetch(verification.verificationUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'OuroC-X402-Middleware/1.0.0'
        }
      })

      if (!response.ok) {
        return null
      }

      const paymentVerification: X402PaymentVerification = await response.json()

      // Cache the verification
      this.paymentCache.set(verification.transactionId, paymentVerification)

      // Remove from cache after expiry
      setTimeout(() => {
        this.paymentCache.delete(verification.transactionId)
      }, this.config.cacheTime || 300000)

      return paymentVerification

    } catch (error) {
      console.error('Payment verification error:', error)
      return null
    }
  }

  /**
   * Check if request matches payment requirement pattern
   */
  private matchesPattern(path: string, method: string, pattern: string): boolean {
    // Simple pattern matching - can be enhanced with regex
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'))
      return regex.test(`${method} ${path}`)
    }

    return pattern === `${method} ${path}` || pattern === path
  }

  /**
   * Get amount required for a specific path
   */
  private getAmountForPath(path: string, method: string): bigint {
    const key = `${method} ${path}`
    return this.options.amountRules?.[key] ||
           this.options.amountRules?.[path] ||
           1000000n // Default: $1 USDC
  }

  /**
   * Clear expired payment verifications from cache
   */
  clearExpiredCache(): void {
    const now = Date.now()
    const maxAge = this.config.cacheTime || 300000

    for (const [txId, verification] of this.paymentCache) {
      if (now - verification.timestamp > maxAge) {
        this.paymentCache.delete(txId)
      }
    }
  }

  /**
   * Get middleware statistics
   */
  getStats(): {
    cachedVerifications: number
    supportedSchemes: string[]
    facilitatorUrl: string
  } {
    return {
      cachedVerifications: this.paymentCache.size,
      supportedSchemes: this.config.enabledSchemes,
      facilitatorUrl: this.config.facilitatorUrl
    }
  }
}

/**
 * Create X.402 middleware factory function
 */
export function createX402Middleware(
  config: X402MiddlewareConfig,
  options: X402MiddlewareOptions = {}
): X402Middleware {
  return new X402Middleware(config, options)
}

/**
 * Convenience function for Express.js
 */
export function x402Middleware(
  config: X402MiddlewareConfig,
  options: X402MiddlewareOptions = {}
) {
  const middleware = new X402Middleware(config, options)
  return middleware.middleware()
}

/**
 * Predefined configurations for common use cases
 */
export const X402_CONFIGS = {
  // Subscription API configuration
  subscription: {
    enabledSchemes: ['solana-usdc'],
    facilitatorUrl: 'https://facilitator.ouroc.network',
    requirePaymentFor: ['POST /api/subscriptions', 'POST /api/payments'],
    amountRules: {
      'POST /api/subscriptions': 29000000n, // $29 USDC
      'POST /api/payments': 1000000n // $1 USDC minimum
    },
    merchantAddress: 'merchant-wallet-address',
    verifyPayments: true,
    cacheTime: 300000 // 5 minutes
  },

  // Premium content API configuration
  premiumContent: {
    enabledSchemes: ['solana-usdc'],
    facilitatorUrl: 'https://facilitator.ouroc.network',
    requirePaymentFor: ['GET /api/premium/*'],
    amountRules: {
      'GET /api/premium/*': 5000000n // $5 USDC
    },
    merchantAddress: 'merchant-wallet-address',
    verifyPayments: true,
    cacheTime: 3600000 // 1 hour
  },

  // Developer API configuration
  developerApi: {
    enabledSchemes: ['solana-usdc'],
    facilitatorUrl: 'https://facilitator.ouroc.network',
    requirePaymentFor: ['POST /api/*'],
    amountRules: {
      'POST /api/*': 10000000n // $10 USDC per API call
    },
    merchantAddress: 'merchant-wallet-address',
    verifyPayments: true,
    cacheTime: 60000 // 1 minute
  }
}