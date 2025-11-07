# OuroC-Mesos Complete System Architecture

**Last Updated**: November 6, 2025

---

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         USER (Web Browser)                          │
│                                                                      │
│  - Connects Phantom wallet                                          │
│  - Creates content                                                  │
│  - Browses Community Hub                                            │
│  - Subscribes to content                                            │
└──────────────────────────┬─────────────────────────────────────────┘
                           │
                           │ HTTPS
                           ▼
┌────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                          │
│                    http://localhost:5173                            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Pages:                                                        │  │
│  │  - CreateContent.tsx     ✅ Create content form             │  │
│  │  - CommunityHub.tsx      ✅ Browse content grid             │  │
│  │  - ContentDetail.tsx     ❌ Detail + subscribe (TO BUILD)   │  │
│  │  - Profile.tsx           🟡 Partial (needs content mgmt)    │  │
│  │  - Landing.tsx           ✅ Landing page                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Libraries:                                                    │  │
│  │  - backend.ts            ✅ ICP Timer integration           │  │
│  │  - alephSimple.ts        ✅ Aleph storage (REST API)        │  │
│  │  - guildService.ts       ✅ Guild management                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────┬─────────────────────┘
                       │                       │
                       │                       │
         ┌─────────────▼──────────┐  ┌────────▼──────────────┐
         │   Backend API          │  │   ICP Timer           │
         │   localhost:3001       │  │   Canister            │
         └─────────────┬──────────┘  └────────┬──────────────┘
                       │                       │
                       │                       │
                       ▼                       ▼
         ┌─────────────────────────────────────────────────┐
         │            Aleph.im Network                      │
         │  - Store content metadata                       │
         │  - Store guild metadata                         │
         │  - Decentralized storage                        │
         └─────────────────────────────────────────────────┘
                                    │
                                    │
                                    ▼
         ┌─────────────────────────────────────────────────┐
         │         Solana Smart Contract                   │
         │  Program: CFEtrptTe5eFXpZtB3hr1VMGuWF9oXguTnUFU │
         │  - Subscription management                      │
         │  - USDC payment processing                      │
         │  - Escrow system                                │
         └─────────────────────────────────────────────────┘
```

---

## Content Creation Flow ✅ (Working)

```
┌──────────────┐
│     User     │
│  (Creator)   │
└──────┬───────┘
       │
       │ 1. Fills form
       │    - Title, description
       │    - Price ($9.99)
       │    - Interval (monthly)
       │    - Thumbnail image
       │
       ▼
┌──────────────────────────┐
│  CreateContent.tsx       │
│  - Validates form        │
│  - Uploads thumbnail     │
│  - Prepares metadata     │
└──────┬───────────────────┘
       │
       │ 2. POST /api/content
       │    {
       │      title: "Advanced React",
       │      price: 9.99,
       │      interval: "monthly",
       │      creatorWallet: "5XYZ..."
       │    }
       │
       ▼
┌──────────────────────────┐
│  Backend API             │
│  (Express Server)        │
│  - Signs with Solana key │
│  - Posts to Aleph.im     │
└──────┬───────────────────┘
       │
       │ 3. Store on Aleph
       │    Channel: "OuroC-Mesos"
       │    Type: "POST"
       │
       ▼
┌──────────────────────────┐
│  Aleph.im Storage        │
│  - Returns item_hash     │
│  - Content stored        │
└──────┬───────────────────┘
       │
       │ 4. Success response
       │    { hash: "QmXYZ..." }
       │
       ▼
┌──────────────────────────┐
│  Success Toast           │
│  "Content created!"      │
│  → Navigate to profile   │
└──────────────────────────┘
```

---

## Content Discovery Flow ✅ (Working)

```
┌──────────────┐
│     User     │
│  (Visitor)   │
└──────┬───────┘
       │
       │ 1. Visit /community
       │
       ▼
┌──────────────────────────┐
│  CommunityHub.tsx        │
│  - Loads content         │
│  - Shows filters         │
└──────┬───────────────────┘
       │
       │ 2. GET /api/content
       │
       ▼
┌──────────────────────────┐
│  Backend API             │
│  - Queries Aleph.im      │
│  - Channel: OuroC-Mesos  │
└──────┬───────────────────┘
       │
       │ 3. Fetch from Aleph
       │
       ▼
┌──────────────────────────┐
│  Aleph.im Storage        │
│  - Returns all content   │
│  - Fallback: localStorage│
└──────┬───────────────────┘
       │
       │ 4. Display in grid
       │
       ▼
