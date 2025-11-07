# Squads Multisig Integration Guide

**Date**: November 4, 2025
**Purpose**: Step-by-step guide to integrate Squads Protocol for guild treasury management

---

## Overview

We're integrating **Squads Protocol** to handle guild treasuries in OuroC-Mesos.

**What Squads Does:**
- Creates multisig wallets (e.g., 3-of-5 signatures required)
- Manages proposal execution on-chain
- Provides secure fund custody
- Handles threshold-based approvals

**Integration Points:**
1. **Guild Creation** → Create Squads multisig
2. **Member Joins** → Create subscription to multisig address
3. **Create Proposal** → Create multisig transaction
4. **Vote on Proposal** → Sign/reject multisig transaction
5. **Execute Proposal** → Auto-executes when threshold met

---

## Prerequisites

### 1. Install Squads SDK

```bash
cd backend
npm install @sqds/sdk @solana/web3.js @solana/spl-token
```

### 2. Setup Environment Variables

```bash
# backend/.env

SOLANA_RPC_URL=https://api.devnet.solana.com
# For production: https://api.mainnet-beta.solana.com

SQUADS_API_KEY=your_squads_api_key
# Get from https://squads.so/

OUROC_API_KEY=ouro_community_shared_2025_demo_key
```

### 3. Project Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── guildService.ts          ← Guild business logic
│   │   ├── squadsService.ts         ← Squads SDK wrapper
│   │   └── subscriptionService.ts   ← OuroC-Prima integration
│   ├── routes/
│   │   ├── guilds.ts                ← Guild API endpoints
│   │   └── proposals.ts             ← Proposal API endpoints
│   ├── models/
│   │   ├── Guild.ts                 ← Guild database model
│   │   ├── Proposal.ts              ← Proposal database model
│   │   └── Transaction.ts           ← Transaction database model
│   └── app.ts                       ← Express app
```

---

## Step 1: Create Squads Service Wrapper

This wrapper makes it easier to work with the Squads SDK.

```typescript
// backend/src/services/squadsService.ts

import { Squads } from "@sqds/sdk";
import { Connection, PublicKey, Keypair, Transaction } from "@solana/web3.js";

