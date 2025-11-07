# Solana-First Architecture

**Updated**: November 5, 2025
**Status**: ✅ Implemented

---

## Overview

OuroC-Mesos is built on a **Solana-first architecture**. While we initially prepared EVM support for Arc Network integration, the production system focuses exclusively on Solana.

## Why Solana?

### Business Focus
- ✅ Solana recurring payments via ICP Timer
- ✅ Squads Protocol for DAO treasuries
- ✅ Lower transaction costs
- ✅ Higher throughput
- ✅ Better DeFi ecosystem for payments
- ✅ Native SPL tokens (USDC, USDT)

### EVM Was Only for Arc
- Arc Network (threshold ECDSA) was tested with EVM
- Production recurring payments use **Solana** opcodes
- EVM code remains for reference but not used

## Architecture Stack

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  - Solana wallet adapter (Phantom, Solflare)                │
│  - @solana/web3.js                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                Backend API (Express)                         │
│  Current: Express + Solana SDK                              │
│  Future: ICP Canister + Threshold ECDSA                     │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Aleph.im SDK with Solana Account                      │  │
│  │  - Signs messages with Solana keypair                 │  │
│  │  - Posts to Aleph.im for decentralized storage        │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Blockchain Layer (Solana)                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Recurring Payments                                     │ │
│  │  - ICP Timer Canister (scheduling)                    │ │
│  │  - Arc threshold ECDSA (signing)                      │ │
│  │  - Solana RPC (execution)                             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Guild Treasuries (Squads Protocol)                    │ │
│  │  - Multisig PDAs                                      │ │
│  │  - Proposal voting                                    │ │
│  │  - On-chain execution                                 │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                Storage Layer (Aleph.im)                      │
│  - Content metadata (courses, creators)                     │
│  - Guild metadata (guilds, members)                         │
│  - Proposal metadata (proposals, votes)                     │
│  - Signed with Solana accounts                              │
└──────────────────────────────────────────────────────────────┘
```

## Components

### 1. Frontend
- **Wallet**: Solana wallet adapter
- **SDK**: @solana/web3.js
- **Supported Wallets**: Phantom, Solflare, Backpack, etc.

### 2. Backend API (Current: Express)

**Location**: `/backend/`

**Key Features:**
- ✅ Solana account for Aleph signing
- ✅ REST API endpoints
- ✅ CORS-enabled for frontend
- ✅ Fallback to localStorage

**Environment Variables:**
```bash
SOLANA_PRIVATE_KEY=[161,127,209,...]  # Byte array or base58
```

**How it works:**
1. Backend initializes Solana keypair
2. Signs Aleph messages with Solana account
3. Posts to Aleph.im network
4. Returns Aleph hash to frontend

### 3. Backend ICP Canister (Future)

**Location**: `/backend/icp-canister/`

**Planned Features:**
- [ ] HTTPS outcalls to Aleph REST API
- [ ] Threshold ECDSA for Solana signing
- [ ] Internet Identity authentication
- [ ] Fully decentralized (no traditional server)

**Migration Path:**
```
Express (Now) → ICP Canister (Future)
  ↓                    ↓
Same API            Decentralized
```

### 4. ICP Timer (Recurring Payments)

**Location**: `/src/timer/`

**Purpose**: Schedule recurring Solana payments

**Flow:**
```
1. User creates subscription
2. ICP Timer stores subscription data
3. Timer triggers at interval (weekly/monthly/quarterly)
4. Arc threshold ECDSA signs Solana transaction
5. Transaction executed on Solana
6. Payment goes directly to creator's wallet
```

**Key Files:**
- `main.mo` - Timer scheduling logic
- `solana.mo` - Solana transaction building
- `arc_service.mo` - Threshold ECDSA signing

### 5. Squads Protocol (Guild Treasuries)

**Purpose**: Multisig treasuries for guilds

**Frontend Integration:**
```typescript
import { SquadsService } from '@/lib/squadsService';

// Create guild treasury
const { multisigPda } = await squadsService.createMultisig({
  threshold: 3,
  members: [member1, member2, member3],
});

// Create proposal
await squadsService.createProposal({
  multisigPda,
  recipient,
  amount,
});
```

### 6. Aleph.im (Decentralized Storage)

**Purpose**: Store metadata off-chain

**Signed with**: Solana accounts

**Data Stored:**
- Content metadata (title, description, price)
- Guild metadata (name, members, treasury)
- Proposal metadata (title, votes, status)

## Code Examples

### Backend: Initialize Solana Account

```typescript
// backend/src/aleph.ts
import { solana } from 'aleph-sdk-ts/dist/accounts/index.js';
import { Keypair } from '@solana/web3.js';

export function initAlephAccount() {
  const privateKey = process.env.SOLANA_PRIVATE_KEY;

  // Parse Solana keypair
  const secretKey = new Uint8Array(JSON.parse(privateKey));
  const keypair = Keypair.fromSecretKey(secretKey);

  // Import into Aleph SDK
  const account = solana.ImportAccountFromPrivateKey(secretKey);

  console.log('✅ Solana PublicKey:', keypair.publicKey.toString());
  return account;
}
```

### Frontend: Connect Solana Wallet

```typescript
// frontend/src/components/WalletButton.tsx
import { useWallet } from '@solana/wallet-adapter-react';

