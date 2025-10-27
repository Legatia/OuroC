# OuroC Admin Panel

React-based admin dashboard for monitoring and managing the OuroC timer canister on Internet Computer.

## Architecture

The admin panel is a **React application** deployed as an ICP asset canister that directly queries the `OuroC_timer` canister:

```
Admin Panel (React App → Asset Canister)
    ├─ React Components (Dashboard, Login, etc.)
    ├─ React Router (Multiple dashboard views)
    ├─ Custom Hooks (useAuth)
    └─ ICP Service Layer
        └─ Calls → OuroC_timer canister
            ├─ get_canister_health()
            ├─ get_system_metrics()
            ├─ get_wallet_addresses()
            ├─ get_wallet_balances()
            ├─ get_network_config()
            └─ emergency_pause_all()
```

Built with **Vite + React** for optimal performance and developer experience.

## Features

### 🎯 Real-Time Monitoring
- **Canister Health**: Status (Healthy/Degraded/Critical), uptime, cycle balance
- **Subscription Metrics**: Total subscriptions, active timers, paused subscriptions
- **Wallet Balances**: Main wallet and fee collection USDC balances
- **System Performance**: Memory usage, failed payments, payment processing

### 🔒 Security
- **Internet Identity Auth**: Only authorized users can access
- **Principal-based Access**: No passwords, fully decentralized
- **Direct Canister Queries**: No middleware or API layer

### ⚡ Quick Actions
- **Refresh Data**: Manual refresh with 30-second auto-refresh
- **Emergency Pause**: Stop all subscriptions instantly (requires confirmation)

## Development

### Prerequisites
- Node.js 18+ installed
- DFX SDK installed (`dfx --version`)
- OuroC_timer canister already deployed

### Local Development (with Hot Reload)

1. **Install dependencies**:
```bash
cd src/admin-panel
npm install
```

2. **Update timer canister ID**:
Edit `src/admin-panel/src/utils/icp.js` line 6:
```javascript
export const TIMER_CANISTER_ID = 'YOUR_ACTUAL_TIMER_CANISTER_ID'
```

3. **Start development server**:
```bash
npm run dev
```

This starts Vite dev server at `http://localhost:5173` with hot module replacement.

## Deployment

### Local Deployment

1. **Start local replica**:
```bash
dfx start --background --clean
```

2. **Build React app**:
```bash
cd src/admin-panel
npm run build
```

3. **Deploy admin panel**:
```bash
cd ../..  # Back to project root
dfx deploy admin_panel
```

4. **Get canister URL**:
```bash
echo "http://$(dfx canister id admin_panel).localhost:4943"
```

### Mainnet Deployment

1. **Update timer canister ID**:
Edit `src/admin-panel/src/utils/icp.js`:
```javascript
export const TIMER_CANISTER_ID = 'YOUR_MAINNET_TIMER_CANISTER_ID'
```

2. **Build React app**:
```bash
cd src/admin-panel
npm run build
```

3. **Deploy to mainnet**:
```bash
cd ../..  # Back to project root
dfx deploy --network ic admin_panel
```

4. **Access via HTTPS**:
```
https://[admin-panel-canister-id].ic0.app
```

**Note**: The ICP service layer in `src/utils/icp.js` automatically detects localhost vs production and only calls `fetchRootKey()` for local development.

## Usage

### Login

1. Visit the admin panel URL
2. Click "Connect with Internet Identity"
3. Authenticate with your Internet Identity
4. Dashboard loads automatically

**Note**: No authorization check is performed by the admin panel itself. Anyone with II can access the UI, but the timer canister may restrict certain operations based on caller principal.

### Dashboard Overview

**System Health Stats**:
- **Canister Status**: Shows Healthy/Degraded/Critical with reason
- **Cycle Balance**: Current balance with estimated days remaining
- **Active Subscriptions**: Count of active subscriptions from total
- **Uptime**: Days and hours since canister start

**Wallet Balances**:
- **Main Wallet**: Solana address and USDC balance
- **Fee Collection**: Fee collection address and USDC balance

**System Metrics**:
- Total subscriptions, active timers, failed payments, memory usage

**Network Configuration**:
- Solana network (Mainnet/Devnet/Testnet)
- RPC endpoint URL

### Emergency Controls

**Emergency Pause All**:
- Pauses ALL active subscriptions immediately
- Requires confirmation dialog
- Returns count of paused subscriptions
- Use only in critical situations (canister malfunction, security issue)

