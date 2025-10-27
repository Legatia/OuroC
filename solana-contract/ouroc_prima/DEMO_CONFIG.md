# Demo Configuration Guide

## ✅ 10-Second Recurring Payments Enabled

The contract is now configured to support **10-second recurring payments** for demo purposes.

---

## 📋 Interval Settings

### Minimum Interval: **10 seconds**
**Location:** `instruction_handlers.rs:149`
```rust
// Interval validation: -1 for one-time, or >= 10 seconds for recurring (10s for demo purposes)
require!(interval_seconds == -1 || interval_seconds >= 10, ErrorCode::InvalidInterval);
```

### Maximum Interval: **1 year**
```rust
require!(interval_seconds <= 365 * 24 * 60 * 60, ErrorCode::InvalidInterval);
```

---

## 🎬 Demo Use Cases

### 1. Quick Recurring Demo (Every 10 Seconds)
Perfect for showing automatic recurring payments in real-time during a demo.

```typescript
// Frontend code
await createSubscription({
  subscriptionId: "demo_10s_recurring",
  amount: 1_000_000,           // 1 USDC per payment
  intervalSeconds: 10,          // ← Every 10 seconds
  merchantAddress,
  merchantName: "Demo Merchant",
  reminderDays: 1,
});

// Demo timeline:
// 0:00 - Subscription created
// 0:10 - First payment (1 USDC → 0.02 fee + 0.98 escrow)
// 0:20 - Second payment (1 USDC → 0.02 fee + 0.98 escrow)
// 0:30 - Third payment (1 USDC → 0.02 fee + 0.98 escrow)
// escrow_balance = 2.94 USDC after 3 payments
```

**Delegation for 5 minutes of demo:**
```typescript
const durationMinutes = 5;
const intervalSeconds = 10;
const amountPerPayment = 1_000_000; // 1 USDC

const numPayments = (durationMinutes * 60) / intervalSeconds; // 30 payments
const totalDelegation = amountPerPayment * numPayments;       // 30 USDC

await approveDelegate(subscriptionId, totalDelegation);
```

### 2. Medium Interval Demo (Every 1 Minute)
Good balance between demo speed and realism.

```typescript
await createSubscription({
  subscriptionId: "demo_1min_recurring",
  amount: 2_000_000,           // 2 USDC per payment
  intervalSeconds: 60,         // Every 1 minute
  merchantAddress,
  merchantName: "Demo Merchant",
  reminderDays: 1,
});

// Demo timeline:
// 0:00 - Subscription created
// 1:00 - First payment
// 2:00 - Second payment
// 3:00 - Third payment
```

### 3. One-Time Purchase Demo
Instant payment, no recurring.

```typescript
await createSubscription({
  subscriptionId: "demo_onetime",
  amount: 5_000_000,           // 5 USDC
  intervalSeconds: -1,         // ← One-time purchase
  merchantAddress,
  merchantName: "Coffee Shop",
  reminderDays: 1,             // Not used for one-time
});

// Demo timeline:
// 0:00 - Subscription created
// 0:00 - Payment processes immediately
// 0:00 - Auto-cancelled (status = Cancelled)
```

---

## 🔍 All Supported Intervals

| Interval | Use Case | Demo Suitability |
|----------|----------|------------------|
| `-1` | One-time purchase | ⭐⭐⭐ Perfect for quick demos |
| `10s` | Ultra-fast recurring | ⭐⭐⭐ Best for live demos |
| `60s` (1 min) | Fast recurring | ⭐⭐ Good for demos |
| `300s` (5 min) | Medium recurring | ⭐ Slower demos |
| `3600s` (1 hour) | Hourly billing | Production |
| `86400s` (1 day) | Daily billing | Production |
| `2592000s` (30 days) | Monthly billing | ⭐⭐⭐ Production standard |
| `31536000s` (1 year) | Annual billing | Production |

---

## 🎯 Demo Scenarios

### Scenario A: Quick Escrow Demo (10-second intervals)
**Duration:** 1 minute
**Goal:** Show escrow accumulation and merchant claim

```typescript
// 1. Create 10-second recurring subscription
const sub = await createSubscription({
  subscriptionId: "escrow_demo",
  amount: 100_000,              // 0.1 USDC per payment
  intervalSeconds: 10,
  merchantAddress,
  merchantName: "Demo Store",
  reminderDays: 1,
});

// 2. Approve 1 minute worth (6 payments × 0.1 = 0.6 USDC)
await approveDelegate("escrow_demo", 600_000);

// 3. Watch payments accumulate in escrow
// 0:10 → escrow_balance = 0.098 USDC
// 0:20 → escrow_balance = 0.196 USDC
// 0:30 → escrow_balance = 0.294 USDC
// 0:40 → escrow_balance = 0.392 USDC
// 0:50 → escrow_balance = 0.490 USDC
// 1:00 → escrow_balance = 0.588 USDC

// 4. Merchant claims all at once
await claimFromEscrow("escrow_demo", 588_000); // Claim all

// Result: escrow_balance = 0, merchant received 0.588 USDC
```

