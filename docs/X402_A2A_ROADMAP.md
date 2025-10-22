# OuroC X.402 & A2A Extension Roadmap

**Version**: 1.0
**Last Updated**: 2025-10-15
**Status**: Planning Phase

---

## Executive Summary

This document outlines the integration of **X.402 protocol** (HTTP 402 payment standard) with OuroC's existing **Agent-to-Agent (A2A) payment infrastructure**. The goal is to position OuroC as the premier payment facilitator for autonomous AI agents and API monetization.

### Vision
Make OuroC the **Stripe for AI agents** - enabling seamless, programmable payments for the emerging agent economy.

---

## Current State Analysis

### ✅ What We Have

**A2A Infrastructure (Frontend/SDK)**:
- `AgentMetadata` type in TypeScript SDK
- `SimpleAIAgent` demo class
- A2A demo page at `/a2a-demo`
- Agent metadata attached to subscriptions
- Client-side agent management

**Payment Infrastructure**:
- ICP-Solana integration via Chain Fusion
- Subscription-based payments
- Multi-token support (USDC, USDT, PYUSD, DAI)
- Threshold ECDSA for secure signing
- Admin panel for wallet management

### ❌ Critical Gaps

**On-Chain Verification**:
- ❌ No on-chain agent authorization
- ❌ No spending limit enforcement
- ❌ No agent registration system
- ❌ No agent activity audit trail

**Protocol Standardization**:
- ❌ No X.402 protocol support
- ❌ No HTTP 402 flow implementation
- ❌ No payment proof system
- ❌ No facilitator service

**Security & Control**:
- ❌ No emergency agent shutdown
- ❌ No per-transaction approval (supervised mode)
- ❌ No rate limiting
- ❌ No anomaly detection

---

## X.402 Protocol Overview

### What is X.402?

X.402 is an open payment standard enabling direct, programmatic payments for web services using HTTP 402 status code.

**Key Concepts**:
1. **Pay-per-request**: Services charge per API call
2. **HTTP 402**: Standard "Payment Required" response
3. **Facilitator**: Third party validates and settles payments
4. **Crypto-native**: Uses blockchain for settlement

**Standard Flow**:
```
1. Client → Server: GET /api/service
2. Server → Client: 402 Payment Required (with payment details)
3. Client → Facilitator: Execute payment
4. Facilitator → Server: Payment proof
5. Server → Client: Service response
```

**Perfect for**:
- AI agents calling APIs
- Micropayments
- API monetization
- Machine-to-machine commerce

**Official Docs**: https://x402.gitbook.io/x402

---

## Integration Strategy

### OuroC's Role: Payment Facilitator

OuroC will become the **trusted facilitator** in the X.402 ecosystem:

```
┌─────────────┐                 ┌─────────────┐
│  AI Agent   │                 │  API Service │
│  (Buyer)    │◄───402───────── │  (Seller)    │
└──────┬──────┘                 └──────┬───────┘
       │                               │
       │  Payment via OuroC            │  Verify proof
       │                               │
       ▼                               ▼
┌──────────────────────────────────────────┐
│    OuroC Facilitator (ICP + Solana)      │
│  ✓ Agent authorization                   │
│  ✓ Solana payment execution              │
│  ✓ Payment proof generation              │
│  ✓ Spending limit enforcement            │
└──────────────────────────────────────────┘
```

---

## Implementation Phases

## Phase 1: Critical Security & On-Chain Authorization (Weeks 1-2)

**Priority**: CRITICAL 🚨

### 1.1 Solana Contract Updates

**File**: `solana-contract/ouro_c_subscriptions/programs/ouro_c_subscriptions/src/lib.rs`

**Changes to `Subscription` struct** (line ~1431):
```rust
#[account]
pub struct Subscription {
    // ... existing fields ...

    // A2A Agent Authorization
    pub is_agent_subscription: bool,      // Flag for agent-controlled subs
    pub agent_wallet: Option<Pubkey>,     // Agent's keypair (different from owner)
    pub authorized_owner: Pubkey,         // Human who authorized this agent
    pub max_payment_per_interval: Option<u64>, // Spending limit per interval
    pub agent_id: Option<String>,         // Tracking ID (e.g., "agent-ABC12345")

    // Interval tracking for limits
    pub payments_made_this_interval: u64,
    pub interval_reset_time: i64,
}
```

