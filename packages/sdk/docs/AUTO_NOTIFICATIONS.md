# Auto-Notifications - Built-in by Default

OuroC now includes **automatic frontend notifications** that are enabled by default for all users. No additional setup required - users get payment reminders directly in your dApp UI automatically.

## ✅ What's Automatic?

**Every OuroC user gets:**
- 🔔 **Real-time payment reminders** in your dApp UI
- 🔔 **Browser notifications** for critical payment alerts
- 🔔 **In-app alerts** for urgent payments (≤1 day)
- 🔔 **Wallet notifications** via SPL memos (existing)
- 🔔 **Visual notification badge** with unread count
- 🔔 **Connection status indicator** showing system is active

## 🚀 Zero-Configuration Setup

```tsx
import { OuroCProvider } from '@ouroc/sdk'

function App() {
  return (
    <OuroCProvider
      canisterId="7tbxr-naaaa-aaaao-qkrca-cai"
      network="devnet"
    >
      <YourDApp />
      {/* ✅ Auto-notifications automatically included! */}
    </OuroCProvider>
  )
}
```

That's it! Users will automatically receive:
- Payment reminders 3 days before due date
- Urgent payment alerts 1 day before due date
- Real-time payment confirmations
- Visual notification bell with badge

## 🎛️ Optional Customization

If you want to customize the notification behavior:

```tsx
<OuroCProvider
  canisterId="7tbxr-naaaa-aaaao-qkrca-cai"
  network="devnet"
  notifications={{
    enabled: true,                    // ✅ Default: enabled
    position: 'top-right',           // ✅ Default: top-right
    showBrowserNotifications: true,  // ✅ Default: enabled
    autoAlertUrgent: true            // ✅ Default: enabled
  }}
>
  <YourDApp />
</OuroCProvider>
```

### Disable Notifications (If Needed)

```tsx
<OuroCProvider
  canisterId="..."
  network="devnet"
  notifications={{
    enabled: false // Disable auto-notifications
  }}
>
  <YourDApp />
</OuroCProvider>
```

## 🔄 How It Works

### 1. Automatic Transaction Listening
```
User connects wallet → WebSocket starts → Monitors transactions →
SPL memo detected → Parsed into notification → UI updates
```

### 2. Multi-Layer Notification System
```
🔔 Frontend UI → Notification bell + panel (always visible)
🔔 Browser Notification → System tray (critical payments)
🔔 In-app Alert → Modal dialog (urgent payments ≤1 day)
🔔 Wallet Memo → SPL transaction (on-chain record)
```

### 3. Smart Notification Filtering
- **3+ days**: Standard notification bell
- **1-3 days**: Browser notification + bell
- **≤1 day**: Browser notification + in-app alert + bell
- **Payment success**: Confirmation notification

## 🎯 User Experience

### Normal State
- ✅ Small bell icon in corner of your dApp
- ✅ Green dot shows connection is active
- ✅ Badge shows unread count

### Payment Reminder
- ✅ Bell badge shows number of pending reminders
- ✅ Click bell to see all notifications
- ✅ Color-coded by urgency (yellow = 3 days, red = 1 day)

### Urgent Payment (≤1 day)
- ✅ Browser notification appears
- ✅ In-app alert dialog: "⚠️ URGENT PAYMENT REMINDER"
- ✅ Click to view subscription details

### Development Mode
- ✅ Additional debug panel shows connection status
- ✅ Test button to simulate payment reminders
- ✅ Real-time listening indicator

## 📱 Mobile & Desktop Support

### Desktop Browsers
- ✅ Browser notifications (system tray)
- ✅ In-app notification panel
- ✅ Audio feedback (browser sounds)

### Mobile Browsers
- ✅ In-app notifications (primary)
- ✅ Browser notifications (if supported)
- ✅ Vibration feedback (if enabled)

## 🛡️ Privacy & Security

- ✅ **Opt-in by default** - Users can disable anytime
- ✅ **No personal data stored** - Only reads public transactions
- ✅ **Wallet-specific** - Only monitors connected wallet address
- ✅ **On-chain verification** - All data comes from blockchain
- ✅ **Browser permission** - Notifications require user consent

## 📊 Notification Types

