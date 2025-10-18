# OuroC Admin Manual

## 🚀 Mainnet Canisters

| Canister | Mainnet ID | Purpose |
|----------|------------|---------|
| **LicenseRegistry** | `gbuo5-iyaaa-aaaao-qkuba-cai` | API Key Management & Developer Registration |
| **OuroC_timer** | `7tbxr-naaaa-aaaao-qkrca-cai` | Subscription Timer & Payment Coordination |
| **Internet Identity** | `rdmx6-jaaaa-aaaaa-aaadq-cai` | Authentication Service |

## 🌐 Access URLs

**Candid Interfaces (Web Management):**
- **LicenseRegistry**: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=gbuo5-iyaaa-aaaao-qkuba-cai
- **OuroC_timer**: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=7tbxr-naaaa-aaaao-qkrca-cai

## 🔧 Environment Setup

### Prerequisites
```bash
# Install DFINITY SDK
curl -fsSL https://internetcomputer.org/install.sh | sh

# Create identity (if not exists)
dfx identity new admin
dfx identity use admin
```

### Network Configuration
```bash
# Switch to mainnet
dfx identity use admin
export IC_NETWORK=ic

# Or use --network flag for each command
dfx canister --network ic [command]
```

## 📊 System Status & Monitoring

### Basic Health Checks
```bash
# Check LicenseRegistry status
dfx canister --network ic call LicenseRegistry get_registry_stats

# Check Timer canister health
dfx canister --network ic call OuroC_timer get_canister_health

# Quick ping test
dfx canister --network ic call OuroC_timer ping
```

### Detailed System Information
```bash
# Timer canister detailed status
dfx canister --network ic call OuroC_timer get_canister_status

# System metrics
dfx canister --network ic call OuroC_timer get_system_metrics

# Cycle status
dfx canister --network ic call OuroC_timer get_cycle_status
```

## 🔐 LicenseRegistry Management

### Admin Functions
```bash
# Add new admin
dfx canister --network ic call LicenseRegistry add_admin "(principal \"PRINCIPAL_ID\")"

# Get list of admins
dfx canister --network ic call LicenseRegistry get_admins

# Initialize registry (if needed)
dfx canister --network ic call LicenseRegistry initialize_registry
```

### Developer Management
```bash
# Register new developer
dfx canister --network ic call LicenseRegistry register_developer "({
  name = \"Developer Name\";
  email = \"dev@example.com\";
  tier = variant { Business };
  project_description = \"Project description here\"
})"

# Get developer information
dfx canister --network ic call LicenseRegistry get_developer_info "(principal \"PRINCIPAL_ID\")"

# Get registry statistics
dfx canister --network ic call LicenseRegistry get_registry_stats
```

### API Key Management
```bash
# Validate API key
dfx canister --network ic call LicenseRegistry validate_license '(\"ouro_1760730237_703000_3000\")'

# Consume license usage (after successful operation)
dfx canister --network ic call LicenseRegistry consume_license_usage '(\"API_KEY_HERE\")'
```

## ⏰ OuroC_timer Management

### Admin Functions
```bash
# Check admin status
dfx canister --network ic call OuroC_timer debug_admin_info

# Add new admin
dfx canister --network ic call OuroC_timer add_admin "(principal \"PRINCIPAL_ID\")"

# Remove admin
dfx canister --network ic call OuroC_timer remove_admin "(principal \"PRINCIPAL_ID\")"

# Add read-only user
dfx canister --network ic call OuroC_timer add_read_only_user "(principal \"PRINCIPAL_ID\")"

# Get admin list
dfx canister --network ic call OuroC_timer get_admins
```

### Subscription Management
```bash
# Create subscription (requires API key)
dfx canister --network ic call OuroC_timer create_subscription "({
  subscription_id = \"sub_001\";
  solana_contract_address = \"CONTRACT_ADDRESS\";
  payment_token_mint = \"TOKEN_MINT\";
  amount = 10000000;
  subscriber_address = \"SUBSCRIBER_WALLET\";
  merchant_address = \"MERCHANT_WALLET\";
  reminder_days_before_payment = 3;
  interval_seconds = 2592000;
  start_time = null;
  api_key = \"YOUR_API_KEY\"
})"

# Get subscription details
dfx canister --network ic call OuroC_timer get_subscription '(\"sub_001\")'

# List all subscriptions
dfx canister --network ic call OuroC_timer list_subscriptions

# Pause subscription
dfx canister --network ic call OuroC_timer pause_subscription '(\"sub_001\")'

# Resume subscription
dfx canister --network ic call OuroC_timer resume_subscription '(\"sub_001\")'

# Cancel subscription
dfx canister --network ic call OuroC_timer cancel_subscription '(\"sub_001\")'
```

### Wallet & Balance Management
```bash
# Get wallet addresses
dfx canister --network ic call OuroC_timer get_wallet_addresses

# Get wallet balances
dfx canister --network ic call OuroC_timer get_wallet_balances

# Get comprehensive wallet info (admin only)
dfx canister --network ic call OuroC_timer get_comprehensive_wallet_info
```

