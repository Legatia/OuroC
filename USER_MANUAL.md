# OuroC User Manual

**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: 2025-10-17

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Core Concepts](#core-concepts)
4. [For Subscribers](#for-subscribers)
5. [For Merchants](#for-merchants)
6. [For AI Agents](#for-ai-agents)
7. [Enterprise Features](#enterprise-features)
8. [Developer Guide](#developer-guide)
9. [Security Best Practices](#security-best-practices)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#faq)

---

## Introduction

### What is OuroC?

OuroC is a **decentralized subscription payment protocol** that enables automated recurring payments on Solana with enterprise-grade privacy and IP protection.

**Key Benefits:**
- **Automated Payments**: Set once, pay forever without manual intervention
- **Enterprise Privacy**: Optional encrypted metadata for GDPR compliance
- **AI-Ready**: Built-in support for agent-to-agent (A2A) payments
- **Email Signup**: No crypto wallet required for subscribers
- **IP Protection**: License-based access control for developers
- **Multi-Token**: Accept any SPL token with automatic USDC conversion

### Who is OuroC For?

🎯 **Subscribers**: Anyone wanting to automate recurring payments (SaaS, content, services)

🏪 **Merchants**: Businesses offering subscription products or services

🤖 **AI Agents**: Autonomous systems that need to pay for other services

👨‍💻 **Developers**: Building applications with subscription features

🏢 **Enterprise**: Organizations requiring privacy and compliance features

---

## Getting Started

### Installation

```bash
npm install @ouroc/sdk
```

### Basic Setup

```typescript
import { OuroCProvider, useSubscription } from '@ouroc/sdk';

function App() {
  return (
    <OuroCProvider>
      <MySubscriptionComponent />
    </OuroCProvider>
  );
}
```

### Required Dependencies

```json
{
  "dependencies": {
    "@ouroc/sdk": "^1.0.0",
    "@solana/wallet-adapter-react": "^0.15.0",
    "@solana/web3.js": "^1.87.0"
  }
}
```

### Quick Example

```typescript
import { OuroCClient } from '@ouroc/sdk';

const client = new OuroCClient({ wallet });

// Create a subscription
const subscription = await client.createSubscription({
  solana_payer: wallet.publicKey.toString(),
  solana_receiver: "MERCHANT_WALLET_ADDRESS",
  amount: 10_000000, // 10 USDC
  interval_seconds: 2592000, // 30 days
  token: "USDC"
});

console.log('Subscription created:', subscription.id);
```

---

## Core Concepts

### How OuroC Works

```
User → Solana Contract (subscription data + payment delegation)
              ↓
        ICP Timer (autonomous scheduling)
              ↓
        Solana Router (payment execution)
              ↓
        Token Processing (USDC → Merchant)
```

### Key Components

**Solana Blockchain**
- Stores subscription data and payment history
- Immutable audit trail
- Fast, low-cost transactions

**ICP (Internet Computer)**
- Autonomous payment scheduling
- 600-line timer canister
- Threshold Ed25519 signing for security

**Grid by Squads** (Optional)
- Email accounts (no wallet required)
- KYC/Compliance features
- Multisig treasury management
- Fiat on/off ramps

### Subscription Lifecycle

1. **Creation**: User approves subscription with spending limits
2. **Scheduling**: ICP timer tracks payment schedule
3. **Execution**: Automatic payment processing at intervals
4. **Notifications**: Optional payment reminders
5. **Management**: Pause/cancel anytime by user

### Payment Flow

1. **Authorization**: User signs transaction with max amount + duration
2. **Delegation**: ICP timer gets authority to execute payments
3. **Scheduling**: Timer tracks when payments are due
4. **Execution**: Timer signs and submits payment transactions
5. **Distribution**: Funds split between merchant and platform

---

## For Subscribers

### Creating Your First Subscription

#### Option 1: With Wallet Connection

```typescript
import { useSubscription } from '@ouroc/sdk';

function SubscribeButton({ merchantAddress, amount }) {
  const { createSubscription, isLoading } = useSubscription();

  const handleSubscribe = async () => {
    try {
      const subscription = await createSubscription({
        solana_payer: wallet.publicKey.toString(),
        solana_receiver: merchantAddress,
        amount: amount * 1_000000, // Convert to USDC smallest unit
        interval_seconds: 2592000, // 30 days
        token: "USDC"
      });

      alert(`✅ Subscription created: ${subscription.id}`);
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  return (
    <button
      onClick={handleSubscribe}
      disabled={isLoading || !wallet.connected}
    >
      {isLoading ? 'Processing...' : 'Subscribe Now'}
    </button>
  );
}
```

#### Option 2: With Email (Grid Integration)

```typescript
import { GridSubscriberLogin } from '@ouroc/sdk/grid';

function EmailSubscribe() {
  const [userEmail, setUserEmail] = useState('');
  const [showLogin, setShowLogin] = useState(false);

  const handleEmailSubscribe = async () => {
    setShowLogin(true);
  };

  return (
    <div>
      <input
        type="email"
        value={userEmail}
        onChange={(e) => setUserEmail(e.target.value)}
        placeholder="Enter your email"
      />
      <button onClick={handleEmailSubscribe}>
        Continue with Email
      </button>

      {showLogin && (
        <GridSubscriberLogin
          email={userEmail}
          onSuccess={(identity) => {
            console.log('Logged in with email:', identity);
            // Proceed with subscription creation
          }}
        />
      )}
    </div>
  );
}
```

### Managing Your Subscriptions

```typescript
import { useSubscription } from '@ouroc/sdk';

function MySubscriptions() {
  const {
    getUserSubscriptions,
    pauseSubscription,
    cancelSubscription,
    resumeSubscription
  } = useSubscription();
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const userSubs = await getUserSubscriptions(wallet.publicKey.toString());
      setSubscriptions(userSubs);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    }
  };

  const handlePause = async (subscriptionId) => {
    await pauseSubscription(subscriptionId);
    loadSubscriptions(); // Refresh list
  };

  const handleCancel = async (subscriptionId) => {
    if (confirm('Are you sure you want to cancel this subscription?')) {
      await cancelSubscription(subscriptionId);
      loadSubscriptions(); // Refresh list
    }
  };

  return (
    <div>
      <h2>My Subscriptions</h2>
      {subscriptions.map(sub => (
        <div key={sub.id} className="subscription-card">
          <h3>{sub.merchant_name}</h3>
          <p>Amount: {sub.amount / 1_000000} USDC</p>
          <p>Status: {sub.status}</p>
          <p>Next payment: {new Date(sub.next_payment * 1000).toLocaleDateString()}</p>

          <div className="actions">
            {sub.status === 'active' && (
              <button onClick={() => handlePause(sub.id)}>
                Pause
              </button>
            )}
            {sub.status === 'paused' && (
              <button onClick={() => resumeSubscription(sub.id)}>
                Resume
              </button>
            )}
            <button onClick={() => handleCancel(sub.id)} className="danger">
              Cancel
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Setting Payment Reminders

```typescript
import { useNotifications } from '@ouroc/sdk';

function NotificationSettings() {
  const { updateNotificationSettings } = useNotifications();

  const handleSetReminders = async (subscriptionId) => {
    await updateNotificationSettings({
      subscription_id: subscriptionId,
      reminder_days_before: [3, 1], // Remind 3 days and 1 day before
      email_notifications: true,
      push_notifications: true
    });
  };

  return (
    <button onClick={() => handleSetReminders('sub_123')}>
      Set Payment Reminders
    </button>
  );
}
```

---

## For Merchants

### Accepting Subscriptions

#### Basic Merchant Setup

```typescript
import { OuroCClient } from '@ouroc/sdk';

function MerchantDashboard() {
  const [subscriptions, setSubscriptions] = useState([]);

  const client = new OuroCClient({
    wallet: merchantWallet,
    endpoint: 'https://api.devnet.solana.com'
  });

  const loadMerchantSubscriptions = async () => {
    try {
      const merchantSubs = await client.getMerchantSubscriptions(
        merchantWallet.publicKey.toString()
      );
      setSubscriptions(merchantSubs);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    }
  };

  return (
    <div>
      <h2>Merchant Dashboard</h2>
      <p>Total Active Subscriptions: {subscriptions.length}</p>
      <p>Monthly Revenue: ${
        subscriptions
          .filter(s => s.status === 'active')
          .reduce((total, s) => total + (s.amount / 1_000000), 0)
      }</p>
    </div>
  );
}
```

#### Creating Subscription Plans

```typescript
const subscriptionPlans = [
  {
    id: 'basic',
    name: 'Basic Plan',
    amount: 9_000000, // $9 USDC
    interval: 2592000, // 30 days
    features: ['Basic support', 'Access to core features']
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    amount: 29_000000, // $29 USDC
    interval: 2592000, // 30 days
    features: ['Priority support', 'Advanced features', 'API access']
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    amount: 99_000000, // $99 USDC
    interval: 2592000, // 30 days
    features: ['Dedicated support', 'Custom integrations', 'SLA guarantee']
  }
];

function SubscriptionPlans() {
  const { createSubscription } = useSubscription();

  const handleSubscribe = async (plan) => {
    await createSubscription({
      solana_payer: wallet.publicKey.toString(),
      solana_receiver: "MERCHANT_WALLET_ADDRESS",
      amount: plan.amount,
      interval_seconds: plan.interval,
      token: "USDC"
    });
  };

  return (
    <div>
      {subscriptionPlans.map(plan => (
        <div key={plan.id} className="plan-card">
          <h3>{plan.name}</h3>
          <p>${plan.amount / 1_000000}/month</p>
          <ul>
            {plan.features.map(feature => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <button onClick={() => handleSubscribe(plan)}>
            Subscribe
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Setting Up Multisig Treasury (Grid)

```typescript
import { MerchantMultisigFlow } from '@ouroc/sdk/grid';

function MultisigSetup() {
  const handleSetupMultisig = async () => {
    // 2-of-3 multisig for treasury management
    const multisigConfig = {
      threshold: 2,
      signers: [
        "CEO_WALLET_PUBKEY",
        "CTO_WALLET_PUBKEY",
        "OPERATIONS_WALLET_PUBKEY"
      ]
    };

    const result = await MerchantMultisigFlow.create(multisigConfig);
    console.log('Multisig created:', result.multisig_address);
  };

  return (
    <button onClick={handleSetupMultisig}>
      Setup Multisig Treasury
    </button>
  );
}
```

### KYC Compliance (Grid)

```typescript
import { MerchantKYCFlow } from '@ouroc/sdk/grid';

function KYCVerification() {
  const [tier, setTier] = useState('individual');

  const handleKYC = async () => {
    const kycConfig = {
      tier: tier, // 'individual' or 'business'
      documents: {
        identity_proof: 'base64_encoded_document',
        address_proof: 'base64_encoded_document',
        // Additional documents for business tier
        business_registration: tier === 'business' ? 'base64_doc' : undefined
      }
    };

    try {
      const result = await MerchantKYCFlow.submit(kycConfig);
      console.log('KYC submitted:', result.application_id);
    } catch (error) {
      console.error('KYC failed:', error);
    }
  };

  return (
    <div>
      <select value={tier} onChange={(e) => setTier(e.target.value)}>
        <option value="individual">Individual Tier</option>
        <option value="business">Business Tier</option>
      </select>
      <button onClick={handleKYC}>
        Complete KYC Verification
      </button>
    </div>
  );
}
```

### Fiat Off-Ramps (Grid)

```typescript
import { MerchantOffRampFlow } from '@ouroc/sdk/grid';

function FiatWithdrawal() {
  const handleWithdrawFiat = async () => {
    const withdrawalRequest = {
      amount_usdc: 1000_000000, // 1000 USDC
      currency: 'USD',
      bank_account: {
        account_number: '****1234',
        routing_number: '****5678',
        account_holder: 'Merchant Name'
      }
    };

    try {
      const result = await MerchantOffRampFlow.withdraw(withdrawalRequest);
      console.log('Withdrawal initiated:', result.transaction_id);
    } catch (error) {
      console.error('Withdrawal failed:', error);
    }
  };

  return (
    <button onClick={handleWithdrawFiat}>
      Withdraw to Bank Account
    </button>
  );
}
```

---

## For AI Agents

### Setting Up Agent Payments

#### Creating Agent Identity

```typescript
import { Keypair } from '@solana/web3.js';
import { OuroCClient } from '@ouroc/sdk';

class PaymentAgent {
  constructor(ownerWallet) {
    // Generate unique keypair for this agent
    this.agentKeypair = Keypair.generate();
    this.ownerWallet = ownerWallet;
    this.client = new OuroCClient({
      wallet: ownerWallet,
      endpoint: 'https://api.devnet.solana.com'
    });

    console.log(`Agent ID: ${this.agentKeypair.publicKey.toBase58()}`);
  }

  async setupSubscription(merchantAddress, amountPerCall, maxMonthlySpend) {
    const subscription = await this.client.createSubscription({
      solana_payer: this.agentKeypair.publicKey.toString(),
      solana_receiver: merchantAddress,
      amount: amountPerCall, // Cost per API call
      interval_seconds: 3600, // 1 hour for rate limiting
      token: "USDC",
      agent_metadata: {
        agent_id: `agent-${this.agentKeypair.publicKey.toBase58().slice(0, 8)}`,
        owner_address: this.ownerWallet.publicKey.toString(),
        max_payment_per_interval: maxMonthlySpend / 720, // Max per hour
        purpose: "API service payments"
      }
    });

    return subscription;
  }
}
```

#### Making Autonomous Payments

```typescript
class AutonomousAgent extends PaymentAgent {
  async payForAPICall(apiEndpoint, requestData) {
    try {
      // 1. Check if payment is needed
      const needsPayment = await this.checkPaymentStatus();
      if (!needsPayment) {
        return await this.makeAPICall(apiEndpoint, requestData);
      }

      // 2. Execute payment via ICP timer
      const paymentResult = await this.client.executeScheduledPayment(
        this.subscriptionId
      );

      if (paymentResult.success) {
        // 3. Make the API call
        return await this.makeAPICall(apiEndpoint, requestData);
      } else {
        throw new Error(`Payment failed: ${paymentResult.error}`);
      }
    } catch (error) {
      console.error('Autonomous payment failed:', error);
      throw error;
    }
  }

  async checkPaymentStatus() {
    const subscription = await this.client.getSubscription(this.subscriptionId);
    const lastPayment = subscription.last_payment_at;
    const now = Math.floor(Date.now() / 1000);

    // Check if payment is due (1 hour interval)
    return (now - lastPayment) >= 3600;
  }

  async makeAPICall(endpoint, data) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    return response.json();
  }
}
```

#### Agent Management Dashboard

```typescript
function AgentDashboard() {
  const [agents, setAgents] = useState([]);

  const createNewAgent = async () => {
    const agent = new AutonomousAgent(wallet);
    await agent.setupSubscription(
      "API_SERVICE_MERCHANT",
      50000, // $0.05 per API call
      10_000000 // Max $10 per month
    );

    setAgents([...agents, agent]);
  };

  const getAgentSpending = async (agent) => {
    const subscription = await agent.client.getSubscription(agent.subscriptionId);
    return {
      total_spent: subscription.total_paid,
      remaining_budget: subscription.max_payment_per_interval,
      next_payment: subscription.next_payment_at
    };
  };

  return (
    <div>
      <h2>AI Agent Management</h2>
      <button onClick={createNewAgent}>Create New Agent</button>

      {agents.map((agent, index) => (
        <div key={index} className="agent-card">
          <h3>Agent {agent.agentKeypair.publicKey.toBase58().slice(0, 8)}</h3>
          <p>Subscription: {agent.subscriptionId}</p>
          <AgentSpendingInfo agent={agent} />
        </div>
      ))}
    </div>
  );
}
```

---

## Enterprise Features

### IP Protection & Licensing

#### Developer Registration

```typescript
// Register as a developer to get API keys
const response = await fetch('https://api.ouroc.com/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Your Company',
    email: 'developer@company.com',
    tier: 'Enterprise', // Community, Beta, or Enterprise
    project_description: 'Building SaaS platform with recurring payments'
  })
});

const { api_key, developer_id } = await response.json();
```

#### Using Secure Client

```typescript
import { SecureOuroCClient } from '@ouroc/sdk/core/SecureOuroCClient';

const secureClient = new SecureOuroCClient({
  wallet: merchantWallet,
  apiKey: 'ouro_1234567890', // Your API key
  endpoint: 'https://api.devnet.solana.com'
});

// Automatic license validation and rate limiting
await secureClient.createSubscription({
  merchant: 'MERCHANT_WALLET',
  amount: 10_000000,
  interval: 2592000,
  token: 'USDC'
});

// Track usage
const usageStats = await secureClient.getUsageStats();
console.log('API calls remaining:', usageStats.rate_limit_remaining);
```

### Privacy Features

#### Creating Private Subscriptions

```typescript
import * as Enterprise from '@ouroc/sdk/enterprise';

// Derive encryption key from wallet
const encryptionKey = await Enterprise.deriveEncryptionKey(
  wallet.publicKey,
  (msg) => wallet.signMessage(msg)
);

// Create subscription with encrypted metadata
const subscription = await Enterprise.createPrivateSubscription(client, {
  merchant: 'MERCHANT_WALLET',
  amount: 10_000000,
  interval: 2592000,
  token: 'USDC',
  metadata: {
    name: 'Premium Plan',
    userIdentifier: 'customer@example.com',
    merchantNotes: 'VIP customer - 20% discount',
    tags: ['premium', 'saas'],
    customFields: {
      plan: 'premium',
      region: 'US'
    }
  },
  encryptionKey
});
```

#### GDPR Compliance

```typescript
// Right to Access - Export user data
async function exportUserData(userAddress) {
  const subscriptions = await client.getUserSubscriptions(userAddress);
  const exportData = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    subscriptions: await Promise.all(
      subscriptions.map(async (sub) => ({
        id: sub.id,
        merchant: sub.merchant,
        amount: sub.amount,
        metadata: await Enterprise.getPrivateMetadata(client, sub.id, encryptionKey)
      }))
    )
  };

  // Download as JSON
  const blob = new Blob([JSON.stringify(exportData, null, 2)]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ouroc-export-${Date.now()}.json`;
  a.click();
}

// Right to Erasure - Delete encrypted metadata
await Enterprise.deletePrivateMetadata(client, subscriptionId);
```

---

## Developer Guide

### React Hooks Reference

#### useSubscription

```typescript
const {
  createSubscription,
  getUserSubscriptions,
  getMerchantSubscriptions,
  pauseSubscription,
  cancelSubscription,
  resumeSubscription,
  isLoading,
  error
} = useSubscription();
```

#### useNotifications

```typescript
const {
  updateNotificationSettings,
  getNotificationHistory,
  subscribeToPayments
} = useNotifications();
```

#### useBalance

```typescript
const {
  balance,
  refreshBalance,
  isLoading
} = useBalance(walletAddress);
```

### SDK Methods Reference

#### Core Methods

```typescript
// Create subscription
await client.createSubscription({
  solana_payer: string;
  solana_receiver: string;
  amount: number; // USDC smallest unit
  interval_seconds: number;
  token: string;
  agent_metadata?: AgentMetadata;
  api_key?: string; // For license validation
});

// Get subscription details
await client.getSubscription(subscriptionId: string);

// Get user subscriptions
await client.getUserSubscriptions(userAddress: string);

// Get merchant subscriptions
await client.getMerchantSubscriptions(merchantAddress: string);

// Pause subscription
await client.pauseSubscription(subscriptionId: string);

// Cancel subscription
await client.cancelSubscription(subscriptionId: string);

// Resume subscription
await client.resumeSubscription(subscriptionId: string);
```

#### Grid Integration

```typescript
import {
  GridSubscriberLogin,
  MerchantMultisigFlow,
  MerchantKYCFlow,
  MerchantOffRampFlow
} from '@ouroc/sdk/grid';

// Email login
<GridSubscriberLogin
  email="user@example.com"
  onSuccess={(identity) => console.log('Logged in:', identity)}
  onError={(error) => console.error('Login failed:', error)}
/>

// Merchant flows
const multisig = await MerchantMultisigFlow.create(config);
const kyc = await MerchantKYCFlow.submit(kycData);
const withdrawal = await MerchantOffRampFlow.withdraw(withdrawalData);
```

### Error Handling

```typescript
import { OuroCError, OuroCErrorCode } from '@ouroc/sdk';

try {
  await client.createSubscription(subscriptionData);
} catch (error) {
  if (error instanceof OuroCError) {
    switch (error.code) {
      case OuroCErrorCode.INSUFFICIENT_BALANCE:
        console.error('Insufficient balance for subscription');
        break;
      case OuroCErrorCode.INVALID_AMOUNT:
        console.error('Invalid subscription amount');
        break;
      case OuroCErrorCode.NETWORK_ERROR:
        console.error('Network connection failed');
        break;
      case OuroCErrorCode.LICENSE_EXPIRED:
        console.error('API license has expired');
        break;
      default:
        console.error('Unknown error:', error.message);
    }
  }
}
```

### Configuration Options

```typescript
const client = new OuroCClient({
  wallet: wallet,
  endpoint: 'https://api.devnet.solana.com', // or mainnet-beta
  commitment: 'confirmed',
  preflightCommitment: 'confirmed',
  apiKey: 'optional-api-key-for-licensing',
  retryAttempts: 3,
  retryDelay: 1000
});
```

---

## Security Best Practices

### ✅ DO

1. **Use HTTPS** for all API calls
2. **Validate inputs** before creating subscriptions
3. **Implement rate limiting** on your backend
4. **Use hardware wallets** for high-value operations
5. **Enable notifications** for payment events
6. **Monitor subscription status** regularly
7. **Implement proper error handling**
8. **Use enterprise encryption** for sensitive metadata

### ❌ DON'T

1. **Never store private keys** in frontend code
2. **Never hardcode API keys** in source code
3. **Never skip signature verification**
4. **Never ignore error messages**
5. **Never use deprecated API methods**
6. **Never expose sensitive data** in logs

### Secure Implementation Example

```typescript
// Secure subscription creation with validation
async function createSecureSubscription(params) {
  // 1. Validate inputs
  if (!validateSubscriptionParams(params)) {
    throw new Error('Invalid subscription parameters');
  }

  // 2. Check user balance
  const balance = await client.getBalance(params.payer);
  if (balance < params.amount * 2) { // Require 2x buffer
    throw new Error('Insufficient balance');
  }

  // 3. Create subscription with error handling
  try {
    const subscription = await client.createSubscription(params);

    // 4. Log success (without sensitive data)
    console.log('Subscription created:', {
      id: subscription.id,
      amount: params.amount,
      interval: params.interval
    });

    return subscription;
  } catch (error) {
    // 5. Handle errors appropriately
    console.error('Subscription creation failed:', error.code);
    throw error;
  }
}

function validateSubscriptionParams(params) {
  return (
    params.solana_payer &&
    params.solana_receiver &&
    params.amount > 0 &&
    params.interval_seconds >= 3600 && // Min 1 hour
    params.token &&
    validatePublicKey(params.solana_payer) &&
    validatePublicKey(params.solana_receiver)
  );
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Wallet not connected"

**Solution**: Ensure wallet is properly connected before creating subscriptions

```typescript
if (!wallet.connected) {
  await wallet.connect();
}
```

#### 2. "Insufficient balance"

**Solution**: Check USDC balance and ensure enough for at least 2 payments

```typescript
const balance = await client.getBalance(wallet.publicKey.toString());
const requiredBalance = amount * 2; // 2x buffer

if (balance < requiredBalance) {
  alert(`Insufficient balance. Need at least ${requiredBalance / 1_000000} USDC`);
  return;
}
```

#### 3. "Transaction failed"

**Solution**: Check network status and retry

```typescript
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const connection = new Connection(endpoint);
const slot = await connection.getSlot();
const blockhash = await connection.getLatestBlockhash();

console.log('Network status:', { slot, blockhash });
```

#### 4. "License validation failed"

**Solution**: Check API key and tier limits

```typescript
const usageStats = await secureClient.getUsageStats();
console.log('License status:', usageStats);

if (usageStats.rate_limit_remaining === 0) {
  console.error('Rate limit exceeded. Upgrade your license tier.');
}
```

#### 5. "Encryption not supported"

**Solution**: Ensure using HTTPS or localhost

```typescript
import * as Enterprise from '@ouroc/sdk/enterprise';

if (!Enterprise.isEncryptionSupported()) {
  console.error('Enterprise features require HTTPS or localhost');
}
```

### Debug Mode

```typescript
const client = new OuroCClient({
  wallet,
  endpoint: 'https://api.devnet.solana.com',
  debug: true // Enable debug logging
});
```

### Getting Help

1. **Check console logs** for detailed error messages
2. **Verify network connectivity** to Solana and ICP
3. **Confirm wallet permissions** for the application
4. **Review rate limits** if using licensed features
5. **Join community Discord** for support: https://discord.gg/ouroc

---

## FAQ

### General Questions

**Q: What blockchains does OuroC use?**
A: OuroC uses Solana for payment execution and ICP (Internet Computer) for autonomous scheduling.

**Q: Do I need a crypto wallet to use OuroC?**
A: Not necessarily! With Grid integration, users can sign up with email and use passkey authentication.

**Q: How much does it cost to use OuroC?**
A: Users only pay Solana transaction fees and a small platform fee (typically 1-2%). No additional subscription fees.

**Q: Is OuroC available on mainnet?**
A: OuroC is production-ready and can be deployed on Solana mainnet-beta.

### For Subscribers

**Q: Can I pause or cancel subscriptions?**
A: Yes, subscribers have full control and can pause or cancel anytime directly on-chain.

**Q: How do I know when a payment is coming?**
A: OuroC supports configurable payment reminders via email and push notifications.

**Q: What happens if my wallet runs out of funds?**
A: Payments will fail and the subscription will be paused. You'll receive notifications to top up your wallet.

**Q: Are my subscription details private?**
A: Basic subscriptions store data publicly on Solana. For privacy, use Enterprise features with encrypted metadata.

### For Merchants

**Q: How do I receive payments?**
A: Payments go directly to your merchant wallet. You can also use multisig treasury with Grid.

**Q: Can I accept tokens other than USDC?**
A: Yes! OuroC supports any SPL token with automatic conversion to USDC via Jupiter DEX.

**Q: Do I need to handle customer support manually?**
A: OuroC provides automated payment processing, but you handle customer service for your product.

**Q: How do I handle refunds?**
A: Refunds are handled manually by merchants outside the protocol (direct wallet transfers).

### For Developers

**Q: What programming languages are supported?**
A: OuroC provides a TypeScript SDK for JavaScript/TypeScript applications. More languages coming soon.

**Q: Do I need a license to use OuroC?**
A: Basic usage is open source (MIT license). Enterprise features and IP protection require developer licensing.

**Q: How does rate limiting work?**
A: Rate limits are based on your license tier: Community (10/hr), Beta (50/hr), Enterprise (1000/hr).

**Q: Can I use OuroC in my mobile app?**
A: Yes! The SDK works with React Native and can be integrated into mobile applications.

### Technical Questions

**Q: How secure is the ICP timer?**
A: The ICP timer uses Threshold Ed25519 signing with no single point of failure.

**Q: What happens if Solana network is congested?**
A: The ICP timer will retry payments with exponential backoff until successful.

**Q: Can I run my own ICP timer canister?**
A: Yes, the timer canister is open source and can be deployed independently.

**Q: How does GDPR compliance work?**
A: Enterprise features provide encrypted metadata storage with right to erasure and data portability.

---

## Support Resources

### Documentation
- **Main Docs**: https://docs.ouroc.com
- **API Reference**: https://docs.ouroc.com/api
- **Enterprise Guide**: See [ENTERPRISE_MANUAL.md](./ENTERPRISE_MANUAL.md)
- **Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md)

### Community
- **Discord**: https://discord.gg/ouroc
- **GitHub**: https://github.com/ouroc/sdk
- **Twitter**: @ouroc
- **Blog**: https://blog.ouroc.com

### Enterprise Support
- **Email**: enterprise@ouroc.com
- **Sales**: sales@ouroc.com
- **Support**: support@ouroc.com

### Additional Resources
- **Solana Documentation**: https://docs.solana.com
- **Internet Computer Docs**: https://internetcomputer.org/docs
- **Grid by Squads**: https://grid.squads.xyz

---

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

Enterprise features and IP protection are subject to the Business Source License (BSL) with conversion to MIT after 2 years.

---

**Built with ❤️ by the OuroC Team**

*Decentralizing subscriptions, one payment at a time.*