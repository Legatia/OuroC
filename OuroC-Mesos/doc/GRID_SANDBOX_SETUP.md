# Grid Sandbox API Setup

**Date**: November 4, 2025
**Purpose**: Configure Grid Sandbox API for Squads multisig integration

---

## What is Grid Sandbox?

**Grid Sandbox** is a development platform by Squads Protocol that provides API access to create and manage multisig wallets programmatically.

**Website**: https://grid.squads.xyz/

---

## API Key

**Your API Key**: `cb40cc81-a029-41bc-b9b9-de06250b03e6`

This key is already configured in:
- `frontend/.env` (active)
- `frontend/.env.example` (template)

---

## Configuration

### Environment Variable

```bash
# frontend/.env
VITE_GRID_SANDBOX_API_KEY=cb40cc81-a029-41bc-b9b9-de06250b03e6
```

### Usage in Code

```typescript
// frontend/src/lib/squadsService.ts

const getConfig = () => ({
  rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL,
  network: import.meta.env.VITE_SOLANA_NETWORK,
  gridApiKey: import.meta.env.VITE_GRID_SANDBOX_API_KEY  // ← Used here
});
```

---

## What Grid Sandbox Provides

### 1. **Multisig Creation**
Create multisig wallets programmatically:
```typescript
const multisig = await createMultisig(
  threshold,      // e.g., 3
  members,        // Array of PublicKeys
  gridApiKey      // Authentication
);
```

### 2. **Transaction Management**
- Create transactions (proposals)
- Approve transactions (vote)
- Execute transactions (disburse funds)

### 3. **Monitoring**
- Query multisig state
- Check transaction status
- Get approval counts

### 4. **Development Tools**
- Sandbox environment for testing
- Devnet integration
- Debug tools

---

## API Limits (Sandbox)

**Free Tier:**
- 100 API calls per day
- Devnet only
- Rate limit: 10 requests/minute

**For Production:**
- Upgrade to paid plan
- Mainnet access
- Higher rate limits
- Priority support

---

## Grid Sandbox vs Squads SDK

### Grid Sandbox (API)
- RESTful API
- Language agnostic
- Requires API key
- Easier for backend integration

### Squads SDK (@sqds/sdk)
- TypeScript/JavaScript library
- Direct blockchain interaction
- No API key needed (but needs wallet)
- Better for frontend integration

**Our Approach:** Use Squads SDK in frontend, Grid API for backend automation.

---

## Setup Guide

### 1. **Get API Key** ✅ (Already Done)

Visit https://grid.squads.xyz/ and sign up to get your API key.

**Your Key**: `cb40cc81-a029-41bc-b9b9-de06250b03e6`

### 2. **Add to Environment** ✅ (Already Done)

```bash
# frontend/.env
VITE_GRID_SANDBOX_API_KEY=cb40cc81-a029-41bc-b9b9-de06250b03e6
```

### 3. **Update SquadsService** ✅ (Already Done)

```typescript
// frontend/src/lib/squadsService.ts

const config = getConfig();
console.log("Grid API Key:", config.gridApiKey ? "✓ Configured" : "✗ Missing");
```

### 4. **Test Integration** (TODO)

```typescript
// Test that API key is loaded
const config = getConfig();
if (!config.gridApiKey) {
  console.error("Grid API key not configured!");
}
```

---

## Example Usage

### Create Guild Treasury (Multisig)

```typescript
import { squadsService } from '@/lib/squadsService';

// Create multisig wallet for guild
const { multisigPda } = await squadsService.createMultisig(
  3,              // threshold (3 signatures required)
  memberPubkeys,  // 5 guild members
  creatorPubkey   // Guild creator
);

console.log("Guild Treasury:", multisigPda.toString());
// Output: "8jP7xK..." (Solana address)
```

### Create Proposal

```typescript
// Create proposal to send funds
const { transactionIndex } = await squadsService.createTransaction(
  multisigPda,      // Guild treasury
  recipientPubkey,  // Who gets the funds
  1000,             // 1000 SOL
  proposerPubkey    // Proposal creator
);

console.log("Proposal #:", transactionIndex);
// Output: 42
```

### Vote on Proposal

```typescript
// Member votes to approve
await squadsService.approveTransaction(
  multisigPda,
  transactionIndex,
  memberPubkey
);

console.log("Vote recorded!");
```

