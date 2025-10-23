import React from 'react'
import { useOuroC, useNotifications } from '../hooks'
import { NotificationButton } from './NotificationButton'

/**
 * Example component showing how to use the notification system
 *
 * This component demonstrates:
 * 1. How to integrate the notification button with the hook
 * 2. How to simulate payment reminders for testing
 * 3. How to display transaction listening status
 */
export function NotificationExample() {
  const { isConnected, publicKey } = useOuroC()
  const {
    notifications,
    unreadCount,
    isListeningToTransactions,
    simulatePaymentReminder,
    markAsRead,
    markAllAsRead,
  } = useNotifications()

  const handleTestPaymentReminder = () => {
    simulatePaymentReminder?.({
      merchantName: 'Demo SaaS',
      amount: '29.00',
      token: 'USDC',
      daysUntilPayment: 3,
    })
  }

  const handleTestSuccessNotification = () => {
    simulatePaymentReminder?.({
      merchantName: 'Demo SaaS',
      amount: '29.00',
      token: 'USDC',
      daysUntilPayment: -1, // Indicates successful payment
    })
  }

  if (!isConnected || !publicKey) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg text-center">
        <p className="text-gray-600">Connect your wallet to enable notifications</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Notification Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Payment Notifications</h3>
          <p className="text-sm text-gray-600">
            {isListeningToTransactions
              ? '🟢 Listening for Solana transactions'
              : '🔴 Not listening to transactions'
            }
          </p>
        </div>

        <NotificationButton
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
        />
      </div>

      {/* Test Controls */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3">Test Notifications</h4>
        <div className="space-y-2">
          <button
            onClick={handleTestPaymentReminder}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-sm"
          >
            ⏰ Simulate Payment Reminder (3 days)
          </button>

          <button
            onClick={handleTestSuccessNotification}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm ml-2"
          >
            ✅ Simulate Payment Success
          </button>
        </div>

        <p className="text-xs text-blue-700 mt-3">
          Note: In production, notifications are automatically created from:
          • SPL memo transactions from Solana
          • ICP canister payment events
          • Subscription creation/success events
        </p>
      </div>

      {/* Recent Notifications Preview */}
      {notifications.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Recent Notifications</h4>
          <div className="space-y-2">
            {notifications.slice(0, 3).map((notification) => (
              <div
                key={notification.id}
                className={`text-sm p-2 rounded border ${
                  !notification.read
                    ? 'bg-blue-50 border-blue-200 font-medium'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{notification.title}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1 truncate">
                  {notification.message}
                </p>
              </div>
            ))}
          </div>

          {notifications.length > 3 && (
            <p className="text-xs text-gray-500 mt-2">
              And {notifications.length - 3} more...
            </p>
          )}
        </div>
      )}

      {/* Status Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">How It Works</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Wallet Notifications:</strong> SPL memos are sent to your Solana wallet</li>
          <li>• <strong>Frontend Notifications:</strong> Real-time UI notifications appear here</li>
          <li>• <strong>Payment Reminders:</strong> Sent 3 days before payment due date</li>
          <li>• <strong>Payment Confirmations:</strong> Instant notification when payment succeeds</li>
          <li>• <strong>Transaction Listening:</strong> Automatically detects SPL memo transactions</li>
        </ul>
      </div>
    </div>
  )
}