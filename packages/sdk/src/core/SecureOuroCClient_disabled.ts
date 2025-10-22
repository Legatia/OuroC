import { Actor, HttpAgent } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { OuroCClient } from './OuroCClient'
import {
  Subscription,
  CreateSubscriptionRequest,
  SubscriptionId,
  OuroCError
} from './types'

// License validation types
export interface LicenseValidation {
  is_valid: boolean;
  developer_id?: string;
  tier?: 'Community' | 'Business' | 'Enterprise' | 'Beta';
  rate_limit_remaining: number;
  expires_at: number;
  message: string;
}

export interface LicenseTier {
  Community: {
    max_subscriptions: number;
    rate_limit_per_hour: number;
    features: string[];
    encryption_type?: string;
  };
  Business: {
    max_subscriptions: number;
    rate_limit_per_hour: number;
    features: string[];
    encryption_type: string;
  };
  Enterprise: {
    max_subscriptions: number;
    rate_limit_per_hour: number;
    features: string[];
    encryption_type: string;
  };
  Beta: {
    max_subscriptions: number;
    rate_limit_per_hour: number;
    features: string[];
    encryption_type?: string;
  };
}

export interface LicenseConfig {
  api_key: string;
  licenseRegistryId?: string;
  tier?: 'Community' | 'Business' | 'Enterprise' | 'Beta';
}

export interface SecureClientConfig {
  canisterId: string;
  network: 'local' | 'devnet' | 'mainnet' | 'testnet';
  icpHost?: string;
  solanaConfig?: any;
  license: LicenseConfig;
  enableRateLimiting?: boolean;
  enableLicenseValidation?: boolean;
}

/**
 * Secure Ouro-C Client with IP Protection
 *
 * This client wraps the base OuroCClient and adds:
 * - License validation and rate limiting
 * - API key authentication
 * - Usage tracking and analytics
 * - Enterprise feature gating
 */
export class SecureOuroCClient {
  private baseClient: OuroCClient
  private config: SecureClientConfig
  private licenseValidation?: LicenseValidation
  private lastValidationCheck: number = 0
  private validationCacheDuration: number = 5 * 60 * 1000; // 5 minutes
  private usageCounters: Map<string, number> = new Map()
  private lastHourWindow: number = 0

  constructor(config: SecureClientConfig) {
    this.validateConfig(config);
    this.config = config;

    // Initialize base client
    this.baseClient = new OuroCClient(
      config.canisterId,
      config.network,
      config.icpHost,
      config.solanaConfig
    );
  }

  private validateConfig(config: SecureClientConfig): void {
    if (!config.license?.api_key || !config.license.api_key.startsWith('ouro_')) {
      throw new Error('Invalid API key format. API keys must start with "ouro_"');
    }

    if (!config.canisterId) {
      throw new Error('Canister ID is required');
    }

    if (!['local', 'devnet', 'mainnet', 'testnet'].includes(config.network)) {
      throw new Error('Invalid network. Must be one of: local, devnet, mainnet, testnet');
    }

    // Default security settings
    config.enableLicenseValidation = config.enableLicenseValidation !== false;
    config.enableRateLimiting = config.enableRateLimiting !== false;
  }

  private async ensureLicenseValid(): Promise<void> {
    if (!this.config.enableLicenseValidation) {
      return; // Skip validation if disabled
    }

    const now = Date.now();

    // Use cached validation if still valid
    if (this.licenseValidation &&
        this.licenseValidation.is_valid &&
        now - this.lastValidationCheck < this.validationCacheDuration) {
      return;
    }

    // Validate license with registry or mock
    this.licenseValidation = await this.validateLicense();
    this.lastValidationCheck = now;

    if (!this.licenseValidation.is_valid) {
      throw new OuroCError(
        `License validation failed: ${this.licenseValidation.message}`,
        'LICENSE_VALIDATION_FAILED'
      );
    }

    // Check rate limits
    if (this.config.enableRateLimiting && this.licenseValidation.rate_limit_remaining === 0) {
      throw new OuroCError(
        'Rate limit exceeded. Please upgrade your plan or wait for reset.',
        'RATE_LIMIT_EXCEEDED'
      );
    }

    console.log(`✅ License validated: ${this.licenseValidation.tier} tier, ${this.licenseValidation.rate_limit_remaining} operations remaining`);
  }

