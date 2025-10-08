# ICP Timer Canister Deployment Guide

**Solana Program ID (Devnet):** `7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub`
**Date:** 2025-10-07
**Status:** Ready for Deployment

---

## 📋 Prerequisites

### 1. Install DFINITY SDK

```bash
# Install dfx
sh -ci "$(curl -fsSL https://sdk.dfinity.org/install.sh)"

# Verify installation
dfx --version
# Expected: dfx 0.15.0 or higher
```

### 2. Configure Identity

```bash
# Create/Use identity
dfx identity new ouroc_deployer
dfx identity use ouroc_deployer

# Get your principal
dfx identity get-principal

# Fund your identity with cycles (for mainnet)
# For local testing, cycles are unlimited
```

---

## 🚀 Deployment Steps

### Local Testing

```bash
cd /Users/tobiasd/Desktop/Ouro-C

# Start local replica
dfx start --background --clean

# Deploy canister locally
dfx deploy OuroC_timer

# Get canister ID
dfx canister id OuroC_timer

# Initialize for devnet testing
dfx canister call OuroC_timer init_canister '(variant { Devnet })'
```

### Internet Computer Mainnet

```bash
cd /Users/tobiasd/Desktop/Ouro-C

# Deploy to IC mainnet
dfx deploy OuroC_timer --network ic

# Get canister ID
dfx canister id OuroC_timer --network ic

# Initialize for devnet (Solana devnet testing)
dfx canister call OuroC_timer init_canister '(variant { Devnet })' --network ic
```

---

## ⚙️ Canister Configuration

### 1. Initialize Canister

The canister is pre-configured for Solana devnet by default:
- **Network:** Devnet
- **RPC Endpoint:** `https://api.devnet.solana.com`
- **Ed25519 Key:** `test_key_1` (for devnet)

```bash
# Initialize canister
dfx canister call OuroC_timer init_canister '(variant { Devnet })' --network ic

# Expected output:
# ("Timer canister initialized for Devnet environment")
```

### 2. Verify Configuration

```bash
# Check active subscription count (should be 0 initially)
dfx canister call OuroC_timer get_active_subscription_count --network ic

# Expected output:
# (0 : nat)
```

---

## 📝 Register Test Subscription

### Example: Create Subscription

```bash
# Create a test subscription
dfx canister call OuroC_timer create_subscription '(
  record {
    subscription_id = "test-sub-001";
    solana_contract_address = "7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub";
    payment_token_mint = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
    amount = 1_000_000 : nat64;
    subscriber_address = "subscriber_pubkey_here";
    merchant_address = "merchant_pubkey_here";
    reminder_days_before_payment = 7 : nat;
    interval_seconds = 2_592_000 : nat64;
    start_time = null;
  }
)' --network ic
```

### Query Subscription

```bash
# Get subscription details
dfx canister call OuroC_timer get_subscription '("test-sub-001")' --network ic

# List all subscriptions
dfx canister call OuroC_timer get_all_subscriptions --network ic
```

---

## 🔗 Integration with Solana Tests

### Update Test Environment

Once deployed, update the test configuration:

```bash
# Edit .env.devnet
nano /Users/tobiasd/Desktop/Ouro-C/solana-contract/ouro_c_subscriptions/.env.devnet

# Add your canister ID
ICP_TIMER_CANISTER_ID=<your_canister_id_here>
USE_MOCK_ICP=false
```

### Run Integration Tests

```bash
cd /Users/tobiasd/Desktop/Ouro-C/solana-contract/ouro_c_subscriptions

# Run with real ICP canister
npm run test:integration
```

---

## 📊 Canister Management

### Monitor Cycles

```bash
# Check cycle balance
dfx canister status OuroC_timer --network ic

# Top up cycles (if needed)
dfx canister deposit-cycles 1000000000000 OuroC_timer --network ic
```

### Canister Operations

```bash
# Pause subscription
dfx canister call OuroC_timer pause_subscription '("test-sub-001")' --network ic

# Resume subscription
dfx canister call OuroC_timer resume_subscription '("test-sub-001")' --network ic

# Cancel subscription
dfx canister call OuroC_timer cancel_subscription '("test-sub-001")' --network ic
```

### Upgrade Canister

```bash
# Rebuild
dfx build OuroC_timer

# Upgrade (preserves state)
dfx canister install OuroC_timer --mode upgrade --network ic
```

---

## 🔧 Configuration Constants

### Network Settings (src/timer/main.mo)

```motoko
// Devnet (default)
private var network_env: NetworkEnvironment = #Devnet;
private var solana_rpc_endpoint: Text = "https://api.devnet.solana.com";
private var ed25519_key_name: Text = "test_key_1";
```

### Validation Limits

```motoko
private let MAX_AMOUNT_USDC: Nat64 = 1_000_000_000_000; // 1M USDC
private let MIN_INTERVAL_SECONDS: Nat64 = 3600; // 1 hour
private let MAX_INTERVAL_SECONDS: Nat64 = 31536000; // 1 year
private let MAX_SUBSCRIPTIONS_PER_PRINCIPAL: Nat = 100;
private let MAX_TOTAL_SUBSCRIPTIONS: Nat = 10000;
```

### Failure Handling

```motoko
private let MAX_CONSECUTIVE_FAILURES: Nat = 10; // Auto-pause
private let EXPONENTIAL_BACKOFF_BASE: Nat64 = 2;
private let MAX_BACKOFF_MULTIPLIER: Nat64 = 16;
```