export class SquadsService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
      "confirmed"
    );
  }

  /**
   * Create a new multisig wallet
   * @param threshold - Number of signatures required (e.g., 3)
   * @param members - Array of member public keys
   * @param creator - Creator's keypair (will be first member)
   * @returns Multisig public key
   */
  async createMultisig(
    threshold: number,
    members: PublicKey[],
    creator: Keypair
  ): Promise<PublicKey> {
    const squads = Squads.endpoint(this.connection, creator);

    const createKey = Keypair.generate();

    const multisigAccount = await squads.createMultisig(
      threshold,
      createKey.publicKey,
      members
    );

    console.log(`✅ Created multisig: ${multisigAccount.publicKey.toString()}`);
    console.log(`   Threshold: ${threshold}/${members.length}`);

    return multisigAccount.publicKey;
  }

  /**
   * Add a member to existing multisig
   * @param multisigPda - Multisig public key
   * @param newMember - New member's public key
   * @param authority - Current authority keypair
   */
  async addMember(
    multisigPda: PublicKey,
    newMember: PublicKey,
    authority: Keypair
  ): Promise<void> {
    const squads = Squads.endpoint(this.connection, authority);

    await squads.addMember(multisigPda, newMember);

    console.log(`✅ Added member: ${newMember.toString()}`);
  }

  /**
   * Create a proposal (multisig transaction)
   * @param multisigPda - Multisig public key
   * @param instructions - Array of transaction instructions
   * @param creator - Member creating the proposal
   * @returns Transaction index
   */
  async createTransaction(
    multisigPda: PublicKey,
    instructions: any[],
    creator: Keypair
  ): Promise<number> {
    const squads = Squads.endpoint(this.connection, creator);

    const transactionIndex = await squads.createTransaction(
      multisigPda,
      1 // Authority index
    );

    // Add instructions
    for (const ix of instructions) {
      await squads.addInstruction(transactionIndex, ix);
    }

    // Activate for voting
    await squads.activateTransaction(transactionIndex);

    console.log(`✅ Created transaction #${transactionIndex}`);

    return transactionIndex;
  }

  /**
   * Approve a proposal
   * @param multisigPda - Multisig public key
   * @param transactionIndex - Transaction index
   * @param approver - Member approving
   */
  async approveTransaction(
    multisigPda: PublicKey,
    transactionIndex: number,
    approver: Keypair
  ): Promise<void> {
    const squads = Squads.endpoint(this.connection, approver);

    await squads.approveTransaction(multisigPda, transactionIndex);

    console.log(`✅ Approved transaction #${transactionIndex}`);
  }

  /**
   * Reject a proposal
   * @param multisigPda - Multisig public key
   * @param transactionIndex - Transaction index
   * @param rejector - Member rejecting
   */
  async rejectTransaction(
    multisigPda: PublicKey,
    transactionIndex: number,
    rejector: Keypair
  ): Promise<void> {
    const squads = Squads.endpoint(this.connection, rejector);

    await squads.rejectTransaction(multisigPda, transactionIndex);

    console.log(`❌ Rejected transaction #${transactionIndex}`);
  }

  /**
   * Execute a proposal (if threshold met)
   * @param multisigPda - Multisig public key
   * @param transactionIndex - Transaction index
   * @param executor - Any member can execute
   */
  async executeTransaction(
    multisigPda: PublicKey,
    transactionIndex: number,
    executor: Keypair
  ): Promise<string> {
    const squads = Squads.endpoint(this.connection, executor);

    const signature = await squads.executeTransaction(multisigPda, transactionIndex);

    console.log(`🎉 Executed transaction #${transactionIndex}`);
    console.log(`   Signature: ${signature}`);

    return signature;
  }

  /**
   * Get multisig account info
   */
  async getMultisig(multisigPda: PublicKey): Promise<any> {
    const squads = Squads.endpoint(this.connection, Keypair.generate());
    return await squads.getMultisig(multisigPda);
  }

  /**
   * Get transaction status
   */
  async getTransaction(
    multisigPda: PublicKey,
    transactionIndex: number
  ): Promise<any> {
    const squads = Squads.endpoint(this.connection, Keypair.generate());
    return await squads.getTransaction(multisigPda, transactionIndex);
  }

  /**
   * Check if transaction is ready to execute (threshold met)
   */
  async isReadyToExecute(
    multisigPda: PublicKey,
    transactionIndex: number
  ): Promise<boolean> {
    const tx = await this.getTransaction(multisigPda, transactionIndex);
    const multisig = await this.getMultisig(multisigPda);

    const approvalCount = tx.approved.length;
    return approvalCount >= multisig.threshold;
  }
}
```

---

## Step 2: Update Guild Service

Integrate Squads into your guild creation and management logic.

```typescript
// backend/src/services/guildService.ts

import { SquadsService } from './squadsService';
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createSubscription } from './subscriptionService';

export class GuildService {
  private squadsService: SquadsService;

