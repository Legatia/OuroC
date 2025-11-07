# TODOs and Placeholders - Current Status

**Date**: November 4, 2025
**Purpose**: Track all remaining TODOs and placeholders in the codebase

---

## Summary

### 📊 Overall Status
- **Total TODOs**: 12
- **Mock Implementations**: 8 (in squadsService.ts)
- **"Coming Soon" Alerts**: 4
- **Placeholder Images**: 6 (Community Hub thumbnails)
- **High Priority**: 5
- **Medium Priority**: 7
- **Low Priority**: 6

---

## High Priority TODOs (Production Blockers)

### 1. ❗ Guild Voting Implementation
**File**: `frontend/src/pages/GuildDetail.tsx`
**Line**: ~120
**Current**:
```typescript
const handleVote = async (proposalId: string, vote: 'for' | 'against') => {
  toast.success(`Voted ${vote} on proposal - Coming soon!`);
  // TODO: Implement voting
};
```

**Action Required**:
```typescript
const handleVote = async (proposalId: string, vote: 'for' | 'against') => {
  if (!publicKey) {
    toast.error("Please connect your wallet");
    return;
  }

  const result = await guildService.voteOnProposal({
    proposalId,
    voterWallet: publicKey.toString(),
    vote
  });

  if (result.success) {
    toast.success(`Voted ${vote}!`);
    fetchProposals(); // Refresh data
  } else {
    toast.error(result.error);
  }
};
```

**Estimated Time**: 1 hour

---

### 2. ❗ Guild Join Flow
**File**: `frontend/src/pages/GuildDetail.tsx`
**Line**: ~130
**Current**:
```typescript
const handleJoinGuild = () => {
  toast.info('Join guild flow - Coming soon!');
  // TODO: Implement join flow
};
```

**Action Required**:
```typescript
const handleJoinGuild = async () => {
  if (!publicKey) {
    toast.error("Please connect your wallet");
    return;
  }

  const result = await guildService.joinGuild({
    guildId: guildId,
    memberWallet: publicKey.toString()
  });

  if (result.success) {
    toast.success(`Joined guild! Subscription ID: ${result.subscriptionId}`);
    fetchGuildData(); // Refresh data
  } else {
    toast.error(result.error);
  }
};
```

**Estimated Time**: 1 hour

---

### 3. ❗ Community Hub Subscription Flow
**File**: `frontend/src/pages/CommunityHub.tsx`
**Line**: ~151
**Current**:
```typescript
const handleSubscribe = (contentId: string) => {
  // TODO: Integrate with OuroC-Prima subscription flow
  alert(`Subscription flow for ${contentId} - Coming soon!`);
};
```

**Action Required**:
```typescript
const handleSubscribe = async (contentId: string) => {
  if (!publicKey) {
    toast.error("Please connect your wallet");
    return;
  }

  const content = allContent.find(c => c.id === contentId);
  if (!content) return;

  const result = await createSubscription(
    publicKey.toString(),        // student
    content.creatorWallet,       // creator (merchant)
    content.price,
    intervalToSeconds(content.interval),
    content.creatorName
  );

  if (result.success) {
    toast.success("Subscribed successfully!");
    navigate('/profile?tab=learn');
  } else {
    toast.error(result.error);
  }
};
```

**Estimated Time**: 2 hours (need to add creatorWallet to content data)

---

### 4. ❗ Guild Creation Flow
**File**: `frontend/src/pages/CreateGuild.tsx`
**Line**: ~200
**Current**:
```typescript
const handleSubmit = async () => {
  // TODO: Implement guild creation
  await new Promise(resolve => setTimeout(resolve, 2000));
  toast.success("Guild created! (Mock)");
};
```

**Action Required**:
```typescript
const handleSubmit = async () => {
  if (!publicKey) {
    toast.error("Please connect your wallet");
    return;
  }

  setIsSubmitting(true);

  try {
    const { guild, multisigAddress } = await guildService.createGuild({
      name: formData.name,
      description: formData.description,
      category: formData.category,
      subscriptionPrice: parseFloat(formData.subscriptionPrice),
      interval: formData.interval,
      governanceType: formData.governanceType,
      votingThreshold: formData.votingThreshold,
      initialMembers: [publicKey.toString()],
      creatorWallet: publicKey.toString(),
      logoEmoji: formData.logoEmoji,
      tags: formData.tags.split(',').map(t => t.trim()),
      membershipType: formData.membershipType
    });

    toast.success(`Guild created! Treasury: ${multisigAddress.slice(0, 8)}...`);
    navigate(`/guild/${guild.id}`);
  } catch (error) {
    toast.error("Failed to create guild");
  } finally {
    setIsSubmitting(false);
  }
};
```

**Estimated Time**: 2 hours

---

