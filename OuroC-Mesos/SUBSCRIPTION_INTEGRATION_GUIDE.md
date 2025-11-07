# Community Hub + Subscription System Integration Guide

**Status**: Ready to integrate! All infrastructure exists.

**Goal**: Connect Community Hub content subscriptions to the existing Solana smart contract + ICP Timer system.

---

## What We Already Have ✅

### 1. Solana Smart Contract (OuroC Prima) ✅

**Location**: `/Users/tobiasd/Desktop/Ouro-C/solana-contract/ouroc_prima/`

**Program ID**: `CFEtrptTe5eFXpZtB3hr1VMGuWF9oXguTnUFUaeVgeyT`

**Key Functions Available**:
```rust
// 1. Approve delegation (user approves token spending)
pub fn approve_subscription_delegate(
    subscription_id: String,
    amount: u64,              // USDC in micro-units
    interval_seconds: i64,    // Payment interval
)

// 2. Create subscription on-chain
pub fn create_subscription(
    subscription_id: String,
    amount: u64,              // USDC in micro-units
    interval_seconds: i64,    // Payment interval
    merchant_address: Pubkey, // Content creator's wallet
    merchant_name: String,    // Creator's name/app name
    reminder_days_before_payment: u32,
    icp_canister_signature: [u8; 64],
)

// 3. Process payment (called by ICP Timer)
pub fn process_payment(
    icp_signature: Option<[u8; 64]>,
    timestamp: i64,
)

// 4. Pause/Resume/Cancel
pub fn pause_subscription()
pub fn resume_subscription()
pub fn cancel_subscription()
```

**Subscription Data Structure**:
```rust
pub struct Subscription {
    pub id: String,                    // Unique subscription ID
    pub subscriber: Pubkey,            // User's wallet
    pub merchant: Pubkey,              // Creator's wallet ⭐
    pub merchant_name: String,         // Creator's name ⭐
    pub amount: u64,                   // Price in micro-USDC ⭐
    pub interval_seconds: i64,         // Weekly/monthly/quarterly ⭐
    pub next_payment_time: i64,
    pub status: SubscriptionStatus,
    pub created_at: i64,
    pub payments_made: u64,
    pub total_paid: u64,
    pub escrow_pda: Pubkey,
    pub escrow_balance: u64,
}
```

### 2. ICP Timer Integration ✅

**Location**: `frontend/src/lib/backend.ts`

**Functions Available**:
```typescript
// Create subscription in ICP Timer
export async function createSubscription(
  walletAddress: string,        // User's Solana wallet
  merchantAddress: string,       // Creator's wallet ⭐
  amountUsdc: number,            // Content price ⭐
  intervalSeconds: number,       // Subscription interval ⭐
  merchantName: string,          // Creator name ⭐
): Promise<{ success: boolean; subscriptionId?: string }>

// List all subscriptions for a user
export async function listSubscriptions(walletAddress: string)

// Manage subscriptions
export async function pauseSubscription(subscriptionId: string)
export async function resumeSubscription(subscriptionId: string)
export async function cancelSubscription(subscriptionId: string)

// Get payment signature from ICP canister
export async function getPaymentSignature(
  subscriptionId: string,
  amount: number
)
```

### 3. Community Hub Content Structure ✅

**Location**: `frontend/src/pages/CreateContent.tsx`

**Content Metadata**:
```typescript
interface ContentMetadata {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;              // ⭐ Maps to subscription amount
  interval: string;           // ⭐ Maps to interval_seconds
  creatorWallet: string;      // ⭐ Maps to merchant_address
  creatorName: string;        // ⭐ Maps to merchant_name
  thumbnailUrl: string;
  createdAt: number;
}
```

