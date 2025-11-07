# Payment Flows - OuroC-Mesos

**Date**: November 4, 2025
**Purpose**: Document how payments flow for different use cases

---

## Overview

OuroC-Mesos has three primary payment flows:
1. **Community Hub** (Creator → Student)
2. **Guild Treasury** (Member → Multisig)
3. **Regular Subscriptions** (User → Merchant)

---

## Flow 1: Community Hub (P2P Learning)

### Payment Direction
```
Student Wallet → OuroC-Prima Contract → Creator Wallet (98%)
                                      → ICP Fee (2%)
```

### How It Works

#### **When Creator Creates Content:**
```typescript
// CreateContent.tsx
const publicKey = useWallet().publicKey; // Creator's wallet

// Store content with creator's wallet as merchant
await createContent({
  title: "Advanced React Patterns",
  price: 30,
  interval: "monthly",
  creatorWallet: publicKey.toString(), // ← This is the merchant!
  // ... other fields
});
```

#### **When Student Subscribes:**
```typescript
// CommunityHub.tsx
const content = getContent(contentId);

// Create subscription with creator as merchant
await createSubscription(
  studentWallet,           // subscriber
  content.creatorWallet,   // merchant (creator's wallet!)
  content.price,           // $30
  intervalToSeconds(content.interval), // 30 days
  content.creatorName      // merchant name
);
```

### Result
- ✅ Recurring payments go **DIRECTLY to creator's wallet**
- ✅ No middleman (except smart contract escrow)
- ✅ Creator keeps 98%, ICP fee is 2%
- ✅ True P2P payments

---

## Flow 2: Guild Treasury (DAO/Multisig)

### Payment Direction
```
Member Wallet → OuroC-Prima Contract → Guild Multisig (98%)
                                     → ICP Fee (2%)
```

### How It Works

#### **When Guild is Created:**
```typescript
// CreateGuild.tsx
const { guild, multisigAddress } = await guildService.createGuild({
  name: "Solana Builders Guild",
  subscriptionPrice: 50,
  votingThreshold: 60,
  initialMembers: [member1, member2, member3],
  // ...
});

// Guild treasury = Squads multisig
console.log("Treasury:", multisigAddress); // e.g., "8jP7xK..."
```

#### **When Member Joins:**
```typescript
// GuildDetail.tsx
const guild = await guildService.getGuild(guildId);

// Create subscription to guild treasury (multisig)
await guildService.joinGuild({
  guildId: guildId,
  memberWallet: publicKey.toString()
});

// Internally calls:
await createSubscription(
  memberWallet,            // subscriber
  guild.treasuryAddress,   // merchant (Squads multisig!)
  guild.subscriptionPrice, // $50
  intervalToSeconds(guild.interval), // 30 days
  guild.name               // merchant name
);
```

#### **When Proposal is Executed:**
```typescript
// Guild members vote → Threshold met → Funds disbursed
await guildService.executeProposal({ proposalId });

// Multisig sends funds to proposal recipient
// From: Guild Treasury (multisig)
// To: Proposal recipient
```

### Result
- ✅ Member subscriptions go to **guild multisig treasury**
- ✅ Funds held collectively
- ✅ Requires threshold signatures to spend (e.g., 3-of-5)
- ✅ Democratic/transparent fund management

---

## Flow 3: Regular Subscriptions (Traditional)

### Payment Direction
```
User Wallet → OuroC-Prima Contract → Merchant Wallet (98%)
                                   → ICP Fee (2%)
```

### How It Works

#### **When User Subscribes:**
```typescript
// Buy.tsx or any subscription page
await createSubscription(
  userWallet,              // subscriber
  merchantWallet,          // merchant (business/service provider)
  amount,                  // e.g., $9.99
  intervalSeconds,         // e.g., 2592000 (30 days)
  merchantName             // e.g., "Netflix"
);
```

### Result
- ✅ Payments go to **specified merchant wallet**
- ✅ Standard subscription model
- ✅ Used for traditional businesses

---

## Comparison Matrix