  constructor() {
    this.squadsService = new SquadsService();
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
    governanceType: 'multisig' | 'dao';
    votingThreshold: number; // Percentage (e.g., 60)
    initialMembers: string[]; // Wallet addresses
    creatorWallet: string;
  }) {
    // Calculate threshold (e.g., 60% of 5 = 3 signatures)
    const threshold = Math.ceil(
      (params.votingThreshold / 100) * params.initialMembers.length
    );

    // Convert addresses to PublicKeys
    const memberPubkeys = params.initialMembers.map(addr => new PublicKey(addr));

    // Create multisig (in production, creator would sign this)
    // For now, use a service keypair
    const serviceKeypair = Keypair.fromSecretKey(
      Buffer.from(process.env.SERVICE_WALLET_PRIVATE_KEY!, 'base64')
    );

    const multisigAddress = await this.squadsService.createMultisig(
      threshold,
      memberPubkeys,
      serviceKeypair
    );

    // Save to database
    const guild = await db.guilds.create({
      id: generateId(),
      name: params.name,
      description: params.description,
      category: params.category,
      subscriptionPrice: params.subscriptionPrice,
      interval: params.interval,
      treasuryAddress: multisigAddress.toString(),
      governanceType: params.governanceType,
      votingThreshold: params.votingThreshold,
      threshold: threshold,
      memberCount: params.initialMembers.length,
      treasuryBalance: 0,
      createdAt: new Date()
    });

    // Add members
    for (const memberAddr of params.initialMembers) {
      await db.guildMembers.create({
        guildId: guild.id,
        walletAddress: memberAddr,
        role: memberAddr === params.creatorWallet ? 'admin' : 'member',
        votingPower: 1,
        joinedAt: new Date()
      });
    }

    return {
      guild,
      multisigAddress: multisigAddress.toString()
    };
  }

  /**
   * Member joins guild (creates subscription to treasury)
   */
  async joinGuild(params: {
    guildId: string;
    memberWallet: string;
  }) {
    const guild = await db.guilds.findById(params.guildId);

    // Check if already a member
    const existingMember = await db.guildMembers.findOne({
      guildId: params.guildId,
      walletAddress: params.memberWallet
    });

    if (existingMember) {
      throw new Error("Already a guild member");
    }

    // Create subscription to guild treasury using OuroC-Prima
    const subscription = await createSubscription({
      subscriber: params.memberWallet,
      merchant: guild.treasuryAddress, // Squads multisig
      amount: guild.subscriptionPrice,
      interval: this.intervalToSeconds(guild.interval),
      tokenMint: "USDC", // or from params
      apiKey: process.env.OUROC_API_KEY!
    });

    // Add member to guild
    await db.guildMembers.create({
      guildId: params.guildId,
      walletAddress: params.memberWallet,
      role: 'member',
      votingPower: 1,
      joinedAt: new Date()
    });

    // Update member count
    await db.guilds.update(params.guildId, {
      $inc: { memberCount: 1 }
    });

    return { subscription, guild };
  }

  /**
   * Create a proposal
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
    const member = await db.guildMembers.findOne({
      guildId: params.guildId,
      walletAddress: params.proposer
    });

    if (!member) {
      throw new Error("Only guild members can create proposals");
    }

    // Verify sufficient balance
    if (params.amount > guild.treasuryBalance) {
      throw new Error("Insufficient treasury balance");
    }

    // Get total voting power
    const totalMembers = await db.guildMembers.count({ guildId: params.guildId });

    // Create proposal
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
      totalVotingPower: totalMembers,
      status: 'active',
      multisigTxIndex: null, // Will be set on first vote
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date()
    });

    return proposal;
  }

  /**
   * Vote on proposal
   */
  async voteOnProposal(params: {
    proposalId: string;
    voterWallet: string;
    vote: 'for' | 'against';
  }) {
    const proposal = await db.proposals.findById(params.proposalId);
    const guild = await db.guilds.findById(proposal.guildId);

    // Verify voter is member
    const member = await db.guildMembers.findOne({
      guildId: proposal.guildId,
      walletAddress: params.voterWallet
    });

    if (!member) {
      throw new Error("Only guild members can vote");
    }

    // Check if already voted
    const existingVote = await db.votes.findOne({
      proposalId: params.proposalId,
      voterWallet: params.voterWallet
    });

    if (existingVote) {
      throw new Error("Already voted on this proposal");
    }

    // If voting "for" and transaction doesn't exist, create it
    if (params.vote === 'for' && !proposal.multisigTxIndex) {
      // Create transfer instruction
      const transferIx = SystemProgram.transfer({
        fromPubkey: new PublicKey(guild.treasuryAddress),
        toPubkey: new PublicKey(proposal.recipient),
        lamports: proposal.amount * LAMPORTS_PER_SOL
      });

      // Create multisig transaction
      const voterKeypair = this.getKeypairForWallet(params.voterWallet);
      const txIndex = await this.squadsService.createTransaction(
        new PublicKey(guild.treasuryAddress),
        [transferIx],
        voterKeypair
      );

      // Save transaction index
      await db.proposals.update(params.proposalId, {
        multisigTxIndex: txIndex
      });

      proposal.multisigTxIndex = txIndex;
    }

    // Sign transaction
    const voterKeypair = this.getKeypairForWallet(params.voterWallet);

    if (params.vote === 'for') {
      await this.squadsService.approveTransaction(
        new PublicKey(guild.treasuryAddress),
        proposal.multisigTxIndex!,
        voterKeypair
      );

      await db.proposals.update(params.proposalId, {
        $inc: { votesFor: 1 }
      });
    } else {
      await this.squadsService.rejectTransaction(
        new PublicKey(guild.treasuryAddress),
        proposal.multisigTxIndex!,
        voterKeypair
      );

      await db.proposals.update(params.proposalId, {
        $inc: { votesAgainst: 1 }
      });
    }

    // Record vote
    await db.votes.create({
      proposalId: params.proposalId,
      voterWallet: params.voterWallet,
      vote: params.vote,
      votedAt: new Date()
    });

    // Check if threshold met
    const updatedProposal = await db.proposals.findById(params.proposalId);
    const approvalRate = (updatedProposal.votesFor / updatedProposal.totalVotingPower) * 100;

    if (approvalRate >= guild.votingThreshold) {
      await db.proposals.update(params.proposalId, {
        status: 'passed'
      });

      // Auto-execute if ready
      const isReady = await this.squadsService.isReadyToExecute(
        new PublicKey(guild.treasuryAddress),
        proposal.multisigTxIndex!
      );

      if (isReady) {
        await this.executeProposal({ proposalId: params.proposalId });
      }
    }

    return updatedProposal;
  }

  /**
   * Execute passed proposal
   */
  async executeProposal(params: { proposalId: string }) {
    const proposal = await db.proposals.findById(params.proposalId);
    const guild = await db.guilds.findById(proposal.guildId);

    if (proposal.status !== 'passed') {
      throw new Error("Proposal has not passed");
    }

    // Execute transaction
    const executorKeypair = this.getServiceKeypair();
    const signature = await this.squadsService.executeTransaction(
      new PublicKey(guild.treasuryAddress),
      proposal.multisigTxIndex!,
      executorKeypair
    );

    // Update proposal
    await db.proposals.update(params.proposalId, {
      status: 'executed',
      txHash: signature,
      executedAt: new Date()
    });

    // Update treasury balance
    await db.guilds.update(proposal.guildId, {
      $inc: { treasuryBalance: -proposal.amount }
    });

    // Record transaction
    await db.transactions.create({
      id: generateId(),
      guildId: proposal.guildId,
      type: 'proposal_execution',
      amount: proposal.amount,
      fromAddress: guild.treasuryAddress,
      toAddress: proposal.recipient,
      proposalId: params.proposalId,
      txHash: signature,
      date: new Date()
    });

    return { signature, proposal };
  }

  private intervalToSeconds(interval: string): number {
    switch (interval) {
      case 'monthly': return 30 * 24 * 60 * 60;
      case 'quarterly': return 90 * 24 * 60 * 60;
      case 'yearly': return 365 * 24 * 60 * 60;
      default: return 30 * 24 * 60 * 60;
    }
  }

  private getServiceKeypair(): Keypair {
    return Keypair.fromSecretKey(
      Buffer.from(process.env.SERVICE_WALLET_PRIVATE_KEY!, 'base64')
    );
  }

  private getKeypairForWallet(wallet: string): Keypair {
    // In production, this would use wallet adapter
    // For testing, you might have test keypairs
    throw new Error("Implement wallet signing");
  }
}
```

---

## Step 3: API Endpoints

```typescript
// backend/src/routes/guilds.ts

