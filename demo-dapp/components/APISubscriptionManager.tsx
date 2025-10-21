/**
 * API Subscription Manager Component
 * Interface for agents to manage their API service subscriptions
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cpu,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Settings,
  BarChart3,
  Zap,
  Database,
  Cloud,
  Globe,
  Shield,
  ArrowRight,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react'
import { APISubscriptionAgent, APISubscriptionConfig, APIProvider } from '@ouroc/sdk/agents/APISubscriptionAgent'
import { useOuroC } from '../providers/OuroCProvider'

interface ServiceRequirement {
  service_type: string
  expected_usage: number
  performance_requirements: {
    max_latency_ms?: number
    min_reliability?: number
    budget_limit?: number
  }
}

interface SubscriptionResult {
  success: boolean
  subscriptions_created: string[]
  total_monthly_cost: number
  optimization_suggestions: string[]
}

export default function APISubscriptionManager() {
  const { client, theme } = useOuroC()
  const [apiAgent] = useState(() => new APISubscriptionAgent(client))

  const [activeTab, setActiveTab] = useState<'setup' | 'monitor' | 'optimize'>('setup')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<SubscriptionResult | null>(null)
  const [analytics, setAnalytics] = useState<any>(null)

  // Form state
  const [agentId, setAgentId] = useState('')
  const [monthlyBudget, setMonthlyBudget] = useState(500)
  const [priority, setPriority] = useState<'cost' | 'performance' | 'reliability'>('cost')
  const [autoSwitch, setAutoSwitch] = useState(true)
  const [services, setServices] = useState<ServiceRequirement[]>([
    { service_type: 'llm', expected_usage: 1000000, performance_requirements: { max_latency_ms: 1000, min_reliability: 0.99 } }
  ])

  const [expandedSuggestions, setExpandedSuggestions] = useState<number[]>([])

  const addService = () => {
    setServices([...services, {
      service_type: '',
      expected_usage: 0,
      performance_requirements: {}
    }])
  }

  const updateService = (index: number, field: keyof ServiceRequirement, value: any) => {
    const newServices = [...services]
    if (field === 'performance_requirements') {
      newServices[index].performance_requirements = { ...newServices[index].performance_requirements, ...value }
    } else {
      newServices[index][field] = value
    }
    setServices(newServices)
  }

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index))
  }

  const handleSetupSubscriptions = async () => {
    if (!agentId || services.length === 0) {
      alert('Please provide agent ID and at least one service requirement')
      return
    }

    setIsProcessing(true)
    setResult(null)

    try {
      const config: APISubscriptionConfig = {
        agent_id: agentId,
        services_required: services,
        optimization_preferences: {
          priority,
          auto_switch,
          usage_monitoring: true
        },
        spending_controls: {
          monthly_budget: monthlyBudget,
          alert_threshold: 0.8,
          auto_scale: true
        }
      }

      const result = await apiAgent.setupAPISubscriptions(config)
      setResult(result)

      if (result.success) {
        setActiveTab('monitor')
      }
    } catch (error) {
      console.error('Setup failed:', error)
      setResult({
        success: false,
        subscriptions_created: [],
        total_monthly_cost: 0,
        optimization_suggestions: ['Error: ' + error.message]
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOptimizeSubscriptions = async () => {
    if (!agentId) return

    setIsProcessing(true)
    try {
      const optimization = await apiAgent.optimizeSubscriptions(agentId)
      setAnalytics(optimization)
    } catch (error) {
      console.error('Optimization failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'llm': return <Cpu className="h-4 w-4" />
      case 'database': return <Database className="h-4 w-4" />
      case 'storage': return <Cloud className="h-4 w-4" />
      case 'compute': return <Globe className="h-4 w-4" />
      default: return <Zap className="h-4 w-4" />
    }
  }

  const toggleSuggestion = (index: number) => {
    setExpandedSuggestions(
      expandedSuggestions.includes(index)
        ? expandedSuggestions.filter(i => i !== index)
        : [...expandedSuggestions, index]
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-purple-600/20 rounded-xl border border-purple-500/30">
              <Cpu className="h-8 w-8 text-purple-400" />
            </div>
            <h1 className="text-4xl font-bold text-white">API Subscription Agent</h1>
          </div>
          <p className="text-gray-300 text-lg">
            Automatically manage API service subscriptions for optimal cost and performance
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-slate-800/50 p-1 rounded-xl border border-slate-700">
          {['setup', 'monitor', 'optimize'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Setup Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'setup' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Agent Configuration */}
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6">
                <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
                  <Settings className="h-6 w-6 mr-3 text-purple-400" />
                  Agent Configuration
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Agent ID
                    </label>
                    <input
                      type="text"
                      value={agentId}
                      onChange={(e) => setAgentId(e.target.value)}
                      placeholder="agent-123abc"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Monthly Budget ($)
                    </label>
                    <input
                      type="number"
                      value={monthlyBudget}
                      onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Optimization Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="cost">Cost Optimization</option>
                      <option value="performance">Performance Priority</option>
                      <option value="reliability">Maximum Reliability</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-3 pt-6">
                    <input
                      type="checkbox"
                      id="autoSwitch"
                      checked={autoSwitch}
                      onChange={(e) => setAutoSwitch(e.target.checked)}
                      className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="autoSwitch" className="text-sm font-medium text-gray-300">
                      Enable automatic provider switching
                    </label>
                  </div>
                </div>
              </div>

              {/* Service Requirements */}
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white flex items-center">
                    <Zap className="h-6 w-6 mr-3 text-purple-400" />
                    Service Requirements
                  </h2>
                  <button
                    onClick={addService}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Service</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {services.map((service, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-700/50 border border-slate-600 rounded-xl p-4"
                    >
                      <div className="grid md:grid-cols-4 gap-4 items-end">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Service Type
                          </label>
                          <select
                            value={service.service_type}
                            onChange={(e) => updateService(index, 'service_type', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">Select type...</option>
                            <option value="llm">Language Model (LLM)</option>
                            <option value="database">Database</option>
                            <option value="storage">Storage</option>
                            <option value="compute">Compute</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Expected Usage
                          </label>
                          <input
                            type="number"
                            value={service.expected_usage}
                            onChange={(e) => updateService(index, 'expected_usage', Number(e.target.value))}
                            placeholder="1000000"
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Max Latency (ms)
                          </label>
                          <input
                            type="number"
                            value={service.performance_requirements.max_latency_ms || ''}
                            onChange={(e) => updateService(index, 'performance_requirements', { max_latency_ms: Number(e.target.value) })}
                            placeholder="1000"
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => removeService(index)}
                            className="px-3 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {services.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No service requirements added yet</p>
                    <p className="text-sm mt-2">Click "Add Service" to get started</p>
                  </div>
                )}
              </div>

              {/* Setup Button */}
              <div className="text-center">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSetupSubscriptions}
                  disabled={isProcessing || !agentId || services.length === 0}
                  className={`px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200 ${
                    isProcessing || !agentId || services.length === 0
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg hover:shadow-purple-500/25'
                  }`}
                >
                  {isProcessing ? (
                    <div className="flex items-center space-x-3">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>Setting up subscriptions...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <ArrowRight className="h-5 w-5" />
                      <span>Setup API Subscriptions</span>
                    </div>
                  )}
                </motion.button>
              </div>

              {/* Results */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6"
                >
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                    {result.success ? (
                      <CheckCircle className="h-6 w-6 mr-3 text-green-400" />
                    ) : (
                      <AlertCircle className="h-6 w-6 mr-3 text-red-400" />
                    )}
                    Setup Results
                  </h3>

                  {result.success && (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-green-400">Subscriptions Created</span>
                            <span className="text-2xl font-bold text-green-400">
                              {result.subscriptions_created.length}
                            </span>
                          </div>
                        </div>
                        <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-blue-400">Monthly Cost</span>
                            <span className="text-2xl font-bold text-blue-400">
                              ${result.total_monthly_cost.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-white font-medium">Created Subscriptions:</h4>
                        {result.subscriptions_created.map((sub, index) => (
                          <div key={index} className="flex items-center space-x-2 text-gray-300">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span>{sub}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.optimization_suggestions.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-white font-medium mb-3">Optimization Suggestions:</h4>
                      <div className="space-y-2">
                        {result.optimization_suggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="bg-yellow-600/20 border border-yellow-600/30 rounded-lg p-3 text-yellow-300 text-sm"
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Monitor Tab */}
          {activeTab === 'monitor' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6">
                <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
                  <BarChart3 className="h-6 w-6 mr-3 text-purple-400" />
                  Subscription Analytics
                </h2>

                {!agentId ? (
                  <div className="text-center py-12 text-gray-400">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Please set up subscriptions first to view analytics</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-600/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-purple-300">Total Spent</span>
                          <DollarSign className="h-4 w-4 text-purple-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">$0.00</div>
                        <div className="text-xs text-purple-300 mt-1">This month</div>
                      </div>

                      <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-600/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-blue-300">Active Services</span>
                          <Shield className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">0</div>
                        <div className="text-xs text-blue-300 mt-1">Subscriptions</div>
                      </div>

                      <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-600/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-green-300">Efficiency Score</span>
                          <TrendingUp className="h-4 w-4 text-green-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">--%</div>
                        <div className="text-xs text-green-300 mt-1">Cost optimized</div>
                      </div>
                    </div>

                    <div className="bg-slate-700/50 rounded-xl p-4">
                      <h3 className="text-white font-medium mb-4">Usage Trends</h3>
                      <div className="h-64 flex items-center justify-center text-gray-400">
                        <BarChart3 className="h-12 w-12 opacity-50" />
                        <p className="ml-3">Usage analytics will appear here</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Optimize Tab */}
          {activeTab === 'optimize' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white flex items-center">
                    <TrendingUp className="h-6 w-6 mr-3 text-purple-400" />
                    Subscription Optimization
                  </h2>
                  <button
                    onClick={handleOptimizeSubscriptions}
                    disabled={isProcessing || !agentId}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <BarChart3 className="h-4 w-4" />
                    )}
                    <span>Optimize</span>
                  </button>
                </div>

                {!agentId ? (
                  <div className="text-center py-12 text-gray-400">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Please set up subscriptions first to optimize</p>
                  </div>
                ) : analytics ? (
                  <div className="space-y-6">
                    {analytics.optimizations.length > 0 && (
                      <div>
                        <h3 className="text-white font-medium mb-4">Optimization Opportunities</h3>
                        <div className="space-y-3">
                          {analytics.optimizations.map((opt: string, index: number) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="bg-green-600/20 border border-green-600/30 rounded-lg p-4"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-green-300">{opt}</span>
                                <ChevronDown className="h-4 w-4 text-green-400" />
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-blue-600/20 border border-blue-600/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-blue-300">Potential Savings</span>
                          <DollarSign className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">
                          ${analytics.potential_savings.toFixed(2)}
                        </div>
                        <div className="text-xs text-blue-300 mt-1">Per month</div>
                      </div>

                      <div className="bg-purple-600/20 border border-purple-600/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-purple-300">Recommendations</span>
                          <AlertCircle className="h-4 w-4 text-purple-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {analytics.recommendations.length}
                        </div>
                        <div className="text-xs text-purple-300 mt-1">Action items</div>
                      </div>
                    </div>

                    {analytics.recommendations.length > 0 && (
                      <div>
                        <h3 className="text-white font-medium mb-4">Recommendations</h3>
                        <div className="space-y-2">
                          {analytics.recommendations.map((rec: string, index: number) => (
                            <div
                              key={index}
                              className="bg-yellow-600/20 border border-yellow-600/30 rounded-lg p-3 text-yellow-300 text-sm"
                            >
                              {rec}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Click "Optimize" to analyze your subscriptions</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}