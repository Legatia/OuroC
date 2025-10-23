# X.402 Integration Guide for OuroC SDK

**Version**: 1.0
**Last Updated**: 2025-10-22
**Focus**: Secure Agent Delegation & Authorization

---

## What is X.402?

X.402 is an **open delegation standard** that enables AI agents to securely interact with web services and SDKs on behalf of users. Think of it as **"OAuth for AI agents"** - providing secure, verifiable, and time-bounded access without handling private keys.

## Core Concept: Capability Tokens

Instead of giving agents your private keys, users create **signed capability tokens** that grant specific permissions:

```typescript
{
  "protocol": "x402-v1",
  "issuer": "USER_WALLET_ADDRESS",        // Who authorized this
  "agent": "openai-gpt-4-agent",          // Which agent
  "permissions": [
    {
      "function": "createSubscription",
      "maxAmount": "100000000",           // Max $100
      "allowedIntervals": ["monthly"],     // Only monthly subs
      "maxUses": 10                       // Max 10 creations
    }
  ],
  "expiresAt": 1735689600,               // Unix timestamp
  "signature": "USER_SIGNATURE",         // Cryptographic proof
  "nonce": "unique-random-string"         // Prevent replay
}
```

## Key Benefits

### 🔒 **Security**
- ✅ **No Private Keys**: Agents never handle wallet credentials
- ✅ **Cryptographic Proof**: Every action verifiably authorized
- ✅ **Time-Bounded**: Tokens expire automatically
- ✅ **Permission Limits**: Fine-grained access control

### 🤖 **Agent Native**
- ✅ **Standardized Interface**: Any X.402 agent can use OuroC
- ✅ **Self-Service**: Agents discover capabilities automatically
- ✅ **Zero Integration**: Works with existing agent frameworks
- ✅ **Composable**: Combine multiple SDK capabilities

### 👥 **User Control**
- ✅ **Explicit Consent**: Users delegate specific permissions only
- ✅ **Revocable**: Can invalidate tokens anytime
- ✅ **Transparent**: Full audit trail of all actions
- ✅ **Safe**: Can't exceed defined limits

## Quick Start for Developers

### 1. Enable X.402 in Your App

```typescript
import { X402OuroCClient, X402Validator } from '@ouroc/sdk/x402'

// Create X.402-enabled client
const client = new X402OuroCClient({
  canisterId: '7tbxr-naaaa-aaaao-qkrca-cai',
  network: 'devnet'
})
```

### 2. User Creates Delegation Token

```typescript
// User creates capability token for their agent
const capabilityToken = await createCapabilityToken({
  issuer: userWallet.publicKey.toBase58(),
  agent: 'openai-assistant',
  permissions: [
    {
      function: 'createSubscription',
      constraints: {
        maxAmount: toMicroUnits(50), // Max $50
        allowedIntervals: ['monthly']
      }
    },
    {
      function: 'cancelSubscription',
      maxUses: 5 // Can cancel max 5 subscriptions
    }
  ],
  expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
  nonce: generateNonce()
})

// User signs the token
const signature = await userWallet.signMessage(JSON.stringify(capabilityToken))
capabilityToken.signature = signature
```

### 3. Agent Uses Delegated Access

```typescript
// AI agent receives capability token
const agentClient = new X402OuroCClient()

// Agent creates subscription on user's behalf
const subscriptionId = await agentClient.createSubscriptionWithX402(
  {
    subscription_id: 'user-subscription-123',
    solana_contract_address: 'PROGRAM_ID',
    subscriber_address: 'USER_WALLET',
    merchant_address: 'MERCHANT_WALLET',
    amount: toMicroUnits(29), // $29
    interval_seconds: 2592000, // 30 days
    api_key: 'API_KEY'
  },
  capabilityToken
)

console.log('✅ Subscription created:', subscriptionId)
```

## Supported Functions

All core OuroC functions support X.402 delegation:

