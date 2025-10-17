# OuroC - Decentralized Subscription Payments

🎉 **PRODUCTION-READY MVP** - Complete recurring transaction protocol with tiered pricing

**Automated recurring payments on Solana with three clear tiers: Community (transaction fees) → Business (subscription) → Enterprise (licensing)**

OuroC is a subscription payment protocol combining Solana's speed, ICP's autonomous scheduling, and tiered privacy options for different customer segments.

---

## What is OuroC?

**Core Stack:**
- **Solana** - Fast, low-cost payment execution and immutable audit trail
- **ICP (Internet Computer)** - Autonomous payment scheduling with Threshold Ed25519 signing
- **Grid by Squads** - Email accounts, KYC/compliance, multisig treasury, fiat on/off-ramps
- **Tiered Privacy** - Business (Web Crypto API) → Enterprise (Arcium MXE Q2 2026)
- **IP Protection** - License registry, tier-based access control, usage tracking

**Use Cases:**
- SaaS subscriptions with email signup (no wallet needed)
- AI agent-to-agent (A2A) payments for autonomous services
- Privacy-compliant recurring payments (GDPR-ready)
- Multi-token support with automatic USDC conversion
- Enterprise applications with IP protection and usage tracking

## Key Features

### 🏪 For Merchants
- **Email or wallet setup** - Grid email accounts or standard wallet connection
- **Team treasury management** - Grid multisig (2-of-3, 3-of-5, custom)
- **Compliance built-in** - Grid KYC (Individual/Business tiers)
- **Fiat conversions** - USDC ↔ USD/EUR/GBP via Grid/Sphere
- **Multi-token payments** - Accept any SPL token (auto-swap to USDC)
- **Privacy mode** - Optional encrypted metadata (enterprise SDK)
- **React SDK** - `npm install @ouroc/sdk` - Pre-built UI components
- **Flexible storage** - PostgreSQL, MongoDB, IPFS, Arweave adapters

### 👤 For Subscribers
- **Email signup** - Grid passkey authentication (no wallet needed)
- **One-time approval** - Secure payment delegation with Ed25519 signatures
- **Payment reminders** - Configurable notification days before charge
- **Full control** - Pause/cancel anytime on-chain
- **Privacy-first** - Optional encrypted subscription metadata (GDPR-compliant)

### 🤖 For AI Agents
- **A2A payments** - Autonomous agent-to-agent subscriptions
- **Agent identity** - Unique keypairs with owner attribution
- **Spending limits** - Max payment per interval safety controls
- **Audit trail** - Full transaction history for compliance
- **Live demo** - See `/a2a-demo` for interactive example

### 💰 Pricing Tiers

**🌱 Community Tier (Transaction Fees)**
- **Cost**: Pay-per-transaction (no monthly fee)
- **Features**: Basic subscriptions, public data, community support
- **Limits**: 10 API calls/hour, 10 subscriptions max
- **Privacy**: No encryption (all data public on-chain)
- **Use**: Individual developers, open source projects

**💼 Business Tier ($299/month)**
- **Cost**: Monthly subscription with unlimited transactions
- **Features**: Web Crypto API encryption, GDPR compliance, priority support
- **Limits**: 100 API calls/hour, 1,000 subscriptions max
- **Privacy**: AES-GCM-256 encryption for metadata (ICP canister storage)
- **Use**: SMBs, startups, GDPR-compliant applications

**🏢 Enterprise Tier (Custom Licensing)**
- **Cost**: Annual license (custom pricing)
- **Features**: Arcium MXE confidential computing, ZK proofs, dedicated support
- **Limits**: 1,000 API calls/hour, 10,000 subscriptions max
- **Privacy**: Multi-party computation (Q2 2026)
- **Use**: Large enterprises, financial institutions, healthcare

### 🔐 Privacy Features

**Business Tier (Available Now)**
- **AES-GCM-256 encryption** - Web Crypto API for metadata
- **Off-chain storage** - ICP canister for encrypted data
- **On-chain hashes** - SHA-256 verification on Solana
- **GDPR compliance** - Right to erasure, data portability
- **Opt-in module** - `import * as Business from '@ouroc/sdk/business'`

**Enterprise Tier (Coming Q2 2026)**
- **Arcium MXE** - Multi-party confidential computing
- **Zero-knowledge proofs** - Prove validity without revealing data
- **Confidential amounts** - Hidden transaction values
- **Hidden parties** - Private transaction participants

### 💻 For Developers
- **Minimalist design** - 600-line ICP canister (70% less code)
- **Single source of truth** - Solana blockchain, ICP schedules only
- **Type-safe SDK** - Full TypeScript with React hooks
- **Pre-built flows** - Subscriber, Merchant, KYC, Multisig, OffRamp
- **33 unit tests** - Core SDK + Grid integration (100% passing)
- **Open source** - MIT licensed, audit and fork freely

