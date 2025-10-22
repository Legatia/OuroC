# OuroC SDK User Manual

**Complete guide for developers implementing OuroC subscription infrastructure**

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Community Tier Setup](#community-tier-setup)
3. [Integration Patterns](#integration-patterns)
4. [Component Reference](#component-reference)
5. [Utility Functions](#utility-functions)
6. [Network Configuration](#network-configuration)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

## 🚀 Quick Start

### Installation

```bash
npm install @ouroc/sdk
```

### 5-Minute Setup

```tsx
import { OuroCProvider, SubscriptionCard, useSubscription } from '@ouroc/sdk'

function App() {
  return (
    <OuroCProvider network="devnet">
      <SubscriptionCard
        planName="Pro"
        price={29000000} // 0.029 SOL in lamports
        interval="monthly"
        features={["AI Features", "Priority Support"]}
        onSubscribe={handleSubscribe}
      />
    </OuroCProvider>
  )
}
```

## 🏗️ Community Tier Setup

The Community Tier is designed for rapid integration with just 7 configuration inputs:

### Required Inputs

1. **Solana Program ID** - Your program that needs subscriptions
2. **Charging Frequency** - Available billing intervals
3. **Tier Descriptions** - Feature sets for each plan
4. **Token Amounts** - Pricing per tier/frequency
5. **Merchant Address** - Your receiving wallet
6. **Network** - devnet or mainnet
7. **API Key** - Backend authentication

### Complete Configuration Example

```tsx
import {
  getCommunityCanisterId,
  createSubscriptionRequest,
  getIntervalSeconds,
  utilsToMicroUnits,
  getTokenMint
} from '@ouroc/sdk'

// Step 1: Define your subscription configuration
const subscriptionConfig = {
  // 1. Your Solana program ID
  solanaProgramId: "YourProgramAddress123...",

  // 2. Available charging frequencies
  intervals: ["monthly", "yearly"],

  // 3. Tier descriptions with features
  tiers: {
    Basic: {
      name: "Basic",
      features: [
        "Core API access",
        "Email support",
        "Basic analytics"
      ]
    },
    Pro: {
      name: "Professional",
      features: [
        "All Basic features",
        "AI-powered features",
        "Priority support",
        "Advanced analytics"
      ]
    },
    Enterprise: {
      name: "Enterprise",
      features: [
        "All Pro features",
        "Dedicated support",
        "Custom integrations",
        "SLA guarantee"
      ]
    }
  },

  // 4. Token amounts per tier (in whole tokens)
  pricing: {
    Basic: { monthly: 10, yearly: 100 },    // $10/month, $100/year
    Pro: { monthly: 29, yearly: 290 },      // $29/month, $290/year
    Enterprise: { monthly: 99, yearly: 990 } // $99/month, $990/year
  },

  // 5. Your merchant receiving address
  merchantAddress: "YourMerchantAddress123...",

  // 6. Network configuration
  network: "devnet", // Use "mainnet" for production

  // 7. API key for backend services
  apiKey: "your-api-key-here"
}

// Step 2: Create subscription request helper
function createSubscriptionRequest(plan, interval) {
  return {
    subscription_id: generateSubscriptionId(plan.name.toLowerCase()),
    solana_contract_address: subscriptionConfig.solanaProgramId,
    subscriber_address: "", // Will be filled from connected wallet
    merchant_address: subscriptionConfig.merchantAddress,
    payment_token_mint: getTokenMint('USDC', subscriptionConfig.network),
    amount: utilsToMicroUnits(plan.price),
    interval_seconds: BigInt(getIntervalSeconds(interval)),
    reminder_days_before_payment: 3,
    api_key: subscriptionConfig.apiKey
  }
}

// Step 3: Handle subscription creation
async function handleSubscribe(plan, interval) {
  try {
    const subscriptionRequest = createSubscriptionRequest(plan, interval)

    // In a real app, this would be sent to your backend
    console.log('Creating subscription:', subscriptionRequest)

    // For demo purposes, simulate successful creation
    const subscriptionId = subscriptionRequest.subscription_id
    console.log('✅ Subscription created:', subscriptionId)

    // Grant user access, update UI, etc.
    return subscriptionId
  } catch (error) {
    console.error('❌ Subscription failed:', error)
    throw error
  }
}
```

### React Implementation

```tsx
import React, { useState } from 'react'
import { OuroCProvider, SubscriptionCard, useSubscription } from '@ouroc/sdk'

function PricingPage() {
  const [loading, setLoading] = useState(false)

  return (
    <OuroCProvider network="devnet">
      <div className="pricing-container">
        <SubscriptionCard
          planName="Basic"
          price={10000000} // $10 in lamports
          interval="monthly"
          features={subscriptionConfig.tiers.Basic.features}
          onSubscribe={async () => {
            setLoading(true)
            try {
              await handleSubscribe(
                {
                  name: "Basic",
                  price: 10
                },
                "monthly"
              )
            } finally {
              setLoading(false)
            }
          }}
          disabled={loading}
        />

        <SubscriptionCard
          planName="Pro"
          price={29000000} // $29 in lamports
          interval="monthly"
          features={subscriptionConfig.tiers.Pro.features}
          popular={true}
          onSubscribe={async () => {
            setLoading(true)
            try {
              await handleSubscribe(
                {
                  name: "Pro",
                  price: 29
                },
                "monthly"
              )
            } finally {
              setLoading(false)
            }
          }}
          disabled={loading}
        />

        <SubscriptionCard
          planName="Enterprise"
          price={99000000} // $99 in lamports
          interval="monthly"
          features={subscriptionConfig.tiers.Enterprise.features}
          onSubscribe={async () => {
            setLoading(true)
            try {
              await handleSubscribe(
                {
                  name: "Enterprise",
                  price: 99
                },
                "monthly"
              )
            } finally {
              setLoading(false)
            }
          }}
          disabled={loading}
        />
      </div>
    </OuroCProvider>
  )
}
```

## 🔧 Integration Patterns

### Pattern 1: Direct Client (Simplest)

Perfect for CLI tools, Node.js apps, or minimal setups:

```tsx
import { OuroCClient } from '@ouroc/sdk'
import { getCommunityCanisterId } from '@ouroc/sdk'

const client = new OuroCClient(
  getCommunityCanisterId('devnet'),
  'devnet'
)

// Direct subscription creation
const subscriptionId = await client.createSubscription({
  subscription_id: "unique-subscription-id",
  solana_contract_address: "your-program-address",
  subscriber_address: "user-wallet-address",
  merchant_address: "your-merchant-address",
  payment_token_mint: "USDC-mint-address",
  amount: 29000000n, // 29 USDC in micro-units
  interval_seconds: 2592000n, // 30 days
  api_key: "your-api-key"
})
```

### Pattern 2: React Provider (Full-Featured)

Best for React apps with UI components:

```tsx
import { OuroCProvider, SubscriptionCard, useSubscription } from '@ouroc/sdk'

function App() {
  return (
    <OuroCProvider network="devnet">
      <YourSubscriptionComponents />
    </OuroCProvider>
  )
}

function SubscriptionManager() {
  const {
    createSubscription,
    pauseSubscription,
    cancelSubscription,
    resumeSubscription,
    loading,
    error,
    subscriptions
  } = useSubscription()

  const handlePause = async (subscriptionId: string) => {
    await pauseSubscription(subscriptionId)
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

### Pattern 3: Community Tier Helper Functions

Use utility functions for streamlined setup:

```tsx
import {
  createSubscriptionRequest,
  getIntervalSeconds,
  utilsToMicroUnits,
  generateSubscriptionId,
  getTokenMint
} from '@ouroc/sdk'

function createProSubscription() {
  const request = createSubscriptionRequest(
    {
      name: "Pro",
      price: 29,
      token: "USDC",
      interval: "monthly",
      features: ["AI features", "Priority support"]
    },
    {
      solanaContractAddress: "your-program",
      merchantAddress: "your-wallet",
      network: "devnet",
      reminderDays: 3
    }
  )

  return request
}
```

## 📋 Component Reference

### SubscriptionCard

Complete pricing card with payment flow:

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
  disabled={false} // Disable button
  onSubscribe={async (plan) => {
    // Handle subscription creation
    console.log('Subscribing to:', plan)
  }}
/>
```

**Props:**
- `planName` (string): Plan display name
- `price` (number): Price in lamports
- `interval` (string): Billing interval ("daily", "weekly", "monthly", "yearly")
- `features` (string[]): Array of features
- `popular?` (boolean): Highlight as recommended
- `disabled?` (boolean): Disable interaction
- `onSubscribe` (function): Subscription handler

### OuroCProvider

Root provider for React context:

```tsx
<OuroCProvider
  network="devnet"
  rpcUrl="https://api.devnet.solana.com"
>
  <YourApp />
</OuroCProvider>
```

**Props:**
- `network` (string): "devnet" or "mainnet"
- `rpcUrl?` (string): Custom Solana RPC endpoint
- `children` (ReactNode): Child components

## 🔧 Utility Functions

### Network Configuration

```tsx
import {
  getCommunityCanisterId,
  getLicenseRegistryCanisterId,
  getSolanaEndpoint,
  getICPHost,
  getTokenMint
} from '@ouroc/sdk'

// Get timer canister ID
const timerCanister = getCommunityCanisterId('devnet') // "7tbxr-naaaa-aaaao-qkrca-cai"

// Get license registry ID
const licenseRegistry = getLicenseRegistryCanisterId() // "gbuo5-iyaaa-aaaao-qkuba-cai"

// Get Solana RPC endpoint
const rpcUrl = getSolanaEndpoint('devnet') // "https://api.devnet.solana.com"

// Get ICP host
const icpHost = getICPHost('devnet') // "https://ic0.app"

// Get token mint addresses
const usdcMint = getTokenMint('USDC', 'devnet') // "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
```

### Token Conversions

```tsx
import {
  utilsToMicroUnits,
  utilsFromMicroUnits,
  utilsFormatTokenAmount,
  getIntervalSeconds
} from '@ouroc/sdk'

// Convert whole tokens to micro-units
const microAmount = utilsToMicroUnits(29) // 29000000

// Convert micro-units back to whole tokens
const wholeAmount = utilsFromMicroUnits(29000000n) // 29.0

// Format for display
const formatted = utilsFormatTokenAmount(29000000n, 'USDC') // "29.000000 USDC"

// Convert interval to seconds
const seconds = getIntervalSeconds('monthly') // 2592000
const customSeconds = getIntervalSeconds('custom', 86400) // 86400
```

### Subscription Helpers

```tsx
import {
  generateSubscriptionId,
  createSubscriptionRequest,
  isValidSolanaAddress
} from '@ouroc/sdk'

// Generate unique subscription ID
const subId = generateSubscriptionId('pro') // "pro_1640995200000_abc123def"

// Create complete subscription request
const request = createSubscriptionRequest(
  { name: "Pro", price: 29, token: "USDC", interval: "monthly", features: [] },
  { solanaContractAddress: "abc...", merchantAddress: "def...", network: "devnet" }
)

// Validate Solana address
const isValid = isValidSolanaAddress("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU") // true
```

## 🌐 Network Configuration

### Development (Devnet)

```tsx
<OuroCProvider network="devnet">
  {/* Components */}
</OuroCProvider>
```

**Devnet Configuration:**
- **Timer Canister**: `7tbxr-naaaa-aaaao-qkrca-cai`
- **USDC Mint**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- **RPC**: `https://api.devnet.solana.com`
- **USDT**: Not available on devnet
- **PYUSD**: Not available on devnet
- **DAI**: Not available on devnet

### Production (Mainnet)

```tsx
<OuroCProvider network="mainnet">
  {/* Components */}
</OuroCProvider>
```

**Mainnet Configuration:**
- **Timer Canister**: Coming soon (placeholder deployed)
- **USDC Mint**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **USDT Mint**: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`
- **PYUSD Mint**: `2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo`
- **DAI Mint**: `EjmyN6qEC1Tf1JxiG1ae7UTJhUxSwk1TCWNWqxWV4J6o`
- **RPC**: `https://api.mainnet-beta.solana.com`

### Custom RPC

```tsx
<OuroCProvider
  network="mainnet"
  rpcUrl="https://your-custom-rpc.com"
>
  {/* Components */}
</OuroCProvider>
```

## 🔔 useSubscription Hook

Complete subscription management:

```tsx
import { useSubscription } from '@ouroc/sdk'

function SubscriptionManager() {
  const {
    subscriptions,           // Array of active subscriptions
    createSubscription,     // Create new subscription
    pauseSubscription,       // Pause existing subscription
    cancelSubscription,      // Cancel subscription
    resumeSubscription,      // Resume paused subscription
    loading,               // Loading state
    error                  // Error state
  } = useSubscription()

  const handleCreate = async () => {
    try {
      const subscriptionId = await createSubscription({
        subscription_id: generateSubscriptionId('test'),
        solana_contract_address: "your-program",
        subscriber_address: "user-wallet",
        merchant_address: "your-wallet",
        payment_token_mint: getTokenMint('USDC', 'devnet'),
        amount: 29000000n,
        interval_seconds: BigInt(getIntervalSeconds('monthly')),
        api_key: "your-api-key"
      })

      console.log('✅ Subscription created:', subscriptionId)
    } catch (error) {
      console.error('❌ Creation failed:', error)
    }
  }

  const handlePause = async (subscriptionId: string) => {
    try {
      await pauseSubscription(subscriptionId)
      console.log('✅ Subscription paused')
    } catch (error) {
      console.error('❌ Pause failed:', error)
    }
  }

  return (
    <div>
      <button onClick={handleCreate} disabled={loading}>
        Create Subscription
      </button>

      {subscriptions.map(sub => (
        <div key={sub.id}>
          <h3>{sub.plan_name}</h3>
          <p>Status: {sub.is_active ? 'Active' : 'Inactive'}</p>
          <button onClick={() => handlePause(sub.id)}>Pause</button>
          <button onClick={() => handleCancel(sub.id)}>Cancel</button>
        </div>
      ))}

      {error && <div>Error: {error.message}</div>}
    </div>
  )
}
```

## 🔧 Advanced Configuration

### Custom Intervals

```tsx
// Define custom billing intervals
const customIntervals = {
  weekly: 7 * 24 * 60 * 60,      // 604800 seconds
  biweekly: 14 * 24 * 60 * 60,   // 1209600 seconds
  quarterly: 90 * 24 * 60 * 60   // 7776000 seconds
}

const seconds = getIntervalSeconds('custom', customIntervals.weekly)
```

### Multiple Tokens

```tsx
// Support multiple stablecoins
const tokenConfig = {
  USDC: { mint: getTokenMint('USDC', 'devnet'), symbol: 'USDC' },
  USDT: { mint: getTokenMint('USDT', 'mainnet'), symbol: 'USDT' },
  PYUSD: { mint: getTokenMint('PYUSD', 'mainnet'), symbol: 'PYUSD' },
  DAI: { mint: getTokenMint('DAI', 'mainnet'), symbol: 'DAI' }
}

function handleTokenSelection(tokenType: string) {
  const config = tokenConfig[tokenType]
  if (!config) throw new Error(`Unsupported token: ${tokenType}`)

  return config
}
```

## 🚨 Troubleshooting

### Common Issues

#### 1. "Amount validation errors"
**Problem**: Using whole dollars instead of lamports
**Solution**: Convert to lamports using `utilsToMicroUnits()`

```tsx
// ❌ Wrong
<SubscriptionCard price={29} />

// ✅ Correct
<SubscriptionCard price={utilsToMicroUnits(29)} />
```

#### 2. "Missing required subscription parameters"
**Problem**: Incomplete `createSubscription` call
**Solution**: Include all required fields

```tsx
// ✅ Complete implementation
await createSubscription({
  subscription_id: "required-id",
  solana_contract_address: "required-address",
  subscriber_address: "user-wallet",
  merchant_address: "merchant-wallet",
  payment_token_mint: "token-mint",
  amount: 29000000n,
  interval_seconds: 2592000n,
  api_key: "your-api-key"
})
```

#### 3. "Network not supported"
**Problem**: Using unsupported token on devnet
**Solution**: Use supported tokens

```tsx
// ✅ USDC works on devnet
const usdcMint = getTokenMint('USDC', 'devnet')

// ❌ USDT doesn't work on devnet
const usdtMint = getTokenMint('USDT', 'devnet') // Returns null
```

#### 4. "Wallet connection issues"
**Problem**: Wallet not connected before creating subscription
**Solution**: Check connection status

```tsx
import { useOuroC } from '@ouroc/sdk'

function SubscriptionComponent() {
  const { isConnected } = useOuroC()

  if (!isConnected) {
    return <div>Please connect your wallet first</div>
  }

  return <SubscriptionCard {...props} />
}
```

### Error Messages Reference

| Error | Cause | Solution |
|-------|--------|----------|
| "Amount must be a valid number" | Invalid price value | Use `utilsToMicroUnits()` |
| "Token mint not found" | Unsupported token/network combo | Check token availability |
| "Subscription already exists" | Duplicate subscription ID | Generate unique ID |
| "Insufficient balance" | Not enough tokens | Check user balance |

## ✅ Best Practices

### 1. Always Use Lamports

```tsx
// ✅ Always convert to lamports
price={utilsToMicroUnits(29)} // 29000000

// ❌ Never use whole dollars
price={29} // Will fail validation
```

### 2. Generate Unique IDs

```tsx
// ✅ Use unique ID generator
subscription_id: generateSubscriptionId('pro')

// ❌ Don't use hardcoded IDs
subscription_id: "sub-123" // May conflict
```

### 3. Handle Loading States

```tsx
const { loading, error } = useSubscription()

if (loading) return <div>Creating subscription...</div>
if (error) return <div>Error: {error.message}</div>
```

### 4. Network-Specific Configuration

```tsx
// ✅ Check token availability before using
const tokenMint = getTokenMint('USDT', network)
if (!tokenMint) {
  throw new Error('USDT not available on this network')
}
```

### 5. Error Handling

```tsx
try {
  const subscriptionId = await createSubscription(request)
  console.log('✅ Success:', subscriptionId)
} catch (error) {
  console.error('❌ Failed:', error.message)
  // Show user-friendly error message
  setError(`Failed to create subscription: ${error.message}`)
}
```

### 6. Validate Inputs

```tsx
import { isValidSolanaAddress } from '@ouroc/sdk'

function validateAddress(address: string) {
  if (!isValidSolanaAddress(address)) {
    throw new Error('Invalid Solana address')
  }
  return address
}
```

## 📚 Additional Resources

- [API Reference](./API_REFERENCE.md) - Detailed API documentation
- [Examples](../examples/) - Complete integration examples
- [AI Agent Integration](./AI_AGENT_INTEGRATION.md) - Guide for AI coding agents

## 🆘 Support

- 📖 [Documentation](https://docs.ouroc.com)
- 🐛 [Issues](https://github.com/ouroc/ouroc/issues)
- 💬 [Discord](https://discord.gg/ouroc)
- 🐦 [Twitter](https://twitter.com/ouroc)

---

**Last Updated**: 2025-10-22
**Version**: OuroC SDK v1.0.0+