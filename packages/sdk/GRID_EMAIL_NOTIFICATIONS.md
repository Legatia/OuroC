# Grid Email Notifications - Integration Guide

## Overview

Grid email users sign up with just an email address, but behind the scenes Grid creates a Solana wallet for them. This guide shows how to forward on-chain SPL Memo notifications to their email inbox.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  On-Chain Flow (Automatic)                                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ICP Timer → OuroC Contract → SPL Memo Transaction          │
│       │                              │                        │
│       │                              ▼                        │
│       │                    Grid Wallet (Grid7x...abc)        │
│       │                    Contains: "Netflix: Payment       │
│       │                    due in 3 days. Amount: 10 USDC"  │
│       │                                                       │
│       └─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Email Flow (Your Implementation)                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  GridWebhookListener → Parse SPL Memo → Send Email          │
│       │                       │                   │           │
│       │                       │                   ▼           │
│       │                       │         user@gmail.com        │
│       │                       │                               │
│       └─────────────────────────────────────────────────────┘
```

## Quick Start

### Step 1: Install Dependencies

```bash
npm install @ouroc/sdk
npm install resend  # or sendgrid, mailgun, aws-ses
```

### Step 2: Setup Webhook Listener

```typescript
import { Connection } from '@solana/web3.js';
import { GridClient } from '@ouroc/sdk/grid';
import { GridWebhookListener } from '@ouroc/sdk/grid/webhooks';
import { ResendEmailService } from '@ouroc/sdk/grid/webhooks/EmailServices';

// Initialize services
const connection = new Connection('https://api.mainnet-beta.solana.com');
const gridClient = new GridClient({ apiKey: process.env.GRID_API_KEY! });

// Setup email service (Resend example)
const emailService = new ResendEmailService(
  process.env.RESEND_API_KEY!,
  'notifications@your-app.com'
);

// Create webhook listener
const webhookListener = new GridWebhookListener({
  connection,
  gridClient,
  emailService,
});

// Start monitoring Grid accounts
async function monitorGridUser(gridAccountId: string) {
  await webhookListener.monitorGridAccount(gridAccountId);
  console.log(`✅ Monitoring ${gridAccountId} for notifications`);
}
```

### Step 3: Monitor Grid Users

```typescript
// When user signs up via Grid
const result = await subscriberFlow.createSubscriber('user@example.com');

// Start monitoring their Grid account for notifications
await monitorGridUser(result.gridAccount.account_id);

