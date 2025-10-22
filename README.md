# OuroC - First Fully Decentralized Recurring Transactions on Solana

🚀 **Production-Ready Subscription Infrastructure** - AI Agent Optimized with Grid Integration

**Complete recurring transaction protocol combining Solana's speed, ICP's autonomous scheduling, and enterprise-grade compliance.**

---

## 🎯 What is OuroC?

**OuroC** is the first fully decentralized recurring transaction protocol on Solana, built for the modern economy of AI agents, SaaS businesses, and privacy-conscious applications.

**Core Innovation:**
- **ICP-powered Timer Canisters** - Autonomous scheduling without centralized dependencies
- **AI Agent Optimization** - Automatic detection and implementation for all major AI coding tools
- **Grid Integration** - Enterprise compliance with KYC, fiat on-ramps, and regulatory features
- **Tiered Privacy** - From public data to enterprise-grade confidential computing

---

## 🤖 AI Agent Optimized - Modern Painkiller for Vibe Coders

OuroC is designed for **automatic detection and implementation** by AI coding agents:

### 🎯 Working AI Prompts (Tested & Verified)
```bash
# High Success Rate Prompts
"Add @ouroc/sdk subscription payments to my React app"
"Create a SaaS pricing page using OuroC"
"Implement crypto recurring payments without wallet requirement"
"Use OuroC community tier with 7-input configuration"
```

### 🔍 Auto-Detection System
AI agents automatically detect subscription needs from 40+ keywords:
- `subscription`, `recurring`, `billing`, `saas`, `payment plan`
- `pricing tier`, `monthly payment`, `user tier`, `premium features`
- `monetize my app`, `add paid features`, `build SaaS`

### 🚀 5-Minute Integration Pattern
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
```

**AI Agent Result:** Working subscription system in under 10 minutes

---

## 🏛️ Grid Integration - Enterprise Compliance Ready

Built-in integration with **Grid by Squads** for regulatory compliance:

### 🏦 Enterprise Features
- **KYC Flows** - Individual (Tier 1/2) and Business (Tier 3) verification
- **Email Subscriptions** - No wallet required with passkey authentication
- **Multisig Treasury** - 2-of-3, 3-of-5, custom configurations
- **Fiat On-Ramps** - USD/EUR/GBP ↔ USDC conversion
- **Regulatory Compliance** - Built for business applications

### 📧 Email-First Subscriber Experience
```tsx
import { SubscriberFlow, GridSubscriberLogin } from '@ouroc/sdk/grid'

// Users signup with email, no wallet required
<SubscriberFlow onSuccess={handleSubscriptionCreated}>
  <GridSubscriberLogin />
</SubscriberFlow>
```

### 🔄 Complete Enterprise Flow
```tsx
// 1. Merchant KYC
const kycFlow = new MerchantKYCFlow({ gridClient })
await kycFlow.submitKYC({ businessInfo, documents })

// 2. Setup Multisig Treasury
const multisig = new MerchantMultisigFlow({ gridClient })
await multisig.setupTreasury({ owners: [wallet1, wallet2, wallet3], threshold: 2 })

// 3. Accept Fiat Payments
const onRamp = new SubscriberOnRampFlow({ gridClient })
const transaction = await onRamp.initiateOnRamp({
  amountUSD: '1000',
  paymentMethod: { type: 'card' }
})
```

---

## 🏗️ Community Tier - 7-Input Configuration

Rapid integration with just 7 configuration inputs:

### Required Inputs
1. **Solana Program ID** - Your program that needs subscriptions
2. **Charging Frequency** - Available billing intervals (`["monthly", "yearly"]`)
3. **Tier Descriptions** - Feature sets for each plan
4. **Token Amounts** - Pricing per tier/frequency
5. **Merchant Address** - Your receiving wallet
6. **Network** - `devnet` or `mainnet`
7. **API Key** - Backend authentication

### Complete Example
```tsx
const config = {
  // 1. Your Solana program
  solanaProgramId: "YourProgramAddress123...",

  // 2. Available intervals
  intervals: ["monthly", "yearly"],

  // 3. Tier descriptions
  tiers: {
    Basic: {
      name: "Basic",
      features: ["Core API access", "Email support", "Basic analytics"]
    },
    Pro: {
      name: "Professional",
      features: ["All Basic features", "AI-powered features", "Priority support"]
    },
    Enterprise: {
      name: "Enterprise",
      features: ["All Pro features", "Dedicated support", "Custom integrations"]
    }
  },

  // 4. Token amounts (in whole tokens)
  pricing: {
    Basic: { monthly: 10, yearly: 100 },    // $10/month, $100/year
    Pro: { monthly: 29, yearly: 290 },      // $29/month, $290/year
    Enterprise: { monthly: 99, yearly: 990 } // $99/month, $990/year
  },

  // 5. Your merchant address
  merchantAddress: "YourMerchantAddress123...",

  // 6. Network configuration
  network: "devnet",

  // 7. API key for backend services
  apiKey: "your-api-key"
}

