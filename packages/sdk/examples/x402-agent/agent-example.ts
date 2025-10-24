/**
 * AI Agent Subscription Example
 *
 * This example shows how an AI agent can autonomously subscribe to a service
 * using X.402 HTTP-native payments.
 */

import { X402AgentClient } from '@ouroc/sdk'
import { Keypair } from '@solana/web3.js'

// Example: AI Agent subscribes to a SaaS service
async function agentSubscribeExample() {
  console.log('🤖 AI Agent Subscription Example')
  console.log('================================\n')

  // Agent has its own Solana wallet
  // In production, this would be securely managed
  const agentWallet = Keypair.generate() // Or load from secure storage

  console.log(`🔑 Agent Wallet: ${agentWallet.publicKey.toBase58()}\n`)

  // Create X.402 agent client
  const agent = new X402AgentClient(agentWallet, 'devnet')

  console.log('📡 Agent connecting to service...\n')

  try {
    // Agent autonomously subscribes
    // No human interaction needed!
    const result = await agent.subscribe('https://your-saas.com/api/subscribe', {
      plan: 'pro',
      interval: 'monthly'
    })

    console.log('✅ Agent successfully subscribed!')
    console.log('📝 Subscription Details:')
    console.log(`   - Subscription ID: ${result.subscriptionId}`)
    console.log(`   - Payment Made: ${result.paymentInfo?.paid}`)
    console.log(`   - Amount: ${result.paymentInfo?.amount} USDC`)
    console.log(`   - Transaction: ${result.paymentInfo?.transaction}\n`)

    // Agent can now use the service
    console.log('🎉 Agent can now access premium features!')
    console.log('⏰ OuroC will handle recurring payments automatically')
  } catch (error: any) {
    console.error('❌ Subscription failed:', error.message)
  }
}

// Example: Agent makes a one-time payment
async function agentOneTimePayment() {
  console.log('\n🤖 AI Agent One-Time Payment Example')
  console.log('====================================\n')

  const agentWallet = Keypair.generate()
  const agent = new X402AgentClient(agentWallet, 'devnet')

  console.log(`🔑 Agent Wallet: ${agentWallet.publicKey.toBase58()}\n`)

  try {
    // Agent makes a one-time API call that requires payment
    const response = await agent.fetchWithPayment('https://api.example.com/premium-data', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Payment successful!')
      console.log('📊 Received data:', data)
      console.log(`💰 Amount paid: ${response.paymentInfo?.amount} USDC\n`)
    } else {
      console.error('❌ Request failed:', response.statusText)
    }
  } catch (error: any) {
    console.error('❌ Payment failed:', error.message)
  }
}

// Example: Agent with custom configuration
async function agentWithCustomConfig() {
  console.log('\n🤖 AI Agent with Custom Configuration')
  console.log('====================================\n')

  // Load agent wallet from environment or secure storage
  const privateKeyBase64 = process.env.AGENT_PRIVATE_KEY || ''
  const agentWallet = privateKeyBase64
    ? Keypair.fromSecretKey(Buffer.from(privateKeyBase64, 'base64'))
    : Keypair.generate()

  // Create agent for mainnet
  const agent = new X402AgentClient(agentWallet, 'mainnet')

  console.log(`🔑 Agent Address: ${agent.getAddress()}\n`)

  // Check balance before subscribing
  const hasBalance = await agent.checkBalance(29.99)

  if (!hasBalance) {
    console.log('⚠️  Insufficient balance for subscription')
    return
  }

  // Subscribe with custom options
  try {
    const result = await agent.subscribe('https://enterprise-saas.com/api/subscribe', {
      plan: 'enterprise',
      interval: 'yearly',
      features: ['api-access', 'priority-support', 'analytics'],
      metadata: {
        agentName: 'Claude Assistant',
        purpose: 'Data analysis automation'
      }
    })

    console.log('✅ Enterprise subscription created!')
    console.log(`📝 Subscription ID: ${result.subscriptionId}`)
  } catch (error: any) {
    console.error('❌ Subscription failed:', error.message)
  }
}

// Run examples
if (require.main === module) {
  (async () => {
    await agentSubscribeExample()
    await agentOneTimePayment()
    await agentWithCustomConfig()
  })()
}

export { agentSubscribeExample, agentOneTimePayment, agentWithCustomConfig }
