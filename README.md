# OuroC - First Fully Decentralized Recurring Transactions on Solana

🚀 **Production-Ready Subscription Infrastructure** - AI Agent Optimized with X.402 HTTP-Native Payments

**Complete recurring transaction protocol combining Solana's speed, ICP's autonomous scheduling, X.402 HTTP-native payments for seamless flows, and enterprise-grade compliance.**

---

## 🎯 What is OuroC?

**OuroC** is the first fully decentralized recurring transaction protocol on Solana, built for the modern economy of AI agents, SaaS businesses, and privacy-conscious applications.

### 🏛️ OuroC-Mesos: The Foundation Layer

**OuroC-Mesos** is the core infrastructure canister that powers the entire OuroC ecosystem. It serves as the autonomous scheduling engine that bridges Internet Computer Protocol (ICP) and Solana blockchain.

**What Mesos Does:**
- 🤖 **Autonomous Timer Management** - Schedules recurring subscription payments without centralized dependencies
- 🔐 **Threshold Ed25519 Signing** - Uses ICP's Schnorr signature scheme to sign Solana transactions
- 📡 **Cross-Chain Communication** - Bridges ICP timer logic with Solana smart contracts via HTTP outcalls
- ⚡ **Opcode Routing** - Processes payment (opcode 0) and notification (opcode 1) triggers
- 💾 **Subscription State Management** - Maintains subscription metadata, execution times, and failure handling
- 🔄 **Exponential Backoff** - Automatically retries failed payments with intelligent backoff strategy

**Architecture:**
```
ICP Timer Canister (OuroC-Mesos)
    ├── Subscription Manager (creates/pauses/cancels subscriptions)
    ├── Timer Module (schedules execution via ic_cdk_timers)
    ├── Threshold Ed25519 (signs payment messages with 50B cycles)
    ├── Solana RPC Client (HTTP outcalls to Solana devnet/mainnet)
    └── State Management (stable storage for upgrades)
            ↓
    Solana Smart Contract (OuroC-Prima)
        ├── Process payment (splits merchant/platform fee)
        ├── Send notification (1 day before payment for intervals > 1 day)
        └── Delegate authority (PDA pulls USDC from subscriber)
```

**Key Technical Details:**
- **Delegation Model**: Subscribers approve subscription PDA to spend USDC (1 year of payments by default)
- **Fee Calculation**: Platform takes 2% (200 basis points), merchant receives 98%
- **Signature Cost**: 50 billion cycles per Schnorr Ed25519 signature (increased from 27B for reliability)
- **Cycle Monitoring**: Built-in balance checks to prevent signing failures (minimum 100B cycles required)
- **Network Support**: Solana devnet (active) and mainnet (prepared)

**Built on OuroC-Prima**: Mesos is the first application built on top of the OuroC-Prima subscription smart contract, demonstrating how the decentralized recurring payment protocol works in production.

### 🌟 Core Innovation

- **ICP-powered Timer Canisters** - Autonomous scheduling without centralized dependencies
- **X.402 HTTP-Native Payments** - Coinbase X.402 protocol for seamless payment flows (enabled by default)
- **AI Agent Optimization** - Automatic detection and implementation for all major AI coding tools
- **Grid Integration** - Enterprise compliance with KYC, fiat on-ramps, and regulatory features
- **Tiered Privacy** - From public data to enterprise-grade confidential computing

---

## 🌐 X.402 HTTP-Native Payments - Coinbase Protocol Integration

OuroC implements the **Coinbase X.402 HTTP-native payments protocol** as the default payment method, enabling seamless payment flows using standard HTTP status codes and headers.

### 🎯 What is X.402?

**X.402** is an open standard for HTTP-native payments that uses the `402 Payment Required` status code and `X-PAYMENT` header to enable payments directly within the HTTP layer, eliminating payment friction for better user experience.

### 🔄 How X.402 Works with OuroC