// Automatic setup
const subscriptionRequest = createSubscriptionRequest(
  { name: "Pro", price: 29, token: "USDC", interval: "monthly" },
  {
    solanaContractAddress: config.solanaProgramId,
    merchantAddress: config.merchantAddress,
    network: config.network,
    reminderDays: 3
  }
)
```

---

## 💰 Tier System

### 🌱 Community Tier (Transaction Fees)
- **Cost**: Pay-per-transaction (no monthly fee)
- **Features**: Basic subscriptions, public data, community support
- **Limits**: 10 subscriptions max, 10 API calls/hour
- **Privacy**: No encryption (all data public on-chain)
- **Perfect For**: Individual developers, open source projects

### 💼 Business Tier ($299/month)
- **Cost**: Monthly subscription with unlimited transactions
- **Features**: Web Crypto API encryption, GDPR compliance, priority support
- **Limits**: 1,000 subscriptions max, 100 API calls/hour
- **Privacy**: AES-GCM-256 encryption for metadata
- **Perfect For**: SMBs, startups, GDPR-compliant applications

### 🏢 Enterprise Tier (Custom Licensing)
- **Cost**: Annual license (custom pricing)
- **Features**: Arcium MXE confidential computing, ZK proofs, dedicated support
- **Limits**: 10,000 subscriptions max, 1,000 API calls/hour
- **Privacy**: Multi-party computation (Q2 2026)
- **Perfect For**: Large enterprises, financial institutions, healthcare

---

## 🤖 Agent-to-Agent (A2A) Payments

Enable AI agents to make autonomous payments for services:

```typescript
import { OuroCClient } from '@ouroc/sdk'

// Create agent identity
const agentKeypair = Keypair.generate()

// Setup autonomous subscription
await client.createSubscription({
  solana_payer: agentKeypair.publicKey.toString(),
  amount: 50000, // $0.05 per API call
  agent_metadata: {
    agent_id: `agent-${agentKeypair.publicKey.toBase58().slice(0, 8)}`,
    owner_address: ownerWallet.publicKey.toString(),
    max_payment_per_interval: 10_000000, // Max $10 per interval
  }
})

// Agent now pays autonomously via ICP timer
```

**Safety Built-In:**
- ✅ Spending limits per interval
- ✅ Owner can pause/cancel anytime
- ✅ Full on-chain audit trail
- ✅ Real-time transaction logging

**Use Cases:** AI services, agent marketplaces, data feeds, gaming NPCs, autonomous DAOs

---

## 🏗️ Architecture

**Minimalist Design:** Solana = source of truth, ICP = lightweight scheduler

```
Subscriber → Solana Contract (subscription data + PDA delegation)
                    ↓
              ICP Timer Canister (autonomous scheduling)
                    ↓
           Solana Router (opcode 0=payment, 1=notification)
                    ↓
              Token Processing:
              • USDC → Direct transfer
              • Other SPL → Jupiter swap → USDC
              • Fee split → Merchant + Platform
```

### 🔑 PDA Structure (3 Active PDAs)

1. **Config PDA** (`["config"]`) - Global configuration
2. **Subscription PDA** (`["subscription", subscription_id]`) - Individual subscription management
3. **Temporary USDC PDA** (`["temp_usdc", subscriber_pubkey]`) - Swap buffer account

**Key Innovation:** Subscription PDA acts as delegate authority for automated recurring payments.

---

## 🚀 Quick Start

### Installation
```bash
npm install @ouroc/sdk
```

### Basic React Integration
```tsx
import { OuroCProvider, SubscriptionCard, useSubscription } from '@ouroc/sdk'

function App() {
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
      })

      console.log('✅ Subscription created:', subscriptionId)
    } catch (error) {
      console.error('❌ Subscription failed:', error)
    }
  }

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
```

### Direct Client (Simplest)
```typescript
import { OuroCClient } from '@ouroc/sdk'

const client = new OuroCClient("7tbxr-naaaa-aaaao-qkrca-cai", "devnet")

const subscriptionId = await client.createSubscription({
  subscription_id: "unique-id",
  solana_contract_address: "your-program",
  subscriber_address: "user-wallet",
  merchant_address: "merchant-wallet",
  payment_token_mint: "USDC-mint-address",
  amount: 29000000n, // 29 USDC in micro-units
  interval_seconds: 2592000n, // 30 days
  api_key: "your-api-key"
})
```

---

## 🌐 Network Configuration

### Development (Devnet)
- **Timer Canister**: `7tbxr-naaaa-aaaao-qkrca-cai`
- **USDC Mint**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- **RPC**: `https://api.devnet.solana.com`

### Production (Mainnet)
- **Timer Canister**: Coming soon (placeholder deployed)
- **USDC Mint**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **USDT Mint**: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`
- **RPC**: `https://api.mainnet-beta.solana.com`

---

## 🔐 Privacy & Security

