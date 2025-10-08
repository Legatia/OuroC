# @OuroC/react-sdk

🚀 **The easiest way to add Solana subscriptions to your React dApp**

OuroC React SDK provides plug-and-play components and hooks for integrating automatic SOL subscriptions into any Solana dApp. Built on ICP (Internet Computer Protocol) for reliable timer execution and multi-channel notifications.

## Features

- ⚡ **5-minute integration** - Add subscriptions to any React app
- 🎨 **Fully customizable** - Match your brand perfectly
- 🔔 **Smart notifications** - Email, Discord, Slack, webhooks
- 💰 **Automatic payments** - Reliable recurring SOL transactions
- 🔒 **Secure & trustless** - Powered by ICP and Solana
- 📱 **Mobile responsive** - Works on all devices
- ♿ **Accessible** - WCAG compliant components

## Quick Start

### Installation

```bash
npm install @OuroC/react-sdk @solana/wallet-adapter-react @solana/wallet-adapter-react-ui
# or
yarn add @OuroC/react-sdk @solana/wallet-adapter-react @solana/wallet-adapter-react-ui
```

### Basic Setup

```tsx
import {
  OuroCProvider,
  SubscriptionCard
} from '@OuroC/react-sdk'

function App() {
  return (
    <OuroCProvider
      canisterId="your-canister-id"
      network="mainnet"
    >
      <SubscriptionCard
        planName="Premium"
        price={0.1} // 0.1 SOL per month
        interval="monthly"
        features={['Feature 1', 'Feature 2', 'Feature 3']}
        onSubscribe={(plan) => console.log('Subscribed:', plan)}
      />
    </OuroCProvider>
  )
}
```

### With Wallet Integration

```tsx
import { WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { OuroCProvider } from '@OuroC/react-sdk'

function App() {
  return (
    <WalletProvider wallets={[]}>
      <WalletModalProvider>
        <OuroCProvider
          canisterId="your-canister-id"
          network="mainnet"
          theme={{
            colors: {
              primary: '#9945FF',
              secondary: '#00D18C'
            }
          }}
        >
          <YourApp />
        </OuroCProvider>
      </WalletModalProvider>
    </WalletProvider>
  )
}
```

## Components

### SubscriptionCard

Beautiful, responsive subscription cards with built-in payment flow.

```tsx
<SubscriptionCard
  planName="Premium Plan"
  price={0.15} // SOL amount
  interval="monthly"
  features={[
    'Advanced analytics',
    'Priority support',
    'API access'
  ]}
  popular={true} // Highlight as popular
  onSubscribe={async (plan) => {
    // Handle subscription
  }}
/>
```

### Pre-configured Cards

Create reusable subscription cards for your dApp:

```tsx
import { createSubscriptionCard } from '@OuroC/react-sdk'

const MySubscriptionCard = createSubscriptionCard(
  'YourDAppSolanaAddress123456789', // Your receiving address
  'Premium subscription' // Default metadata
)

// Use like a normal component
<MySubscriptionCard
  planName="Premium"
  price={0.1}
  interval="monthly"
  features={['Feature 1', 'Feature 2']}
/>
```

### Merchant Dashboard

Monitor subscription revenue and customer status with the built-in dashboard:

```tsx
import { MerchantDashboard } from '@OuroC/react-sdk'
import { useWallet } from '@solana/wallet-adapter-react'

function MerchantPage() {
  const { publicKey } = useWallet()

  return (
    <MerchantDashboard
      merchantAddress={publicKey}
      subscriptions={[
        {
          id: 'sub_abc123',
          subscriber: new PublicKey('...'),
          merchant: new PublicKey('...'),
          amount: 10_000_000, // 10 USDC (6 decimals)
          intervalSeconds: 2592000, // 30 days
          status: 0, // Active
          icpFeePercentage: 200, // 2%
          lastPayment: Date.now() - 86400000 * 5,
          nextPayment: Date.now() + 86400000 * 25
        }
      ]}
      payments={[
        {
          id: '1',
          subscriber: '7xKX...gAsU',
          amount: 10,
          date: Date.now(),
          status: 'success'
        }
      ]}
      onFetchSubscriptions={async () => {
        // Fetch subscriptions from your backend or Solana program
        const subs = await fetchSubscriptionsForMerchant(publicKey)
        return subs
      }}
    />
  )
}
```

**Features:**
- Revenue stats (total subscribers, active subscriptions, monthly revenue, growth)
- Subscription list with status indicators
- Payment history with timestamps
- Fully customizable with CSS
- TypeScript support

