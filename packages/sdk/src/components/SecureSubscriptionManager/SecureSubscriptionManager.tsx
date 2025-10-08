import React, { useState, useEffect } from 'react'
import { useSecureOuroC } from '../../hooks/useSecureOuroC'
import { CreateSubscriptionRequest, Subscription, SubscriptionId } from '../../core/types'

export interface SecureSubscriptionManagerProps {
  canisterId: string
  network?: 'mainnet' | 'testnet' | 'devnet' | 'local'
  walletAdapter?: any
  className?: string
  theme?: 'light' | 'dark'
  onError?: (error: Error) => void
}

export const SecureSubscriptionManager: React.FC<SecureSubscriptionManagerProps> = ({
  canisterId,
  network = 'mainnet',
  walletAdapter,
  className = '',
  theme = 'dark',
  onError
}) => {
  const {
    client,
    authState,
    isAuthenticated,
    isConnecting,
    authenticate,
    logout,
    securityConfig,
    rateLimitRemaining,
    error,
    clearError
  } = useSecureOuroC({
    canisterId,
    network,
    onError
  })

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const themeClasses = theme === 'dark'
    ? {
        container: 'bg-gray-900 border-gray-700 text-white',
        header: 'text-gray-100',
        card: 'bg-gray-800 border-gray-600',
        button: 'bg-blue-600 hover:bg-blue-500 text-white',
        buttonSecondary: 'bg-gray-700 hover:bg-gray-600 text-gray-200',
        buttonDanger: 'bg-red-600 hover:bg-red-500 text-white',
        input: 'bg-gray-700 border-gray-600 text-white',
        text: 'text-gray-300',
        success: 'text-green-400',
        error: 'text-red-400',
        warning: 'text-yellow-400'
      }
    : {
        container: 'bg-white border-gray-200 text-gray-900',
        header: 'text-gray-800',
        card: 'bg-gray-50 border-gray-200',
        button: 'bg-blue-600 hover:bg-blue-700 text-white',
        buttonSecondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
        buttonDanger: 'bg-red-600 hover:bg-red-700 text-white',
        input: 'bg-white border-gray-300 text-gray-900',
        text: 'text-gray-600',
        success: 'text-green-600',
        error: 'text-red-600',
        warning: 'text-yellow-600'
      }

  // Handle authentication
  const handleAuth = async () => {
    if (!walletAdapter) {
      onError?.(new Error('Wallet adapter not provided'))
      return
    }

    try {
      await authenticate(walletAdapter)
      await loadSubscriptions()
    } catch (err) {
      console.error('Authentication failed:', err)
    }
  }

  // Load user subscriptions
  const loadSubscriptions = async () => {
    if (!client || !isAuthenticated || !authState.solanaAddress) return

    setIsLoading(true)
    try {
      const userSubscriptions = await client.listSubscriptions(authState.solanaAddress)
      setSubscriptions(userSubscriptions)
    } catch (err) {
      console.error('Failed to load subscriptions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Effect to load subscriptions when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadSubscriptions()
    }
  }, [isAuthenticated])

  // Create subscription component
  const CreateSubscriptionForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [formData, setFormData] = useState({
      receiver: '',
      amount: '',
      interval: '3600'
    })
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!client || !authState.solanaAddress) return

      setIsSubmitting(true)
      try {
        const request: CreateSubscriptionRequest = {
          solana_payer: authState.solanaAddress,
          solana_receiver: formData.receiver,
          payment_amount: BigInt(Math.floor(parseFloat(formData.amount) * 1_000_000_000)), // Convert SOL to lamports
          interval_seconds: BigInt(parseInt(formData.interval))
        }

        await client.createSubscription(request)
        await loadSubscriptions()
        onClose()
      } catch (err) {
        console.error('Failed to create subscription:', err)
      } finally {
        setIsSubmitting(false)
      }
    }

    return (
      <div className={`${themeClasses.card} p-6 rounded-lg border`}>
        <h3 className={`text-lg font-semibold mb-4 ${themeClasses.header}`}>
          Create New Subscription
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${themeClasses.text}`}>
              Receiver Address
            </label>
            <input
              type="text"
              value={formData.receiver}
              onChange={(e) => setFormData({ ...formData, receiver: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
              placeholder="Solana address to receive payments"
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${themeClasses.text}`}>
              Amount (SOL)
            </label>
            <input
              type="number"
              step="0.001"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
              placeholder="0.1"
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${themeClasses.text}`}>
              Interval (seconds)
            </label>
            <select
              value={formData.interval}
              onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
            >
              <option value="60">Every minute</option>
              <option value="3600">Every hour</option>
              <option value="86400">Every day</option>
              <option value="604800">Every week</option>
              <option value="2592000">Every month</option>
            </select>
          </div>
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-md transition-colors ${themeClasses.button} ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Creating...' : 'Create Subscription'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-md transition-colors ${themeClasses.buttonSecondary}`}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${themeClasses.container} border rounded-lg p-6 ${className}`}>
        <div className={`mb-4 p-4 border rounded-lg bg-red-900/20 border-red-700/30`}>
          <h3 className={`font-medium ${themeClasses.error}`}>Security Error</h3>
          <p className={`text-sm mt-1 ${themeClasses.error}`}>{error.message}</p>
          <button
            onClick={clearError}
            className={`mt-2 px-3 py-1 text-xs rounded transition-colors ${themeClasses.buttonSecondary}`}
          >
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`${themeClasses.container} border rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-xl font-bold ${themeClasses.header}`}>
            🔐 Secure Subscription Manager
          </h2>
          <p className={`text-sm mt-1 ${themeClasses.text}`}>
            Secured by Solana signature authentication
          </p>
        </div>

        {/* Security Status */}
        <div className="text-right">
          <div className={`text-sm ${themeClasses.text}`}>
            Status: <span className={isAuthenticated ? themeClasses.success : themeClasses.warning}>
              {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </span>
          </div>
          {securityConfig && (
            <div className={`text-xs mt-1 ${themeClasses.text}`}>
              Version: {securityConfig.packageVersion} |
              Rate Limit: {rateLimitRemaining}/min
            </div>
          )}
        </div>
      </div>

      {/* Authentication Section */}
      {!isAuthenticated ? (
        <div className={`${themeClasses.card} p-4 rounded-lg border text-center`}>
          <h3 className={`font-medium mb-2 ${themeClasses.header}`}>
            Authentication Required
          </h3>
          <p className={`text-sm mb-4 ${themeClasses.text}`}>
            Connect your Solana wallet to securely manage subscriptions
          </p>
          <button
            onClick={handleAuth}
            disabled={isConnecting || !walletAdapter}
            className={`px-6 py-2 rounded-md transition-colors ${themeClasses.button} ${
              (isConnecting || !walletAdapter) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isConnecting ? 'Authenticating...' : 'Connect & Authenticate'}
          </button>
          {!walletAdapter && (
            <p className={`text-xs mt-2 ${themeClasses.error}`}>
              Wallet adapter not connected
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Authenticated User Info */}
          <div className={`${themeClasses.card} p-4 rounded-lg border mb-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${themeClasses.text}`}>
                  Connected as: <code className="font-mono text-xs">
                    {authState.solanaAddress}
                  </code>
                </p>
                <p className={`text-xs mt-1 ${themeClasses.text}`}>
                  Permissions: {authState.permissions.join(', ')}
                </p>
              </div>
              <button
                onClick={logout}
                className={`px-3 py-1 text-sm rounded transition-colors ${themeClasses.buttonDanger}`}
              >
                Logout
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 mb-6">
            <button
              onClick={() => setShowCreateForm(true)}
              className={`px-4 py-2 rounded-md transition-colors ${themeClasses.button}`}
            >
              Create Subscription
            </button>
            <button
              onClick={loadSubscriptions}
              disabled={isLoading}
              className={`px-4 py-2 rounded-md transition-colors ${themeClasses.buttonSecondary} ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="mb-6">
              <CreateSubscriptionForm onClose={() => setShowCreateForm(false)} />
            </div>
          )}

          {/* Subscriptions List */}
          <div className="space-y-4">
            <h3 className={`font-medium ${themeClasses.header}`}>Your Subscriptions</h3>
            {subscriptions.length === 0 ? (
              <div className={`${themeClasses.card} p-4 rounded-lg border text-center`}>
                <p className={themeClasses.text}>No subscriptions found</p>
              </div>
            ) : (
              subscriptions.map((subscription) => (
                <div key={subscription.id} className={`${themeClasses.card} p-4 rounded-lg border`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${themeClasses.header}`}>
                        {(Number(subscription.payment_amount) / 1_000_000_000).toFixed(3)} SOL
                      </p>
                      <p className={`text-sm ${themeClasses.text}`}>
                        To: <code className="font-mono text-xs">{subscription.solana_receiver}</code>
                      </p>
                      <p className={`text-xs mt-1 ${themeClasses.text}`}>
                        Every {Number(subscription.interval_seconds)} seconds
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 text-xs rounded ${
                        subscription.is_active ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
                      }`}>
                        {subscription.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Security Info Footer */}
      <div className={`mt-6 pt-4 border-t border-gray-600 text-xs ${themeClasses.text}`}>
        🔒 This interface is secured by Solana signature authentication. Only the wallet owner can modify their subscriptions.
      </div>
    </div>
  )
}