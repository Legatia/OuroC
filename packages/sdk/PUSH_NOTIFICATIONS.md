# Push Notifications Guide

## Overview

OuroC React SDK now supports Web Push Notifications, allowing users to receive real-time alerts about their subscription payments directly in their browser or mobile device - even when the app is closed.

## Features

✅ **Cross-Platform**: Works on web (Chrome, Firefox, Edge) and mobile (PWA)
✅ **Real-Time Alerts**: Instant notifications for upcoming payments, low balance, etc.
✅ **Offline Support**: Notifications work even when app is closed
✅ **Rich Content**: Custom icons, actions, and vibration patterns
✅ **Privacy-First**: User must explicitly grant permission

## Notification Types

### 1. Upcoming Payment (3 days before)
```
💰 Upcoming Payment Reminder
Payment of 10.000000 USDC due in 3 days
```

### 2. Low Balance Alert
```
⚠️ Low Balance Alert
Insufficient balance for upcoming payment
```

### 3. Payment Success
```
✅ Payment Successful
Your subscription payment was processed
```

### 4. Payment Failed
```
❌ Payment Failed
Unable to process subscription payment
```

## Setup

### Step 1: Generate VAPID Keys

First, generate VAPID keys for your application:

```bash
npx web-push generate-vapid-keys
```

This generates:
- **Public Key**: Used in frontend (safe to expose)
- **Private Key**: Used in backend (keep secret!)

### Step 2: Add Service Worker

Copy the provided service worker to your public directory:

```
/public/sw.js
```

Or create a custom one:

```javascript
// public/sw.js
self.addEventListener('push', (event) => {
  const data = event.data.json()

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo-192.png',
      badge: '/badge-72.png',
      data: data.metadata
    })
  )
})
```

### Step 3: Update manifest.json

Add to your `public/manifest.json`:

```json
{
  "name": "Your App Name",
  "short_name": "App",
  "icons": [
    {
      "src": "/logo-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/logo-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#667eea",
  "background_color": "#ffffff",
  "gcm_sender_id": "103953800507"
}
```

## Usage

### Basic Implementation

```typescript
import { usePushNotifications, NotificationPermissionPrompt } from '@ouroctime/react-sdk'

function App() {
  const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE'

  return (
    <div>
      <h1>My Subscription App</h1>

      {/* Show permission prompt */}
      <NotificationPermissionPrompt
        vapidPublicKey={VAPID_PUBLIC_KEY}
        onSubscribed={(subscription) => {
          console.log('User subscribed:', subscription)
          // Save subscription to your backend
        }}
      />
    </div>
  )
}
```

### Using the Hook Directly

```typescript
import { usePushNotifications } from '@ouroctime/react-sdk'

function NotificationSettings() {
  const {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    showNotification
  } = usePushNotifications({
    vapidPublicKey: 'YOUR_VAPID_PUBLIC_KEY'
  })

  if (!isSupported) {
    return <div>Push notifications not supported in this browser</div>
  }

  return (
    <div>
      <h2>Notification Settings</h2>

      <p>Status: {permission.state}</p>
      <p>Subscribed: {isSubscribed ? 'Yes' : 'No'}</p>

      {!isSubscribed ? (
        <button onClick={subscribe} disabled={isLoading}>
          Enable Notifications
        </button>
      ) : (
        <button onClick={unsubscribe} disabled={isLoading}>
          Disable Notifications
        </button>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  )
}
```

### Testing Notifications Locally

```typescript
import { usePushNotifications } from '@ouroctime/react-sdk'

function TestNotifications() {
  const { showNotification } = usePushNotifications({
    vapidPublicKey: 'YOUR_KEY'
  })

  const testUpcomingPayment = () => {
    showNotification({
      id: 'test-1',
      subscriptionId: 'sub_12345',
      message: 'Test notification',
      timestamp: Date.now(),
      read: false,
      type: 'upcoming_payment',
      metadata: {
        amount: BigInt(10_000_000), // 10 USDC
        token: 'USDC',
        daysUntilPayment: 3
      }
    })
  }

  return <button onClick={testUpcomingPayment}>Test Notification</button>
}
```

## Backend Integration

### Save Push Subscription

When a user subscribes, save the subscription to your backend:

```typescript
const {
  subscribe
} = usePushNotifications({
  vapidPublicKey: VAPID_PUBLIC_KEY
})

const handleSubscribe = async () => {
  try {
    await subscribe()

    // The subscription config is available in the hook's state
    // Send it to your backend
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: permission.subscription,
        userId: currentUser.id
      })
    })
  } catch (error) {
    console.error('Subscription failed:', error)
  }
}
```

### Backend: Send Push Notification (Node.js Example)

