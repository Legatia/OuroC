import React, { useState } from 'react';
import Layout from '../components/Layout';

const SubscriptionFlowPage = () => {
  const [activePhase, setActivePhase] = useState<number | null>(null);

  const phases = [
    {
      id: 1,
      title: "Phase 1: Initialization",
      color: "blue",
      steps: [
        {
          title: "Deploy Solana Contract",
          description: "Deploy subscription program to Solana devnet/mainnet",
          code: "anchor deploy --provider.cluster devnet",
          details: [
            "Initialize config with fee percentage",
            "Set ICP public key for signature verification",
            "Configure authorization mode"
          ]
        },
        {
          title: "Deploy ICP Canister",
          description: "Deploy timer canister to Internet Computer",
          code: "dfx deploy ouro_c_timer --network ic",
          details: [
            "Generate Threshold Ed25519 wallets",
            "Derive Solana wallet addresses",
            "Store main_wallet and fee_collection addresses"
          ]
        }
      ]
    },
    {
      id: 2,
      title: "Phase 2: Subscription Creation",
      color: "green",
      steps: [
        {
          title: "Step 1: User Approves Delegation",
          description: "Subscriber approves PDA to spend tokens",
          code: "approve_subscription_delegate(subscription_id, amount)",
          details: [
            "User wallet signs transaction",
            "Subscription PDA gets delegate authority",
            "Max amount per payment locked on-chain"
          ]
        },
        {
          title: "Step 2: Create Subscription (Solana)",
          description: "Store subscription data on Solana blockchain",
          code: "create_subscription({ id, amount, merchant, token, interval })",
          details: [
            "Create Subscription PDA account",
            "Store: amount, merchant, subscriber, token_mint",
            "Set status to Active, payments_made to 0"
          ]
        },
        {
          title: "Step 3: Create Timer (ICP)",
          description: "Create recurring timer in ICP canister",
          code: "create_subscription({ id, interval, token_mint, reminder_days })",
          details: [
            "Store minimal timer data (no amounts/addresses)",
            "Calculate next_execution timestamp",
            "Schedule ICP timer for trigger"
          ]
        }
      ]
    },
    {
      id: 3,
      title: "Phase 3: Notification Trigger",
      color: "yellow",
      steps: [
        {
          title: "ICP Timer Fires (Notification)",
          description: "Timer triggers X days before payment",
          code: "send_solana_opcode(contract, id, opcode=1)",
          details: [
            "Fires at: next_payment - (reminder_days × 86400)",
            "Calls Solana with opcode 1 (Notification)",
            "ICP sends transaction to Solana"
          ]
        },
        {
          title: "Solana: process_trigger(opcode=1)",
          description: "Route to notification handler",
          code: "match opcode { 1 => send_notification_internal() }",
          details: [
            "Read subscription PDA for details",
            "Build memo: 'Payment due in X days. Amount: Y USDC'",
            "Transfer 0.000001 SOL to subscriber with memo"
          ]
        },
        {
          title: "User Sees Notification",
          description: "Wallet shows transaction with memo",
          code: "// User's wallet transaction history",
          details: [
            "Phantom/Solflare shows incoming SOL",
            "Memo visible in transaction details",
            "No email or push notification needed"
          ]
        }
      ]
    },
    {
      id: 4,
      title: "Phase 4: Payment Trigger",
      color: "purple",
      steps: [
        {
          title: "ICP Timer Fires (Payment)",
          description: "Recurring timer triggers payment",
          code: "send_solana_opcode(contract, id, opcode=0)",
          details: [
            "Fires when: now >= next_execution",
            "Calls Solana with opcode 0 (Payment)",
            "Sends subscription_id for routing"
          ]
        },
        {
          title: "Solana: Opcode Routing",
          description: "Decide swap vs direct payment",
          code: "if token_mint == USDC { direct() } else { swap() }",
          details: [
            "Read subscription PDA (source of truth)",
            "Check payment_token_mint field",
            "Route to appropriate handler"
          ]
        },
        {
          title: "Direct USDC Payment",
          description: "Transfer USDC with fee split",
          code: "process_direct_usdc_payment()",
          details: [
            "Calculate fee: amount × fee_% / 10000",
            "Transfer fee → ICP Treasury USDC account",
            "Transfer rest → Merchant USDC account",
            "Update: payments_made++, total_paid += amount"
          ]
        },
        {
          title: "Multi-Token Swap (Future)",
          description: "Swap token → USDC via Jupiter",
          code: "process_swap_then_split()",
          details: [
            "Swap USDT/PYUSD/DAI → USDC via Jupiter",
            "Apply slippage protection (0.5% max)",
            "Same fee split as direct USDC",
            "TODO: Full Jupiter integration pending"
          ]
        },
        {
          title: "ICP Reschedules Timer",
          description: "Automatic rescheduling for next cycle",
          code: "next_execution = now + interval",
          details: [
            "Update trigger_count++",
            "Set last_triggered = now",
            "Schedule new timer for next interval",
            "Cycle repeats automatically"
          ]
        }
      ]
    },
    {
      id: 5,
      title: "Phase 5: User Controls",
      color: "red",
      steps: [
        {
          title: "Pause Subscription",
          description: "User can pause payments anytime",
          code: "pause_subscription(id)",
          details: [
            "Solana: Set status = Paused",
            "ICP: Cancel active timer",
            "No payments until resumed"
          ]
        },
        {
          title: "Resume Subscription",
          description: "Reactivate paused subscription",
          code: "resume_subscription(id)",
          details: [
            "Solana: Set status = Active",
            "ICP: Reschedule timer from now",
            "Payments resume normally"
          ]
        },
        {
          title: "Cancel Subscription",
          description: "Permanently stop subscription",
          code: "cancel_subscription(id)",
          details: [
            "Solana: Set status = Cancelled",
            "ICP: Cancel timer permanently",
            "Optional: Revoke PDA delegate authority"
          ]
        }
      ]
    }
  ];

  const phaseColors = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    yellow: "from-yellow-500 to-yellow-600",
    purple: "from-purple-500 to-purple-600",
    red: "from-red-500 to-red-600"
  };

  const phaseBorders = {
    blue: "border-blue-500",
    green: "border-green-500",
    yellow: "border-yellow-500",
    purple: "border-purple-500",
    red: "border-red-500"
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white py-12 px-4">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            OuroC Subscription Work Cycle
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Complete lifecycle of a decentralized subscription from initialization to recurring payments
          </p>
          <div className="mt-6 inline-flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded"></div>
              <span>ICP Canister</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded"></div>
              <span>Solana Contract</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-green-600 rounded"></div>
              <span>User Action</span>
            </div>
          </div>
        </div>

        {/* Architecture Overview */}
        <div className="max-w-7xl mx-auto mb-12 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
          <h2 className="text-2xl font-bold mb-6 text-center">Architecture Principles</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-3 text-blue-400">Minimalistic ICP</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• Only 600 lines of code</li>
                <li>• Stores timing/routing data only</li>
                <li>• 2-opcode system (0=payment, 1=notification)</li>
                <li>• Threshold Ed25519 signing</li>
              </ul>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-3 text-purple-400">Solana Source of Truth</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• Immutable blockchain storage</li>
                <li>• All payment data (amounts, addresses)</li>
                <li>• PDA delegation proofs</li>
                <li>• Payment history on-chain</li>
              </ul>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-3 text-green-400">Security Benefits</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• No data duplication/desync</li>
                <li>• 70% smaller attack surface</li>
                <li>• Disaster recovery from Solana</li>
                <li>• User trusts blockchain data</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Phase Timeline */}
        <div className="max-w-7xl mx-auto space-y-8">
          {phases.map((phase, phaseIndex) => (
            <div
              key={phase.id}
              className={`bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border-2 transition-all duration-300 ${
                activePhase === phase.id
                  ? `${phaseBorders[phase.color as keyof typeof phaseBorders]} shadow-2xl scale-105`
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              {/* Phase Header */}
              <div
                className="flex items-center justify-between mb-6 cursor-pointer"
                onClick={() => setActivePhase(activePhase === phase.id ? null : phase.id)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-r ${
                      phaseColors[phase.color as keyof typeof phaseColors]
                    } flex items-center justify-center text-xl font-bold`}
                  >
                    {phase.id}
                  </div>
                  <h2 className="text-3xl font-bold">{phase.title}</h2>
                </div>
                <svg
                  className={`w-6 h-6 transition-transform ${activePhase === phase.id ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Phase Steps */}
              {activePhase === phase.id && (
                <div className="space-y-6 animate-fadeIn">
                  {phase.steps.map((step, stepIndex) => (
                    <div
                      key={stepIndex}
                      className="bg-gray-900/70 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`min-w-8 h-8 rounded-full bg-gradient-to-r ${
                            phaseColors[phase.color as keyof typeof phaseColors]
                          } flex items-center justify-center text-sm font-bold flex-shrink-0`}
                        >
                          {stepIndex + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                          <p className="text-gray-300 mb-4">{step.description}</p>

                          {/* Code Block */}
                          <div className="bg-black/50 rounded-lg p-4 mb-4 border border-gray-700">
                            <code className="text-sm text-green-400 font-mono">{step.code}</code>
                          </div>

                          {/* Details */}
                          <div className="space-y-2">
                            {step.details.map((detail, detailIndex) => (
                              <div key={detailIndex} className="flex items-start gap-2 text-sm text-gray-400">
                                <span className="text-blue-400 mt-1">▸</span>
                                <span>{detail}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Connection Line to Next Phase */}
              {phaseIndex < phases.length - 1 && (
                <div className="flex justify-center mt-8">
                  <div className="w-1 h-12 bg-gradient-to-b from-gray-600 to-transparent"></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Data Flow Summary */}
        <div className="max-w-7xl mx-auto mt-12 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
          <h2 className="text-2xl font-bold mb-6 text-center">Data Storage Breakdown</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-blue-400">ICP Canister Stores</h3>
              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>✓ subscription_id</li>
                  <li>✓ payment_token_mint (routing)</li>
                  <li>✓ reminder_days_before_payment</li>
                  <li>✓ interval_seconds</li>
                  <li>✓ next_execution (timestamp)</li>
                  <li>✓ status (Active/Paused/Cancelled)</li>
                </ul>
                <p className="text-xs text-gray-500 mt-4">Total: 9 fields (was 17 before refactor)</p>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4 text-purple-400">Solana Blockchain Stores</h3>
              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>✓ subscription_id</li>
                  <li>✓ subscriber + merchant addresses</li>
                  <li>✓ amount (USDC)</li>
                  <li>✓ payment_token_mint</li>
                  <li>✓ interval_seconds</li>
                  <li>✓ next_payment_time</li>
                  <li>✓ payments_made, total_paid</li>
                  <li>✓ PDA delegation proof</li>
                </ul>
                <p className="text-xs text-gray-500 mt-4">Total: 14 fields (comprehensive payment data)</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-4xl mx-auto mt-12 text-center">
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl p-8 border border-blue-500/30">
            <h2 className="text-2xl font-bold mb-4">Ready to Build?</h2>
            <p className="text-gray-300 mb-6">
              Integrate OuroC subscriptions into your dApp with our React SDK
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href="https://github.com/YOUR_USERNAME/OuroC"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all"
              >
                View on GitHub
              </a>
              <a
                href="/"
                className="px-6 py-3 bg-gray-700 rounded-lg font-semibold hover:bg-gray-600 transition-all"
              >
                Back to Demo
              </a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </Layout>
  );
};

export default SubscriptionFlowPage;
