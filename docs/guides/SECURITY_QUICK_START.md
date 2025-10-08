# 🛡️ Security Quick Start Guide

## Phase 1 Security Features - Quick Reference

### 🚀 What Changed?

Your canister now has **multi-layered protection** against cycle-draining attacks:

1. **Global Rate Limiting** - Max 1000 requests/minute canister-wide
2. **IP Rate Limiting** - Max 30 requests/minute per IP
3. **Exponential Backoff** - Automatic blocking after repeated failures
4. **Reputation System** - Tracks and scores user behavior

---

## 📊 Monitoring Commands

### Check Overall Security Status
```bash
dfx canister call OuroC_timer get_security_statistics
```

**Output:**
```motoko
{
    total_authenticated_users = 42;      // Active sessions
    total_reputation_tracked = 67;       // Users with history
    active_backoffs = 2;                 // Currently blocked users
    global_requests_this_minute = 145;   // Current load
    tracked_ips = 23;                    // Unique IPs this hour
}
```

---

### Check Specific User

#### User Reputation
```bash
dfx canister call OuroC_timer get_user_reputation '("USER_SOLANA_ADDRESS")'
```

**Example Output:**
```motoko
opt record {
    score = 85;                    // Lower = suspicious
    successful_auths = 8;
    failed_auths = 2;
    total_requests = 45;
    successful_operations = 40;
    failed_operations = 5;
    last_updated = 1234567890;
    created_at = 1234500000;
}
```

**Reputation Interpretation:**
- `score > 150`: Highly trusted user
- `score 50-150`: Normal user
- `score 0-50`: Suspicious activity
- `score < 0`: High risk - automatic restrictions

---

#### User Block Status
```bash
dfx canister call OuroC_timer get_user_block_status '("USER_SOLANA_ADDRESS")'
```

**Example Output:**
```motoko
opt record {
    failed_attempts = 5;
    blocked_until = 1234567900;
    is_blocked = true;
    remaining_seconds = 16;      // 16 seconds until unblock
}
```

---

## 🚨 Admin Emergency Functions

### Clear User Block
If a legitimate user is accidentally blocked:

```bash
dfx canister call OuroC_timer admin_clear_user_block '("USER_SOLANA_ADDRESS")'
```

---

### Adjust User Reputation
Manually adjust reputation (positive or negative):

```bash
# Increase reputation by 50 points
dfx canister call OuroC_timer admin_adjust_reputation '("USER_SOLANA_ADDRESS", 50)'

# Decrease reputation by 30 points
dfx canister call OuroC_timer admin_adjust_reputation '("USER_SOLANA_ADDRESS", -30)'
```

---

### Cleanup Old Data
Run periodically (e.g., daily via cron):

```bash
dfx canister call OuroC_timer cleanup_security_data
```

**Output:**
```motoko
{
    sessions_cleaned = 12;      // Expired sessions removed
    ip_limits_cleaned = 34;     // Old IP records cleaned
}
```

---

## 🔧 Tuning Rate Limits

Edit `src/timer/main.mo` (lines 107-119):

### For Development (More Permissive)
```motoko
global_rate_limit_per_minute = 10000;      // Higher limit
max_failed_attempts_before_backoff = 5;    // More lenient
backoff_multiplier = 1.5;                  // Slower backoff growth
max_backoff_seconds = 1800;                // 30 min max
```

### For Production (Balanced)
```motoko
global_rate_limit_per_minute = 1000;       // Standard
max_failed_attempts_before_backoff = 3;    // Balanced
backoff_multiplier = 2.0;                  // Standard 2x
max_backoff_seconds = 3600;                // 1 hour max
```

### For High Security (Strict)
```motoko
global_rate_limit_per_minute = 500;        // Stricter
max_failed_attempts_before_backoff = 2;    // Less tolerance
backoff_multiplier = 3.0;                  // Aggressive 3x
max_backoff_seconds = 7200;                // 2 hour max
```

---

## 📱 SDK Integration Example

### Update Authentication Call

**Before:**
```typescript
const result = await actor.authenticate_user(authRequest);
```

**After (with IP tracking):**
```typescript
// Optional: Get client IP for enhanced protection
const getClientIP = async () => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return null; // IP is optional
    }
};

const ip = await getClientIP();

const result = await actor.authenticate_user(
    authRequest,
    ip ? [ip] : []  // Pass as optional
);
```

