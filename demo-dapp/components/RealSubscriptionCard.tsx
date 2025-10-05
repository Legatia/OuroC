import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, Star, Zap, ArrowRight, AlertCircle } from 'lucide-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import { SecureOuroCClient } from '@ouro-c/react-sdk'

interface Plan {
  name: string
  price: number
  period: string
  description: string
  features: string[]
  popular: boolean
  color: string
}

interface RealSubscriptionCardProps {
  plan: Plan
  onSubscribe: (plan: Plan) => void
  merchantAddress: string
}

export default function RealSubscriptionCard({ plan, onSubscribe, merchantAddress }: RealSubscriptionCardProps) {
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)
  const [subscriptionSuccess, setSubscriptionSuccess] = useState(false)
  const [client, setClient] = useState<SecureOuroCClient | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const { connected, publicKey, wallet } = useWallet()

  // Initialize client when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Use production canister ID with real Solana contract integration
        const ouroCClient = new SecureOuroCClient(
          'rdmx6-jaaaa-aaaaa-aaadq-cai', // Production canister ID
          'local' // Use 'ic' for mainnet
        )
        setClient(ouroCClient)
      } catch (error: any) {
        console.error('Failed to initialize Ouro-C client:', error)
        // Don't set error immediately - let user try subscribing to see the error
        // This makes the demo more user-friendly
      }
    }
  }, [])

  const handleSubscribe = async () => {
    if (!connected || !publicKey) return
    if (!client) {
      setSubscriptionError('Ouro-C client not initialized')
      return
    }

    setIsSubscribing(true)
    setSubscriptionError(null)

    try {
      // First authenticate if not already authenticated
      if (!isAuthenticated) {
        console.log('Authenticating with Ouro-C...')
        if (!wallet) {
          throw new Error('Wallet not connected')
        }
        await client.authenticate(wallet.adapter)
        setIsAuthenticated(true)
      }

      // Calculate interval in seconds based on period
      const intervalSeconds = plan.period === 'month' ? 30 * 24 * 60 * 60 : 365 * 24 * 60 * 60

      // Create subscription configuration with real Solana contract
      const subscriptionConfig = {
        solana_payer: publicKey.toBase58(),
        solana_receiver: merchantAddress,
        payment_amount: BigInt(plan.price * 1_000_000), // Convert USDC to micro-units
        interval_seconds: BigInt(intervalSeconds),
        solana_program_id: "7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub", // Real Ouro-C program ID
        notification_channels: {
          email: "demo@ouro-c.com",
          discord_webhook: null,
          slack_webhook: null,
          custom_webhook: null
        }
      }

      console.log('Creating subscription with config:', subscriptionConfig)

      // Create the subscription using the real SDK
      const subscription = await client.createSubscription(subscriptionConfig)

      console.log('Subscription created successfully:', subscription)

      setSubscriptionSuccess(true)
      onSubscribe(plan)

    } catch (error: any) {
      console.error('Subscription creation failed:', error)

      // Provide user-friendly error messages
      if (error.code === 'ICP_CONNECTION_ERROR') {
        setSubscriptionError(
          'Demo Mode: Cannot connect to ICP canister. In production, this would connect to your deployed canister.'
        )
      } else if (error.message?.includes('Principal') || error.message?.includes('canister')) {
        setSubscriptionError(
          'Demo Mode: Using placeholder canister ID. In production, replace with your real canister ID.'
        )
      } else {
        setSubscriptionError(error.message || 'Failed to create subscription')
      }
    } finally {
      setIsSubscribing(false)
    }
  }

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'purple':
        return {
          border: 'border-purple-primary/50 ring-purple-primary/20',
          gradient: 'from-purple-primary to-purple-dark',
          badge: 'bg-purple-primary text-white'
        }
      case 'green':
        return {
          border: 'border-green-primary/50 ring-green-primary/20',
          gradient: 'from-green-primary to-green-dark',
          badge: 'bg-green-primary text-white'
        }
      default:
        return {
          border: 'border-blue-500/50 ring-blue-500/20',
          gradient: 'from-blue-500 to-blue-600',
          badge: 'bg-blue-500 text-white'
        }
    }
  }

  const colorClasses = getColorClasses(plan.color)

  return (
    <div
      className={`relative glass p-8 rounded-2xl hover-lift transition-all duration-300 ${
        plan.popular
          ? `ring-2 ${colorClasses.border} border-2`
          : 'border border-white/10'
      }`}
    >
      {/* Popular Badge */}
      {plan.popular && (
        <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-sm font-semibold ${colorClasses.badge}`}>
          <div className="flex items-center space-x-1">
            <Star className="h-3 w-3 fill-current" />
            <span>Most Popular</span>
          </div>
        </div>
      )}

      {/* Plan Header */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
        <p className="text-gray-400 mb-6">{plan.description}</p>

        <div className="flex items-baseline justify-center space-x-2">
          <span className="text-4xl font-bold text-white">${plan.price}</span>
          <span className="text-lg text-gray-400 font-mono">USDC</span>
          <span className="text-gray-400">/ {plan.period}</span>
        </div>

        {/* Stablecoin Info */}
        <p className="text-sm text-gray-500 mt-2">
          Stable USD value • Powered by Circle USDC
        </p>
      </div>

      {/* Features */}
      <ul className="space-y-4 mb-8">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start space-x-3">
            <Check className="h-5 w-5 text-green-primary flex-shrink-0 mt-0.5" />
            <span className="text-gray-300 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      {/* Subscribe Button */}
      <div className="space-y-4">
        {!connected ? (
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-4">Connect your wallet to subscribe</p>
            <WalletMultiButton className="!w-full !rounded-xl !font-semibold" />
          </div>
        ) : (
          <>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubscribe}
              disabled={isSubscribing || subscriptionSuccess}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                isSubscribing
                  ? 'bg-gray-600 cursor-not-allowed'
                  : subscriptionSuccess
                  ? 'bg-green-600'
                  : `bg-gradient-to-r ${colorClasses.gradient} hover:shadow-lg hover:shadow-purple-primary/25`
              }`}
            >
              {isSubscribing ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating Subscription...</span>
                </div>
              ) : subscriptionSuccess ? (
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-4 w-4" />
                  <span>Subscription Created!</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>Subscribe for ${plan.price} USDC</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </motion.button>

            {/* Error Display */}
            {subscriptionError && (
              <div className="flex items-center space-x-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-300">{subscriptionError}</span>
              </div>
            )}
          </>
        )}

        {/* Ouro-C Badge */}
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
          <Zap className="h-3 w-3 text-green-primary" />
          <span>Powered by Ouro-C - Automatic recurring payments</span>
        </div>
      </div>

      {/* Payment Info */}
      {connected && (
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Network:</span>
              <span className="text-green-400">Solana Devnet</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span>USDC</span>
            </div>
            <div className="flex justify-between">
              <span>Auto-renewal:</span>
              <span className="text-green-400">Enabled</span>
            </div>
            <div className="flex justify-between">
              <span>Notifications:</span>
              <span className="text-green-400">7, 3, 1 days before</span>
            </div>
            {isAuthenticated && (
              <div className="flex justify-between">
                <span>Auth Status:</span>
                <span className="text-green-400">Authenticated</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>SDK Status:</span>
              <span className={client ? "text-green-400" : "text-yellow-400"}>
                {client ? "Ready" : "Initializing"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}