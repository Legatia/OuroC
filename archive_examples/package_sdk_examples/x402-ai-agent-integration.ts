/**
 * X.402 AI Agent Integration Examples
 *
 * This file demonstrates how AI agents can integrate with OuroC
 * using the X.402 delegation protocol for secure subscription management.
 */

import {
  // Core X.402 types
  type X402CapabilityToken,
  type X402Permission,
  X402ErrorFactory,

  // X.402 client and utilities
  createX402Client,
  validateX402Token,
  getOuroCX402Manifest,

  // Core subscription types
  type CreateSubscriptionRequest,
  type SubscriptionId
} from '@ouroc/sdk'

/**
 * Example 1: AI Agent Creates Subscription on Behalf of User
 *
 * This shows how an AI agent can create a subscription after receiving
 * a capability token from the user.
 */
export async function agentCreatesSubscription() {
  console.log('🤖 AI Agent: Creating subscription with X.402 delegation...')

  // 1. Agent receives capability token from user (normally via API)
  const capabilityToken: X402CapabilityToken = {
    protocol: 'x402-v1',
    issuer: 'D2hWeWekkcxJisDHLcFJEgzwvDE9yJmB7NKzLpvdSp6e', // User wallet
    agent: 'ai-agent-coding-assistant-123', // Agent identifier
    permissions: [{
      function: 'createSubscription',
      allowedParams: ['subscription_id', 'solana_contract_address', 'subscriber_address', 'merchant_address', 'payment_token_mint', 'amount', 'interval_seconds', 'reminder_days_before_payment', 'api_key'],
      maxUses: 1,
      constraints: {
        maxAmount: BigInt('100000000'), // Max 100 USDC
        allowedIntervals: ['2592000', '7776000'], // Monthly or quarterly
        allowedTokens: ['4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'] // Devnet USDC
      }
    }],
    expiresAt: Date.now() + 3600000, // 1 hour from now
    signature: 'user_crypto_signature_here',
    nonce: 'unique_nonce_12345'
  }

  // 2. Agent creates X.402-enabled client
  const client = createX402Client({
    canisterId: '7tbxr-naaaa-aaaao-qkrca-cai',
    network: 'devnet'
  })

  // 3. Agent prepares subscription request
  const subscriptionRequest: CreateSubscriptionRequest = {
    subscription_id: 'coding-agent-premium-123',
    solana_contract_address: '7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub',
    subscriber_address: 'D2hWeWekkcxJisDHLcFJEgzwvDE9yJmB7NKzLpvdSp6e',
    merchant_address: '7tbxr-naaaa-aaaao-qkrca-cai',
    payment_token_mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    amount: BigInt('29000000'), // 29 USDC
    interval_seconds: BigInt('2592000'), // Monthly
    reminder_days_before_payment: 3,
    api_key: 'demo-api-key'
  }

  try {
    // 4. Agent executes subscription creation with X.402 delegation
    const subscriptionId = await client.createSubscriptionWithX402(
      subscriptionRequest,
      capabilityToken
    )

    console.log(`✅ Subscription created successfully: ${subscriptionId}`)
    console.log(`📊 Usage history available for audit trail`)

    // 5. Agent can check usage history
    const usageHistory = client.getUsageHistory()
    console.log(`📋 Agent has executed ${usageHistory.length} delegated actions`)

    return subscriptionId

  } catch (error) {
    if (error instanceof X402ErrorFactory.insufficientPermissions) {
      console.error('❌ Permission denied:', error.message)
    } else if (error instanceof X402ErrorFactory.constraintViolation) {
      console.error('❌ Constraint violation:', error.message)
    } else {
      console.error('❌ Failed to create subscription:', error)
    }
    throw error
  }
}

/**
 * Example 2: AI Agent Validates Token Before Use
 *
 * Shows how agents can validate tokens before executing actions
 */
