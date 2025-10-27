# OuroC-Mesos MVP

**OuroC-Mesos** is the MVP demonstration application for the OuroC Protocol - a chain fusion subscription payment system connecting Internet Computer (ICP) and Solana.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    OuroC-Mesos MVP                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │              │  │              │  │              │ │
│  │  Frontend    │  │  Timer       │  │  License     │ │
│  │  (React +    │◄─┤  Canister    │◄─┤  Registry    │ │
│  │   Vite)      │  │  (Rust)      │  │  (Motoko)    │ │
│  │              │  │              │  │              │ │
│  └──────────────┘  └──────┬───────┘  └──────────────┘ │
│                            │                            │
│                    Threshold ECDSA                      │
│                            │                            │
└────────────────────────────┼────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │                 │
                    │  Solana Smart   │
                    │  Contract       │
                    │  (ouroc_prima)  │
                    │                 │
                    └─────────────────┘
```

## 📦 Components

### 1. Timer Canister (Rust)
- **Location**: `src/timer_rust/`
- **Purpose**: Manages subscription timers and triggers payments
- **Features**:
  - Subscription lifecycle management
  - Threshold ECDSA integration for Solana address derivation
  - Chain fusion with Solana
  - Health monitoring & emergency controls
  - Fee governance with time-delay protection

### 2. License Registry (Motoko)
- **Location**: `src/license_registry/`
- **Purpose**: API key validation and tier management
- **Tiers**:
  - Community: 10 subscriptions, 1000 operations/day
  - Beta: 100 subscriptions, 10000 operations/day
  - Enterprise: Unlimited

### 3. Solana Smart Contract
- **Location**: `solana-contract/ouroc_prima/`
- **Purpose**: Handles on-chain subscription payments
- **Features**:
  - SPL token payment processing
  - Subscription state management
  - Price oracle integration
  - Jupiter swap integration

### 4. Frontend (React + Vite)
- **Location**: `frontend/`
- **Purpose**: User interface for subscription management
- **Tech Stack**: React, TypeScript, Vite, Tailwind CSS

## 🚀 Quick Start

### Prerequisites
- [dfx](https://internetcomputer.org/docs/current/developer-docs/setup/install/) (Internet Computer SDK)
- [Rust](https://www.rust-lang.org/tools/install) with wasm32-unknown-unknown target
- [Node.js](https://nodejs.org/) (v18+)
- [Anchor](https://www.anchor-lang.com/docs/installation) (for Solana contract)

### Installation

1. **Clone and setup**:
```bash
cd OuroC-Mesos
```

2. **Install frontend dependencies**:
```bash
cd frontend
npm install
cd ..
```

3. **Start local ICP replica**:
```bash
dfx start --clean --background
```

4. **Deploy canisters**:
```bash
dfx deploy
```

5. **Run frontend**:
```bash
cd frontend
npm run dev
```

6. **Deploy Solana contract** (optional, for full integration):
```bash
cd solana-contract/ouroc_prima
anchor build
anchor deploy
```

## 📝 Configuration

### Network Settings

Edit `src/timer_rust/src/state.rs` to configure network:
- Default: Devnet
- Change via `set_network()` function

### ECDSA Key

For local testing, the canister uses `test_key_1`. For production:
- Mainnet: Use `key_1` 
- Register your canister with IC management canister

## 🧪 Testing

### Test Timer Canister:
```bash
# Ping test
dfx canister call ouroc_timer ping

# Get Solana address
dfx canister call ouroc_timer get_solana_address_for_caller

# Create subscription
dfx canister call ouroc_timer create_subscription '(record {
  subscription_id = "test-001";
  solana_contract_address = "YourSolanaContractAddress";
  payment_token_mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  amount = 1000000;
  subscriber_address = "YourSubscriberAddress";
  merchant_address = "YourMerchantAddress";
  interval_seconds = 3600;
  start_time = null;
  api_key = "ouro_community_shared_2025_demo_key";
})'
```

### Test License Registry:
```bash
dfx canister call license_registry register_developer '("your-name")'
dfx canister call license_registry get_api_key
```

## 📚 API Documentation

### Timer Canister Endpoints

**Subscription Management:**
- `create_subscription(request)` - Create new subscription
- `list_subscriptions()` - List all subscriptions
- `pause_subscription(id)` - Pause subscription
- `resume_subscription(id)` - Resume subscription
- `cancel_subscription(id)` - Cancel subscription

**Chain Fusion:**
- `get_solana_address_for_caller()` - Get derived Solana address
- `get_balance_for_caller()` - Query Solana balance
- `get_balance_for_address(address)` - Query any address balance

**Admin Functions:**
- `initialize_first_admin()` - Setup admin access
- `emergency_pause_all()` - Pause all subscriptions
- `propose_fee_address_change(address)` - Propose fee address update

## 🔒 Security

- **Authorization**: Role-based access control (Admin, Read-Only)
- **Fee Governance**: 7-day time-delay for fee address changes
- **Encrypted Metadata**: SHA-256 validated encrypted storage
- **Threshold ECDSA**: Secure key derivation via IC management canister

## 🐛 Known Limitations (MVP)

1. **HTTP Outcalls**: Solana RPC calls are mocked (returns placeholder data)
2. **Transaction Signing**: Returns mock transaction hashes
3. **License Validation**: Uses hardcoded API keys (needs external registry integration)
4. **Balance Queries**: Returns fixed mock balance (0.1 SOL)

## 📊 Production Roadmap

- [ ] Implement HTTP outcalls to Solana RPC
- [ ] Real transaction signing with threshold ECDSA
- [ ] External license registry integration
- [ ] Real-time balance queries
- [ ] Admin withdrawal functionality
- [ ] Multi-token support
- [ ] Advanced analytics dashboard

## 🤝 Contributing

This is an MVP submission. For production improvements, please contact the team.

## 📄 License

[Add your license here]

## 🔗 Links

- [Internet Computer Docs](https://internetcomputer.org/docs)
- [Solana Docs](https://docs.solana.com/)
- [Threshold ECDSA](https://internetcomputer.org/docs/current/developer-docs/integrations/t-ecdsa/)

---

**Built with ❤️ using Chain Fusion technology**
