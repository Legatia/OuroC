import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Star, Zap, ArrowRight } from 'lucide-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

interface Plan {
  name: string
  price: number
  period: string
  description: string
  features: string[]
  popular: boolean
  color: string
}

interface MockSubscriptionCardProps {
  plan: Plan
  onSubscribe: (plan: Plan) => void
  isConnected: boolean
}

export default function MockSubscriptionCard({ plan, onSubscribe, isConnected }: MockSubscriptionCardProps) {
  const [isSubscribing, setIsSubscribing] = useState(false)

  const handleSubscribe = async () => {
    if (!isConnected) return

    setIsSubscribing(true)

    // Simulate subscription process
    await new Promise(resolve => setTimeout(resolve, 1500))

    onSubscribe(plan)
    setIsSubscribing(false)
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
        {!isConnected ? (
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-4">Connect your wallet to subscribe</p>
            <WalletMultiButton className="!w-full !rounded-xl !font-semibold" />
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubscribe}
            disabled={isSubscribing}
            className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
              isSubscribing
                ? 'bg-gray-600 cursor-not-allowed'
                : `bg-gradient-to-r ${colorClasses.gradient} hover:shadow-lg hover:shadow-purple-primary/25`
            }`}
          >
            {isSubscribing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating Subscription...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <span>Subscribe for ${plan.price} USDC</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            )}
          </motion.button>
        )}

        {/* Ouro-C Badge */}
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
          <Zap className="h-3 w-3 text-green-primary" />
          <span>Powered by Ouro-C - Automatic recurring payments</span>
        </div>
      </div>

      {/* Payment Info */}
      {isConnected && (
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
          </div>
        </div>
      )}
    </div>
  )
}