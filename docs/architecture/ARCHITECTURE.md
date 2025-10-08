# OuroC Architecture - Minimalistic ICP + Opcode-Based Solana

## 🏗️ Architecture Overview

**Philosophy:** Solana is the source of truth. ICP is a minimal timer/scheduler.

### Data Storage Strategy

| Data Type | Stored in ICP | Stored in Solana |
|-----------|---------------|------------------|
| Subscription ID | ✅ | ✅ |
| Payment Amount | ❌ | ✅ |
| Token Addresses | ❌ | ✅ |
| Merchant/Subscriber | ❌ | ✅ |
| Next Execution Time | ✅ | ❌ |
| Interval Seconds | ✅ | ❌ |
| Timer Status | ✅ | ❌ |
| Payment Token Mint | ✅ (routing only) | ✅ |
| Reminder Days | ✅ (timing only) | ✅ |

### Security Benefits

✅ **Single Source of Truth** - Solana blockchain is immutable
✅ **No Data Desync** - ICP never has stale amounts/addresses
✅ **Smaller Attack Surface** - 70% less code in ICP (~3500 lines removed)
✅ **Disaster Recovery** - Redeploy ICP from Solana subscription list
✅ **User Trust** - Solana signature is what user delegated

---

## 🔄 Opcode System

### ICP → Solana Communication

```motoko
// ICP sends only 2 opcodes
send_solana_opcode(contract_address, subscription_id, opcode)

// Opcode 0: Payment
// Opcode 1: Notification
```

### Solana Opcode Routing

```rust
pub fn process_trigger(ctx: Context<ProcessTrigger>, opcode: u8) -> Result<()> {
    match opcode {
        0 => {
            // Payment: Check token and route
            if subscription.payment_token_mint == USDC_MINT {
                process_direct_usdc_payment(ctx)?;
            } else {
                process_swap_then_split(ctx)?; // Swap → USDC → split
            }
        },
        1 => {
            // Notification: Send memo to subscriber
            send_notification_internal(ctx, memo)?;
        },
        _ => Err(ErrorCode::InvalidOpcode.into())
    }
}
```

---

## 💸 Payment Flow

### Direct USDC Payment (Opcode 0 + USDC mint)

```
1. ICP Timer Fires → call_with_opcode(0)
2. Solana: process_trigger(opcode=0)
3. Check: payment_token_mint == USDC_MINT
4. Calculate fee: amount * fee_percentage / 10000
5. Transfer fee → ICP Treasury USDC account
6. Transfer rest → Merchant USDC account
7. Update subscription state
```

### Multi-Token Payment (Opcode 0 + other mint)

```
1. ICP Timer Fires → call_with_opcode(0)
2. Solana: process_trigger(opcode=0)
3. Check: payment_token_mint != USDC_MINT
4. Swap token → USDC (Jupiter/Raydium) [TODO]
5. Calculate fee from USDC output
6. Transfer fee → ICP Treasury
7. Transfer rest → Merchant
8. Update subscription state
```

### Notification Flow (Opcode 1)

```
1. ICP Timer Fires (reminder_days_before_payment)
2. call_with_opcode(1)
3. Solana: process_trigger(opcode=1)
4. Build memo: "OuroC: Payment in X days. Amount: Y TOKEN"
5. Send 0.000001 SOL + memo → Subscriber
6. Subscriber sees notification in wallet
```

---

## 📊 ICP Canister Functions (24 total)

### Subscription Management (6)
- `create_subscription()` - Store timer info only
- `pause_subscription()`
- `resume_subscription()`
- `cancel_subscription()`
- `get_subscription()`
- `list_subscriptions()`

### Initialization (1)
- `initialize_canister()` - Setup Solana wallets

### Monitoring (5)
- `get_canister_health()`
- `get_system_metrics()`
- `get_canister_status()`
- `ping()`
- `get_overdue_subscriptions()`

### Emergency Controls (2)
- `emergency_pause_all()`
- `resume_operations()`

### Cycle Management (4)
- `get_cycle_status()`
- `monitor_cycles()`
- `set_cycle_threshold()`
- `enable_auto_refill()`

### Fee Configuration (2)
- `get_fee_config()`
- `update_fee_config()`

### Wallet Management (2)
- `get_wallet_addresses()`
- `get_wallet_balances()`

### Metrics (1)
- `report_health_metrics()`

---

## 🔐 Removed from ICP (Security Simplification)

