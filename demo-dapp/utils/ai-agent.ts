/**
 * AI Agent Demo Utilities
 * Simulates an autonomous AI agent making payments via OuroC
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { toMicroUnits, type AgentMetadata, type CreateSubscriptionRequest } from '@ouroc/sdk'

export interface AgentConfig {
  agentKeypair: Keypair
  ownerAddress: string
  programId: string
  rpcUrl: string
}

export interface APICallResult {
  timestamp: number
  prompt: string
  success: boolean
  cost: number // in USDC
}

/**
 * Simple AI Agent that autonomously pays for API services
 */
export class SimpleAIAgent {
  private agentKeypair: Keypair
  private ownerAddress: string
  private programId: string
  private connection: Connection
  private apiCallHistory: APICallResult[] = []
  private totalSpent: number = 0

  constructor(config: AgentConfig) {
    this.agentKeypair = config.agentKeypair
    this.ownerAddress = config.ownerAddress
    this.programId = config.programId
    this.connection = new Connection(config.rpcUrl, 'confirmed')
  }

  /**
   * Get agent's public key
   */
  getPublicKey(): PublicKey {
    return this.agentKeypair.publicKey
  }

  /**
   * Get agent's unique identifier
   */
  getAgentId(): string {
    return `agent-${this.agentKeypair.publicKey.toBase58().slice(0, 8)}`
  }

  /**
   * Create agent metadata for subscription
   */
  createAgentMetadata(): AgentMetadata {
    return {
      agent_id: this.getAgentId(),
      owner_address: this.ownerAddress,
      agent_type: 'autonomous',
      max_payment_per_interval: toMicroUnits(10), // Max $10 per interval
      description: 'AI Agent for OpenAI API payments'
    }
  }

  /**
   * Simulate making an API call (e.g., to OpenAI)
   * In real implementation, this would call actual APIs
   */
  async makeAPICall(prompt: string): Promise<APICallResult> {
    console.log(`🤖 Agent making API call: "${prompt}"`)

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // Simulate API cost (random between $0.01 and $0.05)
    const cost = Math.random() * 0.04 + 0.01

    const result: APICallResult = {
      timestamp: Date.now(),
      prompt,
      success: true,
      cost: parseFloat(cost.toFixed(2))
    }

    this.apiCallHistory.push(result)
    this.totalSpent += cost

    console.log(`✅ API call completed. Cost: $${cost.toFixed(2)} USDC`)
    console.log(`💰 Total spent: $${this.totalSpent.toFixed(2)} USDC`)

    return result
  }

  /**
   * Simulate autonomous behavior - make multiple API calls
   */
  async runAutonomousDemo(prompts: string[]): Promise<APICallResult[]> {
    console.log(`🚀 Agent starting autonomous API calls...`)
    console.log(`📝 Agent ID: ${this.getAgentId()}`)
    console.log(`👤 Owner: ${this.ownerAddress}`)
    console.log(`💳 Payment via OuroC subscription\n`)

    const results: APICallResult[] = []

    for (const prompt of prompts) {
      const result = await this.makeAPICall(prompt)
      results.push(result)

      // Small delay between calls
      await new Promise(resolve => setTimeout(resolve, 800))
    }

    console.log(`\n✅ Demo complete!`)
    console.log(`📊 Total API calls: ${results.length}`)
    console.log(`💰 Total spent: $${this.totalSpent.toFixed(2)} USDC`)
    console.log(`🔒 All payments processed autonomously via OuroC subscription`)

    return results
  }

  /**
   * Get agent statistics
   */
  getStats() {
    return {
      agentId: this.getAgentId(),
      ownerAddress: this.ownerAddress,
      totalCalls: this.apiCallHistory.length,
      totalSpent: parseFloat(this.totalSpent.toFixed(2)),
      averageCost: this.apiCallHistory.length > 0
        ? parseFloat((this.totalSpent / this.apiCallHistory.length).toFixed(2))
        : 0,
      callHistory: this.apiCallHistory
    }
  }

  /**
   * Check if agent has sufficient balance (simulated)
   */
  async checkBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.agentKeypair.publicKey)
      return balance / 1e9 // Convert lamports to SOL
    } catch (error) {
      console.error('Error checking balance:', error)
      return 0
    }
  }
}

/**
 * Create a demo AI agent with predefined configuration
 */
export function createDemoAgent(ownerAddress: string, programId: string, rpcUrl: string): SimpleAIAgent {
  // Generate a new keypair for the agent
  const agentKeypair = Keypair.generate()

  return new SimpleAIAgent({
    agentKeypair,
    ownerAddress,
    programId,
    rpcUrl
  })
}

/**
 * Sample prompts for demo
 */
export const DEMO_PROMPTS = [
  "Explain quantum computing in simple terms",
  "Write a haiku about blockchain technology",
  "What are the benefits of decentralized payments?",
  "Summarize the latest AI research trends"
]