**1. Payment Required Response:**
```http
HTTP/1.1 402 Payment Required
X-PAYMENT: {"x402Version":1,"scheme":"exact","network":"solana","payload":{"transaction":"base64-encoded-solana-tx"}}
```

**2. Client Payment Processing:**
```typescript
import { X402Client } from '@ouroc/sdk/x402'

// X.402 client handles 402 responses automatically
const client = new X402Client({
  facilitatorUrl: 'https://api.ouroc.network/pay',
  autoRetry: true
})

// Make request - X.402 handles payment flow automatically
const response = await client.postJson('/api/subscriptions', {
  plan: 'pro',
  interval: 'monthly'
})
```

**3. Built-in to OuroC SDK:**
- ✅ **Enabled by Default** - X.402 protocol is the primary payment method
- ✅ **Automatic Detection** - SDK detects and handles 402 responses
- ✅ **Facilitator Integration** - Built-in payment verification and settlement
- ✅ **Developer-Friendly** - No additional configuration required

### 🚀 Benefits for Developers

- **Seamless UX** - Users never leave your application for payments
- **Higher Conversion** - Reduced payment friction increases success rates
- **HTTP-Native** - Works with existing web infrastructure
- **Protocol Compliant** - Fully aligned with Coinbase X.402 specification

---

## 🤖 AI Agent Payment Delegation (Extended Use Case)

OuroC extends X.402 for AI agent payment scenarios, enabling agents to make payments on behalf of users with proper authorization.

### 🔐 Core Agent Delegation Features

**X.402 + Agent Capabilities:**
- **X.402 Payment Processing** - Primary payment method via HTTP-native protocol
- **Limited Agent Authority** - Agents only get access to specific functions
- **Time-bound Delegation** - Tokens expire automatically for security
- **Constraint Enforcement** - Limits on amounts, intervals, and scope
- **Cryptographic Validation** - Ed25519 signatures prevent forgery

**AI Agent with X.402 Integration:**
```typescript
import { X402Client } from '@ouroc/sdk/x402'

// AI agent with X.402 delegation capabilities
const agent = new X402Client({
  agentId: 'ai-assistant-pro',
  autoRetry: true,
  logLevel: 'info'
})

// User grants delegation via capability token
const capabilityToken = {
  protocol: 'x402-v1',
  issuer: 'user-wallet-address',
  agent: 'ai-assistant-pro',
  permissions: [
    {
      function: 'createSubscription',
      constraints: {
        maxAmount: 1000000000n, // Max 1000 USDC
        allowedIntervals: ['monthly', 'yearly']
      }
    }
  ],
  expiresAt: Date.now() + 86400000, // 24 hours
  signature: 'user-signature',
  nonce: 'random-nonce'
}

// Agent acts on user's behalf with X.402 payment processing
await agent.fetch('/api/subscriptions', {
  method: 'POST',
  capabilityToken,
  body: JSON.stringify({ plan: 'pro', interval: 'monthly' })
})
// X.402 automatically handles 402 responses and payment flow
```

### 🚀 5-Minute AI Integration

**For AI Coding Agents:**
```bash
# High Success Rate Prompts with X.402
"Add @ouroc/sdk with X.402 HTTP-native payments to my AI agent"
"Implement secure AI agent payments with OuroC X.402 protocol"
"Create AI subscription management with X.402 delegation"
"Build AI assistant with OuroC X.402 recurring payments"
```

**React Integration with X.402:**
```tsx
import { OuroCProvider, SubscriptionCard, X402Agent } from '@ouroc/sdk'

function App() {
  return (
    <OuroCProvider network="devnet">
      <X402Agent
        agentId="my-ai-assistant"
        capabilities={['createSubscription', 'cancelSubscription']}
        maxAmount={100000000n} // Max 100 USDC
        x402Enabled={true} // X.402 enabled by default
      >
        <SubscriptionCard
          planName="Pro"
          price={29000000} // 0.029 SOL lamports
          interval="monthly"
          features={["AI Features", "Priority Support", "X.402 Payments"]}
          onSubscribe={handleSubscribe}
        />
      </X402Agent>
    </OuroCProvider>
  )
}
```

