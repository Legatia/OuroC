/**
 * Agent Payment Demo Component
 * Demonstrates AI agent making autonomous payments via OuroC
 */

import { useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { createDemoAgent, DEMO_PROMPTS, type APICallResult } from '../utils/ai-agent'

interface DemoStep {
  step: number
  title: string
  status: 'pending' | 'active' | 'completed'
  description: string
}

export function AgentPaymentDemo() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()

  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [agentId, setAgentId] = useState<string>('')
  const [apiCalls, setApiCalls] = useState<APICallResult[]>([])
  const [totalSpent, setTotalSpent] = useState<number>(0)
  const [logs, setLogs] = useState<string[]>([])

  const steps: DemoStep[] = [
    {
      step: 1,
      title: 'Initialize AI Agent',
      status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending',
      description: 'Create agent with keypair and owner authorization'
    },
    {
      step: 2,
      title: 'Setup Payment Subscription',
      status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending',
      description: 'Agent creates OuroC subscription with spending limits'
    },
    {
      step: 3,
      title: 'Autonomous API Calls',
      status: currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : 'pending',
      description: 'Agent makes API calls without human intervention'
    },
    {
      step: 4,
      title: 'Verify Payments',
      status: currentStep === 4 ? 'active' : currentStep > 4 ? 'completed' : 'pending',
      description: 'All payments processed autonomously via OuroC'
    }
  ]

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const runDemo = async () => {
    if (!publicKey) {
      addLog('❌ Please connect wallet first')
      return
    }

    setIsRunning(true)
    setCurrentStep(1)
    setApiCalls([])
    setTotalSpent(0)
    setLogs([])

    try {
      // Step 1: Initialize Agent
      addLog('🤖 Initializing AI Agent...')
      const programId = process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID || ''
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || ''

      const agent = createDemoAgent(
        publicKey.toBase58(),
        programId,
        rpcUrl
      )

      const agentPubkey = agent.getPublicKey().toBase58()
      const agentIdGenerated = agent.getAgentId()
      setAgentId(agentIdGenerated)

      addLog(`✅ Agent created: ${agentIdGenerated}`)
      addLog(`📍 Agent address: ${agentPubkey.slice(0, 8)}...`)
      addLog(`👤 Owner: ${publicKey.toBase58().slice(0, 8)}...`)

      await new Promise(resolve => setTimeout(resolve, 1000))

      // Step 2: Setup Payment Subscription
      setCurrentStep(2)
      addLog('💳 Setting up OuroC payment subscription...')

      const agentMetadata = agent.createAgentMetadata()
      addLog(`📝 Agent type: ${agentMetadata.agent_type}`)
      addLog(`💰 Spending limit: $10 per interval`)
      addLog(`✅ Subscription created (simulated)`)

      await new Promise(resolve => setTimeout(resolve, 1500))

      // Step 3: Make Autonomous API Calls
      setCurrentStep(3)
      addLog('🚀 Agent starting autonomous API calls...')
      addLog('───────────────────────────────────')

      const results: APICallResult[] = []
      let spent = 0

      for (const prompt of DEMO_PROMPTS) {
        const result = await agent.makeAPICall(prompt)
        results.push(result)
        spent += result.cost

        setApiCalls([...results])
        setTotalSpent(spent)

        addLog(`🤖 Prompt: "${prompt.slice(0, 40)}${prompt.length > 40 ? '...' : ''}"`)
        addLog(`💵 Cost: $${result.cost.toFixed(2)} USDC`)
        addLog(`✅ Payment processed automatically`)
        addLog('───────────────────────────────────')

        await new Promise(resolve => setTimeout(resolve, 800))
      }

      // Step 4: Verify Payments
      setCurrentStep(4)
      const stats = agent.getStats()
      addLog('📊 Demo Summary:')
      addLog(`   • Total API calls: ${stats.totalCalls}`)
      addLog(`   • Total spent: $${stats.totalSpent.toFixed(2)} USDC`)
      addLog(`   • Average cost: $${stats.averageCost.toFixed(2)} USDC`)
      addLog(`   • All payments processed autonomously ✅`)
      addLog('🎉 Demo complete!')

    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">🤖 Agent-to-Agent (A2A) Payment Demo</h1>
        <p className="text-lg opacity-90">
          Watch an AI agent autonomously pay for API services using OuroC subscriptions
        </p>
      </div>

      {/* Demo Steps */}
      <div className="glass rounded-lg border border-white/10 p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Demo Flow</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {steps.map((step) => (
            <div
              key={step.step}
              className={`p-4 rounded-lg border-2 transition-all ${
                step.status === 'active'
                  ? 'border-blue-500 bg-blue-500/10'
                  : step.status === 'completed'
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-white/20 bg-dark-800/50'
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step.status === 'active'
                      ? 'bg-blue-500 text-white'
                      : step.status === 'completed'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {step.status === 'completed' ? '✓' : step.step}
                </div>
                <h3 className="font-semibold text-sm text-white">{step.title}</h3>
              </div>
              <p className="text-xs text-gray-400">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Control Panel */}
      <div className="glass rounded-lg border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Control Panel</h2>
          <button
            onClick={runDemo}
            disabled={isRunning || !publicKey}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              isRunning || !publicKey
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
            }`}
          >
            {isRunning ? '⏳ Running Demo...' : publicKey ? '▶ Run Agent Demo' : '🔌 Connect Wallet First'}
          </button>
        </div>

        {/* Agent Info */}
        {agentId && (
          <div className="bg-dark-800/50 border border-white/10 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Agent ID:</span>
              <span className="font-mono text-sm">{agentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">API Calls Made:</span>
              <span className="font-mono text-sm">{apiCalls.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Total Spent:</span>
              <span className="font-mono text-sm text-green-600">${totalSpent.toFixed(2)} USDC</span>
            </div>
          </div>
        )}
      </div>

      {/* Live Logs */}
      <div className="glass rounded-lg border border-white/10 p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Live Activity Log</h2>
        <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-gray-400">Click "Run Agent Demo" to start...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="text-green-400 mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* API Call History */}
      {apiCalls.length > 0 && (
        <div className="glass rounded-lg border border-white/10 p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">API Call History</h2>
          <div className="space-y-2">
            {apiCalls.map((call, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-dark-800/50 border border-white/5 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{call.prompt}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(call.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">${call.cost.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">USDC</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Features */}
      <div className="glass rounded-lg border border-white/10 p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">🎯 Key Features Demonstrated</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <h3 className="font-semibold mb-2 text-white">🤖 Agent Identity</h3>
            <p className="text-sm text-gray-400">
              AI agent has unique keypair and identity, traceable to human owner
            </p>
          </div>
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="font-semibold mb-2 text-white">⚡ Autonomous Payments</h3>
            <p className="text-sm text-gray-400">
              No human approval needed for each transaction after setup
            </p>
          </div>
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <h3 className="font-semibold mb-2 text-white">🔒 Spending Limits</h3>
            <p className="text-sm text-gray-400">
              Built-in safety controls with max spending per interval
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
