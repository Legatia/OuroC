# OuroC - Decentralized Subscription Payments on Solana

**Fully on-chain, recurring subscription payments powered by Solana + ICP**

OuroC enables merchants to accept automated, recurring cryptocurrency payments without centralized infrastructure. Users approve a payment delegation once, and the system handles the rest - all on-chain, trustless, and transparent.

---

## What is OuroC?

OuroC is a decentralized subscription payment protocol that combines:
- **Solana blockchain** - Immutable source of truth for subscription data and payments
- **ICP (Internet Computer)** - Decentralized timer/scheduler using Threshold Ed25519 signatures
- **Multi-token support** - Accept payments in USDC, SOL, or any SPL token (auto-swapped to USDC)
- **Web3 native** - No backend servers, no credit cards, no intermediaries

## Key Features

### For Merchants
- Accept recurring payments in any SPL token
- Automatic conversion to USDC via Jupiter/Raydium DEX
- Simple React SDK integration (`npm install @ouroc/react-sdk`)
- Dashboard for subscription management
- Transparent on-chain revenue tracking

### For Subscribers
- One-time payment delegation approval
- Notification reminders before each payment
- Cancel or pause anytime on-chain
- Privacy-preserving (no email, no KYC)
- Full control via Solana wallet

### For Developers
- **Minimalistic Architecture** - ICP stores only timing data, Solana has all subscription details
- **Opcode-Based Routing** - Simple 2-opcode system (0=payment, 1=notification)
- **Single Source of Truth** - Solana blockchain is immutable and trusted
- **Smaller Attack Surface** - 70% less code in ICP canister vs traditional approaches
- **Open Source** - Audit, fork, and contribute on GitHub

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

### 1. Install the React SDK

```bash
npm install @ouroc/react-sdk
```

### 2. Integrate into Your App

```tsx
import { OuroCProvider, useSubscription } from '@ouroc/react-sdk';

function App() {
  return (
    <OuroCProvider>
      <SubscriptionButton />
    </OuroCProvider>
  );
}

function SubscriptionButton() {
  const { createSubscription, isLoading } = useSubscription();

  const handleSubscribe = async () => {
    await createSubscription({
      merchantAddress: "YOUR_SOLANA_ADDRESS",
      amount: 10_000_000, // 10 USDC (6 decimals)
      paymentTokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
      intervalSeconds: 2592000, // 30 days
      reminderDaysBeforePayment: 3,
    });
  };

  return (
    <button onClick={handleSubscribe} disabled={isLoading}>
      Subscribe for $10/month
    </button>
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
│   ├── threshold_ed25519.mo    # ICP → Solana signing
│   └── cycle_management.mo     # Auto cycle refill
│
├── solana-contract/            # Solana Smart Contract (Rust/Anchor)
│   └── ouro_c_subscriptions/
│       └── programs/
│           └── src/lib.rs      # Opcode router + payment processor
│
├── demo-dapp/                  # Demo frontend (Next.js)
│   ├── pages/
│   ├── components/
│   └── hooks/
│
├── packages/react-sdk/         # React SDK (npm package)
│   └── src/
│       ├── hooks/              # useSubscription, useOuroC
│       └── components/         # Pre-built UI components
│
├── ARCHITECTURE.md             # Architecture deep dive
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
| **Smart Contracts** | Anchor (Rust) | Solana program for subscriptions |
| **Canister** | Motoko | ICP timer canister |
| **Frontend SDK** | React + TypeScript | Developer integration library |
| **Wallet Integration** | Solana Wallet Adapter | Multi-wallet support |
| **DEX Integration** | Jupiter, Raydium | Multi-token swaps (TODO) |

---

## Security

### Audits
- [ ] Smart contract audit (pending)
- [ ] ICP canister security review (pending)

### Security Features
- **Threshold Ed25519**: No single point of failure for ICP signing
- **Payment Delegation**: Users approve max amount + duration, not blank checks
- **Pausable**: Users can pause/cancel anytime
- **Transparent**: All transactions on-chain and auditable
- **Minimalistic**: 70% less code = smaller attack surface

### Responsible Disclosure
Found a security issue? Email: security@ouroc.com (PGP key available)

---

## Roadmap

### Q4 2025
- [x] Core subscription system (USDC only)
- [x] ICP timer integration
- [x] React SDK v1.0
- [ ] Jupiter DEX integration (multi-token support)
- [ ] Mainnet beta launch

### Q1 2026
- [ ] Smart contract audit
- [ ] Mobile app (React Native)
- [ ] Merchant dashboard v2
- [ ] Analytics & reporting

### Q2 2026
- [ ] EVM chain support (Ethereum, Polygon, etc.)
- [ ] Fiat on-ramp integration
- [ ] Subscription templates marketplace

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
- [Anchor](https://www.anchor-lang.com) - Solana development framework
- [Jupiter](https://jup.ag) - Solana DEX aggregator (planned integration)

---

**Made with ❤️ by the OuroC Team**

*Decentralizing subscriptions, one payment at a time.*