**New Instructions**:

```rust
// Register an agent
pub fn register_agent(
    ctx: Context<RegisterAgent>,
    agent_wallet: Pubkey,
    max_spending_per_interval: u64,
    agent_metadata: String, // JSON metadata
) -> Result<()> {
    // Create AgentRegistry PDA
    // Store authorization
    // Emit AgentRegistered event
}

// Revoke agent authorization
pub fn revoke_agent(
    ctx: Context<RevokeAgent>,
    agent_wallet: Pubkey,
) -> Result<()> {
    // Only owner can revoke
    // Pause all agent subscriptions
    // Emit AgentRevoked event
}

// Process agent payment with verification
pub fn process_agent_payment(
    ctx: Context<ProcessAgentPayment>,
    // ... params ...
) -> Result<()> {
    // 1. Verify agent is registered
    require!(
        subscription.agent_wallet == Some(*agent_wallet),
        ErrorCode::UnauthorizedAgent
    );

    // 2. Check spending limit
    if subscription.payments_made_this_interval >= subscription.max_payment_per_interval {
        return Err(ErrorCode::SpendingLimitExceeded.into());
    }

    // 3. Reset counter if new interval
    if current_time > subscription.interval_reset_time {
        subscription.payments_made_this_interval = 0;
        subscription.interval_reset_time = current_time + subscription.interval_seconds;
    }

    // 4. Process payment
    // 5. Increment counter
    subscription.payments_made_this_interval += 1;

    // 6. Emit event
    emit!(AgentPaymentProcessed { ... });
}

// Emergency pause agent
pub fn emergency_pause_agent(
    ctx: Context<EmergencyPauseAgent>,
    agent_wallet: Pubkey,
) -> Result<()> {
    // Owner can immediately halt all agent payments
    // Mark agent as paused in registry
}
```

**New Events**:
```rust
#[event]
pub struct AgentRegistered {
    pub agent_id: String,
    pub agent_wallet: Pubkey,
    pub owner: Pubkey,
    pub max_spending: u64,
    pub timestamp: i64,
}

#[event]
pub struct AgentPaymentProcessed {
    pub agent_id: String,
    pub agent_wallet: Pubkey,
    pub owner: Pubkey,
    pub subscription_id: String,
    pub amount: u64,
    pub timestamp: i64,
    pub purpose: String,
}

#[event]
pub struct AgentRevoked {
    pub agent_id: String,
    pub agent_wallet: Pubkey,
    pub reason: String,
    pub timestamp: i64,
}
```

**New Error Codes**:
```rust
#[error_code]
pub enum ErrorCode {
    // ... existing errors ...

    #[msg("Agent not authorized for this subscription")]
    UnauthorizedAgent,

    #[msg("Agent spending limit exceeded for this interval")]
    SpendingLimitExceeded,

    #[msg("Agent has been revoked")]
    AgentRevoked,
}
```

### 1.2 ICP Canister Updates

**File**: `src/timer/main.mo`

**Add Agent Registry**:
```motoko
// Store authorized agents
private stable var stable_agents: [(Principal, AgentInfo)] = [];
private var agents = HashMap.HashMap<Principal, AgentInfo>(0, Principal.equal, Principal.hash);

public type AgentInfo = {
    agent_id: Text;
    owner: Principal;
    solana_wallet: Text;
    max_spending: Nat64;
    status: AgentStatus;
    created_at: Int;
};

public type AgentStatus = {
    #Active;
    #Paused;
    #Revoked;
};
```

