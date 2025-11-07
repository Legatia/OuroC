# Guild Treasury Management - MVP Implementation Plan

**Date**: November 4, 2025
**Decision**: Use Squads Protocol Multisig
**Rationale**: Perfect for small-to-medium guilds; large DAOs will eventually build their own infrastructure

---

## Philosophy

### Target Market
OuroC-Mesos is **NOT** trying to compete with:
- Realms (large DAOs with 1000+ members)
- Snapshot (governance voting platforms)
- DAOhaus (complex DAO frameworks)

OuroC-Mesos is **PERFECT** for:
- Small investment clubs (5-20 members pooling funds)
- Gaming guilds (20-50 members sharing resources)
- Creator collectives (10-30 creators collaborating)
- Professional networks (15-40 members funding projects)

### Natural Graduation Path

```
Guild Lifecycle on OuroC-Mesos
├── Start: 5 members, $500/month → Perfect for our platform
├── Growth: 20 members, $5K/month → Still great fit
├── Mature: 50 members, $20K/month → Starting to outgrow
└── Graduate: 100+ members, $100K+/month → Move to own infrastructure ✅

This is GOOD! It means we're successful at launching guilds.
```

**Philosophy**: We're a **launchpad**, not a forever home for massive DAOs.

---

## MVP Implementation: Squads Multisig

### Overview