### Subscription Management
```typescript
// Create subscription with delegation
await client.createSubscriptionWithX402(request, token)

// Cancel subscription with delegation
await client.cancelSubscriptionWithX402(subscriptionId, token)

// Pause subscription with delegation
await client.pauseSubscriptionWithX402(subscriptionId, token)

// Resume subscription with delegation
await client.resumeSubscriptionWithX402(subscriptionId, token)
```

### Agent Management
```typescript
// Register agent (user only)
await client.registerAgent({
  agent_wallet: 'AGENT_WALLET',
  max_spending_per_interval: toMicroUnits(100),
  metadata: { agent_type: 'autonomous', description: 'API billing' }
})

// List user's agents
const agents = await client.listMyAgents()

// Pause agent (emergency)
await client.pauseAgent('agent-id')
```

## Permission Constraints

X.402 allows fine-grained control over what agents can do:

### Financial Limits
```typescript
{
  function: 'createSubscription',
  constraints: {
    maxAmount: toMicroUnits(100),     // Max $100 total
    maxAmountPerTransaction: toMicroUnits(50), // Max $50 per sub
    allowedIntervals: ['monthly', 'yearly'],
    allowedMerchants: ['trusted-merchant-1', 'trusted-merchant-2']
  }
}
```

### Usage Limits
```typescript
{
  function: 'cancelSubscription',
  maxUses: 10,                           // Max 10 cancellations
  timeWindow: 86400,                    // Per 24 hours
  allowedParams: ['subscription_id'] // Only allow specific params
}
```

### Time Constraints
```typescript
{
  expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
  validFrom: Date.now(),                         // Valid starting now
  validHours: [9, 17],                           // Only business hours
  validDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
}
```

## Agent Discovery

### Metadata Manifest

OuroC publishes a manifest that agents can discover automatically:

```typescript
// Available at: https://api.ouroc.network/manifest
const OuroCManifest = {
  protocol: 'x402-v1',
  sdk: '@ouroc/sdk',
  version: '1.0.0',
  functions: [
    {
      name: 'createSubscription',
      description: 'Create a recurring subscription payment',
      parameters: [
        { name: 'subscription_id', type: 'string', required: true },
        { name: 'amount', type: 'bigint', required: true },
        { name: 'interval_seconds', type: 'bigint', required: true }
      ],
      examples: [
        {
          description: 'Create $29 monthly SaaS subscription',
          params: {
            subscription_id: 'saas-basic-123',
            amount: '29000000',
            interval_seconds: '2592000'
          }
        }
      ]
    }
  ],
  authentication: {
    type: 'x402-delegation',
    requiredScopes: ['subscriptions']
  }
}
```

### Agent Framework Integration

```typescript
// LangChain integration example
import { OuroCTool } from '@ouroc/sdk/langchain'

const ourocTool = new OuroCTool({
  apiKey: 'user-delegation-token'
})

// Agent automatically discovers and uses OuroC functions
const agent = new ChatOpenAI({
  tools: [ourocTool],
  model: 'gpt-4'
})
```

## Security Best Practices

### 1. Token Validation
```typescript
// Always validate tokens before use
const validator = new X402Validator()
const result = validator.validateToken(token, requestedAction)

if (!result.valid) {
  throw new Error(`Invalid delegation: ${result.reason}`)
}
```

### 2. Permission Principle
```typescript
// Grant minimum necessary permissions
{
  function: 'createSubscription',
  constraints: {
    maxAmount: toMicroUnits(29),  // Exact amount needed
    allowedMerchants: ['only-this-merchant'], // Single merchant
    maxUses: 1 // Single use if one-time action
  }
}
```

### 3. Time Bounding
```typescript
// Use short expiration times for sensitive actions
{
  expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour only
  maxUses: 1,                                // Single use
  function: 'cancelSubscription'              // Sensitive action
}
```

### 4. Audit Logging
```typescript
// X.402 automatically logs all delegated actions
const auditLog = client.getDelegationHistory({
  agent: 'openai-assistant',
  from: Date.now() - (7 * 24 * 60 * 60 * 1000), // Last 7 days
  function: 'createSubscription'
})

console.log('Agent activity:', auditLog)
```

## Error Handling

