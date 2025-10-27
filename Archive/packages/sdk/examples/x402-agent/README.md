# X.402 AI Agent Subscription Examples

These examples demonstrate how AI agents can autonomously subscribe to services using X.402 HTTP-native payments with OuroC.

## Overview

**Problem:** AI agents need to pay for services autonomously without human interaction.

**Solution:** X.402 + OuroC enables agents to:
1. Detect payment requirements via HTTP 402 status
2. Automatically create and sign Solana payments
3. Subscribe to services without human wallet interaction
4. Benefit from OuroC's automated recurring payments

## Quick Start

### For AI Agents

```typescript
import { X402AgentClient } from '@ouroc/sdk'
import { Keypair } from '@solana/web3.js'

// Agent has its own Solana wallet
const agentWallet = Keypair.fromSecretKey(...)
const agent = new X402AgentClient(agentWallet, 'devnet')

// Agent subscribes autonomously
const result = await agent.subscribe('https://saas.com/api/subscribe', {
  plan: 'pro',
  interval: 'monthly'
})

console.log('Subscribed!', result.subscriptionId)
// OuroC handles all recurring payments automatically
```

### For Merchants (dApp Developers)

```typescript
import express from 'express'
import { x402Middleware, OuroC } from '@ouroc/sdk'

const app = express()
const ouroc = new OuroC({ canisterId: '...', network: 'devnet' })

// Protect endpoint with X.402
app.post('/api/subscribe',
  x402Middleware({
    price: '$29.99',
    merchantAddress: 'YourSolanaWallet...',
    network: 'devnet'
  }),
  async (req, res) => {
    const agentWallet = req.x402Payment.payer

    // Create subscription
    const subscription = await ouroc.createSubscription({
      subscriber_address: agentWallet,
      merchant_address: 'YourSolanaWallet...',
      amount: 29_990_000n,
      interval_seconds: 2_592_000n, // 30 days
      payment_token_mint: 'USDC_MINT_ADDRESS',
      start_time: [],
      api_key: 'your-api-key'
    })

    res.json({ success: true, subscriptionId: subscription.subscription_id })
  }
)

app.listen(3000)
```

## Examples

### 1. Agent Examples (`agent-example.ts`)

- **Basic Subscription:** Agent subscribes to a service
- **One-Time Payment:** Agent pays for a single API call
- **Custom Configuration:** Agent with enterprise settings

Run:
```bash
ts-node examples/x402-agent/agent-example.ts
```

### 2. Merchant Examples (`merchant-example.ts`)

- **Basic API:** Express.js with X.402 middleware
- **Next.js Route:** App Router API route handler
- **Multiple Tiers:** Different pricing plans

Run:
```bash
ts-node examples/x402-agent/merchant-example.ts
```

## How It Works

### Payment Flow

```
1. Agent → GET /api/subscribe
   Server → 402 Payment Required + payment details

2. Agent creates Solana payment (USDC transfer)
   Agent signs transaction with its wallet

3. Agent → POST /api/subscribe + X-PAYMENT header
   Server verifies payment via X.402

4. Server creates subscription in OuroC
   ICP timer handles all recurring payments

5. Agent receives subscription ID
   No further action needed from agent
```

### Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  AI Agent   │────────▶│  Merchant    │────────▶│   OuroC     │
│  (Payer)    │ X.402   │  (dApp API)  │ Create  │ (ICP Timer) │
└─────────────┘         └──────────────┘  Sub    └─────────────┘
     │                                                  │
     │ Signs payment                                   │
     ▼                                                  ▼
┌─────────────┐                                  ┌─────────────┐
│   Solana    │◀─────────────────────────────────│   Solana    │
│  Blockchain │    Recurring payments every 30d  │   via CF    │
└─────────────┘                                  └─────────────┘
```

## Requirements

### Agent Side
- Solana wallet with USDC balance
- Private key access (secure storage)
- Network connectivity

### Merchant Side
- OuroC SDK installed
- ICP canister deployed
- Merchant Solana wallet
- API endpoint with X.402 middleware

## Configuration

### Environment Variables

```bash
# Agent
AGENT_PRIVATE_KEY=base64_encoded_keypair
AGENT_NETWORK=devnet

# Merchant
MERCHANT_WALLET=YourSolanaAddress...
CANISTER_ID=your-icp-canister-id
API_KEY=your-ouroc-api-key
PORT=3000
```

## Use Cases

### 1. AI Research Assistant
Agent subscribes to academic databases and automatically pays for monthly access.

### 2. Autonomous Trading Bot
Agent pays for real-time market data subscriptions without human intervention.

### 3. AI Content Generator
Agent subscribes to image/video generation APIs and pays per use or monthly.

### 4. Multi-Agent Systems
Multiple agents share a budget and autonomously subscribe to various services.

## Benefits

### For Agents
✅ No human wallet interaction needed
✅ Autonomous subscription management
✅ Automatic recurring payments via OuroC
✅ HTTP-native (works with any framework)

### For Merchants
✅ Accept payments from AI agents
✅ No complex payment UX to build
✅ Recurring revenue automatically handled
✅ Simple middleware integration

### For Users (Agent Owners)
✅ Set agent budgets and limits
✅ Monitor agent spending
✅ Cancel subscriptions anytime
✅ Full audit trail via blockchain

## Security Considerations

### Agent Wallet Security
- Store private keys securely (HSM, key vault, encrypted storage)
- Use separate wallets for different agents
- Implement spending limits
- Monitor transaction activity

### Merchant Verification
- Always verify X.402 payment signatures
- Use OuroC's built-in verification
- Log all subscription creations
- Implement rate limiting

### Network Security
- Use HTTPS for all API endpoints
- Validate payment amounts match pricing
- Check agent identity if needed
- Implement fraud detection

## Troubleshooting

### Agent Can't Pay
- Check Solana wallet has USDC balance
- Verify network setting (devnet vs mainnet)
- Ensure private key is correctly formatted
- Check RPC endpoint connectivity

### Payment Not Verified
- Verify merchant address matches
- Check token mint address is correct
- Ensure amount matches requirements
- Verify network setting matches

### Subscription Not Created
- Check ICP canister is deployed
- Verify canister ID is correct
- Ensure API key is valid
- Check OuroC initialization

## Next Steps

1. Deploy your merchant API with X.402 middleware
2. Test with agent examples in this directory
3. Monitor subscriptions in OuroC dashboard
4. Scale to production with mainnet

## Resources

- [X.402 Specification](../../../x402/README.md)
- [OuroC Documentation](../../../docs/USER_MANUAL.md)
- [Solana Docs](https://docs.solana.com)
- [ICP Docs](https://internetcomputer.org/docs)

## Support

- GitHub Issues: [OuroC Issues](https://github.com/yourorg/ouroc/issues)
- Discord: [OuroC Community](https://discord.gg/ouroc)
- Email: support@ouroc.io