**New Functions**:
```motoko
// Register agent (admin or owner only)
public shared({caller}) func register_agent(
    agent_wallet: Text,
    max_spending: Nat64,
    metadata: Text
): async Result.Result<Text, Text> {
    // Verify caller is admin or authorized owner
    // Create agent registration
    // Call Solana contract to register on-chain
    // Return agent_id
}

// Get agent info
public query func get_agent_info(agent_wallet: Text): async Result.Result<AgentInfo, Text> {
    // Return agent details
}

// Emergency pause agent
public shared({caller}) func emergency_pause_agent(agent_id: Text): async Result.Result<(), Text> {
    // Verify caller is owner
    // Pause agent in ICP
    // Call Solana to pause on-chain
}

// List user's agents
public query func list_my_agents(owner: Principal): async [AgentInfo] {
    // Return all agents owned by this principal
}
```

### 1.3 SDK Updates

**File**: `packages/sdk/src/core/types.ts`

**Update types**:
```typescript
export interface AgentMetadata {
  agent_id: string
  owner_address: SolanaAddress
  agent_wallet: SolanaAddress          // NEW: Agent's own wallet
  agent_type: 'autonomous' | 'supervised'
  max_payment_per_interval: bigint
  description?: string
  status: 'active' | 'paused' | 'revoked' // NEW
}

export interface CreateAgentRequest {
  owner_wallet: SolanaAddress          // Human owner
  agent_wallet: SolanaAddress          // Agent's keypair
  max_spending_per_interval: bigint
  metadata: {
    agent_type: 'autonomous' | 'supervised'
    description: string
    capabilities: string[]
  }
}
```

**New SDK methods**:
```typescript
// packages/sdk/src/core/OuroCClient.ts

class OuroCClient {
  // Register new agent
  async registerAgent(request: CreateAgentRequest): Promise<string> {
    // Call ICP canister register_agent
    // Return agent_id
  }

  // Get agent info
  async getAgentInfo(agentWallet: string): Promise<AgentInfo> {
    // Query agent details
  }

  // Emergency pause
  async pauseAgent(agentId: string): Promise<void> {
    // Call emergency_pause_agent
  }

  // List owner's agents
  async listMyAgents(): Promise<AgentInfo[]> {
    // Query all agents for current user
  }
}
```

**Deliverables**:
- ✅ On-chain agent authorization
- ✅ Spending limit enforcement
- ✅ Agent registration system
- ✅ Emergency shutdown capability

---

## Phase 2: X.402 Protocol Implementation (Weeks 3-4)

**Priority**: HIGH 🔥

### 2.1 X.402 Server Middleware Package

**New Package**: `packages/x402-middleware/`

**Structure**:
```
packages/x402-middleware/
├── src/
│   ├── index.ts           # Main middleware export
│   ├── express.ts         # Express.js middleware
│   ├── nextjs.ts          # Next.js middleware
│   ├── types.ts           # TypeScript types
│   └── verifier.ts        # Payment proof verification
├── package.json
├── tsconfig.json
└── README.md
```

**Core Implementation**:

```typescript
// packages/x402-middleware/src/index.ts

import { OuroCClient } from '@ouroc/sdk'

export interface X402Config {
  icpHost: string
  sellerAddress: string
  pricing: PricingFunction | number  // Function or flat rate
  facilitator?: string               // Default: 'ouroc'
}

export type PricingFunction = (req: Request) => number

export class X402Middleware {
  private ouroc: OuroCClient
  private config: X402Config

  constructor(config: X402Config) {
    this.ouroc = new OuroCClient({ icpHost: config.icpHost })
    this.config = config
  }

  // Express middleware
  express() {
    return async (req: any, res: any, next: any) => {
      const proof = req.headers['x-payment-proof']

      if (!proof) {
        return this.return402(req, res)
      }

      const valid = await this.verifyProof(proof, req)

      if (!valid) {
        return res.status(402).json({ error: 'Invalid payment proof' })
      }

      next()
    }
  }

  // Next.js middleware
  nextjs() {
    return async (req: NextRequest) => {
      const proof = req.headers.get('x-payment-proof')

      if (!proof) {
        return new NextResponse(
          JSON.stringify(this.getPaymentInfo(req)),
          { status: 402, headers: this.getPaymentHeaders(req) }
        )
      }

      const valid = await this.verifyProof(proof, req)

      if (!valid) {
        return new NextResponse('Invalid payment proof', { status: 402 })
      }

      return NextResponse.next()
    }
  }

  private return402(req: any, res: any) {
    const paymentInfo = this.getPaymentInfo(req)
    const headers = this.getPaymentHeaders(req)

    return res.status(402)
      .set(headers)
      .json(paymentInfo)
  }

  private getPaymentInfo(req: any) {
    const amount = typeof this.config.pricing === 'function'
      ? this.config.pricing(req)
      : this.config.pricing

    return {
      error: 'Payment Required',
      payment: {
        amount: amount.toString(),
        currency: 'USDC',
        recipient: this.config.sellerAddress,
        facilitator: this.config.facilitator || 'ouroc',
        facilitator_endpoint: process.env.OUROC_FACILITATOR_ENDPOINT ||
                              'https://api.ouroc.network/x402/pay'
      }
    }
  }

  private getPaymentHeaders(req: any) {
    const amount = typeof this.config.pricing === 'function'
      ? this.config.pricing(req)
      : this.config.pricing

    return {
      'X-Payment-Amount': amount.toString(),
      'X-Payment-Currency': 'USDC',
      'X-Payment-Recipient': this.config.sellerAddress,
      'X-Facilitator': this.config.facilitator || 'ouroc',
      'X-Facilitator-Endpoint': process.env.OUROC_FACILITATOR_ENDPOINT ||
                                'https://api.ouroc.network/x402/pay'
    }
  }

  private async verifyProof(proof: string, req: any): Promise<boolean> {
    try {
      const proofData = JSON.parse(proof)

      // Verify with OuroC facilitator
      return await this.ouroc.verifyX402Payment(proofData, {
        recipient: this.config.sellerAddress,
        endpoint: req.url || req.path,
        expectedAmount: typeof this.config.pricing === 'function'
          ? this.config.pricing(req)
          : this.config.pricing
      })
    } catch (error) {
      console.error('Proof verification failed:', error)
      return false
    }
  }
}
```

**Usage Example**:
```typescript
// For API developers
import express from 'express'
import { X402Middleware } from '@ouroc/x402-middleware'

const app = express()

const x402 = new X402Middleware({
  icpHost: 'https://ic0.app',
  sellerAddress: 'YOUR_SOLANA_WALLET',
  pricing: 0.01 // $0.01 per request
})

// Protect endpoint with X.402
app.get('/api/ai-service', x402.express(), (req, res) => {
  res.json({ result: 'AI response here' })
})
```

### 2.2 X.402 Client SDK

**File**: `packages/sdk/src/x402/client.ts`

```typescript
export interface X402ClientConfig {
  icpHost: string
  agentWallet: Keypair
  autoRetry?: boolean    // Auto-retry on 402
  maxRetries?: number    // Max payment retries
}

export class X402Client {
  private ouroc: OuroCClient
  private config: X402ClientConfig

  constructor(config: X402ClientConfig) {
    this.ouroc = new OuroCClient({ icpHost: config.icpHost })
    this.config = config
  }

  // Fetch with automatic X.402 payment
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    let retries = 0
    const maxRetries = this.config.maxRetries || 3

    while (retries < maxRetries) {
      // Make request
      let response = await fetch(url, options)

      // Handle 402
      if (response.status === 402) {
        if (!this.config.autoRetry && retries > 0) {
          throw new Error('Payment required and auto-retry disabled')
        }

        // Get payment info
        const paymentInfo = await response.json()

        // Execute payment via OuroC
        const proof = await this.payWithOuroC(paymentInfo, url)

        // Retry with proof
        response = await fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            'X-Payment-Proof': proof
          }
        })

        if (response.status !== 402) {
          return response
        }
      } else {
        return response
      }

      retries++
    }

    throw new Error('Max payment retries exceeded')
  }

  private async payWithOuroC(paymentInfo: any, url: string): Promise<string> {
    const { payment } = paymentInfo

    // Execute X.402 payment via OuroC facilitator
    const tx = await this.ouroc.executeX402Payment({
      recipient: payment.recipient,
      amount: parseFloat(payment.amount),
      currency: payment.currency,
      agentWallet: this.config.agentWallet.publicKey.toBase58(),
      endpoint: url
    })

    // Generate payment proof
    return JSON.stringify({
      protocol: 'x402-ouroc-v1',
      tx_signature: tx,
      timestamp: Date.now(),
      agent_wallet: this.config.agentWallet.publicKey.toBase58()
    })
  }
}
```

