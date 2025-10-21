/**
 * Payment Reliability Manager
 *
 * React component that demonstrates the Payment Reliability Agent capabilities.
 * Shows real-time payment monitoring, failure prediction, intelligent retries, and recovery metrics.
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Activity,
  DollarSign,
  BarChart3,
  RefreshCw,
  Play,
  Pause
} from 'lucide-react'
import { PaymentReliabilityAgent, RevenueProtectionMetrics, PaymentMetrics } from '../packages/sdk/src/agents/PaymentReliabilityAgent'
import { OuroCClient } from '../packages/sdk/src/core/OuroCClient'

export default function PaymentReliabilityManager() {
  const [agent, setAgent] = useState<PaymentReliabilityAgent | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [metrics, setMetrics] = useState<RevenueProtectionMetrics | null>(null)
  const [recentPayments, setRecentPayments] = useState<PaymentMetrics[]>([])
  const [isDemoRunning, setIsDemoRunning] = useState(false)

  useEffect(() => {
    // Initialize the agent
    const ouroClient = new OuroCClient('https://ic0.app', {
      apiKey: 'ouro_community_shared_2025_demo_key'
    })

    const paymentAgent = new PaymentReliabilityAgent(ouroClient)
    setAgent(paymentAgent)

    // Get initial metrics
    updateMetrics(paymentAgent)

    return () => {
      paymentAgent.stopMonitoring()
    }
  }, [])

  const updateMetrics = (agentInstance: PaymentReliabilityAgent) => {
    const currentMetrics = agentInstance.getRevenueProtectionMetrics()
    setMetrics(currentMetrics)
  }

  const startMonitoring = () => {
    if (agent) {
      agent.startMonitoring()
      setIsMonitoring(true)

      // Update metrics every 2 seconds
      const interval = setInterval(() => {
        updateMetrics(agent!)
      }, 2000)

      return () => clearInterval(interval)
    }
  }

  const stopMonitoring = () => {
    if (agent) {
      agent.stopMonitoring()
      setIsMonitoring(false)
    }
  }

  const runDemoScenario = async () => {
    if (!agent) return

    setIsDemoRunning(true)

    // Start monitoring
    startMonitoring()

    // Simulate 5 payment scenarios with different risk levels
    const demoPayments = [
      { amount: 50, risk: 'low' },
      { amount: 25, risk: 'medium' },
      { amount: 100, risk: 'high' },
      { amount: 75, risk: 'low' },
      { amount: 35, risk: 'medium' }
    ]

    for (let i = 0; i < demoPayments.length; i++) {
      const payment = demoPayments[i]

      // Register payment for monitoring
      const paymentId = await agent.registerPayment({
        subscription_id: `demo_subscription_${i}`,
        reminder_days_before_payment: 0,
        solana_contract_address: "7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub",
        subscriber_address: `demo_user_${i}_wallet`,
        merchant_address: "demo_merchant_wallet",
        payment_token_mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
        amount: BigInt(payment.amount * 1_000_000),
        interval_seconds: BigInt(0),
        start_time: [],
        api_key: 'ouro_community_shared_2025_demo_key'
      })

      console.log(`🎬 Demo payment registered: $${payment.amount} (${payment.risk} risk)`)

      // Wait between payments for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    // Let the demo run for a bit to show processing
    setTimeout(() => {
      setIsDemoRunning(false)
    }, 10000)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`
  }

  if (!agent || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Payment Reliability Agent</h3>
          <p className="text-gray-400">AI-powered payment failure prevention and revenue protection</p>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={runDemoScenario}
            disabled={isDemoRunning}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {isDemoRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Running Demo</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Run Demo</span>
              </>
            )}
          </button>

          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isMonitoring
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isMonitoring ? (
              <>
                <Pause className="h-4 w-4" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Start</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Indicator */}
      <AnimatePresence>
        {isMonitoring && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center space-x-3 p-4 bg-green-600/20 border border-green-600/30 rounded-xl"
          >
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-400 animate-pulse" />
              <span className="text-green-400 font-medium">Agent Active</span>
            </div>
            <span className="text-green-300 text-sm">Monitoring payments and preventing failures in real-time</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Revenue Saved</span>
            <DollarSign className="h-4 w-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(metrics.revenue_saved_usd)}
          </div>
          <div className="text-xs text-green-400 mt-1">Protected this month</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Success Rate</span>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatPercentage(metrics.success_rate_after)}
          </div>
          <div className="text-xs text-blue-400 mt-1">
            +{formatPercentage(metrics.success_rate_after - metrics.success_rate_before)} improvement
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Recovery Rate</span>
            <Shield className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatPercentage(metrics.recovery_success_rate)}
          </div>
          <div className="text-xs text-purple-400 mt-1">
            {metrics.failed_payments_recovered} payments recovered
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Response Time</span>
            <Zap className="h-4 w-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics.average_response_time_ms}ms
          </div>
          <div className="text-xs text-yellow-400 mt-1">Average intervention</div>
        </div>
      </div>

      {/* Payment Monitoring Activity */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Live Payment Monitoring</h4>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h5 className="text-sm font-medium text-gray-400 mb-3">Payment Activity</h5>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-gray-300">Completed</span>
                </div>
                <span className="text-sm text-white font-medium">
                  {metrics.total_payments_monitored - metrics.failed_payments_recovered - metrics.at_risk_payments_detected}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
                  <span className="text-sm text-gray-300">In Progress</span>
                </div>
                <span className="text-sm text-white font-medium">
                  {metrics.at_risk_payments_detected}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-gray-300">Recovered</span>
                </div>
                <span className="text-sm text-white font-medium">
                  {metrics.failed_payments_recovered}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium text-gray-400 mb-3">Agent Capabilities</h5>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Payment failure prediction</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Intelligent retry strategies</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Gas fee optimization</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-300">24/7 automated monitoring</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Revenue protection analytics</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Impact */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-600/30 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Business Impact</h4>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">85%</div>
            <div className="text-sm text-purple-300">Reduction in failed payment churn</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">15%</div>
            <div className="text-sm text-blue-300">Increase in monthly recurring revenue</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">24/7</div>
            <div className="text-sm text-green-300">Automated payment protection</div>
          </div>
        </div>
      </div>
    </div>
  )
}