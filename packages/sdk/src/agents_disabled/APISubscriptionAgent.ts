/**
 * API Subscription Management Agent
 * Automatically manages API service subscriptions for autonomous agents
 *
 * This agent handles:
 * - API provider discovery and comparison
 * - Subscription optimization based on usage patterns
 * - Budget control and spending limits
 * - Automatic scaling and provider switching
 */

import { OuroCClient } from '../core/OuroCClient'
import { CreateSubscriptionRequest } from '../core/types'

export interface APIProvider {
  id: string
  name: string
  service: string // 'llm', 'database', 'storage', 'compute', etc.
  pricing: {
    model: 'per_call' | 'per_token' | 'per_gb' | 'per_hour' | 'monthly'
    rates: Record<string, number> // e.g., { 'gpt-4': 0.03, 'gpt-3.5-turbo': 0.002 }
    free_tier?: number
  }
  endpoints: {
    api: string
    billing: string
    usage: string
  }
  authentication: {
    type: 'api_key' | 'oauth' | 'jwt'
    setup_url?: string
  }
  quality: {
    latency_ms: number
    reliability: number // 0-1
    support_hours: string
  }
}

export interface APISubscriptionConfig {
  agent_id: string
  services_required: {
    service_type: string
    expected_usage: number
    performance_requirements: {
      max_latency_ms?: number
      min_reliability?: number
      budget_limit?: number
    }
  }[]
  optimization_preferences: {
    priority: 'cost' | 'performance' | 'reliability'
    auto_switch: boolean
    usage_monitoring: boolean
  }
  spending_controls: {
    monthly_budget: number
    alert_threshold: number // percentage
    auto_scale: boolean
  }
}

export interface UsageAnalytics {
  provider_id: string
  service: string
  usage_amount: number
  cost: number
  timestamp: Date
  performance_metrics: {
    avg_latency: number
    error_rate: number
    uptime: number
  }
}

export class APISubscriptionAgent {
  private ouroClient: OuroCClient
  private subscriptions: Map<string, CreateSubscriptionRequest> = new Map()
  private providers: Map<string, APIProvider> = new Map()
  private usageAnalytics: UsageAnalytics[] = []
  private budgetController: BudgetController

  constructor(ouroClient: OuroCClient) {
    this.ouroClient = ouroClient
    this.budgetController = new BudgetController()
    this.initializeDefaultProviders()
  }

  /**
   * Initialize with default API providers
   */
  private initializeDefaultProviders(): void {
    // OpenAI
    this.providers.set('openai', {
      id: 'openai',
      name: 'OpenAI',
      service: 'llm',
      pricing: {
        model: 'per_token',
        rates: {
          'gpt-4': 0.00003, // per token (input)
          'gpt-4-turbo': 0.00001,
          'gpt-3.5-turbo': 0.0000015,
          'text-embedding-ada-002': 0.0000001
        },
        free_tier: 5 // $5 free credit
      },
      endpoints: {
        api: 'https://api.openai.com/v1',
        billing: 'https://platform.openai.com/account/usage',
        usage: 'https://api.openai.com/v1/usage'
      },
      authentication: {
        type: 'api_key',
        setup_url: 'https://platform.openai.com/api-keys'
      },
      quality: {
        latency_ms: 800,
        reliability: 0.995,
        support_hours: '24/7'
      }
    })

    // Anthropic Claude
    this.providers.set('anthropic', {
      id: 'anthropic',
      name: 'Anthropic',
      service: 'llm',
      pricing: {
        model: 'per_token',
        rates: {
          'claude-3-opus-20240229': 0.000075,
          'claude-3-sonnet-20240229': 0.000015,
          'claude-3-haiku-20240307': 0.00000025
        },
        free_tier: 5 // $5 free credit
      },
      endpoints: {
        api: 'https://api.anthropic.com/v1',
        billing: 'https://console.anthropic.com/settings/plans',
        usage: 'https://api.anthropic.com/v1/messages'
      },
      authentication: {
        type: 'api_key',
        setup_url: 'https://console.anthropic.com/'
      },
      quality: {
        latency_ms: 600,
        reliability: 0.998,
        support_hours: '24/7'
      }
    })

    // Pinecone (Vector Database)
    this.providers.set('pinecone', {
      id: 'pinecone',
      name: 'Pinecone',
      service: 'database',
      pricing: {
        model: 'monthly',
        rates: {
          'starter': 0, // Free tier
          'standard': 70, // $70/month
          'enterprise': 500 // Custom pricing
        },
        free_tier: 1 // 1 index free
      },
      endpoints: {
        api: 'https://api.pinecone.io',
        billing: 'https://app.pinecone.io/billing',
        usage: 'https://app.pinecone.io/usage'
      },
      authentication: {
        type: 'api_key',
        setup_url: 'https://app.pinecone.io/'
      },
      quality: {
        latency_ms: 50,
        reliability: 0.999,
        support_hours: '24/7'
      }
    })

    // AWS S3 (Storage)
    this.providers.set('aws-s3', {
      id: 'aws-s3',
      name: 'Amazon S3',
      service: 'storage',
      pricing: {
        model: 'per_gb',
        rates: {
          'standard_storage': 0.023, // per GB/month
          'requests': 0.0004, // per 1,000 requests
          'data_transfer': 0.09 // per GB out
        },
        free_tier: 5 // 5 GB free
      },
      endpoints: {
        api: 'https://s3.amazonaws.com',
        billing: 'https://console.aws.amazon.com/billing/',
        usage: 'https://console.aws.amazon.com/cloudwatch/'
      },
      authentication: {
        type: 'api_key',
        setup_url: 'https://console.aws.amazon.com/iam/'
      },
      quality: {
        latency_ms: 100,
        reliability: 0.999999999,
        support_hours: '24/7'
      }
    })
  }

