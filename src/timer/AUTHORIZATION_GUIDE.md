# Authorization Implementation Guide for OuroC Timer Canister

## Overview

This guide shows you how to add admin authorization to your timer canister so that only authorized principals can access admin functions.

## Step 1: Add Authorization Module Import

At the top of `src/timer/main.mo`, add the authorization import:

```motoko
import Authorization "./authorization";
```

## Step 2: Initialize Authorization Manager

Inside your `persistent actor OuroCTimer` block, add:

```motoko
// Authorization
private let authManager = Authorization.AuthorizationManager();
private var initialized = false;

// System functions
system func postupgrade() {
    if (not initialized) {
        let deployer = Principal.fromActor(OuroCTimer);
        authManager.initWithDeployer(deployer);
        initialized := true;
    };
    // ... your existing postupgrade code
};
```

## Step 3: Add Authorization Helper Function

Add this private helper function:

```motoko
private func requireAdmin(caller: Principal) : Result.Result<(), Text> {
    if (authManager.isAdmin(caller)) {
        return #ok();
    };
    #err("Unauthorized: Admin access required")
};

private func requireReadAccess(caller: Principal) : Result.Result<(), Text> {
    if (authManager.hasReadAccess(caller)) {
        return #ok();
    };
    #err("Unauthorized: Read access required")
};
```

## Step 4: Protect Admin Functions

### For Read-Only Functions (like dashboard queries)

Wrap your admin query functions with authorization checks:

```motoko
// BEFORE:
public query func get_canister_health() : async CanisterHealth {
    // ... implementation
};

// AFTER:
public shared query(msg) func get_canister_health() : async Result.Result<CanisterHealth, Text> {
    switch (requireReadAccess(msg.caller)) {
        case (#err(e)) { return #err(e) };
        case (#ok()) {
            // ... your existing implementation
            let health = {
                status = if (is_degraded) { #Degraded } else { #Healthy };
                // ... rest of implementation
            };
            return #ok(health);
        };
    };
};
```

### For Write Functions (like emergency_pause_all)

```motoko
// BEFORE:
public func emergency_pause_all() : async Result.Result<Nat, Text> {
    // ... implementation
};

// AFTER:
public shared(msg) func emergency_pause_all() : async Result.Result<Nat, Text> {
    switch (requireAdmin(msg.caller)) {
        case (#err(e)) { return #err(e) };
        case (#ok()) {
            // ... your existing implementation
        };
    };
};
```

## Step 5: Add Admin Management Functions

Add these public functions to manage admins:

```motoko
// Add a new admin
public shared(msg) func add_admin(new_admin: Principal) : async Result.Result<(), Text> {
    authManager.addAdmin(msg.caller, new_admin)
};

// Remove an admin
public shared(msg) func remove_admin(admin_to_remove: Principal) : async Result.Result<(), Text> {
    authManager.removeAdmin(msg.caller, admin_to_remove)
};

// Add read-only user
public shared(msg) func add_read_only_user(user: Principal) : async Result.Result<(), Text> {
    authManager.addReadOnlyUser(msg.caller, user)
};

// Remove read-only user
public shared(msg) func remove_read_only_user(user: Principal) : async Result.Result<(), Text> {
    authManager.removeReadOnlyUser(msg.caller, user)
};

// Get list of admins (admin only)
public shared query(msg) func get_admins() : async Result.Result<[Principal], Text> {
    switch (requireAdmin(msg.caller)) {
        case (#err(e)) { #err(e) };
        case (#ok()) { #ok(authManager.getAdmins()) };
    };
};

// Get list of read-only users (admin only)
public shared query(msg) func get_read_only_users() : async Result.Result<[Principal], Text> {
    switch (requireAdmin(msg.caller)) {
        case (#err(e)) { #err(e) };
        case (#ok()) { #ok(authManager.getReadOnlyUsers()) };
    };
};
```

## Step 6: Functions to Protect

