# Arc Contract Quickstart Guide

Get the OuroC-Prima Arc smart contract deployed in under 10 minutes!

## Prerequisites

- **Foundry** installed ([foundryup](https://book.getfoundry.sh/getting-started/installation))
- **Node.js** v18+ (for Hardhat alternative)
- Arc Testnet wallet with USDC ([Circle Faucet](https://faucet.circle.com))

## Option 1: Deploy with Foundry (Recommended)

### Step 1: Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Step 2: Clone and Setup

```bash
cd arc-contract
cp .env.example .env
```

### Step 3: Configure Wallet

Generate a new wallet:
```bash
cast wallet new
```

**⚠️ IMPORTANT:** Save your private key securely! Add to `.env`:
```
PRIVATE_KEY=0x...
```

### Step 4: Get Testnet USDC

1. Get your wallet address:
```bash
cast wallet address --private-key $PRIVATE_KEY
```

2. Visit https://faucet.circle.com
3. Select "Arc Testnet"
4. Enter your wallet address
5. Get USDC for gas fees

### Step 5: Get Arc USDC Contract Address

You'll need the official Arc testnet USDC contract address. Check:
- Arc documentation: https://docs.arc.network
- Arc Discord/Telegram
- Or ask the Arc team

Update `.env`:
```
USDC_ADDRESS=0x...arc_usdc_address
```

### Step 6: Get ICP Signer Address

You need to derive the Ethereum address from your ICP canister's ECDSA public key.

**From ICP Canister:**
```bash
# Get ECDSA public key
dfx canister call timer_rust get_arc_public_key

# Derive Ethereum address (last 20 bytes of keccak256 hash)
# Update .env with this address
```

Update `.env`:
```
ICP_SIGNER_PUBLIC_KEY=0x...derived_address
```

### Step 7: Deploy!

```bash
npm run deploy:foundry
# or
./scripts/deploy-foundry.sh
```

Success! Your contract is deployed 🎉

### Step 8: Verify Deployment

```bash
# Check contract state
cast call $CONTRACT_ADDRESS "totalSubscriptions()(uint256)" --rpc-url $ARC_TESTNET_RPC_URL

# Should return: 0 (no subscriptions yet)
```

## Option 2: Deploy with Hardhat

### Step 1: Install Dependencies

```bash
cd arc-contract
npm install
```

### Step 2: Configure

```bash
cp .env.example .env
# Edit .env with your settings
```

### Step 3: Deploy

```bash
npm run deploy:testnet
```

## Verify Your Deployment

### Using Cast (Foundry)

```bash
# Get contract owner
cast call $CONTRACT_ADDRESS "owner()(address)" --rpc-url $ARC_TESTNET_RPC_URL

# Get fee config
cast call $CONTRACT_ADDRESS "feeConfig()(uint16,uint64)" --rpc-url $ARC_TESTNET_RPC_URL
# Returns: (200, 0) = 2% fee, 0 min fee

# Get ICP signer
cast call $CONTRACT_ADDRESS "icpSignerAddress()(address)" --rpc-url $ARC_TESTNET_RPC_URL
```

### View on Explorer

Visit: https://explorer.testnet.arc.network/address/$CONTRACT_ADDRESS

## Testing Locally

### Run Hardhat Tests

```bash
npm test
```

### Run Foundry Tests

```bash
forge test -vvv
```

### Generate Coverage Report

```bash
forge coverage
```

## Common Issues

### Issue: "Insufficient funds for gas"

**Solution:** Get more USDC from https://faucet.circle.com

### Issue: "Invalid signature"

**Solution:** Ensure `ICP_SIGNER_PUBLIC_KEY` matches the Ethereum address derived from your ICP canister's ECDSA public key.

To verify:
```bash
# In ICP canister
dfx canister call timer_rust get_arc_public_key

# Derive address (Rust/Python/JS):
# 1. Take public key bytes (skip first 0x04 prefix)
# 2. Hash with Keccak256
# 3. Take last 20 bytes
# 4. Prefix with "0x"
```

### Issue: "Transaction reverted"

**Solution:** Check Arc RPC is responding:
```bash
cast block-number --rpc-url $ARC_TESTNET_RPC_URL
```

## Next Steps

### 1. Update ICP Timer Canister

See `ARC_INTEGRATION_GUIDE.md` for detailed instructions.

Key changes needed:
- Add ECDSA signing support
- Implement EVM transaction builder
- Add Arc RPC HTTP outcalls

### 2. Update Frontend

Add Arc wallet adapter (MetaMask/WalletConnect):
```typescript
import { ArcWalletProvider } from './contexts/ArcWalletContext';

function App() {
  return (
    <ArcWalletProvider>
      {/* Your app */}
    </ArcWalletProvider>
  );
}
```

### 3. Test End-to-End

1. Create subscription from frontend
2. Approve USDC spending
3. Wait for ICP timer to trigger
4. Verify payment on Arc explorer

## Resources

- **Arc Docs**: https://docs.arc.network
- **Circle Faucet**: https://faucet.circle.com
- **Foundry Book**: https://book.getfoundry.sh
- **ICP ECDSA**: https://internetcomputer.org/docs/current/developer-docs/integrations/t-ecdsa/

## Get Help

- **Arc Discord**: Join for testnet support
- **GitHub Issues**: Report bugs
- **Circle Dev Portal**: https://developers.circle.com

---

**Happy Building! 🚀**