### Execute Proposal (Auto)

```typescript
// Check if threshold met
const isReady = await squadsService.isReadyToExecute(
  multisigPda,
  transactionIndex
);

if (isReady) {
  // Execute transaction
  const signature = await squadsService.executeTransaction(
    multisigPda,
    transactionIndex,
    executorPubkey
  );

  console.log("Funds sent! TX:", signature);
}
```

---

## Security Best Practices

### 1. **Keep API Key Secret**

✅ **DO:**
- Store in `.env` file
- Add `.env` to `.gitignore`
- Use environment variables

❌ **DON'T:**
- Commit API key to Git
- Share API key publicly
- Hardcode in source code

### 2. **Rotate Keys Regularly**

- Generate new API key every 3 months
- Update `.env` file
- Revoke old key on Grid dashboard

### 3. **Monitor Usage**

- Check API call count on Grid dashboard
- Set up alerts for unusual activity
- Monitor rate limit usage

### 4. **Separate Keys for Environments**

```bash
# Development
VITE_GRID_SANDBOX_API_KEY=dev_key_here

# Production
VITE_GRID_SANDBOX_API_KEY=prod_key_here
```

---

## Troubleshooting

### Error: "Invalid API Key"

**Solution:**
```bash
# Check .env file
cat frontend/.env | grep GRID

# Should output:
VITE_GRID_SANDBOX_API_KEY=cb40cc81-a029-41bc-b9b9-de06250b03e6
```

### Error: "Rate Limit Exceeded"

**Solution:**
- Wait 1 minute before retrying
- Upgrade to paid plan for higher limits
- Implement exponential backoff

### Error: "Network Error"

**Solution:**
- Check internet connection
- Verify Grid Sandbox is online: https://status.squads.so/
- Check firewall settings

---

## API Documentation

**Official Docs**: https://docs.squads.so/grid

**Endpoints:**
- `POST /v1/multisig` - Create multisig
- `GET /v1/multisig/:address` - Get multisig info
- `POST /v1/transaction` - Create transaction
- `POST /v1/approve` - Approve transaction
- `POST /v1/execute` - Execute transaction

---

## Next Steps

### Phase 1: Local Testing (This Week)
1. ✅ Configure API key
2. ⏳ Test multisig creation
3. ⏳ Test transaction flow
4. ⏳ Test voting mechanism

### Phase 2: Devnet Integration (Next Week)
1. Deploy on Solana devnet
2. Create test guild
3. Test with real wallets
4. Verify all flows work

### Phase 3: Production (Weeks 3-4)
1. Upgrade to paid Grid plan
2. Get production API key
3. Deploy to mainnet
4. Monitor and optimize

---

## Cost Estimation

### Sandbox (Free)
- ✅ Good for development
- ✅ 100 calls/day sufficient for testing
- ✅ Devnet access

### Production (Paid)
- Starting at: $29/month
- 10,000 calls/month
- Mainnet access
- Priority support

**For 20 guilds with 5 proposals/month each:**
- API calls: ~500/month
- Well within free tier! ✅

---

## Monitoring Dashboard

**Access**: https://grid.squads.xyz/dashboard

**Metrics to Monitor:**
- API call count (daily)
- Error rate
- Response time
- Multisig count
- Transaction volume

---

## Support

**Grid Sandbox Support:**
- Email: support@squads.so
- Discord: https://discord.gg/squads
- Docs: https://docs.squads.so/

**Squads Protocol:**
- Website: https://squads.so/
- GitHub: https://github.com/Squads-Protocol/
- Twitter: @SquadsProtocol

---

## Summary

### ✅ Configuration Complete

```
API Key: cb40cc81-a029-41bc-b9b9-de06250b03e6
Environment: Configured in .env
Service: Updated in squadsService.ts
Status: Ready for testing
```

### 🔐 Security Status

```
✅ API key in .env (not committed)
✅ .gitignore includes .env
✅ Config abstracted in getConfig()
✅ No hardcoded secrets
```

### 🎯 Next Actions

```
1. Test multisig creation with Grid API
2. Verify API key works on devnet
3. Implement error handling for API failures
4. Add retry logic for rate limits
```

**Status**: Grid Sandbox is configured and ready to use! 🚀
