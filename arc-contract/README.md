# OuroC-Prima Arc Smart Contract

Recurring payment subscription protocol for Arc blockchain, powered by ICP Timer Canister for autonomous execution.

## Overview

OuroC-Prima Arc enables **decentralized recurring subscriptions** using:
- **Arc blockchain**: USDC-native gas (no volatile crypto needed)
- **ICP Timer Canister**: Autonomous payment triggers via HTTP outcalls
- **ECDSA signatures**: ICP canister signs payment authorizations
- **Fee splitting**: 98% merchant, 2% platform (configurable)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Frontend (React + Vite)                           │ │
│  │  - Arc Wallet Adapter (MetaMask/WalletConnect)    │ │
│  └──────┬──────────────────────────┬──────────────────┘ │
│         │                          │                     │
└─────────┼──────────────────────────┼─────────────────────┘
          │                          │
    ┌─────▼──────┐          ┌───────▼────────┐
    │   Arc      │          │  ICP Timer     │
    │  Contract  │◄─────────┤  Canister      │
    │ (Solidity) │  HTTP    │  (Rust)        │
    │            │  Outcall │                │
    └─────┬──────┘          └────────────────┘
          │
    ┌─────▼──────────────────────┐
    │  USDC (Native on Arc)      │
    │  - Gas token               │
    │  - Payment token           │
    └────────────────────────────┘
```

## Features

### Core Functionality
- ✅ **Create Subscriptions**: User creates recurring payment with ICP signature
- ✅ **Autonomous Execution**: ICP timer triggers payments automatically
- ✅ **USDC Transfers**: Native USDC payments with SafeERC20
- ✅ **Fee Management**: Configurable platform fees (default 2%)
- ✅ **Subscription Control**: Pause, resume, cancel subscriptions
- ✅ **Failure Handling**: Exponential backoff, auto-pause after max failures
- ✅ **Emergency Controls**: Pause contract, update parameters

### Security Features
- ✅ **Signature Verification**: ECDSA signatures from ICP canister
- ✅ **Nonce Protection**: Replay attack prevention
- ✅ **Reentrancy Guard**: Protection against reentrancy attacks
- ✅ **Pausable**: Emergency pause functionality
- ✅ **Access Control**: Ownable pattern for admin functions

## Smart Contract

### OuroCPrimaArc.sol

Main contract implementing recurring payment subscriptions.

**Key Functions:**

- `createSubscription()` - Create new recurring subscription
- `processTrigger()` - Process payment (called by ICP timer)
- `pauseSubscription()` - Pause subscription
- `resumeSubscription()` - Resume paused subscription
- `cancelSubscription()` - Permanently cancel subscription
- `processManualPayment()` - Manually trigger payment (if enabled)

**Admin Functions:**

- `updateICPSigner()` - Update ICP canister signer address
- `updateFeeConfig()` - Update platform fee configuration
- `updateFeeCollectionAddress()` - Update fee collection address
- `pause()` / `unpause()` - Emergency contract pause

## Installation

```bash
cd arc-contract
npm install
```

## Configuration

Create `.env` file:

```bash
cp .env.example .env
```

Update the following variables:

```env
# Network
ARC_TESTNET_RPC=https://rpc.testnet.arc.network
PRIVATE_KEY=your_private_key

# Deployment
USDC_ADDRESS=arc_usdc_contract_address
ICP_SIGNER_PUBLIC_KEY=icp_canister_derived_address
```

## Testing

### Run Tests

```bash
npm test
```

### Run with Coverage

```bash
npm run coverage
```

### Run with Gas Reporter

```bash
REPORT_GAS=true npm test
```

## Deployment

### Local Testing

```bash
# Start Hardhat node
npx hardhat node

# Deploy to local network
npm run deploy:local
```

### Arc Testnet

```bash
# Deploy to Arc testnet
npm run deploy:testnet
```

### Verify Contract

```bash
npx hardhat verify --network arc-testnet <CONTRACT_ADDRESS> <USDC_ADDRESS> <ICP_SIGNER> <FEE_COLLECTOR>
```

## Usage Example

### 1. Create Subscription

```typescript
import { ethers } from "ethers";
import OuroCPrimaArcABI from "./artifacts/contracts/OuroCPrimaArc.sol/OuroCPrimaArc.json";

const contract = new ethers.Contract(
  contractAddress,
  OuroCPrimaArcABI.abi,
  signer
);

// Get ICP signature from timer canister
const icpSignature = await getICPSignature({
  action: "CREATE_SUBSCRIPTION",
  subscriptionId,
  subscriber: userAddress,
  merchant: merchantAddress,
  amount: ethers.parseUnits("15.99", 6),
  intervalSeconds: 30 * 24 * 60 * 60, // 30 days
  nonce,
});

// Approve USDC spending
const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
await usdc.approve(contractAddress, ethers.parseUnits("1000", 6));

// Create subscription
await contract.createSubscription(
  subscriptionId,
  merchantAddress,
  "Netflix Premium",
  ethers.parseUnits("15.99", 6), // $15.99
  30 * 24 * 60 * 60, // 30 days
  1, // Reminder 1 day before
  icpSignature,
  nonce
);
```

### 2. ICP Timer Triggers Payment

```rust
// In ICP Timer Canister (Rust)