**Usage Example**:
```typescript
// For AI agents
import { X402Client } from '@ouroc/sdk'
import { Keypair } from '@solana/web3.js'

const agentKeypair = Keypair.generate()

const client = new X402Client({
  icpHost: 'https://ic0.app',
  agentWallet: agentKeypair,
  autoRetry: true
})

// Agent automatically pays when it encounters 402
const response = await client.fetch('https://api.example.com/ai-service')
const data = await response.json()
```

### 2.3 ICP X.402 Facilitator Service

**File**: `src/timer/x402_facilitator.mo`

**New Module**:
```motoko
import Result "mo:base/Result";
import Time "mo:base/Time";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Nat64 "mo:base/Nat64";
import HashMap "mo:base/HashMap";

module X402Facilitator {
    public type PaymentRequest = {
        buyer_agent: Principal;
        seller_address: Text;
        amount: Nat64;
        currency: Text;
        endpoint: Text;
        timestamp: Int;
    };

    public type PaymentProof = {
        protocol: Text;           // "x402-ouroc-v1"
        tx_signature: Text;
        timestamp: Int;
        buyer_agent: Principal;
        seller_address: Text;
        amount: Nat64;
        endpoint: Text;
        verified: Bool;
    };

    public class Facilitator(
        authManager: Authorization.AuthorizationManager,
        solanaClient: ?Solana.SolanaClient
    ) {
        // Track payments to prevent double-spending
        private var processedPayments = HashMap.HashMap<Text, PaymentProof>(
            0, Text.equal, Text.hash
        );

        // Execute X.402 payment
        public func executePayment(
            caller: Principal,
            request: PaymentRequest
        ): async Result.Result<PaymentProof, Text> {
            // 1. Verify agent is authorized
            // Check if this principal is a registered agent
            // Or if caller is admin

            // 2. Validate request
            if (request.amount == 0) {
                return #err("Amount must be greater than 0");
            };

            // 3. Check for duplicate payment
            let paymentId = generatePaymentId(request);
            switch (processedPayments.get(paymentId)) {
                case (?_) { return #err("Payment already processed") };
                case null { /* Continue */ };
            };

            // 4. Execute Solana payment
            switch (solanaClient) {
                case (?client) {
                    // Execute payment to seller
                    let tx = await client.call_process_payment(
                        // ... payment params
                    );

                    switch (tx) {
                        case (#ok(hash)) {
                            let proof: PaymentProof = {
                                protocol = "x402-ouroc-v1";
                                tx_signature = hash;
                                timestamp = Time.now();
                                buyer_agent = caller;
                                seller_address = request.seller_address;
                                amount = request.amount;
                                endpoint = request.endpoint;
                                verified = true;
                            };

                            // Cache proof
                            processedPayments.put(paymentId, proof);

                            #ok(proof)
                        };
                        case (#err(error)) {
                            #err("Payment execution failed: " # error)
                        };
                    }
                };
                case null {
                    #err("Solana client not initialized")
                };
            }
        };

        // Verify payment proof
        public func verifyPayment(
            proofJson: Text,
            expectedRecipient: Text,
            expectedAmount: Nat64
        ): async Bool {
            // Parse proof JSON
            // Verify transaction exists on Solana
            // Check amount and recipient match
            // Return true if valid

            // For now, check our cache
            switch (processedPayments.get(proofJson)) {
                case (?proof) {
                    proof.verified and
                    proof.seller_address == expectedRecipient and
                    proof.amount == expectedAmount
                };
                case null { false };
            }
        };

        private func generatePaymentId(request: PaymentRequest): Text {
            // Create unique ID from request params
            Text.concat(
                Principal.toText(request.buyer_agent),
                Text.concat("-", request.endpoint)
            )
        };
    };
}
```

