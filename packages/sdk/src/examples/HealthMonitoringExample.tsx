import React, { useState, useCallback } from 'react'
import {
  OuroCClient,
  CanisterHealth,
  useHealthMonitoring,
  HealthMonitor
} from '../index'

/**
 * Example component demonstrating how to integrate OuroC health monitoring
 * into your dApp for automatic failover to manual payment collection.
 */
export const HealthMonitoringExample: React.FC = () => {
  const [client] = useState(() => new OuroCClient(
    'your-canister-id-here', // Replace with your actual canister ID
    'local' // or 'mainnet', 'testnet', 'devnet'
  ))

  // Example: Track health changes for logging/analytics
  const handleHealthChange = useCallback((health: CanisterHealth) => {
    console.log('Canister health changed:', health.status)

    // Example: Send health status to your analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('OuroC Health Change', {
        status: health.status,
        subscription_count: health.subscription_count,
        failed_payments: health.failed_payments
      })
    }

    // Example: Show user-friendly notifications
    if (health.status === 'degraded') {
      console.warn('OuroC canister is experiencing degraded performance')
    } else if (health.status === 'offline') {
      console.error('OuroC canister is offline - manual payment collection required')
    }
  }, [])

  // Example: Handle errors in health monitoring
  const handleError = useCallback((error: Error) => {
    console.error('Health monitoring error:', error)

    // Example: Report to error tracking service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error)
    }
  }, [])

  // Using the health monitoring hook directly for custom UI
  const {
    health,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    overdueSubscriptions,
    processManualPayment
  } = useHealthMonitoring(client, {
    role: 'merchant', // Default: checks every 24 hours (admins use 'admin' for 30s checks)
    autoStart: true,
    onHealthChange: handleHealthChange
  })

  // Example: Custom handling of manual payment processing
  const handleManualCollection = async (subscriptionId: string) => {
    try {
      // In a real app, you would get the wallet adapter from a context or prop
      const walletAdapter = (window as any).solana // Placeholder for wallet adapter

      const result = await processManualPayment(subscriptionId, walletAdapter)
      console.log('Manual payment processed:', result)

      // Example: Show success notification to user
      alert(`Payment processed successfully. Transaction: ${result}`)

      return result
    } catch (error) {
      console.error('Failed to process manual payment:', error)

      // Example: Show error to user
      alert(`Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`)

      throw error
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-white">
        <h1 className="text-2xl font-bold mb-4">OuroC Health Monitoring Example</h1>
        <p className="text-gray-300 mb-6">
          This example shows how to integrate OuroC health monitoring into your dApp
          for automatic failover to manual payment collection when the canister is experiencing issues.
        </p>
      </div>

      {/* Method 1: Using the HealthMonitor component (recommended for merchants) */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Method 1: Merchant Mode (24-hour checks)</h2>
        <p className="text-sm text-gray-400">
          For merchants: Simple canister offline detection. Checks once per day.
          Shows manual payment button only when canister is unavailable.
        </p>
        <HealthMonitor
          client={client}
          role="merchant"
          autoStart={true}
          showStatusIndicator={false}
          showManualPaymentAlert={true}
          theme="dark"
          onHealthChange={handleHealthChange}
          onError={handleError}
        />
      </div>

      {/* Method 2: Admin mode with detailed monitoring */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Method 2: Admin Mode (30-second checks)</h2>
        <p className="text-sm text-gray-400">
          For admins only: Detailed health monitoring with cycle balance, payment failures,
          and system metrics. Checks every 30 seconds.
        </p>
        <HealthMonitor
          client={client}
          role="admin"
          autoStart={true}
          showStatusIndicator={true}
          showManualPaymentAlert={true}
          theme="dark"
          onHealthChange={handleHealthChange}
          onError={handleError}
        />
      </div>

      {/* Method 3: Using the hook directly for custom UI */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Method 3: Custom UI with useHealthMonitoring Hook</h2>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-white">
              <h3 className="font-medium">Custom Health Display</h3>
              <p className="text-sm text-gray-400">
                Status: {health?.status || 'Unknown'} |
                Monitoring: {isMonitoring ? 'Active' : 'Inactive'} |
                Active Subscriptions: {health?.subscription_count || 0}
              </p>
            </div>
            <button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
            >
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </button>
          </div>

          {/* Custom manual collection UI */}
          {overdueSubscriptions.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded p-4">
              <h4 className="text-yellow-300 font-medium mb-2">Manual Payment Required</h4>
              <div className="space-y-2">
                {overdueSubscriptions.map((subscriptionId: string) => (
                  <div key={subscriptionId} className="flex items-center justify-between">
                    <code className="text-xs bg-black/20 px-2 py-1 rounded text-yellow-200">
                      {subscriptionId}
                    </code>
                    <button
                      onClick={() => handleManualCollection(subscriptionId)}
                      className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-white text-xs rounded transition-colors"
                    >
                      Process Payment
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Integration Examples */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Integration Examples</h2>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">Common Integration Patterns</h3>
          <div className="space-y-3 text-sm text-gray-300">
            <div>
              <strong className="text-white">1. Merchant integration (recommended):</strong>
              <pre className="mt-1 bg-black/50 p-2 rounded text-xs overflow-x-auto">
{`<HealthMonitor
  client={OuroCClient}
  role="merchant"
  autoStart={true}
  showStatusIndicator={false} // Hide status indicator for merchants
  showManualPaymentAlert={true} // Only show when canister is offline
/>`}
              </pre>
            </div>
            <div>
              <strong className="text-white">2. Admin dashboard integration:</strong>
              <pre className="mt-1 bg-black/50 p-2 rounded text-xs overflow-x-auto">
{`<HealthMonitor
  client={OuroCClient}
  role="admin"
  autoStart={true}
  showStatusIndicator={true} // Show detailed health metrics
  showManualPaymentAlert={true}
  onHealthChange={(health) => {
    if (health.cycle_balance < 500_000_000_000) {
      alertAdmin('Low cycle balance!')
    }
  }}
/>`}
              </pre>
            </div>
            <div>
              <strong className="text-white">3. Integrate with error tracking:</strong>
              <pre className="mt-1 bg-black/50 p-2 rounded text-xs overflow-x-auto">
{`onHealthChange: (health) => {
  if (health.status !== 'healthy') {
    Sentry.addBreadcrumb({
      message: 'OuroC health degraded',
      level: 'warning',
      data: { status: health.status, failure_rate: health.failure_rate }
    })
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HealthMonitoringExample