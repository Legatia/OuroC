# OuroC-Mesos Deployment Guide

This guide covers deploying the complete OuroC-Mesos stack: ICP backend canisters + frontend.

## Architecture

**User sees:** Solana-only subscription platform (Phantom wallet + USDC)
**Behind the scenes:** ICP canisters managing subscriptions + Solana smart contract for payments

```
Frontend (ICP asset canister)
  ├─→ Phantom Wallet Only (no ICP identity)
  ├─→ USDC payments on Solana
  └─→ Backend API calls (hidden ICP integration)
      ├─→ ouroc_timer (Rust canister)
      ├─→ license_registry (Motoko canister)
      └─→ Threshold ECDSA (for Solana addresses)
          └─→ ouroc_prima (Solana contract)
```

## Prerequisites

- [dfx](https://internetcomputer.org/docs/current/developer-docs/setup/install/) (ICP SDK)
- [Rust](https://www.rust-lang.org/tools/install) with `wasm32-unknown-unknown` target
- [Node.js](https://nodejs.org/) v18+
- [Anchor](https://www.anchor-lang.com/docs/installation) (for Solana contract)

## Local Deployment

### 1. Start ICP Replica

```bash
dfx start --clean --background
```

### 2. Deploy Backend Canisters

```bash
# Deploy timer (Rust) and license registry (Motoko)
dfx deploy ouroc_timer
dfx deploy license_registry
```

**Save the canister IDs** - you'll see output like:
```
Deployed canisters.
URLs:
  Backend canister via Candid interface:
    ouroc_timer: http://127.0.0.1:4943/?canisterId=xxxxx-xxxxx-xxxxx-xxxxx-xxx
    license_registry: http://127.0.0.1:4943/?canisterId=yyyyy-yyyyy-yyyyy-yyyyy-yyy
```

### 3. Configure Frontend Environment

Create `frontend/.env.local`:

```bash
# Copy canister IDs from step 2
VITE_TIMER_CANISTER_ID=xxxxx-xxxxx-xxxxx-xxxxx-xxx
VITE_LICENSE_CANISTER_ID=yyyyy-yyyyy-yyyyy-yyyyy-yyy

# After deploying Solana contract, add:
VITE_SOLANA_CONTRACT=<your-solana-program-id>
VITE_SOLANA_NETWORK=devnet
```

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 5. Build Frontend

```bash
npm run build
```

This creates `frontend/dist/` with production-ready static files.

### 6. Deploy Frontend to ICP

```bash
# From project root
dfx deploy ouroc_frontend
```

The asset canister URL will be printed:
```
Frontend canister via Candid interface:
  ouroc_frontend: http://127.0.0.1:4943/?canisterId=zzzzz-zzzzz-zzzzz-zzzzz-zzz
```

**Access your app at:**
```
http://<frontend-canister-id>.localhost:4943
```

### 7. Deploy Solana Contract (Optional)

```bash
cd solana-contract/ouroc_prima
anchor build
anchor deploy --provider.cluster devnet
```

Update `frontend/.env.local` with the program ID and rebuild:
```bash
cd ../../frontend
npm run build
cd ..
dfx deploy ouroc_frontend
```

## Production Deployment (IC Mainnet)

### 1. Deploy to IC Mainnet

```bash
# Deploy backend canisters
dfx deploy --network ic ouroc_timer
dfx deploy --network ic license_registry

# Update frontend/.env with mainnet canister IDs
VITE_TIMER_CANISTER_ID=<mainnet-timer-id>
VITE_LICENSE_CANISTER_ID=<mainnet-license-id>
VITE_SOLANA_CONTRACT=<mainnet-program-id>
VITE_SOLANA_NETWORK=mainnet-beta

# Build and deploy frontend
cd frontend
npm run build
cd ..
dfx deploy --network ic ouroc_frontend
```

### 2. Access Production App

Your app will be available at:
```
https://<frontend-canister-id>.icp0.io
```

Or with a custom domain via [Custom Domains](https://internetcomputer.org/docs/current/developer-docs/production/custom-domain/).

## Updating the Frontend

After making changes to frontend code:

```bash
cd frontend
npm run build
cd ..
dfx deploy ouroc_frontend
```

The asset canister will automatically serve the updated version.

## Monitoring & Debugging

### Check Canister Status

```bash
dfx canister status ouroc_timer
dfx canister status license_registry
dfx canister status ouroc_frontend
```

### View Canister Logs

```bash
# Real-time logs
dfx canister logs ouroc_timer

# Follow logs
dfx canister logs ouroc_timer --follow
```

### Test Backend Functions

```bash
# Health check
dfx canister call ouroc_timer ping

# List subscriptions
dfx canister call ouroc_timer list_subscriptions

# Get Solana address
dfx canister call ouroc_timer get_solana_address_for_caller
```

### Frontend Development Mode

For rapid frontend development (without deploying):

```bash
cd frontend
npm run dev
```

This runs Vite dev server on `http://localhost:8080` with hot reload.

**Note:** Make sure `.env.local` has correct canister IDs to connect to your deployed backend.

## Architecture Notes

### Why Users Don't See ICP

1. **No Internet Identity** - Users only connect Phantom wallet
2. **Anonymous Calls** - Frontend uses `AnonymousIdentity` for ICP canister calls
3. **Solana-First UX** - All messaging is about USDC/Solana
4. **Hidden Implementation** - `backend.ts` abstracts all ICP details

The frontend appears to be a normal web app, but it's fully decentralized:
- Frontend served from ICP asset canister (no servers)
- Backend logic runs on ICP canisters (no databases)
- Payments execute on Solana (no payment processors)

### Security Model

**For Read Operations:**
- Anonymous calls are fine (listing subscriptions, checking status)

**For Write Operations:**
- Currently using Phantom wallet address as identifier
- Production should add signature verification:
  1. User signs a message with Phantom wallet
  2. Frontend sends signature + message to backend
  3. Backend verifies signature matches wallet address
  4. Prevents impersonation attacks

### Cost Estimate

**ICP Hosting (Mainnet):**
- Timer canister: ~$1/month (for 10K subscriptions)
- License registry: ~$0.50/month
- Frontend canister: ~$0.50/month (for 1GB storage)

**Total:** ~$2/month for fully decentralized infrastructure

Compare to:
- AWS EC2 + RDS: ~$50/month
- Vercel + Supabase: ~$20/month

## Troubleshooting

### "Canister not found" Error

Make sure you've deployed the backend canisters:
```bash
dfx deploy ouroc_timer
dfx deploy license_registry
```

### Frontend Shows Blank Page

Check browser console for errors. Common issues:
- Missing canister IDs in `.env.local`
- Backend not deployed
- CORS issues (should not happen with ICP)

### "Unable to fetch root key" Warning

This is normal in development. The frontend automatically fetches the root key for local testing.

### Subscription Creation Fails

1. Check that Solana wallet is connected
2. Verify canister IDs are correct
3. Check canister logs: `dfx canister logs ouroc_timer`

## Demo: 10-Second Recurring Gift Card

For demonstration purposes, the system supports ultra-fast recurring intervals to showcase the subscription engine.

### How to Demo

1. **Navigate to Gift Cards** in the frontend
2. **Select any gift card** (e.g., Steam, Amazon)
3. **Click "Buy Now"**
4. **Choose "Recurring Purchase"**
5. **Set interval to:** `00:00:00:00:00:10` (10 seconds)
6. **Connect Phantom wallet and purchase**

### What Happens

- **First gift card** delivered immediately
- **Timer canister** schedules next payment in 10 seconds
- **Every 10 seconds** a new gift card code is generated
- **No notifications** for intervals < 1 day (per requirements)
- **Watch your profile** to see new codes appearing

### Notification Behavior

The system conditionally enables notifications:

- **Interval ≤ 1 day**: Notifications disabled (too frequent)
- **Interval > 1 day**: Notifications enabled for upcoming payments

This prevents notification spam during demos while providing useful reminders for real-world subscriptions.

### License Tier

OuroC-Mesos uses **Enterprise license** (`ouro_enterprise_ouroc_mesos_2025`):
- Unlimited subscriptions
- 100,000 operations/day
- No rate limiting

## Next Steps

- [ ] Add signature verification for write operations
- [ ] Implement real Solana RPC calls (replace mocks)
- [ ] Add admin dashboard
- [ ] Set up monitoring/alerting
- [ ] Configure custom domain
- [ ] Integrate real license registry (replace shared key)