### Fee Governance
```bash
# Get fee governance status
dfx canister --network ic call OuroC_timer get_fee_governance_status

# Propose new fee address (7-day waiting period)
dfx canister --network ic call OuroC_timer propose_fee_address_change '(\"NEW_FEE_ADDRESS\")'

# Execute fee address change (after 7 days)
dfx canister --network ic call OuroC_timer execute_fee_address_change

# Cancel fee address proposal
dfx canister --network ic call OuroC_timer cancel_fee_address_proposal

# Get current fee address
dfx canister --network ic call OuroC_timer get_current_fee_address
```

### Emergency Functions
```bash
# Emergency pause all subscriptions
dfx canister --network ic call OuroC_timer emergency_pause_all

# Resume operations after maintenance
dfx canister --network ic call OuroC_timer resume_operations

# Get overdue subscriptions (manual collection needed)
dfx canister --network ic call OuroC_timer get_overdue_subscriptions

# Clean up old cancelled subscriptions
dfx canister --network ic call OuroC_timer cleanup_old_subscriptions '(2592000)'  # 30 days
```

### Encrypted Metadata (Privacy Features)
```bash
# List all encrypted metadata (admin only)
dfx canister --network ic call OuroC_timer list_encrypted_metadata

# Delete encrypted metadata (GDPR compliance)
dfx canister --network ic call OuroC_timer delete_encrypted_metadata '(\"sub_001\")'
```

## 🔧 System Maintenance

### Cycle Management
```bash
# Get cycle status
dfx canister --network ic call OuroC_timer get_cycle_status

# Set cycle threshold
dfx canister --network ic call OuroC_timer set_cycle_threshold '(5000000000000)'

# Enable/disable auto refill
dfx canister --network ic call OuroC_timer enable_auto_refill '(true)'

# Monitor cycles
dfx canister --network ic call OuroC_timer monitor_cycles

# Refill cycles from fees
dfx canister --network ic call OuroC_timer refill_cycles_from_fees
```

### Network Configuration
```bash
# Get current network config
dfx canister --network ic call OuroC_timer get_network_config

# Initialize canister (if not already done)
dfx canister --network ic call OuroC_timer initialize_canister
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Permission Errors
```bash
# Check if you're admin
dfx canister --network ic call OuroC_timer debug_admin_info

# Check current identity
dfx identity whoami
dfx identity get-principal
```

#### 2. Canister Not Initialized
```bash
# Initialize LicenseRegistry
dfx canister --network ic call LicenseRegistry initialize_registry

# Initialize Timer
dfx canister --network ic call OuroC_timer initialize_canister
```

#### 3. Low Cycle Balance
```bash
# Check cycle balance
dfx canister --network ic call OuroC_timer get_cycle_status

# Emergency actions if cycles are critical
dfx canister --network ic call OuroC_timer emergency_pause_all
```

#### 4. Subscription Issues
```bash
# Check subscription status
dfx canister --network ic call OuroC_timer get_subscription '(\"sub_id\")'

# Check overdue subscriptions
dfx canister --network ic call OuroC_timer get_overdue_subscriptions

# Check system health
dfx canister --network ic call OuroC_timer get_canister_health
```

### Log Analysis
```bash
# For local development, check dfx logs
dfx start --background
dfx logs --network ic OuroC_timer
dfx logs --network ic LicenseRegistry
```

## 📋 Quick Reference Commands

### Daily Health Check
```bash
# System status
dfx canister --network ic call OuroC_timer get_canister_health
dfx canister --network ic call LicenseRegistry get_registry_stats

# Admin status
dfx canister --network ic call OuroC_timer debug_admin_info
dfx canister --network ic call LicenseRegistry get_admins

# Cycle status
dfx canister --network ic call OuroC_timer get_cycle_status
```

### Developer Onboarding
```bash
# Register new developer
dfx canister --network ic call LicenseRegistry register_developer "({
  name = \"Developer Name\";
  email = \"dev@example.com\";
  tier = variant { Business };
  project_description = \"Project description\"
})"

# Get their API key (returned from registration)
# API key format: ouro_TIMESTAMP_RANDOM_CHECKSUM
```

### Emergency Response
```bash
# Check system health
dfx canister --network ic call OuroC_timer get_canister_health

# Pause everything if needed
dfx canister --network ic call OuroC_timer emergency_pause_all

# Check what's overdue
dfx canister --network ic call OuroC_timer get_overdue_subscriptions
```

## 📞 Support

### Mainnet IDs
- **LicenseRegistry**: `gbuo5-iyaaa-aaaao-qkuba-cai`
- **OuroC_timer**: `7tbxr-naaaa-aaaao-qkrca-cai`
- **Internet Identity**: `rdmx6-jaaaa-aaaaa-aaadq-cai`

### Useful Links
- **IC Explorer**: https://dashboard.internetcomputer.org/
- **Candid Docs**: https://internetcomputer.org/docs/current/developer-docs/backend/candid/
- **Motoko Docs**: https://internetcomputer.org/docs/current/motoko/main-motoko/

### Security Notes
- Never share your private keys or identity files
- Always verify principal IDs before adding admins
- Monitor cycle balances regularly
- Keep backups of important configurations
- Use the 7-day fee address change delay for security

---

**Last Updated**: October 2025
**Version**: 1.0.0
**Network**: Mainnet (IC)