**Interval Mapping**:
```typescript
const INTERVAL_MAP = {
  'weekly': 604800,      // 7 days in seconds
  'monthly': 2592000,    // 30 days in seconds
  'quarterly': 7776000,  // 90 days in seconds
};
```

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Community Hub                          │
│                                                              │
│  1. Creator creates content                                 │
│     - Sets price ($9.99/month)                              │
│     - Selects interval (weekly/monthly/quarterly)           │
│     - Content stored on Aleph.im                            │
│                                                              │
│  2. User browses content                                    │
│     - Sees content cards with price                         │
│     - Clicks "Subscribe" button                             │
│                                                              │
│  3. Subscribe button triggers:                              │
│     ┌─────────────────────────────────────────────┐        │
│     │ Step 1: Approve token delegation            │        │
│     │ - Call: approve_subscription_delegate()     │        │
│     │ - User approves USDC spending                │        │
│     └─────────────────────────────────────────────┘        │
│                         │                                    │
│                         ▼                                    │
│     ┌─────────────────────────────────────────────┐        │
│     │ Step 2: Create subscription on Solana       │        │
│     │ - Call: create_subscription()               │        │
│     │ - merchantAddress = content.creatorWallet   │        │
│     │ - amount = content.price * 1_000_000        │        │
│     │ - interval = INTERVAL_MAP[content.interval] │        │
│     └─────────────────────────────────────────────┘        │
│                         │                                    │
│                         ▼                                    │
│     ┌─────────────────────────────────────────────┐        │
│     │ Step 3: Create ICP Timer subscription       │        │
│     │ - Call: createSubscription() (backend.ts)   │        │
│     │ - Timer schedules recurring payments        │        │
│     └─────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    ICP Timer Canister                        │
│                                                              │
│  - Monitors subscription.next_payment_time                  │
│  - Sends notification 1 day before (if interval > 1 day)    │
│  - On payment day:                                          │
│    1. Generates Ed25519 signature                           │
│    2. Calls Solana: process_payment()                       │
│    3. Payment executed:                                     │
│       - Subscriber → Escrow PDA (amount)                    │
│       - Subscriber → ICP Fee Wallet (fee)                   │
│    4. Merchant claims from escrow after off-ramp            │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Solana Smart Contract                       │
│                                                              │
│  - Validates ICP signature                                  │
│  - Transfers USDC using delegated authority                 │
│  - Updates subscription.next_payment_time                   │
│  - Updates subscription.payments_made                       │
│  - Emits PaymentProcessed event                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1: Create Content Detail Page

**File**: `frontend/src/pages/ContentDetail.tsx` (NEW)

```tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getAllContent, ContentMetadata } from '@/lib/alephSimple';
import { createSubscription } from '@/lib/backend';
import { PublicKey } from '@solana/web3.js';

// Interval mapping: UI string → seconds
const INTERVAL_MAP = {
  'weekly': 604800,
  'monthly': 2592000,
  'quarterly': 7776000,
};

export default function ContentDetail() {
  const { contentId } = useParams();
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [content, setContent] = useState<ContentMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Load content on mount
  useEffect(() => {
    async function loadContent() {
      try {
        const allContent = await getAllContent();
        const found = allContent.find(c => c.id === contentId);
        if (found) {
          setContent(found);
        } else {
          toast({
            title: 'Content not found',
            variant: 'destructive',
          });
          navigate('/community');
        }
      } catch (error) {
        console.error('Failed to load content:', error);
        toast({
          title: 'Error loading content',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, [contentId, navigate, toast]);

  // Check if user is already subscribed
  useEffect(() => {
    async function checkSubscription() {
      if (!publicKey || !content) return;

      // TODO: Check if user has active subscription
      // This would query the Solana contract or ICP Timer
      // For now, assume not subscribed
      setIsSubscribed(false);
    }

    checkSubscription();
  }, [publicKey, content]);

  const handleSubscribe = async () => {
    if (!publicKey) {
      toast({
        title: 'Connect your wallet',
        description: 'Please connect your wallet to subscribe',
        variant: 'destructive',
      });
      return;
    }

    if (!content) return;

    setSubscribing(true);

    try {
      // Convert interval string to seconds
      const intervalSeconds = INTERVAL_MAP[content.interval as keyof typeof INTERVAL_MAP];

      if (!intervalSeconds) {
        throw new Error(`Invalid interval: ${content.interval}`);
      }

      console.log('🔔 Creating subscription:', {
        walletAddress: publicKey.toString(),
        merchantAddress: content.creatorWallet,
        amountUsdc: content.price,
        intervalSeconds,
        merchantName: content.creatorName || 'Creator',
      });

      // Step 1: Call ICP Timer to create subscription
      const result = await createSubscription(
        publicKey.toString(),       // User's wallet
        content.creatorWallet,      // Creator's wallet (merchant)
        content.price,              // Content price
        intervalSeconds,            // Payment interval in seconds
        content.creatorName || 'OuroC Creator'
      );

      if (result.success) {
        toast({
          title: 'Subscribed successfully!',
          description: `You are now subscribed to ${content.title}`,
        });

        setIsSubscribed(true);

        // TODO: Step 2 would be to approve delegation on Solana
        // This requires calling the Solana smart contract
        // For now, the subscription is created in ICP Timer

      } else {
        throw new Error(result.error || 'Failed to create subscription');
      }

    } catch (error) {
      console.error('Subscription failed:', error);
      toast({
        title: 'Subscription failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (!content) {
    return <div className="container mx-auto p-6">Content not found</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Thumbnail */}
      {content.thumbnailUrl && (
        <img
          src={content.thumbnailUrl}
          alt={content.title}
          className="w-full h-64 object-cover rounded-lg mb-6"
        />
      )}

      {/* Title */}
      <h1 className="text-4xl font-bold mb-4">{content.title}</h1>

      {/* Creator info */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
          {content.creatorName?.[0] || 'C'}
        </div>
        <div>
          <p className="font-semibold">{content.creatorName || 'Creator'}</p>
          <p className="text-sm text-muted-foreground">
            {content.creatorWallet.slice(0, 8)}...{content.creatorWallet.slice(-6)}
          </p>
        </div>
      </div>

      {/* Price and interval */}
      <div className="bg-card border rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Subscription Price</p>
            <p className="text-2xl font-bold">
              ${content.price.toFixed(2)}
              <span className="text-lg text-muted-foreground">/{content.interval}</span>
            </p>
          </div>

          {/* Subscribe button */}
          {isSubscribed ? (
            <Button disabled size="lg">
              Subscribed ✓
            </Button>
          ) : (
            <Button
              onClick={handleSubscribe}
              disabled={subscribing}
              size="lg"
            >
              {subscribing ? 'Subscribing...' : `Subscribe $${content.price}/${content.interval}`}
            </Button>
          )}
        </div>
      </div>

      {/* Category */}
      <div className="mb-6">
        <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
          {content.category}
        </span>
      </div>

      {/* Description */}
      <div className="prose max-w-none">
        <h2 className="text-2xl font-bold mb-3">About this content</h2>
        <p className="text-muted-foreground whitespace-pre-wrap">
          {content.description}
        </p>
      </div>

      {/* What you'll get section */}
      <div className="mt-8 bg-card border rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">What you'll get</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>Access to exclusive {content.category.toLowerCase()} content</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>Automatic {content.interval} billing</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>Payment reminders before each billing cycle</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>Cancel anytime from your profile</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
```

### Step 2: Add Route for Content Detail

**File**: `frontend/src/App.tsx` (UPDATE)

```typescript
import ContentDetail from '@/pages/ContentDetail';

// In your routes:
<Route path="/content/:contentId" element={<ContentDetail />} />
```

### Step 3: Make Content Cards Clickable

**File**: `frontend/src/pages/CommunityHub.tsx` (UPDATE at line ~155)

```typescript
// Update ContentCard to be clickable
<div
  key={content.id}
  onClick={() => navigate(`/content/${content.id}`)}
  className="cursor-pointer hover:shadow-lg transition-shadow"
>
  <ContentCard
    title={content.title}
    description={content.description}
    category={content.category}
    price={content.price}
    interval={content.interval}
    creator={{
      name: content.creatorName || 'Creator',
      wallet: content.creatorWallet,
    }}
    thumbnailUrl={content.thumbnailUrl || '/placeholder-image.png'}
    rating={4.8} // TODO: Implement ratings system
    subscribers={0} // TODO: Implement subscriber tracking
  />
</div>
```

Add at top of file:
```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
```

---

## Subscription Flow (Complete)

### User Journey:

1. **Browse Content** → User sees content in Community Hub
2. **View Details** → User clicks content card, navigates to `/content/{id}`
3. **Subscribe** → User clicks "Subscribe $9.99/month" button