**Integrate into main.mo**:
```motoko
// In main.mo
import X402 "./x402_facilitator";

private var x402Facilitator: ?X402.Facilitator = null;

// Initialize in postupgrade
system func postupgrade() {
    // ... existing code ...

    x402Facilitator := ?X402.Facilitator(authManager, solana_client);
};

// Public endpoint for X.402 payments
public shared({caller}) func execute_x402_payment(
    request: X402.PaymentRequest
): async Result.Result<X402.PaymentProof, Text> {
    switch (x402Facilitator) {
        case (?facilitator) {
            await facilitator.executePayment(caller, request)
        };
        case null {
            #err("X.402 facilitator not initialized")
        };
    }
};

// Verify X.402 payment proof
public query func verify_x402_payment(
    proof: Text,
    recipient: Text,
    amount: Nat64
): async Bool {
    switch (x402Facilitator) {
        case (?facilitator) {
            await facilitator.verifyPayment(proof, recipient, amount)
        };
        case null { false };
    }
};
```

**Deliverables**:
- ✅ X.402 server middleware (npm package)
- ✅ X.402 client SDK
- ✅ ICP facilitator service
- ✅ Payment proof system
- ✅ Demo API with X.402 protection

---

## Phase 3: Enhanced Security & User Experience (Weeks 5-6)

**Priority**: MEDIUM 🔶

### 3.1 Rate Limiting

**Solana Contract**:
```rust
pub struct Subscription {
    // ... existing fields ...

    // Rate limiting
    pub max_payments_per_hour: Option<u32>,
    pub payment_timestamps: Vec<i64>,  // Rolling window (max 100)
}

pub fn process_agent_payment(/* ... */) -> Result<()> {
    // Check rate limit
    if let Some(max_per_hour) = subscription.max_payments_per_hour {
        let one_hour_ago = current_time - 3600;

        // Count payments in last hour
        let recent_payments: Vec<_> = subscription.payment_timestamps
            .iter()
            .filter(|&&ts| ts > one_hour_ago)
            .collect();

        if recent_payments.len() >= max_per_hour as usize {
            return Err(ErrorCode::RateLimitExceeded.into());
        }
    }

    // Add current timestamp
    subscription.payment_timestamps.push(current_time);

    // Keep only last 100 timestamps
    if subscription.payment_timestamps.len() > 100 {
        subscription.payment_timestamps.remove(0);
    }

    // ... process payment
}
```

### 3.2 Payment Batching

**New Solana Instruction**:
```rust
pub fn batch_agent_payments(
    ctx: Context<BatchPayments>,
    payments: Vec<PaymentRequest>,
) -> Result<()> {
    require!(
        payments.len() <= 10,
        ErrorCode::TooManyPayments
    );

    for payment in payments {
        // Process each payment
        // Accumulate fees
        // Emit batched event
    }

    emit!(PaymentsBatched {
        agent_id: ctx.accounts.agent.key(),
        count: payments.len(),
        total_amount: total,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
```

### 3.3 Agent Recovery

**New Instruction**:
```rust
pub fn recover_agent_subscription(
    ctx: Context<RecoverAgent>,
    old_agent_wallet: Pubkey,
    new_agent_wallet: Pubkey,
    owner_signature: [u8; 64],
) -> Result<()> {
    // Verify owner signature
    verify_owner_signature(
        &ctx.accounts.owner.key(),
        &owner_signature,
        &old_agent_wallet,
        &new_agent_wallet
    )?;

    // Transfer subscription to new agent
    let subscription = &mut ctx.accounts.subscription;
    subscription.agent_wallet = Some(new_agent_wallet);

    emit!(AgentRecovered {
        subscription_id: subscription.id.clone(),
        old_agent: old_agent_wallet,
        new_agent: new_agent_wallet,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
```

