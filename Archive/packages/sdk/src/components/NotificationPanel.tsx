import React, { useState } from 'react'
import { OuroCNotification } from '../core/types'

interface NotificationPanelProps {
  notifications: OuroCNotification[]
  unreadCount: number
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onClose?: () => void
  className?: string
}

export function NotificationPanel({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
  className = ''
}: NotificationPanelProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const filteredNotifications = notifications.filter(n =>
    filter === 'all' ? true : !n.read
  )

  const getNotificationIcon = (type: OuroCNotification['type']) => {
    switch (type) {
      case 'payment_reminder':
        return '⏰'
      case 'payment_success':
        return '✅'
      case 'payment_failed':
        return '❌'
      case 'subscription_created':
        return '📝'
      case 'low_balance':
        return '⚠️'
      case 'subscription_expiring':
        return '🔄'
      case 'upcoming_payment':
        return '💳'
      default:
        return '📬'
    }
  }

  const getNotificationColor = (type: OuroCNotification['type']) => {
    switch (type) {
      case 'payment_reminder':
        return 'border-yellow-200 bg-yellow-50'
      case 'payment_success':
        return 'border-green-200 bg-green-50'
      case 'payment_failed':
        return 'border-red-200 bg-red-50'
      case 'subscription_created':
        return 'border-blue-200 bg-blue-50'
      case 'low_balance':
        return 'border-orange-200 bg-orange-50'
      case 'subscription_expiring':
        return 'border-purple-200 bg-purple-50'
      case 'upcoming_payment':
        return 'border-indigo-200 bg-indigo-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const formatTimestamp = (timestamp: Date | number) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 w-96 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-l-4 transition-colors hover:bg-gray-50 cursor-pointer ${
                  getNotificationColor(notification.type)
                } ${!notification.read ? 'font-semibold' : ''}`}
                onClick={() => onMarkAsRead(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-2xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </p>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    {notification.metadata?.source && (
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs text-gray-400">
                          Source: {notification.metadata.source.replace('_', ' ')}
                        </span>
                        {notification.metadata.daysUntilPayment && (
                          <span className="text-xs text-gray-400">
                            • {notification.metadata.daysUntilPayment} days
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          Payment reminders are sent 3 days before due date
        </div>
      </div>
    </div>
  )
}