export function WalletButton() {
  const { connect, publicKey } = useWallet();

  return (
    <Button onClick={connect}>
      {publicKey ? publicKey.toString().slice(0, 8) : 'Connect Wallet'}
    </Button>
  );
}
```

### ICP Timer: Schedule Solana Payment

```motoko
// src/timer/main.mo
import Solana "solana";
import Arc "arc_service";

public func schedulePayment(subscription: Subscription) : async () {
  // Build Solana transaction
  let tx = Solana.buildPaymentTransaction({
    from = subscription.subscriberAddress;
    to = subscription.merchantAddress;
    amount = subscription.price;
  });

  // Sign with Arc threshold ECDSA
  let signedTx = await Arc.signSolanaTransaction(tx);

  // Execute on Solana
  await Solana.sendTransaction(signedTx);
};
```

## Migration from EVM

### What Changed:

| Component | Before (EVM) | After (Solana) |
|-----------|--------------|----------------|
| Wallet | MetaMask | Phantom/Solflare |
| SDK | ethers.js | @solana/web3.js |
| Network | Ethereum | Solana |
| Backend Signing | Ethereum account | Solana account |
| Payment Execution | EVM chain | Solana |
| Treasury | Safe/Gnosis | Squads Protocol |

### Files Updated:

1. **backend/src/aleph.ts**
   - Changed from `ethereum` to `solana`
   - Updated key format (Ethereum private key → Solana byte array)
   - Updated signing logic

2. **backend/.env**
   - `ETHEREUM_PRIVATE_KEY` → `SOLANA_PRIVATE_KEY`
   - Format: `[161,127,209,...]` (byte array)

3. **frontend/src/lib/solana.ts**
   - Solana wallet adapter integration
   - Solana transaction building

4. **src/timer/solana.mo**
   - Solana opcode implementation
   - Instruction building for Solana VM

## Deployment Strategy

### Phase 1: Current (Express Backend) ✅
```
Frontend → Express API → Aleph.im
           (Solana)       (Solana-signed)
```

**Status**: ✅ Running in development

**Backend**: http://localhost:3001
**Account**: Solana keypair

### Phase 2: ICP Canister Migration
```
Frontend → ICP Canister → Aleph.im
           (Solana)         (Solana-signed)
```

**Timeline**: 6-8 weeks

**Benefits**:
- Fully decentralized
- No server costs
- Automatic scaling
- Built-in HTTPS

### Phase 3: Full Production
```
Frontend (Vercel)
    ↓
ICP Canister Backend (Solana signing)
    ↓
┌─────────────┬──────────────┬───────────────┐
│             │              │               │
Aleph.im   ICP Timer    Squads Protocol
(Storage)  (Payments)    (Treasuries)
```

## Testing

### Test Solana Integration

```bash
# 1. Backend
cd backend
npm run dev

# Should see:
# ✅ Aleph account initialized (Solana): 2XbfC...
# ✅ Ready to accept requests!

# 2. Test API
curl http://localhost:3001/health

# Should return:
# {"status":"healthy","alephAccount":"2XbfC..."}
```

### Generate Solana Keypair

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Generate new keypair
solana-keygen new --no-bip39-passphrase

# Output:
# [161,127,209,...]  ← Use this in .env
```

## Security

### Private Key Management

**Development:**
```bash
SOLANA_PRIVATE_KEY=[161,127,...]  # Generated test key
```

**Production:**
```bash
# Use secrets manager
# - AWS Secrets Manager
# - Railway secrets
# - Environment variables (encrypted)
```

**Best Practices:**
- ✅ Never commit .env files
- ✅ Use dedicated backend keypair
- ✅ Rotate keys regularly
- ✅ Monitor wallet balance
- ✅ Use hardware wallet for high-value operations

## Cost Analysis

### Solana Transactions
- Transfer: ~0.000005 SOL (~$0.0005)
- Program invoke: ~0.00001 SOL (~$0.001)
- Squads proposal: ~0.0001 SOL (~$0.01)

### Aleph.im Storage
- Free tier: 100GB
- Paid: $0.50/GB/month

### ICP Canister (Future)
- Storage: ~$5/GB/year
- Compute: ~$0.50 per million instructions
- HTTPS outcalls: ~$0.02 per 1000 calls

**Total Monthly Cost (1000 users):**
- Solana fees: ~$10
- Aleph storage: ~$5
- ICP canister: ~$2
- **Total: ~$17/month**

**Compare to traditional:**
- AWS (EC2 + RDS + S3): ~$200-500/month
- **Savings: 90-95%** 🎉

## Resources

- [Solana Docs](https://docs.solana.com)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Squads Protocol](https://squads.so/docs)
- [Aleph.im Docs](https://docs.aleph.im)
- [ICP Threshold ECDSA](https://internetcomputer.org/docs/current/developer-docs/integrations/t-ecdsa/)

## Support

For questions or issues:
- Backend Solana integration: `backend/README.md`
- ICP canister: `backend/icp-canister/README.md`
- Recurring payments: `doc/PAYMENT_FLOWS.md`
- Guild treasuries: `doc/SQUADS_INTEGRATION_GUIDE.md`

---

**Status**: ✅ Solana-first architecture fully implemented and running!
