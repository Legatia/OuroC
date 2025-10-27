/**
 * Merchant API Example with X.402
 *
 * This example shows how a merchant (dApp developer) can accept
 * X.402 payments from AI agents using OuroC SDK.
 */

import express from 'express'
import { x402Middleware, OuroC } from '@ouroc/sdk'

// Example: Basic Express.js API with X.402 protection
function basicMerchantAPI() {
  const app = express()
  app.use(express.json())

  // Initialize OuroC for subscription management
  const ouroc = new OuroC({
    canisterId: process.env.CANISTER_ID || '7tbxr-naaaa-aaaao-qkrca-cai',
    network: 'devnet',
    x402Enabled: true
  })

  // Initialize OuroC
  ouroc.initialize().then(() => {
    console.log('✅ OuroC initialized')
  })

  // Protected subscription endpoint
  app.post('/api/subscribe',
    x402Middleware({
      price: '$29.99',
      token: 'USDC',
      network: 'devnet',
      merchantAddress: process.env.MERCHANT_WALLET || 'YourWalletAddress...',
      description: 'Pro Plan Monthly Subscription'
    }),
    async (req, res) => {
      // Payment verified - agent's wallet address is available
      const agentWallet = req.x402Payment?.payer
      const paymentAmount = req.x402Payment?.amount
      const txSignature = req.x402Payment?.transaction

      console.log(`✅ Payment received from agent: ${agentWallet}`)
      console.log(`💰 Amount: ${paymentAmount} micro-units USDC`)

      try {
        // Create recurring subscription in OuroC
        const subscription = await ouroc.createSubscription({
          subscriber_address: agentWallet,
          merchant_address: process.env.MERCHANT_WALLET || 'YourWalletAddress...',
          amount: BigInt(paymentAmount || 0),
          payment_token_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          interval_seconds: BigInt(2_592_000), // 30 days
          start_time: [], // Start immediately
          api_key: process.env.API_KEY || 'your-api-key'
        })

        console.log(`📝 Subscription created: ${subscription.subscription_id}`)

        res.json({
          success: true,
          subscriptionId: subscription.subscription_id,
          agentAddress: agentWallet,
          message: 'AI agent successfully subscribed to Pro Plan',
          recurringPayments: 'Handled automatically by OuroC',
          nextPayment: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      } catch (error: any) {
        console.error('❌ Subscription creation failed:', error.message)
        res.status(500).json({
          success: false,
          error: 'Failed to create subscription'
        })
      }
    }
  )

  // Health check endpoint (free, no payment required)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Service is running' })
  })

  // Start server
  const PORT = process.env.PORT || 3000
  app.listen(PORT, () => {
    console.log(`🚀 Merchant API running on port ${PORT}`)
    console.log(`💳 X.402 payments enabled for AI agents`)
    console.log(`🔗 Subscribe endpoint: http://localhost:${PORT}/api/subscribe`)
  })

  return app
}

// Example: Next.js API Route with X.402
function nextjsAPIRouteExample() {
  /**
   * File: app/api/subscribe/route.ts
   */
  const exampleCode = `
import { x402Middleware, OuroC } from '@ouroc/sdk'

const ouroc = new OuroC({
  canisterId: process.env.CANISTER_ID!,
  network: 'mainnet',
  x402Enabled: true
})

export const POST = x402Middleware({
  price: 29.99,
  merchantAddress: process.env.MERCHANT_WALLET!,
  network: 'mainnet',
  description: 'Enterprise Plan Subscription'
})(async (req) => {
  const agentWallet = req.x402Payment.payer

  // Create subscription
  const subscription = await ouroc.createSubscription({
    subscriber_address: agentWallet,
    merchant_address: process.env.MERCHANT_WALLET!,
    amount: 29_990_000n,
    payment_token_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    interval_seconds: 2_592_000n,
    start_time: [],
    api_key: process.env.API_KEY!
  })

  return Response.json({
    success: true,
    subscriptionId: subscription.subscription_id,
    agentAddress: agentWallet
  })
})
  `

  console.log('📄 Next.js API Route Example:')
  console.log(exampleCode)
}

// Example: Multiple pricing tiers
function multipleTiersExample() {
  const app = express()
  app.use(express.json())

  const ouroc = new OuroC({
    canisterId: process.env.CANISTER_ID || '7tbxr-naaaa-aaaao-qkrca-cai',
    network: 'devnet'
  })

  // Basic Plan - $9.99/month
  app.post('/api/subscribe/basic',
    x402Middleware({
      price: '$9.99',
      merchantAddress: process.env.MERCHANT_WALLET!,
      network: 'devnet',
      description: 'Basic Plan - 100 API calls/month'
    }),
    async (req, res) => {
      // Create basic subscription...
      res.json({ plan: 'basic', price: 9.99 })
    }
  )

  // Pro Plan - $29.99/month
  app.post('/api/subscribe/pro',
    x402Middleware({
      price: '$29.99',
      merchantAddress: process.env.MERCHANT_WALLET!,
      network: 'devnet',
      description: 'Pro Plan - 1,000 API calls/month'
    }),
    async (req, res) => {
      // Create pro subscription...
      res.json({ plan: 'pro', price: 29.99 })
    }
  )

  // Enterprise Plan - $99.99/month
  app.post('/api/subscribe/enterprise',
    x402Middleware({
      price: '$99.99',
      merchantAddress: process.env.MERCHANT_WALLET!,
      network: 'devnet',
      description: 'Enterprise Plan - Unlimited API calls'
    }),
    async (req, res) => {
      // Create enterprise subscription...
      res.json({ plan: 'enterprise', price: 99.99 })
    }
  )

  return app
}

// Run examples
if (require.main === module) {
  console.log('🏪 Merchant API Examples for AI Agent Subscriptions\n')
  console.log('Example 1: Basic Express.js API')
  console.log('================================')
  basicMerchantAPI()

  console.log('\n\nExample 2: Next.js API Route')
  console.log('================================')
  nextjsAPIRouteExample()

  console.log('\n\nExample 3: Multiple Pricing Tiers')
  console.log('================================')
  console.log('Multiple endpoints for different subscription tiers')
}

export { basicMerchantAPI, multipleTiersExample }
