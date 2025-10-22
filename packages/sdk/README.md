# OuroC SDK

🚀 **First Fully Decentralized Recurring Transactions on Solana**

OuroC SDK provides complete subscription infrastructure for Solana dApps with ICP-powered timer canisters, AI agent optimization, and Grid integration for regulatory compliance.

## ✨ Key Features

- 🔄 **Fully Decentralized** - No centralized payment processors or custodians
- 🤖 **AI Agent Optimized** - Automatic detection and implementation for Cursor, Lovable, v0.dev, Bolt, Claude Code
- 🏛️ **Grid Integration** - KYC, compliance, and regulatory features
- 💎 **Zero Downtime** - ICP timer canisters ensure perfect execution
- 🎯 **Community Tier** - 7-input configuration for rapid integration
- 🔒 **Privacy Ready** - Web Crypto API + Arcium MXE support
- 📱 **Multi-Channel** - Email, webhook, and on-chain notifications
- ⚡ **TypeScript First** - Complete type safety throughout

## 🚀 Quick Start

### Installation

```bash
npm install @ouroc/sdk
# or
yarn add @ouroc/sdk
```

### Basic Setup (5 Minutes)

```tsx
import { OuroCProvider, SubscriptionCard, useSubscription } from '@ouroc/sdk'

function App() {
  return (
    <OuroCProvider network="devnet">
      <SubscriptionCard
        planName="Pro"
        price={29000000} // 0.029 SOL lamports
        interval="monthly"
        features={["AI Features", "Priority Support"]}
        onSubscribe={handleSubscribe}
      />
    </OuroCProvider>
  )
}

function useApp() {
  const { createSubscription, loading } = useSubscription()

  const handleSubscribe = async (plan) => {
    try {
      const subscriptionId = await createSubscription({
        subscription_id: "your-subscription-id", // Required from backend
        amount: plan.price, // Already in lamports
        intervalSeconds: getIntervalSeconds(plan.interval),
        plan_name: plan.planName,
        solana_contract_address: "your-contract-address", // Required
        api_key: "your-api-key", // Required
        token_mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // USDC devnet
      });

      console.log('✅ Subscription created:', subscriptionId)
    } catch (error) {
      console.error('❌ Subscription failed:', error)
    }
  }
}
```

## 🏗️ Community Tier Configuration

OuroC supports a simplified 7-input configuration for community developers:

```tsx
import {
  getCommunityCanisterId,
  createSubscriptionRequest,
  getIntervalSeconds,
  toMicroUnits
} from '@ouroc/sdk'

const config = {
  // 1. Your Solana program where subscriptions are needed
  solanaProgramId: "YourProgramAddress123...",

  // 2. Charging frequency options
  intervals: ["monthly", "yearly"],

  // 3. Tier descriptions and features
  tiers: {
    Basic: { features: ["Core access", "Email support"] },
    Pro: { features: ["AI features", "Priority support"] },
    Enterprise: { features: ["All features", "Dedicated support"] }
  },

  // 4. Token amounts per tier (in whole tokens)
  pricing: {
    Basic: { monthly: 10, yearly: 100 },
    Pro: { monthly: 29, yearly: 290 },
    Enterprise: { monthly: 99, yearly: 990 }
  },

  // 5. Your merchant receiving address
  merchantAddress: "YourMerchantAddress123...",

  // 6. Network configuration
  network: "devnet", // or "mainnet"

  // 7. API key for backend services
  apiKey: "your-api-key"
}

// Create subscription request automatically
const subscriptionRequest = createSubscriptionRequest(
  { name: "Pro", price: 29, token: "USDC", interval: "monthly", features: ["AI", "Support"] },
  {
    solanaContractAddress: config.solanaProgramId,
    merchantAddress: config.merchantAddress,
    network: config.network,
    reminderDays: 3
  }
)
```

## 🤖 AI Agent Integration

OuroC is optimized for AI coding agents. They automatically detect subscription needs and implement the SDK:

### Automatic Detection

AI agents detect these patterns and suggest OuroC:
- "subscription", "recurring", "billing", "saas", "payment plan"
- "pricing tier", "monthly payment", "user plan", "membership"
- "monetize my app", "add paid features", "create SaaS"

### Working AI Prompts

