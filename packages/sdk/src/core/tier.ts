/**
 * OuroC Tier Management System
 *
 * Manages the different licensing tiers and their capabilities
 * Handles tier validation and migration between tiers
 */

export interface TierInfo {
  name: string;
  level: number; // 1=Community, 2=Beta, 3=Business, 4=Enterprise
  maxSubscriptions: number;
  rateLimitPerHour: number;
  features: string[];
  encryption: {
    type: 'None' | 'Web Crypto API' | 'Arcium MXE';
    description: string;
  };
  pricing: {
    monthlyUsd?: number;
    annualUsd?: number;
  };
  useCases: string[];
}

export const TIERS: Record<string, TierInfo> = {
  Community: {
    name: 'Community',
    level: 1,
    maxSubscriptions: 10,
    rateLimitPerHour: 10,
    features: [
      'Basic subscriptions',
      'Public transaction data',
      'Community support',
      'Standard notifications'
    ],
    encryption: {
      type: 'None',
      description: 'No encryption - all data public on-chain'
    },
    pricing: {
      monthlyUsd: 0,
      annualUsd: 0
    },
    useCases: [
      'Individual developers',
      'Open source projects',
      'Learning and testing',
      'Small personal projects'
    ]
  },
  Beta: {
    name: 'Beta',
    level: 2,
    maxSubscriptions: 100,
    rateLimitPerHour: 50,
    features: [
      'All Community features',
      'Early access to new features',
      'Beta testing priority',
      'Enhanced analytics',
      'A2A payment support'
    ],
    encryption: {
      type: 'None',
      description: 'No encryption - all data public on-chain'
    },
    pricing: {
      monthlyUsd: 0,
      annualUsd: 0
    },
    useCases: [
      'Early adopters',
      'Feature testing',
      'Feedback providers',
      'Advanced development projects'
    ]
  },
  Business: {
    name: 'Business',
    level: 3,
    maxSubscriptions: 1000,
    rateLimitPerHour: 100,
    features: [
      'All Beta features',
      'Web Crypto API encryption',
      'Off-chain metadata storage',
      'GDPR compliance tools',
      'Priority support',
      'Enhanced analytics',
      'API access with documentation',
      'Custom integrations'
    ],
    encryption: {
      type: 'Web Crypto API',
      description: 'AES-GCM-256 encryption for metadata'
    },
    pricing: {
      monthlyUsd: 299,
      annualUsd: 2990 // 2 months free
    },
    useCases: [
      'Small to medium businesses',
      'Startups with privacy requirements',
      'GDPR-compliant applications',
      'B2B SaaS platforms',
      'Professional services'
    ]
  },
  Enterprise: {
    name: 'Enterprise',
    level: 4,
    maxSubscriptions: 10000,
    rateLimitPerHour: 1000,
    features: [
      'All Business features',
      'Arcium MXE confidential computing',
      'Zero-knowledge proofs',
      'Multi-party computation',
      'Confidential transaction amounts',
      'Hidden transaction parties',
      'Advanced selective disclosure',
      'Enterprise-grade analytics',
      'Dedicated account manager',
      'Custom SLA support',
      'On-premise deployment options',
      'Custom integrations'
    ],
    encryption: {
      type: 'Arcium MXE',
      description: 'Multi-party computation with zero-knowledge proofs'
    },
    pricing: {
      monthlyUsd: 999,
      annualUsd: 9990 // 2 months free
    },
    useCases: [
      'Large enterprises',
      'Financial institutions',
      'Healthcare providers',
      'Government agencies',
      'High-value B2B transactions',
      'Confidential business operations'
    ]
  }
};

/**
 * Get information about a specific tier
 */
export function getTierInfo(tierName: string): TierInfo {
  return TIERS[tierName] || TIERS.Community;
}

/**
 * Check if a tier has enterprise features (Arcium MXE)
 */
export function isEnterpriseTier(tierName: string): boolean {
  const tier = getTierInfo(tierName);
  return tier.encryption.type === 'Arcium MXE';
}

/**
 * Check if a tier has business features (Web Crypto API)
 */
export function isBusinessTier(tierName: string): boolean {
  const tier = getTierInfo(tierName);
  return tier.encryption.type === 'Web Crypto API';
}

/**
 * Check if a tier supports encryption
 */