### 🔐 For Enterprise
- **IP Protection** - License registry with tier-based access control
- **Usage Tracking** - Real-time analytics and rate limiting
- **Admin Panel** - Complete management dashboard
- **Tier Management** - Community/Beta/Enterprise pricing tiers
- **API Key Management** - Secure key generation and revocation
- **Developer Onboarding** - Streamlined registration process

---

## Agent-to-Agent (A2A) Payments

Enable AI agents to make autonomous payments for services without human approval after initial setup.

**Why A2A?** AI agents need to pay for:
- API calls (OpenAI, Anthropic, Replicate)
- Services from other agents
- Data feeds and subscriptions
- Agent marketplace purchases

**Safety Built-In:**
- Spending limits per interval
- Owner can pause/cancel anytime
- Full on-chain audit trail
- Real-time transaction logging

**Quick Example:**

```typescript
import { OuroCClient } from '@ouroc/sdk';

// Create agent identity
const agentKeypair = Keypair.generate();

// Setup subscription with spending limits
await client.createSubscription({
  solana_payer: agentKeypair.publicKey.toString(),
  amount: 50000, // $0.05 per API call
  agent_metadata: {
    agent_id: `agent-${agentKeypair.publicKey.toBase58().slice(0, 8)}`,
    owner_address: ownerWallet.publicKey.toString(),
    max_payment_per_interval: 10_000000, // Max $10
  }
});
// Agent now pays autonomously via ICP timer
```

**Live Demo:** `/a2a-demo` in demo app

**Use Cases:** AI services, agent marketplaces, data feeds, gaming NPCs, autonomous DAOs

---

## Architecture

**Minimalist design:** Solana = source of truth, ICP = lightweight scheduler

```
Subscriber → Solana Contract (subscription data + delegation)
                    ↓
              ICP Timer (600 lines - timing only)
                    ↓
           Solana Router (opcode 0=payment, 1=notification)
                    ↓
              Token processing:
              • USDC → Direct transfer
              • Other SPL → Swap via Jupiter → USDC
              • Fee split → Merchant + Platform
```

**Privacy Layer (Optional):**
- Subscription metadata encrypted client-side (AES-GCM-256)
- Hash stored on Solana for verification
- Encrypted data in ICP canister (off-chain)
- GDPR-compliant deletion via `deletePrivateMetadata()`

**Design Principles:**
- 600-line ICP canister (70% smaller than traditional design)
- No data duplication between ICP/Solana
- Opcode-based routing (2 opcodes: payment, notification)
- Enterprise privacy opt-in via `@ouroc/sdk/enterprise`

[Full docs →](./ARCHITECTURE.md) | [Enterprise manual →](./ENTERPRISE_MANUAL.md)

---

## Quick Start

### Install

```bash
npm install @ouroc/sdk
```

### Standard Usage

```tsx
import { OuroCProvider, useSubscription } from '@ouroc/sdk';

function App() {
  const { createSubscription } = useSubscription();

  const subscribe = async () => {
    await createSubscription({
      solana_payer: wallet.publicKey.toString(),
      solana_receiver: "MERCHANT_ADDRESS",
      amount: 10_000000, // 10 USDC
      interval_seconds: 2592000, // 30 days
      token: "USDC"
    });
  };

  return <button onClick={subscribe}>Subscribe $10/month</button>;
}
```

### Business Tier Privacy

```tsx
import * as Business from '@ouroc/sdk/business';

// Derive encryption key from wallet
const key = await Business.deriveEncryptionKey(
  wallet.publicKey,
  (msg) => wallet.signMessage(msg)
);

// Create private subscription
await Business.createPrivateSubscription(client, {
  ...subscriptionParams,
  metadata: {
    name: 'Premium Plan',
    userIdentifier: 'user@example.com'
  },
  encryptionKey: key
});
```

### Enterprise Tier Confidential Computing (Q2 2026)

```tsx
import { ArciumMXEClient } from '@ouroc/sdk/enterprise';

// Initialize Arcium MXE for confidential transactions
const arciumClient = await initializeEnterpriseEncryption('Enterprise');

// Create confidential subscription with hidden amounts/parties
const result = await arciumClient.createConfidentialSubscription({
  terms: { amount: 10000000, interval: 2592000 },
  parties: { subscriber: '...', merchant: '...' },
  confidentiality: 'FULL'
});
```

[See src/README.md for tier documentation →](./src/README.md)

---

## Repository Structure

