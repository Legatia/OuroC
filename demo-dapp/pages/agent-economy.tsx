/**
 * Agent Economy Demo Page
 * Showcase autonomous API subscription management and agent commerce
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import Head from 'next/head'
import Link from 'next/link'
import {
  ArrowLeft,
  Cpu,
  Globe,
  Database,
  Cloud,
  Zap,
  TrendingUp,
  Shield,
  DollarSign,
  BarChart3,
  Users,
  Building,
  Rocket
} from 'lucide-react'
import PaymentReliabilityManager from '../components/PaymentReliabilityManager'
import { OuroCProvider } from '../packages/sdk/src/providers/OuroCProvider'

export default function AgentEconomy() {
  const [activeDemo, setActiveDemo] = useState<'api-subscriptions' | 'enterprise'>('api-subscriptions')

  const demos = [
    {
      id: 'api-subscriptions',
      title: 'Payment Reliability',
      description: 'Intelligent payment processing with automatic failure recovery and optimization',
      icon: <Cpu className="h-6 w-6" />,
      color: 'purple',
      features: [
        'Automatic retry optimization',
        'Gas fee management',
        'Payment failure prevention',
        'Success rate monitoring'
      ]
    },
    {
      id: 'enterprise',
      title: 'Business Analytics',
      description: 'Advanced analytics for dApp revenue optimization and user retention',
      icon: <Building className="h-6 w-6" />,
      color: 'green',
      features: [
        'Churn prediction',
        'Revenue forecasting',
        'User behavior insights',
        'Confidential analytics'
      ],
      comingSoon: true
    }
  ]

  return (
    <div>
      <Head>
        <title>Agent Economy - OuroC Demo</title>
        <meta name="description" content="Autonomous API subscription management and agent commerce infrastructure" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Navigation */}
        <nav className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center space-x-3 text-white hover:text-purple-400 transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Demo</span>
              </Link>

              <div className="flex items-center space-x-6">
                <h1 className="text-xl font-bold text-white">Agent Economy Infrastructure</h1>
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-600/20 border border-green-600/30 rounded-full">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-sm">Live</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-2xl">
                <Rocket className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-5xl font-bold text-white">
                Agent Economy
              </h1>
            </div>

            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Autonomous payment infrastructure for the AI agent economy.
              Intelligent subscription management, agent-to-agent commerce, and enterprise workflow automation.
            </p>

            <div className="flex items-center justify-center space-x-8 text-gray-300">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                <span>Real USDC Payments</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-400" />
                <span>Enterprise Ready</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                <span>Cost Optimized</span>
              </div>
            </div>
          </motion.div>

          {/* Demo Selection Tabs */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {demos.map((demo) => (
              <motion.button
                key={demo.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveDemo(demo.id as any)}
                className={`relative px-6 py-4 rounded-xl font-medium transition-all duration-200 ${
                  activeDemo === demo.id
                    ? `bg-${demo.color}-600 text-white shadow-lg shadow-${demo.color}-500/25`
                    : 'bg-slate-800/50 text-gray-300 hover:bg-slate-700/50 border border-slate-600'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    activeDemo === demo.id
                      ? 'bg-white/20'
                      : 'bg-slate-700'
                  }`}>
                    {demo.icon}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">{demo.title}</div>
                    {demo.comingSoon && (
                      <div className="text-xs opacity-75">Coming Soon</div>
                    )}
                  </div>
                </div>

                {demo.comingSoon && (
                  <div className="absolute -top-2 -right-2 px-2 py-1 bg-yellow-500 text-black text-xs rounded-full font-medium">
                    Soon
                  </div>
                )}
              </motion.button>
            ))}
          </div>

          {/* Demo Content */}
          <AnimatePresence mode="wait">
            {activeDemo === 'api-subscriptions' && (
              <motion.div
                key="api-subscriptions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-8">
                  <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h2 className="text-2xl font-semibold text-white mb-4">Payment Reliability Enhancement</h2>
                        <p className="text-gray-300 mb-6">
                          Intelligent payment processing that automatically optimizes success rates, prevents failures,
                          and recovers from payment issues to maximize dApp revenue retention.
                        </p>

                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-400" />
                            <span className="text-gray-300">Smart retry with optimized gas fees</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-400" />
                            <span className="text-gray-300">Payment failure prediction and prevention</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-400" />
                            <span className="text-gray-300">Automatic payment recovery strategies</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-400" />
                            <span className="text-gray-300">Reduced churn and higher MRR</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-purple-600/20 border border-purple-600/30 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-purple-300">Success Rate</span>
                            <TrendingUp className="h-4 w-4 text-purple-400" />
                          </div>
                          <div className="text-2xl font-bold text-white">98%+</div>
                          <div className="text-xs text-purple-300 mt-1">Payment success rate</div>
                        </div>

                        <div className="bg-blue-600/20 border border-blue-600/30 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-blue-300">Churn Reduction</span>
                            <Globe className="h-4 w-4 text-blue-400" />
                          </div>
                          <div className="text-2xl font-bold text-white">40%</div>
                          <div className="text-xs text-blue-300 mt-1">Failed payment churn prevented</div>
                        </div>

                        <div className="bg-green-600/20 border border-green-600/30 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-green-300">Recovery</span>
                            <Zap className="h-4 w-4 text-green-400" />
                          </div>
                          <div className="text-2xl font-bold text-white">85%</div>
                          <div className="text-xs text-green-300 mt-1">Failed payment recovery rate</div>
                        </div>

                        <div className="bg-yellow-600/20 border border-yellow-600/30 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-yellow-300">Revenue Saved</span>
                            <Shield className="h-4 w-4 text-yellow-400" />
                          </div>
                          <div className="text-2xl font-bold text-white">15%</div>
                          <div className="text-xs text-yellow-300 mt-1">MRR increase from optimization</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Reliability Manager Component */}
                <OuroCProvider>
                  <PaymentReliabilityManager />
                </OuroCProvider>
              </motion.div>
            )}

            {activeDemo === 'enterprise' && (
              <motion.div
                key="enterprise"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-12 text-center">
                  <Building className="h-16 w-16 text-green-400 mx-auto mb-6" />
                  <h2 className="text-3xl font-bold text-white mb-4">Enterprise Workflows</h2>
                  <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
                    Multi-agent coordination for complex B2B processes including procurement automation,
                    compliance monitoring, and confidential computing with Arcium MXE.
                  </p>
                  <div className="bg-green-600/20 border border-green-600/30 rounded-xl p-6 inline-block">
                    <p className="text-green-300 font-medium">Coming Soon</p>
                    <p className="text-green-200 text-sm mt-2">Enterprise-grade agent orchestration platform</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Architecture Overview */}
          <div className="mt-16 bg-slate-800/30 backdrop-blur-xl border border-slate-700 rounded-2xl p-8">
            <h3 className="text-2xl font-semibold text-white mb-6 text-center">Agent Economy Architecture</h3>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="p-4 bg-purple-600/20 rounded-xl border border-purple-600/30 inline-block mb-4">
                  <Cpu className="h-8 w-8 text-purple-400" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Autonomous Agents</h4>
                <p className="text-gray-300 text-sm">
                  Python agents running on ICP canisters with intelligent decision-making capabilities
                </p>
              </div>

              <div className="text-center">
                <div className="p-4 bg-blue-600/20 rounded-xl border border-blue-600/30 inline-block mb-4">
                  <Database className="h-8 w-8 text-blue-400" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Smart Payments</h4>
                <p className="text-gray-300 text-sm">
                  Real USDC transactions on Solana with spending controls and audit trails
                </p>
              </div>

              <div className="text-center">
                <div className="p-4 bg-green-600/20 rounded-xl border border-green-600/30 inline-block mb-4">
                  <Shield className="h-8 w-8 text-green-400" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Enterprise Security</h4>
                <p className="text-gray-300 text-sm">
                  Arcium MXE confidential computing and zero-knowledge proofs for privacy
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Reusable CheckCircle component
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}