# Escrow System - Use Case Simulation

## Test Environment Setup
```bash
# Network: Solana Devnet
# USDC Mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
# Program ID: 7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub
```

---

## Use Case 1: One-Time Purchase (Single Payment)

### Scenario
- Customer: Alice
- Merchant: Coffee Shop
- Amount: 5 USDC
- Type: One-time purchase
- Platform Fee: 2% (0.10 USDC)

### Flow Simulation

#### Step 1: Subscription Creation
```typescript
// Alice creates one-time subscription
const subscriptionId = "coffee_purchase_001";
const amount = 5_000_000; // 5 USDC (6 decimals)
const intervalSeconds = 86400; // 1 day (but won't repeat - one-time)
const merchantAddress = new PublicKey("COFFEE_SHOP_WALLET");
const merchantName = "Coffee Shop Downtown";
const reminderDays = 1;

await program.methods
  .createSubscription(
    subscriptionId,
    new BN(amount),
    intervalSeconds,
    merchantAddress,
    merchantName,
    reminderDays,
    icpSignature // Ed25519 signature from ICP
  )
  .accounts({
    subscription: subscriptionPda,
    config: configPda,
    subscriber: alice.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([alice])
  .rpc();
```

**Expected State After Creation:**
```
Subscription {
  id: "coffee_purchase_001",
  subscriber: Alice,
  merchant: Coffee Shop,
  amount: 5_000_000,
  interval_seconds: 86400,
  escrow_pda: "EscrowPDA...", // Auto-derived
  escrow_balance: 0, // Not yet paid
  payments_made: 0,
  total_paid: 0,
  status: Active
}
```

#### Step 2: Token Delegation Approval
```typescript
// Alice approves subscription PDA to spend her USDC
const delegationAmount = 5_000_000; // Exactly 5 USDC for one-time

await program.methods
  .approveSubscriptionDelegate(subscriptionId, new BN(delegationAmount))
  .accounts({
    subscriptionPda,
    subscriberTokenAccount: aliceUsdc,
    subscriber: alice.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([alice])
  .rpc();
```

**Expected State:**
```
Alice's USDC Token Account {
  delegate: SubscriptionPDA,
  delegated_amount: 5_000_000
}
```

#### Step 3: Payment Processing (ICP Timer Triggered)
```typescript
// ICP canister triggers payment via process_trigger (opcode 0)
const escrowTokenAccount = await getOrCreateEscrowAccount(subscriptionId);

await program.methods
  .processTrigger(0, icpSignature, timestamp)
  .accounts({
    subscription: subscriptionPda,
    config: configPda,
    triggerAuthority: icpCanister,
    subscriberTokenAccount: aliceUsdc,
    escrowUsdcAccount: escrowTokenAccount, // ← Escrow receives funds
    icpFeeUsdcAccount: icpTreasuryUsdc,
    usdcMint: USDC_MINT,
    subscriptionPda,
    subscriber: alice.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    memoProgram: MEMO_PROGRAM_ID,
    instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
  })
  .rpc();
```

**Token Transfers Executed:**
```
Alice USDC → ICP Treasury:  0.10 USDC (2% fee)
Alice USDC → Escrow PDA:    4.90 USDC (merchant amount)
```

**Expected State After Payment:**
```
Subscription {
  escrow_balance: 4_900_000, // 4.90 USDC in escrow
  payments_made: 1,
  total_paid: 5_000_000,
  last_payment_time: Some(timestamp)
}

Escrow Token Account {
  owner: EscrowPDA,
  amount: 4_900_000 // 4.90 USDC
}

ICP Treasury Account {
  amount: += 100_000 // +0.10 USDC
}
```

#### Step 4: Merchant Claim After Off-Ramp
```typescript
// Off-ramp API confirms: Alice paid $4.90 in fiat
// Coffee Shop can now claim USDC from escrow

await program.methods
  .claimFromEscrow(subscriptionId, new BN(4_900_000))
  .accounts({
    subscription: subscriptionPda,
    escrowTokenAccount,
    merchantTokenAccount: coffeeShopUsdc,
    merchant: coffeeShop.publicKey,
    escrowPda,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([coffeeShop])
  .rpc();
```