export function hasEncryption(tierName: string): boolean {
  const tier = getTierInfo(tierName);
  return tier.encryption.type !== 'None';
}

/**
 * Get available features for a tier
 */
export function getTierFeatures(tierName: string): string[] {
  const tier = getTierInfo(tierName);
  return tier.features;
}

/**
 * Check if a tier supports a specific feature
 */
export function supportsFeature(tierName: string, feature: string): boolean {
  const features = getTierFeatures(tierName);
  return features.includes(feature) || features.some(f => f.startsWith('All '));
}

/**
 * Get tier migration path
 */
export function getMigrationPath(currentTier: string): string[] {
  const tier = getTierInfo(currentTier);
  const availableTiers = Object.entries(TIERS)
    .filter(([_, info]) => info.level > tier.level)
    .map(([name, _]) => name);

  return availableTiers;
}

/**
 * Check if migration is possible between tiers
 */
export function canMigrate(fromTier: string, toTier: string): boolean {
  const from = getTierInfo(fromTier);
  const to = getTierInfo(toTier);
  return to.level > from.level;
}

/**
 * Get tier upgrade recommendations
 */
export function getUpgradeRecommendations(currentTier: string, useCases: string[]): string[] {
  const current = getTierInfo(currentTier);
  const recommendations: string[] = [];

  // Check each higher tier for relevant features
  Object.entries(TIERS).forEach(([tierName, tier]) => {
    if (tier.level <= current.level) return;

    const reasons: string[] = [];

    // Check for encryption capabilities
    if (useCases.includes('privacy') && hasEncryption(tierName)) {
      reasons.push('Encryption support');
    }

    // Check for use case matches
    const matchedUseCases = useCases.filter(useCase =>
      tier.useCases.some(tierUseCase =>
        tierUseCase.toLowerCase().includes(useCase.toLowerCase())
      )
    );

    if (matchedUseCases.length > 0) {
      reasons.push(`Use case support: ${matchedUseCases.join(', ')}`);
    }

    // Check for feature requirements
    if (useCases.includes('high-volume') && tier.maxSubscriptions > current.maxSubscriptions) {
      reasons.push(`Higher subscription limit (${tier.maxSubscriptions} vs ${current.maxSubscriptions})`);
    }

    if (useCases.includes('api-integration') && supportsFeature(tierName, 'API access')) {
      reasons.push('API access');
    }

    if (useCases.includes('compliance') && supportsFeature(tierName, 'GDPR compliance tools')) {
      reasons.push('GDPR compliance');
    }

    if (reasons.length > 0) {
      recommendations.push(`${tierName}: ${reasons.join(', ')}`);
    }
  });

  return recommendations;
}

/**
 * Calculate tier migration costs
 */
export function getMigrationCosts(fromTier: string, toTier: string, billingPeriod: 'monthly' | 'annual' = 'monthly'): {
  fromCost: number;
  toCost: number;
  difference: number;
  savings?: number;
} {
  const from = getTierInfo(fromTier);
  const to = getTierInfo(toTier);

  const fromCost = from.pricing[billingPeriod === 'annual' ? 'annualUsd' : 'monthlyUsd'] || 0;
  const toCost = to.pricing[billingPeriod === 'annual' ? 'annualUsd' : 'monthlyUsd'] || 0;

  const difference = toCost - fromCost;

  // Calculate annual savings for annual billing
  const savings = billingPeriod === 'monthly' ?
    (from.pricing.annualUsd || 0) - (from.pricing.monthlyUsd || 0) * 12 :
    (to.pricing.annualUsd || 0) - (to.pricing.monthlyUsd || 0) * 12;

  return {
    fromCost,
    toCost,
    difference,
    savings: billingPeriod === 'annual' ? savings : undefined
  };
}

/**
 * Migrate to a higher tier
 */
