# Migration Guide - Multi-Token Support & Merchant-Configured Notifications

## Overview

Version 2.0 introduces multi-stablecoin support and merchant-configured notification timing. This guide helps you update your integration.

## What's New

### 1. Multi-Token Payment Support
Users can now pay with USDC, USDT, PYUSD, or DAI. Merchants always receive USDC.

### 2. Merchant-Configured Notification Timing
Merchants can now specify when to send payment reminders (1-30 days before payment).

### 3. Amount Locked at Creation
Payment amount and token type are now locked when the subscription is created (delegation time).

---

## Breaking Changes

### CreateSubscriptionRequest Type

**Before:**
```typescript
interface CreateSubscriptionRequest {
  solana_payer: SolanaAddress
  solana_receiver: SolanaAddress
  payment_amount: bigint
  interval_seconds: bigint
  metadata?: string
}
```

**After:**
```typescript
interface CreateSubscriptionRequest {
  subscription_id: string
  solana_contract_address: SolanaAddress
  solana_payer: SolanaAddress
  solana_receiver: SolanaAddress
  subscriber_usdc_account: SolanaAddress
  merchant_usdc_account: SolanaAddress
  icp_fee_usdc_account: SolanaAddress
  payment_token_mint: SolanaAddress // USDC/USDT/PYUSD/DAI
  amount: bigint // Micro-units (e.g., 10_000_000 = 10 USDC)
  reminder_days_before_payment: number // 1-30 days
  interval_seconds: bigint
  start_time?: Timestamp
}
```

### Subscription Type

**Before:**
```typescript
interface Subscription {
  id: SubscriptionId
  solana_payer: SolanaAddress
  solana_receiver: SolanaAddress
  payment_amount: bigint
  interval_seconds: bigint
  next_payment: Timestamp
  is_active: boolean
  created_at: Timestamp
}
```

**After:**
```typescript
interface Subscription {
  id: SubscriptionId
  solana_contract_address: SolanaAddress
  solana_payer: SolanaAddress
  solana_receiver: SolanaAddress
  subscriber_usdc_account: SolanaAddress
  merchant_usdc_account: SolanaAddress
  icp_fee_usdc_account: SolanaAddress
  payment_token_mint: SolanaAddress
  amount: bigint
  reminder_days_before_payment: number
  interval_seconds: bigint
  next_payment: Timestamp
  is_active: boolean
  created_at: Timestamp
  last_triggered?: Timestamp
  trigger_count: number
}
```

---

## Migration Steps

### Step 1: Update Imports

Add new helper types and functions:

```typescript
import {
  OuroCClient,
  CreateSubscriptionRequest,
  SupportedToken,
  TOKEN_MINTS,
  toMicroUnits,
  fromMicroUnits,
  formatTokenAmount
} from '@ouroctime/react-sdk'
```

### Step 2: Update Subscription Creation

**Before:**
```typescript
const request: CreateSubscriptionRequest = {
  solana_payer: payerAddress,
  solana_receiver: merchantAddress,
  payment_amount: BigInt(10_000_000), // 10 SOL in lamports
  interval_seconds: BigInt(30 * 24 * 60 * 60), // 30 days
}

const subscriptionId = await client.createSubscription(request)
```

**After:**
```typescript
// Step 1: Choose payment token
const token: SupportedToken = 'USDC' // or 'USDT', 'PYUSD', 'DAI'

// Step 2: Convert amount to micro-units
const amountInTokens = 10 // 10 USDC
const amountMicroUnits = toMicroUnits(amountInTokens) // 10_000_000

// Step 3: Create subscription request
const request: CreateSubscriptionRequest = {
  subscription_id: 'sub_' + Date.now(),
  solana_contract_address: SOLANA_CONTRACT_ADDRESS,
  solana_payer: payerAddress,
  solana_receiver: merchantAddress,
  subscriber_usdc_account: subscriberTokenAccount,
  merchant_usdc_account: merchantUSDCAccount,
  icp_fee_usdc_account: icpFeeAccount,
  payment_token_mint: TOKEN_MINTS[token], // Token mint address
  amount: amountMicroUnits, // Payment amount in micro-units
  reminder_days_before_payment: 3, // Merchant configured (1-30)
  interval_seconds: BigInt(30 * 24 * 60 * 60), // 30 days
  start_time: BigInt(Date.now() * 1_000_000) // Optional
}

const subscriptionId = await client.createSubscription(request)
```

### Step 3: Update UI Components