**Token Transfer:**
```
Escrow PDA → Coffee Shop:  4.90 USDC
```

**Expected Final State:**
```
Subscription {
  escrow_balance: 0, // Fully claimed
  payments_made: 1,
  total_paid: 5_000_000
}

Escrow Token Account {
  amount: 0 // Empty
}

Coffee Shop USDC Account {
  amount: += 4_900_000 // +4.90 USDC
}
```

### ✅ One-Time Purchase Complete
- Alice paid once
- Platform fee collected
- Merchant claimed after fiat confirmation
- No recurring payments

---

## Use Case 2: Recurring Subscription (Monthly Payments)

### Scenario
- Customer: Bob
- Merchant: Netflix Clone (StreamFlix)
- Amount: 9.99 USDC/month
- Type: Recurring subscription
- Platform Fee: 2% (0.20 USDC per payment)
- Duration: Simulating 3 months

### Flow Simulation

#### Step 1: Subscription Creation
```typescript
const subscriptionId = "streamflix_bob_premium";
const amount = 9_990_000; // 9.99 USDC
const intervalSeconds = 2_592_000; // 30 days (monthly)
const merchantAddress = new PublicKey("STREAMFLIX_WALLET");
const merchantName = "StreamFlix Premium";
const reminderDays = 7; // Remind 7 days before

await program.methods
  .createSubscription(
    subscriptionId,
    new BN(amount),
    intervalSeconds,
    merchantAddress,
    merchantName,
    reminderDays,
    icpSignature
  )
  .accounts({
    subscription: subscriptionPda,
    config: configPda,
    subscriber: bob.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([bob])
  .rpc();
```

**Expected State:**
```
Subscription {
  id: "streamflix_bob_premium",
  subscriber: Bob,
  merchant: StreamFlix,
  amount: 9_990_000, // 9.99 USDC per payment
  interval_seconds: 2_592_000, // Monthly
  next_payment_time: now + 2_592_000,
  escrow_pda: "EscrowPDA...",
  escrow_balance: 0,
  payments_made: 0
}
```

#### Step 2: Token Delegation (12 Months Approval)
```typescript
// Bob approves for 12 months of payments
// Frontend calculates: 9.99 USDC × 12 = 119.88 USDC
const delegationAmount = 119_880_000; // 12 months worth

await program.methods
  .approveSubscriptionDelegate(subscriptionId, new BN(delegationAmount))
  .accounts({
    subscriptionPda,
    subscriberTokenAccount: bobUsdc,
    subscriber: bob.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([bob])
  .rpc();
```

**Expected State:**
```
Bob's USDC Token Account {
  delegate: SubscriptionPDA,
  delegated_amount: 119_880_000 // Enough for 12 payments
}
```

---

### Month 1: First Payment

#### Step 3a: Payment Processing (Day 30)
```typescript
// ICP timer triggers first monthly payment
await program.methods
  .processTrigger(0, icpSignature, timestamp)
  .accounts({
    subscription: subscriptionPda,
    config: configPda,
    triggerAuthority: icpCanister,
    subscriberTokenAccount: bobUsdc,
    escrowUsdcAccount: escrowTokenAccount,
    icpFeeUsdcAccount: icpTreasuryUsdc,
    // ... other accounts
  })
  .rpc();
```

**Transfers:**
```
Bob USDC → ICP Treasury:  0.20 USDC (2% fee)
Bob USDC → Escrow PDA:    9.79 USDC (merchant amount)
```

**State After Month 1 Payment:**
```
Subscription {
  escrow_balance: 9_790_000, // 9.79 USDC
  payments_made: 1,
  total_paid: 9_990_000,
  next_payment_time: now + 2_592_000 (30 days later)
}

Bob's Token Account {
  delegated_amount: 109_890_000 // Still has 11 payments left
}
```

