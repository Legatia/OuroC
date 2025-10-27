# OuroC Subscription Work Cycle

Complete flowchart of the subscription lifecycle based on the current codebase.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     OUROC SUBSCRIPTION LIFECYCLE                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: INITIALIZATION (One-time setup)

```
┌────────────────┐
│  Deploy        │
│  Solana        │──► Initialize config, set fee %, ICP key
│  Contract      │
└────────────────┘

┌────────────────┐
│  Deploy ICP    │
│  Canister      │──► Call initialize_canister()
└────────┬───────┘    ├─► Generate Threshold Ed25519 wallets
         │            ├─► main_wallet_address
         │            └─► fee_collection_address
         │
         └──────────► Store wallet addresses in ICP
```

**Solana Contract Initialization:**
- Deploy to devnet/mainnet
- Set authorization mode (ICP signature/manual/hybrid)
- Configure fee percentage (e.g., 100 basis points = 1%)
- Set ICP public key for signature verification
- Set ICP fee collection address

**ICP Canister Initialization:**
- Deploy canister to IC network
- Call `initialize_canister()`
- Generate Threshold Ed25519 keypairs
- Derive Solana wallet addresses
- Store wallet addresses for fee collection

---

## PHASE 2: SUBSCRIPTION CREATION (Per user)

```
┌──────────────────────────────────────────────────────────────────────┐
│  FRONTEND (User + Wallet)                                            │
└──────────────────────────────────────────────────────────────────────┘
         │
         │ 1. User fills form:
         │    - Merchant address
         │    - Amount (10 USDC)
         │    - Token (USDC/USDT/PYUSD/DAI)
         │    - Interval (30 days)
         │    - Reminder days (3 days before)
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SOLANA BLOCKCHAIN                                                  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                     │
│  Step 1: approve_subscription_delegate()                           │
│  ┌─────────────────────────────────────────────────┐              │
│  │ • User approves Subscription PDA as delegate    │              │
│  │ • PDA can spend up to X USDC from user wallet   │              │
│  │ • Delegation is locked on-chain                 │              │
│  └─────────────────────────────────────────────────┘              │
│         │                                                          │
│         ▼                                                          │
│  Step 2: create_subscription()                                     │
│  ┌─────────────────────────────────────────────────┐              │
│  │ • Create Subscription PDA                       │              │
│  │ • Store: id, subscriber, merchant, amount,      │              │
│  │   token_mint, interval, reminder_days,          │              │
│  │   next_payment_time                             │              │
│  │ • Status: Active                                │              │
│  │ • Payments_made: 0                              │              │
│  └─────────────────────────────────────────────────┘              │
│         │                                                          │
│         │ Return: subscription_id                                 │
│         │                                                          │
└─────────┼──────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ICP CANISTER                                                       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                     │
│  Step 3: create_subscription()                                     │
│  ┌─────────────────────────────────────────────────┐              │
│  │ ICP stores minimal timer data:                  │              │
│  │ • subscription_id (matches Solana)              │              │
│  │ • solana_contract_address                       │              │
│  │ • payment_token_mint (for routing)              │              │
│  │ • reminder_days_before_payment                  │              │
│  │ • interval_seconds                              │              │
│  │ • next_execution (timestamp)                    │              │
│  │ • status: Active                                │              │
│  └─────────────────────────────────────────────────┘              │
│         │                                                          │
│         ▼                                                          │
│  Step 4: schedule_subscription_timer()                             │
│  ┌─────────────────────────────────────────────────┐              │
│  │ • Calculate delay: next_execution - now         │              │
│  │ • Create ICP Timer (setTimer)                   │              │
│  │ • Store timer_id in active_timers map           │              │
│  └─────────────────────────────────────────────────┘              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Subscription Creation Details

**Frontend Input:**
- Merchant Solana address
- Payment amount (in USDC, e.g., 10_000_000 = 10 USDC with 6 decimals)
- Payment token mint (USDC/USDT/PYUSD/DAI address)
- Interval in seconds (e.g., 2592000 = 30 days)
- Reminder days before payment (e.g., 3 days)

**Solana Transaction 1 - Approve Delegate:**
```rust
approve_subscription_delegate(
    subscription_id: "sub_12345",
    amount: 10_000_000 // Max USDC PDA can spend per payment
)
```

**Solana Transaction 2 - Create Subscription:**
```rust
create_subscription(
    subscription_id: "sub_12345",
    amount: 10_000_000,
    interval_seconds: 2592000,
    merchant_address: Pubkey,
    payment_token_mint: USDC_MINT,
    reminder_days_before_payment: 3,
    icp_canister_signature: [u8; 64]
)
```

**ICP Call - Create Timer:**
```motoko
create_subscription({
    subscription_id: "sub_12345",
    solana_contract_address: "7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub",
    payment_token_mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    reminder_days_before_payment: 3,
    interval_seconds: 2592000,
    start_time: null // Defaults to now + interval
})
```

---

## PHASE 3: NOTIFICATION TRIGGER (Optional - X days before payment)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ICP TIMER FIRES (Notification timing)                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  When: now >= (next_payment_time - reminder_days * 86400)          │
│                                                                     │
│  ┌───────────────────────────────────────┐                         │
│  │ trigger_subscription(id)              │                         │
│  │ └─► send_solana_opcode()              │                         │
│  │     ├─► opcode = 1 (Notification)     │                         │
│  │     └─► call Solana: process_trigger()│                         │
│  └───────────────────────────────────────┘                         │
│         │                                                           │
└─────────┼───────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SOLANA CONTRACT: process_trigger(opcode=1)                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                     │
│  ┌───────────────────────────────────────────────────┐            │
│  │ match opcode {                                    │            │
│  │   1 => send_notification_internal()               │            │
│  │ }                                                 │            │
│  └───────────────────────────────────────────────────┘            │
│         │                                                          │
│         ▼                                                          │
│  ┌───────────────────────────────────────────────────┐            │
│  │ send_notification_internal()                      │            │
│  │ ├─► Build memo: "Payment in X days. Y USDC"      │            │
│  │ ├─► Transfer 0.000001 SOL to subscriber          │            │
│  │ └─► Attach memo to transaction                   │            │
│  └───────────────────────────────────────────────────┘            │
│         │                                                          │
│         │ User sees notification in wallet ✅                     │
│         │                                                          │
└─────────────────────────────────────────────────────────────────────┘
```