export async function agentValidatesToken() {
  console.log('🔍 AI Agent: Validating X.402 capability token...')

  const token: X402CapabilityToken = {
    protocol: 'x402-v1',
    issuer: 'D2hWeWekkcxJisDHLcFJEgzwvDE9yJmB7NKzLpvdSp6e',
    agent: 'ai-agent-coding-assistant-123',
    permissions: [{
      function: 'pauseSubscription',
      maxUses: 5
    }],
    expiresAt: Date.now() + 7200000, // 2 hours
    signature: 'user_signature_here',
    nonce: 'validation_nonce_67890'
  }

  // Validate token for specific action
  const validationResult = validateX402Token(token, {
    function: 'pauseSubscription',
    params: ['sub_abcdef123456789'],
    caller: 'ai-agent-coding-assistant-123'
  })

  if (validationResult.valid) {
    console.log('✅ Token is valid for requested action')
    console.log('🔧 Enforced constraints:', validationResult.enforcedConstraints)

    // Agent can proceed with confidence
    return true
  } else {
    console.error('❌ Token validation failed:', validationResult.reason)
    return false
  }
}

/**
 * Example 3: AI Agent Manages Subscription Lifecycle
 *
 * Demonstrates complete subscription management by AI agent
 */
export async function agentManagesSubscriptionLifecycle(subscriptionId: SubscriptionId) {
  console.log('🔄 AI Agent: Managing subscription lifecycle...')

  const client = createX402Client({ network: 'devnet' })

  // Capability token for subscription management
  const managementToken: X402CapabilityToken = {
    protocol: 'x402-v1',
    issuer: 'D2hWeWekkcxJisDHLcFJEgzwvDE9yJmB7NKzLpvdSp6e',
    agent: 'ai-agent-coding-assistant-123',
    permissions: [
      {
        function: 'pauseSubscription',
        maxUses: 3,
        constraints: {
          minIntervalSeconds: 86400 // Can't pause more than once per day
        }
      },
      {
        function: 'resumeSubscription',
        maxUses: 3
      },
      {
        function: 'getSubscriptionInfo',
        maxUses: 100 // Information gathering has higher limits
      }
    ],
    expiresAt: Date.now() + 86400000, // 24 hours
    signature: 'management_signature_here',
    nonce: 'lifecycle_nonce_11111'
  }

  try {
    // 1. Check subscription status
    console.log('📊 Checking subscription status...')
    const subscriptionInfo = await client.getSubscriptionInfoWithX402(
      subscriptionId,
      managementToken
    )
    console.log(`📋 Subscription status: ${subscriptionInfo.status}`)

    // 2. Pause subscription (user is on vacation)
    if (subscriptionInfo.status === 'active') {
      console.log('⏸️ Pausing subscription for vacation...')
      await client.pauseSubscriptionWithX402(subscriptionId, managementToken)
      console.log('✅ Subscription paused successfully')
    }

    // 3. Wait some time (simulating vacation period)
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 4. Resume subscription
    console.log('▶️ Resuming subscription after vacation...')
    await client.resumeSubscriptionWithX402(subscriptionId, managementToken)
    console.log('✅ Subscription resumed successfully')

    // 5. Check final status
    const finalInfo = await client.getSubscriptionInfoWithX402(
      subscriptionId,
      managementToken
    )
    console.log(`📊 Final subscription status: ${finalInfo.status}`)

    // 6. Show usage summary
    const agentUsage = client.getAgentUsageHistory('ai-agent-coding-assistant-123')
    console.log(`📈 Agent usage summary: ${agentUsage.length} actions executed`)

    return finalInfo

  } catch (error) {
    console.error('❌ Subscription management failed:', error)
    throw error
  }
}

/**
 * Example 4: AI Agent Discovers Available Functions
 *
 * Shows how agents can discover what functions are available
 */
export async function agentDiscoversFunctions() {
  console.log('🔍 AI Agent: Discovering available OuroC functions...')

  // Get the complete SDK manifest
  const manifest = getOuroCX402Manifest()

  console.log(`📚 SDK: ${manifest.name} v${manifest.version}`)
  console.log(`📝 Description: ${manifest.description}`)
  console.log(`🔐 Protocol: ${manifest.protocol}`)
  console.log(`⚡ Capabilities: ${manifest.capabilities.join(', ')}`)

  // Display available functions
  console.log('\n🛠️ Available Functions:')
  manifest.functions.forEach((func, index) => {
    console.log(`\n${index + 1}. ${func.name}`)
    console.log(`   Description: ${func.description}`)
    console.log(`   Required scopes: ${func.requiredScopes?.join(', ') || 'none'}`)

    // Show parameters
    console.log('   Parameters:')
    func.parameters.forEach(param => {
      const required = param.required ? 'required' : 'optional'
      console.log(`     - ${param.name} (${param.type}, ${required})`)
      if (param.description) {
        console.log(`       ${param.description}`)
      }
      if (param.constraints?.max) {
        console.log(`       Max value: ${param.constraints.max}`)
      }
    })

    // Show examples
    console.log('   Examples:')
    func.examples.forEach(example => {
      console.log(`     ${example.description}`)
      console.log(`     Parameters: ${JSON.stringify(example.params, null, 6)}`)
      if (example.result) {
        console.log(`     Result: ${example.result}`)
      }
    })
  })

  return manifest
}