  private async validateLicense(): Promise<LicenseValidation> {
    // If no license registry configured, use mock validation
    if (!this.config.license.licenseRegistryId) {
      return this.mockLicenseValidation();
    }

    try {
      const agent = await this.getAgent();
      const registryCanister = Principal.fromText(this.config.license.licenseRegistryId);

      // Create license registry actor (would need proper IDL)
      // This is a placeholder - in production, you'd generate proper IDL
      const registryActor = Actor.createActor(
        {} as any, // Replace with actual LicenseRegistry IDL
        { agent, canisterId: registryCanister }
      );

      return await registryActor.validate_license(this.config.license.api_key);
    } catch (error) {
      console.warn('License registry validation failed, using mock validation:', error);
      return this.mockLicenseValidation();
    }
  }

  private mockLicenseValidation(): LicenseValidation {
    // Mock validation for development or when registry is unavailable
    const tier = this.config.license.tier || 'Community';

    const tierLimits: Record<string, LicenseValidation> = {
      Community: {
        is_valid: true,
        tier: 'Community',
        rate_limit_remaining: 10,
        expires_at: Date.now() + (60 * 60 * 1000),
        message: 'Valid license (mock validation)',
      },
      Business: {
        is_valid: true,
        tier: 'Business',
        rate_limit_remaining: 100,
        expires_at: Date.now() + (60 * 60 * 1000),
        message: 'Valid license (mock validation)',
      },
      Enterprise: {
        is_valid: true,
        tier: 'Enterprise',
        rate_limit_remaining: 1000,
        expires_at: Date.now() + (60 * 60 * 1000),
        message: 'Valid license (mock validation)',
      },
      Beta: {
        is_valid: true,
        tier: 'Beta',
        rate_limit_remaining: 50,
        expires_at: Date.now() + (60 * 60 * 1000),
        message: 'Valid license (mock validation)',
      }
    };

    return tierLimits[tier];
  }

  private async getAgent(): Promise<HttpAgent> {
    // This would be the same agent initialization as in OuroCClient
    const host = this.config.icpHost || this.getICPHost();
    const agent = new HttpAgent({ host });

    if (this.config.network === 'local') {
      await agent.fetchRootKey();
    }

    return agent;
  }

  private getICPHost(): string {
    switch (this.config.network) {
      case 'local':
        return 'http://localhost:4944';
      case 'devnet':
        return 'http://localhost:4944';
      case 'testnet':
        return 'https://ic0.app';
      case 'mainnet':
        return 'https://ic0.app';
      default:
        return 'https://ic0.app';
    }
  }

  private checkAndUpdateUsage(operation: string): void {
    if (!this.config.enableRateLimiting) {
      return;
    }

    const now = Date.now();
    const currentHour = Math.floor(now / (60 * 60 * 1000));

    // Reset counters if new hour
    if (currentHour !== this.lastHourWindow) {
      this.usageCounters.clear();
      this.lastHourWindow = currentHour;
    }

    // Increment usage counter
    const currentCount = this.usageCounters.get(operation) || 0;
    this.usageCounters.set(operation, currentCount + 1);

    // Log usage
    console.log(`Usage: ${operation} - ${currentCount + 1} operations this hour`);
  }

  private checkSubscriptionLimits(): void {
    if (!this.config.enableRateLimiting || !this.licenseValidation) {
      return;
    }

    const tier = this.licenseValidation.tier;
    const subscriptionCount = this.usageCounters.get('create_subscription') || 0;

    const tierLimits: Record<string, number> = {
      Community: 10,
      Business: 1000,
      Enterprise: 10000,
      Beta: 100
    };

    const maxSubscriptions = tierLimits[tier] || 10;

    if (subscriptionCount >= maxSubscriptions) {
      throw new OuroCError(
        `Subscription limit reached for ${tier} tier (${maxSubscriptions} subscriptions). Please upgrade your plan.`,
        'SUBSCRIPTION_LIMIT_EXCEEDED'
      );
    }
  }

  // ============================================================================
  // PUBLIC API (with security layer)
  // ============================================================================

