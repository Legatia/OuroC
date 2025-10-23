/**
 * X.402 Delegation Verification Service
 *
 * Core service layer for X.402 delegation protocol implementation.
 * Handles capability token validation, session management, and constraint enforcement.
 */

import {
  X402CapabilityToken,
  X402ValidationResult,
  X402Session,
  X402UsageRecord,
  X402Config,
  X402Request,
  X402Cache,
  X402Logger,
  X402Event,
  X402Statistics,
  X402ErrorCode,
  X402MiddlewareError,
  DEFAULT_CONFIG
} from './types'

export class X402DelegationService {
  private config: Required<X402Config>
  private sessions: Map<string, X402Session> = new Map()
  private usageRecords: X402UsageRecord[] = []
  private statistics: X402Statistics
  private cache?: X402Cache
  private logger?: X402Logger
  private eventHandlers: Map<string, Function[]> = new Map()

  constructor(config: X402Config = {}, dependencies: { cache?: X402Cache, logger?: X402Logger } = {}) {
    // Merge with defaults
    this.config = {
      allowed_issuers: config.allowed_issuers || [],
      required_capabilities: config.required_capabilities || [],
      default_constraints: {
        max_uses: 1000,
        time_limit: 3600,
        resource_limits: {
          max_requests_per_minute: 60
        },
        ...config.default_constraints
      },
      token_cache_ttl: config.token_cache_ttl || 3600,
      enable_session_tracking: config.enable_session_tracking ?? true,
      enable_usage_logging: config.enable_usage_logging ?? true,
      validation_endpoint: config.validation_endpoint || undefined
    }

    this.cache = dependencies.cache
    this.logger = dependencies.logger

    this.statistics = {
      totalRequests: 0,
      validTokens: 0,
      invalidTokens: 0,
      capabilitiesUsed: {},
      activeSessions: 0,
      averageValidationTimeMs: 0,
      errorRates: {}
    }

    this.log('info', 'X.402 Delegation Service initialized', {
      config: this.config,
      hasCache: !!this.cache,
      hasLogger: !!this.logger
    })
  }

  /**
   * Main delegation validation entry point
   */
  async validateDelegation(request: X402Request): Promise<X402ValidationResult> {
    const startTime = Date.now()

    try {
      this.statistics.totalRequests++
      this.log('debug', 'Starting delegation validation', {
        url: request.url,
        method: request.method,
        ip: request.ip
      })

      // 1. Extract capability token from request
      const token = await this.extractTokenFromRequest(request)
      if (!token) {
        const error = new X402MiddlewareError(
          'No X.402 capability token found in request',
          X402ErrorCode.INVALID_TOKEN_FORMAT
        )
        return this.createValidationResult(token, false, [], false, [error.message])
      }

      // 2. Basic token validation
      const basicValidation = await this.validateTokenStructure(token)
      if (!basicValidation.valid) {
        this.statistics.invalidTokens++
        return basicValidation
      }

      // 3. Verify cryptographic signature
      const signatureValid = await this.verifyTokenSignature(token)
      if (!signatureValid) {
        const error = new X402MiddlewareError(
          'Invalid token signature',
          X402ErrorCode.INVALID_SIGNATURE
        )
        this.statistics.invalidTokens++
        return this.createValidationResult(token, false, [], false, [error.message])
      }

      // 4. Check issuer authorization
      const issuerAuthorized = await this.validateIssuer(token.issuer)
      if (!issuerAuthorized) {
        const error = new X402MiddlewareError(
          `Unauthorized issuer: ${token.issuer}`,
          X402ErrorCode.UNAUTHORIZED_ISSUER
        )
        this.statistics.invalidTokens++
        return this.createValidationResult(token, false, [], false, [error.message])
      }

      // 5. Check token expiry
      const now = Math.floor(Date.now() / 1000)
      if (token.expires_at < now) {
        const error = new X402MiddlewareError(
          'Token has expired',
          X402ErrorCode.TOKEN_EXPIRED
        )
        this.statistics.invalidTokens++
        return this.createValidationResult(token, false, [], false, [error.message])
      }

      // 6. Extract capabilities
      const capabilities = token.capabilities.map(cap => cap.function_name)

      // 7. Check required capabilities
      if (this.config.required_capabilities.length > 0) {
        const missingCaps = this.config.required_capabilities.filter(
          required => !capabilities.includes(required)
        )
        if (missingCaps.length > 0) {
          const error = new X402MiddlewareError(
            `Missing required capabilities: ${missingCaps.join(', ')}`,
            X402ErrorCode.INSUFFICIENT_PERMISSIONS
          )
          this.statistics.invalidTokens++
          return this.createValidationResult(token, capabilities, false, false, [error.message])
        }
      }

      // 8. Validate constraints
      const constraintValidation = await this.validateConstraints(token, request)
      if (!constraintValidation.valid) {
        this.statistics.invalidTokens++
        return this.createValidationResult(token, capabilities, false, false, constraintValidation.errors)
      }

      // 9. Manage session
      let session: X402Session | null = null
      if (this.config.enable_session_tracking) {
        session = await this.getOrCreateSession(token)
        if (!session.active) {
          const error = new X402MiddlewareError(
            'Delegation session is not active',
            X402ErrorCode.DELEGATION_REVOKED
          )
          this.statistics.invalidTokens++
          return this.createValidationResult(token, capabilities, false, false, [error.message])
        }
      }

      // 10. Record usage
      if (this.config.enable_usage_logging) {
        await this.recordUsage(token, request, 'success')
      }

      // Update statistics
      this.statistics.validTokens++
      const validationTime = Date.now() - startTime
      this.updateAverageValidationTime(validationTime)

      // Emit success event
      this.emitEvent('token_validated', {
        token,
        session,
        request,
        validationTime
      })

      this.log('info', 'Delegation validation successful', {
        tokenIssuer: token.issuer,
        delegate: token.delegate,
        capabilities: capabilities.length,
        sessionId: session?.session_id,
        validationTime
      })

      return this.createValidationResult(token, capabilities, true, true, [], {
        remaining_uses: this.calculateRemainingUses(token),
        time_remaining: token.expires_at - now
      })

    } catch (error) {
      this.statistics.invalidTokens++
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error'

      this.log('error', 'Delegation validation failed', {
        error: errorMessage,
        url: request.url,
        method: request.method
      })

      this.emitEvent('token_invalid', {
        error: errorMessage,
        request
      })

      return this.createValidationResult(
        undefined,
        [],
        false,
        false,
        [errorMessage]
      )
    }
  }