/**
 * Example 5: AI Agent with Constraint Enforcement
 *
 * Demonstrates how constraints are automatically enforced
 */
export async function agentWithConstraintEnforcement() {
  console.log('🛡️ AI Agent: Testing constraint enforcement...')

  const client = createX402Client({ network: 'devnet' })

  // Token with strict constraints
  const constrainedToken: X402CapabilityToken = {
    protocol: 'x402-v1',
    issuer: 'D2hWeWekkcxJisDHLcFJEgzwvDE9yJmB7NKzLpvdSp6e',
    agent: 'ai-agent-budget-constrained-456',
    permissions: [{
      function: 'createSubscription',
      maxUses: 2,
      constraints: {
        maxAmount: BigInt('50000000'), // Max 50 USDC
        allowedIntervals: ['2592000'], // Only monthly
        allowedTokens: ['4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU']
      }
    }],
    expiresAt: Date.now() + 3600000,
    signature: 'constrained_signature_here',
    nonce: 'constraint_nonce_99999'
  }

  // Test 1: Within constraints (should succeed)
  console.log('✅ Test 1: Creating subscription within constraints...')
  try {
    const validRequest: CreateSubscriptionRequest = {
      subscription_id: 'valid-subscription-123',
      solana_contract_address: '7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub',
      subscriber_address: 'D2hWeWekkcxJisDHLcFJEgzwvDE9yJmB7NKzLpvdSp6e',
      merchant_address: '7tbxr-naaaa-aaaao-qkrca-cai',
      payment_token_mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      amount: BigInt('29000000'), // 29 USDC (under 50 limit)
      interval_seconds: BigInt('2592000'), // Monthly
      reminder_days_before_payment: 3,
      api_key: 'demo-api-key'
    }

    await client.createSubscriptionWithX402(validRequest, constrainedToken)
    console.log('✅ Constraint-respecting subscription created successfully')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }

  // Test 2: Violating constraints (should fail)
  console.log('❌ Test 2: Attempting subscription that violates constraints...')
  try {
    const invalidRequest: CreateSubscriptionRequest = {
      subscription_id: 'invalid-subscription-456',
      solana_contract_address: '7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub',
      subscriber_address: 'D2hWeWekkcxJisDHLcFJEgzwvDE9yJmB7NKzLpvdSp6e',
      merchant_address: '7tbxr-naaaa-aaaao-qkrca-cai',
      payment_token_mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      amount: BigInt('100000000'), // 100 USDC (exceeds 50 limit)
      interval_seconds: BigInt('2592000'),
      reminder_days_before_payment: 3,
      api_key: 'demo-api-key'
    }

    await client.createSubscriptionWithX402(invalidRequest, constrainedToken)
    console.error('❌ This should have failed!')

  } catch (error) {
    if (error instanceof X402ErrorFactory.constraintViolation) {
      console.log('✅ Constraint enforcement working:', error.message)
    } else {
      console.error('❌ Unexpected error type:', error)
    }
  }
}

/**
 * Example 6: Multi-Agent Scenario
 *
 * Shows multiple agents working with different permissions
 */