  /**
   * Setup API subscriptions for an agent based on requirements
   */
  async setupAPISubscriptions(config: APISubscriptionConfig): Promise<{
    success: boolean
    subscriptions_created: string[]
    total_monthly_cost: number
    optimization_suggestions: string[]
  }> {
    try {
      const subscriptions_created: string[] = []
      let total_monthly_cost = 0
      const optimization_suggestions: string[] = []

      // Analyze each service requirement
      for (const service_req of config.services_required) {
        const best_providers = this.findBestProviders(service_req, config.optimization_preferences)

        if (best_providers.length === 0) {
          optimization_suggestions.push(`No suitable providers found for ${service_req.service_type}`)
          continue
        }

        // Create subscription for best provider
        const best_provider = best_providers[0]
        const estimated_monthly_cost = this.estimateMonthlyCost(best_provider, service_req.expected_usage)
        total_monthly_cost += estimated_monthly_cost

        // Check budget constraints
        if (total_monthly_cost > config.spending_controls.monthly_budget) {
          optimization_suggestions.push(
            `Budget exceeded with ${best_provider.name}. Consider: ${this.getBudgetOptimizationSuggestions(service_req)}`
          )

          // Try next best provider
          if (best_providers.length > 1) {
            const alternative_provider = best_providers[1]
            const alternative_cost = this.estimateMonthlyCost(alternative_provider, service_req.expected_usage)

            if (total_monthly_cost - estimated_monthly_cost + alternative_cost <= config.spending_controls.monthly_budget) {
              total_monthly_cost = total_monthly_cost - estimated_monthly_cost + alternative_cost
              await this.createSubscription(config.agent_id, alternative_provider, service_req, estimated_monthly_cost)
              subscriptions_created.push(`${alternative_provider.name} - ${service_req.service_type}`)
              optimization_suggestions.push(`Switched to ${alternative_provider.name} to stay within budget`)
              continue
            }
          }

          // If still over budget, suggest usage reduction
          optimization_suggestions.push(`Consider reducing ${service_req.service_type} usage to stay within budget`)
          continue
        }

        // Create subscription
        await this.createSubscription(config.agent_id, best_provider, service_req, estimated_monthly_cost)
        subscriptions_created.push(`${best_provider.name} - ${service_req.service_type}`)

        // Add optimization suggestions
        if (best_providers.length > 1) {
          const alternative = best_providers[1]
          if (alternative.pricing.rates[Object.keys(alternative.pricing.rates)[0]] < best_provider.pricing.rates[Object.keys(best_provider.pricing.rates)[0]]) {
            optimization_suggestions.push(`${alternative.name} could save ~${this.calculateSavings(best_provider, alternative, service_req.expected_usage)}/month`)
          }
        }
      }

      return {
        success: subscriptions_created.length > 0,
        subscriptions_created,
        total_monthly_cost,
        optimization_suggestions
      }

    } catch (error) {
      console.error('Failed to setup API subscriptions:', error)
      return {
        success: false,
        subscriptions_created: [],
        total_monthly_cost: 0,
        optimization_suggestions: ['Error setting up subscriptions: ' + error.message]
      }
    }
  }