#### Step 3b: Merchant Claim (Month 1)
```typescript
// StreamFlix claims Month 1 revenue
await program.methods
  .claimFromEscrow(subscriptionId, new BN(9_790_000))
  .accounts({
    subscription: subscriptionPda,
    escrowTokenAccount,
    merchantTokenAccount: streamflixUsdc,
    merchant: streamflix.publicKey,
    escrowPda,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([streamflix])
  .rpc();
```

**State After Claim:**
```
Subscription {
  escrow_balance: 0, // Claimed
}

StreamFlix Account {
  amount: += 9_790_000 // +9.79 USDC
}
```

---

### Month 2: Second Payment

#### Step 4a: Payment Processing (Day 60)
```typescript
// ICP timer triggers second payment
await program.methods
  .processTrigger(0, icpSignature, timestamp)
  .accounts({ /* same as before */ })
  .rpc();
```

**State After Month 2 Payment:**
```
Subscription {
  escrow_balance: 9_790_000, // Another 9.79 USDC
  payments_made: 2,
  total_paid: 19_980_000, // 2 × 9.99 USDC
  next_payment_time: now + 2_592_000
}
```

#### Step 4b: Merchant Claim (Month 2)
```typescript
await program.methods
  .claimFromEscrow(subscriptionId, new BN(9_790_000))
  .signers([streamflix])
  .rpc();
```

---

### Month 3: Third Payment

#### Step 5a: Payment Processing (Day 90)
**State After Month 3 Payment:**
```
Subscription {
  escrow_balance: 9_790_000,
  payments_made: 3,
  total_paid: 29_970_000, // 3 × 9.99 USDC
}
```

#### Step 5b: Merchant Claim (Month 3)
```typescript
await program.methods
  .claimFromEscrow(subscriptionId, new BN(9_790_000))
  .signers([streamflix])
  .rpc();
```

---

### Subscription Cancellation

#### Step 6: Bob Cancels After 3 Months
```typescript
// Bob decides to cancel
await program.methods
  .cancelSubscription()
  .accounts({
    subscription: subscriptionPda,
    subscriber: bob.publicKey,
  })
  .signers([bob])
  .rpc();
```

**State After Cancel:**
```
Subscription {
  status: Cancelled,
  escrow_balance: 0, // All claimed
  payments_made: 3,
  total_paid: 29_970_000
}
```

#### Step 7: Revoke Delegation
```typescript
// Bob revokes remaining delegation
await program.methods
  .revokeSubscriptionDelegate()
  .accounts({
    subscription: subscriptionPda,
    subscriberTokenAccount: bobUsdc,
    subscriber: bob.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([bob])
  .rpc();
```

**Final State:**
```
Bob's Token Account {
  delegate: None,
  delegated_amount: 0
}

// Bob's remaining approved balance (9 months × 9.99) is now available
```

### ✅ Recurring Subscription Complete
- Bob subscribed for 3 months
- 3 automatic payments processed
- Platform collected 3 × 0.20 = 0.60 USDC in fees
- Merchant claimed 3 × 9.79 = 29.37 USDC total
- Bob cancelled and revoked delegation
- No funds stuck in escrow

---

## 🔍 Edge Cases to Test

### Edge Case 1: Partial Claim
```typescript
// Merchant claims partial amount
await program.methods
  .claimFromEscrow(subscriptionId, new BN(5_000_000)) // Only 5 USDC
  .rpc();

// Expected:
// - escrow_balance decrements by 5 USDC
// - Remaining balance stays in escrow
// - Merchant can claim again later
```

### Edge Case 2: Over-Claim Attempt
```typescript
// Merchant tries to claim more than balance
await program.methods
  .claimFromEscrow(subscriptionId, new BN(100_000_000)) // 100 USDC
  .rpc();

// Expected: ERROR - InsufficientAmount
// Validation: amount > escrow_balance
```

### Edge Case 3: Non-Merchant Claim Attempt
```typescript
// Alice (not merchant) tries to claim
await program.methods
  .claimFromEscrow(subscriptionId, new BN(1_000_000))
  .accounts({
    merchant: alice.publicKey, // Wrong merchant
    // ...
  })
  .signers([alice])
  .rpc();

// Expected: ERROR - UnauthorizedAccess
// Constraint: has_one = merchant
```

