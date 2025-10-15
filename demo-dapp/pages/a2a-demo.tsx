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

      <main className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
        {/* Navigation */}
        <nav className="bg-dark-800/50 backdrop-blur-lg shadow-lg border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  OuroC
                </span>
                <span className="text-sm text-gray-400">|</span>
                <span className="text-sm font-medium text-gray-300">A2A Payment Demo</span>
              </div>
              <a
                href="/"
                className="text-sm text-gray-300 hover:text-white transition-colors"
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
          <div className="glass border border-purple-primary/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-white">
              💡 About This Demo
            </h3>
            <p className="text-sm text-gray-300 mb-4">
              This demonstration shows how OuroC's recurring payment infrastructure can enable
              autonomous AI agents to pay for services without human intervention. The agent
              creates a subscription, sets spending limits, and makes payments automatically
              as it consumes API services.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-semibold text-white">🔑 Key Innovation:</span>
                <p className="text-gray-400">
                  First payment rail designed for AI-to-AI commerce
                </p>
              </div>
              <div>
                <span className="font-semibold text-white">🛡️ Safety:</span>
                <p className="text-gray-400">
                  Built-in spending limits and owner attribution
                </p>
              </div>
              <div>
                <span className="font-semibold text-white">⚡ Speed:</span>
                <p className="text-gray-400">
                  No human approval delay for each transaction
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="max-w-6xl mx-auto px-6 pb-8">
          <div className="glass rounded-lg p-6 border border-white/10">
            <h3 className="text-xl font-semibold mb-4 text-white">🚀 Real-World Use Cases</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 border border-white/10 rounded-lg hover:shadow-md transition-shadow bg-dark-800/50">
                <div className="text-2xl mb-2">🤖</div>
                <h4 className="font-semibold mb-1 text-white">AI Service Payments</h4>
                <p className="text-sm text-gray-400">
                  Agents autonomously pay for OpenAI, Anthropic, or other AI APIs
                </p>
              </div>

              <div className="p-4 border border-white/10 rounded-lg hover:shadow-md transition-shadow bg-dark-800/50">
                <div className="text-2xl mb-2">💼</div>
                <h4 className="font-semibold mb-1 text-white">Business Process Automation</h4>
                <p className="text-sm text-gray-400">
                  AI agents handling procurement, invoicing, and vendor payments
                </p>
              </div>

              <div className="p-4 border border-white/10 rounded-lg hover:shadow-md transition-shadow bg-dark-800/50">
                <div className="text-2xl mb-2">🔄</div>
                <h4 className="font-semibold mb-1 text-white">Agent Marketplaces</h4>
                <p className="text-sm text-gray-400">
                  AI agents buying services from other AI agents
                </p>
              </div>

              <div className="p-4 border border-white/10 rounded-lg hover:shadow-md transition-shadow bg-dark-800/50">
                <div className="text-2xl mb-2">📊</div>
                <h4 className="font-semibold mb-1 text-white">Data Services</h4>
                <p className="text-sm text-gray-400">
                  Agents paying for real-time data feeds, analytics, and APIs
                </p>
              </div>

              <div className="p-4 border border-white/10 rounded-lg hover:shadow-md transition-shadow bg-dark-800/50">
                <div className="text-2xl mb-2">🎮</div>
                <h4 className="font-semibold mb-1 text-white">Gaming & Virtual Worlds</h4>
                <p className="text-sm text-gray-400">
                  AI NPCs making in-game purchases and subscriptions
                </p>
              </div>

              <div className="p-4 border border-white/10 rounded-lg hover:shadow-md transition-shadow bg-dark-800/50">
                <div className="text-2xl mb-2">🏢</div>
                <h4 className="font-semibold mb-1 text-white">Enterprise DAO</h4>
                <p className="text-sm text-gray-400">
                  Autonomous organizations with AI treasury management
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Stack */}
        <div className="max-w-6xl mx-auto px-6 pb-8">
          <div className="glass border border-white/10 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-white">🛠️ Technical Architecture</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-purple-400">Infrastructure Layer</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-300"><strong>ICP Timers:</strong> Autonomous payment execution</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-300"><strong>Threshold Ed25519:</strong> Secure agent keypairs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-300"><strong>Solana Programs:</strong> Fast, low-cost transactions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-300"><strong>Multi-token Support:</strong> USDC, USDT, PYUSD, DAI</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-blue-400">A2A Features</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-300"><strong>Agent Identity:</strong> Unique keypair per agent</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-300"><strong>Owner Attribution:</strong> Traceable to human</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-300"><strong>Spending Limits:</strong> Safety controls built-in</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-300"><strong>Audit Trail:</strong> Full transaction history</span>
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
