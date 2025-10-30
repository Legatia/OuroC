# 🔌 OuroC Frontend SDK Architecture

## Overview

The OuroC SDK is a **plug-and-play npm package** that dApps can install and customize to integrate subscription functionality. No hosting required - just import, configure, and use!

## 🎯 **Package Distribution Strategy**

### **1. NPM Package Distribution**
```bash
npm install @OuroC/react-sdk
# or
yarn add @OuroC/react-sdk
```

### **2. Framework Support**
- **Primary**: React/Next.js (most Solana dApps use React)
- **Secondary**: Vue.js, Svelte adapters
- **Vanilla**: Pure JavaScript/TypeScript core

### **3. Bundle Size Optimization**
- **Tree-shakable**: Import only components you need
- **Lightweight**: <50KB gzipped core
- **Lazy loading**: Heavy components load on-demand

## 🏗️ **Architecture Layers**

```
┌─────────────────────────────────────┐
│          dApp Frontend              │
├─────────────────────────────────────┤
│       OuroC SDK Layer           │
│  ┌─────────────┬─────────────────┐  │
│  │ UI          │ Core Logic      │  │
│  │ Components  │ (Chain Calls)   │  │
│  └─────────────┴─────────────────┘  │
├─────────────────────────────────────┤
│       Solana Web3.js               │
├─────────────────────────────────────┤
│    ICP Agent-js (for OuroC)    │
└─────────────────────────────────────┘
```

## 📦 **Package Structure**

```
@OuroC/react-sdk/
├── src/
│   ├── components/          # Customizable UI components
│   │   ├── SubscriptionCard/
│   │   ├── PricingTable/
│   │   ├── PaymentModal/
│   │   ├── NotificationCenter/
│   │   └── BalanceMonitor/
│   ├── hooks/              # React hooks for state management
│   │   ├── useSubscription.ts
│   │   ├── useNotifications.ts
│   │   └── useBalance.ts
│   ├── core/               # Framework-agnostic logic
│   │   ├── OuroCClient.ts
│   │   ├── types.ts
│   │   └── utils.ts
│   ├── providers/          # Context providers
│   │   └── OuroCProvider.tsx
│   └── styles/             # Default themes
│       ├── default.css
│       └── minimal.css
├── examples/               # Integration examples
├── docs/                   # Documentation
└── package.json
```

## 🎨 **Customization Strategy**

### **1. Theme System**
```typescript
// Fully customizable themes
const theme = {
  colors: {
    primary: '#9945FF',     // Solana purple
    secondary: '#00D18C',   // Custom brand
    background: '#1a1a1a',  // Dark mode
  },
  fonts: {
    primary: 'Inter',
    monospace: 'JetBrains Mono'
  },
  spacing: { /* ... */ },
  borderRadius: { /* ... */ }
}

<OuroCProvider theme={theme}>
  <MyApp />
</OuroCProvider>
```

### **2. Component Composition**
```typescript
// dApps can use pre-built components
import { SubscriptionCard, PaymentModal } from '@OuroC/react-sdk'

// Or build completely custom UI using hooks
import { useSubscription } from '@OuroC/react-sdk'

function CustomSubscriptionUI() {
  const { create, status, balance } = useSubscription()

  return (
    <div className="my-custom-design">
      {/* Completely custom UI */}
    </div>
  )
}
```

### **3. Behavior Customization**
```typescript
const config = {
  // Custom notification preferences
  notifications: {
    channels: ['email', 'discord', 'webhook'],
    reminderDays: [7, 3, 1],
    customWebhook: 'https://mydapp.com/notify'
  },

  // Custom subscription logic
  subscriptionDefaults: {
    gracePeriodDays: 3,
    autoRetryAttempts: 3,
    minimumBalance: 1.1 // 110% of payment amount
  },

  // Custom wallet integration
  walletAdapter: myCustomWalletAdapter,

  // Custom styling hooks
  onSubscriptionCreate: (sub) => trackEvent('subscription_created'),
  onPaymentSuccess: (payment) => showToast('Payment successful!'),
  onBalanceLow: (balance) => showWarning(`Low balance: ${balance}`)
}
```

## 🔧 **Integration Examples**

### **1. Simple Integration (5 minutes)**
```typescript
// pages/_app.tsx
import { OuroCProvider } from '@OuroC/react-sdk'

export default function App({ Component, pageProps }) {
  return (
    <OuroCProvider
      canisterId="your-canister-id"
      network="mainnet"
    >
      <Component {...pageProps} />
    </OuroCProvider>
  )
}

// pages/subscription.tsx
import { SubscriptionCard } from '@OuroC/react-sdk'

export default function SubscriptionPage() {
  return (
    <div>
      <h1>Choose Your Plan</h1>
      <SubscriptionCard
        planName="Premium"
        price={0.1} // SOL
        interval="monthly"
        features={['Feature 1', 'Feature 2']}
        onSubscribe={(plan) => console.log('Subscribed:', plan)}
      />
    </div>
  )
}
```

