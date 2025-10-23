/**
 * X.402 Express.js Middleware
 *
 * Express middleware for X.402 delegation protocol implementation.
 * Handles capability token validation and session management.
 */

import { Request, Response, NextFunction } from 'express'
import {
  X402DelegationService,
  createX402DelegationService
} from './service'

import type {
  X402CapabilityToken,
  X402ValidationResult,
  X402Config,
  X402MiddlewareOptions,
  X402Request,
  X402Response,
  X402Event,
  X402Logger,
  X402Cache
} from './types'

// Extend Express Request types
declare global {
  namespace Express {
    interface Request {
      x402Delegation?: {
        token: X402CapabilityToken
        validation: X402ValidationResult
      }
    }
  }
}

/**
 * X.402 Express Middleware
 */
export class X402ExpressMiddleware {
  private delegationService: X402DelegationService
  private options: Required<X402MiddlewareOptions>

  constructor(
    config: X402Config,
    options: X402MiddlewareOptions = {},
    dependencies: { cache?: X402Cache, logger?: X402Logger } = {}
  ) {
    this.delegationService = createX402DelegationService(config, dependencies)
    this.options = {
      strict_mode: false,
      log_level: 'info',
      custom_headers: {},
      enable_metrics: true,
      onTokenValid: undefined,
      onTokenInvalid: undefined,
      onCapabilityUsed: undefined,
      ...options
    } as Required<X402MiddlewareOptions>

    // Set up event handlers
    if (this.options.onTokenValid) {
      this.delegationService.on('token_validated', (event: X402Event) => {
        if (event.data.validation.valid) {
          this.options.onTokenValid!(event.data.token, event.data.request)
        }
      })
    }

    if (this.options.onTokenInvalid) {
      this.delegationService.on('token_invalid', (event: X402Event) => {
        this.options.onTokenInvalid!(event.data.errors, event.data.request)
      })
    }

    if (this.options.onCapabilityUsed) {
      this.delegationService.on('capability_used', (event: X402Event) => {
        this.options.onCapabilityUsed!(event.data.capability, event.data.request)
      })
    }
  }

  /**
   * Express middleware function
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Convert Express request to X402 request format
        const x402Request: X402Request = {
          url: req.url || '',
          method: req.method || 'GET',
          headers: req.headers as Record<string, string>,
          body: req.body,
          query: req.query as Record<string, string>,
          ip: req.ip,
          user_agent: req.get('User-Agent'),
          timestamp: Date.now()
        }

        // Validate delegation
        const validation = await this.delegationService.validateDelegation(x402Request)

        // Check if validation is required
        if (!this.shouldRequireDelegation(req)) {
          return next()
        }

        if (validation.valid && validation.constraints_met) {
          // Add delegation info to request
          req.x402Delegation = {
            token: validation.token,
            validation
          }

          // Add custom headers
          if (this.options.custom_headers) {
            Object.entries(this.options.custom_headers).forEach(([key, value]) => {
              res.set(key, value)
            })
          }

          next()
        } else {
          // Return 401/403 for invalid delegation
          const statusCode = validation.valid ? 403 : 401
          res.status(statusCode).json({
            error: 'Delegation validation failed',
            message: validation.errors.length > 0 ? validation.errors[0] : 'Invalid delegation',
            code: 'DELEGATION_INVALID',
            details: {
              valid: validation.valid,
              constraints_met: validation.constraints_met,
              errors: validation.errors,
              warnings: validation.warnings
            }
          })
        }

      } catch (error) {
        if (this.options.strict_mode) {
          next(error)
        } else {
          res.status(500).json({
            error: 'Internal server error',
            message: 'Delegation validation failed',
            code: 'VALIDATION_ERROR'
          })
        }
      }
    }
  }

  /**
   * Check if request requires delegation protection
   */
  private shouldRequireDelegation(req: Request): boolean {
    const pathname = req.path || req.url || ''
    const method = req.method || 'GET'
    const headers = req.headers

    // Skip for common non-protected endpoints
    const skipPatterns = [
      '/health',
      '/status',
      '/ping',
      '/metrics',
      '/docs',
      '/documentation',
      '/openapi',
      '/swagger',
      '/robots.txt',
      '/favicon.ico'
    ]

    if (skipPatterns.some(pattern => pathname.includes(pattern))) {
      return false
    }

    // Check for existing valid delegation
    if (req.x402Delegation?.validation.valid) {
      return false
    }

    // Common API patterns that might need delegation protection
    const protectedPatterns = [
      '/api/',
      '/api/v1/',
      '/api/v2/',
      '/premium/',
      '/pro/',
      '/enterprise/',
      '/ai/',
      '/llm/',
      '/gpt/',
      '/claude/',
      '/assistant/',
      '/agents/',
      '/delegate/'
    ]

    // Focus on state-changing operations
    const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)

