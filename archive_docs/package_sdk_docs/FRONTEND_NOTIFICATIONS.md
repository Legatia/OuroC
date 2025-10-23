# Frontend Notifications for Pre-Payment Reminders

This guide explains how to implement frontend notifications for OuroC subscription payment reminders, extending beyond wallet notifications to provide in-app user experience.

## Overview

OuroC provides a comprehensive notification system that shows payment reminders both:
1. **On-chain** - SPL memo transactions sent to Solana wallets
2. **In-app** - Real-time frontend notifications in your dApp UI

## Quick Start

### 1. Basic Integration

```tsx
import React from 'react'
import { OuroCProvider, NotificationButton, useNotifications } from '@ouroc/sdk'

function App() {
  return (
    <OuroCProvider canisterId="7tbxr-naaaa-aaaao-qkrca-cai" network="devnet">
      <YourDAppContent />
    </OuroCProvider>
  )
}

function YourDAppContent() {
  const {
    notifications,
    unreadCount,
    isListeningToTransactions,
    markAsRead,
    markAllAsRead,
  } = useNotifications()

  return (
    <div>
      {/* Your app header */}
      <header>
        <h1>Your DApp</h1>

        {/* Notification button with badge */}
        <NotificationButton
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
        />
      </header>

      {/* Status indicator */}
      {isListeningToTransactions && (
        <div className="status-indicator">
          🟢 Listening for payment notifications
        </div>
      )}

      {/* Your app content */}
      <main>
        {/* Your regular dApp content */}
      </main>
    </div>
  )
}
```

### 2. Full Example with Testing

```tsx
import React from 'react'
import {
  OuroCProvider,
  NotificationButton,
  NotificationExample,
  useNotifications
} from '@ouroc/sdk'

function App() {
  return (
    <OuroCProvider
      canisterId="7tbxr-naaaa-aaaao-qkrca-cai"
      network="devnet"
    >
      <div className="app">
        <nav className="navbar">
          <h1>OuroC SaaS</h1>
          <NotificationButton
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
          />
        </nav>

        <main className="main-content">
          <NotificationExample />
          {/* Your other app components */}
        </main>
      </div>
    </OuroCProvider>
  )
}
```

## How It Works

### 1. Dual Notification System

**Wallet Notifications (SPL Memos)**
- Sent automatically by Solana smart contract
- Format: `"Merchant Name: Payment due in X days. Amount: Y TOKEN"`
- Visible in wallet transaction history
- Works even when dApp is closed

**Frontend Notifications (Real-time UI)**
- Listen for SPL memo transactions via Solana WebSocket
- Parse memo content into structured notifications
- Display in-app with rich UI components
- Support for marking as read/unread

### 2. Transaction Listening

The `useNotifications` hook automatically:

1. **Connects to Solana** - Uses WebSocket for real-time transaction monitoring
2. **Filters Transactions** - Only processes transactions with SPL memo instructions
3. **Parses Memos** - Extracts payment reminder information from memo text
4. **Creates Notifications** - Converts parsed data into UI notifications
5. **Avoids Duplicates** - Prevents duplicate notifications from same transaction

### 3. Memo Parsing

The system parses these memo formats:

```javascript
// Payment reminder
"Acme Corp: Payment due in 3 days. Amount: 29.00 USDC"
// → { type: 'payment_reminder', merchantName: 'Acme Corp', daysUntilPayment: 3, amount: '29.00', token: 'USDC' }

// Payment success
"Payment processed successfully for subscription sub_123"
// → { type: 'payment_success', message: 'Payment processed successfully...' }

// Subscription created
"Subscription created: sub_123 for Basic plan"
// → { type: 'subscription_created', message: 'Subscription created...' }
```

## Components

### NotificationButton

A bell icon with notification badge that opens the notification panel.

```tsx
<NotificationButton
  notifications={notifications}
  unreadCount={unreadCount}
  onMarkAsRead={markAsRead}
  onMarkAllAsRead={markAllAsRead}
  className="custom-styles" // Optional
/>
```

### NotificationPanel

Complete notification display with filtering and management.

```tsx
<NotificationPanel
  notifications={notifications}
  unreadCount={unreadCount}
  onMarkAsRead={markAsRead}
  onMarkAllAsRead={markAllAsRead}
  onClose={() => setIsOpen(false)} // Optional
  className="custom-styles" // Optional
/>
```

### NotificationExample

Demonstration component showing usage and testing controls.

```tsx
<NotificationExample />
```

## Hook API

### useNotifications