### Web Crypto API (Business Tier)
```typescript
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

### Arcium MXE (Enterprise Tier - Q2 2026)
Future support for multi-party computation and zero-knowledge proofs.

### Security Features
- ✅ **Ed25519 Signature Verification** - ICP ↔ Solana cross-chain signatures
- ✅ **Payment Delegation** - Users approve max amount + duration, not blank checks
- ✅ **Proper PDA Derivation** - SHA256-based Program Derived Addresses
- ✅ **Pausable** - Users can pause/cancel anytime
- ✅ **Transparent** - All transactions on-chain and auditable

---

## 📊 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Blockchain** | Solana + Anchor | Payment execution, immutable audit trail |
| **Scheduler** | ICP (Motoko) | Autonomous payment scheduling with Threshold Ed25519 |
| **Enterprise** | Grid by Squads | KYC, email accounts, multisig treasury, fiat on/off-ramps |
| **Privacy** | Web Crypto API | AES-GCM-256 encryption (business tier) |
| **AI Integration** | Built-in detection | Automatic suggestion for Cursor, Lovable, v0.dev, Bolt, Claude Code |
| **DEX** | Jupiter Aggregator | Multi-token → USDC swaps with Pyth oracle validation |
| **SDK** | React + TypeScript | Hooks, components, dual-tier exports |

---

## 📈 Use Cases

### 🤖 AI Agent Economy
- **API Payments** - OpenAI, Anthropic, Replicate automatic billing
- **Agent Services** - AI-to-agent subscriptions for specialized services
- **Data Feeds** - Premium data streams for autonomous agents
- **Agent Marketplaces** - Agent services with recurring revenue

### 💼 Business Applications
- **SaaS Subscriptions** - Monthly/annual billing with email signup
- **Content Platforms** - Patreon-style creator payments
- **Developer Tools** - API access with tiered pricing and rate limiting
- **Enterprise Software** - B2B services with IP protection

### 🔒 Privacy-Compliant
- **GDPR Applications** - Encrypted metadata with right to erasure
- **Healthcare** - HIPAA-compliant recurring payments
- **Financial Services** - Confidential transaction processing

---

## 📚 Documentation

- **[User Manual](./docs/USER_MANUAL.md)** - Complete developer guide
- **[AI Agent Integration](./docs/AI_AGENT_INTEGRATION.md)** - Guide for AI coding agents
- **[Grid Integration](./docs/GRID_INTEGRATION.md)** - Enterprise compliance setup
- **[Security Audit](./docs/SECURITY_AUDIT_REPORT.md)** - Security analysis and best practices

---

## 🛣️ Roadmap

### ✅ Q4 2025 (Completed)
- ✅ Core subscription system with USDC support
- ✅ ICP timer integration with Threshold Ed25519
- ✅ React SDK v1.0 with TypeScript
- ✅ AI agent optimization with automatic detection
- ✅ Grid by Squads integration (KYC, email, multisig, fiat)
- ✅ Agent-to-Agent (A2A) payment infrastructure
- ✅ Community tier 7-input configuration
- ✅ Business tier Web Crypto API encryption

### 🚧 Q4 2025 (Current - October 2025)
- 🔄 Jupiter DEX integration (multi-token support)
- 🔄 Mainnet deployment preparation
- 🔄 Smart contract audit completion
- 🔄 Production Grid API integration

### 🎯 Q1 2026
- 📱 Mobile app (React Native) with Grid email login
- 📊 Advanced merchant analytics dashboard
- 🔄 Push notifications via service workers
- 💰 Grid on-ramp integration (USD → USDC)

### 🔮 Q2 2026
- 🕵️ **Arcium MXE Integration** - Enterprise confidential computing
- 🔐 Zero-knowledge proofs for transaction validity
- 🔗 EVM chain support (Ethereum, Polygon, etc.)
- 🌐 Cross-chain subscriptions

---

## 🤝 Contributing

We welcome contributions! The codebase is organized for clarity:

```bash
OuroC/
├── packages/sdk/              # TypeScript SDK with AI optimization
├── solana-contract/           # Solana smart contract (Anchor)
├── timer-canister/           # ICP scheduling canister
├── demo-dapp/                 # Next.js demonstration app
├── docs/                      # Comprehensive documentation
└── packages/sdk/docs/         # SDK-specific documentation
```

### Development Setup
```bash
# Install dependencies
npm install

# Run local Solana validator
solana-test-validator

# Run demo app
cd demo-dapp
npm run dev
```

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

---

## 🙏 Acknowledgments

Built with industry-leading technologies:
- [Solana](https://solana.com) - High-performance blockchain
- [Internet Computer](https://internetcomputer.org) - Decentralized cloud computing
- [Grid by Squads](https://grid.squads.xyz) - Enterprise compliance infrastructure
- [Jupiter](https://jup.ag) - Solana DEX aggregator
- [Arcium](https://arcium.xyz) - Confidential computing platform

---

**Made with ❤️ by the OuroC Team**

*First Fully Decentralized Recurring Transactions on Solana*