import express from 'express';
import { GuildService } from '../services/guildService';

const router = express.Router();
const guildService = new GuildService();

/**
 * POST /api/guilds/create
 * Create a new guild with Squads multisig
 */
router.post('/create', async (req, res) => {
  try {
    const result = await guildService.createGuild(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/guilds/:id/join
 * Join guild (creates subscription)
 */
router.post('/:id/join', async (req, res) => {
  try {
    const result = await guildService.joinGuild({
      guildId: req.params.id,
      memberWallet: req.body.memberWallet
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/guilds/:id
 * Get guild details
 */
router.get('/:id', async (req, res) => {
  try {
    const guild = await db.guilds.findById(req.params.id);
    res.json(guild);
  } catch (error) {
    res.status(404).json({ error: 'Guild not found' });
  }
});

export default router;
```

```typescript
// backend/src/routes/proposals.ts

import express from 'express';
import { GuildService } from '../services/guildService';

const router = express.Router();
const guildService = new GuildService();

/**
 * POST /api/proposals/create
 * Create a proposal
 */
router.post('/create', async (req, res) => {
  try {
    const proposal = await guildService.createProposal(req.body);
    res.json(proposal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/proposals/:id/vote
 * Vote on a proposal
 */
router.post('/:id/vote', async (req, res) => {
  try {
    const result = await guildService.voteOnProposal({
      proposalId: req.params.id,
      voterWallet: req.body.voterWallet,
      vote: req.body.vote
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/proposals/:id/execute
 * Execute a passed proposal
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const result = await guildService.executeProposal({
      proposalId: req.params.id
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

---

## Step 4: Frontend Integration

### Update CreateGuild Page

```typescript
// frontend/src/pages/CreateGuild.tsx

const handleSubmit = async () => {
  if (!publicKey) {
    toast.error("Please connect your wallet");
    return;
  }

  setIsSubmitting(true);

  try {
    // Create guild with Squads multisig
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
        initialMembers: [publicKey.toString()],
        creatorWallet: publicKey.toString()
      })
    });

    const { guild, multisigAddress } = await response.json();

    toast.success(
      `Guild created successfully!\nTreasury: ${multisigAddress.slice(0, 8)}...`
    );

    navigate(`/guild/${guild.id}`);
  } catch (error) {
    toast.error("Failed to create guild");
  } finally {
    setIsSubmitting(false);
  }
};
```

### Update GuildDetail - Voting

```typescript
// frontend/src/pages/GuildDetail.tsx

const handleVote = async (proposalId: string, vote: 'for' | 'against') => {
  if (!publicKey) {
    toast.error("Please connect your wallet");
    return;
  }

  try {
    const response = await fetch(`/api/proposals/${proposalId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voterWallet: publicKey.toString(),
        vote: vote
      })
    });

    const result = await response.json();

    toast.success(
      vote === 'for'
        ? `Voted in favor! (${result.votesFor}/${result.totalVotingPower})`
        : `Voted against! (${result.votesAgainst}/${result.totalVotingPower})`
    );

    // Refresh proposals
    fetchProposals();
  } catch (error) {
    toast.error("Failed to vote");
  }
};
```

---

## Step 5: Testing

### Test Script

```typescript
// backend/src/test/guild-flow.test.ts

import { GuildService } from '../services/guildService';
import { Keypair } from '@solana/web3.js';

describe('Guild + Squads Integration', () => {
  const guildService = new GuildService();

  // Generate test members
  const creator = Keypair.generate();
  const member1 = Keypair.generate();
  const member2 = Keypair.generate();
  const member3 = Keypair.generate();
  const member4 = Keypair.generate();

  let guildId: string;
  let proposalId: string;

  it('should create guild with Squads multisig', async () => {
    const result = await guildService.createGuild({
      name: 'Test Investment Club',
      description: 'Testing Squads integration',
      category: 'Investment',
      subscriptionPrice: 50,
      interval: 'monthly',
      governanceType: 'multisig',
      votingThreshold: 60, // 3-of-5
      initialMembers: [
        creator.publicKey.toString(),
        member1.publicKey.toString(),
        member2.publicKey.toString(),
        member3.publicKey.toString(),
        member4.publicKey.toString()
      ],
      creatorWallet: creator.publicKey.toString()
    });

    expect(result.guild).toBeDefined();
    expect(result.multisigAddress).toBeDefined();

    guildId = result.guild.id;
    console.log(`✅ Created guild: ${guildId}`);
    console.log(`✅ Treasury: ${result.multisigAddress}`);
  });

  it('should create proposal', async () => {
    const proposal = await guildService.createProposal({
      guildId,
      proposer: creator.publicKey.toString(),
      title: 'Buy Bitcoin',
      description: 'Invest $1000 in BTC',
      amount: 1000,
      recipient: Keypair.generate().publicKey.toString()
    });

    expect(proposal.status).toBe('active');
    proposalId = proposal.id;

    console.log(`✅ Created proposal: ${proposalId}`);
  });

  it('should vote on proposal (3 votes to pass)', async () => {
    // Vote 1: Creator votes for
    await guildService.voteOnProposal({
      proposalId,
      voterWallet: creator.publicKey.toString(),
      vote: 'for'
    });
    console.log('✅ Vote 1: For');

    // Vote 2: Member1 votes for
    await guildService.voteOnProposal({
      proposalId,
      voterWallet: member1.publicKey.toString(),
      vote: 'for'
    });
    console.log('✅ Vote 2: For');

    // Vote 3: Member2 votes for (should trigger passed status)
    const result = await guildService.voteOnProposal({
      proposalId,
      voterWallet: member2.publicKey.toString(),
      vote: 'for'
    });

    expect(result.status).toBe('passed');
    expect(result.votesFor).toBe(3);

    console.log('✅ Proposal passed! (3/5 votes)');
  });

  it('should execute proposal', async () => {
    const result = await guildService.executeProposal({ proposalId });

    expect(result.signature).toBeDefined();
    expect(result.proposal.status).toBe('executed');

    console.log(`✅ Proposal executed!`);
    console.log(`   Signature: ${result.signature}`);
  });
});
```

### Run Tests

```bash
# Devnet testing
export SOLANA_RPC_URL=https://api.devnet.solana.com
npm test

# Expected output:
# ✅ Created guild: guild_abc123
# ✅ Treasury: 8jP7xK...
# ✅ Created proposal: prop_xyz789
# ✅ Vote 1: For
# ✅ Vote 2: For
# ✅ Vote 3: For
# ✅ Proposal passed! (3/5 votes)
# ✅ Proposal executed!
#    Signature: 5kH9j...
```

---

## Step 6: Deployment Checklist

### Pre-Launch

- [ ] Test on Devnet with real wallets
- [ ] Verify subscriptions pay to multisig addresses
- [ ] Test full proposal flow (create → vote → execute)
- [ ] Security audit of Squads integration
- [ ] Load testing (100 guilds, 1000 proposals)

### Launch

- [ ] Deploy backend to production
- [ ] Switch to Mainnet RPC
- [ ] Update SOLANA_RPC_URL to mainnet
- [ ] Monitor first few guilds closely
- [ ] Setup alerts for failed transactions

### Post-Launch

- [ ] Add transaction monitoring dashboard
- [ ] Implement retry logic for failed votes
- [ ] Add email notifications for proposals
- [ ] Build Squads UI fallback (link to squads.so)

---

## Important Notes

### 1. Wallet Signing

In production, users must sign transactions with their actual wallets:

```typescript
// Use Solana Wallet Adapter
import { useWallet } from '@solana/wallet-adapter-react';

const { signTransaction } = useWallet();

// User signs the transaction
const signedTx = await signTransaction(transaction);
```

### 2. Gas Fees

Users pay gas fees for:
- Approving proposals (~0.000005 SOL)
- Rejecting proposals (~0.000005 SOL)

Guild creator pays for:
- Multisig creation (~0.02 SOL)

### 3. Squads UI Fallback

Always provide a link to Squads' official UI:

```typescript
const squadsUrl = `https://v3.squads.so/squads/${guild.treasuryAddress}`;

// Show in UI
<a href={squadsUrl} target="_blank">
  View on Squads →
</a>
```

Users can use Squads' UI as a backup if your UI has issues.

---

## Resources

- **Squads Protocol**: https://squads.so/
- **Squads SDK Docs**: https://docs.squads.so/
- **Squads UI**: https://v3.squads.so/
- **Example Projects**: https://github.com/Squads-Protocol/

---

## Summary

You now have a complete integration guide for Squads multisig:

1. ✅ **SquadsService** wrapper for easy SDK usage
2. ✅ **GuildService** with full multisig integration
3. ✅ **API endpoints** for frontend
4. ✅ **Frontend integration** examples
5. ✅ **Test suite** for validation
6. ✅ **Deployment checklist**

**Next Steps:**
1. Install Squads SDK
2. Implement SquadsService
3. Update GuildService to use Squads
4. Test on Devnet
5. Deploy to production

This gives you production-ready guild treasury management! 🚀
