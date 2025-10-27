# Authorization Modes

OuroC subscriptions support four different authorization modes for payment processing. The mode is set when initializing the smart contract.

## Authorization Modes

### 1. ICPSignature (Mode 0)
**ICP Timer Only - No Manual Trigger**

- Only ICP canister can trigger payments using Ed25519 signatures
- Manual trigger button is **completely disabled**
- Most secure and automated option
- Requires ICP canister to be operational

**Frontend Behavior:**
- Button shows "ICP Timer Active" and is disabled (gray)
- Shows message: "This subscription uses ICP automatic payments only"

**Use Case:** Production subscriptions where you want 100% automated payments with no manual intervention

---

### 2. ManualOnly (Mode 1)
**Manual Trigger Only - No ICP Timer**

- Only subscriber or merchant can manually trigger payments
- No automatic ICP timer functionality
- Button is **always enabled** for authorized users
- No time restrictions on when payment can be processed

**Frontend Behavior:**
- Button shows "Process Payment Now" and is enabled (blue)
- Available immediately for subscriber/merchant

**Use Case:** Testing, demos, or situations where you want full manual control

---

### 3. TimeBased (Mode 2)
**Anyone Can Trigger When Due**

- Anyone can trigger payment once `next_payment_time` is reached
- No signature verification required
- Button becomes **enabled when payment is due**
- Most permissionless option

**Frontend Behavior:**
- Before due time: Button disabled, shows "Manual trigger will be available when payment is due"
- After due time: Button enabled, shows "Process Payment Now"

**Use Case:** Decentralized subscriptions where any keeper/bot can trigger payments

---

### 4. Hybrid (Mode 3)
**ICP Primary + Manual Fallback**

- ICP canister triggers payments automatically
- Manual trigger acts as **fallback when ICP fails**
- Button enabled only when payment is **overdue by 5+ minutes**
- Best of both worlds: automation + reliability

**Frontend Behavior:**
- Within grace period (0-5 min after due): Button disabled, ICP should trigger
- After grace period (5+ min overdue): Button enabled as fallback
- Shows message: "Manual trigger available after 5 min grace period if ICP fails"

**Use Case:** Production environments where you want automation but need a safety net

---

## Implementation Details

### Authorization Logic (Solana Contract)

```rust
match config.authorization_mode {
    AuthorizationMode::ICPSignature => {
        // Require valid ICP signature
        require!(icp_signature.is_some(), ErrorCode::MissingSignature);
        require!(payment_is_due, ErrorCode::PaymentNotDue);
        verify_icp_signature(...)?;
    },

    AuthorizationMode::ManualOnly => {
        // Require subscriber or merchant
        require!(
            trigger_authority == subscriber || trigger_authority == authority,
            ErrorCode::UnauthorizedAccess
        );
    },

    AuthorizationMode::TimeBased => {
        // Anyone can trigger if payment is due
        require!(payment_is_due, ErrorCode::PaymentNotDue);
    },

    AuthorizationMode::Hybrid => {
        // Accept either valid ICP signature OR manual trigger if overdue
        let is_icp_valid = verify_icp_signature(...).unwrap_or(false);
        let is_manual_valid = trigger_authority == subscriber;
        let is_time_valid = payment_is_due;

        require!(
            is_icp_valid || (is_manual_valid && is_time_valid),
            ErrorCode::UnauthorizedAccess
        );
    }
}
```

### Frontend Logic (ManualTriggerButton)

```typescript
const isManualTriggerAllowed = (): boolean => {
  const authMode = subscriptionData.authorizationMode

  switch (authMode) {
    case AuthorizationMode.ICPSignature:
      return false // Never allow manual trigger

    case AuthorizationMode.ManualOnly:
      return true // Always allow for authorized users

    case AuthorizationMode.TimeBased:
      // Allow if payment is due
      return currentTime >= nextPaymentTime

    case AuthorizationMode.Hybrid:
      // Allow as fallback when payment is overdue (5 min grace period)
      return currentTime >= nextPaymentTime + 300
  }
}
```

---

## Recommended Modes by Environment

| Environment | Recommended Mode | Reason |
|-------------|-----------------|---------|
| **Production** | Hybrid (3) | Automation + reliability fallback |
| **Testing** | ManualOnly (1) | Full control for testing |
| **Demo** | ManualOnly (1) or TimeBased (2) | Easy to demonstrate |
| **High Security** | ICPSignature (0) | No manual intervention possible |
| **Decentralized** | TimeBased (2) | Anyone can trigger when due |

---

## Grace Period

The grace period is set to **5 minutes (300 seconds)** for Hybrid mode:

- **0-5 minutes overdue:** Button disabled, waiting for ICP to trigger
- **5+ minutes overdue:** Button enabled, manual fallback available

This prevents manual triggers from racing with ICP timer, while providing a safety net if ICP fails.

---

## Security Considerations

1. **ICPSignature Mode:** Most secure, but requires ICP to be operational
2. **ManualOnly Mode:** Secure if subscriber/merchant keys are safe, but no automation
3. **TimeBased Mode:** Permissionless, suitable for decentralized scenarios
4. **Hybrid Mode:** Balanced - automated with fallback, recommended for production

---

## UI/UX Guidelines

1. Always show clear messaging about why button is disabled
2. For Hybrid mode, show countdown until manual trigger becomes available
3. For TimeBased mode, show time remaining until payment is due
4. Use visual indicators (colors) to show button state:
   - Gray: Disabled (ICP timer active)
   - Blue: Enabled (ready to process)
   - Green: Success
   - Red: Error
