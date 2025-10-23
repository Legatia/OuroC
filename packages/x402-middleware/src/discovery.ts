/**
 * X.402 Discovery System
 *
 * Allows AI agents to discover X.402-protected APIs, their capabilities,
 * and delegation requirements. Implements a registry-based approach for
 * API providers to publish their X.402 capabilities.
 */

import {
  X402SDKManifest,
  X402FunctionMetadata,
  X402CapabilityToken,
  X402DelegationRequest,
  X402Config,
  X402Logger
} from './types'

export interface X402APIService {
  id: string
  name: string
  description: string
  version: string
  base_url: string
  provider: {
    name: string
    website?: string
    support?: string
    contact?: string
  }
  x402_config: X402Config
  manifest: X402SDKManifest
  health_endpoint?: string
  delegation_endpoints: string[]
  tags: string[]
  created_at: number
  updated_at: number
  last_verified?: number
  status: 'active' | 'inactive' | 'deprecated'
}

export interface X402DiscoveryConfig {
  registry_url?: string
  auto_refresh_interval?: number // minutes
  cache_ttl?: number // minutes
  verify_services?: boolean
  preferred_tags?: string[]
  exclude_tags?: string[]
}

export interface X402SearchOptions {
  query?: string
  tags?: string[]
  capabilities?: string[]
  providers?: string[]
  status?: X402APIService['status'][]
  limit?: number
  offset?: number
}

export interface X402SearchResult {
  services: X402APIService[]
  total: number
  has_more: boolean
  search_time_ms: number
}

export class X402DiscoveryService {
  private config: Required<X402DiscoveryConfig>
  private services: Map<string, X402APIService> = new Map()
  private logger?: X402Logger
  private refreshTimer?: NodeJS.Timeout
  private isInitialized = false

  constructor(config: X402DiscoveryConfig = {}, logger?: X402Logger) {
    this.config = {
      registry_url: config.registry_url || 'https://registry.ouroc.network/x402',
      auto_refresh_interval: config.auto_refresh_interval || 60, // 1 hour
      cache_ttl: config.cache_ttl || 30, // 30 minutes
      verify_services: config.verify_services ?? true,
      preferred_tags: config.preferred_tags || [],
      exclude_tags: config.exclude_tags || []
    }

    this.logger = logger

    this.log('info', 'X.402 Discovery Service initialized', {
      config: this.config
    })
  }

  /**
   * Initialize the discovery service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      this.log('info', 'Initializing X.402 Discovery Service')

      // Load initial registry data
      await this.loadRegistry()

      // Start auto-refresh timer
      if (this.config.auto_refresh_interval > 0) {
        this.startAutoRefresh()
      }

      this.isInitialized = true
      this.log('info', 'X.402 Discovery Service initialized successfully', {
        servicesCount: this.services.size,
        autoRefreshInterval: this.config.auto_refresh_interval
      })

    } catch (error) {
      this.log('error', 'Failed to initialize discovery service', { error })
      throw error
    }
  }

  /**
   * Register a new X.402-protected API service
   */
  async registerService(service: Omit<X402APIService, 'id' | 'created_at' | 'updated_at' | 'last_verified'>): Promise<X402APIService> {
    const now = Date.now()
    const serviceId = this.generateServiceId(service.name, service.base_url)

    const newService: X402APIService = {
      id: serviceId,
      ...service,
      created_at: now,
      updated_at: now,
      last_verified: this.config.verify_services ? now : undefined
    }

    // Validate service configuration
    this.validateService(newService)

    // Verify service if enabled
    if (this.config.verify_services) {
      const isValid = await this.verifyService(newService)
      if (!isValid) {
        throw new Error(`Service verification failed: ${service.name}`)
      }
    }

    // Store service
    this.services.set(serviceId, newService)

    this.log('info', 'Service registered successfully', {
      serviceId: newService.id,
      name: newService.name,
      baseUrl: newService.base_url
    })

    return newService
  }

  /**
   * Search for X.402-protected services
   */
  async searchServices(options: X402SearchOptions = {}): Promise<X402SearchResult> {
    const startTime = Date.now()

    try {
      let services = Array.from(this.services.values())

      // Apply filters
      services = this.applyFilters(services, options)

      // Apply search query
      if (options.query) {
        services = this.applySearchQuery(services, options.query)
      }

      // Sort by relevance (newest first, then by name)
      services.sort((a, b) => {
        if (a.updated_at !== b.updated_at) {
          return b.updated_at - a.updated_at
        }
        return a.name.localeCompare(b.name)
      })

      const total = services.length
      const offset = options.offset || 0
      const limit = Math.min(options.limit || 50, 100) // Max 100 results

      const paginatedServices = services.slice(offset, offset + limit)

      const searchTime = Date.now() - startTime

      this.log('debug', 'Service search completed', {
        query: options.query,
        total,
        returned: paginatedServices.length,
        searchTime
      })

      return {
        services: paginatedServices,
        total,
        has_more: offset + limit < total,
        search_time_ms: searchTime
      }

    } catch (error) {
      this.log('error', 'Service search failed', { error, options })
      return {
        services: [],
        total: 0,
        has_more: false,
        search_time_ms: Date.now() - startTime
      }
    }
  }