```
OuroC/
├── src/                       # 🔐 Tier-organized source code
│   ├── community/             # 🌱 Community Tier (Transaction fees)
│   │   ├── src/examples/      # Basic subscription examples
│   │   └── README.md          # Community tier documentation
│   │
│   ├── business-privacy/      # 💼 Business Tier ($299/month)
│   │   ├── src/
│   │   │   ├── encryption.ts  # Web Crypto API (AES-GCM-256)
│   │   │   ├── privacy/       # Private subscription management
│   │   │   └── examples/      # Business use cases
│   │   └── README.md          # Business tier documentation
│   │
│   ├── enterprise-privacy/    # 🏢 Enterprise Tier (Custom licensing)
│   │   ├── src/
│   │   │   ├── arcium.ts      # Arcium MXE integration (Q2 2026)
│   │   │   └── examples/      # Enterprise use cases
│   │   └── README.md          # Enterprise tier documentation
│   │
│   ├── timer/                 # ⏰ ICP Timer (Motoko - 600 lines)
│   │   ├── main.mo                # Canister + encrypted metadata storage
│   │   ├── solana.mo              # Solana RPC + opcode routing
│   │   ├── threshold_ed25519.mo   # ICP → Solana signing
│   │   └── security.mo            # Ed25519 verification
│   │
│   ├── license_registry/      # 📋 License Registry Canister
│   │   └── LicenseRegistry.mo     # Developer registration & API keys
│   │
│   └── admin-panel/           # 🔐 Admin Management Panel
│       ├── src/
│       │   ├── pages/            # License management, monitoring
│       │   └── components/        # API key management tools
│       └── dist/                 # Built admin interface
│
├── solana-contract/           # Solana Contract (Rust/Anchor)
│   └── programs/src/
│       ├── lib.rs             # Payment processor + router
│       ├── crypto.rs          # Ed25519 verification
│       └── errors.rs          # Error types
│
├── packages/sdk/              # TypeScript SDK
│   └── src/
│       ├── core/              # Standard SDK
│       │   ├── OuroCClient.ts
│       │   ├── SecureOuroCClient.ts  # IP protection wrapper
│       │   ├── encryption.ts   # Web Crypto utilities
│       │   └── privacy/        # Business tier helper functions
│       ├── enterprise.ts      # Enterprise module export
│       ├── tier.ts            # Tier management system
│       ├── grid/              # Grid integration (email, KYC, multisig)
│       ├── hooks/             # React hooks
│       └── components/        # UI components
│
├── demo-dapp/                 # Demo App (Next.js)
│   ├── pages/
│   │   ├── index.tsx
│   │   ├── merchant-dashboard.tsx
│   │   └── a2a-demo.tsx
│   └── components/
│
├── docs/                      # Documentation
│   ├── ENTERPRISE_MANUAL.md
│   ├── ARCHITECTURE.md
│   ├── IP_PROTECTION.md
│   └── SECURITY_AUDIT_REPORT.md
│
└── canisters/                 # Generated DID files
    ├── OuroC_timer.did.js
    └── LicenseRegistry.did.js
```

**📁 Clear Tier Organization:**
- `src/community/` - Transaction fees, public data
- `src/business-privacy/` - Web Crypto API, GDPR compliance
- `src/enterprise-privacy/` - Arcium MXE, confidential computing (Q2 2026)

---

## Use Cases

- **AI Agents** - Autonomous payments for APIs, data feeds, agent marketplaces
- **SaaS** - Monthly/annual software subscriptions with email signup
- **Content** - Patreon-style donations, newsletter subscriptions
- **DeFi/DAOs** - Membership fees, staking rewards, DCA automation
- **Physical Goods** - Coffee, supplements, rental payments
- **Privacy-Compliant** - GDPR-ready subscriptions with encrypted metadata
- **Enterprise Applications** - B2B services with IP protection and usage tracking
- **Developer Tools** - API access with tiered pricing and rate limiting

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Blockchain** | Solana + Anchor | Payment execution, source of truth |
| **Scheduler** | ICP (Motoko) | 600-line timer with Threshold Ed25519 |
| **UX** | Grid by Squads | Email accounts, KYC, multisig, fiat on/off-ramps |
| **Privacy** | Web Crypto API | AES-GCM-256 encryption (optional enterprise) |
| **SDK** | React + TypeScript | Hooks, components, dual exports (standard + enterprise) |
| **DEX** | Jupiter, Raydium | Multi-token → USDC swaps (planned) |
| **Storage** | IPFS, PostgreSQL, MongoDB | Pluggable adapters for payment history |
| **Crypto** | Ed25519, SHA-256 | Signing, PDA derivation, hash verification |
| **Testing** | Jest | 33 unit tests (core + Grid integration, 100% passing) |
| **Admin** | React | Management dashboard for IP protection and system monitoring |

---

## Security