  /**
   * Find best providers for a service requirement
   */
  private findBestProviders(service_req: any, preferences: any): APIProvider[] {
    const candidates = Array.from(this.providers.values())
      .filter(provider => provider.service === service_req.service_type)
      .filter(provider => {
        // Filter by performance requirements
        if (service_req.performance_requirements.max_latency_ms &&
            provider.quality.latency_ms > service_req.performance_requirements.max_latency_ms) {
          return false
        }
        if (service_req.performance_requirements.min_reliability &&
            provider.quality.reliability < service_req.performance_requirements.min_reliability) {
          return false
        }
        return true
      })

    // Sort by priority
    return candidates.sort((a, b) => {
      switch (preferences.priority) {
        case 'cost':
          return this.getBaseRate(a) - this.getBaseRate(b)
        case 'performance':
          return a.quality.latency_ms - b.quality.latency_ms
        case 'reliability':
          return b.quality.reliability - a.quality.reliability
        default:
          return 0
      }
    })
  }

  /**
   * Create subscription for a provider
   */
  private async createSubscription(
    agent_id: string,
    provider: APIProvider,
    service_req: any,
    estimated_cost: number
  ): Promise<void> {
    const subscriptionRequest: CreateSubscriptionRequest = {
      subscription_id: `api_${provider.id}_${agent_id}_${Date.now()}`,
      reminder_days_before_payment: 7,
      solana_contract_address: "7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub",
      subscriber_address: agent_id, // Agent's wallet address
      merchant_address: this.getProviderMerchantAddress(provider.id),
      payment_token_mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // USDC devnet
      amount: BigInt(Math.floor(estimated_cost * 1_000_000)), // Convert to micro-units
      interval_seconds: BigInt(30 * 24 * 60 * 60), // Monthly billing
      start_time: [],
      api_key: 'ouro_community_shared_2025_demo_key'
    }

    // Store subscription
    this.subscriptions.set(subscriptionRequest.subscription_id, subscriptionRequest)

    // Create via Ouro-C (in production, this would use actual wallet)
    console.log(`Created subscription: ${subscriptionRequest.subscription_id} for ${provider.name}`)
  }

  /**
   * Estimate monthly cost for a provider
   */
  private estimateMonthlyCost(provider: APIProvider, expected_usage: number): number {
    const base_rate = this.getBaseRate(provider)

    switch (provider.pricing.model) {
      case 'monthly':
        return provider.pricing.rates['standard'] || base_rate
      case 'per_token':
        return expected_usage * base_rate
      case 'per_call':
        return expected_usage * base_rate
      case 'per_gb':
        return expected_usage * base_rate
      case 'per_hour':
        return expected_usage * base_rate * 730 // Average hours per month
      default:
        return base_rate
    }
  }

  /**
   * Get base rate from provider pricing
   */
  private getBaseRate(provider: APIProvider): number {
    const rates = Object.values(provider.pricing.rates)
    return rates[0] || 0
  }

  /**
   * Calculate potential savings
   */
  private calculateSavings(current: APIProvider, alternative: APIProvider, usage: number): number {
    const current_cost = this.estimateMonthlyCost(current, usage)
    const alternative_cost = this.estimateMonthlyCost(alternative, usage)
    return Math.max(0, current_cost - alternative_cost)
  }

  /**
   * Get budget optimization suggestions
   */
  private getBudgetOptimizationSuggestions(service_req: any): string {
    const suggestions = [
      'Reduce expected usage',
      'Choose a lower-tier provider',
      'Implement usage caching',
      'Optimize API call patterns'
    ]
    return suggestions.join(', ')
  }

  /**
   * Get merchant address for provider (in production, these would be real addresses)
   */
  private getProviderMerchantAddress(providerId: string): string {
    // Mock addresses for demo - in production these would be real provider addresses
    const addresses: Record<string, string> = {
      'openai': '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      'anthropic': '7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub',
      'pinecone': '5GqhBqJWW9wQZbVqEi8UzdBQjGyeRvRoWdaYWD6MN3P7',
      'aws-s3': '3Z9XgUZfZU6JgGgNzSjLmPpVqRrSsTtUuVvWwXxYyZz'
    }
    return addresses[providerId] || addresses['openai']
  }

  /**
   * Monitor and optimize existing subscriptions
   */
  async optimizeSubscriptions(agent_id: string): Promise<{
    optimizations: string[]
    potential_savings: number
    recommendations: string[]
  }> {
    const agent_subscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.subscriber_address === agent_id)

    const optimizations: string[] = []
    let potential_savings = 0
    const recommendations: string[] = []