### **2. Advanced Integration (Custom UI)**
```typescript
import {
  useOuroC,
  useSubscription,
  useNotifications
} from '@OuroC/react-sdk'

function CustomDashboard() {
  const { isConnected, connect } = useOuroC()
  const {
    subscriptions,
    create,
    pause,
    resume,
    cancel
  } = useSubscription()
  const {
    notifications,
    markAsRead,
    getUnreadCount
  } = useNotifications()

  return (
    <div className="custom-dashboard">
      {/* Completely custom UI using the hooks */}
      <div className="subscription-grid">
        {subscriptions.map(sub => (
          <CustomSubscriptionCard
            key={sub.id}
            subscription={sub}
            onPause={() => pause(sub.id)}
            onCancel={() => cancel(sub.id)}
          />
        ))}
      </div>

      <CustomNotificationCenter
        notifications={notifications}
        unreadCount={getUnreadCount()}
      />
    </div>
  )
}
```

## 🎁 **Pre-built Components Library**

### **Core Components**
1. **`<SubscriptionCard />`** - Pricing cards with subscribe buttons
2. **`<PaymentModal />`** - Wallet connection and payment flow
3. **`<SubscriptionManager />`** - Dashboard for managing subscriptions
4. **`<NotificationCenter />`** - Bell icon with notification dropdown
5. **`<BalanceMonitor />`** - Balance warnings and top-up prompts
6. **`<PricingTable />`** - Compare multiple subscription tiers

### **Specialized Components**
1. **`<SubscriptionStatus />`** - Show active/paused/cancelled status
2. **`<PaymentHistory />`** - Transaction log with Solana explorer links
3. **`<ReminderSettings />`** - Configure notification preferences
4. **`<BalanceTopup />`** - Quick SOL deposit interface
5. **`<GracePeriodTimer />`** - Countdown for failed payments

## 🚀 **Distribution Strategy**

### **1. Developer Experience**
```bash
# Quick start with create-next-app
npx create-next-app@latest my-dapp
cd my-dapp
npm install @OuroC/react-sdk

# Copy starter template
npx @OuroC/cli init
# Creates components/OuroCDemo.tsx with examples
```

### **2. Documentation Site**
- **Interactive playground**: Try components live
- **Code examples**: Copy-paste integration code
- **Theme builder**: Visual theme customizer
- **Migration guides**: From other subscription services

### **3. Template Marketplace**
```bash
# Pre-built templates for common use cases
npx @OuroC/cli create --template saas-dashboard
npx @OuroC/cli create --template nft-membership
npx @OuroC/cli create --template gaming-premium
```

## 💡 **Advanced Features**

### **1. Multi-tenant Support**
```typescript
// Support multiple subscription plans per dApp
const config = {
  plans: [
    { id: 'basic', price: 0.05, interval: 'monthly' },
    { id: 'premium', price: 0.15, interval: 'monthly' },
    { id: 'enterprise', price: 1.5, interval: 'yearly' }
  ]
}
```

### **2. Analytics Integration**
```typescript
// Built-in analytics hooks
const analytics = useOuroCAnalytics()

useEffect(() => {
  analytics.track('subscription_page_viewed')
}, [])
```

### **3. A/B Testing Support**
```typescript
// Easy A/B testing for subscription flows
<SubscriptionCard
  variant={abTestVariant} // 'original' | 'experimental'
  onConversion={(variant) => trackConversion(variant)}
/>
```

## 🔐 **Security & Best Practices**

### **1. Wallet Integration**
- **Secure**: Never store private keys
- **Compatible**: Works with all Solana wallet adapters
- **Flexible**: Support custom wallet implementations

### **2. Error Handling**
```typescript
<OuroCProvider
  onError={(error, context) => {
    // Custom error handling
    logError(error, context)
    showUserFriendlyMessage()
  }}
>
```

### **3. TypeScript First**
- **Full type safety** for all APIs
- **Auto-completion** in IDEs
- **Compile-time validation** of configurations

## 📈 **Benefits for dApps**

### **For Developers:**
✅ **5-minute integration** - Faster than building from scratch
✅ **No backend needed** - OuroC handles all subscription logic
✅ **Full customization** - Match your brand perfectly
✅ **TypeScript support** - Better DX and fewer bugs
✅ **Battle-tested** - Used by multiple dApps

### **For Users:**
✅ **Familiar UI patterns** - Consistent experience across dApps
✅ **Reliable notifications** - Never miss a payment
✅ **Easy management** - Pause/resume subscriptions anytime
✅ **Transparent pricing** - Clear SOL amounts, no hidden fees

## 🎯 **Go-to-Market Strategy**

### **1. Target dApp Categories**
- **SaaS on Solana** (analytics, development tools)
- **NFT marketplaces** (premium features)
- **Gaming platforms** (premium memberships)
- **DeFi protocols** (advanced features)
- **Content platforms** (creator subscriptions)

### **2. Integration Incentives**
- **Free tier**: First 100 subscriptions free
- **Revenue sharing**: Lower fees for early adopters
- **Co-marketing**: Joint announcements and case studies
- **Technical support**: Dedicated integration assistance

---

**The OuroC SDK makes it trivial for any Solana dApp to add subscription functionality - just like how Stripe made payments easy for web2! 🚀**