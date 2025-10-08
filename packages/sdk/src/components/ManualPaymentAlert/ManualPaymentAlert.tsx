import React, { useState } from 'react'
import { SubscriptionId } from '../../core/types'

export interface ManualPaymentAlertProps {
  subscriptionIds: SubscriptionId[]
  onProcessPayment: (subscriptionId: SubscriptionId, walletAdapter: any) => Promise<string>
  walletAdapter?: any // Solana wallet adapter
  onDismiss?: () => void
  className?: string
  theme?: 'light' | 'dark'
}

export const ManualPaymentAlert: React.FC<ManualPaymentAlertProps> = ({
  subscriptionIds,
  onProcessPayment,
  walletAdapter,
  onDismiss,
  className = '',
  theme = 'dark'
}) => {
  const [processingIds, setProcessingIds] = useState<Set<SubscriptionId>>(new Set())
  const [completedIds, setCompletedIds] = useState<Set<SubscriptionId>>(new Set())
  const [errors, setErrors] = useState<Map<SubscriptionId, string>>(new Map())

  if (subscriptionIds.length === 0) {
    return null
  }

  const handlePayment = async (subscriptionId: SubscriptionId) => {
    if (!walletAdapter?.connected) {
      setErrors(prev => new Map(prev).set(subscriptionId, 'Wallet not connected'))
      return
    }

    setProcessingIds(prev => new Set(prev).add(subscriptionId))
    setErrors(prev => {
      const newErrors = new Map(prev)
      newErrors.delete(subscriptionId)
      return newErrors
    })

    try {
      await onProcessPayment(subscriptionId, walletAdapter)
      setCompletedIds(prev => new Set(prev).add(subscriptionId))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process payment'
      setErrors(prev => new Map(prev).set(subscriptionId, errorMessage))
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(subscriptionId)
        return newSet
      })
    }
  }

  const themeClasses = theme === 'dark'
    ? {
        container: 'bg-yellow-900/20 border-yellow-700/30 text-yellow-100',
        header: 'text-yellow-300',
        description: 'text-yellow-200/80',
        button: 'bg-yellow-600 hover:bg-yellow-500 text-white',
        buttonDisabled: 'bg-gray-600 text-gray-400 cursor-not-allowed',
        buttonSuccess: 'bg-green-600 text-white cursor-default',
        dismissButton: 'text-yellow-400 hover:text-yellow-300',
        error: 'text-red-400'
      }
    : {
        container: 'bg-yellow-50 border-yellow-200 text-yellow-900',
        header: 'text-yellow-800',
        description: 'text-yellow-700',
        button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        buttonDisabled: 'bg-gray-300 text-gray-500 cursor-not-allowed',
        buttonSuccess: 'bg-green-600 text-white cursor-default',
        dismissButton: 'text-yellow-600 hover:text-yellow-800',
        error: 'text-red-600'
      }

  return (
    <div className={`${themeClasses.container} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className={`text-sm font-medium ${themeClasses.header}`}>
              Manual Payment Required
            </h3>
            <div className={`mt-2 text-sm ${themeClasses.description}`}>
              <p>
                The OuroC canister is experiencing issues and cannot trigger automatic payments.
                Please manually process Solana payments for the following overdue subscriptions:
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {subscriptionIds.map(subscriptionId => {
                const isProcessing = processingIds.has(subscriptionId)
                const isCompleted = completedIds.has(subscriptionId)
                const error = errors.get(subscriptionId)

                return (
                  <div key={subscriptionId} className="flex items-center justify-between">
                    <div className="flex-1">
                      <code className="text-xs bg-black/20 px-2 py-1 rounded">
                        {subscriptionId}
                      </code>
                      {error && (
                        <p className={`text-xs mt-1 ${themeClasses.error}`}>
                          {error}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handlePayment(subscriptionId)}
                      disabled={isProcessing || isCompleted}
                      className={`ml-3 px-3 py-1 text-xs font-medium rounded transition-colors ${
                        isCompleted
                          ? themeClasses.buttonSuccess
                          : isProcessing
                          ? themeClasses.buttonDisabled
                          : themeClasses.button
                      }`}
                    >
                      {isProcessing ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : isCompleted ? (
                        <span className="flex items-center">
                          <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                          Completed
                        </span>
                      ) : (
                        'Process Payment'
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={onDismiss}
                className={`inline-flex rounded-md p-1.5 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 ${themeClasses.dismissButton}`}
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}