┌──────────────────────────────────────────┐
│  Content Grid                             │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │Content1│ │Content2│ │Content3│       │
│  │$9.99/mo│ │$4.99/wk│ │$29/qtr │       │
│  └────────┘ └────────┘ └────────┘       │
│                                           │
│  [Category Filter] [Search Box]          │
└───────────────────────────────────────────┘
```

---

## Subscription Flow 🚧 (In Progress)

### Current Flow (ICP Timer Only):

```
┌──────────────┐
│     User     │
│ (Subscriber) │
└──────┬───────┘
       │
       │ 1. Browse content
       │
       ▼
┌──────────────────────────┐
│  CommunityHub.tsx        │
│  - Click content card    │
└──────┬───────────────────┘
       │
       │ 2. Navigate to detail
       │    /content/{id}
       │
       ▼
┌──────────────────────────┐
│  ContentDetail.tsx       │  ← TO BUILD ❌
│  - Show content details  │
│  - Show subscribe button │
└──────┬───────────────────┘
       │
       │ 3. Click "Subscribe $9.99/month"
       │
       ▼
┌──────────────────────────────────────────┐
│  handleSubscribe()                        │
│                                           │
│  const result = await createSubscription( │
│    publicKey.toString(),     // User      │
│    content.creatorWallet,    // Creator   │
│    content.price,            // $9.99     │
│    INTERVAL_MAP["monthly"],  // 2592000s  │
│    content.creatorName       // "John"    │
│  );                                       │
└──────┬────────────────────────────────────┘
       │
       │ 4. Call ICP Timer canister
       │
       ▼
┌──────────────────────────────────────────┐
│  ICP Timer Canister                       │
│  - Generate subscription ID               │
│  - Store subscription metadata            │
│  - Schedule first payment                 │
│  - Return subscription ID                 │
└──────┬────────────────────────────────────┘
       │
       │ 5. Success response
       │    { success: true, subscriptionId: "abc123" }
       │
       ▼
┌──────────────────────────┐
│  Success Toast           │
│  "Subscribed!"           │
│  - Update UI             │
│  - Show "Subscribed ✓"  │
└──────────────────────────┘
```

### Full Flow (With Solana Contract):

```
┌──────────────┐
│     User     │
│ (Subscriber) │
└──────┬───────┘
       │
       │ 1. Click "Subscribe"
       │
       ▼
┌──────────────────────────────────────────┐
│  Step 1: Approve Token Delegation         │
│                                           │
│  program.methods                          │
│    .approveSubscriptionDelegate(          │
│      subscriptionId,                      │
│      amount,         // 9990000 micro-USDC│
│      intervalSeconds // 2592000 (monthly) │
│    )                                      │
│    .accounts({                            │
│      subscriptionPda,                     │
│      subscriberTokenAccount,              │
│      subscriber,                          │
│      tokenProgram                         │
│    })                                     │
│    .rpc()                                 │
└──────┬────────────────────────────────────┘
       │
       │ User approves in Phantom wallet
       │
       ▼
┌──────────────────────────────────────────┐
│  Solana Smart Contract                    │
│  - Approve subscription PDA as delegate   │
│  - Set delegated amount (1 year worth)    │
│  - Amount: monthly * 12                   │
│  - Returns: Transaction signature         │
└──────┬────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Step 2: Create ICP Timer Subscription   │
│                                           │
│  const result = await createSubscription( │
│    publicKey.toString(),                  │
│    content.creatorWallet,                 │
│    content.price,                         │
│    intervalSeconds,                       │
│    content.creatorName                    │
│  );                                       │
└──────┬────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  ICP Timer Canister                       │
│  - Generate unique subscription ID        │
│  - Store subscription metadata:           │
│    {                                      │
│      subscriber: "3ABC...",               │
│      merchant: "5XYZ...",                 │
│      amount: 9990000,                     │
│      interval: 2592000,                   │
│      next_execution: timestamp + interval │
│    }                                      │
│  - Schedule timer for next payment        │
└──────┬────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Step 3: Register on Solana               │
│                                           │
│  program.methods                          │
│    .createSubscription(                   │
│      subscriptionId,                      │
│      amount,                              │
│      intervalSeconds,                     │
│      merchantAddress,                     │
│      merchantName,                        │
│      reminderDays: 1,                     │
│      icpSignature  // From ICP canister   │
│    )                                      │
│    .accounts({ ... })                     │
│    .rpc()                                 │
└──────┬────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Solana Smart Contract                    │
│  - Verify ICP signature (Ed25519)         │
│  - Create subscription PDA                │
│  - Store subscription data on-chain       │
│  - Set next_payment_time                  │
│  - Emit SubscriptionCreated event         │
└──────┬────────────────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│  ✅ Subscription Active  │
│  - User subscribed       │
│  - Payments scheduled    │
│  - Notifications enabled │
└──────────────────────────┘
```

---

## Automated Payment Flow ✅ (Working)

```
┌──────────────────────────┐
│  ICP Timer (Background)  │
│  - Monitors timestamps   │
│  - Checks every minute   │
└──────┬───────────────────┘
       │
       │ 1 day before payment
       │
       ▼
