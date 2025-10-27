import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, CreditCard, CheckCircle, AlertCircle, Wallet } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { OuroC } from '@ouroc/sdk'

interface X402PaymentDemoProps {
  isOpen: boolean
  onClose: () => void
  plan: any
}

export default function X402PaymentDemo({ isOpen, onClose, plan }: X402PaymentDemoProps) {
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [paymentResult, setPaymentResult] = useState<{ success: boolean; error?: string; transaction?: string; ipfsHash?: string } | null>(null)
  const [showCardInput, setShowCardInput] = useState(false)
  const [cardNumber, setCardNumber] = useState('')
  const [email, setEmail] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('10.00')
  const { publicKey } = useWallet()
  const { connected } = useWallet()

  const [client, setClient] = useState<OuroC | null>(null)

  // Initialize OuroC client
  useEffect(() => {
    const initClient = async () => {
      if (typeof window !== 'undefined') {
        // Create OuroC client using our simplified SDK
        const ouroCClient = new OuroC({
          canisterId: '7tbxr-naaaa-aaaao-qkrca-cai', // OuroC Timer Canister (IC mainnet)
          network: 'mainnet',
          x402Enabled: true,
          supportedTokens: ['USDC', 'USDT'],
          feePercentage: 1.5,
          notifications: true,
          autoProcessing: true
        })

        // Initialize the SDK
        await ouroCClient.initialize()
        setClient(ouroCClient)
        console.log('✅ OuroC Core SDK initialized for X.402 demo')
      }
    }
    initClient()
  }, [])

  const handleX402Payment = async () => {
    if (!connected || !publicKey || !client) {
      setPaymentResult({
        success: false,
        error: 'Please connect your wallet first'
      })
      return
    }

    setPaymentProcessing(true)
    setPaymentResult(null)

    try {
      console.log('🔄 Processing X.402 payment...')

      // Create X.402 payment request
      const x402Request = {
        amount: parseFloat(paymentAmount),
        recipient: 'DemoMerchant111111111111111111111111111111111',
        token: plan.color === 'purple' ? 'USDT' : 'USDC',
        reference: `demo_${Date.now()}`
      }

      console.log('X.402 Payment Request:', x402Request)

      // Process X.402 payment through our SDK
      const result = await client.createX402Payment(x402Request)

      console.log('X.402 Payment Result:', result)

      setPaymentResult(result)

      if (result.success && result.ipfsHash) {
        console.log('✅ Payment recorded to IPFS:', result.ipfsHash)

        // Show success state briefly then close
        setTimeout(() => {
          setPaymentResult(null)
          setTimeout(() => {
            onClose()
          }, 3000)
        }, 1000)
      }
    } catch (error: any) {
      console.error('X.402 Payment failed:', error)
      setPaymentResult({
        success: false,
        error: error.message || 'Payment processing failed'
      })
    } finally {
      setPaymentProcessing(false)
    }
  }

  const handleCardPayment = async () => {
    if (!connected || !publicKey || !client) {
      setPaymentResult({
        success: false,
        error: 'Please connect your wallet first'
      })
      return
    }

    if (!cardNumber || !email) {
      setPaymentResult({
        success: false,
        error: 'Please enter card details and email'
      })
      return
    }

    setPaymentProcessing(true)

    try {
      // Create a card payment configuration
      const x402Request = {
        amount: parseFloat(paymentAmount),
        recipient: 'DemoMerchant111111111111111111111111111111111',
        token: plan.color === 'purple' ? 'USDT' : 'USDC',
        reference: `card_${cardNumber}_${Date.now()}`
      }

      console.log('Card X.402 Payment Request:', x402Request)

      // Process through SDK
      const result = await client.createX402Payment(x402Request)

      console.log('Card X.402 Payment Result:', result)

      setPaymentResult(result)

      if (result.success && result.ipfsHash) {
        console.log('✅ Card Payment recorded to IPFS:', result.ipfsHash)
        setCardNumber('')
        setEmail('')

        // Show success state briefly then reset
        setTimeout(() => {
          setPaymentResult(null)
          setTimeout(() => {
            onClose()
          }, 3000)
        }, 1000)
      }
    } catch (error: any) {
      console.error('Card X.402 Payment failed:', error)
      setPaymentResult({
        success: false,
        error: error.message || 'Card payment processing failed'
      })
    } finally {
      setPaymentProcessing(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose()
            }
          }}
        >
          {/* Background overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-2xl p-8 max-w-4xl mx-auto shadow-2xl">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gradient-to-r from-purple-primary to-purple-dark p-2 rounded-full">
                  <CreditCard className="text-purple-primary" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">X.402 HTTP-Native Payments</h2>
              <p className="text-gray-300 text-center mb-6">
                Try our simplified X.402 payment flow - no wallet switching required!
              </p>

              {/* X.402 Payment Demo Options */}
              <div className="space-y-6 mb-8">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Direct Payment */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Direct Payment</h3>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Amount (USDC)
                        </label>
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-900 border border-gray-300 rounded-lg text-white focus:outline-none focus:border-purple-primary text-lg"
                          placeholder="10.00"
                          step="0.01"
                        />
                      </div>
                      <button
                        onClick={handleX402Payment}
                        disabled={paymentProcessing}
                        className="w-full bg-purple-primary hover:bg-purple-dark text-white font-semibold rounded-lg px-4 py-2 transition-colors"
                      >
                        {paymentProcessing ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Processing...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <span>Send {paymentAmount} {plan.color === 'purple' ? 'USDT' : 'USDC'} via X.402</span>
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        )}
                      </button>
                    </div>

                    {/* Card Payment */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1 flex items-center space-x-2">
                          <Wallet className="text-gray-600" />
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            className="flex-1 px-4 py-2 bg-gray-900 border border-gray-300 rounded-l text-white focus:outline-none focus:border-purple-primary"
                            placeholder="1234 5678 9012 3456"
                            maxLength={16}
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-300 rounded-lg text-white focus:outline-none focus:border-purple-primary"
                            placeholder="customer@example.com"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleCardPayment}
                        disabled={paymentProcessing}
                        className="w-full bg-purple-primary hover:bg-purple-dark text-white font-semibold rounded-lg px-4 py-2 transition-colors"
                      >
                        {paymentProcessing ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Processing Card...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <span>Pay {paymentAmount} {plan.color === 'purple' ? 'USDT' : 'USDC'} with Card</span>
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        )}
                      </button>
                    </div>

                    {/* Toggle Payment Method */}
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => setShowCardInput(!showCardInput)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          showCardInput
                            ? 'bg-purple-primary text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {showCardInput ? 'Use Direct Payment' : 'Use Card Payment'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Payment Result */}
                {paymentResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto"
                  >
                    {paymentResult.success ? (
                      <div className="text-center">
                        <CheckCircle className="h-12 w-12 text-green-400 mb-4 mx-auto" />
                        <h3 className="text-xl font-bold text-green-primary mb-2">Payment Successful!</h3>
                        <p className="text-gray-300 mb-2">
                          Transaction: {paymentResult.transaction?.slice(0, 8)}...{paymentResult.transaction?.slice(-8)}
                        </p>
                        {paymentResult.ipfsHash && (
                          <p className="text-sm text-green-400">
                            <strong>IPFS Record:</strong> {paymentResult.ipfsHash}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-400 mb-4 mx-auto" />
                        <h3 className="text-xl font-bold text-red-400 mb-2">Payment Failed</h3>
                        <p className="text-gray-300">{paymentResult.error}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Plan Info */}
              <div className="mt-8 p-4 bg-gray-800 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Selected Plan: {plan.name}</h3>
                <div className="text-gray-300">
                  <p>Price: ${plan.price} {plan.color === 'purple' ? 'USDT' : 'USDC'}/{plan.period}</p>
                  <p>Features: {plan.features.slice(0, 3).join(', ')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-full p-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="sr-only">Close</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}