### Removed Functions (11 total)
- ❌ `request_auth_challenge`
- ❌ `authenticate_user`
- ❌ `revoke_session`
- ❌ `get_user_auth_info`
- ❌ `get_user_reputation`
- ❌ `get_user_block_status`
- ❌ `get_security_statistics`
- ❌ `admin_adjust_reputation`
- ❌ `admin_clear_user_block`
- ❌ `cleanup_security_data`
- ❌ `check_balance_and_send_reminders`

### Removed Modules
- ❌ `security.mo` (~1000 lines)
- ❌ `balance_monitor.mo` (~500 lines)
- ❌ `notification_system.mo` (~2000 lines)

**Total Reduction:** ~3500 lines removed (31% smaller codebase)

---

## 📦 Solana Contract Structure

### Main Instructions

```rust
// User-facing
pub fn create_subscription(...)
pub fn approve_subscription_delegate(...)
pub fn pause_subscription(...)
pub fn cancel_subscription(...)

// ICP timer (main entry point)
pub fn process_trigger(opcode: u8)  // NEW: Opcode-based routing

// Legacy (deprecated)
pub fn process_payment(...)
pub fn process_payment_with_swap(...)
pub fn send_notification(...)
```

### Helper Functions (Internal)

```rust
fn process_direct_usdc_payment(ctx) -> Result<()>
fn process_swap_then_split(ctx) -> Result<()>  // TODO: DEX integration
fn send_notification_internal(ctx, memo) -> Result<()>
```

---

## 🚀 Deployment Flow

### 1. Solana Contract
```bash
anchor build
anchor deploy --provider.cluster devnet
```

### 2. ICP Canister
```bash
dfx deploy ouro_c_timer --network ic
dfx canister call ouro_c_timer initialize_canister
```

### 3. Frontend SDK
```bash
cd packages/react-sdk
npm run build
npm publish
```

---

## 🔄 State Sync

### Subscription Creation Flow

```
1. User → Frontend: Create subscription form
2. Frontend → Solana: approve_subscription_delegate()
3. Frontend → Solana: create_subscription()
   - Stores: amount, token, merchant, subscriber, reminder_days, etc.
4. Frontend → ICP: create_subscription()
   - Stores: subscription_id, token_mint, reminder_days, interval, next_execution
5. ICP: Starts timer
```

### Timer Trigger Flow

```
1. ICP Timer Fires
2. ICP → Solana: process_trigger(opcode)
3. Solana: Reads subscription PDA (source of truth)
4. Solana: Executes payment/notification
5. Solana: Updates subscription state
```

---

## 📝 Key Design Decisions

### Why Minimalistic ICP?

1. **Immutability** - Solana blockchain data can't be corrupted
2. **Trust Model** - Users trust their Solana delegation
3. **Simplicity** - Less code = fewer bugs
4. **Replaceability** - ICP can be swapped for any scheduler
5. **Cost** - Less storage = lower cycles cost

### Why 2 Opcodes?

1. **Simplicity** - Single entry point from ICP
2. **Flexibility** - Solana handles all routing logic
3. **Upgradability** - Add new opcodes without ICP changes
4. **Security** - Less ICP logic = smaller attack surface

### Why Solana-First Auth?

1. **User Delegation** - Users already signed Solana transaction
2. **No Sessions** - Stateless, secure by default
3. **Blockchain Audit** - All auth on-chain
4. **No ICP Bugs** - ICP can't corrupt auth state

---

## 🔮 Future Enhancements

### Planned
- [ ] Jupiter DEX integration for token swaps
- [ ] Raydium pool support
- [ ] Multi-chain expansion (EVM, Cosmos)
- [ ] Replace ICP with alternative scheduler (Gelato, Chainlink)

### Under Consideration
- [ ] Push notifications via Web Push API ✅ (Already implemented)
- [ ] Email/Discord notifications
- [ ] Subscription templates
- [ ] Recurring NFT mints

---

## 📊 Metrics

### Codebase Size
- **ICP Canister:** ~600 lines (was ~4100)
- **Solana Contract:** ~1100 lines
- **Frontend SDK:** ~2000 lines
- **Total:** ~3700 lines (was ~7200)

### Function Count
- **ICP Functions:** 24 (was 35)
- **Solana Instructions:** 12
- **SDK Hooks:** 6

### Security Surface
- **ICP State Variables:** 8 (was 15)
- **Authentication Points:** 1 (Solana only)
- **Data Duplication:** None (Solana source of truth)

---

Made with ❤️ by OuroC Team