### Notification Flow Details

**ICP Timer Trigger:**
- Timer fires at: `next_payment_time - (reminder_days * 86400 seconds)`
- For 3 days before, fires 3 days before payment is due
- Calls `trigger_subscription(id)` with opcode 1

**Solana Notification:**
```rust
send_notification_internal(ctx, memo: String) {
    // Transfer 1000 lamports (0.000001 SOL) to subscriber
    // Attach memo: "OuroC: Payment due in 3 days. Amount: 10 USDC"
    // User sees this in Phantom/Solflare transaction history
}
```

**User Experience:**
- User receives tiny SOL transfer with memo
- Wallet shows: "Payment due in 3 days. Amount: 10 USDC"
- No email, no push notification - pure on-chain

---

## PHASE 4: PAYMENT TRIGGER (Recurring)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ICP TIMER FIRES (Payment timing)                                  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  When: now >= next_execution (payment interval reached)            │
│                                                                     │
│  ┌───────────────────────────────────────┐                         │
│  │ trigger_subscription(id)              │                         │
│  │ └─► send_solana_opcode()              │                         │
│  │     ├─► opcode = 0 (Payment)          │                         │
│  │     └─► call Solana: process_trigger()│                         │
│  └───────────────────────────────────────┘                         │
│         │                                                           │
└─────────┼───────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SOLANA CONTRACT: process_trigger(opcode=0)                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                     │
│  Step 1: Opcode Routing                                            │
│  ┌───────────────────────────────────────────────────┐            │
│  │ match opcode {                                    │            │
│  │   0 => {                                          │            │
│  │     if payment_token_mint == USDC_MINT {          │            │
│  │       process_direct_usdc_payment()               │            │
│  │     } else {                                      │            │
│  │       process_swap_then_split() // TODO          │            │
│  │     }                                             │            │
│  │   }                                               │            │
│  │ }                                                 │            │
│  └───────────────────────────────────────────────────┘            │
│         │                                                          │
│         ├─────────────► PATH A: Direct USDC Payment                │
│         │                                                          │
│         │  ┌─────────────────────────────────────────────┐        │
│         │  │ process_direct_usdc_payment()               │        │
│         │  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │        │
│         │  │ 1. Read subscription PDA (source of truth)  │        │
│         │  │ 2. Calculate fee:                           │        │
│         │  │    fee = amount * fee_% / 10000             │        │
│         │  │    merchant_amount = amount - fee           │        │
│         │  │                                             │        │
│         │  │ 3. Transfer USDC (using PDA delegate):      │        │
│         │  │    ├─► Fee → ICP Treasury USDC account      │        │
│         │  │    └─► Merchant → Merchant USDC account     │        │
│         │  │                                             │        │
│         │  │ 4. Update subscription state:               │        │
│         │  │    ├─► payments_made += 1                   │        │
│         │  │    ├─► total_paid += amount                 │        │
│         │  │    └─► last_payment_time = now              │        │
│         │  └─────────────────────────────────────────────┘        │
│         │                                                          │
│         └─────────────► PATH B: Swap Payment (TODO)                │
│                                                                     │
│            ┌─────────────────────────────────────────────┐         │
│            │ process_swap_then_split()                   │         │
│            │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │         │
│            │ TODO: Jupiter/Raydium DEX Integration       │         │
│            │                                             │         │
│            │ 1. Pull payment_token from subscriber       │         │
│            │ 2. Swap via Jupiter → USDC                  │         │
│            │ 3. Slippage protection (max 0.5%)           │         │
│            │ 4. Use swapped USDC for fee split           │         │
│            │ 5. Same as direct USDC flow above           │         │
│            └─────────────────────────────────────────────┘         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
          │
          │ Transaction Success ✅
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ICP CANISTER: Handle Result                                       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                     │
│  ┌───────────────────────────────────────────────────┐            │
│  │ if success:                                       │            │
│  │   ├─► Update subscription:                        │            │
│  │   │   ├─► trigger_count += 1                      │            │
│  │   │   ├─► last_triggered = now                    │            │
│  │   │   └─► next_execution = now + interval         │            │
│  │   │                                               │            │
│  │   └─► schedule_subscription_timer() (repeat)      │            │
│  │                                                   │            │
│  │ if error:                                         │            │
│  │   ├─► Log error                                   │            │
│  │   ├─► next_execution = now + interval             │            │
│  │   └─► Reschedule timer (retry next cycle)         │            │
│  └───────────────────────────────────────────────────┘            │
│                                                                     │
│  Cycle repeats every interval_seconds ♻️                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Payment Flow Details