```tsx
const {
  notifications,              // Array of OuroCNotification[]
  unreadCount,                // Number of unread notifications
  loading,                    // Loading state
  error,                      // Error message
  markAsRead,                 // (id: string) => void
  markAllAsRead,              // () => void
  refresh,                    // () => Promise<void>
  isListeningToTransactions,  // boolean - WebSocket connection status
  simulatePaymentReminder,    // For testing - creates demo notification
  parseSolanaMemo,           // Utility function
} = useNotifications()
```

### Notification Types

```tsx
type OuroCNotification = {
  id: string
  title: string                 // "Payment Due Soon", "Payment Successful", etc.
  message: string              // Full notification message
  timestamp: Date | number     // When notification was created
  read: boolean                // Read/unread status
  type: 'payment_reminder' | 'payment_success' | 'payment_failed' | 'subscription_created'
  metadata?: {
    merchantName?: string      // For payment reminders
    daysUntilPayment?: number  // Days until payment due
    amount?: string           // Payment amount
    token?: string            // Payment token (USDC, USDT, etc.)
    source?: 'solana_memo' | 'icp_canister' | 'simulation'
    memo?: string             // Original SPL memo content
  }
}
```

## Testing

### Simulating Notifications

For development and testing, you can simulate notifications:

```tsx
const { simulatePaymentReminder } = useNotifications()

// Simulate payment reminder
simulatePaymentReminder?.({
  merchantName: 'Test SaaS',
  amount: '29.00',
  token: 'USDC',
  daysUntilPayment: 3,
})

// Simulate successful payment
simulatePaymentReminder?.({
  merchantName: 'Test SaaS',
  amount: '29.00',
  token: 'USDC',
  daysUntilPayment: -1, // Negative indicates success
})
```

### Testing with Real Transactions

1. Create a subscription on devnet
2. Wait for payment reminder to be sent (3 days before due date)
3. Check both wallet and frontend notifications
4. Verify memo parsing works correctly

## Customization

### Styling

Components use Tailwind CSS classes that can be customized:

```tsx
// Custom notification button styling
<NotificationButton className="bg-blue-500 hover:bg-blue-600" />

// Custom panel styling
<NotificationPanel className="shadow-xl border-0" />
```

### Theme Integration

Notifications automatically use your OuroCProvider theme:

```tsx
<OuroCProvider
  canisterId="..."
  network="devnet"
  theme={{
    colors: {
      primary: '#your-brand-color',
      // ... other theme colors
    }
  }}
>
  {/* Your app */}
</OuroCProvider>
```

## Best Practices

### 1. Wallet Connection

Always ensure wallet is connected before using notifications:

```tsx
const { isConnected, publicKey } = useOuroC()

if (!isConnected || !publicKey) {
  return <ConnectWalletPrompt />
}

// Safe to use notifications
return <NotificationButton ... />
```

### 2. Error Handling

The hook includes built-in error handling, but you can add custom handling:

```tsx
const { error } = useNotifications()

useEffect(() => {
  if (error) {
    console.error('Notification error:', error)
    // Show error toast, etc.
  }
}, [error])
```

### 3. Performance

- Transaction listening is optimized to avoid excessive API calls
- Notifications are cached to prevent duplicates
- WebSocket connection is automatically managed

### 4. User Experience

- Show connection status (`isListeningToTransactions`)
- Provide test notifications for development
- Clear notification indicators after user reads them
- Support both light and dark themes

## Network Configuration

The system automatically uses the correct Solana RPC based on your OuroCProvider network:

- **Devnet**: `https://api.devnet.solana.com`
- **Mainnet**: `https://api.mainnet-beta.solana.com`

## Troubleshooting

### Notifications Not Appearing

1. Check wallet connection: `const { isConnected, publicKey } = useOuroC()`
2. Verify WebSocket status: `isListeningToTransactions`
3. Check for errors in the hook
4. Ensure transactions contain SPL memo instructions

### WebSocket Connection Issues

- WebSocket connections are automatically managed
- Connection attempts are made when wallet connects
- Failed connections don't break the app, notifications just won't update in real-time

### Memo Parsing Issues

- Ensure memos follow the expected format
- Check the `parseSolanaMemo` utility function
- Verify memo content is in the transaction

## Security Considerations

- Only reads transactions for the connected user's address
- No private keys or sensitive data is exposed
- Memo content is public on-chain by design
- WebSocket connections use standard Solana RPC endpoints

## Future Enhancements

Planned improvements to the notification system:

- Push notifications (service workers)
- In-app notification sounds
- Email notification integration
- Mobile app support
- Custom notification rules
- Notification analytics dashboard