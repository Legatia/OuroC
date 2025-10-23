# X.402 Usage Guide

This guide provides practical examples for integrating X.402 delegation with OuroC, enabling AI agents to securely manage subscriptions on behalf of users.

## Quick Start

### 1. Install the SDK

```bash
npm install @ouroc/sdk
```

### 2. Create an X.402-enabled Client

```typescript
import { createX402Client } from '@ouroc/sdk'

const client = createX402Client({
  canisterId: '7tbxr-naaaa-aaaao-qkrca-cai',
  network: 'devnet'
})
```

### 3. Get Capability Token from User

The user creates a capability token that grants your agent specific permissions:

```typescript
const capabilityToken = {
  protocol: 'x402-v1',
  issuer: 'USER_WALLET_ADDRESS',
  agent: 'YOUR_AGENT_ID',
  permissions: [{
    function: 'createSubscription',
    maxUses: 5,
    constraints: {
      maxAmount: BigInt('100000000'), // Max 100 USDC
      allowedIntervals: ['2592000'] // Only monthly
    }
  }],
  expiresAt: Date.now() + 3600000, // 1 hour
  signature: 'USER_CRYPTO_SIGNATURE',
  nonce: 'unique_nonce'
}
```

### 4. Execute Delegated Actions

```typescript
try {
  const subscriptionId = await client.createSubscriptionWithX402(
    subscriptionRequest,
    capabilityToken
  )
  console.log('Subscription created:', subscriptionId)
} catch (error) {
  console.error('Failed:', error.message)
}
```

## AI Agent Integration Patterns

### Pattern 1: Subscription Management Assistant

Create an AI assistant that helps users manage their subscriptions:

```typescript
import { createX402Client, validateX402Token } from '@ouroc/sdk'

class SubscriptionAssistant {
  private client = createX402Client()

  async handleUserRequest(request: UserRequest, token: X402CapabilityToken) {
    // Validate token first
    const validation = validateX402Token(token, {
      function: request.action,
      params: request.params,
      caller: 'subscription-assistant'
    })

    if (!validation.valid) {
      throw new Error(`Invalid token: ${validation.reason}`)
    }

    // Execute the requested action
    switch (request.action) {
      case 'createSubscription':
        return await this.client.createSubscriptionWithX402(request.params, token)
      case 'pauseSubscription':
        return await this.client.pauseSubscriptionWithX402(request.params.subscriptionId, token)
      case 'resumeSubscription':
        return await this.client.resumeSubscriptionWithX402(request.params.subscriptionId, token)
      default:
        throw new Error(`Unsupported action: ${request.action}`)
    }
  }
}
```

### Pattern 2: Budget-Conscious Agent

Create an agent that helps users stay within budget:

```typescript
class BudgetAgent {
  private client = createX402Client()

  async createBudgetConsciousSubscription(
    request: CreateSubscriptionRequest,
    budgetLimit: bigint,
    token: X402CapabilityToken
  ) {
    // Check if request exceeds budget
    if (request.amount > budgetLimit) {
      throw new Error(`Subscription amount ${request.amount} exceeds budget ${budgetLimit}`)
    }

    // Add budget constraint to token validation
    const validation = validateX402Token(token, {
      function: 'createSubscription',
      params: [request],
      caller: 'budget-agent'
    })

    if (!validation.valid) {
      throw new Error(`Token validation failed: ${validation.reason}`)
    }

    // Create subscription with additional monitoring
    const subscriptionId = await this.client.createSubscriptionWithX402(request, token)

    // Set up budget monitoring
    await this.setupBudgetMonitoring(subscriptionId, budgetLimit)

    return subscriptionId
  }

  private async setupBudgetMonitoring(subscriptionId: string, budgetLimit: bigint) {
    // Implement budget monitoring logic
    console.log(`Monitoring subscription ${subscriptionId} against budget ${budgetLimit}`)
  }
}
```

### Pattern 3: Subscription Analyzer

Create an agent that analyzes subscription usage:

```typescript
class SubscriptionAnalyzer {
  private client = createX402Client()

  async analyzeUserSubscriptions(
    userAddress: string,
    token: X402CapabilityToken
  ) {
    const analysis = {
      totalSpend: BigInt(0),
      activeSubscriptions: 0,
      upcomingPayments: [] as Array<{ subscriptionId: string; amount: bigint; date: Date }>,
      recommendations: [] as string[]
    }

    // Get all subscriptions (requires permission)
    const subscriptions = await this.getUserSubscriptions(userAddress, token)

    for (const subscription of subscriptions) {
      if (subscription.status === 'active') {
        analysis.activeSubscriptions++
        analysis.totalSpend += subscription.amount

        // Check for upcoming payments
        const nextPayment = new Date(subscription.next_payment_date)
        const daysUntilPayment = Math.ceil((nextPayment.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

        if (daysUntilPayment <= 7) {
          analysis.upcomingPayments.push({
            subscriptionId: subscription.id,
            amount: subscription.amount,
            date: nextPayment
          })
        }
      }
    }

    // Generate recommendations
    if (analysis.totalSpend > BigInt('500000000')) { // 500 USDC
      analysis.recommendations.push('Consider pausing unused subscriptions to reduce costs')
    }

    if (analysis.upcomingPayments.length > 3) {
      analysis.recommendations.push('Multiple payments due soon - ensure sufficient balance')
    }

    return analysis
  }

  private async getUserSubscriptions(userAddress: string, token: X402CapabilityToken) {
    // Implementation depends on your subscription listing method
    return [] // Placeholder
  }
}
```

## LangChain Integration

### Custom Tool for LangChain

```typescript
import { createX402Client } from '@ouroc/sdk'
import { Tool } from 'langchain/tools'

export class OuroCSubscriptionTool extends Tool {
  name = 'ouroc_subscription_manager'
  description = 'Manage OuroC subscriptions securely using X.402 delegation'

  private client = createX402Client()

  async _call(input: string): Promise<string> {
    try {
      const { action, params, token } = JSON.parse(input)

      switch (action) {
        case 'create':
          const subscriptionId = await this.client.createSubscriptionWithX402(
            params.subscriptionRequest,
            params.capabilityToken
          )
          return JSON.stringify({ success: true, subscriptionId })

        case 'pause':
          await this.client.pauseSubscriptionWithX402(
            params.subscriptionId,
            params.capabilityToken
          )
          return JSON.stringify({ success: true, message: 'Subscription paused' })

        case 'info':
          const info = await this.client.getSubscriptionInfoWithX402(
            params.subscriptionId,
            params.capabilityToken
          )
          return JSON.stringify({ success: true, info })

        default:
          return JSON.stringify({ success: false, error: 'Unknown action' })
      }
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}
```

### LangChain Agent Example

```typescript
import { initializeAgentExecutor } from 'langchain/agents'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { OuroCSubscriptionTool } from './ouroc-tool'

async function createSubscriptionAgent() {
  const tools = [new OuroCSubscriptionTool()]
  const model = new ChatOpenAI({ temperature: 0 })

  const agent = await initializeAgentExecutor(
    tools,
    model,
    { agentType: 'chat-conversational-react-description' }
  )

  return agent
}

// Usage
const agent = await createSubscriptionAgent()
const response = await agent.call({
  input: 'Help me create a monthly subscription for $29 using my capability token'
})
```

## OpenAI GPT Integration

### Custom Function for OpenAI

```typescript
export const ourocFunctions = {
  create_subscription: {
    description: 'Create a new subscription using X.402 delegation',
    parameters: {
      type: 'object',
      properties: {
        subscriptionRequest: {
          type: 'object',
          properties: {
            subscription_id: { type: 'string' },
            amount: { type: 'string', description: 'Amount in micro-units' },
            interval_seconds: { type: 'string' },
            // ... other parameters
          },
          required: ['subscription_id', 'amount', 'interval_seconds']
        },
        capabilityToken: {
          type: 'object',
          properties: {
            protocol: { type: 'string' },
            issuer: { type: 'string' },
            agent: { type: 'string' },
            signature: { type: 'string' },
            // ... other token fields
          },
          required: ['protocol', 'issuer', 'agent', 'signature']
        }
      },
      required: ['subscriptionRequest', 'capabilityToken']
    }
  }
}

export async function handleOpenAICall(functionName: string, args: any) {
  const client = createX402Client()

  switch (functionName) {
    case 'create_subscription':
      try {
        const subscriptionId = await client.createSubscriptionWithX402(
          args.subscriptionRequest,
          args.capabilityToken
        )
        return { success: true, subscriptionId }
      } catch (error) {
        return { success: false, error: error.message }
      }

    default:
      return { success: false, error: 'Unknown function' }
  }
}
```

## Security Best Practices

### 1. Token Validation

Always validate tokens before use:

```typescript
function validateTokenStrictly(token: X402CapabilityToken, action: any) {
  const validation = validateX402Token(token, action)

  if (!validation.valid) {
    throw new Error(`Token invalid: ${validation.reason}`)
  }

  // Additional checks
  if (token.expiresAt <= Date.now()) {
    throw new Error('Token has expired')
  }

  if (token.agent !== 'YOUR_AGENT_ID') {
    throw new Error('Token not issued for this agent')
  }

  return validation
}
```

### 2. Constraint Enforcement