---

### Handle New Error Messages

```typescript
const handleAuthError = (errorMessage: string) => {
    if (errorMessage.includes('temporarily blocked')) {
        // User is blocked due to failed attempts
        showMessage({
            type: 'error',
            title: 'Account Temporarily Blocked',
            message: 'Too many failed login attempts. Please wait a few moments and try again.',
            duration: 'persistent'
        });
    } else if (errorMessage.includes('Global rate limit exceeded')) {
        // System-wide rate limit hit
        showMessage({
            type: 'warning',
            title: 'System Busy',
            message: 'The service is experiencing high traffic. Please try again in a moment.',
            retry: true
        });
    } else if (errorMessage.includes('Rate limit exceeded')) {
        // User-specific rate limit
        showMessage({
            type: 'warning',
            title: 'Slow Down',
            message: 'You\'re making requests too quickly. Please wait a moment.',
            countdown: 60
        });
    } else {
        // Other errors
        showMessage({
            type: 'error',
            title: 'Authentication Failed',
            message: errorMessage
        });
    }
};
```

---

## 🎯 Attack Scenarios & Protection

### Scenario 1: Brute Force Login
**Attack:** Bot tries 1000 password guesses

**Protection:**
- Attempts 1-3: Allowed
- Attempt 4: 2 second block
- Attempt 5: 4 second block
- Attempt 6: 8 second block
- Attempt 10: 128 second block (~2 minutes)

**Result:** Attack slowed from 1000/min to ~10/hour (100x slower)

---

### Scenario 2: Distributed DoS
**Attack:** 100 IPs, each sending 50 requests/min

**Protection:**
- Global limit (1000/min) blocks after 20 IPs reach limit
- IP limit (30/min) blocks individual IPs
- Legitimate traffic still flows

**Result:** Attack contained, system stays responsive

---

### Scenario 3: Reputation Attack
**Attack:** Valid user spams operations

**Protection:**
- Per-user rate limit (60/min)
- Reputation drops with failed operations
- Future phase: Economic deposits required

**Result:** Limited damage, automatic restrictions

---

## 📊 Monitoring Dashboard (Future)

Recommended metrics to track:

```bash
# Every 5 minutes
STATS=$(dfx canister call OuroC_timer get_security_statistics)

# Alert if:
# - active_backoffs > 10 (potential attack)
# - global_requests_this_minute > 800 (nearing limit)
# - tracked_ips > 200 (unusual traffic)
```

---

## ✅ Deployment Checklist

Before deploying Phase 1 security:

- [ ] Review rate limit configuration for your use case
- [ ] Set up monitoring alerts
- [ ] Test authentication flow with SDK
- [ ] Document admin emergency procedures
- [ ] Schedule periodic cleanup (daily cron job)
- [ ] Monitor first 24 hours closely
- [ ] Adjust limits based on real traffic patterns

---

## 🆘 Troubleshooting

### Issue: Legitimate users getting blocked

**Solution 1:** Check their reputation
```bash
dfx canister call OuroC_timer get_user_reputation '("ADDRESS")'
```

**Solution 2:** Clear their block
```bash
dfx canister call OuroC_timer admin_clear_user_block '("ADDRESS")'
```

**Solution 3:** Increase reputation
```bash
dfx canister call OuroC_timer admin_adjust_reputation '("ADDRESS", 100)'
```

---

### Issue: Global rate limit hit during normal traffic

**Solution:** Increase global limit in config
```motoko
global_rate_limit_per_minute = 2000;  // Double the limit
```

Then redeploy canister.

---

### Issue: Too many false positives

**Solution:** Make backoff more lenient
```motoko
max_failed_attempts_before_backoff = 5;  // Was 3
backoff_multiplier = 1.5;                // Was 2.0
```

---

## 📞 Support

For issues or questions:
1. Check security statistics first
2. Review user reputation/block status
3. Check canister logs: `dfx canister logs OuroC_timer`
4. Use admin functions if needed
5. Adjust configuration if pattern emerges

---

**Remember:** Phase 1 provides strong protection without breaking your automated subscription system. Monitor, tune, and adjust based on real-world traffic patterns.
