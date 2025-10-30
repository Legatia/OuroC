# OuroC Community Tier - Simplified API

## Overview

The Community Tier SDK has been **radically simplified** for ease of use. Merchants only need to specify their business logic (amount, interval, merchant address). Everything else is automatic.

---

## ✅ What's Hardcoded (You Don't Need to Worry About)

| Configuration | Value | Notes |
|--------------|-------|-------|
| **ICP Canister ID** | `7tbxr-naaaa-aaaao-qkrca-cai` | Auto-selected based on network |
| **Solana Program ID** | `7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub` | Deployed contract address |
| **Fee Collection Address** | `CKEY8bppifSErEfP5cvX8hCnmQ2Yo911mosdRx7M3HxF` | Platform treasury (same for mainnet/devnet) |
| **Payment Token** | USDC only | Mainnet: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`<br>Devnet: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| **Platform Fee** | 2% (200 basis points) | Non-configurable |
| **Subscriber Address** | Auto-extracted from wallet | From `walletAdapter.publicKey` |
| **Subscription ID** | Auto-generated | Hash of merchant+subscriber+amount+interval |
| **Token Accounts** | Auto-derived | Associated token accounts for USDC |

---

## 🎯 New Simplified API

### Installation

```bash
npm install @ouroc/sdk
```

### Usage Example

```typescript
import { OuroCClient } from '@ouroc/sdk';

// 1. Initialize client - ONLY specify network
const client = new OuroCClient('devnet'); // or 'mainnet'

// 2. Connect user's wallet (using @solana/wallet-adapter)
// walletAdapter must be connected before creating subscription

// 3. Create subscription - ONLY 3 required fields!
const subscriptionId = await client.createSubscription({
  merchant_address: 'YOUR_MERCHANT_WALLET_ADDRESS',
  amount: 10, // 10 USDC per payment
  interval: 'monthly', // or 'daily', 'weekly', 'yearly'
}, walletAdapter);

console.log('✅ Subscription created:', subscriptionId);
// Output: "sub_a1b2c3d4e5f6g7h8"
```

That's it! No complex configuration needed.

---

## 📋 API Reference

### `new OuroCClient(network)`

**Constructor** - Initialize the SDK client

**Parameters:**
- `network: 'mainnet' | 'devnet'` - Which network to use

**Example:**
```typescript
const client = new OuroCClient('devnet');
```

**What it does automatically:**
- ✅ Connects to correct ICP canister
- ✅ Connects to correct Solana RPC
- ✅ Configures USDC mint address
- ✅ Sets up fee collection address
- ✅ Initializes Solana program ID

---

### `client.createSubscription(request, walletAdapter)`

**Method** - Create a new subscription

**Parameters:**

#### `request: CommunitySubscriptionRequest`

```typescript
{
  // Required
  merchant_address: string,  // Your wallet address (receives 98%)
  amount: number,            // Payment amount in USDC (e.g., 10)

  // Required: Choose ONE
  interval?: 'daily' | 'weekly' | 'monthly' | 'yearly',
  interval_seconds?: number, // For custom intervals

  // Optional
  merchant_name?: string,    // Your app name (default: 'Merchant')

  // NOTE: Notifications are HARDCODED to 24 hours (1 day) before payment
  // This is always enabled and cannot be customized for Community tier
}
```

#### `walletAdapter: WalletAdapter`

Must be a connected Solana wallet adapter (e.g., Phantom, Solflare).

**Returns:** `Promise<string>` - The generated subscription ID

**Example:**
```typescript
const subscriptionId = await client.createSubscription({
  merchant_address: 'MerchantPubkey123...',
  amount: 10, // 10 USDC
  interval: 'monthly',
  merchant_name: 'My SaaS App'
  // Note: Reminder is hardcoded to 1 day (24 hours) before payment
}, walletAdapter);
```

---

## 💰 Fee Structure (Automatic)

| Party | Receives | Notes |
|-------|----------|-------|
| **Subscriber** | Pays 100% | e.g., 10 USDC |
| **Merchant** | Receives 98% | e.g., 9.8 USDC |
| **Platform** | Collects 2% | e.g., 0.2 USDC (hardcoded) |

**Fee Address:** `CKEY8bppifSErEfP5cvX8hCnmQ2Yo911mosdRx7M3HxF`

The fee is automatically calculated and deducted by the Solana smart contract. Merchants receive 98% of each payment directly to their wallet.

---

## 🔑 Subscription ID Generation

Subscription IDs are **deterministic** and **unique** per subscription plan:

```typescript
// Auto-generated from:
subscription_id = sha256(
  merchant_address +
  subscriber_address +
  amount +
  interval_seconds
).slice(0, 16)