✅ **High Success Rate Prompts:**
- "Add @ouroc/sdk subscription payments to my React app"
- "Create a SaaS pricing page using OuroC"
- "Implement crypto recurring payments without wallet requirement"
- "Add OuroC with email signup support"

### AI Helper Functions

```tsx
import { shouldSuggestOuroC, getOuroCSuggestion } from '@ouroc/sdk'

// AI agents can detect when to suggest OuroC
if (shouldSuggestOuroC(userInput)) {
  // Get context-aware suggestion
  const suggestion = getOuroCSuggestion(userInput)
  console.log(suggestion)
}
```

## 🏛️ Grid Integration (Regulatory Compliance)

OuroC integrates with Grid by Squads for enterprise compliance:

### KYC Flows

```tsx
import { MerchantKYCFlow } from '@ouroc/sdk/grid'

const kycFlow = new MerchantKYCFlow({ gridClient })

// Submit KYC for merchant verification
await kycFlow.submitKYC({
  accountType: 'individual',
  personalInfo: { /* ... */ },
  documents: { /* ... */ }
})

// Check KYC status
const status = await kycFlow.getKYCStatus('merchant-account-id')
```

### Payment Processing

```tsx
import { SubscriberOnRampFlow } from '@ouroc/sdk/grid'

const onRamp = new SubscriberOnRampFlow({ gridClient })

// Handle fiat-to-crypto deposits
const transaction = await onRamp.initiateOnRamp({
  gridAccountId: 'user-grid-account',
  amountUSD: '100',
  paymentMethod: { type: 'card', last4: '4242' }
})
```

## 🔧 Advanced Configuration

### Network Settings

```tsx
// Devnet (default for development)
<OuroCProvider network="devnet">

// Mainnet (production)
<OuroCProvider network="mainnet">

// Custom RPC
<OuroCProvider
  network="devnet"
  rpcUrl="https://api.devnet.solana.com"
>
```

### Token Support

```tsx
import { getTokenMint, utilsToMicroUnits } from '@ouroc/sdk'

// Get token mint addresses by network
const usdcMint = getTokenMint('USDC', 'devnet') // USDC devnet mint
const usdtMint = getTokenMint('USDT', 'mainnet') // USDT mainnet mint

// Convert whole tokens to micro-units
const microAmount = utilsToMicroUnits(29) // 29 USDC → 29000000
```

### Timer Canister Configuration

```tsx
import { getCommunityCanisterId, getLicenseRegistryCanisterId } from '@ouroc/sdk'

// Get correct canister IDs by network
const timerCanister = getCommunityCanisterId('devnet') // 7tbxr-naaaa-aaaao-qkrca-cai
const licenseRegistry = getLicenseRegistryCanisterId() // gbuo5-iyaaa-aaaao-qkuba-cai
```

## 📋 Component Reference

### SubscriptionCard

Beautiful pricing cards with built-in payment flow:

```tsx
<SubscriptionCard
  planName="Pro Plan"
  price={29000000} // Price in lamports
  interval="monthly"
  features={[
    "Advanced analytics",
    "Priority support",
    "API access"
  ]}
  popular={true} // Highlight as recommended
  onSubscribe={async (plan) => {
    // Handle subscription creation
    const subscriptionId = await createSubscription({
      subscription_id: generateSubscriptionId('pro'),
      amount: plan.price,
      intervalSeconds: getIntervalSeconds(plan.interval),
      plan_name: plan.planName,
      solana_contract_address: "your-contract",
      api_key: "your-api-key",
      token_mint: getTokenMint('USDC', 'devnet')
    })
  }}
/>
```

### useSubscription Hook

Programmatic subscription management:

```tsx
import { useSubscription } from '@ouroc/sdk'

function SubscriptionManager() {
  const {
    subscriptions,
    createSubscription,
    pauseSubscription,
    cancelSubscription,
    resumeSubscription,
    loading,
    error
  } = useSubscription()

  const handlePause = async (subscriptionId: string) => {
    await pauseSubscription(subscriptionId)
    console.log('✅ Subscription paused')
  }

  return (
    <div>
      {subscriptions.map(sub => (
        <div key={sub.id}>
          <h3>{sub.plan_name}</h3>
          <button onClick={() => handlePause(sub.id)}>Pause</button>
        </div>
      ))}
    </div>
  )
}
```