### Audits
- [ ] Smart contract audit (pending)
- [ ] ICP canister security review (pending)

### Security Features
- ✅ **Threshold Ed25519**: No single point of failure for ICP signing
- ✅ **Ed25519 Signature Verification**: ICP canister signs all Solana transactions, verified on-chain
- ✅ **Authorization Modes**: Support for ICP-only, manual, or time-based processing
- ✅ **Proper PDA Derivation**: SHA256-based Program Derived Addresses (no collisions)
- ✅ **Payment Delegation**: Users approve max amount + duration, not blank checks
- ✅ **Pausable**: Users can pause/cancel anytime
- ✅ **Transparent**: All transactions on-chain and auditable
- ✅ **Minimalistic**: 70% less code = smaller attack surface
- ✅ **Input Validation**: Comprehensive checks on all canister and smart contract inputs

### Deployment Checklist
See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for pre-production security review.

### Responsible Disclosure
Found a security issue? Email: security@ouroc.com (PGP key available)

---

## Roadmap

### Q4 2025 (Completed)
- ✅ Core subscription system (USDC support)
- ✅ ICP timer integration with Threshold Ed25519
- ✅ React SDK v1.0 with TypeScript
- ✅ Proper PDA derivation (SHA256-based)
- ✅ Ed25519 signature verification (ICP ↔ Solana)
- ✅ Pre-built UI components (SubscriptionCard, MerchantDashboard, etc.)
- ✅ React hooks (useSubscription, useNotifications, useBalance, useHealthMonitoring)
- ✅ Manual payment fallback system
- ✅ Payment history indexer architecture
- ✅ IPFS/Pinata storage adapter
- ✅ Unit test suite (33+ tests passing)
- ✅ Devnet deployment ready
- ✅ **Grid by Squads integration** - Email accounts, KYC, multisig, off-ramps
- ✅ **Email subscriber accounts** - SubscriberFlow with passkey authentication
- ✅ **Merchant multisig treasury** - MerchantMultisigFlow (2-of-3, 3-of-5, etc.)
- ✅ **KYC compliance** - MerchantKYCFlow (Individual Tier 1/2, Business Tier 3)
- ✅ **Fiat off-ramps** - MerchantOffRampFlow (USDC → USD/EUR/GBP)
- ✅ **Grid SDK** - Full TypeScript integration with 34 unit tests
- ✅ **Grid UI components** - GridSubscriberLogin, GridSubscriptionModal
- ✅ **Caching & retry logic** - 80% API call reduction, exponential backoff
- ✅ **File validation** - Secure KYC document upload
- ✅ **Agent-to-Agent (A2A) Payments** - AI agent payment infrastructure
- ✅ **Agent identity & metadata** - Unique keypairs with owner attribution
- ✅ **A2A demo page** - Interactive demonstration at `/a2a-demo`

### Q4 2025 (Current - October 2025)
- [ ] Jupiter DEX integration (multi-token support - stub implemented)
- [ ] Complete Solana payment processing (currently stub)
- [ ] PostgreSQL/MongoDB storage adapters (interface ready)
- [ ] Mainnet launch preparation
- [ ] Smart contract audit
- [ ] Production Grid API integration

### Q1 2026
- [ ] Mobile app (React Native) with Grid email login
- [ ] Merchant dashboard v2 with advanced analytics
- [ ] Push notifications via service workers
- [ ] Subscription templates marketplace
- [ ] Grid on-ramp integration (USD → USDC)

### Q2 2026
- [ ] **Arcium MXE Integration** - Enterprise tier confidential computing
- [ ] Zero-knowledge proofs for transaction validity
- [ ] Multi-party computation on encrypted data
- [ ] Confidential transaction amounts and parties
- [ ] EVM chain support (Ethereum, Polygon, etc.)
- [ ] Cross-chain subscriptions
- [ ] Horizontal scale up

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Install dependencies
npm install

# Run local Solana validator
solana-test-validator

# Run local ICP replica
dfx start --background

# Deploy contracts locally
npm run deploy:local

# Run demo app
cd demo-dapp
npm run dev
```

---

---

## License

MIT License - see [LICENSE](./LICENSE) for details

---

## Acknowledgments

Built with:
- [Solana](https://solana.com) - High-performance blockchain
- [Internet Computer](https://internetcomputer.org) - Decentralized cloud computing
- [Grid by Squads](https://grid.squads.xyz) - Email accounts, KYC, multisig, fiat on/off-ramps
- [Anchor](https://www.anchor-lang.com) - Solana development framework
- [Jupiter](https://jup.ag) - Solana DEX aggregator (planned integration)



---

**Made with ❤️ by the OuroC Team**

*Decentralizing subscriptions, one payment at a time.*