#### Direct USDC Payment (Current Implementation)

**ICP Trigger:**
```motoko
// ICP canister calls Solana contract
send_solana_opcode(
    contract_address: "7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub",
    subscription_id: "sub_12345",
    opcode: 0 // Payment
)
```

**Solana Processing:**
```rust
process_trigger(opcode: 0) {
    // Read subscription PDA
    let subscription = &ctx.accounts.subscription;

    // Check if USDC or other token
    if subscription.payment_token_mint == USDC_MINT {
        process_direct_usdc_payment(ctx)?;
    }
}

process_direct_usdc_payment(ctx) {
    let amount = subscription.amount; // e.g., 10_000_000 (10 USDC)
    let fee_percentage = 100; // 1% (100 basis points)

    // Calculate fee split
    let fee = (amount * fee_percentage / 10000).max(min_fee);
    let merchant_amount = amount - fee;

    // Example: 10 USDC payment with 1% fee
    // fee = 100_000 (0.1 USDC)
    // merchant_amount = 9_900_000 (9.9 USDC)

    // Transfer 1: Fee to ICP treasury
    token::transfer(
        subscriber_token_account → icp_fee_usdc_account,
        amount: fee,
        authority: subscription_pda (delegate)
    );

    // Transfer 2: Payment to merchant
    token::transfer(
        subscriber_token_account → merchant_usdc_account,
        amount: merchant_amount,
        authority: subscription_pda (delegate)
    );

    // Update state
    subscription.payments_made += 1;
    subscription.total_paid += amount;
    subscription.last_payment_time = now;
}
```

