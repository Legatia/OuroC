/**
 * PushNotificationService
 * Handles Web Push API integration for OuroC subscription notifications
 */

import {
  PushNotificationPayload,
  PushNotificationPermission,
  PushSubscriptionConfig,
  OuroCNotification,
  SupportedToken,
  formatTokenAmount
} from '../core/types'

export class PushNotificationService {
  private vapidPublicKey: string
  private serviceWorkerPath: string
  private registration: ServiceWorkerRegistration | null = null

  constructor(vapidPublicKey: string, serviceWorkerPath: string = '/sw.js') {
    this.vapidPublicKey = vapidPublicKey
    this.serviceWorkerPath = serviceWorkerPath
  }

  /**
   * Check if push notifications are supported in this browser
   */
  static isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    )
  }

  /**
   * Initialize service worker for push notifications
   */
  async initialize(): Promise<ServiceWorkerRegistration> {
    if (!PushNotificationService.isSupported()) {
      throw new Error('Push notifications are not supported in this browser')
    }

    try {
      this.registration = await navigator.serviceWorker.register(this.serviceWorkerPath)
      console.log('Service Worker registered:', this.registration.scope)
      return this.registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      throw error
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!PushNotificationService.isSupported()) {
      throw new Error('Push notifications are not supported')
    }

    const permission = await Notification.requestPermission()
    console.log('Notification permission:', permission)
    return permission
  }

  /**
   * Get current permission state
   */
  async getPermissionState(): Promise<PushNotificationPermission> {
    if (!PushNotificationService.isSupported()) {
      return {
        state: 'denied',
        subscription: null
      }
    }

    const subscription = await this.getSubscription()
    return {
      state: Notification.permission,
      subscription
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscriptionConfig> {
    if (!this.registration) {
      await this.initialize()
    }

    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Notification permission denied')
    }

    try {
      const subscription = await this.registration!.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      })

      return this.subscriptionToConfig(subscription)
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      throw error
    }
  }

  /**
   * Get existing push subscription
   */
  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      try {
        this.registration = await navigator.serviceWorker.ready
      } catch {
        return null
      }
    }

    return await this.registration.pushManager.getSubscription()
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    const subscription = await this.getSubscription()
    if (subscription) {
      return await subscription.unsubscribe()
    }
    return true
  }

  /**
   * Show a local notification (doesn't require push)
   */
  async showNotification(payload: PushNotificationPayload): Promise<void> {
    if (!this.registration) {
      await this.initialize()
    }

    await this.registration!.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/logo-192.png',
      badge: payload.badge || '/badge-72.png',
      tag: payload.tag,
      data: payload.data,
      requireInteraction: payload.requireInteraction || false,
      vibrate: [200, 100, 200]
    })
  }

  /**
   * Create notification payload from OuroC notification
   */
  static createPayload(notification: OuroCNotification): PushNotificationPayload {
    let title = 'OuroC Subscription'
    let body = notification.message
    let requireInteraction = false

    switch (notification.type) {
      case 'upcoming_payment':
        title = '💰 Upcoming Payment Reminder'
        if (notification.metadata) {
          const { amount, token, daysUntilPayment } = notification.metadata
          if (amount && token && daysUntilPayment !== undefined) {
            body = `Payment of ${formatTokenAmount(amount, token as string)} due in ${daysUntilPayment} day${daysUntilPayment !== 1 ? 's' : ''}`
          }
        }
        break

      case 'low_balance':
        title = '⚠️ Low Balance Alert'
        requireInteraction = true
        break

      case 'payment_success':
        title = '✅ Payment Successful'
        break

      case 'payment_failed':
        title = '❌ Payment Failed'
        requireInteraction = true
        break

      case 'subscription_expiring':
        title = '⏰ Subscription Expiring'
        requireInteraction = true
        break
    }

    return {
      title,
      body,
      icon: '/logo-192.png',
      badge: '/badge-72.png',
      tag: `ouroctime-${notification.subscriptionId}`,
      data: {
        subscriptionId: notification.subscriptionId,
        type: notification.type,
        url: `/subscriptions/${notification.subscriptionId}`
      },
      requireInteraction
    }
  }

  /**
   * Convert PushSubscription to config format for backend
   */
  private subscriptionToConfig(subscription: PushSubscription): PushSubscriptionConfig {
    const json = subscription.toJSON()
    return {
      endpoint: json.endpoint!,
      keys: {
        p256dh: json.keys!.p256dh!,
        auth: json.keys!.auth!
      },
      userAgent: navigator.userAgent,
      deviceId: this.generateDeviceId()
    }
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  /**
   * Generate unique device ID for tracking subscriptions
   */
  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('ouroctime-device-id')
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('ouroctime-device-id', deviceId)
    }
    return deviceId
  }
}

export default PushNotificationService