  /**
   * Extract X.402 capability token from request headers/body
   */
  private async extractTokenFromRequest(request: X402Request): Promise<X402CapabilityToken | null> {
    // Try Authorization header first
    const authHeader = request.headers['authorization']
    if (authHeader?.startsWith('X402 ')) {
      try {
        const tokenData = authHeader.substring(5) // Remove "X402 " prefix
        return JSON.parse(atob(tokenData)) as X402CapabilityToken
      } catch (error) {
        this.log('warn', 'Failed to parse token from Authorization header', { error })
      }
    }

    // Try X-Capability-Token header
    const capabilityHeader = request.headers['x-capability-token']
    if (capabilityHeader) {
      try {
        return JSON.parse(capabilityHeader) as X402CapabilityToken
      } catch (error) {
        this.log('warn', 'Failed to parse token from X-Capability-Token header', { error })
      }
    }

    // Try request body for POST requests
    if (request.body && typeof request.body === 'object') {
      const bodyToken = request.body['x402_token'] || request.body['capability_token']
      if (bodyToken) {
        return bodyToken as X402CapabilityToken
      }
    }

    return null
  }

  /**
   * Validate basic token structure
   */
  private async validateTokenStructure(token: X402CapabilityToken): Promise<X402ValidationResult> {
    const errors: string[] = []

    // Required fields
    const requiredFields = [
      'version', 'issuer', 'delegate', 'capabilities',
      'constraints', 'issued_at', 'expires_at', 'nonce', 'signature'
    ]

    for (const field of requiredFields) {
      if (!(field in token)) {
        errors.push(`Missing required field: ${field}`)
      }
    }

    // Validate data types
    if (token.capabilities && !Array.isArray(token.capabilities)) {
      errors.push('Capabilities must be an array')
    }

    if (token.issued_at && typeof token.issued_at !== 'number') {
      errors.push('Issued at must be a number')
    }

    if (token.expires_at && typeof token.expires_at !== 'number') {
      errors.push('Expires at must be a number')
    }

    if (errors.length > 0) {
      return this.createValidationResult(token, [], false, false, errors)
    }

    // Validate capabilities structure
    for (const capability of token.capabilities) {
      if (!capability.function_name) {
        errors.push('Capability missing function_name')
      }
      if (!capability.permissions || !Array.isArray(capability.permissions)) {
        errors.push('Capability missing valid permissions array')
      }
    }

    return this.createValidationResult(token, [], errors.length === 0, errors.length === 0, errors)
  }