### Edge Case 4: Multiple Payments Before Claim
```typescript
// Month 1 payment → escrow_balance = 9.79 USDC
// Month 2 payment → escrow_balance = 19.58 USDC
// Month 3 payment → escrow_balance = 29.37 USDC

// Merchant claims all at once
await program.methods
  .claimFromEscrow(subscriptionId, new BN(29_370_000))
  .rpc();

// Expected:
// - All accumulated funds transferred
// - escrow_balance = 0
```

### Edge Case 5: Insufficient Delegation
```typescript
// Bob only approved 2 months, but 3rd month arrives
// Delegation: 2 × 9.99 = 19.98 USDC
// After 2 payments, delegated_amount = 0

// 3rd payment attempt
await program.methods
  .processTrigger(0, icpSignature, timestamp)
  .rpc();

// Expected: ERROR - InsufficientDelegation
// Constraint: delegated_amount >= subscription.amount
```

---

## 🐛 Issues Found During Simulation

### Issue 1: ❌ **CRITICAL - Subscription Interval Validation**

**Problem:** Contract requires `interval_seconds >= 3600` (1 hour minimum)

**Location:** `instruction_handlers.rs:148-150`
```rust
require!(interval_seconds > 0, ErrorCode::InvalidInterval);
require!(interval_seconds >= 3600, ErrorCode::InvalidInterval); // ← TOO STRICT
require!(interval_seconds <= 365 * 24 * 60 * 60, ErrorCode::InvalidInterval);
```

**Impact:**
- ❌ Cannot create one-time purchases (they should use interval = -1 or very short)
- ❌ Cannot create subscriptions shorter than 1 hour
- ❌ Blocks use cases like: per-minute billing, hourly billing

**Fix Needed:** Support one-time payments with special interval value

---

### Issue 2: ⚠️ **Escrow Balance Overflow Protection**

**Current Code:** `payment_helpers.rs:263`
```rust
subscription.escrow_balance = subscription.escrow_balance
    .checked_add(merchant_amount)
    .ok_or(ErrorCode::MathOverflow)?;
```

**Status:** ✅ Already protected with checked_add

---

### Issue 3: ⚠️ **Escrow Token Account Creation**

**Problem:** Frontend must create escrow token account before first payment

**Impact:**
- ❌ Payment will fail if escrow account doesn't exist
- ⚠️ Not automatically created by program

**Fix Needed:** Document requirement or add auto-creation in program

---

## 📋 Testing Checklist

### One-Time Purchase
- [ ] Create subscription with short interval
- [ ] Approve exact delegation amount
- [ ] Process single payment
- [ ] Verify escrow_balance updated
- [ ] Merchant claims full amount
- [ ] Verify escrow_balance = 0
- [ ] Subscription does not repeat

### Recurring Subscription
- [ ] Create subscription with monthly interval
- [ ] Approve 12 months delegation
- [ ] Process 3 monthly payments
- [ ] Verify escrow_balance accumulates
- [ ] Merchant claims after each payment
- [ ] Cancel subscription
- [ ] Revoke delegation
- [ ] Verify no future payments possible

### Edge Cases
- [ ] Partial claim (less than balance)
- [ ] Over-claim attempt (should fail)
- [ ] Non-merchant claim (should fail)
- [ ] Multiple payments before claim
- [ ] Insufficient delegation (should fail)
- [ ] Claim with 0 amount (should fail)

---

## 🔧 Required Fixes

1. **Support One-Time Payments:**
   - Allow `interval_seconds = -1` for one-time purchases
   - OR lower minimum interval to 1 second

2. **Document Escrow Account Creation:**
   - Frontend must create associated token account for escrow PDA
   - Add helper function or documentation

3. **Add Escrow Account Validation:**
   - Ensure escrow account exists in ProcessTrigger
   - Better error message if missing