### 5. ❗ Content Creation Backend Integration
**File**: `frontend/src/pages/CreateContent.tsx`
**Line**: ~153
**Current**:
```typescript
try {
  // TODO: Integrate with backend
  // 1. Upload thumbnail to IPFS/CDN
  // 2. Store content metadata in database

  await new Promise(resolve => setTimeout(resolve, 2000));
  toast.success("Content created! (Mock)");
}
```

**Action Required**:
```typescript
try {
  // 1. Upload thumbnail to IPFS (if provided)
  let thumbnailUrl = '';
  if (thumbnailPreview) {
    const ipfsHash = await uploadToIPFS(thumbnailFile);
    thumbnailUrl = `ipfs://${ipfsHash}`;
  }

  // 2. Store content in database
  const response = await fetch('/api/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      price: parseFloat(formData.price),
      interval: formData.interval,
      thumbnailUrl,
      creatorWallet: publicKey.toString(),
      merchantAddress: publicKey.toString(), // Creator gets paid!
    })
  });

  const { contentId } = await response.json();

  toast.success("Content created successfully!");
  navigate('/profile?tab=content');
}
```

**Estimated Time**: 4 hours (includes IPFS setup + backend API)

---

## Medium Priority TODOs (Important but not Blocking)

### 6. 🟡 Replace Squads Mock Implementations
**File**: `frontend/src/lib/squadsService.ts`
**Lines**: Multiple (8 mock implementations)

**Mock Functions**:
1. `createMultisig()` - Returns mock PDA
2. `getMultisig()` - Returns mock data
3. `createTransaction()` - Returns mock tx index
4. `approveTransaction()` - Returns mock signature
5. `rejectTransaction()` - Returns mock signature
6. `executeTransaction()` - Returns mock signature
7. `getTransaction()` - Returns mock status
8. `isReadyToExecute()` - Always returns false

**Action Required**:
Connect real Squads SDK with wallet adapter:

```typescript
// 1. Add wallet adapter dependency
import { useWallet } from '@solana/wallet-adapter-react';

// 2. Update each method to use real Squads SDK
async createMultisig(threshold, members, creator) {
  const squads = Squads.endpoint(this.connection, walletAdapter);
  const multisigAccount = await squads.createMultisig(
    threshold,
    createKey.publicKey,
    members
  );
  return { multisigPda: multisigAccount.publicKey };
}
```

**Estimated Time**: 8 hours (all methods + testing)

---

### 7. 🟡 Arc Contract ICP Integration
**File**: `frontend/src/lib/arcContract.ts`
**Line**: ~50
**Current**:
```typescript
// TODO: Replace with actual ICP canister call
const mockSignature = new Uint8Array(64).fill(0);
return mockSignature;
```

**Action Required**:
```typescript
const signature = await getPaymentSignature(
  subscriptionId,
  amount
);

if (!signature.success) {
  throw new Error("Failed to get signature");
}

return signature.signature;
```

**Estimated Time**: 2 hours

---

### 8. 🟡 Solana Account Deserialization
**File**: `frontend/src/lib/solana.ts`
**Line**: ~80
**Current**:
```typescript
// TODO: Deserialize account data using Anchor
const subscriptionData = {};
return subscriptionData;
```

**Action Required**:
```typescript
import { Program } from "@project-serum/anchor";
import { IDL } from "./idl/ouroc_prima";

const program = new Program(IDL, programId, provider);
const subscriptionData = await program.account.subscription.fetch(
  subscriptionAddress
);

return subscriptionData;
```

**Estimated Time**: 3 hours

---

### 9. 🟡 Arc Chain ID Configuration
**File**: `frontend/src/lib/networks.ts`
**Line**: ~10
**Current**:
```typescript
chainId: parseInt(import.meta.env.VITE_ARC_CHAIN_ID || '0'),
// TODO: Update with actual Arc chain ID
```

**Action Required**:
Research actual Arc testnet chain ID and update .env:
```bash
VITE_ARC_CHAIN_ID=12345 # Replace with actual Arc chain ID
```

**Estimated Time**: 30 minutes (research)

---

### 10. 🟡 Solana Contract Call Before Timer
**File**: `frontend/src/lib/backend.ts`
**Line**: ~203
**Current**:
```typescript
// TODO: Call Solana smart contract first
// This will be implemented when we deploy the Solana contract
console.log('📝 Would call Solana contract create_subscription');
```

**Action Required**:
```typescript
// 1. Call Solana contract to register subscription
const solanaResult = await createSubscriptionOnChain(
  subscriptionId,
  amount,
  intervalSeconds,
  merchantAddress,
  paymentTokenMint
);

if (!solanaResult.success) {
  throw new Error("Failed to create on-chain subscription");
}

