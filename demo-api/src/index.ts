/**
 * X.402 Demo API
 *
 * This demo API showcases the complete X.402 payment flow:
 * 1. Protected endpoints that require X.402 payment
 * 2. Automatic payment request generation
 * 3. Payment proof verification
 * 4. Response with payment details
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'

import {
  createX402Middleware,
  x402,
  createPathBasedPricing,
  createConditionalX402Middleware
} from '@ouroc/x402-middleware/express'
import { quickVerify, parsePaymentProof, extractPaymentProofFromHeaders } from '@ouroc/x402-middleware'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Basic middleware
app.use(helmet())
app.use(compression())
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}))
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.'
  }
})
app.use('/api', limiter)

// X.402 Configuration
const x402Config = {
  icpHost: process.env.ICP_HOST || 'https://ic0.app',
  sellerAddress: process.env.SELLER_ADDRESS || 'DemoSeller111111111111111111111111111111',
  facilitator: process.env.FACILITATOR || 'ouroc',
  facilitatorEndpoint: process.env.FACILITATOR_ENDPOINT || 'https://api.ouroc.network/x402/pay',
  currency: 'USDC',
  requireProof: true,
  pricing: createPathBasedPricing({
    '/api/basic': 0.01,    // $0.01 for basic AI queries
    '/api/premium': 0.05,  // $0.05 for premium features
    '/api/enterprise': 0.10, // $0.10 for enterprise APIs
    '/api/ai-chat': 0.025, // $0.025 per AI chat request
    '/api/data-analysis': 0.15, // $0.15 for data analysis
    '/api/image-generation': 0.50 // $0.50 for image generation
  })
}

// Create X.402 middleware instance
const x402Middleware = createX402Middleware(x402Config, {
  logLevel: 'info',
  customHeaders: {
    'X-API-Version': '1.0.0',
    'X-Powered-By': 'OuroC-X402-Demo'
  },
  onPayment: (paymentInfo, req) => {
    console.log(`💳 Payment required for ${req.method} ${req.path}:`, {
      amount: paymentInfo.payment?.amount,
      currency: paymentInfo.payment?.currency,
      request_id: paymentInfo.payment?.request_id
    })
  },
  onSuccess: (proof, req) => {
    console.log(`✅ Payment verified for ${req.method} ${req.path}:`, {
      request_id: proof.request_id,
      amount: proof.payment_amount,
      payer: proof.payer_address.slice(0, 8) + '...'
    })
  },
  onError: (error, req) => {
    console.error(`❌ Payment error for ${req.method} ${req.path}:`, error.message)
  }
})

// Health check endpoint (no payment required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: {
      x402_payments: true,
      payment_proof_verification: true,
      multi_tier_pricing: true,
      ai_agent_support: true
    }
  })
})

// API documentation (no payment required)
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'X.402 Demo API',
    description: 'Demonstration API showcasing X.402 payment protection',
    version: '1.0.0',
    endpoints: {
      'GET /api/basic': {
        description: 'Basic AI query - $0.01',
        pricing: '$0.01 per request',
        requires_payment: true,
        example: 'curl -H "X-Payment-Proof: <proof>" https://api.demo.ouroc.network/api/basic'
      },
      'GET /api/premium': {
        description: 'Premium AI features - $0.05',
        pricing: '$0.05 per request',
        requires_payment: true
      },
      'GET /api/enterprise': {
        description: 'Enterprise APIs - $0.10',
        pricing: '$0.10 per request',
        requires_payment: true
      },
      'POST /api/ai-chat': {
        description: 'AI chat completion - $0.025',
        pricing: '$0.025 per request',
        requires_payment: true,
        body: { message: 'string', model: 'optional' }
      },
      'POST /api/data-analysis': {
        description: 'Data analysis service - $0.15',
        pricing: '$0.15 per request',
        requires_payment: true,
        body: { data: 'array', analysis_type: 'string' }
      },
      'POST /api/image-generation': {
        description: 'AI image generation - $0.50',
        pricing: '$0.50 per request',
        requires_payment: true,
        body: { prompt: 'string', style: 'optional' }
      },
      'GET /api/payment-status/:requestId': {
        description: 'Check payment status',
        requires_payment: false
      }
    },
    payment_flow: {
      '1. Make Request': 'API returns 402 Payment Required with payment details',
      '2. Execute Payment': 'Use X.402 client to execute payment',
      '3. Retry Request': 'Include payment proof in X-Payment-Proof header',
      '4. Access Granted': 'API processes request and returns results'
    }
  })
})

// X.402 protected endpoints

// Basic AI endpoint - $0.01
app.get('/api/basic', x402Middleware, async (req, res) => {
  try {
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 100))

    res.json({
      success: true,
      message: 'Basic AI query processed successfully',
      data: {
        query: 'Example basic AI response',
        confidence: 0.95,
        processing_time_ms: 100,
        model: 'demo-basic-v1'
      },
      payment_info: req.x402Payment ? {
        request_id: req.x402Payment.proof.request_id,
        amount_paid: req.x402Payment.proof.payment_amount,
        currency: req.x402Payment.proof.payment_currency
      } : undefined
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Premium AI endpoint - $0.05
app.get('/api/premium', x402Middleware, async (req, res) => {
  try {
    // Simulate premium AI processing
    await new Promise(resolve => setTimeout(resolve, 300))

    res.json({
      success: true,
      message: 'Premium AI features accessed',
      data: {
        advanced_analysis: 'Advanced AI analysis results',
        insights: ['Insight 1', 'Insight 2', 'Insight 3'],
        recommendations: ['Recommendation A', 'Recommendation B'],
        confidence: 0.98,
        processing_time_ms: 300,
        model: 'demo-premium-v2'
      },
      payment_info: req.x402Payment ? {
        request_id: req.x402Payment.proof.request_id,
        amount_paid: req.x402Payment.proof.payment_amount,
        currency: req.x402Payment.proof.payment_currency
      } : undefined
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Enterprise AI endpoint - $0.10
app.get('/api/enterprise', x402Middleware, async (req, res) => {
  try {
    // Simulate enterprise AI processing
    await new Promise(resolve => setTimeout(resolve, 500))

    res.json({
      success: true,
      message: 'Enterprise AI services accessed',
      data: {
        enterprise_insights: 'High-value enterprise intelligence',
        strategic_recommendations: ['Strategy 1', 'Strategy 2', 'Strategy 3'],
        market_analysis: {
          trends: ['Trend A', 'Trend B'],
          opportunities: ['Opportunity 1', 'Opportunity 2'],
          risks: ['Risk 1', 'Risk 2']
        },
        confidence: 0.99,
        processing_time_ms: 500,
        model: 'demo-enterprise-v3'
      },
      payment_info: req.x402Payment ? {
        request_id: req.x402Payment.proof.request_id,
        amount_paid: req.x402Payment.proof.payment_amount,
        currency: req.x402Payment.proof.payment_currency
      } : undefined
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// AI Chat endpoint - $0.025
app.post('/api/ai-chat', x402Middleware, async (req, res) => {
  try {
    const { message, model = 'demo-chat-v1' } = req.body

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Message is required'
      })
    }

    // Simulate AI chat processing
    await new Promise(resolve => setTimeout(resolve, 200))

    res.json({
      success: true,
      message: 'AI chat response generated',
      data: {
        response: `This is a demo AI response to: "${message}"`,
        model,
        tokens_used: Math.floor(Math.random() * 100) + 50,
        processing_time_ms: 200,
        conversation_id: `conv_${Date.now()}`
      },
      payment_info: req.x402Payment ? {
        request_id: req.x402Payment.proof.request_id,
        amount_paid: req.x402Payment.proof.payment_amount,
        currency: req.x402Payment.proof.payment_currency
      } : undefined
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Data Analysis endpoint - $0.15
app.post('/api/data-analysis', x402Middleware, async (req, res) => {
  try {
    const { data, analysis_type = 'statistical' } = req.body

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Data array is required'
      })
    }

    // Simulate data analysis processing
    await new Promise(resolve => setTimeout(resolve, 400))

    const analysis = {
      data_points: data.length,
      analysis_type,
      summary: {
        mean: data.reduce((a: number, b: number) => a + b, 0) / data.length,
        min: Math.min(...data),
        max: Math.max(...data),
        median: data.sort((a: number, b: number) => a - b)[Math.floor(data.length / 2)]
      },
      insights: [
        `Dataset contains ${data.length} data points`,
        'Statistical analysis completed',
        'No significant anomalies detected'
      ],
      processing_time_ms: 400
    }

    res.json({
      success: true,
      message: 'Data analysis completed',
      data: analysis,
      payment_info: req.x402Payment ? {
        request_id: req.x402Payment.proof.request_id,
        amount_paid: req.x402Payment.proof.payment_amount,
        currency: req.x402Payment.proof.payment_currency
      } : undefined
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Image Generation endpoint - $0.50
app.post('/api/image-generation', x402Middleware, async (req, res) => {
  try {
    const { prompt, style = 'realistic' } = req.body

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Prompt is required'
      })
    }

    // Simulate image generation processing
    await new Promise(resolve => setTimeout(resolve, 1000))

    res.json({
      success: true,
      message: 'Image generated successfully',
      data: {
        image_url: `https://demo-images.ouroc.network/generated/${Date.now()}.png`,
        prompt,
        style,
        dimensions: '512x512',
        model: 'demo-image-v1',
        generation_time_ms: 1000,
        seed: Math.floor(Math.random() * 1000000)
      },
      payment_info: req.x402Payment ? {
        request_id: req.x402Payment.proof.request_id,
        amount_paid: req.x402Payment.proof.payment_amount,
        currency: req.x402Payment.proof.payment_currency
      } : undefined
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Payment verification endpoint (no payment required)
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { payment_proof } = req.body

    if (!payment_proof) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'payment_proof is required'
      })
    }

    // Verify payment proof
    const verification = await quickVerify(payment_proof)

    res.json({
      success: true,
      message: 'Payment proof verification completed',
      verification
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Payment status endpoint (no payment required)
app.get('/api/payment-status/:requestId', (req, res) => {
  try {
    const { requestId } = req.params

    // In a real implementation, this would query the payment facilitator
    // For demo purposes, return mock status
    res.json({
      success: true,
      message: 'Payment status retrieved',
      data: {
        request_id: requestId,
        status: 'completed',
        amount: 0.01,
        currency: 'USDC',
        timestamp: Date.now(),
        transaction_hash: 'demo_tx_hash_' + requestId.slice(-8)
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Statistics endpoint (no payment required)
app.get('/api/stats', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'API statistics retrieved',
      data: {
        total_requests: 1234,
        successful_payments: 1198,
        failed_payments: 36,
        total_revenue_usdc: 15.67,
        average_response_time_ms: 250,
        uptime_percentage: 99.9,
        last_updated: new Date().toISOString()
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    available_endpoints: [
      'GET /health',
      'GET /api/docs',
      'GET /api/basic (X.402 protected)',
      'GET /api/premium (X.402 protected)',
      'GET /api/enterprise (X.402 protected)',
      'POST /api/ai-chat (X.402 protected)',
      'POST /api/data-analysis (X.402 protected)',
      'POST /api/image-generation (X.402 protected)',
      'POST /api/verify-payment',
      'GET /api/payment-status/:requestId',
      'GET /api/stats'
    ]
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 X.402 Demo API server running on port ${PORT}`)
  console.log(`📖 API Documentation: http://localhost:${PORT}/api/docs`)
  console.log(`💳 X.402 Payment Protection: Enabled`)
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`)
  console.log('')
  console.log('📋 Protected Endpoints (require X.402 payment):')
  console.log('   • GET /api/basic - $0.01')
  console.log('   • GET /api/premium - $0.05')
  console.log('   • GET /api/enterprise - $0.10')
  console.log('   • POST /api/ai-chat - $0.025')
  console.log('   • POST /api/data-analysis - $0.15')
  console.log('   • POST /api/image-generation - $0.50')
  console.log('')
  console.log('💡 Usage Example:')
  console.log('   1. Make request to protected endpoint')
  console.log('   2. Receive 402 Payment Required response')
  console.log('   3. Execute payment using X.402 client')
  console.log('   4. Retry request with X-Payment-Proof header')
  console.log('   5. Receive API response')
})

export default app