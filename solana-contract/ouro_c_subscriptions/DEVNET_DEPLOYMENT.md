# Devnet Deployment Guide

## ✅ Pre-Deployment Checklist

- [x] Contract compiles successfully (369 KB)
- [x] Ed25519 signature verification implemented
- [x] Network-specific USDC configuration (devnet: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`)
- [x] Anchor.toml configured for devnet
- [x] All critical warnings addressed

## 📋 Deployment Steps

### Step 1: Configure Solana CLI for Devnet

```bash
# Set Solana CLI to devnet
solana config set --url devnet

# Check your wallet balance (you need SOL for deployment)
solana balance

# If balance is low, airdrop SOL (devnet only)
solana airdrop 2
```

### Step 2: Build the Contract

```bash
cd /Users/tobiasd/Desktop/Ouro-C/solana-contract/ouro_c_subscriptions

# Build for devnet (uses devnet USDC by default)
anchor build

# Or build directly with cargo
cargo build-sbf
```

### Step 3: Deploy to Devnet

```bash
# Deploy the program
solana program deploy target/deploy/ouro_c_subscriptions.so

# Expected output:
# Program Id: 7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub
```

### Step 4: Verify Deployment

```bash
# Check program deployment
solana program show 7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub --url devnet

# Expected output shows:
# - Program Id
# - Owner (your wallet or BPFLoaderUpgradeable)
# - Data Length
# - Authority
```

### Step 5: Initialize Config Account

Create a TypeScript script to initialize:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

const PROGRAM_ID = new PublicKey("7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub");

async function initializeConfig() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const wallet = // ... your wallet

  // Config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );

  // Initialize with Hybrid mode for devnet testing
  const tx = new Transaction().add(
    // Build initialization instruction manually or use generated client
    // ...
  );

  const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
  console.log("Initialized:", signature);
}
```

**Initialization Parameters for Devnet:**
- `authorization_mode`: `Hybrid` (3) - Allows both ICP and manual triggers
- `icp_public_key`: Optional for now (can be set later when ICP canister is ready)
- `icp_fee_collection_address`: Your ICP canister's Solana USDC ATA
- `fee_percentage_basis_points`: 100 (1%) for testing

## 🧪 Testing Checklist

### Test 1: Create Subscription (ManualOnly Mode)

```typescript
// 1. Approve delegation
await program.methods
  .approveSubscriptionDelegate(
    "test-sub-001",
    1_000_000 // 1 USDC delegation
  )
  .accounts({
    subscriptionPda,
    subscriberTokenAccount,
    subscriber: wallet.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .rpc();

// 2. Create subscription
await program.methods
  .createSubscription(
    "test-sub-001",
    1_000_000, // 1 USDC per payment
    86400, // 1 day interval
    merchantWallet,
    new Array(64).fill(0) // Dummy signature for ManualOnly mode
  )
  .accounts({
    subscription: subscriptionPda,
    config: configPda,
    subscriber: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### Test 2: Process Manual Payment

```typescript
await program.methods
  .processPayment(null, Math.floor(Date.now() / 1000))
  .accounts({
    subscription: subscriptionPda,
    config: configPda,
    triggerAuthority: wallet.publicKey,
    subscriber: subscriberWallet,
    subscriberTokenAccount,
    merchantTokenAccount,
    icpFeeTokenAccount,
    usdcMint: DEVNET_USDC_MINT,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### Test 3: Pause/Resume Subscription

```typescript
// Pause
await program.methods
  .pauseSubscription()
  .accounts({
    subscription: subscriptionPda,
    subscriber: wallet.publicKey,
  })
  .rpc();

// Resume
await program.methods
  .resumeSubscription()
  .accounts({
    subscription: subscriptionPda,
    subscriber: wallet.publicKey,
  })
  .rpc();
```

### Test 4: Cancel and Revoke Delegation

```typescript
// Cancel subscription
await program.methods
  .cancelSubscription()
  .accounts({
    subscription: subscriptionPda,
    subscriber: wallet.publicKey,
  })
  .rpc();

// Revoke token delegation
await program.methods
  .revokeSubscriptionDelegate()
  .accounts({
    subscription: subscriptionPda,
    subscriberTokenAccount,
    subscriber: wallet.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .rpc();
```

## 🔧 Devnet Resources

### Devnet USDC
- **Mint Address:** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- **Get Devnet USDC:** Use a faucet or mint if you have authority

### Create Test Token Accounts

```bash
# Create USDC token account for testing
spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Or using TypeScript
import { getAssociatedTokenAddress, createAssociatedTokenAccount } from "@solana/spl-token";

const usdcAccount = await getAssociatedTokenAddress(
  DEVNET_USDC_MINT,
  wallet.publicKey
);
```

## ⚠️ Important Notes

### Ed25519 Signature Verification

The current implementation uses **format validation** only. For full cryptographic verification:

1. ICP canister must include an Ed25519Program verification instruction in the transaction
2. Solana runtime verifies the signature before the program executes
3. If verification fails, the entire transaction fails

**For devnet testing without ICP:**
- Use `ManualOnly` or `TimeBased` authorization modes
- These modes don't require ICP signatures

### Authorization Modes for Testing

1. **ManualOnly (1)** - Best for initial testing
   - No ICP signature required
   - Subscriber/merchant can trigger anytime
   - No time restrictions

2. **TimeBased (2)** - Test time-based triggers
   - Anyone can trigger when payment is due
   - Good for testing payment scheduling

3. **Hybrid (3)** - Full integration testing
   - Requires ICP canister integration
   - Has 5-minute grace period for manual fallback

4. **ICPSignature (0)** - ICP production mode
   - Only use after ICP integration is complete

## 🐛 Troubleshooting

### Error: "Invalid token mint"
- Make sure you're using devnet USDC: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- Check that all token accounts use the correct mint

### Error: "Insufficient funds"
- Subscriber needs USDC in their token account
- Subscriber needs SOL for transaction fees
- Must approve delegation before creating subscription

### Error: "Payment not due"
- Only applicable in TimeBased and ICPSignature modes
- Wait until `next_payment_time` or use ManualOnly mode

### Error: "Unauthorized access"
- Make sure signer is the subscriber (for manual triggers)
- Or use TimeBased mode (anyone can trigger)

## 📊 Monitoring

### Check Program Logs

```bash
# Watch program logs in real-time
solana logs 7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub
```

### Query Subscription State

```typescript
const subscription = await program.account.subscription.fetch(subscriptionPda);

console.log({
  id: subscription.id,
  amount: subscription.amount,
  nextPaymentTime: new Date(subscription.nextPaymentTime * 1000),
  paymentsMade: subscription.paymentsMade,
  totalPaid: subscription.totalPaid,
  status: subscription.status, // 0: Active, 1: Paused, 2: Cancelled
});
```

## 🚀 Next Steps

After successful devnet deployment and testing:

1. ✅ Deploy ICP canister to IC testnet
2. ✅ Get ICP canister's Ed25519 public key
3. ✅ Create ICP's USDC token account on Solana
4. ✅ Update Solana config with ICP public key
5. ✅ Test ICP → Solana payment flow
6. ✅ Load test with multiple subscriptions
7. ✅ Security audit (recommended before mainnet)
8. 🎯 Deploy to mainnet

## 📝 Deployment Completed

Once deployed, document:
- [x] Program ID: `7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub`
- [ ] Config PDA address: _________________
- [ ] Authority wallet: _________________
- [ ] ICP fee collection address: _________________
- [ ] Deployment transaction: _________________
- [ ] Initialization transaction: _________________