  /**
   * Get detailed information about a specific service
   */
  async getService(serviceId: string): Promise<X402APIService | null> {
    const service = this.services.get(serviceId)

    if (!service) {
      return null
    }

    // Verify service if it hasn't been verified recently
    if (this.config.verify_services && this.shouldVerify(service)) {
      const isValid = await this.verifyService(service)
      if (isValid) {
        service.last_verified = Date.now()
        service.updated_at = Date.now()
      } else {
        service.status = 'inactive'
        this.log('warn', 'Service verification failed, marked as inactive', {
          serviceId,
          name: service.name
        })
      }
    }

    return service
  }

  /**
   * Get services that provide specific capabilities
   */
  async getServicesByCapabilities(capabilities: string[]): Promise<X402APIService[]> {
    const result = await this.searchServices({
      capabilities,
      limit: 100
    })

    return result.services
  }

  /**
   * Get services by provider
   */
  async getServicesByProvider(providerName: string): Promise<X402APIService[]> {
    const result = await this.searchServices({
      providers: [providerName],
      limit: 100
    })

    return result.services
  }

  /**
   * Get popular services (based on usage and recent updates)
   */
  async getPopularServices(limit: number = 10): Promise<X402APIService[]> {
    const result = await this.searchServices({
      status: ['active'],
      limit
    })

    return result.services
  }

  /**
   * Get recently updated services
   */
  async getRecentlyUpdatedServices(limit: number = 10): Promise<X402APIService[]> {
    let services = Array.from(this.services.values())
      .filter(service => service.status === 'active')
      .sort((a, b) => b.updated_at - a.updated_at)
      .slice(0, limit)

    return services
  }