  /**
   * Verify cryptographic signature
   */
  private async verifyTokenSignature(token: X402CapabilityToken): Promise<boolean> {
    try {
      // In a real implementation, this would verify the signature using the issuer's public key
      // For now, we'll implement a basic check that the signature exists and is properly formatted

      if (!token.signature || token.signature.length === 0) {
        return false
      }

      // Create the payload that should have been signed
      const payload = {
        version: token.version,
        issuer: token.issuer,
        delegate: token.delegate,
        capabilities: token.capabilities,
        constraints: token.constraints,
        issued_at: token.issued_at,
        expires_at: token.expires_at,
        nonce: token.nonce
      }

      const payloadString = JSON.stringify(payload)

      // Mock signature verification - in production, use actual cryptographic verification
      // This would involve:
      // 1. Getting the issuer's public key from a registry
      // 2. Verifying the signature against the payload
      // 3. Checking the signature algorithm and key validity

      const expectedSignatureLength = 64 // Example for Ed25519 signature
      const signatureValid = token.signature.length >= expectedSignatureLength

      if (!signatureValid) {
        this.log('warn', 'Invalid signature format', {
          issuer: token.issuer,
          signatureLength: token.signature.length
        })
      }

      return signatureValid

    } catch (error) {
      this.log('error', 'Signature verification failed', { error })
      return false
    }
  }

  /**
   * Validate issuer authorization
   */
  private async validateIssuer(issuer: string): Promise<boolean> {
    // If no allowed issuers are specified, allow any issuer
    if (this.config.allowed_issuers.length === 0) {
      return true
    }

    const isAuthorized = this.config.allowed_issuers.includes(issuer)

    if (!isAuthorized) {
      this.log('warn', 'Unauthorized issuer attempted access', { issuer })
    }

    return isAuthorized
  }

  /**
   * Validate token constraints against request
   */
  private async validateConstraints(token: X402CapabilityToken, request: X402Request): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []
    const constraints = token.constraints

    // Check usage limits
    if (constraints.max_uses) {
      const currentUsage = await this.getUsageCount(token)
      if (currentUsage >= constraints.max_uses) {
        errors.push(`Usage limit exceeded: ${currentUsage}/${constraints.max_uses}`)
      }
    }

    // Check time limits
    if (constraints.time_limit) {
      const elapsed = Math.floor(Date.now() / 1000) - token.issued_at
      if (elapsed > constraints.time_limit) {
        errors.push(`Time limit exceeded: ${elapsed}s > ${constraints.time_limit}s`)
      }
    }

    // Check IP whitelist
    if (constraints.ip_whitelist && constraints.ip_whitelist.length > 0) {
      if (!request.ip || !constraints.ip_whitelist.includes(request.ip)) {
        errors.push(`IP address not whitelisted: ${request.ip}`)
      }
    }

    // Check rate limits
    if (constraints.resource_limits?.max_requests_per_minute) {
      const recentUsage = await this.getRecentUsageCount(token, 60) // Last 60 seconds
      if (recentUsage >= constraints.resource_limits.max_requests_per_minute) {
        errors.push(`Rate limit exceeded: ${recentUsage}/min`)
      }
    }

