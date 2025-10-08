import React, { useEffect } from 'react'
import { OuroCClient, CanisterHealth } from '../../core/OuroCClient'
import { useHealthMonitoring } from '../../hooks/useHealthMonitoring'
import { ManualPaymentAlert } from '../ManualPaymentAlert'

export interface HealthMonitorProps {
  client: OuroCClient | null
  walletAdapter?: any // Solana wallet adapter
  intervalMs?: number
  autoStart?: boolean
  showStatusIndicator?: boolean
  showManualPaymentAlert?: boolean
  className?: string
  theme?: 'light' | 'dark'
  onHealthChange?: (health: CanisterHealth) => void
  onError?: (error: Error) => void
}

export const HealthMonitor: React.FC<HealthMonitorProps> = ({
  client,
  walletAdapter,
  intervalMs = 30000,
  autoStart = true,
  showStatusIndicator = true,
  showManualPaymentAlert = true,
  className = '',
  theme = 'dark',
  onHealthChange,
  onError
}) => {
  const {
    health,
    isMonitoring,
    isLoading,
    error,
    startMonitoring,
    stopMonitoring,
    checkHealthNow,
    processManualPayment,
    overdueSubscriptions,
    clearOverdueSubscriptions
  } = useHealthMonitoring(client, {
    intervalMs,
    autoStart,
    onHealthChange,
    onOverdueSubscriptions: (subscriptionIds) => {
      console.log('Overdue subscriptions requiring manual payment:', subscriptionIds)
    }
  })

  // Handle errors
  useEffect(() => {
    if (error && onError) {
      onError(error)
    }
  }, [error, onError])

  const getStatusColor = (status: CanisterHealth['status']) => {
    switch (status) {
      case 'healthy':
        return theme === 'dark' ? 'text-green-400' : 'text-green-600'
      case 'degraded':
        return theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
      case 'offline':
        return theme === 'dark' ? 'text-red-400' : 'text-red-600'
      default:
        return theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
    }
  }

  const getStatusIcon = (status: CanisterHealth['status']) => {
    switch (status) {
      case 'healthy':
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'degraded':
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'offline':
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )
    }
  }

  const formatCycles = (cycles: bigint): string => {
    if (cycles < 1000n) return cycles.toString()
    if (cycles < 1000000n) return `${(Number(cycles) / 1000).toFixed(1)}K`
    if (cycles < 1000000000n) return `${(Number(cycles) / 1000000).toFixed(1)}M`
    return `${(Number(cycles) / 1000000000).toFixed(1)}B`
  }

  const themeClasses = theme === 'dark'
    ? {
        container: 'bg-gray-800 border-gray-700 text-gray-100',
        header: 'text-gray-200',
        status: 'text-gray-300',
        button: 'bg-blue-600 hover:bg-blue-500 text-white',
        buttonSecondary: 'border-gray-600 text-gray-300 hover:bg-gray-700'
      }
    : {
        container: 'bg-white border-gray-200 text-gray-900',
        header: 'text-gray-800',
        status: 'text-gray-600',
        button: 'bg-blue-600 hover:bg-blue-700 text-white',
        buttonSecondary: 'border-gray-300 text-gray-700 hover:bg-gray-50'
      }

  if (!showStatusIndicator && !showManualPaymentAlert) {
    return null
  }

  return (
    <div className={className}>
      {/* Status Indicator */}
      {showStatusIndicator && (
        <div className={`${themeClasses.container} border rounded-lg p-4 mb-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-2 ${getStatusColor(health?.status || 'offline')}`}>
                {isLoading ? getStatusIcon('offline') : getStatusIcon(health?.status || 'offline')}
                <span className="font-medium">
                  OuroC Canister: {health?.status ? health.status.charAt(0).toUpperCase() + health.status.slice(1) : 'Unknown'}
                </span>
              </div>

              {health && (
                <div className={`text-sm ${themeClasses.status}`}>
                  <span>
                    {health.subscription_count} subscriptions
                    {health.cycle_balance > 0n && ` • ${formatCycles(health.cycle_balance)} cycles`}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={checkHealthNow}
                disabled={isLoading}
                className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${themeClasses.buttonSecondary}`}
              >
                {isLoading ? 'Checking...' : 'Check Now'}
              </button>

              <button
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${themeClasses.button}`}
              >
                {isMonitoring ? 'Stop Monitor' : 'Start Monitor'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-900/20 border border-red-700/30 rounded text-red-400 text-sm">
              <strong>Error:</strong> {error.message}
            </div>
          )}
        </div>
      )}

      {/* Manual Payment Alert */}
      {showManualPaymentAlert && overdueSubscriptions.length > 0 && (
        <ManualPaymentAlert
          subscriptionIds={overdueSubscriptions}
          onProcessPayment={processManualPayment}
          walletAdapter={walletAdapter}
          onDismiss={clearOverdueSubscriptions}
          theme={theme}
          className="mb-4"
        />
      )}
    </div>
  )
}