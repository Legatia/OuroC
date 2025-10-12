/**
 * A2A (Agent-to-Agent) Payment Demo Page
 * Showcases OuroC's capability to support autonomous AI agent payments
 */

import type { NextPage } from 'next'
import Head from 'next/head'
import { AgentPaymentDemo } from '../components/AgentPaymentDemo'

const A2ADemo: NextPage = () => {
  return (
    <>
      <Head>
        <title>A2A Payment Demo | OuroC</title>
        <meta
          name="description"
          content="See how AI agents can autonomously pay for services using OuroC recurring payment infrastructure"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  OuroC
                </span>
                <span className="text-sm text-gray-500">|</span>
                <span className="text-sm font-medium text-gray-600">A2A Payment Demo</span>
              </div>
              <a
                href="/"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Main
              </a>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="py-8">
          <AgentPaymentDemo />
        </div>

        {/* Info Banner */}
        <div className="max-w-6xl mx-auto px-6 pb-8">
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-6 border border-purple-200">
            <h3 className="text-lg font-semibold mb-2 text-purple-900">
              💡 About This Demo
            </h3>
            <p className="text-sm text-purple-800 mb-4">
              This demonstration shows how OuroC's recurring payment infrastructure can enable
              autonomous AI agents to pay for services without human intervention. The agent
              creates a subscription, sets spending limits, and makes payments automatically
              as it consumes API services.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-semibold text-purple-900">🔑 Key Innovation:</span>
                <p className="text-purple-700">
                  First payment rail designed for AI-to-AI commerce
                </p>
              </div>
              <div>
                <span className="font-semibold text-purple-900">🛡️ Safety:</span>
                <p className="text-purple-700">
                  Built-in spending limits and owner attribution
                </p>
              </div>
              <div>
                <span className="font-semibold text-purple-900">⚡ Speed:</span>
                <p className="text-purple-700">
                  No human approval delay for each transaction
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="max-w-6xl mx-auto px-6 pb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4">🚀 Real-World Use Cases</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="text-2xl mb-2">🤖</div>
                <h4 className="font-semibold mb-1">AI Service Payments</h4>
                <p className="text-sm text-gray-600">
                  Agents autonomously pay for OpenAI, Anthropic, or other AI APIs
                </p>
              </div>

              <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="text-2xl mb-2">💼</div>
                <h4 className="font-semibold mb-1">Business Process Automation</h4>
                <p className="text-sm text-gray-600">
                  AI agents handling procurement, invoicing, and vendor payments
                </p>
              </div>

              <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="text-2xl mb-2">🔄</div>
                <h4 className="font-semibold mb-1">Agent Marketplaces</h4>
                <p className="text-sm text-gray-600">
                  AI agents buying services from other AI agents
                </p>
              </div>

              <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="text-2xl mb-2">📊</div>
                <h4 className="font-semibold mb-1">Data Services</h4>
                <p className="text-sm text-gray-600">
                  Agents paying for real-time data feeds, analytics, and APIs
                </p>
              </div>

              <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="text-2xl mb-2">🎮</div>
                <h4 className="font-semibold mb-1">Gaming & Virtual Worlds</h4>
                <p className="text-sm text-gray-600">
                  AI NPCs making in-game purchases and subscriptions
                </p>
              </div>

              <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="text-2xl mb-2">🏢</div>
                <h4 className="font-semibold mb-1">Enterprise DAO</h4>
                <p className="text-sm text-gray-600">
                  Autonomous organizations with AI treasury management
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Stack */}
        <div className="max-w-6xl mx-auto px-6 pb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4">🛠️ Technical Architecture</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-purple-600">Infrastructure Layer</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>ICP Timers:</strong> Autonomous payment execution</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Threshold Ed25519:</strong> Secure agent keypairs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Solana Programs:</strong> Fast, low-cost transactions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Multi-token Support:</strong> USDC, USDT, PYUSD, DAI</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-blue-600">A2A Features</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Agent Identity:</strong> Unique keypair per agent</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Owner Attribution:</strong> Traceable to human</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Spending Limits:</strong> Safety controls built-in</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Audit Trail:</strong> Full transaction history</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="max-w-6xl mx-auto px-6 pb-8">
          <div className="bg-gray-800 rounded-lg p-6 text-white text-center">
            <p className="text-sm mb-2">
              Built with OuroC - The Future of Autonomous Payments
            </p>
            <div className="flex justify-center space-x-6 text-sm">
              <a href="https://github.com/yourusername/ouroc" className="hover:text-purple-300 transition-colors">
                GitHub
              </a>
              <a href="/docs" className="hover:text-purple-300 transition-colors">
                Documentation
              </a>
              <a href="https://twitter.com/ouroc" className="hover:text-purple-300 transition-colors">
                Twitter
              </a>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}

export default A2ADemo