### Scenario B: One-Time + Recurring Comparison
**Duration:** 30 seconds
**Goal:** Show difference between one-time and recurring

```typescript
// Create one-time
const oneTime = await createSubscription({
  subscriptionId: "onetime_demo",
  amount: 1_000_000,
  intervalSeconds: -1,
  merchantAddress,
  merchantName: "Coffee Shop",
  reminderDays: 1,
});

// Create recurring
const recurring = await createSubscription({
  subscriptionId: "recurring_demo",
  amount: 1_000_000,
  intervalSeconds: 10,
  merchantAddress,
  merchantName: "Subscription Service",
  reminderDays: 1,
});

// Result:
// - One-time: Pays once, auto-cancels
// - Recurring: Pays every 10 seconds until cancelled
```

---

## ⚙️ ICP Timer Configuration

The ICP timer canister should be configured to check subscriptions frequently for demo purposes.

**Recommended Settings:**
```motoko
// Check for due payments every 5 seconds during demo
let checkInterval = 5; // seconds

// This ensures 10-second subscriptions are processed promptly
```

**Production Settings:**
```motoko
// Check every 60 seconds in production
let checkInterval = 60; // seconds
```

---

## 🧪 Testing the 10-Second Interval

### Quick Test (Terminal)
```bash
# 1. Build and deploy
cd /Users/tobiasd/Desktop/Ouro-C/solana-contract/ouroc_prima
anchor build
anchor deploy --provider.cluster devnet

# 2. Test subscription creation with 10s interval
anchor test -- --features "test-interval-10s"
```

### Manual Test (Frontend)
1. Navigate to subscription creation page
2. Enter amount: `1 USDC`
3. Select interval: `Custom` → `10 seconds`
4. Create subscription
5. Approve delegation for 1 minute (6 payments)
6. Watch payments process every 10 seconds
7. Check escrow balance growth
8. Merchant claims from escrow

---

## 📊 Performance Considerations

### 10-Second Intervals
- ✅ Great for demos
- ✅ Shows system responsiveness
- ⚠️ High transaction count in production
- ⚠️ May hit rate limits on devnet

### Production Recommendation
For production, consider minimum interval of:
- **1 hour** for most use cases
- **1 day** for typical subscriptions
- **30 days** for monthly billing

**To change for production:**
```rust
// In instruction_handlers.rs:149
require!(interval_seconds == -1 || interval_seconds >= 3600, ErrorCode::InvalidInterval);
//                                                      ^^^^ 1 hour minimum
```

---

## 🎓 Demo Script

### 5-Minute Live Demo

**Minute 0-1: One-Time Purchase**
```
"Let's start with a simple coffee purchase for 5 USDC..."
[Create one-time subscription, pay, auto-cancel]
"Notice it auto-cancelled after payment - that's our one-time purchase feature."
```

**Minute 1-3: Recurring Subscription Setup**
```
"Now let's create a recurring subscription - every 10 seconds for demo speed..."
[Create 10s recurring, approve 2 minutes delegation]
"I've approved 2 minutes worth of payments - 12 total."
```

**Minute 3-4: Watch Payments Flow**
```
"Watch the escrow balance grow with each automatic payment..."
[Show escrow_balance incrementing every 10 seconds]
"Payment 1: 0.98 USDC in escrow"
"Payment 2: 1.96 USDC in escrow"
"Payment 3: 2.94 USDC in escrow"
```

**Minute 4-5: Merchant Claim**
```
"Now the merchant claims from escrow after off-ramp confirms..."
[Execute claim_from_escrow]
"Claimed 2.94 USDC from escrow - balance now 0."
```

---

## ✅ Verification Checklist

- [x] Contract supports 10-second minimum interval
- [x] Build successful with new validation
- [x] One-time payments still work (interval = -1)
- [x] Frontend accepts flexible intervals
- [x] ICP timer can be configured for frequent checks
- [x] Demo scenarios documented
- [x] Production migration path clear

---

## 🚀 Deploy for Demo

```bash
# 1. Ensure you're on devnet
anchor deploy --provider.cluster devnet

# 2. Update frontend environment
# VITE_SOLANA_CONTRACT=7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub
# VITE_SOLANA_NETWORK=devnet

# 3. Test 10-second subscription
# Use frontend or CLI to create subscription with interval = 10

# 4. Monitor on Solana Explorer
# https://explorer.solana.com/address/7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub?cluster=devnet
```

---

**Ready for Demo! 🎉**

The contract now supports 10-second recurring payments, perfect for live demonstrations while maintaining full production capability for longer intervals.