// That's it! User will now receive emails when on-chain notifications arrive
```

## Complete Example

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { GridClient, SubscriberFlow } from '@ouroc/sdk/grid';
import { GridWebhookListener } from '@ouroc/sdk/grid/webhooks';
import { ResendEmailService } from '@ouroc/sdk/grid/webhooks/EmailServices';

// ===================================
// 1. Setup Services
// ===================================

const connection = new Connection(process.env.SOLANA_RPC_URL!);
const gridClient = new GridClient({ apiKey: process.env.GRID_API_KEY! });

const emailService = new ResendEmailService(
  process.env.RESEND_API_KEY!,
  'notifications@your-app.com'
);

const webhookListener = new GridWebhookListener({
  connection,
  gridClient,
  emailService,
});

const subscriberFlow = new SubscriberFlow({ gridClient });

// ===================================
// 2. User Signs Up (Grid Email)
// ===================================

async function createGridSubscription(
  userEmail: string,
  merchantName: string
) {
  // Step 1: Create Grid account
  console.log(`Creating Grid account for ${userEmail}...`);
  const { gridAccount, subscriberPublicKey, awaitingOTP } =
    await subscriberFlow.createSubscriber(userEmail);

  console.log(`✅ Grid account created: ${gridAccount.account_id}`);
  console.log(`📧 OTP sent to ${userEmail}`);

  // Step 2: User verifies OTP (implement OTP collection in your UI)
  const otpCode = await promptUserForOTP(); // Your UI logic
  await subscriberFlow.verifyOTP(gridAccount.account_id, otpCode);

  console.log(`✅ Grid account verified`);

  // Step 3: Start monitoring for notifications
  await webhookListener.monitorGridAccount(gridAccount.account_id);

  console.log(`✅ Email notifications enabled`);

  // Step 4: Create OuroC subscription (with merchant_name!)
  const program = anchor.workspace.OuroCSubscriptions;

  await program.methods
    .createSubscription(
      `sub-${Date.now()}`,
      new anchor.BN(10_000_000), // 10 USDC
      new anchor.BN(30 * 24 * 60 * 60), // 30 days
      merchantAddress,
      merchantName, // ← New parameter!
      usdcMint,
      3, // reminder_days_before_payment
      50, // slippage_bps
      icpSignature
    )
    .accounts({
      subscription: subscriptionPda,
      config: configPda,
      subscriber: subscriberPublicKey, // Grid account pubkey
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log(`✅ Subscription created`);

  // Step 5: User approves delegation (Grid account signs)
  await program.methods
    .approveSubscriptionDelegate(subscriptionId, amount)
    .accounts({
      subscriberTokenAccount: gridUsdcAccount,
      subscriptionPda,
      subscriber: subscriberPublicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log(`✅ Delegation approved`);

  return {
    gridAccountId: gridAccount.account_id,
    subscriptionId,
    email: userEmail,
  };
}

// ===================================
// 3. User Receives Notifications
// ===================================

// 3 days before payment:
// 1. ICP timer calls process_trigger(opcode=1)
// 2. On-chain notification sent to Grid wallet
// 3. GridWebhookListener detects transaction
// 4. Email sent to user@example.com

// Example email user receives:
/*
Subject: Netflix - Payment Reminder

💰 Payment Reminder

Netflix

Your subscription payment is due in 3 days.

Details:
- Amount: 10.00 USDC
- Merchant: Netflix
- Due in: 3 days

⚠️ Action Required: Please ensure you have sufficient balance
in your account to avoid payment failure.

[View Subscription]
*/

// ===================================
// 4. Cleanup (when user unsubscribes)
// ===================================

async function stopMonitoring(gridAccountId: string) {
  await webhookListener.stopMonitoring(gridAccountId);
  console.log(`Stopped monitoring ${gridAccountId}`);
}
```

## Email Service Options

### Option 1: Resend (Recommended for Startups)

**Pros**: Modern API, generous free tier, great DX
**Pricing**: 100 emails/day free, then $0.40/1000 emails
**Setup**:

```typescript
import { ResendEmailService } from '@ouroc/sdk/grid/webhooks/EmailServices';

const emailService = new ResendEmailService(
  process.env.RESEND_API_KEY,
  'notifications@your-app.com'
);
```

Get API key: https://resend.com/api-keys

### Option 2: SendGrid (Enterprise-Ready)

**Pros**: Battle-tested, advanced features, high deliverability
**Pricing**: 100 emails/day free, then $19.95/month
**Setup**:

```typescript
import { SendGridEmailService } from '@ouroc/sdk/grid/webhooks/EmailServices';

const emailService = new SendGridEmailService(
  process.env.SENDGRID_API_KEY,
  'notifications@your-app.com'
);
```

Get API key: https://app.sendgrid.com/settings/api_keys

### Option 3: AWS SES (Cheapest at Scale)

**Pros**: $0.10 per 1000 emails, AWS integration
**Pricing**: First 62,000 emails/month free (if on EC2)
**Setup**:

```typescript
import { AWSEmailService } from '@ouroc/sdk/grid/webhooks/EmailServices';

const emailService = new AWSEmailService({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1',
  fromEmail: 'notifications@your-app.com',
});
```

### Option 4: Custom Implementation

```typescript
import { CustomEmailService } from '@ouroc/sdk/grid/webhooks/EmailServices';

const emailService = new CustomEmailService(async (params) => {
  // Your custom email logic
  await yourEmailAPI.send({
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
});
```

### Option 5: Console (Development/Testing)

```typescript
import { ConsoleEmailService } from '@ouroc/sdk/grid/webhooks/EmailServices';

const emailService = new ConsoleEmailService();
// Logs emails to console instead of sending
```

## Production Deployment

### Server-Side Monitoring (Recommended)

