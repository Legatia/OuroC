import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import WalletButton from '../components/WalletButton'
import RealSubscriptionCard from '../components/RealSubscriptionCard'

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
  const [subscribedPlan, setSubscribedPlan] = useState<string | null>(null)

  const handleSubscribe = (plan: any) => {
    console.log('Subscribing to plan:', plan)
    setSubscribedPlan(plan.name)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">OuroC Subscriptions</h1>
              <p className="text-sm text-gray-400">Decentralized subscription payments on Solana</p>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Subscribe with <span className="text-purple-400">USDC</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Automated recurring payments powered by Internet Computer and Solana
          </p>
        </div>

        {/* Connection Status */}
        {!connected ? (
          <div className="max-w-md mx-auto mb-12 p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 text-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
            <p className="text-gray-400 mb-6">Connect your Phantom wallet to subscribe</p>
            <WalletButton />
          </div>
        ) : (
          <>
            {/* Subscription Plans */}
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {plans.map((plan) => (
                <RealSubscriptionCard
                  key={plan.name}
                  plan={plan}
                  onSubscribe={handleSubscribe}
                  merchantAddress={MERCHANT_ADDRESS}
                />
              ))}
            </div>

            {/* Info Section */}
            <div className="mt-16 max-w-3xl mx-auto">
              <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700 p-8">
                <h3 className="text-xl font-semibold text-white mb-4">How It Works</h3>
                <div className="space-y-4 text-gray-300">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-purple-400 text-sm font-semibold">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-white">Connect Wallet</p>
                      <p className="text-sm text-gray-400">Connect your Phantom wallet to get started</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-purple-400 text-sm font-semibold">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-white">Choose Plan</p>
                      <p className="text-sm text-gray-400">Select a subscription plan and approve the transaction</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-purple-400 text-sm font-semibold">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-white">Auto-Pay</p>
                      <p className="text-sm text-gray-400">ICP timer automatically triggers monthly payments</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tech Stack Info */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Powered by <span className="text-purple-400 font-semibold">Internet Computer</span> × <span className="text-blue-400 font-semibold">Solana</span>
              </p>
              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-600">
                <span>ICP: 7tbxr-naaaa-aaaao-qkrca-cai</span>
                <span>•</span>
                <span>Devnet</span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
