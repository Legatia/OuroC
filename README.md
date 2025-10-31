# OuroC - Decentralized Recurring Transactions on Solana

🚀 **Proof-of-Concept Subscription Infrastructure** - ICP Timer + Solana Smart Contract

**Decentralized recurring payment protocol combining Solana's speed with ICP's autonomous scheduling for truly automated subscriptions.**

---

## 🎯 What is OuroC?

**OuroC** is a proof-of-concept implementation of decentralized recurring transactions on Solana, powered by Internet Computer Protocol (ICP) autonomous scheduling.

### 🏛️ OuroC-Mesos: The Timer Canister

**OuroC-Mesos** is the core ICP canister that provides autonomous scheduling for Solana subscriptions. It serves as the bridge between ICP timer logic and Solana smart contracts.

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

**Built on OuroC-Prima**: Mesos is the first application built on top of the OuroC-Prima subscription smart contract, demonstrating how the decentralized recurring payment protocol works.

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
              • Fee split → Merchant (98%) + Platform (2%)
```

### 🔑 PDA Structure

1. **Config PDA** (`["config"]`) - Global configuration
2. **Subscription PDA** (`["subscription", subscription_id]`) - Individual subscription management

**Key Innovation:** Subscription PDA acts as delegate authority for automated recurring payments.

---

## 🔐 Delegation Amount Calculation

The delegation amount determines how much USDC the subscription PDA can spend on behalf of the subscriber.

### Frontend Implementation (TypeScript)

**Formula: 12 Months of Payments**

```typescript
export function calculateDelegationAmount(
  amountPerPayment: number,
  intervalSeconds: number
): number {
  // One-time payment
  if (intervalSeconds === -1) {
    return amountPerPayment;
  }

  // Estimate number of payments in 12 months
  const secondsPerMonth = 30 * 24 * 60 * 60;
  const monthsToApprove = 12;
  const estimatedPayments = Math.ceil((monthsToApprove * secondsPerMonth) / intervalSeconds);

  // Cap between 1-100 payments
  const paymentsToApprove = Math.max(1, Math.min(100, estimatedPayments));

  return amountPerPayment * paymentsToApprove;
}
```

### Smart Contract Implementation (Rust)

**Formula: One Year of Payments + Buffer**

```rust
pub fn calculate_one_year_delegation(amount: u64, interval_seconds: i64) -> Result<u64> {
    const SECONDS_IN_YEAR: i64 = 365 * 24 * 60 * 60; // 31,536,000 seconds

    if interval_seconds == -1 {
        return Ok(amount); // One-time payment
    }

    // Calculate payments per year + 1 buffer for clock drift
    let payments_per_year = (SECONDS_IN_YEAR / interval_seconds) as u64;
    let total_payments = payments_per_year + 1;

    // Total delegation = amount × (payments_per_year + 1)
    let delegation = amount * total_payments;

    // Cap at MAX_APPROVAL_AMOUNT (1M USDC)
    Ok(delegation.min(MAX_APPROVAL_AMOUNT))
}
```

### Examples

| Subscription | Amount | Interval | Delegation |
|-------------|--------|----------|-----------|
| **Monthly** | 10 USDC | 30 days | **120-130 USDC** (1 year) |
| **Weekly** | 5 USDC | 7 days | **260-265 USDC** (1 year) |
| **Daily** | 1 USDC | 1 day | **100-366 USDC** (capped/full year) |
| **One-time** | 100 USDC | -1 | **100 USDC** (exact amount) |

**User Experience:** Approve once for a full year of payments, balancing convenience with security.

---

## 🚀 Quick Start

### Prerequisites
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install dfx (ICP SDK)
sh -c "$(curl -fsSL https://internetcomputer.org/install.sh)"

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Deploy Timer Canister (ICP)
```bash
cd OuroC-Mesos

# Start local ICP replica
dfx start --background

# Deploy timer canister
dfx deploy timer_rust

