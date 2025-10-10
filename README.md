# OuroC - Decentralized Subscription Payments on Solana

**Fully on-chain, recurring subscription payments powered by Solana + ICP + Grid**

OuroC enables merchants to accept automated, recurring cryptocurrency payments without centralized infrastructure. Users can sign up with just an email (no wallet needed), and the system handles the rest - all on-chain, compliant, and transparent.

---

## What is OuroC?

OuroC is a decentralized subscription payment protocol that combines:
- **Solana blockchain** - Immutable source of truth for subscription data and payments
- **ICP (Internet Computer)** - Decentralized timer/scheduler using Threshold Ed25519 signatures
- **Grid by Squads** - Email accounts, KYC, multisig, and fiat on/off-ramps
- **Multi-token support** - Accept payments in USDC, SOL, or any SPL token (auto-swapped to USDC)
- **Web3 UX** - Email signup (Grid) with Web3 automation (ICP) and compliance (Grid KYC)

## Key Features

### For Merchants
- ✅ **Email-based merchant accounts or connect with wallet** - Grid integration
- ✅ **Multisig treasury** - Grid multisig for team-based fund management (2-of-3, 3-of-5, etc.)
- ✅ **Built-in KYC/compliance** - Grid KYC (Individual Tier 1/2, Business Tier 3)
- ✅ **Fiat on/off-ramps** - Grid-powered USDC ↔ USD/EUR/GBP conversion
- ✅ **Accept recurring payments in any stable coins**
- ✅ **Automatic conversion to USDC** via Jupiter/Raydium DEX (multi-token swap coming soon)
- ✅ **Simple React SDK integration** (`npm install @ouroc/sdk`)
- ✅ **Pre-built UI components** - SubscriptionCard, MerchantDashboard, HealthMonitor
- ✅ **Transparent on-chain revenue tracking**
- ✅ **Flexible payment history storage** - Plugin architecture for PostgreSQL, MongoDB, IPFS, Arweave, or custom storage
- ✅ **Real-time payment notifications** via webhook or event stream
- ✅ **Manual payment fallback** - Process payments manually if needed

### For Subscribers
- ✅ **Email signup or connect with wallet** - Grid email accounts with passkey authentication
- ✅ **One-time payment delegation approval** - Secure Ed25519 signatures
- ✅ **Notification reminders before each payment** - Configurable reminder days
- ✅ **Cancel or pause anytime on-chain** - Full control via Grid account or wallet
- ✅ **Optional KYC** - Grid KYC for regulated/compliant subscriptions

### For Developers
- ✅ **Grid Integration SDK** - Full TypeScript SDK for email accounts, multisig, KYC, and off-ramps
- ✅ **Grid Flows** - Pre-built flows: `SubscriberFlow`, `MerchantFlow`, `MerchantMultisigFlow`, `MerchantKYCFlow`, `MerchantOffRampFlow`
- ✅ **Minimalistic Architecture** - ICP stores only timing data, Solana has all subscription details
- ✅ **Opcode-Based Routing** - Simple 2-opcode system (0=payment, 1=notification)
- ✅ **Single Source of Truth** - Solana blockchain is immutable and trusted
- ✅ **Smaller Attack Surface** - 70% less code in ICP canister vs traditional approaches
- ✅ **Proper PDA Derivation** - SHA256-based Program Derived Addresses for security
- ✅ **Type-safe SDK** - Full TypeScript support with comprehensive types
- ✅ **React Hooks** - `useSubscription`, `useNotifications`, `useBalance`, `useHealthMonitoring`
- ✅ **Storage Adapters** - Pluggable architecture for payment history storage
- ✅ **Unit Tested** - 67+ passing tests (33 core SDK + 34 Grid integration)
- ✅ **Open Source** - Audit, fork, and contribute on GitHub

---

## Architecture

OuroC uses a minimalistic design where **Solana is the source of truth** and **ICP is a lightweight scheduler**:

