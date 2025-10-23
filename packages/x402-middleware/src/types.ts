/**
 * X.402 Delegation Protocol Types
 *
 * X.402 enables secure delegation from users to AI agents
 * without handling private keys or altering blockchain logic.
 */

export interface X402CapabilityToken {
  // Core delegation token structure
  version: string
  issuer: string // User who created the delegation
  delegate: string // AI agent receiving delegation
  capabilities: X402Capability[]
  constraints: X402Constraints
  issued_at: number // Unix timestamp
  expires_at: number // Unix timestamp
  nonce: string // Random value for uniqueness
  signature: string // Cryptographic signature
}

export interface X402Capability {
  // Specific capability being delegated
  function_name: string
  permissions: X402Permission[]
  metadata?: Record<string, any>
}

export type X402Permission =
  | 'read'
  | 'write'
  | 'execute'
  | 'admin'
  | 'delegate'

export interface X402Constraints {
  // Usage constraints for the delegation
  max_uses?: number // Maximum number of uses
  time_limit?: number // Time window for usage (seconds)
  ip_whitelist?: string[] // Allowed IP addresses
  resource_limits?: {
    max_requests_per_minute?: number
    max_data_size?: number
  }
  spatial_constraints?: {
    allowed_regions?: string[]
    excluded_regions?: string[]
  }
}

export interface X402ValidationResult {
  valid: boolean
  token: X402CapabilityToken
  capabilities: string[] // Extracted capabilities
  constraints_met: boolean
  remaining_uses?: number
  time_remaining?: number
  errors: string[]
  warnings: string[]
}

export interface X402Session {
  // Active delegation session
  session_id: string
  token: X402CapabilityToken
  created_at: number
  last_used: number
  usage_count: number
  active: boolean
}

export interface X402UsageRecord {
  // Record of capability usage
  session_id: string
  capability: string
  used_at: number
  parameters?: any[]
  result: 'success' | 'failure' | 'denied'
  execution_time_ms?: number
}

export interface X402DelegationRequest {
  // Request to create a new delegation
  delegate: string // AI agent address
  capabilities: X402Capability[]
  constraints: X402Constraints
  expires_in?: number // Seconds from now (default: 24 hours)
  metadata?: Record<string, any>
}

export interface X402Config {
  // Service provider configuration for X.402
  allowed_issuers?: string[] // List of trusted issuers
  required_capabilities?: string[] // Capabilities required for access
  default_constraints?: X402Constraints // Default constraints if not specified
  token_cache_ttl?: number // Token cache time-to-live (seconds)
  enable_session_tracking?: boolean // Track delegation sessions
  enable_usage_logging?: boolean // Log capability usage
  validation_endpoint?: string // External validation service
}

export interface X402Request {
  // HTTP request with X.402 delegation information
  url: string
  method: string
  headers: Record<string, string>
  body?: any
  query: Record<string, string>
  ip?: string
  user_agent?: string
  timestamp: number
}

export interface X402Response {
  // HTTP response from X.402 middleware
  status: number
  headers: Record<string, string>
  body?: any
}

export interface X402MiddlewareOptions {
  // Middleware configuration options
  strict_mode?: boolean // Fail fast on any validation errors
  log_level?: 'debug' | 'info' | 'warn' | 'error'
  custom_headers?: Record<string, string>
  onTokenValid?: (token: X402CapabilityToken, req: X402Request) => void
  onTokenInvalid?: (errors: string[], req: X402Request) => void
  onCapabilityUsed?: (capability: string, req: X402Request) => void
  enable_metrics?: boolean
}

// Express.js Types
export interface X402ExpressRequest {
  url?: string
  path?: string
  method?: string
  headers?: Record<string, string>
  query?: Record<string, string>
  body?: any
  ip?: string
  x402Delegation?: {
    token: X402CapabilityToken
    session?: X402Session
  }
}

export interface X402ExpressResponse {
  status(code: number): X402ExpressResponse
  set(name: string, value: string): X402ExpressResponse
  json(body: any): void
  send(body?: any): void
}

// Next.js Types
export interface X402NextRequest {
  url?: string
  pathname?: string
  method?: string
  headers: Headers
  nextUrl?: {
    pathname: string
  }
  ip?: string
  geo?: {
    country?: string
    region?: string
    city?: string
  }
  x402Delegation?: {
    token: X402CapabilityToken
    session?: X402Session
  }
}

// Function metadata for AI agent discovery
export interface X402FunctionMetadata {
  name: string
  description: string
  parameters: X402ParameterMetadata[]
  returns: X402ParameterMetadata
  permissions_required: X402Permission[]
  examples: X402FunctionExample[]
  tags?: string[]
}

export interface X402ParameterMetadata {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  required: boolean
  default_value?: any
  validation?: {
    min?: number
    max?: number
    pattern?: string
    enum?: any[]
  }
}

export interface X402FunctionExample {
  description: string
  parameters: Record<string, any>
  expected_result: any
}

export interface X402SDKManifest {
  // Complete SDK manifest for AI agent discovery
  name: string
  version: string
  description: string
  functions: X402FunctionMetadata[]
  capabilities: string[]
  supported_constraints: string[]
  delegation_endpoints: string[]
  documentation_url?: string
  contact_info?: {
    email?: string
    website?: string
    support?: string
  }
}

// Error Types
export class X402MiddlewareError extends Error {
  constructor(
    message: string,
    public code: X402ErrorCode,
    public details?: any
  ) {
    super(message)
    this.name = 'X402MiddlewareError'
  }
}

export enum X402ErrorCode {
  INVALID_TOKEN_FORMAT = 'INVALID_TOKEN_FORMAT',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  UNAUTHORIZED_ISSUER = 'UNAUTHORIZED_ISSUER',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  DELEGATION_REVOKED = 'DELEGATION_REVOKED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

// Event Types
export interface X402Event {
  type: 'token_validated' | 'token_invalid' | 'capability_used' | 'session_created' | 'session_expired'
  data: any
  timestamp: number
  request?: X402Request
}

// Statistics
export interface X402Statistics {
  totalRequests: number
  validTokens: number
  invalidTokens: number
  capabilitiesUsed: Record<string, number>
  activeSessions: number
  averageValidationTimeMs: number
  errorRates: Record<string, number>
}

// Logger Interface
export interface X402Logger {
  debug(message: string, data?: any): void
  info(message: string, data?: any): void
  warn(message: string, data?: any): void
  error(message: string, error?: Error, data?: any): void
}

// Cache Interface
export interface X402Cache {
  get(key: string): Promise<X402CapabilityToken | null>
  set(key: string, token: X402CapabilityToken, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}

// Rate Limiting
export interface X402RateLimit {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

// Utility Types
export type X402RequestHandler = (
  req: X402Request,
  options?: X402MiddlewareOptions
) => Promise<X402Response | null>

export type X402DelegationFunction = (
  token: X402CapabilityToken,
  requiredCapabilities: string[],
  endpoint: string
) => Promise<X402ValidationResult>

// Default values
export const DEFAULT_CONFIG: Partial<X402Config> = {
  token_cache_ttl: 3600, // 1 hour
  enable_session_tracking: true,
  enable_usage_logging: true,
  default_constraints: {
    max_uses: 1000,
    time_limit: 3600, // 1 hour
    resource_limits: {
      max_requests_per_minute: 60
    }
  }
}

export const DEFAULT_OPTIONS: Partial<X402MiddlewareOptions> = {
  strict_mode: false,
  log_level: 'info',
  enable_metrics: true
}