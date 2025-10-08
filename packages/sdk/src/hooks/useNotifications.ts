import { useState, useEffect, useCallback } from 'react'
import { useOuroC } from '../providers/OuroCProvider'
import { UseNotificationsReturn, OuroCNotification } from '../core/types'

export function useNotifications(): UseNotificationsReturn {
  const { client, isConnected, config } = useOuroC()
  const [notifications, setNotifications] = useState<OuroCNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Handle errors consistently
  const handleError = (error: unknown, context: string) => {
    let message: string

    if (error instanceof Error) {
      message = error.message
    } else {
      message = 'An unexpected error occurred'
    }

    setError(message)

    if (config.onError) {
      const errorObj = error instanceof Error ? error : new Error(message)
      config.onError(errorObj, context)
    }
  }

  // Fetch notifications from canister
  const refresh = useCallback(async () => {
    if (!isConnected) {
      setNotifications([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // TODO: Implement actual notification fetching from canister
      // For now, return empty array
      setNotifications([])
    } catch (error) {
      handleError(error, 'FETCH_NOTIFICATIONS')
    } finally {
      setLoading(false)
    }
  }, [client, isConnected, config])

  // Auto-refresh when wallet connects
  useEffect(() => {
    refresh()
  }, [refresh])

  // Mark single notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    )
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    )
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refresh
  }
}