### Technical Flow:

```typescript
// 1. User clicks Subscribe
handleSubscribe() {

  // 2. Get user's wallet address from Phantom
  const walletAddress = publicKey.toString();

  // 3. Get content details
  const merchantAddress = content.creatorWallet;
  const amountUsdc = content.price;  // e.g., 9.99
  const intervalSeconds = INTERVAL_MAP[content.interval]; // e.g., 2592000 for monthly

  // 4. Create subscription in ICP Timer
  const result = await createSubscription(
    walletAddress,
    merchantAddress,
    amountUsdc,
    intervalSeconds,
    content.creatorName
  );

  // 5. ICP Timer:
  //    - Generates unique subscription ID
  //    - Stores subscription metadata
  //    - Schedules first payment
  //    - Returns subscription ID

  // 6. TODO (Future): Call Solana contract
  //    - approve_subscription_delegate() - User approves token spending
  //    - create_subscription() - Register on-chain with ICP signature

  // 7. ICP Timer automatically:
  //    - Sends notification 1 day before payment (if interval > 1 day)
  //    - On payment day: Calls Solana process_payment()
  //    - Payment executed automatically
}
```

---

## Environment Variables Required

**File**: `frontend/.env.local`

```bash
# ICP Timer Canister
VITE_TIMER_CANISTER_ID=your-timer-canister-id

# Solana Contract
VITE_SOLANA_CONTRACT=CFEtrptTe5eFXpZtB3hr1VMGuWF9oXguTnUFUaeVgeyT

# Enterprise License
VITE_ENTERPRISE_LICENSE_KEY=ouro_enterprise_ouroc_mesos_2025

# Backend API
VITE_BACKEND_URL=http://localhost:3001
```

---

## What's Missing (TODO)

### 1. Solana Contract Integration (Frontend)

Currently `backend.ts:createSubscription()` only calls ICP Timer. We need to also call the Solana contract:

```typescript
// In createSubscription() after ICP Timer call succeeds:

// Step 1: Approve delegation
const approveTx = await program.methods
  .approveSubscriptionDelegate(
    subscriptionId,
    BigInt(amountUsdc * 1_000_000),
    BigInt(intervalSeconds)
  )
  .accounts({
    subscriptionPda: subscriptionPda,
    subscriberTokenAccount: userUsdcAccount,
    subscriber: walletAddress,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .rpc();

console.log('✅ Delegation approved:', approveTx);

// Step 2: Create subscription on-chain
const createTx = await program.methods
  .createSubscription(
    subscriptionId,
    BigInt(amountUsdc * 1_000_000),
    BigInt(intervalSeconds),
    new PublicKey(merchantAddress),
    merchantName,
    1, // reminder_days_before_payment
    icpSignature // Get from ICP Timer
  )
  .accounts({
    subscription: subscriptionPda,
    config: configPda,
    subscriber: walletAddress,
    // ... other accounts
  })
  .rpc();

console.log('✅ Subscription created on Solana:', createTx);
```

### 2. Check Subscription Status

**File**: `frontend/src/pages/ContentDetail.tsx` (UPDATE)

```typescript
// In useEffect, check if user has active subscription:
useEffect(() => {
  async function checkSubscription() {
    if (!publicKey || !content) return;

    try {
      // Query ICP Timer for user's subscriptions
      const subscriptions = await listSubscriptions(publicKey.toString());

      // Check if user is subscribed to this creator
      const activeSubscription = subscriptions.find(sub =>
        sub.merchant_address === content.creatorWallet &&
        sub.status.Active !== undefined // Check if status is Active
      );

      setIsSubscribed(!!activeSubscription);
    } catch (error) {
      console.error('Failed to check subscription:', error);
    }
  }

  checkSubscription();
}, [publicKey, content]);
```

### 3. Subscription Management Page

**File**: `frontend/src/pages/Subscriptions.tsx` (NEW)

```typescript
// Show all user's subscriptions
// Allow pause/resume/cancel
// Show payment history
// Show next payment date
```

### 4. Creator Analytics

**File**: `frontend/src/pages/Profile.tsx` (UPDATE "My Content" tab)

