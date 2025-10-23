/**
 * X.402 Middleware Package - API Protection Tools
 *
 * X.402 is ENABLED BY DEFAULT in OuroC SDK.
 * This package provides middleware for developers to protect THEIR API endpoints.
 *
 * OuroC handles:
 * - X.402 payment processing (built-in)
 * - AI agent delegation (built-in)
 * - Facilitator service (built-in)
 *
 * Developers handle:
 * - Their API endpoint architecture
 * - Route protection (this middleware)
 * - Business logic integration
 *
 * Payment spec: https://github.com/coinbase/x402
 */

// ============================================================================
// X.402 HTTP-NATIVE PAYMENTS (Coinbase Spec)
// ============================================================================

// Facilitator service for payment processing
export {
  X402Facilitator,
  createX402FacilitatorMiddleware
} from './facilitator'

// Server middleware for 402 responses
export {
  X402Middleware,
  createX402Middleware,
  x402Middleware,
  X402_CONFIGS
} from './server-middleware'

export type {
  FacilitatorConfig,
  PaymentSession,
  X402MiddlewareOptions
} from './facilitator'

// ============================================================================
// LEGACY X.402 DELEGATION (Capability Tokens)
// ============================================================================

// Core delegation service
export {
  X402DelegationService,
  createX402DelegationService
} from './service'

// Discovery system for AI agents
export {
  X402DiscoveryService,
  createX402DiscoveryService
} from './discovery'

export type {
  X402APIService,
  X402DiscoveryConfig,
  X402SearchOptions,
  X402SearchResult
} from './discovery'

// Type exports (delegation-focused)
export type {
  // Core delegation types
  X402CapabilityToken,
  X402Capability,
  X402Permission,
  X402Constraints,
  X402ValidationResult,
  X402Session,
  X402UsageRecord,
  X402DelegationRequest,
  X402Config,

  // Request/Response types
  X402Request,
  X402Response,
  X402MiddlewareOptions,

  // Event and monitoring types
  X402Event,
  X402Statistics,
  X402Logger,
  X402Cache,
  X402RateLimit,

  // Function metadata for AI agent discovery
  X402FunctionMetadata,
  X402ParameterMetadata,
  X402FunctionExample,
  X402SDKManifest,

  // Error handling
  X402MiddlewareError,
  X402ErrorCode,

  // Framework-specific types
  X402ExpressRequest,
  X402ExpressResponse,
  X402NextRequest,

  // Utility types
  X402RequestHandler,
  X402DelegationFunction
} from './types'

// Express.js middleware (delegation-focused)
export {
  X402ExpressMiddleware,
  createConditionalX402Middleware
} from './express'

// Next.js middleware (delegation-focused)
export {
  X402NextMiddleware
} from './nextjs'

// Re-exports for convenience
export { X402DelegationService as Core } from './service'
export { X402DiscoveryService as Discovery } from './discovery'

/**
 * Version information
 */
export const VERSION = '1.0.0'
export const PROTOCOL = 'x402-delegation-v1'

/**
 * Create X.402 delegation middleware for Express.js
 */
export function createX402Middleware(
  config: X402Config,
  options?: X402MiddlewareOptions
) {
  return createX402ExpressMiddleware(config, options)
}

/**
 * Simple X.402 delegation middleware factory
 */
export function x402(config: X402Config) {
  return createX402Middleware(config, {
    strict_mode: false,
    log_level: 'info',
    enable_metrics: true
  })
}

/**
 * Utility function to check if a request needs X.402 delegation protection
 */
