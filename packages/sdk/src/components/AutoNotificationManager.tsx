import React, { useEffect } from 'react'
import { useNotifications } from '../hooks'
import { NotificationButton } from './NotificationButton'

interface AutoNotificationManagerProps {
  enabled?: boolean
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  className?: string
}

/**
 * AutoNotificationManager - Automatically manages frontend notifications
 *
 * This component:
 * 1. Automatically starts listening for Solana transactions when wallet connects
 * 2. Shows a notification button by default (unless explicitly disabled)
 * 3. Displays critical payment reminders even if notifications are disabled
 * 4. Provides fallback in-app alerts for important payment events
 */
export function AutoNotificationManager({
  enabled = true,
  position = 'top-right',
  className = ''
}: AutoNotificationManagerProps) {
  const {
    notifications,
    unreadCount,
    isListeningToTransactions,
    markAsRead,
    markAllAsRead,
    simulatePaymentReminder,
  } = useNotifications()

  // Position classes for the notification button
  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-50',
    'top-left': 'fixed top-4 left-4 z-50',
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50',
  }

  // Show browser notification for critical payment reminders
  useEffect(() => {
    if (!enabled) return

    const criticalNotifications = notifications.filter(n =>
      !n.read && (
        n.type === 'payment_reminder' &&
        n.metadata?.daysUntilPayment !== undefined &&
        n.metadata.daysUntilPayment <= 3
      )
    )

    criticalNotifications.forEach(notification => {
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/ouroc-logo.png',
          tag: notification.id,
          requireInteraction: true
          // Note: actions are not supported in all browsers
        })

        // Auto-close after 10 seconds
        setTimeout(() => {
          browserNotification.close()
        }, 10000)

        // Handle notification clicks
        browserNotification.onclick = () => {
          window.focus()
          browserNotification.close()
          // Mark as read
          markAsRead(notification.id)
        }
      }
    })
  }, [notifications, enabled, markAsRead])

  // Auto-show payment reminder alerts for very urgent payments
  useEffect(() => {
    if (!enabled) return

    const urgentNotifications = notifications.filter(n =>
      !n.read &&
      n.type === 'payment_reminder' &&
      n.metadata?.daysUntilPayment !== undefined &&
      n.metadata.daysUntilPayment <= 1
    )

    if (urgentNotifications.length > 0) {
      const latestUrgent = urgentNotifications[0]

      // Show in-app alert for urgent payments
      setTimeout(() => {
        const confirmed = window.confirm(
          `⚠️ URGENT PAYMENT REMINDER\n\n${latestUrgent.message}\n\nClick OK to view your subscriptions.`
        )

        if (confirmed) {
          markAsRead(latestUrgent.id)
          // You could navigate to subscription page here
        }
      }, 1000)
    }
  }, [notifications, enabled, markAsRead])

  if (!enabled) {
    return null
  }

  return (
    <div className={`${positionClasses[position]} ${className}`}>
      {/* Notification Button */}
      <NotificationButton
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />

      {/* Connection Status Indicator */}
      {isListeningToTransactions && (
        <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-green-500 rounded-full animate-pulse">
          <span className="sr-only">Connected to Solana</span>
        </div>
      )}

      {/* Test Controls (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-12 right-0 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
          <div className="flex items-center space-x-2 mb-1">
            <span>🔔 {unreadCount} unread</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className={isListeningToTransactions ? 'text-green-400' : 'text-red-400'}>
              {isListeningToTransactions ? '🟢' : '🔴'} Listening
            </span>
          </div>
          <button
            onClick={() => simulatePaymentReminder?.({
              merchantName: 'Test Merchant',
              amount: '29.00',
              token: 'USDC',
              daysUntilPayment: 3,
            })}
            className="mt-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 rounded text-xs"
          >
            Test
          </button>
        </div>
      )}
    </div>
  )
}