```javascript
// backend/pushNotifications.js
const webpush = require('web-push')

// Set VAPID keys
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// Send notification
async function sendPaymentReminder(subscription, paymentData) {
  const payload = JSON.stringify({
    title: '💰 Upcoming Payment Reminder',
    body: `Payment of ${paymentData.amount} ${paymentData.token} due in ${paymentData.days} days`,
    icon: '/logo-192.png',
    badge: '/badge-72.png',
    tag: `payment-${paymentData.subscriptionId}`,
    data: {
      subscriptionId: paymentData.subscriptionId,
      type: 'upcoming_payment',
      url: `/subscriptions/${paymentData.subscriptionId}`
    },
    requireInteraction: false
  })

  try {
    await webpush.sendNotification(subscription, payload)
    console.log('Push notification sent')
  } catch (error) {
    console.error('Error sending push notification:', error)
  }
}

module.exports = { sendPaymentReminder }
```

### ICP Integration

Update the ICP timer canister to trigger push notifications:

```motoko
// In notification_system.mo
public type NotificationChannel = {
    #Email: Text;
    #Discord: Text;
    #Slack: Text;
    #Webhook: Text;
    #PushNotification: PushConfig; // NEW
    #OnChain;
};

public type PushConfig = {
    endpoint: Text;
    p256dh_key: Text;
    auth_key: Text;
};

// Send push notification
private func send_push_notification(
    config: PushConfig,
    message: Text
): async Result.Result<(), Text> {
    // Call your backend API that handles web-push
    let push_payload = {
        endpoint = config.endpoint;
        keys = {
            p256dh = config.p256dh_key;
            auth = config.auth_key;
        };
        payload = message;
    };

    // HTTP outcall to your push service
    // await http_request_to_push_service(push_payload)
}
```

## Notification Flow

```
User Action → Frontend → Backend → ICP Timer → Push Service → User Device
    ↓
1. Subscribe to notifications
    ↓
2. Save subscription to backend
    ↓
3. Backend stores subscription
    ↓
4. ICP detects upcoming payment (3 days before)
    ↓
5. ICP calls backend push API
    ↓
6. Backend sends push via web-push library
    ↓
7. Service Worker receives push
    ↓
8. Notification appears on user's device
```

## Best Practices

### 1. Request Permission at Right Time

❌ **Bad**: Request on page load
```typescript
// Don't do this
useEffect(() => {
  subscribe() // Too aggressive
}, [])
```

✅ **Good**: Request after user shows interest
```typescript
// Do this
function SubscriptionCard({ onSubscribe }) {
  const { subscribe } = usePushNotifications({ vapidPublicKey })

  const handleSubscribe = async () => {
    await onSubscribe() // User subscribed to service
    await subscribe() // Now ask for push notifications
  }
}
```

### 2. Handle Permission Denied

```typescript
const { permission, subscribe } = usePushNotifications({ vapidPublicKey })

if (permission.state === 'denied') {
  return (
    <div>
      <p>Push notifications are blocked.</p>
      <p>Enable them in your browser settings:</p>
      <ul>
        <li>Chrome: Settings → Privacy and security → Site settings → Notifications</li>
        <li>Firefox: Settings → Privacy & Security → Permissions → Notifications</li>
      </ul>
    </div>
  )
}
```

### 3. Provide Value

Show users **why** they should enable notifications:

```typescript
<NotificationPermissionPrompt
  vapidPublicKey={VAPID_PUBLIC_KEY}
  features={[
    '💰 Get reminded 3 days before payments',
    '⚠️ Low balance alerts',
    '✅ Payment confirmations',
    '⏰ Never miss a payment'
  ]}
/>
```

## Troubleshooting

### Notifications Not Showing

1. **Check browser support:**
```typescript
if (!PushNotificationService.isSupported()) {
  console.error('Push notifications not supported')
}
```

2. **Check permission:**
```typescript
console.log('Permission:', Notification.permission)
// Should be 'granted'
```

3. **Check service worker:**
```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker registered:', reg)
})
```

4. **Check subscription:**
```typescript
const { permission } = usePushNotifications({ vapidPublicKey })
console.log('Subscription:', permission.subscription)
```

### iOS Limitations

iOS Safari doesn't support Web Push Notifications (as of iOS 16). Consider:
- Using PWA mode (Add to Home Screen)
- Fall back to in-app notifications
- Provide alternative notification methods (email, SMS)

## Security Considerations

1. **Keep Private Key Secret**: Never expose VAPID private key in frontend
2. **Verify Subscriptions**: Validate subscription endpoints server-side
3. **Rate Limiting**: Prevent notification spam
4. **User Privacy**: Allow users to unsubscribe anytime

## Examples

See complete examples in:
- `/examples/push-notifications-basic`
- `/examples/push-notifications-advanced`
- `/demo-dapp` (live implementation)

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-org/ouro-c/issues
- Discord: https://discord.gg/ouroctime