    // Analyze usage patterns and suggest optimizations
    for (const subscription of agent_subscriptions) {
      const usage = this.usageAnalytics
        .filter(usage => usage.provider_id === subscription.subscription_id.split('_')[1])
        .slice(-30) // Last 30 days

      if (usage.length === 0) {
        recommendations.push(`No usage data for ${subscription.subscription_id}`)
        continue
      }

      const avg_usage = usage.reduce((sum, u) => sum + u.usage_amount, 0) / usage.length
      const avg_cost = usage.reduce((sum, u) => sum + u.cost, 0) / usage.length

      // Check for underutilization
      if (avg_usage < 0.5) { // Less than 50% utilization
        recommendations.push(`Consider downgrading ${subscription.subscription_id} - only ${Math.round(avg_usage * 100)}% utilized`)
        potential_savings += avg_cost * 0.5
      }

      // Check for performance issues
      const avg_latency = usage.reduce((sum, u) => sum + u.performance_metrics.avg_latency, 0) / usage.length
      if (avg_latency > 2000) { // High latency
        recommendations.push(`${subscription.subscription_id} showing high latency (${avg_latency}ms) - consider faster provider`)
      }

      // Check for cost optimization opportunities
      const provider_id = subscription.subscription_id.split('_')[1]
      const current_provider = this.providers.get(provider_id)
      if (current_provider) {
        const alternatives = this.findBestProviders(
          { service_type: current_provider.service, expected_usage: avg_usage },
          { priority: 'cost', auto_switch: false, usage_monitoring: true }
        )

        if (alternatives.length > 1) {
          const best_alternative = alternatives[0]
          if (best_alternative.id !== current_provider.id) {
            const savings = this.calculateSavings(current_provider, best_alternative, avg_usage)
            if (savings > 0) {
              optimizations.push(`Switch ${current_provider.name} to ${best_alternative.name} - Save $${savings.toFixed(2)}/month`)
              potential_savings += savings
            }
          }
        }
      }
    }

    return {
      optimizations,
      potential_savings,
      recommendations
    }
  }

  /**
   * Add usage analytics
   */
  addUsageAnalytics(usage: UsageAnalytics): void {
    this.usageAnalytics.push(usage)

    // Keep only last 90 days
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)
    this.usageAnalytics = this.usageAnalytics.filter(u => u.timestamp >= cutoff)
  }

  /**
   * Get spending analytics
   */
  getSpendingAnalytics(agent_id: string, period: 'week' | 'month' | 'quarter' = 'month'): {
    total_spent: number
    by_provider: Record<string, number>
    usage_trends: { date: string; amount: number }[]
    cost_optimization_opportunities: string[]
  } {
    const now = new Date()
    let period_start: Date

    switch (period) {
      case 'week':
        period_start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'quarter':
        period_start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default: // month
        period_start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    const relevant_usage = this.usageAnalytics.filter(u => u.timestamp >= period_start)
    const total_spent = relevant_usage.reduce((sum, u) => sum + u.cost, 0)

    const by_provider: Record<string, number> = {}
    relevant_usage.forEach(u => {
      by_provider[u.provider_id] = (by_provider[u.provider_id] || 0) + u.cost
    })

    // Group by day for trends
    const usage_trends: { date: string; amount: number }[] = []
    const daily_costs: Record<string, number> = {}

    relevant_usage.forEach(u => {
      const date_key = u.timestamp.toISOString().split('T')[0]
      daily_costs[date_key] = (daily_costs[date_key] || 0) + u.cost
    })

    Object.entries(daily_costs).forEach(([date, amount]) => {
      usage_trends.push({ date, amount })
    })

    const cost_optimization_opportunities = [
      'Consider consolidating providers with similar services',
      'Review underutilized subscriptions',
      'Explore volume discounts with high-usage providers',
      'Implement caching to reduce API calls'
    ]

    return {
      total_spent,
      by_provider,
      usage_trends: usage_trends.sort((a, b) => a.date.localeCompare(b.date)),
      cost_optimization_opportunities
    }
  }
}

/**
 * Budget Controller for managing spending limits and alerts
 */
class BudgetController {
  private budgets: Map<string, { monthly_limit: number; spent: number; alert_threshold: number }> = new Map()

  setBudget(agent_id: string, monthly_limit: number, alert_threshold: number = 0.8): void {
    this.budgets.set(agent_id, {
      monthly_limit,
      spent: 0,
      alert_threshold
    })
  }

  addExpense(agent_id: string, amount: number): { within_budget: boolean; alert_triggered: boolean } {
    const budget = this.budgets.get(agent_id)
    if (!budget) {
      return { within_budget: true, alert_triggered: false }
    }

    budget.spent += amount
    const usage_percentage = budget.spent / budget.monthly_limit

    return {
      within_budget: usage_percentage <= 1,
      alert_triggered: usage_percentage >= budget.alert_threshold
    }
  }

  getBudgetStatus(agent_id: string): {
    monthly_limit: number
    spent: number
    remaining: number
    usage_percentage: number
  } | null {
    const budget = this.budgets.get(agent_id)
    if (!budget) return null

    return {
      monthly_limit: budget.monthly_limit,
      spent: budget.spent,
      remaining: Math.max(0, budget.monthly_limit - budget.spent),
      usage_percentage: budget.spent / budget.monthly_limit
    }
  }
}