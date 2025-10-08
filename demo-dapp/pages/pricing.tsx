import { useState } from 'react'
import { motion } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  Check,
  Zap,
  Star,
  Shield,
  Headphones,
  Code,
  ArrowRight,
  Bell,
  CreditCard,
  Clock
} from 'lucide-react'
import MockSubscriptionCard from '../components/MockSubscriptionCard'
import RealSubscriptionCard from '../components/RealSubscriptionCard'

const plans = [
  {
    name: 'Starter',
    price: 5, // USDC
    period: 'month',
    description: 'Perfect for individual developers',
    features: [
      'Up to 10 active subscriptions',
      'Basic Ouro-C dashboard',
      'Email notifications',
      'Standard payment processing',
      'Community support',
      '30-day subscription history'
    ],
    popular: false,
    color: 'blue'
  },
  {
    name: 'Professional',
    price: 15, // USDC
    period: 'month',
    description: 'For growing projects and teams',
    features: [
      'Up to 100 active subscriptions',
      'Advanced subscription analytics',
      'Multi-channel notifications (Email, Discord, Slack)',
      'Priority payment processing',
      'Priority support',
      '90-day subscription history',
      'Custom payment webhooks',
      'Team collaboration (5 members)'
    ],
    popular: true,
    color: 'purple'
  },
  {
    name: 'Enterprise',
    price: 99, // USDC
    period: 'month',
    description: 'For large organizations',
    features: [
      'Unlimited active subscriptions',
      'Real-time subscription monitoring',
      'All notification channels + webhooks',
      'Enterprise-grade payment processing',
      'Dedicated support manager',
      'Unlimited subscription history',
      'White-label Ouro-C integration',
      'Unlimited team members',
      'Custom smart contract integration',
      '99.9% SLA guarantee'
    ],
    popular: false,
    color: 'green'
  }
]

const faqs = [
  {
    question: 'How does Ouro-C subscription management work?',
    answer: 'Ouro-C automatically handles recurring payments using Internet Computer Protocol (ICP) timers. Once you subscribe, payments are processed automatically on schedule without any manual intervention.'
  },
  {
    question: 'What wallets are supported?',
    answer: 'We support all major Solana wallets including Phantom, Solflare, Backpack, Glow, and any wallet compatible with the Solana wallet adapter standard.'
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes! You can pause, resume, or cancel your subscription at any time from your dashboard. Changes take effect immediately, and you\'ll only pay for active subscription periods.'
  },
  {
    question: 'How do notifications work?',
    answer: 'Ouro-C sends smart notifications via email, Discord, Slack, or webhooks before payments are due. You\'ll never miss a payment or be surprised by charges.'
  },
  {
    question: 'Is my wallet secure?',
    answer: 'Absolutely. We never store your private keys. All transactions are signed by your wallet, and our smart contracts are audited and secure.'
  },
  {
    question: 'What happens if a payment fails?',
    answer: 'If a payment fails due to insufficient balance, you\'ll be notified immediately. There\'s a grace period during which you can add funds, and the system will retry automatically.'
  }
]