┌──────────────────────────────────────────┐
│  Notification System                      │
│  - Send memo transaction to subscriber   │
│  - Message: "Payment in 1 day: $9.99 to  │
│             [Creator Name]"               │
└──────┬────────────────────────────────────┘
       │
       │ On payment day (next_execution time)
       │
       ▼
┌──────────────────────────────────────────┐
│  ICP Timer                                │
│  1. Generate Ed25519 signature            │
│     - Uses Arc Network threshold ECDSA    │
│     - Message: subscriptionId + timestamp │
│                                           │
│  2. Call Solana contract:                 │
│     process_payment(                      │
│       icp_signature,                      │
│       timestamp                           │
│     )                                     │
└──────┬────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Solana Smart Contract                    │
│  - Validate ICP signature                 │
│  - Check delegated amount                 │
│  - Transfer USDC:                         │
│    • Subscriber → Escrow PDA (amount)     │
│    • Subscriber → ICP Fee (fee)           │
│  - Update subscription:                   │
│    • next_payment_time += interval        │
│    • payments_made += 1                   │
│    • total_paid += amount                 │
│  - Emit PaymentProcessed event            │
└──────┬────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Payment Complete ✅                      │
│  - USDC in escrow                         │
│  - Creator can claim funds                │
│  - ICP Timer schedules next payment       │
└───────────────────────────────────────────┘
```

---

## Data Structures

### Content Metadata (Aleph.im)

```typescript
interface ContentMetadata {
  id: string;              // "content_1699200000_abc123"
  title: string;           // "Advanced React Course"
  description: string;     // "Learn React hooks..."
  category: string;        // "Education"
  price: number;           // 9.99 (USDC)
  interval: string;        // "weekly" | "monthly" | "quarterly"
  creatorWallet: string;   // "5XYZ...abc" (Solana address)
  creatorName: string;     // "John Doe"
  thumbnailUrl: string;    // "https://..."
  createdAt: number;       // 1699200000
}
```

### Subscription (ICP Timer)

```typescript
interface Subscription {
  id: string;                    // "abc123..." (32-char hash)
  solana_contract_address: string; // Contract address
  subscriber_address: string;    // "3ABC..." (user wallet)
  merchant_address: string;      // "5XYZ..." (creator wallet)
  payment_token_mint: string;    // USDC mint address
  amount: bigint;                // 9990000 (micro-USDC)
  interval_seconds: bigint;      // 2592000 (monthly)
  next_execution: bigint;        // Unix timestamp
  status: SubscriptionStatus;    // Active | Paused | Cancelled
  created_at: bigint;            // Creation timestamp
  last_triggered: bigint | null; // Last payment time
  trigger_count: bigint;         // Number of payments
  failed_payment_count: number;  // Failed attempts
}
```

### Subscription (Solana Smart Contract)

```rust
pub struct Subscription {
    pub id: String,                    // Same as ICP Timer
    pub subscriber: Pubkey,            // User's wallet
    pub merchant: Pubkey,              // Creator's wallet
    pub merchant_name: String,         // "John Doe"
    pub amount: u64,                   // 9990000 (micro-USDC)
    pub interval_seconds: i64,         // 2592000
    pub next_payment_time: i64,        // Unix timestamp
    pub status: SubscriptionStatus,    // Active | Paused | Cancelled
    pub created_at: i64,
    pub last_payment_time: Option<i64>,
    pub payments_made: u64,
    pub total_paid: u64,
    pub icp_canister_signature: [u8; 64], // Ed25519 signature
    pub reminder_days_before_payment: u32,
    pub escrow_pda: Pubkey,           // Escrow account
    pub escrow_balance: u64,          // Current balance
}
```

---

## Interval Mapping

```typescript
// Frontend constant
const INTERVAL_MAP = {
  'weekly': 604800,      // 7 days
  'monthly': 2592000,    // 30 days
  'quarterly': 7776000,  // 90 days
};

// Example:
content.interval = "monthly"
↓
interval_seconds = INTERVAL_MAP["monthly"] = 2592000
↓
ICP Timer schedules payment every 2592000 seconds
```

---

## Payment Amounts

```typescript
// Frontend
content.price = 9.99  // USDC

// Backend conversion
amount_micro_usdc = Math.floor(content.price * 1_000_000)
                  = 9_990_000

// Solana contract
amount: u64 = 9990000  // Micro-units