### Admin-Only Functions (Write Operations):
- `emergency_pause_all()` - Pauses all subscriptions
- `pause_subscription()` - Pauses specific subscription
- `resume_subscription()` - Resumes subscription
- `cancel_subscription()` - Cancels subscription
- Any other write operations you want to restrict

### Read-Only Functions (Query Operations):
- `get_canister_health()` - System health metrics
- `get_system_metrics()` - Subscription metrics
- `get_wallet_addresses()` - Wallet addresses
- `get_wallet_balances()` - Wallet balances
- `get_network_config()` - Network configuration

### Public Functions (Keep Unrestricted):
- `create_subscription()` - Merchants need to create subscriptions
- `get_subscription()` - Merchants need to check their subscriptions
- User-facing functions should remain public

## Step 7: Update React Admin Panel

Update `src/admin-panel/src/utils/icp.js` to handle the new Result types:

```javascript
// Update service functions to handle Result wrapper
export async function getCanisterHealth() {
  const actor = await getTimerActor()
  const result = await actor.get_canister_health()

  if (result.err) {
    throw new Error(result.err)
  }

  return result.ok
}

// Repeat for all admin functions...
```

## Step 8: Get Your Principal ID

To add yourself as an admin, you need your principal ID:

```bash
# Get your dfx identity principal
dfx identity get-principal

# Or get it from NFID after logging in (shown in browser console)
```

## Step 9: Add First Admin

After deploying the canister, the deployer (your dfx identity) is automatically the first admin. To add another admin:

```bash
# Add another admin via dfx
dfx canister call OuroC_timer add_admin '(principal "YOUR_PRINCIPAL_ID_HERE")'

# Check admins list
dfx canister call OuroC_timer get_admins '()'
```

## Step 10: Test Authorization

```bash
# Test as admin (should work)
dfx canister call OuroC_timer get_canister_health '()'

# Test as unauthorized user (should fail)
dfx identity new test_user
dfx identity use test_user
dfx canister call OuroC_timer emergency_pause_all '()'  # Should return error
```

## Security Best Practices

1. **Always have at least 2 admins** - Don't lock yourself out
2. **Use separate identities** for different purposes:
   - Deployment identity (kept very secure)
   - Daily admin identity
   - Read-only monitoring identity
3. **Log all admin actions** (add logging to admin functions)
4. **Regular admin audits** - Review who has admin access
5. **Consider time-locks** for critical functions like emergency_pause_all

## Example: Protecting emergency_pause_all

Here's a complete example:

```motoko
public shared(msg) func emergency_pause_all() : async Result.Result<Nat, Text> {
    // Check if caller is admin
    switch (requireAdmin(msg.caller)) {
        case (#err(e)) { return #err(e) };
        case (#ok()) {
            var paused_count: Nat = 0;

            for ((id, sub) in subscriptions.entries()) {
                if (sub.status == #Active) {
                    let paused_sub = {
                        sub with status = #Paused;
                    };
                    subscriptions.put(id, paused_sub);
                    cancel_timer(id);
                    paused_count += 1;
                };
            };

            Debug.print("Admin " # Principal.toText(msg.caller) # " paused " # Nat.toText(paused_count) # " subscriptions");
            return #ok(paused_count);
        };
    };
};
```

## Troubleshooting

### "Unauthorized" errors in React app
- Make sure you're logged in with NFID
- Your NFID principal must be added as an admin
- Check browser console for the actual principal being used

### Can't add admins
- Only existing admins can add new admins
- Make sure the deployer identity is being used
- Check `dfx identity whoami`

### Functions not working after update
- Re-deploy the canister: `dfx deploy OuroC_timer`
- Make sure authorization.mo is in the right place
- Check for compilation errors

## Next Steps

1. Implement authorization following this guide
2. Test locally with multiple identities
3. Deploy to mainnet
4. Add your team members as admins
5. Update React admin panel to handle new Result types