### 3.4 Admin Panel Updates

**New Page**: `src/admin-panel/src/pages/AgentsPage.jsx`

**Features**:
- List all registered agents
- View agent activity/spending
- Pause/revoke agents
- View agent audit trail
- Emergency shutdown controls

**Deliverables**:
- ✅ Rate limiting
- ✅ Payment batching
- ✅ Agent recovery mechanism
- ✅ Admin panel for agent management

---

## Phase 4: X.402 Demo & Documentation (Week 7)

**Priority**: HIGH 🔥

### 4.1 X.402 Demo Page

**File**: `demo-dapp/pages/x402-demo.tsx`

**Features**:
1. Create AI agent with X.402 support
2. Call protected demo API
3. Show automatic payment flow
4. Display payment proof
5. Real-time activity logs

### 4.2 Demo API Service

**New Package**: `demo-dapp/api/protected-service/`

Simple API that uses X.402 middleware:
```typescript
// demo-dapp/api/protected-service/route.ts
import { X402Middleware } from '@ouroc/x402-middleware'

const x402 = new X402Middleware({
  icpHost: process.env.ICP_HOST,
  sellerAddress: process.env.SELLER_ADDRESS,
  pricing: 0.01
})

export async function GET(request: Request) {
  // Apply X.402 protection
  const paymentCheck = await x402.checkPayment(request)

  if (paymentCheck.status === 402) {
    return new Response(
      JSON.stringify(paymentCheck.body),
      { status: 402, headers: paymentCheck.headers }
    )
  }

  // Service logic
  return Response.json({
    message: 'Hello from protected API',
    timestamp: Date.now(),
    paid: true
  })
}
```

### 4.3 Documentation

**Files to create**:
- `docs/X402_INTEGRATION_GUIDE.md`
- `docs/A2A_DEVELOPER_GUIDE.md`
- `docs/API_REFERENCE.md`
- `packages/x402-middleware/README.md`

**Content**:
- Getting started guide
- API reference
- Code examples
- Best practices
- Security guidelines

**Deliverables**:
- ✅ Working X.402 demo
- ✅ Demo protected API
- ✅ Complete documentation
- ✅ Tutorial videos/GIFs

---

## Technical Specifications

### Message Formats

**X.402 Payment Request** (HTTP 402 Response):
```json
{
  "error": "Payment Required",
  "payment": {
    "amount": "0.01",
    "currency": "USDC",
    "recipient": "7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub",
    "facilitator": "ouroc",
    "facilitator_endpoint": "https://api.ouroc.network/x402/pay"
  }
}
```

**Payment Proof** (in `X-Payment-Proof` header):
```json
{
  "protocol": "x402-ouroc-v1",
  "tx_signature": "5j7s...",
  "timestamp": 1697564800000,
  "agent_wallet": "ABC123...",
  "amount": "0.01",
  "currency": "USDC"
}
```

### API Endpoints

**New ICP Canister Endpoints**:
```
POST /execute_x402_payment
  - Execute payment for X.402 request
  - Returns payment proof

GET /verify_x402_payment
  - Verify payment proof is valid
  - Returns boolean

POST /register_agent
  - Register new agent
  - Returns agent_id

GET /get_agent_info
  - Get agent details
  - Returns AgentInfo

POST /emergency_pause_agent
  - Immediately halt agent
  - Returns success
```

---

## Success Metrics

### Phase 1 Metrics
- ✅ On-chain agent registrations
- ✅ Zero unauthorized agent payments
- ✅ 100% spending limit enforcement
- ✅ Emergency shutdown response time < 1 minute

### Phase 2 Metrics
- ✅ X.402 middleware downloads (npm)
- ✅ Number of APIs protected with X.402
- ✅ Agent payment success rate > 99%
- ✅ Average payment time < 5 seconds

### Phase 3 Metrics
- ✅ Agent recovery usage
- ✅ Batched payment volume
- ✅ Rate limit effectiveness
- ✅ Admin panel usage