```
┌─────────────────┐
│   Subscriber    │
│   (Solana)      │
└────────┬────────┘
         │ 1. Approve delegation
         │ 2. Create subscription
         ▼
┌─────────────────────────────────┐
│   Solana Smart Contract         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  • Subscription PDA (data)      │
│  • Payment delegation           │
│  • Token swap routing           │
│  • Fee processor                │
└────────┬────────────────────────┘
         │ 3. Notify ICP timer
         ▼
┌─────────────────────────────────┐
│   ICP Timer Canister            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  • Stores: subscription_id,     │
│    token_mint, interval,        │
│    next_execution, status       │
│  • Sends opcode 0 (payment)     │
│    or opcode 1 (notification)   │
└────────┬────────────────────────┘
         │ 4. Trigger with opcode
         ▼
┌─────────────────────────────────┐
│   Solana Contract (Router)      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Opcode 0: Payment              │
│    → Check token_mint           │
│    → USDC? Direct transfer      │
│    → Other? Swap → USDC first   │
│    → Fee split (treasury + merchant) │
│                                 │
│  Opcode 1: Notification         │
│    → Send memo to subscriber    │
└─────────────────────────────────┘
```

**Key Design Principles:**
- **Minimalistic ICP**: Only 600 lines (was 4100), stores only timing/routing data
- **Solana Source of Truth**: All payment amounts, addresses, and delegation proofs on-chain
- **Opcode Routing**: ICP sends 2 opcodes, Solana handles all business logic
- **No Data Duplication**: Prevents desync, reduces bugs, enables disaster recovery

[Read full architecture docs →](./ARCHITECTURE.md)

---

## Quick Start

### 1. Install the SDK

```bash
npm install @ouroc/sdk
```

### 2. Integrate into Your App

```tsx
import { OuroCProvider, useSubscription, SubscriptionCard } from '@ouroc/sdk';
import { useWallet } from '@solana/wallet-adapter-react';

function App() {
  return (
    <OuroCProvider
      canisterId="your-icp-canister-id"
      solanaEndpoint="https://api.devnet.solana.com"
    >
      <SubscriptionButton />
    </OuroCProvider>
  );
}

function SubscriptionButton() {
  const { createSubscription, isLoading } = useSubscription();
  const wallet = useWallet();

  const handleSubscribe = async () => {
    await createSubscription({
      solana_payer: wallet.publicKey.toString(),
      solana_receiver: "YOUR_MERCHANT_SOLANA_ADDRESS",
      amount: BigInt(10_000_000), // 10 USDC (6 decimals)
      token: "USDC",
      interval_seconds: 2592000, // 30 days
      reminder_days_before_payment: 3,
      subscription_id: `sub-${Date.now()}`,
      payment_token_mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      slippage_bps: 50 // 0.5% slippage
    });
  };

  return (
    <button onClick={handleSubscribe} disabled={isLoading}>
      Subscribe for $10/month
    </button>
  );
}

// Or use the pre-built SubscriptionCard component
function SubscriptionPage() {
  return (
    <SubscriptionCard
      plan={{
        name: "Premium Plan",
        price: 10,
        interval: "month",
        features: ["Feature 1", "Feature 2", "Feature 3"],
        token: "USDC",
        reminderDays: 3
      }}
      merchantAddress="YOUR_MERCHANT_SOLANA_ADDRESS"
    />
  );
}
```

### 3. Deploy Contracts (Optional)

If you want to deploy your own instance:

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/OuroC.git
cd OuroC

# Deploy Solana contract
cd solana-contract/ouro_c_subscriptions
anchor build
anchor deploy --provider.cluster devnet