  /**
   * Create a delegation request for a specific service
   */
  async createDelegationRequest(
    serviceId: string,
    delegate: string,
    capabilities: string[],
    constraints?: any
  ): Promise<X402DelegationRequest> {
    const service = await this.getService(serviceId)
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`)
    }

    if (service.status !== 'active') {
      throw new Error(`Service is not active: ${service.status}`)
    }

    // Validate requested capabilities
    const availableCapabilities = service.manifest.functions.map(f => f.name)
    const invalidCapabilities = capabilities.filter(cap => !availableCapabilities.includes(cap))

    if (invalidCapabilities.length > 0) {
      throw new Error(`Invalid capabilities: ${invalidCapabilities.join(', ')}`)
    }

    // Create capability objects
    const capabilityObjects = capabilities.map(capName => {
      const functionMeta = service.manifest.functions.find(f => f.name === capName)
      return {
        function_name: capName,
        permissions: functionMeta?.permissions_required || ['execute'],
        metadata: {
          service_id: serviceId,
          service_name: service.name,
          version: service.version
        }
      }
    })

    return {
      delegate,
      capabilities: capabilityObjects,
      constraints: {
        ...service.x402_config.default_constraints,
        ...constraints
      },
      expires_in: 86400, // 24 hours default
      metadata: {
        service_id: serviceId,
        requested_at: Date.now(),
        client_info: {
          user_agent: 'X402-Discovery-Service/1.0.0'
        }
      }
    }
  }

  /**
   * Export service registry data
   */
  async exportRegistry(format: 'json' | 'yaml' = 'json'): Promise<string> {
    const services = Array.from(this.services.values())

    const exportData = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      total_services: services.length,
      services: services.map(service => ({
        ...service,
        // Remove sensitive internal data
        x402_config: {
          allowed_issuers: service.x402_config.allowed_issuers,
          required_capabilities: service.x402_config.required_capabilities,
          enable_session_tracking: service.x402_config.enable_session_tracking,
          enable_usage_logging: service.x402_config.enable_usage_logging
        }
      }))
    }

    if (format === 'yaml') {
      // In a real implementation, use a YAML library
      return JSON.stringify(exportData, null, 2)
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Import service registry data
   */
  async importRegistry(data: string, format: 'json' | 'yaml' = 'json'): Promise<number> {
    let importData: any

    try {
      if (format === 'json') {
        importData = JSON.parse(data)
      } else {
        // In a real implementation, use a YAML parser
        importData = JSON.parse(data)
      }
    } catch (error) {
      throw new Error(`Invalid ${format} data: ${error}`)
    }

    if (!importData.services || !Array.isArray(importData.services)) {
      throw new Error('Invalid registry data: missing services array')
    }

    let importedCount = 0
    for (const serviceData of importData.services) {
      try {
        await this.registerService(serviceData)
        importedCount++
      } catch (error) {
        this.log('warn', 'Failed to import service', {
          name: serviceData.name,
          error: error
        })
      }
    }

    this.log('info', 'Registry import completed', {
      totalServices: importData.services.length,
      importedCount,
      failedCount: importData.services.length - importedCount
    })

    return importedCount
  }

  /**
   * Load registry from remote source
   */
  private async loadRegistry(): Promise<void> {
    try {
      this.log('debug', 'Loading service registry', {
        url: this.config.registry_url
      })

      // In a real implementation, this would fetch from the registry URL
      // For now, we'll load some example services
      await this.loadExampleServices()

      this.log('info', 'Registry loaded successfully', {
        servicesCount: this.services.size
      })

    } catch (error) {
      this.log('error', 'Failed to load registry', { error })
      // Continue with empty registry - services can be registered manually
    }
  }

  /**
   * Load example services for demonstration
   */
  private async loadExampleServices(): Promise<void> {
    const exampleServices: Omit<X402APIService, 'id' | 'created_at' | 'updated_at' | 'last_verified'>[] = [
      {
        name: 'AI Chat API',
        description: 'Advanced AI conversation service with multiple models',
        version: '2.1.0',
        base_url: 'https://api.ai-chat.example.com',
        provider: {
          name: 'AIChat Corp',
          website: 'https://ai-chat.example.com',
          support: 'support@ai-chat.example.com'
        },
        x402_config: {
          allowed_issuers: ['did:example:ai-chat'],
          required_capabilities: [],
          default_constraints: {
            max_uses: 1000,
            time_limit: 3600,
            resource_limits: {
              max_requests_per_minute: 60
            }
          },
          token_cache_ttl: 1800,
          enable_session_tracking: true,
          enable_usage_logging: true
        },
        manifest: {
          name: 'ai-chat-api',
          version: '2.1.0',
          description: 'AI conversation API with GPT-4 and Claude support',
          functions: [
            {
              name: 'chat_completion',
              description: 'Generate AI response to user message',
              parameters: [
                {
                  name: 'message',
                  type: 'string',
                  description: 'User message to process',
                  required: true
                },
                {
                  name: 'model',
                  type: 'string',
                  description: 'AI model to use',
                  required: false,
                  default_value: 'gpt-4',
                  validation: {
                    enum: ['gpt-4', 'gpt-3.5-turbo', 'claude-3']
                  }
                },
                {
                  name: 'max_tokens',
                  type: 'number',
                  description: 'Maximum tokens in response',
                  required: false,
                  default_value: 1000,
                  validation: {
                    min: 1,
                    max: 4000
                  }
                }
              ],
              returns: {
                name: 'response',
                type: 'object',
                description: 'AI-generated response',
                required: false
              },
              permissions_required: ['execute'],
              examples: [
                {
                  description: 'Basic chat completion',
                  parameters: {
                    message: 'Hello, how are you?',
                    model: 'gpt-4'
                  },
                  expected_result: {
                    response: 'Hello! I\'m doing well, thank you for asking...'
                  }
                }
              ],
              tags: ['ai', 'chat', 'conversation']
            }
          ],
          capabilities: ['chat_completion'],
          supported_constraints: ['max_uses', 'time_limit', 'rate_limit'],
          delegation_endpoints: ['https://api.ai-chat.example.com/x402/delegate'],
          documentation_url: 'https://docs.ai-chat.example.com',
          contact_info: {
            email: 'support@ai-chat.example.com',
            website: 'https://ai-chat.example.com'
          }
        },
        health_endpoint: '/health',
        delegation_endpoints: ['/x402/delegate'],
        tags: ['ai', 'chat', 'conversation', 'gpt'],
        status: 'active'
      }
    ]

    for (const service of exampleServices) {
      await this.registerService(service)
    }
  }

  /**
   * Apply filters to service list
   */
  private applyFilters(services: X402APIService[], options: X402SearchOptions): X402APIService[] {
    let filtered = services

    // Status filter
    if (options.status && options.status.length > 0) {
      filtered = filtered.filter(service =>
        options.status!.includes(service.status)
      )
    }

    // Tags filter
    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter(service =>
        options.tags!.some(tag => service.tags.includes(tag))
      )
    }

    // Capabilities filter
    if (options.capabilities && options.capabilities.length > 0) {
      filtered = filtered.filter(service =>
        options.capabilities!.some(cap =>
          service.manifest.capabilities.includes(cap)
        )
      )
    }

    // Providers filter
    if (options.providers && options.providers.length > 0) {
      filtered = filtered.filter(service =>
        options.providers!.includes(service.provider.name)
      )
    }

    // Exclude tags
    if (this.config.exclude_tags.length > 0) {
      filtered = filtered.filter(service =>
        !this.config.exclude_tags.some(tag => service.tags.includes(tag))
      )
    }

    return filtered
  }

  /**
   * Apply search query to service list
   */
  private applySearchQuery(services: X402APIService[], query: string): X402APIService[] {
    const searchTerm = query.toLowerCase()

    return services.filter(service => {
      return (
        service.name.toLowerCase().includes(searchTerm) ||
        service.description.toLowerCase().includes(searchTerm) ||
        service.provider.name.toLowerCase().includes(searchTerm) ||
        service.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        service.manifest.capabilities.some(cap => cap.toLowerCase().includes(searchTerm))
      )
    })
  }

  /**
   * Generate unique service ID
   */
  private generateServiceId(name: string, baseUrl: string): string {
    const normalized = `${name}:${baseUrl}`.toLowerCase()
    return btoa(normalized).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
  }

  /**
   * Validate service configuration
   */
  private validateService(service: X402APIService): void {
    if (!service.name || service.name.trim().length === 0) {
      throw new Error('Service name is required')
    }

    if (!service.base_url || !this.isValidUrl(service.base_url)) {
      throw new Error('Valid base_url is required')
    }

    if (!service.manifest || !service.manifest.functions || service.manifest.functions.length === 0) {
      throw new Error('Service must have at least one function in manifest')
    }

    if (!service.delegation_endpoints || service.delegation_endpoints.length === 0) {
      throw new Error('Service must have at least one delegation endpoint')
    }
  }

  /**
   * Verify service accessibility
   */
  private async verifyService(service: X402APIService): Promise<boolean> {
    try {
      const healthUrl = service.health_endpoint
        ? `${service.base_url}${service.health_endpoint}`
        : `${service.base_url}/health`

      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'X402-Discovery-Service/1.0.0'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })

      return response.ok

    } catch (error) {
      this.log('warn', 'Service verification failed', {
        serviceId: service.id,
        name: service.name,
        error: error
      })
      return false
    }
  }

  /**
   * Check if service should be re-verified
   */
  private shouldVerify(service: X402APIService): boolean {
    if (!service.last_verified) {
      return true
    }

    const timeSinceVerification = Date.now() - service.last_verified
    const verifyInterval = this.config.cache_ttl * 60 * 1000 // Convert minutes to milliseconds

    return timeSinceVerification > verifyInterval
  }

  /**
   * Check if URL is valid
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Start auto-refresh timer
   */
  private startAutoRefresh(): void {
    const intervalMs = this.config.auto_refresh_interval * 60 * 1000 // Convert minutes to milliseconds

    this.refreshTimer = setInterval(async () => {
      try {
        this.log('debug', 'Auto-refreshing service registry')
        await this.loadRegistry()
      } catch (error) {
        this.log('error', 'Auto-refresh failed', { error })
      }
    }, intervalMs)

    this.log('debug', 'Auto-refresh timer started', {
      intervalMinutes: this.config.auto_refresh_interval
    })
  }

  /**
   * Stop auto-refresh timer
   */
  public stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = undefined
      this.log('debug', 'Auto-refresh timer stopped')
    }
  }

  /**
   * Get discovery service statistics
   */
  public getStatistics(): {
    totalServices: number
    activeServices: number
    inactiveServices: number
    deprecatedServices: number
    lastRefresh: number | null
    isAutoRefreshEnabled: boolean
  } {
    const services = Array.from(this.services.values())

    return {
      totalServices: services.length,
      activeServices: services.filter(s => s.status === 'active').length,
      inactiveServices: services.filter(s => s.status === 'inactive').length,
      deprecatedServices: services.filter(s => s.status === 'deprecated').length,
      lastRefresh: null, // TODO: Track last refresh time
      isAutoRefreshEnabled: !!this.refreshTimer
    }
  }

  /**
   * Logging helper
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (this.logger) {
      this.logger[level](message, data)
    } else {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] [X402-Discovery:${level.toUpperCase()}] ${message}`, data || '')
    }
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.stopAutoRefresh()
    this.services.clear()
    this.isInitialized = false
    this.log('info', 'X.402 Discovery Service disposed')
  }
}

// Export factory function
export function createX402DiscoveryService(
  config?: X402DiscoveryConfig,
  logger?: X402Logger
): X402DiscoveryService {
  return new X402DiscoveryService(config, logger)
}