### X.402 Specific Errors
```typescript
try {
  await client.createSubscriptionWithX402(request, token)
} catch (error) {
  if (error instanceof X402Error) {
    switch (error.code) {
      case 'TOKEN_EXPIRED':
        console.log('Delegation token expired')
        break
      case 'INSUFFICIENT_PERMISSIONS':
        console.log('Token lacks required permissions')
        break
      case 'CONSTRAINT_VIOLATION':
        console.log('Action violates token constraints')
        break
      case 'INVALID_SIGNATURE':
        console.log('Token signature is invalid')
        break
    }
  }
}
```

## Testing X.402 Integration

### 1. Mock Token Generation
```typescript
// For testing: generate test capability tokens
const testToken = createTestCapabilityToken({
  issuer: 'test-wallet',
  agent: 'test-agent',
  permissions: [{ function: 'createSubscription', maxUses: 5 }],
  expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
})
```

### 2. Permission Testing
```typescript
// Test various permission scenarios
const testCases = [
  { action: 'createSubscription', expected: 'allowed' },
  { action: 'cancelSubscription', expected: 'denied' },
  { action: 'deleteAllSubscriptions', expected: 'denied' }
]

testCases.forEach(test => {
  const result = validator.validateToken(token, test.action)
  assert.equal(result.valid, test.expected === 'allowed')
})
```

## Migration Guide

### From Direct SDK Usage
```typescript
// Before: Direct usage (private keys required)
const client = new OuroCClient()
await client.createSubscription(request) // Requires user wallet

// After: X.402 delegation (no keys needed)
const x402Client = new X402OuroCClient()
await x402Client.createSubscriptionWithX402(request, token) // Uses delegation
```

### Benefits of Migration
- ✅ **Better Security**: No private key exposure
- ✅ **User Control**: Explicit delegation with limits
- ✅ **Agent Ready**: Works with AI agents automatically
- ✅ **Audit Trail**: Complete action logging

## Examples by Use Case

### 1. SaaS Management Bot
```typescript
// Bot manages user's SaaS subscriptions
const capabilityToken = await createToken({
  agent: 'saas-manager-bot',
  permissions: [
    { function: 'createSubscription', maxUses: 5 },
    { function: 'cancelSubscription', maxUses: 5 }
  ],
  expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
})

const bot = new SaaSManagerBot({ token: capabilityToken })
await bot.addSubscription('github-pro', 'user@company.com')
```

### 2. Financial Advisor AI
```typescript
// AI agent manages investment platform subscriptions
const token = await createToken({
  agent: 'financial-advisor-ai',
  permissions: [
    {
      function: 'createSubscription',
      constraints: {
        maxAmount: toMicroUnits(500), // Max $500/month
        allowedMerchants: ['bloomberg-pro', 'reuters-alpha']
      }
    }
  ],
  expiresAt: Date.now() + (90 * 24 * 60 * 60 * 1000) // 90 days
})
```

### 3. Development Team Automation
```typescript
// CI/CD bot manages tool subscriptions
const token = await createToken({
  agent: 'ci-cd-bot',
  permissions: [
    {
      function: 'createSubscription',
      constraints: {
        maxAmount: toMicroUnits(100), // Max $100
        allowedIntervals: ['monthly']
      }
    },
    {
      function: 'cancelSubscription',
      maxUses: 20 // Can clean up old subs
    }
  ],
  expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year
})
```

## Support and Resources

### Documentation
- **X.402 Specification**: https://x402.gitbook.io/x402
- **OuroC SDK Docs**: https://docs.ouroc.network
- **Agent Integration Guide**: See `AGENT_INTEGRATION.md`

### Community
- **Discord**: Join for X.402 discussions
- **GitHub**: Issues and feature requests
- **Examples**: See `/examples/x402/` directory

### Getting Help
- **Validation Errors**: Check token format and permissions
- **Signature Issues**: Verify signing process
- **Constraint Violations**: Review token constraints
- **Expired Tokens**: Refresh user delegation

---

**Ready to make your app AI-agent ready with X.402?** 🚀

Start by adding X.402 support to your existing OuroC integration - it's designed to be a drop-in enhancement that opens your app to the emerging agent economy!