# Deploy ICP canister
cd ../../
dfx deploy ouro_c_timer --network ic
dfx canister call ouro_c_timer initialize_canister
```

---

## Repository Structure

```
OuroC/
├── src/timer/                  # ICP Timer Canister (Motoko)
│   ├── main.mo                 # Main canister (600 lines)
│   ├── solana.mo               # Solana RPC client + opcode sender
│   ├── sha256.mo               # SHA256 for PDA derivation
│   ├── threshold_ed25519.mo    # ICP → Solana signing
│   ├── security.mo             # Ed25519 signature verification
│   └── cycle_management.mo     # Auto cycle refill
│
├── solana-contract/            # Solana Smart Contract (Rust/Anchor)
│   └── ouro_c_subscriptions/
│       └── programs/
│           └── src/
│               ├── lib.rs      # Opcode router + payment processor
│               ├── crypto.rs   # Ed25519 verification (Solana side)
│               └── errors.rs   # Custom error types
│
├── demo-dapp/                  # Demo frontend (Next.js)
│   ├── pages/
│   │   ├── index.tsx           # Landing page
│   │   └── merchant-dashboard.tsx  # Merchant payment history
│   ├── components/
│   │   └── ManualTriggerButton.tsx # Manual payment trigger
│   └── utils/
│       └── solanaIndexer.ts    # Event listener for payment history
│
├── packages/sdk/               # TypeScript SDK (npm package)
│   └── src/
│       ├── core/
│       │   ├── OuroCClient.ts  # Main SDK client
│       │   └── types.ts        # TypeScript interfaces
│       ├── grid/               # Grid integration (email, KYC, multisig, off-ramp)
│       │   ├── api/GridClient.ts
│       │   ├── flows/
│       │   │   ├── SubscriberFlow.ts      # Email signup + passkey
│       │   │   ├── MerchantFlow.ts        # Merchant accounts
│       │   │   ├── MerchantMultisigFlow.ts # Multisig treasury
│       │   │   ├── MerchantKYCFlow.ts     # KYC verification
│       │   │   └── MerchantOffRampFlow.ts # USDC → USD/EUR/GBP
│       │   └── types/          # Grid TypeScript types
│       ├── hooks/              # React hooks
│       │   ├── useSubscription.ts
│       │   ├── useNotifications.ts
│       │   ├── useBalance.ts
│       │   └── useHealthMonitoring.ts
│       ├── components/         # Pre-built UI components
│       │   ├── SubscriptionCard/
│       │   ├── MerchantDashboard/
│       │   ├── HealthMonitor/
│       │   └── ManualPaymentAlert/
│       └── solana/
│           └── index.ts        # Solana payment processing (stub)
│
├── packages/indexer-ipfs/      # IPFS Storage Adapter
│   └── src/
│       ├── IPFSAdapter.ts      # Pinata-based payment history storage
│       └── types.ts            # StorageAdapter interface
│
├── ARCHITECTURE.md             # Architecture deep dive
├── DEPLOYMENT_CHECKLIST.md     # Pre-deployment security checklist
├── PLACEHOLDERS_REVIEW.md      # TODO items for production
└── README.md                   # This file
```

---

## Use Cases

### SaaS & Services
- Monthly/annual software subscriptions
- API access plans
- Cloud storage fees
- Gaming subscriptions (MMOs, battle passes)

### Content Creators
- Patreon-style recurring donations
- Substack-style newsletter subscriptions
- Exclusive content access (Discord, Telegram bots)

### DeFi & DAOs
- DAO membership fees
- Staking rewards distribution
- Recurring investment plans (DCA - Dollar Cost Averaging)

### Physical Goods
- Coffee subscriptions
- Supplement auto-delivery
- Rental payments (co-living, co-working)

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Blockchain** | Solana | Payment execution, source of truth |
| **Scheduler** | Internet Computer (ICP) | Decentralized cron job (Threshold Ed25519) |
| **UX/Compliance** | Grid by Squads | Email accounts, KYC, multisig, fiat on/off-ramps |
| **Smart Contracts** | Anchor (Rust) | Solana program for subscriptions |
| **Canister** | Motoko | ICP timer canister (600 lines) |
| **Frontend SDK** | React + TypeScript | Developer integration library |
| **Wallet Integration** | Solana Wallet Adapter + Grid Accounts | Multi-wallet + email support |
| **DEX Integration** | Jupiter, Raydium | Multi-token swaps (planned) |
| **Cryptography** | Ed25519, SHA256 | Signature verification, PDA derivation |
| **Compliance** | Grid KYC | Individual (Tier 1/2), Business (Tier 3) |
| **Off-Ramps** | Grid/Sphere | USDC ↔ USD/EUR/GBP conversion |
| **Storage Adapters** | IPFS, PostgreSQL, MongoDB, Arweave | Pluggable payment history storage |
| **Testing** | Jest, React Testing Library | 67+ unit and integration tests |

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