#### Multi-Token Payment with Swap (TODO - Future Implementation)

**Solana Processing with DEX:**
```rust
process_swap_then_split(ctx) {
    // TODO: Implement Jupiter/Raydium integration

    // 1. Pull payment token from subscriber
    let payment_token = subscription.payment_token_mint;
    let input_amount = subscription.amount;

    // 2. Swap via Jupiter Aggregator
    let swap_result = jupiter::swap(
        input_mint: payment_token,
        output_mint: USDC_MINT,
        input_amount: input_amount,
        slippage_bps: 50, // 0.5% max slippage
        user_account: subscriber_token_account
    );

    // 3. Use swapped USDC for fee split
    let usdc_output = swap_result.output_amount;

    // 4. Same fee processing as direct USDC
    let fee = (usdc_output * fee_percentage / 10000).max(min_fee);
    let merchant_amount = usdc_output - fee;

    // Transfers same as direct USDC flow
}
```

**ICP Result Handling:**
```motoko
// After Solana transaction completes
switch (result) {
    case (#ok(tx_hash)) {
        // Success - update timer
        subscription.trigger_count += 1;
        subscription.last_triggered = now;
        subscription.next_execution = now + interval;

        // Reschedule for next payment
        schedule_subscription_timer(subscription);

        Debug.print("Payment success: " # tx_hash);
    };
    case (#err(error)) {
        // Failure - reschedule anyway
        subscription.next_execution = now + interval;
        schedule_subscription_timer(subscription);

        Debug.print("Payment failed: " # error);
    };
}
```

---

## PHASE 5: USER ACTIONS (Optional - Anytime)

```
┌──────────────────────────────────────────────────────────────────────┐
│  USER CONTROLS (via Frontend)                                       │
└──────────────────────────────────────────────────────────────────────┘

  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │   PAUSE     │          │   RESUME    │          │   CANCEL    │
  └──────┬──────┘          └──────┬──────┘          └──────┬──────┘
         │                        │                        │
         ▼                        ▼                        ▼
    ┌────────────────┐      ┌────────────────┐      ┌────────────────┐
    │ Solana:        │      │ Solana:        │      │ Solana:        │
    │ pause_sub()    │      │ resume_sub()   │      │ cancel_sub()   │
    │ status=Paused  │      │ status=Active  │      │ status=Cancel  │
    └────────┬───────┘      └────────┬───────┘      └────────┬───────┘
             │                       │                       │
             ▼                       ▼                       ▼
    ┌────────────────┐      ┌────────────────┐      ┌────────────────┐
    │ ICP:           │      │ ICP:           │      │ ICP:           │
    │ pause_sub()    │      │ resume_sub()   │      │ cancel_sub()   │
    │ cancel_timer() │      │ restart_timer()│      │ cancel_timer() │
    └────────────────┘      └────────────────┘      └────────────────┘
```

### User Action Details

#### Pause Subscription

**Frontend:**
```tsx
const { pauseSubscription } = useSubscription();
await pauseSubscription("sub_12345");
```

**Solana:**
```rust
pause_subscription(ctx) {
    require!(subscription.status == Active);
    subscription.status = SubscriptionStatus::Paused;
}
```

**ICP:**
```motoko
pause_subscription(id) {
    subscription.status := #Paused;
    cancel_timer(id); // Stop recurring timer
}
```

#### Resume Subscription

**Solana:**
```rust
resume_subscription(ctx) {
    require!(subscription.status == Paused);
    subscription.status = SubscriptionStatus::Active;
    subscription.next_payment_time = now + interval;
}
```

**ICP:**
```motoko
resume_subscription(id) {
    subscription.status := #Active;
    subscription.next_execution := now + interval;
    schedule_subscription_timer(subscription); // Restart timer
}
```

#### Cancel Subscription

**Solana:**
```rust
cancel_subscription(ctx) {
    subscription.status = SubscriptionStatus::Cancelled;
}

// Optional: Revoke delegate authority
revoke_subscription_delegate(ctx) {
    token::revoke(subscriber_token_account);
}
```