### Phase 4 Metrics
- ✅ Demo completion rate
- ✅ Documentation views
- ✅ Developer signups
- ✅ Early adopter feedback

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Solana contract upgrade complexity | High | Thorough testing, staged rollout |
| X.402 proof verification attacks | High | Multi-layer verification, rate limiting |
| Agent key compromise | Medium | Quick revocation, spending limits |
| Cross-chain state sync issues | Medium | Retry logic, monitoring |

### Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Low X.402 adoption | High | Strong docs, demos, developer outreach |
| Competing facilitators | Medium | Best UX, lowest fees, ICP integration |
| Regulatory uncertainty | Medium | Monitor regulations, KYC-ready architecture |

---

## Dependencies

### External Dependencies
- Solana (blockchain)
- Internet Computer (ICP)
- X.402 standard (emerging)

### Internal Dependencies
- Existing OuroC subscription infrastructure
- Solana Chain Fusion RPC
- Threshold ECDSA signing
- Admin panel

---

## Team & Resources

### Development Team (Recommended)
- 1 Solana/Rust developer (contract work)
- 1 Motoko developer (ICP canister)
- 1 TypeScript developer (SDK/middleware)
- 1 Frontend developer (demo + admin panel)

### Timeline
- **Phase 1**: 2 weeks (critical security)
- **Phase 2**: 2 weeks (X.402 core)
- **Phase 3**: 2 weeks (enhancements)
- **Phase 4**: 1 week (demo + docs)
- **Total**: 7 weeks

### Budget Considerations
- Solana transaction fees (devnet = free, mainnet = low)
- ICP cycles (estimate: $50-100/month)
- Development time
- Marketing/outreach

---

## Post-Launch Strategy

### Developer Outreach
1. Publish to npm (`@ouroc/x402-middleware`)
2. Create developer Discord/Telegram
3. Hackathon sponsorships
4. Integration partnerships

### Ecosystem Building
1. Partner with AI agent frameworks (LangChain, AutoGPT, etc.)
2. Integrate with API marketplaces
3. Build reference implementations
4. Create agent marketplace

### Marketing
1. Blog posts explaining X.402 + OuroC
2. Video tutorials
3. Twitter/X campaign
4. Conference talks

---

## Future Enhancements (Post Phase 4)

### Phase 5: Advanced Features
- Multi-signature agent authorization
- Cross-chain agent identity (DIDs)
- Automated dispute resolution
- Reputation system
- Agent capability scoping

### Phase 6: Ecosystem Tools
- Agent marketplace
- Payment analytics dashboard
- Anomaly detection system
- Developer console

### Phase 7: Enterprise Features
- White-label X.402 facilitator
- SLA guarantees
- Compliance tools (KYC/AML)
- Enterprise support

---

## Conclusion

Integrating X.402 with OuroC's A2A infrastructure positions us to become the **dominant payment facilitator for autonomous AI agents**. By combining:

1. **X.402 standard** - Industry-standard protocol
2. **On-chain authorization** - Secure, verifiable agent control
3. **ICP + Solana** - Best of both chains
4. **Developer-first UX** - Easy integration, great docs

We can capture the emerging **AI agent economy** before it becomes mainstream.

**Next steps**: Begin Phase 1 implementation as soon as approved.

---

## Appendix

### References
- X.402 Protocol: https://x402.gitbook.io/x402
- OuroC Documentation: [Internal docs]
- Solana Programs: https://docs.solana.com/developing/on-chain-programs
- ICP Canisters: https://internetcomputer.org/docs

### Glossary
- **A2A**: Agent-to-Agent (autonomous agent payments)
- **X.402**: HTTP 402 payment protocol standard
- **Facilitator**: Trusted third party that validates/settles payments
- **Payment Proof**: Cryptographic proof of payment completion
- **Agent Registry**: On-chain record of authorized agents
- **Spending Limit**: Maximum an agent can spend per interval

### Contact
For questions about this roadmap:
- Technical: [Tech Lead]
- Product: [Product Manager]
- Timeline: [Project Manager]

---

**Last Updated**: 2025-10-15
**Version**: 1.0
**Status**: Ready for Review