// 2. Then create timer canister subscription
const result = await actor.create_subscription(request);
```

**Estimated Time**: 3 hours

---

### 11. 🟡 Guild Join from Discovery Page
**File**: `frontend/src/pages/Guild.tsx`
**Line**: ~175
**Current**:
```typescript
const handleJoinGuild = (guildId: string) => {
  alert(`Join guild flow for ${guildId} - Coming soon!`);
  // TODO: Implement join guild flow
};
```

**Action Required**:
```typescript
const handleJoinGuild = async (guildId: string) => {
  if (!publicKey) {
    toast.error("Please connect your wallet");
    return;
  }

  // Navigate to guild detail page where they can join
  navigate(`/guild/${guildId}`);

  // Or implement direct join:
  // const result = await guildService.joinGuild({
  //   guildId,
  //   memberWallet: publicKey.toString()
  // });
};
```

**Estimated Time**: 30 minutes

---

### 12. 🟡 Thumbnail Upload to IPFS
**File**: `frontend/src/pages/CreateContent.tsx`
**Line**: ~86
**Current**:
```typescript
// TODO: Upload to IPFS or storage service
// For now, just store the file name
handleInputChange('thumbnailUrl', file.name);
```

**Action Required**:
```typescript
// Use IPFS service (Pinata, NFT.Storage, etc.)
const formData = new FormData();
formData.append('file', file);

const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${PINATA_JWT}`
  },
  body: formData
});

const { IpfsHash } = await response.json();
handleInputChange('thumbnailUrl', `ipfs://${IpfsHash}`);
```

**Estimated Time**: 2 hours (setup IPFS service)

---

## Low Priority TODOs (Nice to Have)

### 13. 🟢 Replace Placeholder Images
**File**: `frontend/src/pages/CommunityHub.tsx`
**Lines**: Multiple (6 placeholder images)

**Current**:
```typescript
thumbnail: 'https://via.placeholder.com/400x300/3b82f6/ffffff?text=React+Patterns'
```

**Action Required**:
Replace with actual course thumbnails or use a default image service.

**Estimated Time**: 1 hour

---

## Implementation Priority

### Week 1 (Critical - 12 hours)
1. ✅ Guild voting (1h)
2. ✅ Guild join flow (1h)
3. ✅ Community Hub subscription (2h)
4. ✅ Guild creation flow (2h)
5. ⏳ Content creation backend (4h)
6. ⏳ Arc Chain ID config (30m)
7. ⏳ Guild join from discovery (30m)

### Week 2-3 (Important - 16 hours)
1. ⏳ Squads mock → real SDK (8h)
2. ⏳ Arc contract ICP integration (2h)
3. ⏳ Solana account deserialization (3h)
4. ⏳ Solana contract call before timer (3h)

### Week 4 (Nice to Have - 3 hours)
1. ⏳ Thumbnail upload to IPFS (2h)
2. ⏳ Replace placeholder images (1h)

**Total Estimated Time**: 31 hours (~4 weeks at 8 hours/week)

---

## Dependencies

### External Services Needed
1. **IPFS Service** (Pinata, NFT.Storage, Web3.Storage)
   - For thumbnail uploads
   - Cost: Free tier available

2. **Backend API** (Node.js/Express or ICP canisters)
   - For content metadata
   - For guild data
   - For member management

3. **Database** (PostgreSQL or ICP stable memory)
   - Guilds, members, proposals
   - Content, creators, enrollments

4. **Wallet Adapter Context**
   - For Squads SDK integration
   - Already have: @solana/wallet-adapter-react

---

## Testing Checklist

### Before Production
- [ ] Test guild creation with real wallet
- [ ] Test guild join with subscription
- [ ] Test proposal creation
- [ ] Test voting mechanism
- [ ] Test proposal execution
- [ ] Test content creation
- [ ] Test content subscription
- [ ] Test all payment flows
- [ ] Load testing (50+ guilds)
- [ ] Security audit

---

## Notes

### Mock vs Production
Most TODOs are transitioning from **mock implementations** to **production integrations**:

**Mock (Current)**:
```typescript
// Returns fake data for development
return { multisigPda: mockKey };
```

**Production (Target)**:
```typescript
// Calls real blockchain/API
const result = await squads.createMultisig(...);
return { multisigPda: result.publicKey };
```

### Backend Strategy
Many TODOs can be resolved with either:
1. **ICP Canisters** (chain fusion approach)
2. **Traditional Backend** (Node.js + PostgreSQL)

**Recommendation**: Start with ICP canisters for guild data, add traditional backend only if needed for complex queries.

---

## Summary

### Current State
- ✅ **Architecture Complete**: All services structured correctly
- ✅ **Type Safety**: Full TypeScript implementation
- ⏳ **Mock Implementations**: Ready to be replaced with real calls
- ⏳ **Backend Integration**: Needs API endpoints

### Blockers
1. Wallet adapter integration for Squads
2. Backend API for data persistence
3. IPFS service for file uploads

### Timeline
- **MVP (Core Flows)**: 1 week
- **Production Ready**: 4 weeks
- **Polished**: 6 weeks

**Status**: Well-structured codebase with clear path to production! 🚀