**ICP:**
```motoko
cancel_subscription(id) {
    subscription.status := #Cancelled;
    cancel_timer(id); // Permanently stop timer
}
```

---

## DATA FLOW SUMMARY

### ICP Canister Stores (Timing only)

```motoko
type Subscription = {
    id: Text;                           // "sub_12345"
    solana_contract_address: Text;      // Program ID
    payment_token_mint: Text;           // For opcode routing
    reminder_days_before_payment: Nat;  // 3 days
    interval_seconds: Nat64;            // 2592000 (30 days)
    next_execution: Timestamp;          // Unix timestamp
    status: SubscriptionStatus;         // Active/Paused/Cancelled
    created_at: Timestamp;
    last_triggered: ?Timestamp;
    trigger_count: Nat;
};
```

**Total: 9 fields** (was 17 before minimalistic refactor)

### Solana Contract Stores (Source of truth)

```rust
pub struct Subscription {
    pub id: String,                         // "sub_12345"
    pub subscriber: Pubkey,                 // User wallet
    pub merchant: Pubkey,                   // Merchant wallet
    pub amount: u64,                        // 10_000_000 (10 USDC)
    pub payment_token_mint: Pubkey,         // USDC/USDT/PYUSD/DAI
    pub interval_seconds: i64,              // 2592000 (30 days)
    pub reminder_days_before_payment: u32,  // 3 days
    pub next_payment_time: i64,             // Unix timestamp
    pub status: SubscriptionStatus,         // Active/Paused/Cancelled
    pub created_at: i64,
    pub last_payment_time: Option<i64>,
    pub payments_made: u64,
    pub total_paid: u64,
    pub icp_canister_signature: [u8; 64],
}
```

**Total: 14 fields** (comprehensive payment data)

### Data Storage Philosophy

| Data Type | ICP | Solana | Rationale |
|-----------|-----|--------|-----------|
| Subscription ID | ✅ | ✅ | Shared identifier |
| Amount | ❌ | ✅ | Solana is source of truth |
| Token Mint | ✅ | ✅ | ICP needs for routing, Solana for execution |
| Interval | ✅ | ✅ | Both need for timing |
| Reminder Days | ✅ | ✅ | ICP for notification timing, Solana for display |
| Next Execution | ✅ | ❌ | ICP-only timer data |
| Next Payment Time | ❌ | ✅ | Solana-only state |
| Subscriber/Merchant | ❌ | ✅ | Payment addresses only in Solana |
| Payment History | ❌ | ✅ | Immutable blockchain record |

**Key Principle:** ICP stores only what it needs to trigger at the right time. Solana stores everything needed to execute the payment.

---

## OPCODE SYSTEM

### Opcode 0: Payment

**ICP → Solana:**
```
opcode = 0
subscription_id = "sub_12345"
```

**Solana Router:**
```rust
match opcode {
    0 => {
        if subscription.payment_token_mint == USDC_MINT {
            process_direct_usdc_payment(ctx)?;
        } else {
            process_swap_then_split(ctx)?; // TODO
        }
    }
}
```

**Result:**
- USDC transferred to merchant (minus fee)
- Fee transferred to ICP treasury
- Subscription state updated
- ICP reschedules next payment

### Opcode 1: Notification

**ICP → Solana:**
```
opcode = 1
subscription_id = "sub_12345"
```

**Solana Router:**
```rust
match opcode {
    1 => {
        let memo = format!(
            "OuroC: Payment due in {} days. Amount: {} USDC",
            subscription.reminder_days_before_payment,
            subscription.amount / 1_000_000
        );
        send_notification_internal(ctx, memo)?;
    }
}
```

**Result:**
- 0.000001 SOL sent to subscriber with memo
- User sees notification in wallet
- No ICP rescheduling (one-time notification)

---

## ERROR HANDLING

### ICP Timer Errors

**Payment Trigger Failure:**
```motoko
case (#err(error)) {
    Debug.print("Payment failed: " # error);

    // Still reschedule for next cycle
    subscription.next_execution := now + interval;
    schedule_subscription_timer(subscription);
}
```

**Reasons for failure:**
- Solana RPC unavailable
- Subscriber insufficient balance
- Token account frozen
- Network congestion