**AI Agent Result:** Secure delegated subscription system with X.402 payments in under 10 minutes

### 🛡️ Security & Benefits

- **X.402 Protocol** - Industry-standard HTTP-native payments
- **No Private Key Exposure** - Users never share keys with agents
- **Limited Authority** - Agents can only perform specified actions
- **Automatic Expiration** - Tokens expire for enhanced security
- **Audit Trail** - All delegated actions are logged and verifiable
- **Payment Frictionless** - X.402 handles payments seamlessly in HTTP layer

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
- **Features**: Basic subscriptions, X.402 HTTP-native payments (enabled by default), public data, community support
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
# Core SDK
npm install @ouroc/sdk

# X.402 Delegation Middleware
npm install @ouroc/x402-middleware

# Enterprise Privacy (optional)
npm install @ouroc/sdk/enterprise
```

### X.402 Agent Integration (Recommended)
```typescript
import { X402Client } from '@ouroc/sdk/x402'

// Create AI agent with delegation capabilities
const agent = new X402Client({
  agentId: 'my-ai-assistant',
  autoRetry: true,
  maxRetries: 3
})

// User grants delegation with capability token
const capabilityToken = await user.grantDelegation({
  agent: 'my-ai-assistant',
  permissions: ['createSubscription', 'cancelSubscription'],
  constraints: {
    maxAmount: 100000000n, // Max 100 USDC
    allowedIntervals: ['monthly']
  },
  expiresAt: Date.now() + 86400000 // 24 hours
})

// Agent acts on behalf of user
const subscription = await agent.postJson('/api/subscriptions', {
  plan: 'pro',
  interval: 'monthly'
}, { capabilityToken })
```

### React Integration with X.402
```tsx
import { OuroCProvider, SubscriptionCard, X402Agent } from '@ouroc/sdk'