// Display
display_price = amount / 1_000_000 = 9.99 USDC
```

---

## Key Integration Points

### 1. Content → Subscription Mapping

```typescript
// When user subscribes to content:
{
  // From ContentMetadata:
  merchantAddress: content.creatorWallet,  // "5XYZ..."
  merchantName: content.creatorName,       // "John Doe"
  amount: content.price * 1_000_000,       // 9990000
  interval: INTERVAL_MAP[content.interval], // 2592000

  // From User:
  subscriberAddress: publicKey.toString(), // "3ABC..."
}
```

### 2. Backend API Endpoints

```typescript
// Content Management
POST   /api/content       // Store content (Aleph)
GET    /api/content       // Fetch all content (Aleph)

// Guild Management
POST   /api/guilds        // Store guild
GET    /api/guilds        // Fetch all guilds

// Health Check
GET    /health            // Backend status
```

### 3. ICP Timer Functions

```typescript
// Subscription Management
createSubscription(params)     // Create new subscription
listSubscriptions()            // Get all subscriptions
pauseSubscription(id)          // Pause subscription
resumeSubscription(id)         // Resume subscription
cancelSubscription(id)         // Cancel subscription
getPaymentSignature(id, amt)   // Get ICP signature
```

### 4. Solana Contract Functions

```rust
// Subscription Lifecycle
initialize()                   // Initialize program
approve_subscription_delegate() // Approve token delegation
create_subscription()          // Create subscription on-chain
process_payment()              // Execute payment
pause_subscription()           // Pause subscription
resume_subscription()          // Resume subscription
cancel_subscription()          // Cancel subscription
revoke_subscription_delegate() // Revoke token delegation

// Payment Management
process_trigger()              // Main entry point from ICP
claim_from_escrow()            // Creator claims funds

// Notifications
send_notification()            // Send memo to subscriber
```

---

## Environment Setup

### Frontend (.env.local)

```bash
# ICP
VITE_TIMER_CANISTER_ID=xxxxx-xxxxx-xxxxx-xxxxx
VITE_LICENSE_CANISTER_ID=xxxxx-xxxxx-xxxxx-xxxxx

# Solana
VITE_SOLANA_CONTRACT=CFEtrptTe5eFXpZtB3hr1VMGuWF9oXguTnUFUaeVgeyT

# Backend
VITE_BACKEND_URL=http://localhost:3001

# License
VITE_ENTERPRISE_LICENSE_KEY=ouro_enterprise_ouroc_mesos_2025
```

### Backend (.env)

```bash
# Solana
SOLANA_PRIVATE_KEY=[161,127,209,...] # Array format
# OR
SOLANA_PRIVATE_KEY=base58string      # Base58 format

# API
FRONTEND_URL=http://localhost:5173
PORT=3001
```

---

## File Structure

```
OuroC-Mesos/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── CreateContent.tsx      ✅ Working
│   │   │   ├── CommunityHub.tsx       ✅ Working
│   │   │   ├── ContentDetail.tsx      ❌ To build
│   │   │   ├── Profile.tsx            🟡 Partial
│   │   │   └── Landing.tsx            ✅ Working
│   │   ├── lib/
│   │   │   ├── backend.ts             ✅ ICP Timer
│   │   │   ├── alephSimple.ts         ✅ Aleph REST
│   │   │   └── guildService.ts        ✅ Guilds
│   │   └── components/
│   │       └── ContentCard.tsx        ✅ Working
│   └── .env.local                     ⚙️ Config
│
├── backend/
│   ├── src/
│   │   ├── server.ts                  ✅ Express server
│   │   ├── aleph.ts                   ✅ Solana signing
│   │   └── types.ts                   ✅ TypeScript types
│   └── .env                           ⚙️ Config
│
└── /Ouro-C/solana-contract/
    └── ouroc_prima/
        └── programs/ouroc_prima/src/
            ├── lib.rs                 ✅ Main contract
            ├── data_structures.rs     ✅ Subscription types
            ├── instruction_handlers.rs ✅ Business logic
            └── crypto.rs              ✅ Signature verification
```

---

## Summary

### Current State:
- ✅ Content creation and discovery working
- ✅ Backend API with Aleph.im storage
- ✅ Solana smart contract deployed
- ✅ ICP Timer integration ready
- ❌ Content detail page missing
- ❌ Subscribe button integration missing

### Next Steps:
1. Create ContentDetail.tsx page
2. Add subscribe button
3. Connect to existing createSubscription()
4. Test end-to-end flow

### Estimated Time: 3-5 days

**See `INTEGRATION_STATUS.md` and `SUBSCRIPTION_INTEGRATION_GUIDE.md` for implementation details.**