**Recovery:**
- ICP automatically retries next cycle
- No manual intervention needed
- Failed payment logged but doesn't stop subscription

### Solana Contract Errors

**Common Errors:**
```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Program is paused")]
    ProgramPaused,

    #[msg("Subscription not active")]
    SubscriptionNotActive,

    #[msg("Insufficient balance")]
    InsufficientBalance,

    #[msg("Invalid opcode")]
    InvalidOpcode,

    #[msg("Swap not implemented")]
    SwapNotImplemented,

    #[msg("Payment not due yet")]
    PaymentNotDue,
}
```

**Error Handling:**
- Return error to ICP
- ICP logs and reschedules
- Subscription remains active
- User can manually trigger or fix issue

---

## SECURITY CONSIDERATIONS

### Payment Delegation Security

**User Approval:**
```rust
approve_subscription_delegate(
    subscription_id: "sub_12345",
    amount: 10_000_000 // Max per payment
)
```

- User explicitly approves PDA delegate
- Delegation is limited to specific amount
- PDA can only spend what user approved
- User can revoke delegation anytime

### ICP Canister Authority

**TODO: Signature Verification**
```rust
// Current: Relies on signer being authorized ICP canister
// TODO: Verify Ed25519 signature from ICP threshold key

let icp_public_key = config.icp_public_key;
verify_icp_signature(message, signature, icp_public_key)?;
```

### Single Source of Truth

**Security Benefits:**
- Solana blockchain is immutable
- ICP cannot corrupt payment amounts
- User delegation is cryptographically verified
- No data desync between chains
- Disaster recovery: redeploy ICP from Solana data

---

## MONITORING & HEALTH

### ICP Canister Health

**Metrics:**
```motoko
get_canister_health() → {
    status: Healthy/Degraded/Critical,
    uptime_seconds: Nat,
    subscription_count: Nat,
    active_timers: Nat,
    failed_payments: Nat,
    cycle_balance: Nat
}
```

**Emergency Controls:**
```motoko
emergency_pause_all() → paused_count
resume_operations() → resumed_count
```

### Solana Contract Health

**Metrics:**
```rust
get_config() → {
    total_subscriptions: u64,
    paused: bool,
    authorization_mode: AuthorizationMode,
    fee_percentage: u16
}
```

**Admin Controls:**
```rust
emergency_pause() // Stop all payments
resume_program()  // Resume operations
```

---

## FUTURE ENHANCEMENTS

### Planned Features

1. **Jupiter DEX Integration** (Q1 2025)
   - Implement `process_swap_then_split()`
   - Support USDT, PYUSD, DAI payments
   - Auto-swap to USDC before fee split

2. **Notification Improvements** (Q2 2025)
   - Web Push API integration
   - Email/Discord webhooks
   - Custom notification templates

3. **Advanced Scheduling** (Q2 2025)
   - Dynamic intervals (monthly, quarterly, yearly)
   - Skip payment functionality
   - Grace period support

4. **Analytics Dashboard** (Q3 2025)
   - Revenue tracking
   - Churn analysis
   - Payment success rates

---

## CODE REFERENCES

### ICP Canister

- **Main:** `/src/timer/main.mo`
  - `create_subscription()`: main.mo:154
  - `trigger_subscription()`: main.mo:304
  - `send_solana_opcode()`: main.mo:359
  - `schedule_subscription_timer()`: main.mo:275

- **Solana Client:** `/src/timer/solana.mo`
  - `call_with_opcode()`: solana.mo (opcode sender)

### Solana Contract

- **Main:** `/solana-contract/ouro_c_subscriptions/programs/ouro_c_subscriptions/src/lib.rs`
  - `create_subscription()`: lib.rs:114
  - `approve_subscription_delegate()`: lib.rs:86
  - `process_trigger()`: lib.rs:349
  - `process_direct_usdc_payment()`: lib.rs:970
  - `process_swap_then_split()`: lib.rs:1039
  - `send_notification_internal()`: lib.rs:1046

---

**Last Updated:** 2025-10-05
**Version:** 1.0.0 (Minimalistic ICP + Opcode Architecture)