export function needsX402Protection(request: {
  pathname?: string
  headers?: Record<string, string>
  method?: string
}): boolean {
  const pathname = request.pathname || ''
  const method = request.method || 'GET'
  const headers = request.headers || {}

  // Check for existing capability token
  const hasCapabilityToken =
    headers['authorization']?.startsWith('X402 ') ||
    headers['x-capability-token'] ||
    headers['X-Capability-Token']

  if (hasCapabilityToken) {
    return false // Already has capability token
  }

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

  // Common API patterns that might need delegation protection
  const protectedPatterns = [
    '/api/',
    '/api/v1/',
    '/api/v2/',
    '/premium/',
    '/paid/',
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
 * Helper function to create capability-based access control
 */
export function createCapabilityBasedAccessControl(requiredCapabilities: string[]) {
  return (request: X402Request, capabilities: string[]): boolean => {
    return requiredCapabilities.every(cap => capabilities.includes(cap))
  }
}

/**
 * Helper function to create role-based access control from capabilities
 */
export function createRoleBasedAccessControl(roleCapabilities: Record<string, string[]>) {
  return (request: X402Request, capabilities: string[]): { allowed: boolean; role?: string } => {
    for (const [role, requiredCaps] of Object.entries(roleCapabilities)) {
      if (requiredCaps.every(cap => capabilities.includes(cap))) {
        return { allowed: true, role }
      }
    }
    return { allowed: false }
  }
}

/**
 * Create a comprehensive X.402 delegation configuration with sensible defaults
 */
export function createX402Config(config: Partial<X402Config> = {}): X402Config {
  return {
    allowed_issuers: config.allowed_issuers || [],
    required_capabilities: config.required_capabilities || [],
    default_constraints: {
      max_uses: 1000,
      time_limit: 3600,
      resource_limits: {
        max_requests_per_minute: 60,
        max_data_size: 1024 * 1024 // 1MB
      },
      spatial_constraints: {
        allowed_regions: [],
        excluded_regions: []
      },
      ...config.default_constraints
    },
    token_cache_ttl: config.token_cache_ttl || 3600,
    enable_session_tracking: config.enable_session_tracking ?? true,
    enable_usage_logging: config.enable_usage_logging ?? true,
    validation_endpoint: config.validation_endpoint
  }
}

/**
 * Validate X.402 delegation configuration
 */
export function validateConfig(config: X402Config): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (config.allowed_issuers && !Array.isArray(config.allowed_issuers)) {
    errors.push('allowed_issuers must be an array')
  }

  if (config.required_capabilities && !Array.isArray(config.required_capabilities)) {
    errors.push('required_capabilities must be an array')
  }

  if (config.default_constraints) {
    const constraints = config.default_constraints

    if (constraints.max_uses && (typeof constraints.max_uses !== 'number' || constraints.max_uses <= 0)) {
      errors.push('max_uses must be a positive number')
    }

    if (constraints.time_limit && (typeof constraints.time_limit !== 'number' || constraints.time_limit <= 0)) {
      errors.push('time_limit must be a positive number')
    }

    if (constraints.resource_limits?.max_requests_per_minute &&
        (typeof constraints.resource_limits.max_requests_per_minute !== 'number' ||
         constraints.resource_limits.max_requests_per_minute <= 0)) {
      errors.push('max_requests_per_minute must be a positive number')
    }
  }

  if (config.token_cache_ttl && (typeof config.token_cache_ttl !== 'number' || config.token_cache_ttl <= 0)) {
    errors.push('token_cache_ttl must be a positive number')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Default X.402 delegation configurations for common use cases
 */
export const DEFAULT_CONFIGS = {
  /**
   * Basic API delegation with minimal constraints
   */
  basicApi: createX402Config({
    default_constraints: {
      max_uses: 1000,
      time_limit: 3600, // 1 hour
      resource_limits: {
        max_requests_per_minute: 60
      }
    }
  }),

  /**
   * Premium API delegation with stricter constraints
   */
  premiumApi: createX402Config({
    required_capabilities: ['premium_access'],
    default_constraints: {
      max_uses: 500,
      time_limit: 1800, // 30 minutes
      resource_limits: {
        max_requests_per_minute: 120
      }
    }
  }),

  /**
   * AI service delegation with rate limiting
   */
  aiService: createX402Config({
    required_capabilities: ['ai_inference'],
    default_constraints: {
      max_uses: 100,
      time_limit: 3600, // 1 hour
      resource_limits: {
        max_requests_per_minute: 10,
        max_data_size: 10 * 1024 * 1024 // 10MB
      }
    }
  }),

  /**
   * Enterprise API delegation with comprehensive constraints
   */
  enterpriseApi: createX402Config({
    required_capabilities: ['enterprise_access'],
    default_constraints: {
      max_uses: 10000,
      time_limit: 7200, // 2 hours
      resource_limits: {
        max_requests_per_minute: 1000,
        max_data_size: 100 * 1024 * 1024 // 100MB
      },
      spatial_constraints: {
        allowed_regions: ['US', 'EU', 'CA', 'GB']
      }
    }
  })
}

/**
 * Example configurations for documentation
 */
export const EXAMPLE_CONFIGS = {
  // Express.js API with capability-based access control
  expressApi: {
    allowed_issuers: ['did:example:company'],
    required_capabilities: ['api_access'],
    default_constraints: {
      max_uses: 1000,
      time_limit: 3600,
      resource_limits: {
        max_requests_per_minute: 60
      }
    },
    enable_session_tracking: true,
    enable_usage_logging: true
  },

  // Next.js app with role-based delegation
  nextjsApp: {
    allowed_issuers: ['did:example:trusted-issuer'],
    required_capabilities: ['web_access'],
    default_constraints: {
      max_uses: 500,
      time_limit: 1800,
      resource_limits: {
        max_requests_per_minute: 30
      }
    },
    enable_session_tracking: true,
    enable_usage_logging: true
  },

  // AI agent delegation with strict constraints
  aiAgent: {
    allowed_issuers: ['did:example:ai-platform'],
    required_capabilities: ['agent_inference', 'data_processing'],
    default_constraints: {
      max_uses: 50,
      time_limit: 900, // 15 minutes
      resource_limits: {
        max_requests_per_minute: 5,
        max_data_size: 5 * 1024 * 1024 // 5MB
      }
    },
    enable_session_tracking: true,
    enable_usage_logging: true
  }
} as const

// Export all examples for easy access
export { EXAMPLE_CONFIGS as examples }

/**
 * Create capability tokens for testing (development only)
 */
export function createTestCapabilityToken(overrides: Partial<X402CapabilityToken> = {}): X402CapabilityToken {
  const now = Math.floor(Date.now() / 1000)

  return {
    version: '1.0',
    issuer: 'did:example:test-issuer',
    delegate: 'did:example:test-delegate',
    capabilities: [
      {
        function_name: 'test_function',
        permissions: ['execute'],
        metadata: { test: true }
      }
    ],
    constraints: {
      max_uses: 100,
      time_limit: 3600
    },
    issued_at: now,
    expires_at: now + 3600,
    nonce: 'test-nonce-' + Math.random().toString(36).substr(2, 9),
    signature: 'test-signature-' + Math.random().toString(36).substr(2, 16),
    ...overrides
  }
}

/**
 * Utility functions for capability management
 */
export const CapabilityUtils = {
  /**
   * Check if a capability grants a specific permission
   */
  hasPermission(capability: X402Capability, permission: X402Permission): boolean {
    return capability.permissions.includes(permission)
  },

  /**
   * Filter capabilities by function name
   */
  filterByFunction(capabilities: X402Capability[], functionName: string): X402Capability[] {
    return capabilities.filter(cap => cap.function_name === functionName)
  },

  /**
   * Check if capabilities satisfy requirements
   */
  satisfiesRequirements(
    capabilities: X402Capability[],
    requirements: string[]
  ): boolean {
    const capabilityNames = capabilities.map(cap => cap.function_name)
    return requirements.every(req => capabilityNames.includes(req))
  },

  /**
   * Extract unique function names from capabilities
   */
  extractFunctionNames(capabilities: X402Capability[]): string[] {
    return [...new Set(capabilities.map(cap => cap.function_name))]
  },

  /**
   * Merge capability constraints
   */
  mergeConstraints(constraints: X402Constraints[]): X402Constraints {
    return constraints.reduce((merged, current) => ({
      max_uses: Math.min(merged.max_uses ?? Infinity, current.max_uses ?? Infinity),
      time_limit: Math.min(merged.time_limit ?? Infinity, current.time_limit ?? Infinity),
      ip_whitelist: merged.ip_whitelist || current.ip_whitelist,
      resource_limits: {
        max_requests_per_minute: Math.min(
          merged.resource_limits?.max_requests_per_minute ?? Infinity,
          current.resource_limits?.max_requests_per_minute ?? Infinity
        ),
        max_data_size: Math.min(
          merged.resource_limits?.max_data_size ?? Infinity,
          current.resource_limits?.max_data_size ?? Infinity
        )
      },
      spatial_constraints: merged.spatial_constraints || current.spatial_constraints
    }), {} as X402Constraints)
  }
} as const