Define strict constraints for your agents:

```typescript
const conservativeConstraints = {
  maxAmount: BigInt('100000000'), // 100 USDC max
  allowedIntervals: ['2592000'], // Monthly only
  minIntervalSeconds: 604800, // Minimum 1 week
  maxUses: 10, // Maximum 10 uses per token
  allowedTokens: ['USDC_MINT_ADDRESS'] // Only USDC
}
```

### 3. Usage Monitoring

Monitor agent usage for security:

```typescript
class SecurityMonitor {
  private client = createX402Client()

  checkUsagePatterns(agentId: string) {
    const usage = this.client.getAgentUsageHistory(agentId)

    // Check for unusual patterns
    const recentUsage = usage.filter(u =>
      Date.now() - u.timestamp < 3600000 // Last hour
    )

    if (recentUsage.length > 50) {
      console.warn('High activity detected for agent:', agentId)
    }

    // Check for failed attempts
    const failures = recentUsage.filter(u => !u.success)
    if (failures.length > 10) {
      console.warn('Multiple failures detected for agent:', agentId)
    }
  }
}
```

## Error Handling

### Common X.402 Errors

```typescript
import { X402ErrorHandler } from '@ouroc/sdk'

function handleX402Error(error: any) {
  if (X402ErrorHandler.isX402Error(error)) {
    const errorCode = X402ErrorHandler.getErrorCode(error)
    const errorMessage = X402ErrorHandler.getErrorMessage(error)
    const errorDetails = X402ErrorHandler.getErrorDetails(error)

    console.error(`X.402 Error [${errorCode}]: ${errorMessage}`)

    switch (errorCode) {
      case 'TOKEN_EXPIRED':
        return 'Your authorization token has expired. Please request a new one.'

      case 'INSUFFICIENT_PERMISSIONS':
        return 'You don\'t have permission for this action.'

      case 'CONSTRAINT_VIOLATION':
        return `This request violates security constraints: ${errorMessage}`

      case 'USAGE_LIMIT_EXCEEDED':
        return 'You\'ve reached the usage limit for this authorization.'

      default:
        return `Authorization error: ${errorMessage}`
    }
  }

  return `Unexpected error: ${error.message}`
}
```

## Testing X.402 Integration

### Unit Test Example

```typescript
import { createX402Client, validateX402Token } from '@ouroc/sdk'

describe('X.402 Integration', () => {
  let client: any
  let mockToken: X402CapabilityToken

  beforeEach(() => {
    client = createX402Client({ network: 'devnet' })
    mockToken = {
      protocol: 'x402-v1',
      issuer: 'test-user',
      agent: 'test-agent',
      permissions: [{
        function: 'createSubscription',
        maxUses: 1
      }],
      expiresAt: Date.now() + 3600000,
      signature: 'test-signature',
      nonce: 'test-nonce'
    }
  })

  test('should validate token correctly', () => {
    const validation = validateX402Token(mockToken, {
      function: 'createSubscription',
      params: [],
      caller: 'test-agent'
    })

    expect(validation.valid).toBe(true)
  })

  test('should reject expired token', () => {
    mockToken.expiresAt = Date.now() - 1000

    const validation = validateX402Token(mockToken, {
      function: 'createSubscription',
      params: [],
      caller: 'test-agent'
    })

    expect(validation.valid).toBe(false)
    expect(validation.reason).toContain('expired')
  })
})
```

## Deployment Considerations

### Environment Configuration

```typescript
const config = {
  development: {
    canisterId: '7tbxr-naaaa-aaaao-qkrca-cai',
    network: 'devnet',
    logLevel: 'debug'
  },
  production: {
    canisterId: 'PRODUCTION_CANISTER_ID',
    network: 'mainnet',
    logLevel: 'error'
  }
}

const client = createX402Client(config[process.env.NODE_ENV])
```

### Monitoring and Logging

```typescript
class X402Monitor {
  private client = createX402Client()

  logUsage(agentId: string, action: string, success: boolean) {
    console.log({
      timestamp: new Date().toISOString(),
      agent: agentId,
      action,
      success,
      usage: this.client.getAgentUsageHistory(agentId).length
    })
  }

  async healthCheck() {
    try {
      const usage = this.client.getUsageHistory()
      const activeAgents = new Set(usage.map(u => u.agent)).size

      return {
        status: 'healthy',
        activeAgents,
        totalActions: usage.length,
        lastActivity: usage.length > 0 ? new Date(usage[0].timestamp) : null
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      }
    }
  }
}
```

This guide provides comprehensive patterns for integrating X.402 delegation with various AI agent frameworks. The examples demonstrate secure, constraint-enforced subscription management while maintaining security best practices.