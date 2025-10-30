# 🧪 End-to-End Testing Guide - OuroC Recurring Payments

## ✅ System Status

- **ICP Canister ID**: `ar3bl-2aaaa-aaaag-auhda-cai`
- **ICP Public Key**: `6zrByBiExfFCaj6m1ELJGFoy1vYj4CyJeUQhzxQaosyh`
- **Solana Program**: `7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub`
- **Authorization Mode**: `ICPSignature` ✅
- **Frontend**: `http://localhost:8082/` ✅
- **Network**: Solana Devnet

---

## 📋 Test Scenario 1: One-Time Purchase (Non-Recurring)

### User Story:
*As a user, I want to make a one-time $9.99 payment for a gift card*

### Steps:

1. **Open Frontend**
   ```bash
   open http://localhost:8082/
   ```

2. **Connect Phantom Wallet**
   - Click "Connect Wallet"
   - Approve connection in Phantom

3. **Navigate to Gift Card Purchase**
   - Go to "Gift Cards" or checkout page
   - Select $9.99 gift card

4. **Make One-Time Purchase**
   - Click "Purchase" button
   - **What happens:**
     - Frontend calls `createSolanaSubscription()`
     - Requests ICP signature from canister
     - ICP generates real Ed25519 signature
     - Creates subscription on Solana with `interval = -1` (one-time)
     - Phantom prompts for approval

5. **Verify Transaction**
   - Check Solana Explorer: https://explorer.solana.com/?cluster=devnet
   - Search for your wallet address
   - Should see `create_subscription` transaction

### Expected Result:
✅ One-time payment created successfully
✅ Real ICP signature used
✅ No recurring timer set (intervalSeconds = -1)

---

## 📋 Test Scenario 2: Recurring Subscription

### User Story:
*As a user, I want to subscribe to a $4.99/month streaming service*

### Steps:

1. **Navigate to Subscription Page**
   - Find recurring subscription option
   - Select monthly plan ($4.99)

2. **Approve Token Delegation (First Time Only)**
   - Click "Subscribe"
   - **Important:** First transaction approves token delegation
   - Phantom prompts: "Approve subscription delegate"
   - Approve in Phantom

3. **Create Recurring Subscription**
   - **What happens:**
     - Frontend calls `createSolanaSubscription()` with `intervalSeconds = 2592000` (30 days)
     - Requests ICP signature: `generate_payment_signature(subscriptionId, 4990000)`
     - ICP canister signs with real threshold Ed25519
     - Creates subscription on Solana with signature
     - ICP timer automatically set for next payment in 30 days

4. **Verify Subscription Created**
   - Check console logs for subscription ID
   - Verify in Solana Explorer
   - Check ICP canister: `dfx canister call timer_rust list_subscriptions --network ic`

5. **Test First Payment (Optional - Fast Test)**
   ```bash
   # For testing, you can manually trigger payment processing
   # This simulates the ICP timer calling the Solana contract

   # The ICP timer will automatically:
   # 1. Generate signature at payment time
   # 2. Call Solana process_trigger
   # 3. Transfer USDC from subscriber to merchant
   ```

### Expected Result:
✅ Recurring subscription created with real ICP signature
✅ ICP timer scheduled for next payment
✅ First payment can be processed
✅ Subsequent payments happen automatically every 30 days

---

## 🔍 Verification Commands

### Check ICP Canister Status
```bash
# List all subscriptions
dfx canister call timer_rust list_subscriptions --network ic

# Get canister public key
dfx canister call timer_rust get_ed25519_public_key --network ic

# Test signature generation
dfx canister call timer_rust generate_payment_signature '("test_sub_123", 1000000 : nat64)' --network ic
```

### Check Solana Contract Config
```bash
cd /Users/tobiasd/Desktop/Ouro-C/solana-contract/ouroc_prima

# Check authorization mode
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=~/.config/solana/id.json

node -e "
const anchor = require('@coral-xyz/anchor');
const { PublicKey } = require('@solana/web3.js');

(async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.ourocPrima;

  const [config] = PublicKey.findProgramAddressSync([Buffer.from('config')], program.programId);
  const configData = await program.account.config.fetch(config);

  console.log('Authorization Mode:', configData.authorizationMode);
  console.log('ICP Public Key:', Buffer.from(configData.icpPublicKey).toString('hex').slice(0, 32) + '...');
})();
"
```

---

## 🎯 Success Criteria

### One-Time Purchase:
- [ ] Payment created on Solana
- [ ] Real ICP signature used (64 bytes, not zeros)
- [ ] Transaction visible in Solana Explorer
- [ ] No recurring timer created

### Recurring Subscription:
- [ ] Subscription created on Solana
- [ ] Real ICP signature verified by contract
- [ ] ICP timer scheduled for next payment
- [ ] Payment can be processed automatically
- [ ] Subsequent payments work without user interaction

---

## 🚨 Troubleshooting

### "Signature verification failed"
- Check ICP public key matches in Solana contract
- Verify signature is 64 bytes (not zeros)
- Check message format: `subscription_id + timestamp + amount`

### "Timer not found"
- Check ICP canister ID in frontend `.env.local`
- Verify `VITE_TIMER_CANISTER_ID=ar3bl-2aaaa-aaaag-auhda-cai`

### "Insufficient USDC"
- Get devnet USDC: https://spl-token-faucet.com/?token-name=USDC-Dev
- Or use Solana faucet for devnet tokens

---

## 📊 Real-World Flow Diagram

```
User Action          Frontend              ICP Canister           Solana Contract
    |                    |                      |                       |
    |--[Subscribe]------>|                      |                       |
    |                    |--[Request Sig]------>|                       |
    |                    |                      |--[IC Schnorr API]     |
    |                    |                      |   (Real Signature)    |
    |                    |<--[Signature + TS]---|                       |
    |                    |                      |                       |
    |                    |--[Create Sub + Sig]-------------------->    |
    |                    |                      |                       |
    |                    |                      |         [Verify ICP Sig]
    |                    |                      |         [Create Sub]  |
    |                    |<--[Success]-------------------------|        |
    |<--[Confirmed]------|                      |                       |
    |                    |                      |                       |
    |                [30 days pass...]          |                       |
    |                    |                      |                       |
    |                    |                [Timer Fires]                 |
    |                    |                      |--[Gen New Sig]        |
    |                    |                      |--[Process Payment]---->|
    |                    |                      |              [Verify Sig]
    |                    |                      |              [Transfer USDC]
    |                    |                      |<--[Success]-----------|
    |                    |                      |                       |
    |<--[Email: Payment Successful]------------|                       |
```

---

## ✅ Test Results

Record your test results here:

**One-Time Purchase Test:**
- Date/Time: _________________
- Wallet Address: _________________
- Transaction Signature: _________________
- Status: [ ] Pass / [ ] Fail
- Notes: _________________

**Recurring Subscription Test:**
- Date/Time: _________________
- Wallet Address: _________________
- Subscription ID: _________________
- Transaction Signature: _________________
- ICP Timer Status: _________________
- Status: [ ] Pass / [ ] Fail
- Notes: _________________
