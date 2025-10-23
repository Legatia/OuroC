/**
 * X.402 Demo Client
 *
 * This demo showcases how AI agents can use X.402 to automatically
 * handle payments when accessing protected APIs.
 */

import { createX402Client, AGENT_CONFIGS } from '@ouroc/sdk'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'

// Demo configuration
const DEMO_API_URL = process.env.DEMO_API_URL || 'http://localhost:3001'
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet'

// Create or load agent wallet
function createAgentWallet(): Keypair {
  // In production, this would load from secure storage
  console.log('🔐 Creating new agent wallet...')
  const keypair = Keypair.generate()

  console.log('📋 Agent Wallet Details:')
  console.log(`   Address: ${keypair.publicKey.toBase58()}`)
  console.log(`   Network: ${SOLANA_NETWORK}`)
  console.log('')
  console.log('⚠️  Save this wallet address to fund it with test USDC:')
  console.log(`   ${keypair.publicKey.toBase58()}`)
  console.log('')

  return keypair
}

// Initialize X.402 client
function initializeX402Client(agentWallet: Keypair) {
  console.log('🚀 Initializing X.402 client...')

  const x402Client = createX402Client({
    icpHost: 'https://ic0.app',
    agentWallet,
    ...AGENT_CONFIGS.standard, // Use standard configuration
    facilitatorEndpoint: 'https://api.ouroc.network/x402/pay',
    logLevel: 'info'
  })

  console.log('✅ X.402 client initialized')
  console.log('')

  return x402Client
}

