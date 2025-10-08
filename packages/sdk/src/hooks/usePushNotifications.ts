/**
 * usePushNotifications Hook
 * React hook for managing push notifications in OuroC applications
 */

import { useState, useEffect, useCallback } from 'react'
import {
  PushNotificationPermission,
  PushSubscriptionConfig,
  OuroCNotification,
  PushNotificationPayload
} from '../core/types'
import PushNotificationService from '../services/PushNotificationService'

export interface UsePushNotificationsOptions {
  vapidPublicKey: string
  serviceWorkerPath?: string
  autoSubscribe?: boolean
  onNotificationClick?: (notification: PushNotificationPayload) => void
}

export interface UsePushNotificationsReturn {
  permission: PushNotificationPermission
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
  requestPermission: () => Promise<void>
  showNotification: (notification: OuroCNotification) => Promise<void>
  refresh: () => Promise<void>
}

export function usePushNotifications(
  options: UsePushNotificationsOptions
): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<PushNotificationPermission>({
    state: 'default',
    subscription: null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [service, setService] = useState<PushNotificationService | null>(null)

  const isSupported = PushNotificationService.isSupported()
  const isSubscribed = permission.subscription !== null

  // Initialize service
  useEffect(() => {
    if (isSupported) {
      const pushService = new PushNotificationService(
        options.vapidPublicKey,
        options.serviceWorkerPath
      )
      setService(pushService)

      // Initialize service worker
      pushService.initialize().catch((err) => {
        console.error('Failed to initialize push service:', err)
        setError(err.message)
      })
    }
  }, [options.vapidPublicKey, options.serviceWorkerPath, isSupported])

  // Load current permission state
  const refresh = useCallback(async () => {
    if (!service || !isSupported) return

    try {
      setIsLoading(true)
      const currentPermission = await service.getPermissionState()
      setPermission(currentPermission)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [service, isSupported])

  // Load permission state on mount
  useEffect(() => {
    refresh()
  }, [refresh])

  // Auto-subscribe if enabled and permission granted
  useEffect(() => {
    if (
      options.autoSubscribe &&
      permission.state === 'granted' &&
      !isSubscribed &&
      service
    ) {
      subscribe().catch(console.error)
    }
  }, [options.autoSubscribe, permission.state, isSubscribed, service])

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!service) {
      setError('Push notification service not initialized')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const newPermission = await service.requestPermission()
      await refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [service, refresh])

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!service) {
      setError('Push notification service not initialized')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const subscriptionConfig = await service.subscribe()
      console.log('Subscribed to push notifications:', subscriptionConfig)

      // ✅ Backend Integration: Save push subscription
      // Implementation: Send subscription config to your backend
      //
      // Example:
      // await fetch('/api/notifications/subscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     subscription: subscriptionConfig,
      //     walletAddress: publicKey?.toBase58(),
      //     timestamp: Date.now()
      //   })
      // })
      //
      // Your backend should store this and use it to send push notifications
      // when subscription events occur (payments, low balance, etc.)

      await refresh()
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [service, refresh])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!service) {
      setError('Push notification service not initialized')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const success = await service.unsubscribe()
      if (success) {
        console.log('Unsubscribed from push notifications')

        // ✅ Backend Integration: Remove push subscription
        // Implementation: Delete subscription from your backend
        //
        // Example:
        // await fetch('/api/notifications/unsubscribe', {
        //   method: 'DELETE',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     walletAddress: publicKey?.toBase58()
        //   })
        // })

        await refresh()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [service, refresh])

  // Show a notification
  const showNotification = useCallback(
    async (notification: OuroCNotification) => {
      if (!service) {
        setError('Push notification service not initialized')
        return
      }

      try {
        const payload = PushNotificationService.createPayload(notification)
        await service.showNotification(payload)
      } catch (err: any) {
        setError(err.message)
        throw err
      }
    },
    [service]
  )

  return {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    requestPermission,
    showNotification,
    refresh
  }
}

export default usePushNotifications
