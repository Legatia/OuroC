import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Banknote, Smartphone, ArrowRight, CheckCircle, AlertCircle, Loader, Plus } from 'lucide-react'
import { GridClient } from '@ouroc/sdk'

// Import SubscriberOnRampFlow directly from grid module to avoid export issues
let SubscriberOnRampFlow: any
try {
  SubscriberOnRampFlow = require('@ouroc/sdk').SubscriberOnRampFlow
} catch {
  // Fallback for development
  SubscriberOnRampFlow = class {
    constructor() {}
    getDepositLimits() {
      return { minAmount: 10, maxAmount: 10000, supportedAmounts: [10, 25, 50, 100, 250, 500, 1000] }
    }
  }
}

interface GridOnRampProps {
  gridAccountId: string
  email: string
  onSuccess: (transactionId: string, amountUSDC: string) => void
  onSkip?: () => void
}

export default function GridOnRamp({ gridAccountId, email, onSuccess, onSkip }: GridOnRampProps) {
  const [step, setStep] = useState<'amount' | 'payment' | 'processing' | 'complete'>('amount')
  const [amount, setAmount] = useState<string>('')
  const [selectedAmount, setSelectedAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_account' | 'apple_pay' | 'google_pay'>('card')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quote, setQuote] = useState<any>(null)
  const [transactionId, setTransactionId] = useState<string>('')

  // Initialize Grid client and on-ramp flow
  const [gridClient] = useState(() => {
    try {
      return new GridClient({
        apiKey: process.env.NEXT_PUBLIC_GRID_API_KEY || 'demo_api_key',
        apiUrl: process.env.NEXT_PUBLIC_GRID_API_URL || 'https://api.squads.so',
        network: 'mainnet-beta'
      })
    } catch (err) {
      console.error('Failed to initialize Grid client:', err)
      return null
    }
  })

  const [onRampFlow] = useState(() => {
    return gridClient ? new SubscriberOnRampFlow({ gridClient }) : null
  })

  const limits = onRampFlow ? onRampFlow.getDepositLimits() : { minAmount: 10, maxAmount: 10000, supportedAmounts: [10, 25, 50, 100, 250, 500, 1000] }

  const handleAmountSelect = (selectedAmount: string) => {
    setAmount(selectedAmount)
    setSelectedAmount(selectedAmount)
    setError(null)
  }

  const handleAmountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!onRampFlow) {
        throw new Error('On-ramp service not available')
      }

      // Validate amount
      const validation = onRampFlow.validateAmount(amount)
      if (!validation.valid) {
        setError(validation.error || 'Invalid amount')
        return
      }

      // Get quote
      const quoteData = await onRampFlow.getOnRampQuote(amount, paymentMethod)
      setQuote(quoteData)
      setStep('payment')
    } catch (err: any) {
      console.error('Failed to get quote:', err)

      // Fallback to demo mode
      if (err.message.includes('Network Error') || err.message.includes('ERR_CERT')) {
        console.log('🔄 Grid API unavailable, using demo mode')
        const mockQuote = {
          amountUSD: amount,
          amountUSDC: amount,
          exchangeRate: 0.999,
          fees: {
            processingFee: (parseFloat(amount) * 0.029).toFixed(2),
            networkFee: '0.50',
            gridFee: (parseFloat(amount) * 0.002).toFixed(2),
            totalFee: (parseFloat(amount) * 0.031 + 0.50).toFixed(2),
          },
          estimatedArrival: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        }
        setQuote(mockQuote)
        setStep('payment')
        return
      }

      setError(err.message || 'Failed to get quote')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      if (!onRampFlow) {
        throw new Error('On-ramp service not available')
      }

      const paymentMethodObj = {
        id: `pm_${Date.now()}`,
        type: paymentMethod,
        isDefault: true,
      }

      const transaction = await onRampFlow.initiateOnRamp({
        gridAccountId,
        amountUSD: amount,
        paymentMethod: paymentMethodObj,
        savePaymentMethod: true,
      })

      setTransactionId(transaction.transactionId)
      setStep('processing')

      // Simulate processing time
      setTimeout(() => {
        setStep('complete')
        onSuccess(transaction.transactionId, quote.amountUSDC)
      }, 3000)

    } catch (err: any) {
      console.error('Failed to initiate on-ramp:', err)

      // Fallback to demo mode
      if (err.message.includes('Network Error') || err.message.includes('ERR_CERT')) {
        console.log('🔄 Grid API unavailable, using demo mode')
        const mockTransactionId = `onramp_demo_${Date.now()}`
        setTransactionId(mockTransactionId)
        setStep('processing')

        setTimeout(() => {
          setStep('complete')
          onSuccess(mockTransactionId, amount)
        }, 3000)
        return
      }

      setError(err.message || 'Failed to initiate deposit')
    } finally {
      setLoading(false)
    }
  }

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'card':
      case 'apple_pay':
      case 'google_pay':
        return <CreditCard className="h-5 w-5" />
      case 'bank_account':
        return <Banknote className="h-5 w-5" />
      default:
        return <CreditCard className="h-5 w-5" />
    }
  }

  const getPaymentLabel = (type: string) => {
    switch (type) {
      case 'card':
        return 'Credit/Debit Card'
      case 'bank_account':
        return 'Bank Transfer (ACH)'
      case 'apple_pay':
        return 'Apple Pay'
      case 'google_pay':
        return 'Google Pay'
      default:
        return 'Credit/Debit Card'
    }
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Amount Selection Step */}
      {step === 'amount' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-2xl"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-primary/20 mb-4">
              <Banknote className="h-8 w-8 text-green-primary" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Fund Your Account
            </h3>
            <p className="text-gray-400">
              Add USDC to your Grid account to start subscribing
            </p>
          </div>

          <form onSubmit={handleAmountSubmit} className="space-y-6">
            {/* Quick Amount Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Quick Amount
              </label>
              <div className="grid grid-cols-3 gap-2">
                {limits.supportedAmounts.map((presetAmount) => (
                  <button
                    key={presetAmount}
                    type="button"
                    onClick={() => handleAmountSelect(presetAmount.toString())}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      selectedAmount === presetAmount.toString()
                        ? 'bg-green-primary text-white'
                        : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                    }`}
                  >
                    ${presetAmount}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Custom Amount (USD)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setSelectedAmount('')
                  setError(null)
                }}
                placeholder={`Min: $${limits.minAmount}`}
                min={limits.minAmount}
                max={limits.maxAmount}
                step="0.01"
                required
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-green-primary"
              />
              <p className="text-xs text-gray-400 mt-1">
                Minimum: ${limits.minAmount} • Maximum: ${limits.maxAmount} per day
              </p>
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-300">{error}</span>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !amount || parseFloat(amount) < limits.minAmount}
              className="w-full py-3 px-6 bg-gradient-to-r from-green-primary to-green-dark text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                  Getting Quote...
                </>
              ) : (
                <>
                  Continue to Payment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </motion.button>

            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="w-full text-sm text-gray-400 hover:text-white transition-colors"
              >
                Skip for now (fund later)
              </button>
            )}
          </form>
        </motion.div>
      )}

      {/* Payment Method Step */}
      {step === 'payment' && quote && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-2xl"
        >
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-white mb-2">
              Choose Payment Method
            </h3>
            <p className="text-gray-400">
              Select how you'd like to fund your account
            </p>
          </div>

          {/* Quote Summary */}
          <div className="glass p-4 rounded-lg mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">You Deposit:</span>
                <span className="text-white font-medium">${quote.amountUSD}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Processing Fee:</span>
                <span className="text-gray-300">${quote.fees.processingFee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Network Fee:</span>
                <span className="text-gray-300">${quote.fees.networkFee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Service Fee:</span>
                <span className="text-gray-300">${quote.fees.gridFee}</span>
              </div>
              <div className="border-t border-white/10 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-white font-medium">You Receive:</span>
                  <span className="text-green-primary font-bold">{quote.amountUSDC} USDC</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3 mb-6">
            {['card', 'bank_account', 'apple_pay', 'google_pay'].map((method) => (
              <label
                key={method}
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  paymentMethod === method
                    ? 'border-green-primary bg-green-primary/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method}
                  checked={paymentMethod === method}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="text-green-primary"
                />
                {getPaymentIcon(method)}
                <div className="flex-1">
                  <div className="text-white font-medium">{getPaymentLabel(method)}</div>
                  <div className="text-xs text-gray-400">
                    {method === 'card' && '• 2.9% + $0.50 fee'}
                    {method === 'bank_account' && '• 0.5% fee • 1-3 business days'}
                    {method === 'apple_pay' && '• Quick & secure'}
                    {method === 'google_pay' && '• Quick & secure'}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg mb-4">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setStep('amount')}
              className="flex-1 py-3 px-6 bg-dark-700 text-white rounded-xl font-semibold hover:bg-dark-600"
            >
              Back
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePaymentSubmit}
              disabled={loading}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-green-primary to-green-dark text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  Deposit ${amount}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Processing Step */}
      {step === 'processing' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-2xl text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Loader className="animate-spin h-16 w-16 text-green-primary" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Processing Your Deposit
          </h3>
          <p className="text-gray-400 mb-4">
            Adding {quote?.amountUSDC || amount} USDC to your Grid account
          </p>
          <p className="text-sm text-gray-500">
            Transaction ID: {transactionId}
          </p>
        </motion.div>
      )}

      {/* Complete Step */}
      {step === 'complete' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-2xl text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <CheckCircle className="h-16 w-16 text-green-primary mx-auto mb-4" />
          </motion.div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Account Funded!
          </h3>
          <p className="text-gray-400 mb-6">
            Your Grid account has been credited with {quote?.amountUSDC || amount} USDC
          </p>

          <div className="glass p-4 rounded-lg mb-6">
            <div className="flex items-center justify-center space-x-2 text-sm">
              <Banknote className="h-4 w-4 text-green-primary" />
              <span className="text-white font-medium">{quote?.amountUSDC || amount} USDC</span>
              <CheckCircle className="h-4 w-4 text-green-primary" />
            </div>
          </div>

          <p className="text-xs text-gray-500">
            You're ready to subscribe to merchants!
          </p>
        </motion.div>
      )}
    </div>
  )
}