---

## 🎯 Solana Program Configuration

### Devnet Deployment

```
Program ID: 7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub
USDC Mint:  4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
Network:    Devnet
RPC:        https://api.devnet.solana.com
```

### Subscription Flow

```
1. User creates subscription on Solana
   → calls create_subscription()
   → stores subscription data in Solana PDA

2. Frontend/Backend calls ICP canister
   → create_subscription(same_id, program_id, ...)
   → ICP timer starts

3. Timer fires at next_execution
   → ICP generates Ed25519 signature
   → ICP calls Solana via HTTP outcall
   → Solana verifies signature
   → Payment executes

4. Subscription updates
   → next_payment_time += interval
   → payments_made += 1
   → ICP timer reschedules
```

---

## 🚨 Important Notes

### Devnet vs Mainnet

**Devnet (Current):**
- ✅ Testing and development
- ✅ Ed25519 key: `test_key_1`
- ✅ RPC: `https://api.devnet.solana.com`
- ✅ Free SOL via faucet
- ✅ No real money

**Mainnet (Production):**
- ⚠️ Requires mainnet deployment
- ⚠️ Ed25519 key: `Ed25519:key_1` (production key)
- ⚠️ RPC: `https://api.mainnet-beta.solana.com`
- ⚠️ Real SOL and USDC
- ⚠️ Security audit required

### Security Considerations

1. **Ed25519 Key Management**
   - Devnet: Uses `test_key_1` (acceptable for testing)
   - Mainnet: Must use threshold Ed25519 with proper key ceremony

2. **Cycle Management**
   - Monitor cycle balance
   - Set up auto-refill
   - Alert on low cycles

3. **Rate Limiting**
   - HTTP outcalls have rate limits
   - Plan for concurrent subscriptions
   - Implement exponential backoff

---

## 📊 Expected Behavior

### After Deployment

```bash
# 1. Canister deployed
$ dfx canister id OuroC_timer --network ic
rrkah-fqaaa-aaaaa-aaaaq-cai

# 2. Initialized
$ dfx canister call OuroC_timer init_canister '(variant { Devnet })' --network ic
("Timer canister initialized for Devnet environment")

# 3. Ready for subscriptions
$ dfx canister call OuroC_timer get_active_subscription_count --network ic
(0 : nat)

# 4. Create test subscription
$ dfx canister call OuroC_timer create_subscription '(...)'
(variant { Ok = record { id = "test-sub-001"; ... } })

# 5. Verify timer scheduled
$ dfx canister call OuroC_timer get_subscription '("test-sub-001")' --network ic
(opt record {
  id = "test-sub-001";
  status = variant { Active };
  next_execution = 1728307200 : int;
  ...
})
```

---

## 🔍 Troubleshooting

### Issue: "Canister not found"

```bash
# Redeploy
dfx deploy OuroC_timer --network ic
```

### Issue: "Out of cycles"

```bash
# Check balance
dfx canister status OuroC_timer --network ic

# Top up
dfx canister deposit-cycles 1000000000000 OuroC_timer --network ic
```

### Issue: "HTTP outcall failed"

```bash
# Check canister logs
dfx canister logs OuroC_timer --network ic

# Verify Solana RPC endpoint is accessible
curl https://api.devnet.solana.com -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

### Issue: "Subscription not triggering"

```bash
# Check subscription status
dfx canister call OuroC_timer get_subscription '("sub_id")' --network ic

# Verify next_execution time hasn't passed
date +%s  # Current Unix timestamp

# Check for errors
# Look at last_error field in subscription
```

---

## 📈 Monitoring

### Key Metrics to Watch

1. **Cycle Balance**
   - Should have > 5T cycles reserve
   - Set up alerts for < 1T

2. **Active Subscriptions**
   - Total count
   - Average interval
   - Failed payment rate

3. **HTTP Outcall Success Rate**
   - Monitor failures
   - Check backoff behavior
   - Verify Solana RPC uptime

4. **Trigger Accuracy**
   - Timer drift
   - Execution delays
   - Missed triggers

---

## 🎉 Quick Start Checklist

- [ ] Install dfx SDK
- [ ] Create/Fund identity
- [ ] Deploy canister: `dfx deploy OuroC_timer --network ic`
- [ ] Get canister ID: `dfx canister id OuroC_timer --network ic`
- [ ] Initialize: `dfx canister call OuroC_timer init_canister '(variant { Devnet })'`
- [ ] Update test config: Add canister ID to `.env.devnet`
- [ ] Set `USE_MOCK_ICP=false` in `.env.devnet`
- [ ] Run integration tests: `npm run test:integration`
- [ ] Monitor cycle balance
- [ ] Create test subscription
- [ ] Verify timer execution

---

**Status:** ✅ Ready for Deployment
**Target Network:** Internet Computer (IC)
**Solana Network:** Devnet
**Program ID:** `7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub`

---

## 📞 Resources

- **dfx.json:** `/Users/tobiasd/Desktop/Ouro-C/dfx.json`
- **Canister Source:** `/Users/tobiasd/Desktop/Ouro-C/src/timer/main.mo`
- **Test Suite:** `/Users/tobiasd/Desktop/Ouro-C/solana-contract/ouro_c_subscriptions/tests/devnet-integration.test.ts`
- **ICP Dashboard:** https://dashboard.internetcomputer.org
- **DFINITY Docs:** https://internetcomputer.org/docs
