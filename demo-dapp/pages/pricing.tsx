import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Star, Zap, Shield, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/router'
import Footer from '../components/Footer'

interface PricingTier {
  name: string
  price: string
  priceMonthly: number
  interval: string
  description: string
  features: string[]
  highlighted?: boolean
  icon: typeof Star
  color: string
}

export default function Pricing() {
  const router = useRouter()
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly')

  const tiers: PricingTier[] = [
    {
      name: 'Starter',
      price: billingInterval === 'monthly' ? '$29' : '$290',
      priceMonthly: 29,
      interval: billingInterval === 'monthly' ? '/month' : '/year',
      description: 'Perfect for small businesses and startups',
      icon: Star,
      color: 'blue',
      features: [
        'Up to 100 active subscriptions',
        '5% transaction fee',
        'Basic analytics dashboard',
        'Email notifications',
        'Standard support',
        'Solana payments',
        'Manual payment fallback'
      ]
    },
    {
      name: 'Professional',
      price: billingInterval === 'monthly' ? '$99' : '$990',
      priceMonthly: 99,
      interval: billingInterval === 'monthly' ? '/month' : '/year',
      description: 'For growing businesses with more customers',
      icon: Zap,
      color: 'purple',
      highlighted: true,
      features: [
        'Up to 1,000 active subscriptions',
        '3% transaction fee',
        'Advanced analytics & reporting',
        'Email + SMS notifications',
        'Priority support',
        'Multi-token support (USDC, USDT, PYUSD)',
        'Grid integration for off-ramps',
        'Webhook notifications',
        'Custom branding'
      ]
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      priceMonthly: 0,
      interval: '',
      description: 'For large-scale operations and institutions',
      icon: Shield,
      color: 'green',
      features: [
        'Unlimited subscriptions',
        '1% transaction fee (negotiable)',
        'White-label solution',
        'Dedicated account manager',
        '24/7 premium support',
        'Multi-signature security',
        'Custom integrations',
        'SLA guarantees',
        'Compliance assistance',
        'On-premise deployment options'
      ]
    }
  ]

  const handleSelectPlan = (tier: PricingTier) => {
    if (tier.name === 'Enterprise') {
      window.location.href = 'mailto:enterprise@ouroc.io?subject=Enterprise Plan Inquiry'
    } else {
      router.push(`/merchant-dashboard?plan=${tier.name.toLowerCase()}&price=${tier.priceMonthly}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 mb-4 px-4 py-2 rounded-full glass border border-purple-primary/30"
          >
            <TrendingUp className="h-4 w-4 text-purple-primary" />
            <span className="text-sm text-gray-300">Simple, Transparent Pricing</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-bold mb-4 gradient-text"
          >
            Choose Your Plan
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto mb-8"
          >
            Start accepting recurring payments with OuroC. No hidden fees, cancel anytime.
          </motion.p>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center space-x-4 glass rounded-full p-1 border border-white/10"
          >
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingInterval === 'monthly'
                  ? 'bg-purple-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('annual')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingInterval === 'annual'
                  ? 'bg-purple-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Annual
              <span className="ml-2 text-xs bg-green-primary/20 text-green-primary px-2 py-0.5 rounded-full">
                Save 17%
              </span>
            </button>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16">
          {tiers.map((tier, index) => {
            const IconComponent = tier.icon
            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className={`relative glass rounded-2xl p-8 border ${
                  tier.highlighted
                    ? 'border-purple-primary shadow-2xl shadow-purple-primary/20 scale-105'
                    : 'border-white/10'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-primary to-purple-dark text-white text-xs font-bold px-4 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-${tier.color}-500/10 mb-4`}>
                    <IconComponent className={`h-6 w-6 text-${tier.color}-400`} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                  <p className="text-gray-400 text-sm">{tier.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-white">{tier.price}</span>
                    {tier.interval && (
                      <span className="text-gray-400 ml-2">{tier.interval}</span>
                    )}
                  </div>
                  {billingInterval === 'annual' && tier.priceMonthly > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      ${(tier.priceMonthly * 10).toFixed(0)} billed annually
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="h-5 w-5 text-green-primary flex-shrink-0 mr-3 mt-0.5" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectPlan(tier)}
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all ${
                    tier.highlighted
                      ? 'bg-gradient-to-r from-purple-primary to-purple-dark text-white hover:shadow-lg hover:shadow-purple-primary/25'
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                  }`}
                >
                  {tier.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                </motion.button>
              </motion.div>
            )
          })}
        </div>

        {/* Features Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="max-w-5xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            All Plans Include
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'ICP Canister Automation',
                description: 'Automated recurring payments via Internet Computer timers',
                icon: '⚙️'
              },
              {
                title: 'Solana Settlement',
                description: 'Fast, low-cost transactions on Solana blockchain',
                icon: '⚡'
              },
              {
                title: 'Automatic Failover',
                description: 'Manual payment fallback when canister is offline',
                icon: '🛡️'
              },
              {
                title: 'Real-time Notifications',
                description: 'Email alerts for payments, failures, and expirations',
                icon: '📧'
              },
              {
                title: 'Analytics Dashboard',
                description: 'Track MRR, churn, and subscription metrics',
                icon: '📊'
              },
              {
                title: 'Developer API',
                description: 'Full REST API and TypeScript SDK',
                icon: '🔧'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="glass rounded-xl p-6 border border-white/10"
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="max-w-3xl mx-auto mt-16"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                question: 'How does billing work?',
                answer: 'You are charged monthly or annually based on your selected plan. Transaction fees are deducted automatically from each payment processed.'
              },
              {
                question: 'Can I change plans later?',
                answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.'
              },
              {
                question: 'What happens if the ICP canister goes down?',
                answer: 'OuroC automatically falls back to manual payment collection via Solana. Your subscribers can still pay, and you receive notifications to process payments manually.'
              },
              {
                question: 'Which tokens are supported?',
                answer: 'Professional and Enterprise plans support USDC, USDT, PYUSD, and DAI. Starter plans support USDC only.'
              },
              {
                question: 'Is there a setup fee?',
                answer: 'No setup fees. You only pay your monthly/annual plan fee plus transaction fees.'
              }
            ].map((faq, index) => (
              <div key={index} className="glass rounded-lg p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-2">{faq.question}</h3>
                <p className="text-gray-400 text-sm">{faq.answer}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-16"
        >
          <div className="glass rounded-2xl p-12 border border-purple-primary/30 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-gray-400 mb-8">
              Join hundreds of merchants already using OuroC for recurring payments
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/merchant-dashboard')}
                className="px-8 py-4 bg-gradient-to-r from-purple-primary to-purple-dark text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-primary/25"
              >
                Start Free Trial
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/')}
                className="px-8 py-4 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 border border-white/20"
              >
                View Demo
              </motion.button>
            </div>
            <p className="text-xs text-gray-500 mt-6">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  )
}
