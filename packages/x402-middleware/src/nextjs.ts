/**
 * X.402 Next.js Middleware
 *
 * Next.js middleware for automatic X.402 payment handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { X402MiddlewareCore } from './core'
import {
  X402Config,
  X402MiddlewareOptions,
  X402Request,
  X402Response,
  X402Event
} from './types'

/**
 * Convert Next.js request to X402 request format
 */
function nextToX402Request(req: NextRequest): X402Request {
  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    headers[key] = value
  })

  return {
    url: req.url,
    pathname: req.nextUrl?.pathname,
    method: req.method,
    headers,
    body: req.body,
    query: Object.fromEntries(req.nextUrl?.searchParams || []),
    ip: req.ip
  }
}

/**
 * Convert X402 response to Next.js response
 */
function x402ToNextResponse(x402Response: X402Response): NextResponse {
  return new NextResponse(
    JSON.stringify(x402Response.body),
    {
      status: x402Response.status,
      headers: x402Response.headers
    }
  )
}

/**
 * X.402 Next.js Middleware Factory
 */
export function createX402NextMiddleware(
  config: X402Config,
  options: X402MiddlewareOptions = {}
) {
  const core = new X402MiddlewareCore(config, options)

  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Convert Next.js request to X402 format
      const x402Request = nextToX402Request(req)

      // Process request through X.402 core
      const x402Response = await core.processRequest(x402Request)

      // If X.402 returned a response, send it
      if (x402Response !== null) {
        return x402ToNextResponse(x402Response)
      }

      // No payment issues, continue with normal processing
      return NextResponse.next()

    } catch (error) {
      console.error('X.402 Next.js middleware error:', error)

      // Send error response
      return new NextResponse(
        JSON.stringify({
          error: 'Internal server error',
          message: 'X.402 processing failed'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }
  }
}

/**
 * X.402 Next.js Middleware Class
 *
 * Alternative to factory function for more control
 */
export class X402NextMiddleware {
  private core: X402MiddlewareCore

  constructor(config: X402Config, options: X402MiddlewareOptions = {}) {
    this.core = new X402MiddlewareCore(config, options)
  }

  /**
   * Get middleware function
   */
  middleware(): (req: NextRequest) => Promise<NextResponse> {
    return async (req: NextRequest): Promise<NextResponse> => {
      try {
        const x402Request = nextToX402Request(req)
        const x402Response = await this.core.processRequest(x402Request)

        if (x402Response !== null) {
          return x402ToNextResponse(x402Response)
        }

        return NextResponse.next()

      } catch (error) {
        console.error('X.402 Next.js middleware error:', error)

        return new NextResponse(
          JSON.stringify({
            error: 'Internal server error',
            message: 'X.402 processing failed'
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
      }
    }
  }

  /**
   * Add event listener
   */
  addEventListener(type: string, listener: (event: X402Event) => void): void {
    this.core.addEventListener(type, listener)
  }

  /**
   * Remove event listener
   */
  removeEventListener(type: string, listener: (event: X402Event) => void): void {
    this.core.removeEventListener(type, listener)
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return this.core.getStatistics()
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.core.resetStatistics()
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<X402Config>): void {
    this.core.updateConfig(config)
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<X402MiddlewareOptions>): void {
    this.core.updateOptions(options)
  }
}

// Export factory function for easier usage
export default createX402NextMiddleware

/**
 * Helper function to create middleware with default settings
 */
export function x402(config: X402Config): (req: NextRequest) => Promise<NextResponse> {
  return createX402NextMiddleware(config, {
    autoRetry: false,
    maxRetries: 3,
    logLevel: 'info'
  })
}

/**
 * Create conditional X.402 middleware
 *
 * Only applies X.402 protection to routes that match the predicate
 */
export function createConditionalX402Middleware(
  config: X402Config,
  predicate: (req: NextRequest) => boolean,
  options: X402MiddlewareOptions = {}
) {
  const core = new X402MiddlewareCore(config, options)

  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Check if this request should be protected
      if (!predicate(req)) {
        return NextResponse.next()
      }

      // Convert Next.js request to X402 format
      const x402Request = nextToX402Request(req)

      // Process request through X.402 core
      const x402Response = await core.processRequest(x402Request)

      // If X.402 returned a response, send it
      if (x402Response !== null) {
        return x402ToNextResponse(x402Response)
      }

      // No payment issues, continue with normal processing
      return NextResponse.next()

    } catch (error) {
      console.error('X.402 Next.js conditional middleware error:', error)

      // Send error response
      return new NextResponse(
        JSON.stringify({
          error: 'Internal server error',
          message: 'X.402 processing failed'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }
  }
}

/**
 * Usage Examples
 */

/*
// Example 1: Basic usage in middleware.ts
import { createX402NextMiddleware } from '@ouroc/x402-middleware/nextjs'

export const middleware = createX402NextMiddleware({
  icpHost: 'https://ic0.app',
  sellerAddress: 'YOUR_SOLANA_WALLET',
  pricing: 0.01 // $0.01 per request
})
*/

/*
// Example 2: Conditional middleware for specific routes
import { createConditionalX402Middleware } from '@ouroc/x402-middleware/nextjs'

export const middleware = createConditionalX402Middleware(
  {
    icpHost: 'https://ic0.app',
    sellerAddress: 'YOUR_SOLANA_WALLET',
    pricing: (req) => {
      // Different pricing for different routes
      if (req.nextUrl?.pathname?.includes('/premium')) {
        return 0.05 // $0.05 for premium features
      }
      return 0.01 // $0.01 for basic features
    }
  },
  (req) => {
    // Only protect API routes and premium content
    return req.nextUrl?.pathname?.startsWith('/api') ||
           req.nextUrl?.pathname?.includes('/premium')
  }
)
*/

/*
// Example 3: Advanced usage with class-based middleware
import { X402NextMiddleware } from '@ouroc/x402-middleware/nextjs'

const x402 = new X402NextMiddleware({
  icpHost: 'https://ic0.app',
  sellerAddress: 'YOUR_SOLANA_WALLET',
  pricing: 0.01,
  facilitatorEndpoint: 'https://your-custom-facilitator.com/pay'
}, {
  logLevel: 'debug',
  customHeaders: {
    'X-Custom-Header': 'value'
  },
  onPayment: (paymentInfo, req) => {
    console.log('Payment required for:', req.nextUrl?.pathname)
  },
  onSuccess: (proof, req) => {
    console.log('Payment verified:', proof.tx_signature)
  },
  onError: (error, req) => {
    console.error('Payment error:', error.message)
  }
})

// Add event listeners
x402.addEventListener('payment_verified', (event) => {
  console.log('Payment verified:', event.data)
})

x402.addEventListener('payment_required', (event) => {
  console.log('Payment required:', event.data)
})

export const middleware = x402.middleware()

// Get statistics in API routes
export async function GET(request: NextRequest) {
  const stats = x402.getStatistics()
  return NextResponse.json({ stats })
}
*/

/*
// Example 4: Route-specific pricing
import { createX402NextMiddleware } from '@ouroc/x402-middleware/nextjs'

const pricingMap = {
  '/api/basic': 0.01,
  '/api/premium': 0.05,
  '/api/enterprise': 0.10,
  '/api/ai-features': 0.25
}

export const middleware = createX402NextMiddleware({
  icpHost: 'https://ic0.app',
  sellerAddress: 'YOUR_SOLANA_WALLET',
  pricing: (req) => {
    const pathname = req.nextUrl?.pathname || ''
    const matchedRoute = Object.keys(pricingMap).find(route => pathname.startsWith(route))
    return matchedRoute ? pricingMap[matchedRoute as keyof typeof pricingMap] : 0.01
  }
})
*/

/*
// Example 5: Time-based pricing
import { createX402NextMiddleware } from '@ouroc/x402-middleware/nextjs'

export const middleware = createX402NextMiddleware({
  icpHost: 'https://ic0.app',
  sellerAddress: 'YOUR_SOLANA_WALLET',
  pricing: (req) => {
    const hour = new Date().getHours()

    // Higher pricing during peak hours (9 AM - 5 PM)
    if (hour >= 9 && hour <= 17) {
      return 0.02 // $0.02 during peak hours
    }

    // Lower pricing during off-peak hours
    return 0.005 // $0.005 during off-peak hours
  }
})
*/

/*
// Example 6: User-based pricing (would need authentication)
import { createX402NextMiddleware } from '@ouroc/x402-middleware/nextjs'

async function getUserTier(req: NextRequest): Promise<'basic' | 'premium' | 'enterprise'> {
  // In a real app, you'd decode the JWT or session cookie
  // For now, return 'basic'
  return 'basic'
}

export const middleware = createX402NextMiddleware({
  icpHost: 'https://ic0.app',
  sellerAddress: 'YOUR_SOLANA_WALLET',
  pricing: async (req) => {
    const userTier = await getUserTier(req)

    switch (userTier) {
      case 'basic': return 0.01
      case 'premium': return 0.05
      case 'enterprise': return 0.10
      default: return 0.01
    }
  }
})
*/