Run webhook listener on your backend server:

```typescript
// server.ts
import express from 'express';
import { GridWebhookListener } from '@ouroc/sdk/grid/webhooks';

const app = express();

// Initialize webhook listener (once on server startup)
const webhookListener = new GridWebhookListener({
  connection,
  gridClient,
  emailService,
});

// When user signs up, add them to monitoring
app.post('/api/subscriptions/create', async (req, res) => {
  const { email, merchantName } = req.body;

  // Create Grid account + subscription
  const result = await createGridSubscription(email, merchantName);

  // Start monitoring
  await webhookListener.monitorGridAccount(result.gridAccountId);

  res.json({ success: true, subscriptionId: result.subscriptionId });
});

// Cleanup on server shutdown
process.on('SIGINT', async () => {
  await webhookListener.stopAll();
  process.exit();
});

app.listen(3000);
```

### Environment Variables

```bash
# .env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
GRID_API_KEY=your_grid_api_key
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=notifications@your-app.com
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

CMD ["node", "dist/server.js"]
```

## Performance Considerations

### Monitoring Multiple Users

```typescript
// Batch monitor all Grid users on startup
async function monitorAllGridUsers() {
  const gridUsers = await db.getAllGridUsers(); // Your database

  console.log(`Monitoring ${gridUsers.length} Grid accounts...`);

  for (const user of gridUsers) {
    await webhookListener.monitorGridAccount(user.gridAccountId);
  }

  console.log(`✅ All Grid accounts monitored`);
}

// Call on server startup
monitorAllGridUsers();
```

### WebSocket Connection Management

The webhook listener uses Solana's `onAccountChange` WebSocket subscriptions. Best practices:

- **Limit**: Max ~1000 concurrent subscriptions per connection
- **Reconnection**: Automatically handled by `@solana/web3.js`
- **Failover**: Use multiple RPC endpoints for redundancy

```typescript
const connections = [
  new Connection('https://api.mainnet-beta.solana.com'),
  new Connection('https://solana-api.projectserum.com'),
  new Connection(process.env.CUSTOM_RPC_URL),
];

// Use first available connection
const activeConnection = connections[0];
```

## Testing

### Test Notification Flow

```typescript
// test.ts
import { ConsoleEmailService } from '@ouroc/sdk/grid/webhooks/EmailServices';

// Use console email service for testing
const testEmailService = new ConsoleEmailService();

const webhookListener = new GridWebhookListener({
  connection,
  gridClient,
  emailService: testEmailService, // Logs instead of sending
});

// Trigger test notification
await program.methods.sendNotification(
  'TestApp: Payment due in 3 days. Amount: 10 USDC'
).rpc();

// Check console for email output
```

## Troubleshooting

### Emails Not Arriving

1. **Check WebSocket connection**:
```typescript
connection.on('change', () => {
  console.log('WebSocket state changed');
});
```

2. **Verify SPL Memo transaction**:
```bash
solscan.io/account/<grid-wallet-address>
```

3. **Check email service logs**:
```typescript
emailService.sendEmail({ ... })
  .then(() => console.log('Email sent'))
  .catch(err => console.error('Email failed:', err));
```

### High Latency

- Use dedicated RPC endpoint (not public)
- Deploy server close to RPC endpoint
- Cache Grid account metadata

## Summary

| Feature | Status |
|---------|--------|
| On-chain notifications | ✅ Automatic (SPL Memo) |
| Email forwarding | ✅ Implemented (GridWebhookListener) |
| Merchant branding | ✅ Supported (merchant_name field) |
| Email templates | ✅ HTML + Plain text |
| Email services | ✅ Resend, SendGrid, SES, Mailgun |
| Production ready | ✅ Yes |

## Next Steps

1. Choose email service (Resend recommended)
2. Deploy webhook listener on backend
3. Monitor Grid accounts when users subscribe
4. Test with Grid account on devnet
5. Deploy to production

---

**Need help?** Check out:
- [Grid API Docs](https://docs.grid.so/)
- [OuroC SDK Docs](../README.md)
- [Push Notifications Guide](./PUSH_NOTIFICATIONS.md)