**SubscriptionCard Component:**

```typescript
<SubscriptionCard
  planName="Premium Plan"
  price={10}
  token="USDC" // NEW: Specify token type
  interval="monthly"
  reminderDays={3} // NEW: Merchant configures reminder timing
  features={[
    'Unlimited access',
    'Priority support',
    'Advanced analytics'
  ]}
  onSubscribe={async (plan) => {
    const request: CreateSubscriptionRequest = {
      subscription_id: `sub_${plan.id}_${Date.now()}`,
      solana_contract_address: CONTRACT_ADDRESS,
      solana_payer: wallet.publicKey.toString(),
      solana_receiver: MERCHANT_ADDRESS,
      subscriber_usdc_account: await getTokenAccount(wallet, plan.token),
      merchant_usdc_account: MERCHANT_USDC_ACCOUNT,
      icp_fee_usdc_account: ICP_FEE_ACCOUNT,
      payment_token_mint: TOKEN_MINTS[plan.token],
      amount: toMicroUnits(plan.price),
      reminder_days_before_payment: plan.reminderDays,
      interval_seconds: BigInt(plan.intervalSeconds)
    }

    await client.createSubscription(request)
  }}
/>
```

### Step 4: Display Subscription Information

**Before:**
```typescript
const subscription = await client.getSubscription(subscriptionId)
console.log(`Payment: ${subscription.payment_amount} lamports`)
```

**After:**
```typescript
const subscription = await client.getSubscription(subscriptionId)

// Format amount with token
const formattedAmount = formatTokenAmount(subscription.amount, 'USDC')
console.log(`Payment: ${formattedAmount}`) // "10.000000 USDC"

// Get token type from mint address
const tokenMint = subscription.payment_token_mint
const token = Object.entries(TOKEN_MINTS).find(
  ([_, mint]) => mint === tokenMint
)?.[0] || 'Unknown'

console.log(`Token: ${token}`) // "USDC", "USDT", "PYUSD", or "DAI"
console.log(`Reminder: ${subscription.reminder_days_before_payment} days before payment`)
```

---

## New Features You Can Use

### 1. Multi-Token Selection UI

```typescript
const SupportedTokens: SupportedToken[] = ['USDC', 'USDT', 'PYUSD', 'DAI']

function TokenSelector({ onSelect }: { onSelect: (token: SupportedToken) => void }) {
  return (
    <div>
      <h3>Choose your payment token:</h3>
      {SupportedTokens.map(token => (
        <button key={token} onClick={() => onSelect(token)}>
          {token}
        </button>
      ))}
    </div>
  )
}
```

### 2. Reminder Day Customization

```typescript
function ReminderDaySelector({
  value,
  onChange
}: {
  value: number
  onChange: (days: number) => void
}) {
  return (
    <div>
      <label>Send payment reminders (days before payment):</label>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        <option value={1}>1 day</option>
        <option value={3}>3 days</option>
        <option value={7}>7 days</option>
        <option value={14}>14 days</option>
        <option value={30}>30 days</option>
      </select>
    </div>
  )
}
```

### 3. Amount Formatting

```typescript
// Convert user input to micro-units
const userInput = 10.50 // User enters "10.50 USDC"
const microUnits = toMicroUnits(userInput) // 10_500_000n

// Display subscription amount
const subscription = await client.getSubscription(id)
const displayAmount = fromMicroUnits(subscription.amount) // 10.5
const formatted = formatTokenAmount(subscription.amount, 'USDC') // "10.500000 USDC"
```

---

## Notification Changes

### What Users See

When a payment is 3 days away (or merchant-configured days), users receive a notification in their Solana wallet:

```
OuroC: Payment in 3 days. Amount: 10.000000 USDC. Sub: sub_xyz
```

**Key Points:**
- Amount comes from subscription creation (locked value)
- Token type comes from subscription creation (locked value)
- Days before payment is merchant-configured at creation
- Sent to user's Solana wallet address as a memo transaction

---

## Testing Checklist

- [ ] Update all `CreateSubscriptionRequest` calls to include new fields
- [ ] Add token selection UI for users
- [ ] Add reminder day configuration for merchants
- [ ] Update subscription display to show token type and amount
- [ ] Test with different token types (USDC, USDT, PYUSD, DAI)
- [ ] Verify notification timing matches merchant configuration
- [ ] Check amount formatting displays correctly (6 decimals)

---

## Support

For questions or issues, please open an issue at:
https://github.com/your-org/ouro-c/issues
