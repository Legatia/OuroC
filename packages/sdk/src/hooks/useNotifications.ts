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
      // ✅ Backend Integration: Fetch notifications from ICP canister
      // Implementation: Call ICP canister to get subscription notifications
      //
      // Example using OuroCClient:
      // const actor = await client.getActor()
      // const notificationHistory = await actor.get_notifications({
      //   wallet_address: publicKey?.toBase58(),
      //   limit: config?.maxNotifications || 50,
      //   offset: 0
      // })
      //
      // Transform canister response to OuroCNotification format:
      // const notifications = notificationHistory.map(n => ({
      //   id: n.id,
      //   type: n.notification_type, // 'PAYMENT_DUE', 'BALANCE_LOW', etc.
      //   title: n.title,
      //   message: n.message,
      //   timestamp: Number(n.timestamp) / 1_000_000, // Convert nanoseconds
      //   read: n.read_status,
      //   metadata: n.metadata
      // }))
      //
      // For now, return empty array (no backend yet)
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