| Type | Trigger | Display | User Action |
|------|---------|---------|-------------|
| **Payment Reminder** | 3 days before due | Bell + browser | View subscription |
| **Urgent Alert** | ≤1 day before due | Bell + browser + alert | Immediate attention |
| **Payment Success** | After successful payment | Bell confirmation | View receipt |
| **Subscription Created** | New subscription created | Bell confirmation | View details |

## 🎨 Custom Styling

Notifications automatically use your OuroC theme:

```tsx
<OuroCProvider
  canisterId="..."
  network="devnet"
  theme={{
    colors: {
      primary: '#your-brand-color',
      // All notifications inherit your theme
    }
  }}
>
  <YourDApp />
</OuroCProvider>
```

## 🧪 Testing & Development

In development mode, you get additional testing tools:

```tsx
// Auto-enabled in NODE_ENV === 'development'
<NotificationExample />
```

Features:
- ✅ **Test button** - Simulate payment reminders
- ✅ **Connection status** - Real-time WebSocket indicator
- ✅ **Debug panel** - Shows unread count and listening status
- ✅ **Live reload** - Test notifications without page refresh

## 🔧 Advanced Usage

### Manual Notification (Testing)
```tsx
import { useNotifications } from '@ouroc/sdk'

function TestComponent() {
  const { simulatePaymentReminder } = useNotifications()

  const testNotification = () => {
    simulatePaymentReminder?.({
      merchantName: 'Your SaaS',
      amount: '29.00',
      token: 'USDC',
      daysUntilPayment: 3
    })
  }

  return <button onClick={testNotification}>Test Notification</button>
}
```

### Custom Notification Handler
```tsx
import { useNotifications } from '@ouroc/sdk'

function CustomNotifications() {
  const { notifications, markAsRead } = useNotifications()

  // Build your own notification UI
  return (
    <div>
      {notifications.map(n => (
        <div key={n.id}>
          {n.title}: {n.message}
          <button onClick={() => markAsRead(n.id)}>Dismiss</button>
        </div>
      ))}
    </div>
  )
}
```

## 🚫 Common Concerns

**"Will this annoy my users?"**
- ✅ Only shows for actual subscription payments
- ✅ Respectful frequency (max 1 reminder per payment)
- ✅ Users can disable anytime
- ✅ No marketing or promotional messages

**"Is this secure?"**
- ✅ Only reads public blockchain data
- ✅ No private keys or sensitive information
- ✅ Runs entirely in user's browser
- ✅ Optional and transparent

**"Will this slow down my app?"**
- ✅ Lightweight WebSocket connection
- ✅ Efficient transaction filtering
- ✅ No impact on main app performance
- ✅ Automatic connection management

## 📈 Benefits

### For Users
- ✅ **Never miss a payment** - Multiple reminder layers
- ✅ **Peace of mind** - Automatic monitoring
- ✅ **Easy management** - Simple notification panel
- ✅ **Privacy-respecting** - No data sharing

### For Developers
- ✅ **Zero integration effort** - Works automatically
- ✅ **Better user experience** - Reduced support issues
- ✅ **Higher retention** - Fewer missed payments
- ✅ **Professional polish** - Enterprise-grade feature

### For Business
- ✅ **Improved cash flow** - Fewer missed payments
- ✅ **Lower support costs** - Self-serve payment management
- ✅ **User trust** - Transparent and respectful
- ✅ **Competitive advantage** - Premium user experience

## 🎯 Migration from Manual

**Before (Manual Setup):**
```tsx
// Old way - required manual implementation
import { NotificationButton, useNotifications } from '@ouroc/sdk'

function YourApp() {
  const { notifications, unreadCount, markAsRead } = useNotifications()

  return (
    <div>
      <NotificationButton
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
      />
      {/* Your app content */}
    </div>
  )
}
```

**After (Auto-Enabled):**
```tsx
// New way - zero configuration required
import { OuroCProvider } from '@ouroc/sdk'

function YourApp() {
  return (
    <OuroCProvider canisterId="..." network="devnet">
      {/* Your app content */}
      {/* ✅ Notifications automatically included! */}
    </OuroCProvider>
  )
}
```

## 📚 Next Steps

1. **Do nothing** - Auto-notifications are already working!
2. **Optional**: Customize position or disable if needed
3. **Test**: Connect wallet and create test subscription
4. **Monitor**: Check notification bell appears in corner
5. **Verify**: Users receive reminders before payments

**Ready! Your users now have automatic payment reminders.** 🎉