## Hooks

### useSubscription

Manage subscriptions programmatically:

```tsx
import { useSubscription } from '@OuroC/react-sdk'

function MyComponent() {
  const {
    subscriptions,
    create,
    pause,
    resume,
    cancel,
    loading,
    error
  } = useSubscription()

  const handleCreate = async () => {
    const id = await create({
      solana_receiver: 'YourAddress123',
      payment_amount: BigInt(100_000_000), // 0.1 SOL
      interval_seconds: BigInt(30 * 24 * 60 * 60), // 30 days
      metadata: 'Premium subscription'
    })
    console.log('Created:', id)
  }

  return (
    <div>
      {subscriptions.map(sub => (
        <div key={sub.id}>
          <h3>{sub.id}</h3>
          <button onClick={() => pause(sub.id)}>Pause</button>
          <button onClick={() => cancel(sub.id)}>Cancel</button>
        </div>
      ))}
    </div>
  )
}
```

### useOuroC

Access the core OuroC context:

```tsx
import { useOuroC } from '@OuroC/react-sdk'

function WalletStatus() {
  const {
    isConnected,
    publicKey,
    connect,
    disconnect,
    canisterId,
    network
  } = useOuroC()

  return (
    <div>
      {isConnected ? (
        <div>
          <p>Connected: {publicKey?.toBase58()}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button onClick={connect}>Connect Wallet</button>
      )}
    </div>
  )
}
```

## Customization

### Theme System

Customize colors, fonts, spacing, and more:

```tsx
<OuroCProvider
  theme={{
    colors: {
      primary: '#9945FF',
      secondary: '#00D18C',
      background: '#ffffff',
      text: '#212529'
    },
    fonts: {
      primary: 'Inter, sans-serif',
      monospace: 'JetBrains Mono, monospace'
    },
    spacing: {
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem'
    }
  }}
>
```

### Custom Styling

Override CSS variables or use CSS-in-JS:

```css
:root {
  --OuroC-primary: #your-brand-color;
  --OuroC-border-radius-md: 12px;
}
```

### Event Callbacks

React to subscription events:

```tsx
<OuroCProvider
  onSubscriptionCreate={(subscription) => {
    // Track analytics
    analytics.track('subscription_created', {
      plan: subscription.metadata,
      amount: subscription.payment_amount
    })
  }}
  onPaymentSuccess={(hash) => {
    // Show success message
    toast.success(`Payment successful! ${hash}`)
  }}
  onError={(error, context) => {
    // Send to error tracking
    sentry.captureException(error, { tags: { context } })
  }}
>
```

## Notifications

Configure smart notifications for balance monitoring:

```tsx
import { useEffect } from 'react'
import { useOuroC } from '@OuroC/react-sdk'

function SetupNotifications() {
  const { client } = useOuroC()

  useEffect(() => {
    // Configure notifications for a subscription
    client.setNotificationConfig('subscription-id', {
      payer_channels: [
        { Email: 'user@example.com' },
        { Discord: 'webhook-url' }
      ],
      dapp_channels: [
        { Webhook: 'https://mydapp.com/notify' }
      ],
      reminder_days: [7, 3, 1], // Remind 7, 3, 1 days before payment
      enabled: true
    })
  }, [])

  return null
}
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```tsx
import type {
  Subscription,
  CreateSubscriptionRequest,
  NotificationConfig,
  OuroCTheme
} from '@OuroC/react-sdk'

const subscription: Subscription = {
  id: 'sub_123',
  solana_payer: '...',
  solana_receiver: '...',
  payment_amount: BigInt(100_000_000),
  interval_seconds: BigInt(2592000),
  next_payment: BigInt(Date.now() * 1_000_000),
  is_active: true,
  created_at: BigInt(Date.now() * 1_000_000)
}
```

## Examples

Check out the `/examples` folder for complete integration examples:

- **Next.js Integration** - Full-featured subscription page with wallet integration
- **Basic React** - Simple integration examples with custom UI

## Requirements

- React 16.8+ (hooks support)
- Solana wallet adapter (for wallet connectivity)
- A deployed OuroC canister on Internet Computer

## License

MIT License - see LICENSE file for details.

## Support

- 📖 [Documentation](https://docs.OuroC.com)
- 🐛 [Issues](https://github.com/OuroC/OuroC/issues)
- 💬 [Discord](https://discord.gg/OuroC)
- 🐦 [Twitter](https://twitter.com/OuroC)

---

**Made with ❤️ by the OuroC team**