| Use Case | Subscriber | Merchant | Payment Goes To | Governance |
|----------|-----------|----------|----------------|------------|
| **Community Hub** | Student | Creator | Creator's wallet | None (P2P) |
| **Guild Treasury** | Member | Guild | Squads multisig | Multisig voting |
| **Regular Sub** | User | Merchant | Merchant's wallet | None |

---

## Technical Implementation

### OuroC-Prima Smart Contract

All three flows use the same `createSubscription` function:

```rust
// src/timer_rust/src/lib.rs

pub fn create_subscription(
    subscription_id: String,
    subscriber_address: String,
    merchant_address: String,  // ← Key parameter!
    amount: u64,
    interval_seconds: u64,
    // ... other params
) -> Result<(), String> {
    // Recurring payment will be sent to merchant_address
    // ...
}
```

**The `merchant_address` parameter determines where payments go:**
- Community Hub: `merchant_address = creator.wallet`
- Guild: `merchant_address = guild.treasuryAddress` (multisig)
- Regular: `merchant_address = business.wallet`

### Frontend Implementation

#### Community Hub:
```typescript
// frontend/src/lib/communityHubService.ts (future)

export async function subscribeToContent(
  contentId: string,
  studentWallet: string
) {
  const content = await getContent(contentId);

  return await createSubscription(
    studentWallet,
    content.creatorWallet,  // Creator gets paid directly!
    content.price,
    intervalToSeconds(content.interval),
    content.creatorName
  );
}
```

#### Guild Treasury:
```typescript
// frontend/src/lib/guildService.ts

export async function joinGuild(
  guildId: string,
  memberWallet: string
) {
  const guild = await getGuild(guildId);

  return await createSubscription(
    memberWallet,
    guild.treasuryAddress,  // Multisig gets paid!
    guild.subscriptionPrice,
    intervalToSeconds(guild.interval),
    guild.name
  );
}
```

---

## Fee Distribution

All payments follow the same fee structure:

```
Total Payment: 100%
├── Merchant/Creator/Guild: 98%
└── ICP Infrastructure Fee: 2%
```

### Example: $50/month subscription

- **Student/Member pays**: $50
- **Creator/Guild receives**: $49 (98%)
- **ICP fee**: $1 (2%)

**Note**: The 2% fee covers:
- ICP canister execution costs
- Threshold ECDSA signing
- Timer management
- HTTP outcalls to Solana

---

## Security Considerations

### Community Hub
- ✅ Creator wallet is public (they want students)
- ✅ Payments go directly to creator
- ⚠️ No refund mechanism (trust-based)
- ⚠️ Content delivery must be handled separately

### Guild Treasury
- ✅ Multisig prevents single-point theft
- ✅ All spending requires threshold approval
- ✅ Transparent on-chain transactions
- ⚠️ Members must trust other signers
- ⚠️ Threshold must be set carefully (not too high, not too low)

### Regular Subscriptions
- ✅ Standard merchant model
- ✅ Merchant controls refunds
- ⚠️ Merchant wallet must be verified

---

## Future Enhancements

### Community Hub
- [ ] Escrow for first payment (release after content access confirmed)
- [ ] Rating/review system
- [ ] Automated refunds if creator doesn't deliver
- [ ] NFT-gated content access

### Guild Treasury
- [ ] Sub-treasuries for specific purposes
- [ ] Budget allocation per category
- [ ] Automated recurring grants
- [ ] Integration with Realms for larger DAOs

### All Flows
- [ ] Support for multiple SPL tokens (USDC, USDT, SOL)
- [ ] Discount codes
- [ ] Trial periods
- [ ] Annual billing options

---

## Summary

### Key Principle
**The `merchant_address` parameter in `createSubscription()` determines where payments go.**

### Three Distinct Flows:
1. **Community Hub**: Student → Creator's wallet (P2P)
2. **Guild Treasury**: Member → Squads multisig (collective)
3. **Regular Subscription**: User → Merchant's wallet (traditional)

### All Powered By:
- OuroC-Prima smart contract on Solana
- ICP Timer canister for recurring execution
- Threshold ECDSA for secure signing

This flexible architecture supports multiple business models with the same underlying infrastructure! 🚀