export async function multiAgentScenario() {
  console.log('👥 Multi-Agent Scenario: Multiple agents with different permissions...')

  const client = createX402Client({ network: 'devnet' })

  // Agent 1: Subscription Management Agent
  const subscriptionAgentToken: X402CapabilityToken = {
    protocol: 'x402-v1',
    issuer: 'D2hWeWekkcxJisDHLcFJEgzwvDE9yJmB7NKzLpvdSp6e',
    agent: 'subscription-manager-agent',
    permissions: [
      { function: 'createSubscription', maxUses: 10 },
      { function: 'cancelSubscription', maxUses: 5 },
      { function: 'pauseSubscription', maxUses: 20 },
      { function: 'resumeSubscription', maxUses: 20 }
    ],
    expiresAt: Date.now() + 86400000, // 24 hours
    signature: 'sub_agent_signature',
    nonce: 'sub_agent_nonce'
  }

  // Agent 2: Monitoring Agent (read-only)
  const monitoringAgentToken: X402CapabilityToken = {
    protocol: 'x402-v1',
    issuer: 'D2hWeWekkcxJisDHLcFJEgzwvDE9yJmB7NKzLpvdSp6e',
    agent: 'monitoring-agent',
    permissions: [
      { function: 'getSubscriptionInfo', maxUses: 1000 }
    ],
    expiresAt: Date.now() + 86400000 * 7, // 7 days
    signature: 'monitor_agent_signature',
    nonce: 'monitor_agent_nonce'
  }

  try {
    // Subscription agent creates a subscription
    console.log('🤖 Subscription Agent: Creating subscription...')
    const subscriptionId = await client.createSubscriptionWithX402({
      subscription_id: 'multi-agent-subscription',
      solana_contract_address: '7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub',
      subscriber_address: 'D2hWeWekkcxJisDHLcFJEgzwvDE9yJmB7NKzLpvdSp6e',
      merchant_address: '7tbxr-naaaa-aaaao-qkrca-cai',
      payment_token_mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      amount: BigInt('29000000'),
      interval_seconds: BigInt('2592000'),
      reminder_days_before_payment: 3,
      api_key: 'demo-api-key'
    }, subscriptionAgentToken)

    console.log(`✅ Subscription created: ${subscriptionId}`)

    // Monitoring agent reads subscription info
    console.log('📊 Monitoring Agent: Reading subscription info...')
    const subInfo = await client.getSubscriptionInfoWithX402(
      subscriptionId,
      monitoringAgentToken
    )
    console.log(`📋 Subscription status: ${subInfo.status}`)

    // Show usage separated by agent
    console.log('\n📈 Usage by Agent:')
    const subAgentUsage = client.getAgentUsageHistory('subscription-manager-agent')
    const monitorAgentUsage = client.getAgentUsageHistory('monitoring-agent')

    console.log(`🤖 Subscription Agent: ${subAgentUsage.length} actions`)
    console.log(`📊 Monitoring Agent: ${monitorAgentUsage.length} actions`)

  } catch (error) {
    console.error('❌ Multi-agent scenario failed:', error)
  }
}

// Main execution function for testing
export async function runAllX402Examples() {
  console.log('🚀 Running X.402 AI Agent Integration Examples...\n')

  try {
    // Example 1: Basic subscription creation
    console.log('='.repeat(60))
    console.log('Example 1: Basic Subscription Creation')
    console.log('='.repeat(60))
    await agentCreatesSubscription()

    // Example 2: Token validation
    console.log('\n' + '='.repeat(60))
    console.log('Example 2: Token Validation')
    console.log('='.repeat(60))
    await agentValidatesToken()

    // Example 3: Function discovery
    console.log('\n' + '='.repeat(60))
    console.log('Example 3: Function Discovery')
    console.log('='.repeat(60))
    await agentDiscoversFunctions()

    // Example 4: Constraint enforcement
    console.log('\n' + '='.repeat(60))
    console.log('Example 4: Constraint Enforcement')
    console.log('='.repeat(60))
    await agentWithConstraintEnforcement()

    // Example 5: Multi-agent scenario
    console.log('\n' + '='.repeat(60))
    console.log('Example 5: Multi-Agent Scenario')
    console.log('='.repeat(60))
    await multiAgentScenario()

    console.log('\n🎉 All X.402 examples completed successfully!')

  } catch (error) {
    console.error('\n❌ Example execution failed:', error)
  }
}

// Export individual examples for selective testing
export {
  agentCreatesSubscription as createSubscriptionExample,
  agentValidatesToken as validateTokenExample,
  agentManagesSubscriptionLifecycle as manageLifecycleExample,
  agentDiscoversFunctions as discoverFunctionsExample,
  agentWithConstraintEnforcement as constraintExample,
  multiAgentScenario as multiAgentExample
}