export default function PricingPage() {
  const { connected } = useWallet()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [useRealSDK, setUseRealSDK] = useState(true) // Toggle between mock and real

  // Demo merchant address for receiving payments
  const merchantAddress = "DemoMerchantAddress123456789"

  return (
    <div className="min-h-screen pt-20">
      {/* Header */}
      <section className="text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">Simple, Transparent</span>
            <br />
            <span className="text-white">Pricing</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Choose the perfect plan for your needs. All subscriptions are powered by
            <span className="gradient-text font-semibold"> Ouro-C</span> for seamless USDC payments on Solana.
          </p>

          {/* Ouro-C Benefits */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {[
              { icon: CreditCard, text: 'Automatic USDC Payments' },
              { icon: Bell, text: 'Smart Notifications' },
              { icon: Shield, text: 'Secure & Trustless' },
              { icon: Clock, text: 'No Manual Renewals' }
            ].map((benefit) => (
              <div key={benefit.text} className="flex items-center space-x-2 text-sm text-gray-300">
                <benefit.icon className="h-4 w-4 text-green-primary" />
                <span>{benefit.text}</span>
              </div>
            ))}
          </div>

          {/* Real vs Mock Toggle */}
          <div className="flex flex-col items-center space-y-4 mb-8">
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-400">Demo Mode:</span>
              <button
                onClick={() => setUseRealSDK(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  !useRealSDK
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Mock UI
              </button>
              <button
                onClick={() => setUseRealSDK(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  useRealSDK
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Live SDK
              </button>
            </div>

            {/* Mode Explanation */}
            <div className="text-center">
              <p className="text-sm text-gray-400">
                {useRealSDK ? (
                  <>
                    <span className="text-green-400 font-medium">Live SDK Mode:</span> Real Ouro-C integration with ICP canister + Solana contract
                  </>
                ) : (
                  <>
                    <span className="text-blue-400 font-medium">Mock UI Mode:</span> Visual demonstration of subscription interface
                  </>
                )}
              </p>
              {useRealSDK && (
                <div className="mt-3 p-4 bg-green-900/20 border border-green-500/30 rounded-lg max-w-2xl mx-auto">
                  <p className="text-sm text-green-300">
                    <strong>Production Ready:</strong> This integrates with the real Ouro-C system.
                    ICP canister handles timing, Solana contract processes USDC payments.
                    Full cross-chain subscription management is live!
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative ${plan.popular ? 'lg:scale-105 lg:z-10' : ''}`}
              >
                {useRealSDK ? (
                  <RealSubscriptionCard
                    plan={plan}
                    onSubscribe={(plan) => {
                      setSelectedPlan(plan.name)
                      console.log('Real subscription created for:', plan)
                    }}
                    merchantAddress={merchantAddress}
                  />
                ) : (
                  <MockSubscriptionCard
                    plan={plan}
                    onSubscribe={(plan) => {
                      setSelectedPlan(plan.name)
                      console.log('Mock subscription demo:', plan)
                    }}
                    isConnected={connected}
                  />
                )}
              </motion.div>
            ))}
          </div>

          {/* Success Message */}
          {selectedPlan && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-12 p-6 glass-purple border border-green-primary/30 rounded-xl text-center"
            >
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Check className="h-6 w-6 text-green-primary" />
                <span className="text-lg font-semibold text-white">
                  Subscription to {selectedPlan} Plan {useRealSDK ? 'Created' : 'Demo Completed'}!
                </span>
              </div>
              <p className="text-gray-300">
                {useRealSDK ? (
                  <>
                    🎉 Live subscription created! Your ICP canister will automatically trigger USDC payments via the Solana contract.
                    Check your wallet for the subscription transaction and expect notifications before each payment.
                  </>
                ) : (
                  <>
                    This was a demo. In Live SDK mode, Ouro-C handles real recurring USDC payments automatically.
                  </>
                )}
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-20 bg-gradient-to-r from-purple-900/10 to-green-900/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Why Choose <span className="gradient-text">Ouro-C</span>?
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Traditional subscription services can't handle stablecoin payments. Ouro-C is built specifically for USDC on Solana.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: '🔄',
                title: 'Automated Recurring Payments',
                description: 'Set it and forget it. Payments happen automatically using ICP timers and Solana transactions.',
                traditional: 'Manual payment processing',
                OuroC: 'Fully automated with ICP'
              },
              {
                icon: '🔔',
                title: 'Multi-Channel Notifications',
                description: 'Get notified via email, Discord, Slack, or custom webhooks before payments are due.',
                traditional: 'Basic email only',
                OuroC: 'Email, Discord, Slack, Webhooks'
              },
              {
                icon: '⚡',
                title: 'Instant Integration',
                description: 'Add subscriptions to your dApp in 5 minutes with our React SDK and pre-built components.',
                traditional: 'Weeks of development',
                OuroC: '5-minute integration'
              },
              {
                icon: '🛡️',
                title: 'Crypto-Native Security',
                description: 'Built for Web3 with wallet-based authentication and trustless smart contracts.',
                traditional: 'Centralized payment processing',
                OuroC: 'Decentralized & trustless'
              },
              {
                icon: '💰',
                title: 'Low Transaction Fees',
                description: 'Leverage Solana\'s low fees for cost-effective USDC subscription management.',
                traditional: '2.9% + $0.30 per transaction',
                OuroC: '~$0.001 per USDC transaction'
              },
              {
                icon: '🌐',
                title: 'Global & Permissionless',
                description: 'Accept payments from anyone, anywhere, without geographic restrictions.',
                traditional: 'Geographic limitations',
                OuroC: 'Global by default'
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass p-8 hover-lift"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
                <p className="text-gray-300 mb-6">{feature.description}</p>

                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <span className="text-red-400 mr-2">❌</span>
                    <span className="text-gray-400">Traditional: {feature.traditional}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-green-400 mr-2">✅</span>
                    <span className="text-green-300">Ouro-C: {feature.OuroC}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              <span className="gradient-text">Frequently Asked</span>
              <br />
              <span className="text-white">Questions</span>
            </h2>
          </motion.div>

          <div className="space-y-8">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass p-8"
              >
                <h3 className="text-xl font-semibold text-white mb-4">{faq.question}</h3>
                <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 animated-gradient">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join thousands of developers building subscription services on Solana with Ouro-C.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-purple-600 hover:bg-gray-100 font-semibold px-8 py-4 rounded-xl transition-all hover-lift inline-flex items-center justify-center space-x-2">
                <span>Start Free Trial</span>
                <ArrowRight className="h-5 w-5" />
              </button>
              <button className="border-2 border-white text-white hover:bg-white hover:text-purple-600 font-semibold px-8 py-4 rounded-xl transition-all hover-lift inline-flex items-center justify-center space-x-2">
                <Code className="h-5 w-5" />
                <span>View Documentation</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}