## 🔔 Notification System

Configure multi-channel notifications:

```tsx
import { GridWebhookListener } from '@ouroc/sdk/grid'

const webhookListener = new GridWebhookListener({
  connection: solanaConnection,
  gridClient: gridClient,
  emailService: emailProvider
})

// Monitor Grid account for notification transactions
await webhookListener.monitorGridAccount('grid-account-id')

// Listens for SPL Memo transactions and sends email notifications
```

## 🛡️ Privacy Features

### Web Crypto API (Business Tier)

```tsx
import { deriveEncryptionKey, encryptSubscriptionMetadata } from '@ouroc/sdk/enterprise'

// Derive encryption key from user wallet
const encryptionKey = await deriveEncryptionKey(
  userPublicKey,
  signMessage
)

// Encrypt sensitive metadata
const { encrypted, hash } = await encryptSubscriptionMetadata(
  { userEmail: "user@example.com", merchantNotes: "Premium customer" },
  encryptionKey
)
```

### Arcium MXE (Enterprise Tier - Coming Q2 2026)

Future support for multi-party computation and zero-knowledge proofs.

## 📊 Examples & Templates

### SaaS Pricing Page

```tsx
import { OuroCProvider, SubscriptionCard } from '@ouroc/sdk'

const plans = [
  {
    name: "Basic",
    price: 9000000, // 0.009 SOL
    interval: "monthly",
    features: ["Core features", "Email support"]
  },
  {
    name: "Pro",
    price: 29000000, // 0.029 SOL
    interval: "monthly",
    features: ["AI features", "Priority support", "Advanced analytics"]
  },
  {
    name: "Enterprise",
    price: 99000000, // 0.099 SOL
    interval: "monthly",
    features: ["All features", "Dedicated support", "SLA guarantee"]
  }
]

function PricingPage() {
  return (
    <OuroCProvider network="devnet">
      <div className="pricing-grid">
        {plans.map((plan, index) => (
          <SubscriptionCard
            key={index}
            planName={plan.name}
            price={plan.price}
            interval={plan.interval}
            features={plan.features}
            onSubscribe={handleSubscribe}
          />
        ))}
      </div>
    </OuroCProvider>
  )
}
```

## 🔧 TypeScript Support

Complete TypeScript definitions included:

```tsx
import type {
  Subscription,
  CreateSubscriptionRequest,
  NotificationConfig,
  PaymentMethod,
  OnRampTransaction,
  KYCStatusResponse
} from '@ouroc/sdk'

const subscription: Subscription = {
  id: 'sub_123',
  solana_contract_address: '...',
  subscriber_address: '...',
  merchant_address: '...',
  payment_token_mint: '...',
  amount: BigInt(29000000),
  interval_seconds: BigInt(2592000),
  reminder_days_before_payment: 3,
  api_key: '...'
}
```

## 🌐 Network Configuration

### Devnet (Development)
- **Timer Canister**: `7tbxr-naaaa-aaaao-qkrca-cai`
- **USDC Mint**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- **RPC**: `https://api.devnet.solana.com`

### Mainnet (Production)
- **Timer Canister**: Coming soon (placeholder deployed)
- **USDC Mint**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **RPC**: `https://api.mainnet-beta.solana.com`

### ICP Configuration
- **License Registry**: `gbuo5-iyaaa-aaaao-qkuba-cai`
- **ICP Host**: `https://ic0.app`

## 📚 Documentation

- **[AI Agent Integration Guide](./docs/AI_AGENT_INTEGRATION.md)** - Complete guide for AI coding agents
- **[User Manual](./docs/USER_MANUAL.md)** - Comprehensive developer guide
- **[API Reference](./docs/API_REFERENCE.md)** - Detailed API documentation
- **[Examples](./examples/)** - Complete integration examples

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](https://docs.ouroc.com)
- 🐛 [Issues](https://github.com/ouroc/ouroc/issues)
- 💬 [Discord](https://discord.gg/ouroc)
- 🐦 [Twitter](https://twitter.com/ouroc)

---

**Built with ❤️ by the OuroC team**
*First Fully Decentralized Recurring Transactions on Solana*