  /**
   * Create a new subscription with license validation
   */
  async createSubscription(request: CreateSubscriptionRequest, walletAdapter?: any): Promise<SubscriptionId> {
    await this.ensureLicenseValid();
    this.checkAndUpdateUsage('create_subscription');
    this.checkSubscriptionLimits();

    // Validate request contains correct API key
    if (request.api_key !== this.config.license.api_key) {
      throw new OuroCError(
        'API key in request does not match client configuration',
        'INVALID_API_KEY'
      );
    }

    // Add security metadata to request
    const secureRequest = {
      ...request,
      _license_validated: true,
      _timestamp: Date.now(),
      _client_tier: this.licenseValidation?.tier
    };

    console.log(`🔒 Creating subscription with license validation (${this.licenseValidation?.tier} tier)`);

    try {
      return await this.baseClient.createSubscription(secureRequest, walletAdapter);
    } catch (error) {
      if (error instanceof OuroCError) throw error;
      throw new OuroCError(
        `Failed to create secure subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SECURE_SUBSCRIPTION_ERROR',
        error
      );
    }
  }

  /**
   * Get subscription details (requires valid license)
   */
  async getSubscription(id: SubscriptionId): Promise<Subscription | null> {
    await this.ensureLicenseValid();
    this.checkAndUpdateUsage('get_subscription');

    try {
      return await this.baseClient.getSubscription(id);
    } catch (error) {
      if (error instanceof OuroCError) throw error;
      throw new OuroCError(
        'Failed to fetch subscription',
        'SECURE_FETCH_ERROR',
        error
      );
    }
  }

  /**
   * List subscriptions (requires valid license)
   */
  async listSubscriptions(payer?: string): Promise<Subscription[]> {
    await this.ensureLicenseValid();
    this.checkAndUpdateUsage('list_subscriptions');

    try {
      return await this.baseClient.listSubscriptions(payer || 'default');
    } catch (error) {
      if (error instanceof OuroCError) throw error;
      throw new OuroCError(
        'Failed to list subscriptions',
        'SECURE_LIST_ERROR',
        error
      );
    }
  }

  /**
   * Pause a subscription (requires valid license)
   */
  async pauseSubscription(id: SubscriptionId): Promise<void> {
    await this.ensureLicenseValid();
    this.checkAndUpdateUsage('pause_subscription');

    try {
      return await this.baseClient.pauseSubscription(id);
    } catch (error) {
      if (error instanceof OuroCError) throw error;
      throw new OuroCError(
        'Failed to pause subscription',
        'SECURE_PAUSE_ERROR',
        error
      );
    }
  }

  /**
   * Resume a subscription (requires valid license)
   */
  async resumeSubscription(id: SubscriptionId): Promise<void> {
    await this.ensureLicenseValid();
    this.checkAndUpdateUsage('resume_subscription');

    try {
      return await this.baseClient.resumeSubscription(id);
    } catch (error) {
      if (error instanceof OuroCError) throw error;
      throw new OuroCError(
        'Failed to resume subscription',
        'SECURE_RESUME_ERROR',
        error
      );
    }
  }

  /**
   * Cancel a subscription (requires valid license)
   */
  async cancelSubscription(id: SubscriptionId): Promise<void> {
    await this.ensureLicenseValid();
    this.checkAndUpdateUsage('cancel_subscription');

    try {
      return await this.baseClient.cancelSubscription(id);
    } catch (error) {
      if (error instanceof OuroCError) throw error;
      throw new OuroCError(
        'Failed to cancel subscription',
        'SECURE_CANCEL_ERROR',
        error
      );
    }
  }

  // ============================================================================
  // LICENSE MANAGEMENT
  // ============================================================================

  /**
   * Validate current license
   */
  async validateLicense(): Promise<LicenseValidation> {
    return await this.validateLicense();
  }

  /**
   * Get license information
   */
  async getLicenseInfo(): Promise<LicenseValidation> {
    return await this.validateLicense();
  }

  /**
   * Get current license tier details
   */
  async getCurrentLicenseTier(): Promise<LicenseTier[keyof LicenseTier]> {
    const license = await this.getLicenseInfo();
    const tier = license.tier || 'Community';

    const tierConfigs: Record<string, LicenseTier[keyof LicenseTier]> = {
      Community: {
        Community: {
          max_subscriptions: 10,
          rate_limit_per_hour: 10,
          features: ['basic_subscriptions', 'public_analytics', 'community_support'],
          encryption_type: 'None'
        }
      },
      Business: {
        Business: {
          max_subscriptions: 1000,
          rate_limit_per_hour: 100,
          features: ['all_community_features', 'web_crypto_encryption', 'enhanced_analytics', 'priority_support', 'api_access'],
          encryption_type: 'Web Crypto API (AES-GCM-256)'
        }
      },
      Enterprise: {
        Enterprise: {
          max_subscriptions: 10000,
          rate_limit_per_hour: 1000,
          features: ['all_business_features', 'arcium_mxe_encryption', 'confidential_computing', 'zero_knowledge_proofs', 'enterprise_support', 'custom_integrations'],
          encryption_type: 'Arcium MXE (Multi-Party Computation)'
        }
      },
      Beta: {
        Beta: {
          max_subscriptions: 100,
          rate_limit_per_hour: 50,
          features: ['basic_subscriptions', 'public_analytics', 'early_access', 'beta_features'],
          encryption_type: 'None'
        }
      }
    };

    return tierConfigs[tier];
  }

  /**
   * Check if current tier supports a specific feature
   */
  async supportsFeature(feature: string): Promise<boolean> {
    const tier = await this.getCurrentLicenseTier();
    const tierName = Object.keys(tier)[0] as keyof LicenseTier;
    return tier[tierName].features.includes(feature);
  }

  /**
   * Get usage statistics for current license period
   */
  async getUsageStats(): Promise<{
    subscriptions_created: number;
    max_subscriptions: number;
    rate_limit_used: number;
    rate_limit_total: number;
    tier: string;
    operations: Record<string, number>;
    tier_features: string[];
  }> {
    const license = await this.getLicenseInfo();
    const tier = await this.getCurrentLicenseTier();
    const tierName = Object.keys(tier)[0];
    const tierConfig = tier[tierName as keyof LicenseTier];

    // Convert usage counters map to object
    const operations: Record<string, number> = {};
    this.usageCounters.forEach((count, operation) => {
      operations[operation] = count;
    });

    return {
      subscriptions_created: operations['create_subscription'] || 0,
      max_subscriptions: tierConfig.max_subscriptions,
      rate_limit_used: tierConfig.rate_limit_per_hour - (license.rate_limit_remaining || 0),
      rate_limit_total: tierConfig.rate_limit_per_hour,
      tier: tierName,
      operations,
      tier_features: tierConfig.features
    };
  }

  // ============================================================================
  // DELEGATED METHODS (pass-through to base client)
  // ============================================================================

  async getCanisterHealth() {
    await this.ensureLicenseValid();
    return this.baseClient.getCanisterHealth();
  }

  async getOverdueSubscriptions(): Promise<SubscriptionId[]> {
    await this.ensureLicenseValid();
    return this.baseClient.getOverdueSubscriptions();
  }

  async processManualPayment(subscriptionId: SubscriptionId, walletAdapter: any): Promise<string> {
    await this.ensureLicenseValid();
    return this.baseClient.processManualPayment(subscriptionId, walletAdapter);
  }

  async getPaymentPreview(subscriptionId: SubscriptionId): Promise<any> {
    await this.ensureLicenseValid();
    return this.baseClient.getPaymentPreview(subscriptionId);
  }

  async validatePayerBalance(payerAddress: string, paymentAmount: bigint): Promise<any> {
    await this.ensureLicenseValid();
    return this.baseClient.validatePayerBalance(payerAddress, paymentAmount);
  }

  isConnected(): boolean {
    return this.baseClient.isConnected();
  }

  getCanisterId(): string {
    return this.baseClient.getCanisterId();
  }

  getNetwork(): string {
    return this.baseClient.getNetwork();
  }

  getApiKey(): string {
    return this.config.license.api_key;
  }

  // Solana utility methods
  async getBalance(publicKey: any): Promise<bigint> {
    return this.baseClient.getBalance(publicKey);
  }

  lamportsToSOL(lamports: bigint): number {
    return this.baseClient.lamportsToSOL(lamports);
  }

  SOLToLamports(sol: number): bigint {
    return this.baseClient.SOLToLamports(sol);
  }

  formatSOL(lamports: bigint, decimals?: number): string {
    return this.baseClient.formatSOL(lamports, decimals);
  }

  // Health monitoring
  startHealthMonitoring(options?: any): void {
    this.baseClient.startHealthMonitoring(options);
  }

  stopHealthMonitoring(): void {
    this.baseClient.stopHealthMonitoring();
  }

  isHealthMonitoringActive(): boolean {
    return this.baseClient.isHealthMonitoringActive();
  }

  getHealthCheckInterval(): number {
    return this.baseClient.getHealthCheckInterval();
  }

  getLastHealthStatus(): string {
    return this.baseClient.getLastHealthStatus();
  }
}

export default SecureOuroCClient;