// Format: "sub_XXXXXXXXXXXXXXXX" (20 characters)
// Example: "sub_a1b2c3d4e5f6g7h8"
```

**Benefits:**
- ✅ Same plan from same merchant = same ID (idempotent)
- ✅ Different plans = different IDs
- ✅ No manual ID management needed
- ✅ Collision-resistant (64-bit hash)

---

## 📅 Interval Options

### Predefined Intervals

```typescript
interval: 'daily'   // Every 24 hours (86,400 seconds)
interval: 'weekly'  // Every 7 days (604,800 seconds)
interval: 'monthly' // Every 30 days (2,592,000 seconds)
interval: 'yearly'  // Every 365 days (31,536,000 seconds)
```

### Custom Intervals

```typescript
interval_seconds: 7200 // Custom: Every 2 hours
```

**Constraints:**
- Minimum: 3,600 seconds (1 hour)
- Maximum: 31,536,000 seconds (1 year)

---

## 🔔 Notification System

### ⚠️ HARDCODED for Community Tier

Subscribers **ALWAYS** receive notifications **24 hours (1 day) before payment**.

**This is non-configurable and always enabled by default.**

**Notification delivery:**
- ✅ Solana memo transactions (visible in wallet)
- ✅ On-chain events (for indexers)
- ✅ Sent by ICP canister timer

**Configuration (optional):**
```typescript
{
  merchant_name: 'Netflix', // Shows in notification (optional)
  // reminder_days: NOT CONFIGURABLE - always 1 day
}
```

**Notification Message Format:**
```
"Netflix: Payment due in 1 days. Amount: 10000000 USDC_MINT_ADDRESS"
```

**Why hardcoded?**
- ✅ Consistent user experience across all Community tier apps
- ✅ Prevents merchants from disabling notifications
- ✅ Ensures subscribers always have adequate warning
- ✅ Simplifies SDK configuration

---

## 🛡️ Token Account Requirements

**Important:** Users must have USDC token accounts before subscribing.

The SDK **does NOT create token accounts** for users. If a user doesn't have:
1. USDC balance
2. USDC token account

The first payment will fail with a clear error message.

**Recommended:**
- Check user has USDC before showing subscription UI
- Provide clear error messages if user lacks USDC

---

## 📦 What Gets Sent to Solana Contract

When you call `createSubscription()`, the SDK automatically builds and sends this to the Solana program:

```rust
create_subscription(
  subscription_id: "sub_a1b2c3d4e5f6g7h8",
  amount: 10_000_000,  // 10 USDC (micro-units)
  interval_seconds: 2_592_000,  // 30 days
  merchant_address: Pubkey,
  merchant_name: "My SaaS App",
  reminder_days_before_payment: 1,  // HARDCODED: Always 1 day (24 hours)
  icp_canister_signature: [u8; 64]  // ICP signature
)
```

**Note:** `reminder_days_before_payment` is always set to 1 by the SDK for Community tier.

**Solana contract then:**
1. Validates signature from ICP canister
2. Creates subscription PDA (Program Derived Address)
3. Sets up token delegation for recurring payments
4. Calculates fees automatically (98% merchant, 2% platform)

---

## 📦 What Gets Sent to ICP Canister

The ICP canister stores subscription metadata and manages the timer:

```motoko
{
  id: "sub_a1b2c3d4e5f6g7h8",
  solana_contract_address: "7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub",
  solana_payer: "SubscriberPubkey...",
  solana_receiver: "MerchantPubkey...",
  subscriber_usdc_account: "SubscriberUSDCAccount...",
  merchant_usdc_account: "MerchantUSDCAccount...",
  icp_fee_usdc_account: "CKEY8bppifSErEfP5cvX8hCnmQ2Yo911mosdRx7M3HxF",
  payment_token_mint: "USDC_MINT_ADDRESS",
  amount: 10_000_000,
  interval_seconds: 2_592_000,
  next_payment: timestamp + 2_592_000,
  is_active: true
}
```

**ICP canister responsibilities:**
1. Fire recurring payment triggers to Solana
2. Send notification signals before payments
3. Sign payment instructions with Ed25519
4. Manage subscription lifecycle

---

## 🔄 Complete Example: Monthly SaaS Subscription

```typescript
import { OuroCClient } from '@ouroc/sdk';
import { useWallet } from '@solana/wallet-adapter-react';

