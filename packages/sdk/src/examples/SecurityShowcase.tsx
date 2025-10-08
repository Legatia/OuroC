import React from 'react'
import {
  SecureOuroCClient,
  useSecureOuroC,
  SecureSubscriptionManager
} from '../index'

/**
 * Comprehensive showcase of OuroC security features
 */
export const SecurityShowcase: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">
          🔐 OuroC Security Architecture
        </h1>
        <p className="text-gray-300 max-w-3xl mx-auto">
          Comprehensive security implementation showcasing multi-layer protection with Solana signature authentication,
          permission-based access control, and secure canister communication.
        </p>
      </div>

      {/* Security Layers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: 'Authentication',
            icon: '🔑',
            description: 'Solana signature-based authentication with challenge-response protocol',
            features: [
              'Ed25519 signature verification',
              'Nonce-based replay protection',
              'Time-bound challenges',
              'Session token management'
            ]
          },
          {
            title: 'Authorization',
            icon: '🛡️',
            description: 'Granular permission system with role-based access control',
            features: [
              'Permission-based API access',
              'Address-based ownership',
              'Least privilege principle',
              'Operation-specific permissions'
            ]
          },
          {
            title: 'Rate Limiting',
            icon: '⏱️',
            description: 'Multi-level rate limiting to prevent abuse and DoS attacks',
            features: [
              '60 requests/minute per user',
              'Client-side enforcement',
              'Canister-level protection',
              'Automatic backoff'
            ]
          },
          {
            title: 'Secure Communication',
            icon: '🔒',
            description: 'Locked canister endpoints with version validation',
            features: [
              'NPM version whitelisting',
              'Locked API endpoints',
              'Customizable payments only',
              'Secure defaults'
            ]
          }
        ].map((layer, index) => (
          <div key={index} className="bg-gray-800 border border-gray-600 rounded-lg p-6">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">{layer.icon}</div>
              <h3 className="text-lg font-semibold text-white">{layer.title}</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">{layer.description}</p>
            <ul className="space-y-2">
              {layer.features.map((feature, idx) => (
                <li key={idx} className="flex items-center text-xs text-gray-300">
                  <span className="text-green-400 mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Security Flow Diagram */}
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-6 text-center">
          🔄 Authentication Flow
        </h2>
        <div className="flex flex-wrap justify-center items-center space-x-4 text-sm">
          {[
            { step: '1', text: 'Request Challenge', color: 'bg-blue-600' },
            { step: '2', text: 'Sign Message', color: 'bg-purple-600' },
            { step: '3', text: 'Verify Signature', color: 'bg-green-600' },
            { step: '4', text: 'Grant Session', color: 'bg-yellow-600' },
            { step: '5', text: 'Secure Access', color: 'bg-red-600' }
          ].map((item, index) => (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center">
                <div className={`${item.color} text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mb-2`}>
                  {item.step}
                </div>
                <span className="text-gray-300 text-center">{item.text}</span>
              </div>
              {index < 4 && (
                <div className="text-gray-500 text-xl">→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Code Examples */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Usage */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Basic Secure Usage</h3>
          <pre className="bg-black/50 p-4 rounded text-sm text-gray-300 overflow-x-auto">
{`// Initialize secure client
const client = new SecureOuroCClient(
  'canister-id',
  'mainnet',
  undefined,
  undefined,
  {
    allowCustomPaymentLogic: true,
    sessionTimeoutMinutes: 60,
    maxRequestsPerMinute: 60
  }
)

// Authenticate with wallet
await client.authenticate(walletAdapter)

// Secure canister operations
const subscription = await client.createSubscription({
  solana_payer: userAddress,
  solana_receiver: receiverAddress,
  payment_amount: lamports,
  interval_seconds: 3600n
})`}
          </pre>
        </div>

        {/* React Hook Usage */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">React Hook Integration</h3>
          <pre className="bg-black/50 p-4 rounded text-sm text-gray-300 overflow-x-auto">
{`// Use secure hook
const {
  client,
  authState,
  isAuthenticated,
  authenticate,
  logout,
  rateLimitRemaining
} = useSecureOuroC({
  canisterId: 'your-canister-id',
  network: 'mainnet',
  onAuthChange: (auth) => {
    console.log('Auth changed:', auth)
  },
  onError: (error) => {
    console.error('Security error:', error)
  }
})

// Component automatically handles security
if (!isAuthenticated) {
  return <AuthButton onClick={() => authenticate(wallet)} />
}`}
          </pre>
        </div>
      </div>

      {/* Live Demo Component */}
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-6 text-center">
          🚀 Live Security Demo
        </h2>
        <p className="text-gray-400 text-center mb-6">
          Interactive secure subscription manager with full authentication and authorization
        </p>
        <SecureSubscriptionManager
          canisterId="demo-canister-id"
          network="local"
          theme="dark"
          className="w-full"
        />
      </div>

      {/* Security Guarantees */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700/30 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-6 text-center">
          🛡️ Security Guarantees
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Address Ownership',
              description: 'Only Solana address owners can configure their subscriptions through cryptographic proof',
              icon: '🔐'
            },
            {
              title: 'Locked Communication',
              description: 'NPM package cannot bypass security - canister communication is immutable and version-controlled',
              icon: '🔒'
            },
            {
              title: 'Payment Flexibility',
              description: 'Users can customize payment processing while canister operations remain secure',
              icon: '💰'
            }
          ].map((guarantee, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl mb-3">{guarantee.icon}</div>
              <h3 className="font-semibold text-white mb-2">{guarantee.title}</h3>
              <p className="text-sm text-gray-300">{guarantee.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Implementation Status */}
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-6 text-center">
          📋 Implementation Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-green-400 mb-3">✅ Completed</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• ICP canister access control system</li>
              <li>• Secure NPM package with locked endpoints</li>
              <li>• React components with auth integration</li>
              <li>• Permission-based operation control</li>
              <li>• Rate limiting and DoS protection</li>
              <li>• Session management and cleanup</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-yellow-400 mb-3">🚧 Pending (Solana Contract)</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Ed25519 signature verification</li>
              <li>• Solana address public key validation</li>
              <li>• Message signing with wallet adapters</li>
              <li>• Cross-chain cryptographic proofs</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 border-t border-gray-700 pt-6">
        🔐 OuroC Security Architecture - Multi-layer protection for decentralized subscription management
      </div>
    </div>
  )
}

export default SecurityShowcase