// Demo API request with automatic X.402 payment handling
async function makeProtectedRequest(
  x402Client: any,
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  console.log(`📡 Making request to: ${endpoint}`)

  try {
    // X.402 client automatically handles 402 responses
    const response = await x402Client.fetch(`${DEMO_API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'X.402-Demo-Client/1.0.0'
      },
      ...options
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`✅ Request successful: ${endpoint}`)

    return data
  } catch (error) {
    console.error(`❌ Request failed: ${endpoint}`, error)
    throw error
  }
}

// Demo different API endpoints
async function runDemo(x402Client: any, agentWallet: Keypair) {
  console.log('🎯 Starting X.402 Demo')
  console.log('=' .repeat(50))
  console.log('')

  const agentAddress = agentWallet.publicKey.toBase58()

  try {
    // 1. Check agent balance
    console.log('1️⃣ Checking agent balance...')
    const balance = await x402Client.getBalance()
    console.log(`   Current balance: ${balance} lamports`)
    console.log('')

    // 2. Basic API call ($0.01)
    console.log('2️⃣ Making Basic API call ($0.01)...')
    const basicResponse = await makeProtectedRequest(x402Client, '/api/basic')
    console.log('   Response:', JSON.stringify(basicResponse, null, 2))
    console.log('')

    // 3. Premium API call ($0.05)
    console.log('3️⃣ Making Premium API call ($0.05)...')
    const premiumResponse = await makeProtectedRequest(x402Client, '/api/premium')
    console.log('   Response:', JSON.stringify(premiumResponse, null, 2))
    console.log('')

    // 4. AI Chat API call ($0.025)
    console.log('4️⃣ Making AI Chat API call ($0.025)...')
    const chatResponse = await makeProtectedRequest(x402Client, '/api/ai-chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello! Tell me about X.402 payments.',
        model: 'demo-chat-v1'
      })
    })
    console.log('   Response:', JSON.stringify(chatResponse, null, 2))
    console.log('')

    // 5. Data Analysis API call ($0.15)
    console.log('5️⃣ Making Data Analysis API call ($0.15)...')
    const analysisResponse = await makeProtectedRequest(x402Client, '/api/data-analysis', {
      method: 'POST',
      body: JSON.stringify({
        data: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        analysis_type: 'statistical'
      })
    })
    console.log('   Response:', JSON.stringify(analysisResponse, null, 2))
    console.log('')

    // 6. Enterprise API call ($0.10)
    console.log('6️⃣ Making Enterprise API call ($0.10)...')
    const enterpriseResponse = await makeProtectedRequest(x402Client, '/api/enterprise')
    console.log('   Response:', JSON.stringify(enterpriseResponse, null, 2))
    console.log('')

    // 7. Get payment statistics
    console.log('7️⃣ Getting payment statistics...')
    const stats = x402Client.getStats()
    console.log('   Payment Statistics:', {
      total_requests: stats.totalRequests,
      payments_made: stats.paymentsMade,
      payments_failed: stats.paymentsFailed,
      total_spent: stats.totalSpent,
      average_payment_time: stats.averagePaymentTime,
      retry_rate: stats.retryRate
    })
    console.log('')

    // 8. Check final balance
    console.log('8️⃣ Checking final balance...')
    const finalBalance = await x402Client.getBalance()
    console.log(`   Final balance: ${finalBalance} lamports`)
    console.log(`   Spent: ${balance - finalBalance} lamports`)
    console.log('')

    console.log('🎉 Demo completed successfully!')

  } catch (error) {
    console.error('💥 Demo failed:', error)

    if (error instanceof Error && error.message.includes('402')) {
      console.log('')
      console.log('💡 This is expected! The API returned a 402 Payment Required response.')
      console.log('   In a real scenario, the X.402 client would automatically:')
      console.log('   1. Parse the payment requirements')
      console.log('   2. Execute the payment')
      console.log('   3. Retry the request with payment proof')
      console.log('')
      console.log('   For this demo, make sure your agent wallet has sufficient USDC balance.')
      console.log(`   Agent address: ${agentAddress}`)
    }
  }
}

// Manual payment flow demo
async function demonstrateManualPaymentFlow(agentWallet: Keypair) {
  console.log('🔧 Demonstrating Manual X.402 Payment Flow')
  console.log('=' .repeat(50))
  console.log('')

  try {
    // 1. Make request without payment
    console.log('1️⃣ Making request without payment...')
    const response = await fetch(`${DEMO_API_URL}/api/basic`)

    if (response.status === 402) {
      const paymentInfo = await response.json()
      console.log('   💳 Payment Required!')
      console.log('   Payment Info:', JSON.stringify(paymentInfo, null, 2))
      console.log('')

      // 2. Show what would happen with X.402 client
      console.log('2️⃣ X.402 Client would automatically:')
      console.log('   ✅ Parse payment requirements from 402 response')
      console.log('   ✅ Execute payment to facilitator')
      console.log('   ✅ Receive payment proof')
      console.log('   ✅ Retry request with X-Payment-Proof header')
      console.log('   ✅ Process API response')
      console.log('')

      // 3. Demonstrate payment proof verification
      console.log('3️⃣ Payment Proof Verification:')
      console.log('   In production, the middleware would verify:')
      console.log('   • Cryptographic signature')
      console.log('   • Payment amount and currency')
      console.log('   • Transaction validity on blockchain')
      console.log('   • Proof expiry and freshness')
      console.log('')
    }

  } catch (error) {
    console.error('❌ Manual demo failed:', error)
  }
}

// Main demo execution
async function main() {
  console.log('🌟 X.402 Payment Protocol Demo')
  console.log('=' .repeat(50))
  console.log('')

  try {
    // Create agent wallet
    const agentWallet = createAgentWallet()

    // Initialize X.402 client
    const x402Client = initializeX402Client(agentWallet)

    // Check if demo API is running
    console.log('🔍 Checking if demo API is running...')
    try {
      const healthResponse = await fetch(`${DEMO_API_URL}/health`)
      if (!healthResponse.ok) {
        throw new Error('Demo API not responding')
      }
      console.log('✅ Demo API is running')
      console.log('')
    } catch (error) {
      console.log('❌ Demo API is not running!')
      console.log('   Please start the demo API first:')
      console.log('   cd ../demo-api && npm install && npm run dev')
      console.log('')
      console.log('   Then run this demo again.')
      return
    }

    // Run manual payment flow demo
    await demonstrateManualPaymentFlow(agentWallet)

    console.log('🚀 Starting automated X.402 demo...')
    console.log('   (This will use the X.402 client to handle payments automatically)')
    console.log('')
    console.log('⚠️  Make sure your agent wallet has USDC balance for payments:')
    console.log(`   Wallet: ${agentWallet.publicKey.toBase58()}`)
    console.log('')

    // Wait for user to fund wallet
    console.log('⏳ Waiting 10 seconds for you to fund the wallet (or press Ctrl+C to skip)...')
    await new Promise(resolve => setTimeout(resolve, 10000))

    // Run automated demo
    await runDemo(x402Client, agentWallet)

  } catch (error) {
    console.error('💥 Demo failed:', error)
    process.exit(1)
  }
}

// Run demo
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { main, runDemo, demonstrateManualPaymentFlow }