Use [Squads Protocol](https://squads.so/) for all guild treasuries.

**Why Squads:**
- ✅ Battle-tested (manages $100M+ in assets)
- ✅ Simple API (integrate in 1-2 weeks)
- ✅ Very cheap (~$4 setup, pennies per transaction)
- ✅ Flexible thresholds (2-of-3, 3-of-5, 4-of-7)
- ✅ Works perfectly with subscription payments
- ✅ Has fallback UI at https://v3.squads.so/

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    OuroC-Mesos Platform                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (React)                                            │
│  ├── Guild Discovery                                         │
│  ├── Guild Creation → Creates Squads Multisig               │
│  ├── Member Management                                       │
│  ├── Proposal System                                         │
│  └── Voting Interface                                        │
│                                                              │
│  Backend (Node.js/Express or ICP Canister)                  │
│  ├── Guild Database (PostgreSQL or ICP Storage)             │
│  │   ├── Guild metadata                                      │
│  │   ├── Member list                                         │
│  │   ├── Proposals                                           │
│  │   └── Votes                                               │
│  └── Squads SDK Integration                                 │
│      ├── Create multisig                                     │
│      ├── Create transaction                                  │
│      └── Monitor signatures                                  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                      Squads Protocol                         │
│              (Handles actual fund custody)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Solana Blockchain                        │
│                                                              │
│  ├── Multisig Wallet (Guild Treasury)                       │
│  ├── SPL Token Accounts (USDC, USDT, etc.)                  │
│  └── OuroC-Prima Subscriptions → Pay to Multisig            │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Backend Integration (Week 1-2)

#### 1.1 Install Squads SDK

```bash
npm install @sqds/sdk @solana/web3.js @solana/spl-token
```

#### 1.2 Create Guild Service

```typescript
// backend/src/services/guildService.ts

import { Squads } from "@sqds/sdk";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";

export class GuildService {
  private connection: Connection;
  private squads: Squads;

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"
    );
  }

  /**
   * Create a new guild with Squads multisig treasury
   */
  async createGuild(params: {
    name: string;
    description: string;
    category: string;
    subscriptionPrice: number;
    interval: 'monthly' | 'quarterly' | 'yearly';
    governanceType: 'multisig' | 'dao'; // For now, both use multisig
    votingThreshold: number; // e.g., 60 means 60% approval or 3-of-5
    initialMembers: string[]; // Array of wallet addresses
    creator: Keypair; // Creator's keypair for signing
  }) {
    // Calculate threshold based on percentage
    // e.g., 60% of 5 members = 3 signatures required
    const threshold = Math.ceil(
      (params.votingThreshold / 100) * params.initialMembers.length
    );

    // Initialize Squads with creator wallet
    const squads = Squads.endpoint(this.connection, params.creator);

    // Create multisig
    const multisig = await squads.createMultisig(
      threshold,
      params.initialMembers.map(addr => new PublicKey(addr)),
      params.initialMembers.length
    );

    // Save to database
    const guild = await db.guilds.create({
      id: generateId(),
      name: params.name,
      description: params.description,
      category: params.category,
      subscriptionPrice: params.subscriptionPrice,
      interval: params.interval,
      treasuryAddress: multisig.publicKey.toString(),
      governanceType: params.governanceType,
      votingThreshold: params.votingThreshold,
      threshold: threshold,
      memberCount: params.initialMembers.length,
      treasuryBalance: 0,
      members: params.initialMembers.map(addr => ({
        address: addr,
        role: addr === params.creator.publicKey.toString() ? 'admin' : 'member',
        joinedAt: new Date(),
        votingPower: 1
      })),
      createdAt: new Date()
    });

    return {
      guild,
      multisigAddress: multisig.publicKey.toString()
    };
  }

  /**
   * Add member to guild and create subscription
   */
  async joinGuild(params: {
    guildId: string;
    memberWallet: string;
  }) {
    const guild = await db.guilds.findById(params.guildId);

    // Create subscription to guild treasury using OuroC-Prima
    const subscription = await createSubscription({
      subscriber: new PublicKey(params.memberWallet),
      merchant: new PublicKey(guild.treasuryAddress), // Guild multisig
      amount: guild.subscriptionPrice * 1_000_000, // Convert to micro-units
      tokenMint: USDC_MINT,
      interval: this.intervalToSeconds(guild.interval),
      apiKey: process.env.OUROC_API_KEY
    });

    // Add member to guild
    await db.guilds.update(params.guildId, {
      $push: {
        members: {
          address: params.memberWallet,
          role: 'member',
          joinedAt: new Date(),
          votingPower: 1
        }
      },
      $inc: { memberCount: 1 }
    });

    return { subscription, guild };
  }

  /**
   * Create a proposal (just stores in DB, doesn't create multisig tx yet)
   */
  async createProposal(params: {
    guildId: string;
    proposer: string;
    title: string;
    description: string;
    amount: number;
    recipient: string;
  }) {
    const guild = await db.guilds.findById(params.guildId);

    // Verify proposer is member
    const isMember = guild.members.some(m => m.address === params.proposer);
    if (!isMember) {
      throw new Error("Only guild members can create proposals");
    }

    // Verify sufficient treasury balance
    if (params.amount > guild.treasuryBalance) {
      throw new Error("Insufficient treasury balance");
    }

    const proposal = await db.proposals.create({
      id: generateId(),
      guildId: params.guildId,
      title: params.title,
      description: params.description,
      proposer: params.proposer,
      amount: params.amount,
      recipient: params.recipient,
      votesFor: 0,
      votesAgainst: 0,
      totalVotingPower: guild.memberCount,
      status: 'active',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date()
    });

    return proposal;
  }

  /**
   * Vote on proposal by signing multisig transaction
   */
  async voteOnProposal(params: {
    proposalId: string;
    voter: Keypair; // Member's keypair
    vote: 'for' | 'against';
  }) {
    const proposal = await db.proposals.findById(params.proposalId);
    const guild = await db.guilds.findById(proposal.guildId);

    // Verify voter is member
    const isMember = guild.members.some(
      m => m.address === params.voter.publicKey.toString()
    );
    if (!isMember) {
      throw new Error("Only guild members can vote");
    }

    if (params.vote === 'for') {
      // Create multisig transaction on first "for" vote
      if (proposal.multisigTxIndex === null) {
        const squads = Squads.endpoint(this.connection, params.voter);

        // Create transfer instruction
        const transferIx = SystemProgram.transfer({
          fromPubkey: new PublicKey(guild.treasuryAddress),
          toPubkey: new PublicKey(proposal.recipient),
          lamports: proposal.amount * LAMPORTS_PER_SOL
        });

        // Create multisig transaction
        const tx = await squads.createTransaction(
          new PublicKey(guild.treasuryAddress),
          1 // Authority index
        );

        await tx.addInstruction(transferIx);
        await tx.activate();

        // Save transaction index
        await db.proposals.update(params.proposalId, {
          multisigTxIndex: tx.index
        });
      }

      // Approve/sign the multisig transaction
      const squads = Squads.endpoint(this.connection, params.voter);
      await squads.approveTransaction(
        new PublicKey(guild.treasuryAddress),
        proposal.multisigTxIndex
      );

      // Update vote count
      await db.proposals.update(params.proposalId, {
        $inc: { votesFor: 1 }
      });
    } else {
      // Vote against = reject the transaction
      const squads = Squads.endpoint(this.connection, params.voter);
      await squads.rejectTransaction(
        new PublicKey(guild.treasuryAddress),
        proposal.multisigTxIndex
      );

      await db.proposals.update(params.proposalId, {
        $inc: { votesAgainst: 1 }
      });
    }

    // Check if threshold met
    const updatedProposal = await db.proposals.findById(params.proposalId);
    const approvalRate =
      (updatedProposal.votesFor / updatedProposal.totalVotingPower) * 100;

    if (approvalRate >= guild.votingThreshold) {
      await db.proposals.update(params.proposalId, {
        status: 'passed'
      });
    }

    return updatedProposal;
  }

  /**
   * Execute passed proposal (Squads auto-executes when threshold met)
   */
  async executeProposal(params: {
    proposalId: string;
  }) {
    const proposal = await db.proposals.findById(params.proposalId);

    if (proposal.status !== 'passed') {
      throw new Error("Proposal has not passed");
    }

    // Squads executes automatically when threshold is met
    // We just need to update our database status

    await db.proposals.update(params.proposalId, {
      status: 'executed',
      executedAt: new Date()
    });

    // Update treasury balance
    const guild = await db.guilds.findById(proposal.guildId);
    await db.guilds.update(proposal.guildId, {
      treasuryBalance: guild.treasuryBalance - proposal.amount
    });

    // Record transaction
    await db.transactions.create({
      guildId: proposal.guildId,
      type: 'proposal_execution',
      amount: proposal.amount,
      from: guild.treasuryAddress,
      to: proposal.recipient,
      proposalId: params.proposalId,
      date: new Date()
    });

    return proposal;
  }

  /**
   * Get guild treasury balance from Solana
   */
  async updateTreasuryBalance(guildId: string) {
    const guild = await db.guilds.findById(guildId);
    const balance = await this.connection.getBalance(
      new PublicKey(guild.treasuryAddress)
    );

    await db.guilds.update(guildId, {
      treasuryBalance: balance / LAMPORTS_PER_SOL
    });

    return balance / LAMPORTS_PER_SOL;
  }

  private intervalToSeconds(interval: string): number {
    switch (interval) {
      case 'monthly': return 30 * 24 * 60 * 60;
      case 'quarterly': return 90 * 24 * 60 * 60;
      case 'yearly': return 365 * 24 * 60 * 60;
      default: return 30 * 24 * 60 * 60;
    }
  }
}
```

---

### Phase 2: Frontend Integration (Week 3)

#### 2.1 Update CreateGuild Page

```typescript
// frontend/src/pages/CreateGuild.tsx

const handleSubmit = async () => {
  try {
    if (!publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    // Call backend to create guild
    const response = await fetch('/api/guilds/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        subscriptionPrice: formData.subscriptionPrice,
        interval: formData.interval,
        governanceType: formData.governanceType,
        votingThreshold: formData.votingThreshold,
        initialMembers: [publicKey.toString()], // Creator is first member
        creatorWallet: publicKey.toString()
      })
    });

    const { guild, multisigAddress } = await response.json();

    toast.success(`Guild created! Treasury: ${multisigAddress}`);
    navigate(`/guild/${guild.id}`);
  } catch (error) {
    toast.error("Failed to create guild");
  }
};
```

#### 2.2 Update GuildDetail - Join Guild

```typescript
// frontend/src/pages/GuildDetail.tsx

const handleJoinGuild = async () => {
  if (!publicKey) {
    toast.error("Please connect your wallet");
    return;
  }

  try {
    // Join guild (creates subscription to treasury)
    const response = await fetch(`/api/guilds/${guildId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberWallet: publicKey.toString()
      })
    });

    const { subscription } = await response.json();

    toast.success(
      `Joined guild! Subscription created: ${subscription.id}`
    );

    // Refresh guild data
    fetchGuildData();
  } catch (error) {
    toast.error("Failed to join guild");
  }
};
```

#### 2.3 Update GuildDetail - Voting

```typescript
const handleVote = async (proposalId: string, vote: 'for' | 'against') => {
  if (!publicKey || !wallet) {
    toast.error("Please connect your wallet");
    return;
  }

  try {
    // Vote on proposal (signs multisig transaction)
    const response = await fetch(`/api/proposals/${proposalId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voter: publicKey.toString(),
        vote: vote
      })
    });

    const { proposal } = await response.json();

    toast.success(
      vote === 'for'
        ? `Voted in favor! (${proposal.votesFor}/${proposal.totalVotingPower})`
        : `Voted against! (${proposal.votesAgainst}/${proposal.totalVotingPower})`
    );

    // Refresh proposal data
    fetchProposals();
  } catch (error) {
    toast.error("Failed to vote");
  }
};
```

---

## Database Schema

### Guild Table
```sql
CREATE TABLE guilds (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR,
  subscription_price DECIMAL,
  interval VARCHAR,
  treasury_address VARCHAR UNIQUE NOT NULL, -- Squads multisig address
  governance_type VARCHAR,
  voting_threshold INTEGER, -- Percentage (e.g., 60 = 60%)
  threshold INTEGER, -- Number of signatures required
  member_count INTEGER DEFAULT 0,
  treasury_balance DECIMAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Members Table
```sql
CREATE TABLE guild_members (
  guild_id VARCHAR REFERENCES guilds(id),
  wallet_address VARCHAR NOT NULL,
  role VARCHAR DEFAULT 'member',
  voting_power INTEGER DEFAULT 1,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (guild_id, wallet_address)
);
```

### Proposals Table
```sql
CREATE TABLE proposals (
  id VARCHAR PRIMARY KEY,
  guild_id VARCHAR REFERENCES guilds(id),
  title VARCHAR NOT NULL,
  description TEXT,
  proposer VARCHAR NOT NULL,
  amount DECIMAL NOT NULL,
  recipient VARCHAR NOT NULL,
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  total_voting_power INTEGER,
  status VARCHAR DEFAULT 'active', -- active, passed, rejected, executed
  multisig_tx_index INTEGER, -- Squads transaction index
  deadline TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id VARCHAR PRIMARY KEY,
  guild_id VARCHAR REFERENCES guilds(id),
  type VARCHAR, -- subscription, proposal_execution
  amount DECIMAL,
  from_address VARCHAR,
  to_address VARCHAR,
  proposal_id VARCHAR REFERENCES proposals(id),
  tx_hash VARCHAR,
  date TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

```
POST   /api/guilds/create              - Create guild with multisig
POST   /api/guilds/:id/join            - Join guild (create subscription)
GET    /api/guilds/:id                 - Get guild details
GET    /api/guilds/:id/members         - Get guild members
GET    /api/guilds/:id/proposals       - Get guild proposals
POST   /api/guilds/:id/proposals       - Create proposal
POST   /api/proposals/:id/vote         - Vote on proposal
POST   /api/proposals/:id/execute      - Execute proposal
GET    /api/guilds/:id/treasury        - Get treasury balance
GET    /api/guilds/:id/transactions    - Get transaction history
```

---

## Testing Plan

### 1. Local Testing (Devnet)
```bash
# Setup
export SOLANA_RPC_URL=https://api.devnet.solana.com
export OUROC_API_KEY=ouro_community_shared_2025_demo_key

# Test flow
1. Create guild (5 members, 3-of-5 multisig)
2. Members join (subscriptions created)
3. Wait for subscription payments
4. Create proposal ($100 transfer)
5. 3 members vote "for"
6. Proposal executes automatically
7. Verify treasury balance decreased
```

### 2. Integration Test
```typescript
describe("Guild Treasury Flow", () => {
  it("should create guild and process proposal", async () => {
    // 1. Create guild
    const guild = await guildService.createGuild({
      name: "Test Guild",
      initialMembers: [member1, member2, member3],
      votingThreshold: 60, // 2-of-3
      creator: creator
    });

    // 2. Members join
    await guildService.joinGuild({
      guildId: guild.id,
      memberWallet: member1
    });

    // 3. Create proposal
    const proposal = await guildService.createProposal({
      guildId: guild.id,
      proposer: member1,
      title: "Test Payment",
      amount: 100,
      recipient: recipient
    });

    // 4. Vote
    await guildService.voteOnProposal({
      proposalId: proposal.id,
      voter: member1Keypair,
      vote: 'for'
    });

    await guildService.voteOnProposal({
      proposalId: proposal.id,
      voter: member2Keypair,
      vote: 'for'
    });

    // 5. Check status
    const updatedProposal = await db.proposals.findById(proposal.id);
    expect(updatedProposal.status).toBe('passed');
  });
});
```

---

## Cost Breakdown

### Setup Costs (One-time per guild)
- Multisig creation: ~0.02 SOL (~$4)
- SPL token account: ~0.002 SOL (~$0.40) per token type
- **Total: ~$5-10 per guild**

### Ongoing Costs (Per transaction)
- Subscription payment: ~0.000005 SOL (~$0.001)
- Multisig transaction creation: ~0.000005 SOL (~$0.001)
- Signature: ~0.000005 SOL (~$0.001) per member
- Transaction execution: ~0.000005 SOL (~$0.001)

**Example: Guild with 10 members, 5 proposals/month**
- Monthly subscriptions: 10 × $0.001 = $0.01
- Proposals: 5 × $0.005 = $0.025
- **Total: ~$0.04/month in gas fees**

Extremely affordable!

---

## Launch Checklist

### Week 1
- [ ] Install Squads SDK
- [ ] Implement `GuildService.createGuild()`
- [ ] Test multisig creation on devnet
- [ ] Setup database schema

### Week 2
- [ ] Implement `GuildService.joinGuild()`
- [ ] Integrate with OuroC-Prima subscriptions
- [ ] Test subscription to multisig address
- [ ] Implement `GuildService.createProposal()`

### Week 3
- [ ] Implement `GuildService.voteOnProposal()`
- [ ] Test multisig signing flow
- [ ] Implement `GuildService.executeProposal()`
- [ ] Update frontend CreateGuild page

### Week 4
- [ ] Update frontend GuildDetail voting UI
- [ ] Add treasury balance sync
- [ ] Write integration tests
- [ ] Deploy to testnet

### Week 5 (Launch)
- [ ] Security audit of smart contract interactions
- [ ] Load testing
- [ ] Deploy to mainnet
- [ ] Announce launch! 🎉

---

## Success Metrics

### Launch Goals (First 3 Months)
- 🎯 **20 guilds created**
- 🎯 **200 guild members**
- 🎯 **$10K in treasury assets under management**
- 🎯 **100 proposals executed**

### Graduation Indicator (Success!)
When guilds start saying: *"We've outgrown OuroC-Mesos, we need our own DAO infrastructure"*

**This is GOOD!** It means:
1. ✅ We successfully launched them
2. ✅ They grew (proof of concept works)
3. ✅ We can showcase them as success stories
4. ✅ They can still use OuroC-Prima for subscriptions

---

## Summary

**MVP Treasury Management:**
- ✅ Use Squads Protocol multisig
- ✅ Perfect for 5-50 member guilds
- ✅ Integrates seamlessly with OuroC-Prima
- ✅ Can implement in 4-5 weeks
- ✅ Very low cost (~$5 setup, pennies per transaction)
- ✅ When guilds outgrow us, they graduate (success!)

**Not implementing:**
- ❌ Token-weighted voting (use Realms)
- ❌ Complex governance rules (use Snapshot)
- ❌ Large-scale DAO tooling (use DAOhaus)

**We focus on:** Easy guild launchpad + subscription management = our competitive advantage!