    return protectedPatterns.some(pattern => pathname.includes(pattern)) ||
           (pathname.startsWith('/api/') && isStateChanging)
  }

  /**
   * Get delegation service instance
   */
  getDelegationService(): X402DelegationService {
    return this.delegationService
  }

  /**
   * Get middleware statistics
   */
  getStatistics() {
    return this.delegationService.getStatistics()
  }

  /**
   * Cleanup resources
   */
  async dispose() {
    await this.delegationService.cleanup()
  }
}

/**
 * Create X.402 Express middleware
 */
export function createX402ExpressMiddleware(
  config: X402Config,
  options?: X402MiddlewareOptions,
  dependencies?: { cache?: X402Cache, logger?: X402Logger }
): X402ExpressMiddleware {
  return new X402ExpressMiddleware(config, options, dependencies)
}

/**
 * Create conditional X.402 middleware
 */
export function createConditionalX402Middleware(
  condition: (req: Request) => boolean,
  config: X402Config,
  options?: X402MiddlewareOptions
) {
  const middleware = createX402ExpressMiddleware(config, options)

  return (req: Request, res: Response, next: NextFunction) => {
    if (condition(req)) {
      return middleware.middleware()(req, res, next)
    }
    next()
  }
}

/**
 * Helper function to create path-based delegation middleware
 */
export function createPathBasedX402Middleware(
  paths: string[],
  config: X402Config,
  options?: X402MiddlewareOptions
) {
  return createConditionalX402Middleware(
    (req) => paths.some(path => req.path?.startsWith(path)),
    config,
    options
  )
}

/**
 * Helper function to create method-based delegation middleware
 */
export function createMethodBasedX402Middleware(
  methods: string[],
  config: X402Config,
  options?: X402MiddlewareOptions
) {
  return createConditionalX402Middleware(
    (req) => methods.includes(req.method || 'GET'),
    config,
    options
  )
}

/**
 * Helper function to create role-based delegation middleware
 */
export function createRoleBasedX402Middleware(
  roleCapabilities: Record<string, string[]>,
  config: X402Config,
  options?: X402MiddlewareOptions
) {
  const middleware = createX402ExpressMiddleware(config, options)

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.x402Delegation) {
      return next()
    }

    const capabilities = req.x402Delegation.validation.capabilities
    let hasRequiredRole = false
    let matchedRole: string | undefined

    for (const [role, requiredCaps] of Object.entries(roleCapabilities)) {
      if (requiredCaps.every(cap => capabilities.includes(cap))) {
        hasRequiredRole = true
        matchedRole = role
        break
      }
    }

    if (hasRequiredRole) {
      // Add role info to request
      req.x402Delegation.validation.capabilities.push(`role:${matchedRole}`)
      next()
    } else {
      res.status(403).json({
        error: 'Insufficient role permissions',
        message: 'Required role capabilities not found',
        code: 'ROLE_INSUFFICIENT'
      })
    }
  }
}

export default X402ExpressMiddleware