# Get canister ID
dfx canister id timer_rust
```

### Deploy Solana Contract
```bash
cd solana-contract/ouroc_prima

# Build contract
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Get program ID
solana address -k target/deploy/ouroc_prima-keypair.json
```

### Run Frontend
```bash
cd OuroC-Mesos/frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your canister ID and program ID

# Run dev server
npm run dev
```

---

## 🌐 Network Configuration

### Development (Devnet)
- **Timer Canister**: `ar3bl-2aaaa-aaaag-auhda-cai` (IC mainnet)
- **Solana Program**: `CFEtrptTe5eFXpZtB3hr1VMGuWF9oXguTnUFUaeVgeyT`
- **USDC Mint**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- **RPC**: `https://api.devnet.solana.com`

---

## 📊 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Blockchain** | Solana + Anchor | Payment execution, immutable audit trail |
| **Scheduler** | ICP (Rust) | Autonomous payment scheduling with Threshold Ed25519 |
| **Frontend** | React + Vite + Shadcn UI | User interface for subscription management |
| **Wallet** | Solana Wallet Adapter | Connect Phantom, Solflare, etc. |

---

## 🔐 Security Features

- ✅ **Ed25519 Signature Verification** - ICP ↔ Solana cross-chain signatures
- ✅ **Payment Delegation** - Users approve max amount + duration, not blank checks
- ✅ **Proper PDA Derivation** - SHA256-based Program Derived Addresses
- ✅ **Pausable** - Users can pause/cancel anytime
- ✅ **Transparent** - All transactions on-chain and auditable
- ✅ **Exponential Backoff** - Intelligent retry logic for failed payments
- ✅ **Cycle Monitoring** - Prevents canister from running out of cycles

---

## 📈 Use Cases

### 💼 Proof-of-Concept Applications
- **SaaS Subscriptions** - Monthly/annual billing automation
- **Content Platforms** - Creator subscription payments
- **Developer Tools** - API access with tiered pricing
- **Research** - Demonstrate decentralized scheduling capabilities

---

## 🛣️ Project Status

### ✅ Implemented (Q4 2025)
- ✅ Core subscription system with USDC support
- ✅ ICP timer integration with Threshold Ed25519
- ✅ Solana smart contract (OuroC-Prima)
- ✅ Basic frontend with Solana wallet integration
- ✅ Delegation amount calculation (1 year of payments)
- ✅ Fee split (98% merchant, 2% platform)
- ✅ Notification system (1 day before payment)
- ✅ Exponential backoff for failed payments
- ✅ Devnet deployment

### 🚧 In Progress
- 🔄 Smart contract audit
- 🔄 Mainnet deployment preparation
- 🔄 Documentation improvements

### 🎯 Future Considerations
- 📦 NPM SDK package
- 🤖 AI agent payment delegation
- 🏦 Enterprise compliance features
- 💰 Multi-token support (Jupiter DEX)
- 📱 Mobile application

---

## 🤝 Contributing

We welcome contributions! The codebase is organized as follows:

```bash
OuroC/
├── OuroC-Mesos/              # ICP timer canister
│   ├── src/timer_rust/      # Rust canister code
│   └── frontend/            # React frontend
├── solana-contract/          # Solana smart contracts
│   └── ouroc_prima/         # OuroC-Prima subscription contract
└── Archive/                  # Previous implementations (reference only)
```

### Development Setup
```bash
# Clone repository
git clone https://github.com/yourusername/ouroc.git
cd ouroc

# Install dependencies
npm install

# Run local development
# See Quick Start section above
```

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

---

## 🙏 Acknowledgments

Built with:
- [Solana](https://solana.com) - High-performance blockchain
- [Internet Computer](https://internetcomputer.org) - Decentralized cloud computing with Threshold signatures
- [Anchor](https://www.anchor-lang.com/) - Solana smart contract framework

---

**Made with ❤️ by the OuroC Team**

*Proof-of-Concept: Decentralized Recurring Transactions on Solana*