// Generate ECDSA signature
let signature = generate_ecdsa_signature(
    "PROCESS_PAYMENT",
    subscription_id,
    next_payment_time,
    amount,
    nonce
).await?;

// Build Arc transaction
let tx = build_arc_transaction(
    contract_address,
    "processTrigger",
    (subscription_id, signature, nonce)
);

// Send via HTTP outcall to Arc RPC
let result = send_http_request(
    arc_rpc_url,
    "eth_sendRawTransaction",
    tx
).await?;
```

### 3. Query Subscription Status

```typescript
// Get subscription details
const subscription = await contract.getSubscription(subscriptionId);

console.log("Subscriber:", subscription.subscriber);
console.log("Merchant:", subscription.merchant);
console.log("Amount:", ethers.formatUnits(subscription.amount, 6), "USDC");
console.log("Next Payment:", new Date(Number(subscription.nextPaymentTime) * 1000));
console.log("Payments Made:", subscription.paymentsMade.toString());
console.log("Total Paid:", ethers.formatUnits(subscription.totalPaid, 6), "USDC");
console.log("Status:", ["Active", "Paused", "Cancelled"][subscription.status]);

// Check if can be processed
const canProcess = await contract.canProcessSubscription(subscriptionId);
console.log("Can Process:", canProcess);
```

## Integration with ICP Timer

The ICP Timer Canister needs to be updated to support Arc:

### Required Changes

1. **Add Arc RPC endpoints** (`src/timer_rust/src/lib.rs`):
```rust
const ARC_TESTNET_RPC: &str = "https://rpc.testnet.arc.network";
```

2. **Implement EVM transaction builder** (`src/timer_rust/src/arc_client.rs`):
```rust
pub fn build_arc_transaction(
    contract_address: &str,
    function: &str,
    params: &[Token],
) -> Result<String, String> {
    // Encode function call
    let data = encode_function_call(function, params);

    // Build transaction
    let tx = Transaction {
        to: Some(contract_address.parse()?),
        data: Some(data),
        gas: U256::from(200000),
        // Arc calculates USDC gas dynamically
        ...Default::default()
    };

    Ok(rlp::encode(&tx))
}
```

3. **Generate ECDSA signatures** (instead of Ed25519):
```rust
pub async fn sign_arc_payment(
    subscription_id: &[u8],
    amount: u64,
    timestamp: u64,
    nonce: &[u8],
) -> Result<Vec<u8>, String> {
    // Use ICP threshold ECDSA (not Ed25519)
    let message_hash = keccak256(&[
        b"PROCESS_PAYMENT",
        subscription_id,
        &timestamp.to_be_bytes(),
        &amount.to_be_bytes(),
        nonce,
    ].concat());

    // Sign with ECDSA
    let signature = sign_with_ecdsa(
        message_hash,
        key_name: "key_1".to_string(),
    ).await?;

    Ok(signature)
}
```

## Gas Optimization

The contract is optimized for gas efficiency on Arc:

- **Packed structs**: Efficient storage layout
- **Immutable variables**: USDC address is immutable
- **SafeERC20**: Gas-efficient token transfers
- **Minimal storage reads**: Cache values in memory

Estimated gas costs (Arc testnet):
- Create subscription: ~150,000 gas (~$0.01 in USDC)
- Process payment: ~100,000 gas (~$0.007 in USDC)
- Pause/resume: ~30,000 gas (~$0.002 in USDC)

## Security Considerations

### Audits

⚠️ **This contract has NOT been audited.** Use at your own risk.

Before mainnet deployment:
1. Complete professional smart contract audit
2. Bug bounty program
3. Testnet testing period (minimum 3 months)

### Known Limitations

1. **Signature Scheme**: Requires ICP canister to support ECDSA (not just Ed25519)
2. **Nonce Management**: ICP canister must track nonces to prevent replay
3. **Gas Price**: Arc calculates USDC gas dynamically; monitor for sudden price changes
4. **HTTP Outcalls**: ICP timer relies on Arc RPC availability

## Comparison: Solana vs Arc

| Feature | Solana Version | Arc Version |
|---------|---------------|-------------|
| **Language** | Rust (Anchor) | Solidity |
| **Gas Token** | SOL | USDC |
| **Finality** | 400ms | 350-780ms |
| **Signature** | Ed25519 | ECDSA |
| **Account Model** | PDA-based | EVM address |
| **Gas Cost** | ~$0.00025 | ~$0.001 (est.) |
| **Dev Ecosystem** | Anchor/Rust | Hardhat/Solidity |

## Roadmap

- [x] Core subscription management
- [x] ICP signature verification
- [x] Payment processing
- [x] Emergency controls
- [x] Comprehensive test suite
- [ ] ICP timer Arc integration
- [ ] Frontend Arc wallet adapter
- [ ] CCTP V2 cross-chain payments
- [ ] Privacy features (Arc opt-in shielding)
- [ ] Circle Programmable Wallets integration
- [ ] Security audit
- [ ] Mainnet deployment (2026)

## License

MIT

## Support

For questions or issues:
- GitHub Issues: [OuroC-Mesos Issues](https://github.com/your-repo/issues)
- Documentation: [Arc Docs](https://arc.network/docs)
- Circle Developers: [developers.circle.com](https://developers.circle.com)

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch
3. Write tests for new features
4. Submit pull request

---

**Built with ❤️ for the Arc ecosystem**