**To Resume**:
Call `resume_subscription()` on individual subscriptions via timer canister, or deploy a resume function.

## Data Sources

The admin panel queries these timer canister functions:

| Function | Data Retrieved |
|----------|----------------|
| `get_canister_health()` | Status, uptime, cycles, subscriptions, timers, failures, memory |
| `get_system_metrics()` | Total/active/paused subscriptions, payments processed, uptime |
| `get_wallet_addresses()` | Main and fee collection Solana addresses |
| `get_wallet_balances()` | USDC balances for both wallets |
| `get_network_config()` | Network environment, RPC endpoint, key name |
| `emergency_pause_all()` | Pauses all subscriptions (returns count) |

## Monitoring Recommendations

### Real-Time Checks
- ✓ Cycle balance (alert if < 1T cycles)
- ✓ Canister status (alert if Degraded or Critical)
- ✓ Failed payment count (alert if > 10)

### Daily Checks
- ✓ Wallet balances (ensure sufficient USDC for operations)
- ✓ Active subscription growth
- ✓ System uptime

### Weekly Reviews
- ✓ Cycle burn rate trends
- ✓ Failed payment patterns
- ✓ Memory usage growth

## Troubleshooting

### Dashboard won't load
- Check browser console for errors
- Verify canister is deployed: `dfx canister status admin_panel`
- Ensure Internet Identity login succeeded

### "Failed to load data" errors
- Verify `TIMER_CANISTER_ID` is correct in index.html
- Check timer canister is running: `dfx canister status OuroC_timer`
- For local dev, ensure `agent.fetchRootKey()` is uncommented (line 439)

### Emergency pause fails
- Check if you have permission to call timer canister functions
- Verify timer canister is responding
- Review browser console for detailed error

### Wallet balances show "Error"
- Solana client may not be initialized in timer canister
- Check timer canister logs: `dfx canister logs OuroC_timer`
- Verify network connectivity to Solana RPC

## Development

### Project Structure

```
src/admin-panel/
├── src/
│   ├── components/       # React components
│   │   └── Login.jsx
│   ├── hooks/           # Custom React hooks
│   │   └── useAuth.js
│   ├── pages/           # Page components
│   │   └── DashboardPage.jsx
│   ├── utils/           # Utility functions
│   │   └── icp.js       # ICP service layer
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # Entry point
│   └── index.css        # Styles
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
└── package.json         # Dependencies
```

### Updating the Dashboard

1. **Edit React components** in `src/` directory
2. **Test with hot reload**: `npm run dev`
3. **Build for production**: `npm run build`
4. **Deploy**: `dfx deploy admin_panel`

### Adding New Metrics

1. Add new query function to timer canister (`src/timer/main.mo`)
2. Add function to IDL in `src/utils/icp.js` (timerIDL)
3. Create new service function in `src/utils/icp.js`
4. Call function in `DashboardPage.jsx` component
5. Display data using React state and JSX

### Adding New Dashboard Pages

1. Create new page component in `src/pages/`
2. Add route in `src/App.jsx` using React Router
3. Update navigation as needed

## Security Considerations

### ✅ Best Practices
- Only share admin panel URL with OuroC dev team
- Use strong Internet Identity passkeys
- Monitor for unauthorized access attempts
- Emergency pause affects ALL merchants - use carefully

### ⚠️ Important Notes
- Admin panel has **read access** to all timer canister data
- **Emergency pause** stops all subscription payments globally
- Timer canister may have authorization checks for write operations
- Lost Internet Identity cannot be recovered (keep backups)

## Technical Details

### Auto-Refresh
Dashboard refreshes every 30 seconds automatically (line 449):
```javascript
setInterval(loadDashboardData, 30000);
```

### Cycle Balance Estimation
Uses 50B cycles/day burn rate estimate (line 491):
```javascript
const dailyBurn = 0.05; // 50B cycles per day in T
```

### USDC Decimal Handling
USDC has 6 decimals, balances are divided by 1e6 (line 529):
```javascript
const mainBalance = Number(walletBalancesResult.ok.main) / 1e6;
```

## License

Part of OuroC payment infrastructure. Internal use only.

## Support

For issues or questions:
- Internal: Contact dev team
- Security issues: Report immediately to team lead
- Deployment issues: Check dfx logs and browser console
