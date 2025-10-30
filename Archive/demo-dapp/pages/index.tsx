import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'
import WalletButton from '../components/WalletButton'
import X402PaymentDemo from '../components/X402PaymentDemo'
import { OuroC } from '@ouroc/sdk'

// Minimal subscription plans for demo
const plans = [
  {
    name: 'Basic',
    price: 10,
    period: 'month',
    description: 'Perfect for testing subscriptions',
    features: [
      'Automated monthly payments',
      'USDC on Solana',
      'Cancel anytime',
      'ICP timer integration'
    ],
    popular: false,
    color: 'blue'
  },
  {
    name: 'Pro',
    price: 25,
    period: 'month',
    description: 'For advanced testing',
    features: [
      'All Basic features',
      'Priority notifications',
      'Grid API integration',
      'Custom payment intervals'
    ],
    popular: true,
    color: 'purple'
  }
]

// Demo merchant address (replace with actual merchant)
const MERCHANT_ADDRESS = 'HBvV7YqSRSPW4YEBsDvpvF2PrUWFubqVbTNYafkddTsy'

export default function Home() {
  const { connected } = useWallet()
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan)
    setShowModal(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 pt-16">{/* Added pt-16 for navbar spacing */}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 mb-4 px-4 py-2 rounded-full glass border border-purple-primary/30"
          >
            <Shield className="h-4 w-4 text-purple-primary" />
            <span className="text-sm text-gray-300">Powered by Grid × ICP × Solana</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-bold mb-4 gradient-text"
          >
            Subscribe with USDC
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto"
          >
            Automated recurring payments with email notifications via Grid
          </motion.p>
        </div>

        {/* Subscription Plans */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className={`glass p-8 rounded-2xl ${plan.popular ? 'border-2 border-purple-primary' : 'border border-white/10'}`}
            >
              {plan.popular && (
                <div className="mb-4 inline-block px-3 py-1 bg-purple-primary/20 text-purple-primary text-xs font-semibold rounded-full">
                  POPULAR
                </div>
              )}

              <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-gray-400 mb-4">{plan.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">${plan.price}</span>
                <span className="text-gray-400 ml-2">USDC/{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start space-x-2 text-gray-300">
                    <svg className="w-5 h-5 text-green-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectPlan(plan)}
                className={`w-full py-3 px-6 rounded-xl font-semibold transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-r from-purple-primary to-purple-dark text-white hover:shadow-lg hover:shadow-purple-primary/25'
                    : 'bg-dark-700 text-white hover:bg-dark-600'
                }`}
              >
                Subscribe Now
              </motion.button>
            </motion.div>
          ))}

        </div>

        {/* Merchant CTA */}
        <div className="max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass p-8 rounded-2xl border border-purple-primary/30"
          >
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-white mb-4">Are you a Merchant?</h3>
              <p className="text-gray-400 mb-6">
                Start accepting recurring payments with USDC on Solana. Get your API key and integrate in minutes.
              </p>
              <div className="flex gap-4 justify-center">
                <motion.a
                  href="/merchant-signup"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 bg-gradient-to-r from-purple-primary to-purple-dark text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-primary/25 transition-all"
                >
                  Get Started Free
                </motion.a>
                <motion.a
                  href="/merchant-dashboard"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 bg-dark-700 text-white font-semibold rounded-lg hover:bg-dark-600 transition-all"
                >
                  View Dashboard
                </motion.a>
              </div>
            </div>
          </motion.div>
        </div>

        {/* How It Works */}
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass p-8 rounded-2xl"
          >
            <h3 className="text-xl font-semibold text-white mb-6">How It Works</h3>
            <div className="space-y-4 text-gray-300">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-purple-primary text-sm font-semibold">1</span>
                </div>
                <div>
                  <p className="font-medium text-white">Merchant Sign Up</p>
                  <p className="text-sm text-gray-400">Register with email and wallet to get your API key</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-purple-primary text-sm font-semibold">2</span>
                </div>
                <div>
                  <p className="font-medium text-white">Integrate SDK</p>
                  <p className="text-sm text-gray-400">Add OuroC SDK to your application with your API key</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-purple-primary text-sm font-semibold">3</span>
                </div>
                <div>
                  <p className="font-medium text-white">Accept Subscriptions</p>
                  <p className="text-sm text-gray-400">Customers subscribe with automated USDC payments</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* X.402 HTTP Payment Demo */}
        <X402PaymentDemo
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          plan={selectedPlan}
        />
    </div>
  )
}