export async function migrateToTier(
  currentTier: string,
  targetTier: string,
  apiKey: string,
  licenseRegistryId?: string
): Promise<{
  success: boolean;
  message: string;
  newApiKey?: string;
  costs?: ReturnType<typeof getMigrationCosts>;
}> {
  // Validate migration
  if (!canMigrate(currentTier, targetTier)) {
    return {
      success: false,
      message: `Cannot migrate from ${currentTier} to ${targetTier}. Target tier must be higher level.`
    };
  }

  try {
    console.log(`🔄 Initiating migration from ${currentTier} to ${targetTier}...`);

    // Calculate costs
    const costs = getMigrationCosts(currentTier, targetTier);

    // Phase 2: This would integrate with the license registry
    // For now, return success with cost information
    console.log(`✅ Migration simulation successful`);
    console.log(`💰 Cost difference: $${costs.difference}/month`);

    return {
      success: true,
      message: `Successfully migrated from ${currentTier} to ${targetTier}`,
      costs
    };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get tier comparison matrix
 */
export function getTierComparison(): {
  headers: string[];
  rows: Array<{
    tier: string;
    level: number;
    subscriptions: number;
    rateLimit: number;
    encryption: string;
    features: string[];
    pricing: string;
  }>;
} {
  const headers = ['Tier', 'Level', 'Max Subscriptions', 'Rate Limit/hr', 'Encryption', 'Key Features', 'Monthly Price'];

  const rows = Object.entries(TIERS).map(([name, info]) => ({
    tier: name,
    level: info.level,
    subscriptions: info.maxSubscriptions,
    rateLimit: info.rateLimitPerHour,
    encryption: info.encryption.type,
    features: info.features.slice(0, 3).join(', '), // Show first 3 features
    pricing: info.pricing.monthlyUsd ? `$${info.pricing.monthlyUsd}/mo` : 'Free'
  }));

  return { headers, rows };
}

/**
 * Get tier recommendation based on requirements
 */
export function recommendTier(requirements: {
  expectedSubscriptions?: number;
  requiredFeatures?: string[];
  encryptionNeeded?: boolean;
  useCases?: string[];
  budget?: number; // Monthly budget in USD
}): {
  recommended: string;
  reasons: string[];
  alternatives: string[];
} {
  const { expectedSubscriptions = 0, requiredFeatures = [], encryptionNeeded = false, useCases = [], budget = 0 } = requirements;

  let recommended = 'Community';
  const reasons: string[] = [];
  const alternatives: string[] = [];

  // Check subscription requirements
  if (expectedSubscriptions > 10) {
    if (expectedSubscriptions <= 100) {
      recommended = 'Beta';
      reasons.push('Subscription volume requires Beta tier');
    } else if (expectedSubscriptions <= 1000) {
      recommended = 'Business';
      reasons.push('Subscription volume requires Business tier');
    } else {
      recommended = 'Enterprise';
      reasons.push('High subscription volume requires Enterprise tier');
    }
  }

  // Check feature requirements
  if (requiredFeatures.includes('encryption') || encryptionNeeded) {
    if (recommended === 'Community' || recommended === 'Beta') {
      recommended = 'Business';
      reasons.push('Encryption requires Business tier or higher');
    }
  }

  // Check for Arcium features
  if (requiredFeatures.includes('confidential_computing') || requiredFeatures.includes('zero_knowledge')) {
    recommended = 'Enterprise';
    reasons.push('Advanced confidential computing requires Enterprise tier');
  }

  // Check budget constraints
  if (budget > 0) {
    if (budget >= 999 && recommended !== 'Enterprise') {
      alternatives.push('Enterprise');
    } else if (budget >= 299 && recommended === 'Community' || recommended === 'Beta') {
      recommended = 'Business';
      reasons.push('Budget supports Business tier');
    }
  }

  // Check use case alignment
  const enterpriseUseCases = ['financial', 'healthcare', 'government', 'large-enterprise'];
  if (useCases.some(useCase => enterpriseUseCases.some(enterprise => useCase.toLowerCase().includes(enterprise)))) {
    recommended = 'Enterprise';
    reasons.push('Use case requires Enterprise tier capabilities');
  }

  const businessUseCases = ['business', 'startup', 'saas', 'b2b'];
  if (useCases.some(useCase => businessUseCases.some(business => useCase.toLowerCase().includes(business))) && recommended !== 'Enterprise') {
    if (recommended === 'Community' || recommended === 'Beta') {
      recommended = 'Business';
      reasons.push('Use case benefits from Business tier encryption');
    }
  }

  return { recommended, reasons, alternatives };
}

export default {
  TIERS,
  getTierInfo,
  isEnterpriseTier,
  isBusinessTier,
  hasEncryption,
  getTierFeatures,
  supportsFeature,
  getMigrationPath,
  canMigrate,
  getUpgradeRecommendations,
  getMigrationCosts,
  migrateToTier,
  getTierComparison,
  recommendTier
};