function App() {
  const [capabilityToken, setCapabilityToken] = useState(null)

  const handleGrantDelegation = async () => {
    const token = await requestDelegation({
      agentId: 'ai-assistant',
      permissions: ['createSubscription'],
      maxAmount: 100000000n
    })
    setCapabilityToken(token)
  }

  return (
    <OuroCProvider network="devnet">
      <X402Agent
        agentId="ai-assistant"
        capabilityToken={capabilityToken}
        onDelegationRequired={handleGrantDelegation}
      >
        <SubscriptionCard
          planName="Pro"
          price={29000000} // 0.029 SOL lamports
          interval="monthly"
          features={["AI Features", "Priority Support", "Secure AI Delegation"]}
          onSubscribe={handleSubscribe}
        />
      </X402Agent>
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

### Express.js Middleware with X.402
```typescript
import { createX402ExpressMiddleware } from '@ouroc/x402-middleware'
import express from 'express'

const app = express()

// Add X.402 delegation verification
const x402Middleware = createX402ExpressMiddleware({
  allowedIssuers: ['trusted-ai-agents'],
  validationEndpoint: 'https://api.ouroc.network/validate'
})

// Protect API endpoints with delegation
app.use('/api/subscriptions', x402Middleware.middleware())

app.post('/api/subscriptions', (req, res) => {
  // Request has X.402 delegation verified
  const delegation = req.x402Delegation
  console.log('Delegated action:', delegation.validation.capabilities)

  // Process subscription creation
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
| **Payments** | X.402 Protocol | Coinbase HTTP-native payments (enabled by default) |
| **AI Delegation** | X.402 Extension | Secure AI agent authorization (extended use case) |
| **Enterprise** | Grid by Squads | KYC, email accounts, multisig treasury, fiat on/off-ramps |
| **Privacy** | Web Crypto API | AES-GCM-256 encryption (business tier) |
| **AI Integration** | Built-in detection | Automatic suggestion for Cursor, Lovable, v0.dev, Bolt, Claude Code |
| **DEX** | Jupiter Aggregator | Multi-token → USDC swaps with Pyth oracle validation |
| **SDK** | React + TypeScript | Hooks, components, X.402 payment support |

---

## 📈 Use Cases

### 🌐 X.402 HTTP-Native Payments
- **Seamless Web Payments** - 402 Payment Required responses with automatic payment handling
- **Higher Conversion Rates** - Reduced payment friction increases user conversion
- **HTTP-Native Integration** - Works with existing web infrastructure without redirects
- **Developer-Friendly** - No additional payment UI components required
- **Protocol Compliant** - Industry-standard Coinbase X.402 specification

### 🤖 AI Agent Payment Delegation (Extended Use Case)
- **Delegated API Payments** - AI agents pay for OpenAI, Anthropic, Replicate with user authorization
- **Autonomous Agent Services** - AI-to-agent subscriptions with secure delegation tokens
- **AI-Powered SaaS Management** - Agents manage user subscriptions with defined permissions
- **Intelligent Data Feeds** - Agents purchase and process premium data streams on behalf of users
- **Automated Resource Management** - AI handles cloud services, databases, and infrastructure payments

### 🛡️ Secure Delegation Scenarios
- **Financial AI Assistants** - Agents manage portfolios with spending limits and time constraints
- **Enterprise AI Bots** - Corporate agents operate with auditable capability tokens
- **Personal AI Managers** - Digital assistants handle routine subscriptions and payments
- **Developer AI Tools** - Coding assistants manage API keys and service subscriptions

### 💼 Business Applications
- **SaaS Subscriptions** - Monthly/annual billing with X.402 HTTP-native payments
- **Content Platforms** - Patreon-style creator payments with seamless payment flows
- **Developer Tools** - API access with tiered pricing and X.402 payment processing
- **Enterprise Software** - B2B services with X.402 integration and AI agent support

### 🔒 Privacy-Compliant
- **GDPR Applications** - Encrypted metadata with right to erasure
- **Healthcare** - HIPAA-compliant recurring payments with secure delegation
- **Financial Services** - Confidential transaction processing with audit trails

---

## 📚 Documentation

- **[User Manual](./docs/USER_MANUAL.md)** - Complete developer guide
- **[X.402 Protocol Guide](./docs/X402_PROTOCOL.md)** - Delegation protocol specification and implementation
- **[AI Agent Integration](./docs/AI_AGENT_INTEGRATION.md)** - Guide for AI coding agents with X.402
- **[Grid Integration](./docs/GRID_INTEGRATION.md)** - Enterprise compliance setup
- **[Security Audit](./docs/SECURITY_AUDIT_REPORT.md)** - Security analysis and best practices
- **[X.402 Middleware Guide](./docs/X402_MIDDLEWARE.md)** - Express.js and Next.js integration

---

## 🛣️ Roadmap

### ✅ Q4 2025 (Completed)
- ✅ Core subscription system with USDC support
- ✅ ICP timer integration with Threshold Ed25519
- ✅ React SDK v1.0 with TypeScript
- ✅ AI agent optimization with automatic detection
- ✅ **X.402 Delegation Protocol** - Secure AI agent authorization with capability tokens
- ✅ **X.402 Middleware Package** - Express.js and Next.js integration
- ✅ **X.402 Client SDK** - AI agent delegation library
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
├── packages/sdk/              # TypeScript SDK with X.402 delegation support
│   └── src/x402/             # X.402 delegation protocol implementation
├── packages/x402-middleware/   # Express.js and Next.js middleware for X.402
├── solana-contract/           # Solana smart contracts (Anchor)
│   └── ouroc_prima/          # OuroC-Prima subscription contract
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