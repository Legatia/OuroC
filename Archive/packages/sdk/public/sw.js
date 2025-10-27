/**
 * OuroC Service Worker
 * Handles push notifications for subscription payments
 */

const CACHE_NAME = 'ouroctime-v1'

// Install event
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  return self.clients.claim()
})

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event)

  let notificationData = {
    title: 'OuroC Subscription',
    body: 'You have a new notification',
    icon: '/logo-192.png',
    badge: '/badge-72.png',
    tag: 'ouroctime-notification',
    data: {}
  }

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = {
        ...notificationData,
        ...data
      }
    } catch (err) {
      notificationData.body = event.data.text()
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction || false,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'view',
          title: 'View Subscription'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    })
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event)

  event.notification.close()

  const { action, notification } = event
  const data = notification.data || {}

  if (action === 'dismiss') {
    return
  }

  // Default action or 'view' action
  const urlToOpen = data.url || `/subscriptions/${data.subscriptionId || ''}`

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus()
        }
      }

      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