    // Check spatial constraints
    if (constraints.spatial_constraints?.allowed_regions && request.ip) {
      // In a real implementation, this would use GeoIP lookup
      // For now, we'll skip this check
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Get or create delegation session
   */
  private async getOrCreateSession(token: X402CapabilityToken): Promise<X402Session> {
    const sessionId = this.generateSessionId(token)

    let session = this.sessions.get(sessionId)
    if (!session) {
      session = {
        session_id: sessionId,
        token,
        created_at: Date.now(),
        last_used: Date.now(),
        usage_count: 0,
        active: true
      }
      this.sessions.set(sessionId, session)
      this.statistics.activeSessions++

      this.emitEvent('session_created', { session, token })

    } else {
      // Update existing session
      session.last_used = Date.now()
      session.usage_count++
    }

    return session
  }

  /**
   * Record capability usage
   */
  private async recordUsage(token: X402CapabilityToken, request: X402Request, result: 'success' | 'failure' | 'denied'): Promise<void> {
    if (!this.config.enable_usage_logging) return

    const record: X402UsageRecord = {
      session_id: this.generateSessionId(token),
      capability: request.url, // Simplified - would be more specific
      used_at: Date.now(),
      parameters: [], // Would extract from request
      result,
      execution_time_ms: 0 // Would track actual execution time
    }

    this.usageRecords.push(record)

    // Keep only recent usage records (last 10000)
    if (this.usageRecords.length > 10000) {
      this.usageRecords = this.usageRecords.slice(-10000)
    }

    // Update capability usage statistics
    for (const capability of token.capabilities) {
      const capName = capability.function_name
      this.statistics.capabilitiesUsed[capName] = (this.statistics.capabilitiesUsed[capName] || 0) + 1
    }

    this.emitEvent('capability_used', {
      capability: record.capability,
      result,
      token,
      request
    })
  }

  /**
   * Get usage count for a token
   */
  private async getUsageCount(token: X402CapabilityToken): Promise<number> {
    const sessionId = this.generateSessionId(token)
    return this.usageRecords.filter(record => record.session_id === sessionId).length
  }

  /**
   * Get recent usage count within time window
   */
  private async getRecentUsageCount(token: X402CapabilityToken, windowSeconds: number): Promise<number> {
    const sessionId = this.generateSessionId(token)
    const cutoff = Date.now() - (windowSeconds * 1000)

    return this.usageRecords.filter(record =>
      record.session_id === sessionId &&
      record.used_at >= cutoff
    ).length
  }

  /**
   * Calculate remaining uses for a token
   */
  private calculateRemainingUses(token: X402CapabilityToken): number {
    const maxUses = token.constraints.max_uses
    if (!maxUses) return Infinity

    const currentUsage = this.usageRecords.filter(
      record => record.session_id === this.generateSessionId(token)
    ).length

    return Math.max(0, maxUses - currentUsage)
  }

  /**
   * Generate session ID from token
   */
  private generateSessionId(token: X402CapabilityToken): string {
    // Create a deterministic session ID from token
    const payload = `${token.issuer}:${token.delegate}:${token.nonce}`
    return btoa(payload).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
  }

  /**
   * Create validation result
   */
  private createValidationResult(
    token: X402CapabilityToken | undefined,
    capabilities: string[],
    valid: boolean,
    constraintsMet: boolean,
    errors: string[],
    additionalData?: { remaining_uses?: number; time_remaining?: number }
  ): X402ValidationResult {
    return {
      valid,
      token: token!,
      capabilities,
      constraints_met: constraintsMet,
      remaining_uses: additionalData?.remaining_uses,
      time_remaining: additionalData?.time_remaining,
      errors,
      warnings: [] // TODO: Add warning logic
    }
  }

  /**
   * Update average validation time
   */
  private updateAverageValidationTime(validationTimeMs: number): void {
    const totalRequests = this.statistics.totalRequests
    const currentAverage = this.statistics.averageValidationTimeMs

    this.statistics.averageValidationTimeMs =
      (currentAverage * (totalRequests - 1) + validationTimeMs) / totalRequests
  }

  /**
   * Emit event to registered handlers
   */
  private emitEvent(type: X402Event['type'], data: any): void {
    const handlers = this.eventHandlers.get(type) || []
    const event: X402Event = {
      type,
      data,
      timestamp: Date.now()
    }

    handlers.forEach(handler => {
      try {
        handler(event)
      } catch (error) {
        this.log('error', 'Event handler failed', { type, error })
      }
    })
  }

  /**
   * Register event handler
   */
  public on(event: X402Event['type'], handler: Function): void {
    const handlers = this.eventHandlers.get(event) || []
    handlers.push(handler)
    this.eventHandlers.set(event, handlers)
  }

  /**
   * Get current statistics
   */
  public getStatistics(): X402Statistics {
    return { ...this.statistics }
  }

  /**
   * Get active sessions
   */
  public getActiveSessions(): X402Session[] {
    return Array.from(this.sessions.values()).filter(session => session.active)
  }

  /**
   * Revoke a delegation session
   */
  public async revokeSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.active = false
      this.statistics.activeSessions--

      this.emitEvent('session_expired', { session })
      this.log('info', 'Session revoked', { sessionId })

      return true
    }
    return false
  }

  /**
   * Clean up expired sessions and old usage records
   */
  public async cleanup(): Promise<void> {
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)

    // Clean up inactive sessions
    let cleanedSessions = 0
    for (const [sessionId, session] of this.sessions.entries()) {
      if (!session.active || session.last_used < oneHourAgo) {
        this.sessions.delete(sessionId)
        cleanedSessions++
      }
    }

    // Clean up old usage records
    const originalLength = this.usageRecords.length
    this.usageRecords = this.usageRecords.filter(record => record.used_at > oneHourAgo)
    const cleanedRecords = originalLength - this.usageRecords.length

    this.log('info', 'Cleanup completed', {
      cleanedSessions,
      cleanedRecords,
      activeSessions: this.sessions.size
    })
  }

  /**
   * Logging helper
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (this.logger) {
      this.logger[level](message, data)
    } else {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] [X402:${level.toUpperCase()}] ${message}`, data || '')
    }
  }
}

// Export factory function for easy instantiation
export function createX402DelegationService(
  config?: X402Config,
  dependencies?: { cache?: X402Cache, logger?: X402Logger }
): X402DelegationService {
  return new X402DelegationService(config, dependencies)
}