```typescript
// For each content item, show:
// - Number of subscribers
// - Monthly recurring revenue
// - Total revenue
// - Recent subscriptions
```

---

## Data Flow Diagram

```
┌────────────────┐
│  User creates  │
│    content     │
└───────┬────────┘
        │
        ▼
┌────────────────────────────────────┐
│  Aleph.im Storage                  │
│                                    │
│  ContentMetadata:                  │
│  - id: "content_123"               │
│  - title: "Advanced React Course"  │
│  - price: 9.99                     │
│  - interval: "monthly"             │
│  - creatorWallet: "5XYZ...abc"     │
│  - creatorName: "John Doe"         │
└────────────────────────────────────┘
        │
        │ (User browses and subscribes)
        ▼
┌────────────────────────────────────┐
│  ICP Timer Canister                │
│                                    │
│  Subscription:                     │
│  - subscription_id: "abc123"       │
│  - subscriber_address: "3ABC..."   │
│  - merchant_address: "5XYZ..."     │ ← creatorWallet
│  - amount: 9990000 (micro-USDC)    │ ← price * 1_000_000
│  - interval_seconds: 2592000       │ ← INTERVAL_MAP["monthly"]
│  - next_execution: 1699200000      │
│  - status: Active                  │
└────────────────────────────────────┘
        │
        │ (Timer triggers payment)
        ▼
┌────────────────────────────────────┐
│  Solana Smart Contract             │
│                                    │
│  process_payment():                │
│  - Transfer USDC from subscriber   │
│  - Send to escrow PDA              │
│  - Charge ICP fee                  │
│  - Update next_payment_time        │
│  - Emit PaymentProcessed event     │
└────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────┐
│  Creator's Wallet                  │
│                                    │
│  - Receives payment notification   │
│  - Can claim from escrow           │
│  - Funds available for off-ramp    │
└────────────────────────────────────┘
```

---

## Testing Checklist

### Phase 1: Basic Flow
- [ ] Create content with price and interval
- [ ] Content appears in Community Hub
- [ ] Click content → Navigate to detail page
- [ ] Detail page shows correct price and interval
- [ ] Subscribe button appears
- [ ] Click subscribe → ICP Timer subscription created
- [ ] Subscription ID returned

### Phase 2: Solana Integration
- [ ] Approve delegation succeeds
- [ ] Create subscription on Solana succeeds
- [ ] Subscription PDA created
- [ ] Delegation amount correct (1 year worth)

### Phase 3: Payments
- [ ] ICP Timer triggers notification
- [ ] ICP Timer generates signature
- [ ] Solana contract validates signature
- [ ] Payment executed (USDC transferred)
- [ ] Escrow receives funds
- [ ] ICP fee collected
- [ ] Creator can claim from escrow

### Phase 4: Management
- [ ] View all subscriptions
- [ ] Pause subscription
- [ ] Resume subscription
- [ ] Cancel subscription
- [ ] Revoke delegation after cancel

---

## Summary

### What We Have ✅:
1. Solana smart contract with all subscription functions
2. ICP Timer integration with createSubscription()
3. Community Hub with content creation and discovery
4. Content metadata with price, interval, and creator wallet

### What We Need 🔴:
1. **ContentDetail.tsx page** (3-5 days)
   - Display full content details
   - Subscribe button with ICP Timer integration
2. **Solana contract frontend integration** (1 week)
   - Call approve_subscription_delegate()
   - Call create_subscription()
   - Handle wallet signing
3. **Subscription management** (3-5 days)
   - List user's subscriptions
   - Pause/resume/cancel functionality
4. **Creator analytics** (1 week)
   - Show subscriber count
   - Show revenue metrics

### Integration Points:
```typescript
// Content → Subscription mapping
content.creatorWallet  → merchant_address
content.price          → amount (converted to micro-USDC)
content.interval       → interval_seconds (via INTERVAL_MAP)
content.creatorName    → merchant_name
```

### Next Immediate Step:
Create `ContentDetail.tsx` page with subscribe button that calls existing `createSubscription()` function from `backend.ts`.

**Estimated Time to Full Integration**: 2-3 weeks

**Current Status**: 70% complete (infrastructure exists, just needs frontend glue code!)