function SubscribeButton() {
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);

    try {
      // Initialize client
      const client = new OuroCClient('devnet');

      // Create subscription
      const subscriptionId = await client.createSubscription({
        merchant_address: 'YOUR_MERCHANT_WALLET',
        amount: 9.99, // $9.99/month
        interval: 'monthly',
        merchant_name: 'My SaaS Platform'
        // Note: Notification is hardcoded to 24 hours before payment
      }, {
        publicKey,
        signTransaction
      });

      console.log('✅ Subscription active:', subscriptionId);
      alert(`Subscription created! ID: ${subscriptionId}`);

    } catch (error) {
      console.error('❌ Subscription failed:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleSubscribe} disabled={loading}>
      {loading ? 'Creating...' : 'Subscribe for $9.99/month'}
    </button>
  );
}
```

---

## 🎯 Comparison: Before vs After

### Before (Complex)
```typescript
const client = new OuroCClient(
  'bkyz2-fmaaa-aaaaa-qaaaq-cai',  // Canister ID
  'mainnet',
  'https://ic0.app'
);

await client.createSubscription({
  subscription_id: 'manually-create-id',
  solana_contract_address: '7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub',
  subscriber_address: 'paste-wallet-here',
  merchant_address: 'your-wallet',
  payment_token_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  subscriber_usdc_account: 'paste-token-account',
  merchant_usdc_account: 'paste-merchant-account',
  icp_fee_usdc_account: 'paste-fee-account',
  amount: 10_000_000n,
  interval_seconds: 2_592_000n,
  api_key: 'your-key'
}, walletAdapter);
```

### After (Simple)
```typescript
const client = new OuroCClient('mainnet');

await client.createSubscription({
  merchant_address: 'your-wallet',
  amount: 10,
  interval: 'monthly'
}, walletAdapter);
```

**Lines of code:** 18 → 6 (67% reduction)
**Required inputs:** 12 → 3 (75% reduction)

---

## 🚀 Next Steps

1. **Install SDK:** `npm install @ouroc/sdk`
2. **Get your merchant wallet address** (Solana)
3. **Integrate subscription button** in your app
4. **Test on devnet** before going to mainnet
5. **Monitor subscriptions** via ICP canister queries

---

## 📞 Support

- **GitHub Issues:** https://github.com/OuroC/OuroC/issues
- **Documentation:** https://ouroc.com/docs
- **Community:** Discord/Telegram (coming soon)

---

## 🔐 Security Notes

1. **Token accounts must exist** - SDK assumes users have USDC accounts
2. **Wallet must be connected** - `walletAdapter.publicKey` must be available
3. **First payment immediate** - Subscription charges immediately upon creation
4. **Delegate approval** - Users must approve token delegation for recurring payments
5. **2% fee non-negotiable** - Hardcoded in smart contract for Community tier

---

## 📊 Fee Calculation Example

| Subscription Amount | Merchant Receives | Platform Fee |
|---------------------|-------------------|--------------|
| 10 USDC | 9.8 USDC | 0.2 USDC |
| 50 USDC | 49 USDC | 1 USDC |
| 100 USDC | 98 USDC | 2 USDC |
| 500 USDC | 490 USDC | 10 USDC |

Formula: `merchant_amount = amount * 0.98`

---

## ✅ Summary: What Merchants Need to Know

**You only control:**
1. Your merchant wallet address
2. Subscription amount (in USDC)
3. Payment frequency (daily/weekly/monthly/yearly)
4. (Optional) Notification timing and app name

**Everything else is automatic:**
- Subscription ID generation
- Subscriber address extraction
- Token mint selection (USDC)
- Fee collection address
- Smart contract integration
- ICP canister communication

**Focus on your business logic, we handle the infrastructure!** 🚀
