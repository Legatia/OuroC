# Guild Treasury Management - Realistic Implementation Options

**Date**: November 4, 2025
**Purpose**: Define realistic treasury management options for guild/DAO systems

---

## Current Implementation

The current frontend supports two governance types:
1. **DAO (Decentralized Autonomous Organization)** - Token-based voting
2. **Multisig (Multi-Signature Wallet)** - Designated signers approve transactions

---

## Option 1: Solana Multisig (Squads Protocol) ⭐ RECOMMENDED

### Overview
Use [Squads Protocol](https://squads.so/) - the industry-standard multisig solution on Solana.

### How It Works

**Treasury Structure:**
```
Guild Treasury = Squads Multisig Wallet
├── Members send subscription payments → Multisig wallet
├── Proposal execution → Multisig members sign transaction
└── Funds disbursed via multisig approval
```

### Implementation Steps

#### 1. **Guild Creation**
```typescript
// When creating a guild
import { Squads } from "@sqds/sdk";

async function createGuildTreasury(
  guildMembers: PublicKey[],
  threshold: number // e.g., 3 of 5
) {
  const squads = Squads.endpoint(process.env.RPC_URL, wallet);

  // Create multisig
  const multisig = await squads.createMultisig(
    threshold,           // e.g., 3
    guildMembers,        // Array of member public keys
    guildMembers.length  // Total members (e.g., 5)
  );

  return {
    multisigAddress: multisig.publicKey,
    threshold: threshold,
    members: guildMembers
  };
}
```

#### 2. **Subscription Payments**
```typescript
// Members pay subscriptions to the multisig address
async function processSubscriptionPayment(
  subscriber: PublicKey,
  multisigAddress: PublicKey,
  amount: number,
  tokenMint: PublicKey
) {
  // Use OuroC-Prima to process recurring payment
  // Destination = multisigAddress (guild treasury)

  const tx = await createSubscription({
    subscriber: subscriber,
    merchant: multisigAddress,  // Guild treasury
    amount: amount,
    tokenMint: tokenMint,
    interval: "monthly"
  });

  return tx;
}
```

#### 3. **Proposal Execution**
```typescript
// When a proposal passes, create multisig transaction
async function executeProposal(
  multisigAddress: PublicKey,
  proposal: Proposal
) {
  const squads = Squads.endpoint(process.env.RPC_URL, wallet);

  // Create transaction instruction
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: multisigAddress,
    toPubkey: new PublicKey(proposal.recipient),
    lamports: proposal.amount * LAMPORTS_PER_SOL
  });

  // Create multisig transaction
  const transaction = await squads.createTransaction(
    multisigAddress,
    1 // Authority index
  );

  await transaction.addInstruction(transferInstruction);

  // Activate transaction for signing
  await transaction.activate();

  // Members sign via Squads UI or SDK
  return transaction;
}
```

#### 4. **Member Voting & Signing**
```typescript
// Member approves/signs proposal
async function approveProposal(
  member: Keypair,
  multisigAddress: PublicKey,
  transactionIndex: number
) {
  const squads = Squads.endpoint(process.env.RPC_URL, member);

  await squads.approveTransaction(
    multisigAddress,
    transactionIndex
  );

  // Once threshold is met, transaction auto-executes
}
```

### Advantages ✅
- **Battle-tested**: Squads is the most widely used multisig on Solana
- **Secure**: Industry-standard security practices
- **Flexible**: Configurable thresholds (e.g., 2-of-3, 3-of-5, 60% of members)
- **Transparent**: All transactions on-chain
- **UI Available**: Squads has a web interface at https://v3.squads.so/
- **SPL Token Support**: Works with USDC, USDT, and all SPL tokens
- **PDA Support**: Can use Program Derived Addresses for automatic membership

### Disadvantages ❌
- **Requires SDK Integration**: Need to integrate Squads SDK
- **Gas Costs**: Each signature costs gas (though minimal on Solana)
- **Member Management**: Adding/removing members requires multisig approval

### Cost Estimate
- Multisig creation: ~0.02 SOL (~$4)
- Transaction creation: ~0.000005 SOL per tx
- Signature: ~0.000005 SOL per signature
- **Very affordable for most guilds**

---

## Option 2: Solana On-Chain DAO (Realms/SPL Governance)

### Overview
Use [Realms](https://realms.today/) (SPL Governance standard) for token-weighted voting.

### How It Works

**Treasury Structure:**
```
Guild Treasury = SPL Governance Realm
├── Guild issues governance tokens (e.g., GUILD-1 token)
├── Members hold tokens = voting power
├── Proposals require token-weighted voting
└── Passed proposals execute automatically via on-chain program
```

### Implementation Steps

#### 1. **Create Governance Realm**
```typescript
import { createRealm } from "@solana/spl-governance";

async function createGuildDAO(
  guildName: string,
  governanceToken: PublicKey
) {
  // Create realm (DAO)
  const realm = await createRealm(
    connection,
    guildName,
    governanceToken,  // Governance token mint
    payer
  );

  return {
    realmAddress: realm,
    governanceTokenMint: governanceToken
  };
}
```

#### 2. **Issue Governance Tokens**
```typescript
// When member joins, mint governance tokens
async function grantMembershipToken(
  member: PublicKey,
  amount: number
) {
  // Mint governance tokens to member
  // 1 token = 1 vote (or weighted)

  const tx = await mintTo(
    connection,
    payer,
    governanceTokenMint,
    member,
    mintAuthority,
    amount
  );

  return tx;
}
```

#### 3. **Create Proposal**
```typescript
import { createProposal } from "@solana/spl-governance";

async function createGuildProposal(
  realm: PublicKey,
  governance: PublicKey,
  proposer: PublicKey,
  title: string,
  description: string,
  transferInstruction: TransactionInstruction
) {
  const proposal = await createProposal(
    connection,
    realm,
    governance,
    proposer,
    title,
    description,
    governanceTokenMint,
    [transferInstruction]  // What to execute
  );

  return proposal;
}
```

#### 4. **Member Voting**
```typescript
import { castVote } from "@solana/spl-governance";

async function voteOnProposal(
  member: Keypair,
  proposal: PublicKey,
  vote: "yes" | "no"
) {
  await castVote(
    connection,
    realm,
    proposal,
    member.publicKey,
    governanceTokenMint,
    vote === "yes" ? { approve: [{ rank: 0, weightPercentage: 100 }] } : { deny: {} }
  );
}
```

#### 5. **Execute Proposal**
```typescript
// After voting period ends and proposal passes
async function executeProposal(proposal: PublicKey) {
  // SPL Governance automatically executes if:
  // 1. Voting period ended
  // 2. Threshold met (e.g., 60% approval)

  await executeTransaction(
    connection,
    proposal,
    payer
  );
}
```

### Advantages ✅
- **True DAO**: Token-weighted voting (more tokens = more voting power)
- **Automated Execution**: Proposals execute automatically when passed
- **Realms UI**: Has web interface at https://realms.today/
- **Flexible Voting**: Can configure quorum, thresholds, voting periods
- **Scalable**: Works for guilds with 10 or 10,000 members
- **Composable**: Can integrate with other DeFi protocols

### Disadvantages ❌
- **More Complex**: Requires token issuance and management
- **Token Distribution**: Need strategy for initial distribution
- **Voting Period**: Takes time (e.g., 3-7 days) before execution
- **Participation**: Low voter turnout can be an issue
- **Setup Cost**: More expensive to initialize (~0.1 SOL)

### Cost Estimate
- Realm creation: ~0.05 SOL (~$10)
- Governance creation: ~0.02 SOL (~$4)
- Token mint creation: ~0.01 SOL (~$2)
- Proposal creation: ~0.01 SOL per proposal
- Voting: ~0.000005 SOL per vote

---

## Option 3: Hybrid ICP + Solana (Chain Fusion Approach)

### Overview
Use ICP canisters to manage governance logic, but hold funds on Solana.

### How It Works

**Treasury Structure:**
```
ICP Canister (Governance Logic)
├── Stores proposals, votes, member data
├── Derives Solana address via threshold ECDSA
├── Signs Solana transactions when proposals pass
└── Executes transfers on Solana
```

### Implementation Steps

#### 1. **Guild Canister (ICP)**
```rust
// src/guild_canister/src/lib.rs

use ic_cdk::api::management_canister::ecdsa::{
    sign_with_ecdsa, SignWithEcdsaArgument, EcdsaKeyId
};

#[update]
async fn create_guild(guild_data: GuildData) -> Result<Guild, String> {
    // Derive Solana address for guild treasury
    let derivation_path = vec![b"guild".to_vec(), guild_id.as_bytes().to_vec()];
    let guild_solana_address = get_solana_address(derivation_path).await?;

    let guild = Guild {
        id: guild_id,
        treasury_address: guild_solana_address,
        members: vec![],
        proposals: vec![],
        governance_type: GuildGovernanceType::DAO,
        voting_threshold: 60, // 60% approval needed
    };

    GUILDS.with(|guilds| guilds.borrow_mut().insert(guild_id, guild.clone()));
    Ok(guild)
}

#[update]
async fn create_proposal(
    guild_id: String,
    title: String,
    amount: u64,
    recipient: String
) -> Result<Proposal, String> {
    // Store proposal
    let proposal = Proposal {
        id: generate_id(),
        title,
        amount,
        recipient,
        votes_for: 0,
        votes_against: 0,
        status: ProposalStatus::Active,
        deadline: ic_cdk::api::time() + (7 * 24 * 60 * 60 * 1_000_000_000), // 7 days
    };

    // Add to guild
    GUILDS.with(|guilds| {
        let mut guilds = guilds.borrow_mut();
        let guild = guilds.get_mut(&guild_id).ok_or("Guild not found")?;
        guild.proposals.push(proposal.clone());
        Ok(())
    })?;

    Ok(proposal)
}

#[update]
async fn vote_on_proposal(
    guild_id: String,
    proposal_id: String,
    vote: Vote
) -> Result<(), String> {
    let caller = ic_cdk::caller();

    // Verify membership
    let is_member = GUILDS.with(|guilds| {
        guilds.borrow()
            .get(&guild_id)
            .map(|g| g.members.contains(&caller))
            .unwrap_or(false)
    });

    if !is_member {
        return Err("Not a guild member".to_string());
    }

    // Record vote
    GUILDS.with(|guilds| {
        let mut guilds = guilds.borrow_mut();
        let guild = guilds.get_mut(&guild_id).ok_or("Guild not found")?;
        let proposal = guild.proposals.iter_mut()
            .find(|p| p.id == proposal_id)
            .ok_or("Proposal not found")?;

        match vote {
            Vote::For => proposal.votes_for += 1,
            Vote::Against => proposal.votes_against += 1,
        }

        // Check if threshold met
        let total_votes = proposal.votes_for + proposal.votes_against;
        let approval_rate = (proposal.votes_for as f64) / (total_votes as f64) * 100.0;

        if approval_rate >= guild.voting_threshold as f64 {
            proposal.status = ProposalStatus::Passed;
        }

        Ok(())
    })
}

#[update]
async fn execute_proposal(
    guild_id: String,
    proposal_id: String
) -> Result<String, String> {
    // Get proposal
    let proposal = GUILDS.with(|guilds| {
        guilds.borrow()
            .get(&guild_id)
            .and_then(|g| g.proposals.iter().find(|p| p.id == proposal_id).cloned())
            .ok_or("Proposal not found".to_string())
    })?;

    // Verify passed
    if proposal.status != ProposalStatus::Passed {
        return Err("Proposal has not passed".to_string());
    }

    // Create Solana transaction
    let transfer_tx = create_solana_transfer(
        &proposal.recipient,
        proposal.amount
    );

    // Sign with threshold ECDSA
    let derivation_path = vec![b"guild".to_vec(), guild_id.as_bytes().to_vec()];
    let signed_tx = sign_solana_transaction(transfer_tx, derivation_path).await?;

    // Submit to Solana (via HTTP outcall)
    let tx_hash = submit_solana_transaction(signed_tx).await?;

    // Update proposal status
    GUILDS.with(|guilds| {
        let mut guilds = guilds.borrow_mut();
        let guild = guilds.get_mut(&guild_id).ok_or("Guild not found")?;
        let proposal = guild.proposals.iter_mut()
            .find(|p| p.id == proposal_id)
            .ok_or("Proposal not found")?;

        proposal.status = ProposalStatus::Executed;
        proposal.tx_hash = Some(tx_hash.clone());
        Ok(())
    })?;

    Ok(tx_hash)
}
```

#### 2. **Frontend Integration**
```typescript
// frontend/src/services/guild.ts

import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "./guild_canister.did.js";

export class GuildService {
  private actor: any;

  constructor(canisterId: string) {
    const agent = new HttpAgent();
    this.actor = Actor.createActor(idlFactory, {
      agent,
      canisterId
    });
  }

  async createGuild(guildData: GuildData) {
    return await this.actor.create_guild(guildData);
  }

  async createProposal(guildId: string, proposalData: ProposalData) {
    return await this.actor.create_proposal(
      guildId,
      proposalData.title,
      proposalData.amount,
      proposalData.recipient
    );
  }

  async voteOnProposal(guildId: string, proposalId: string, vote: "for" | "against") {
    return await this.actor.vote_on_proposal(
      guildId,
      proposalId,
      { [vote]: null }
    );
  }

  async executeProposal(guildId: string, proposalId: string) {
    return await this.actor.execute_proposal(guildId, proposalId);
  }

  async getGuildTreasuryAddress(guildId: string): Promise<string> {
    const guild = await this.actor.get_guild(guildId);
    return guild.treasury_address;
  }
}
```

### Advantages ✅
- **Leverages Existing Infrastructure**: Uses OuroC's threshold ECDSA setup
- **Cheap Storage**: ICP storage is very affordable for proposal data
- **Fast Voting**: No on-chain voting costs
- **Familiar Architecture**: Matches current OuroC-Prima design
- **Secure**: ICP threshold ECDSA for signing
- **Flexible**: Can implement custom governance logic

### Disadvantages ❌
- **Custom Implementation**: Need to build everything from scratch
- **No Standard UI**: Unlike Squads/Realms which have existing interfaces
- **HTTP Outcall Dependency**: Relies on ICP HTTP outcalls to Solana
- **Auditing Required**: Custom smart contracts need security audits

---

## Comparison Matrix

| Feature | Squads Multisig | Realms DAO | ICP Hybrid |
|---------|----------------|------------|------------|
| **Setup Complexity** | 🟢 Low | 🟡 Medium | 🔴 High |
| **Cost** | 🟢 Very Low | 🟡 Medium | 🟢 Low |
| **Governance Flexibility** | 🟡 Limited | 🟢 High | 🟢 Very High |
| **Voting Speed** | 🟢 Fast | 🔴 Slow (3-7 days) | 🟢 Fast |
| **Member Scalability** | 🟡 Medium (10-20) | 🟢 High (unlimited) | 🟢 High |
| **Existing UI** | 🟢 Yes (Squads) | 🟢 Yes (Realms) | 🔴 No (build custom) |
| **Security** | 🟢 Battle-tested | 🟢 Battle-tested | 🟡 Needs audit |
| **Token Required** | 🔴 No | 🟢 Yes | 🟡 Optional |
| **Solana Native** | 🟢 Yes | 🟢 Yes | 🔴 No (ICP) |
| **Chain Fusion** | 🔴 No | 🔴 No | 🟢 Yes |

---

## Recommended Implementation Strategy

### Phase 1: MVP with Squads Multisig (RECOMMENDED)

**Why:**
- Fastest to implement
- Battle-tested and secure
- Very low cost
- Existing UI for members
- Perfect for guilds with 5-20 active decision makers

**Implementation:**
1. Create multisig when guild is created
2. Store multisig address in database
3. Members pay subscriptions to multisig address
4. Proposals trigger multisig transaction creation
5. Members sign via Squads UI or your custom interface
6. Execute when threshold is met

**Timeline:** 1-2 weeks

### Phase 2: Add Realms DAO Support (OPTIONAL)

**For guilds that need:**
- Large membership (50+ members)
- Token-weighted voting
- Automated execution
- Complex governance rules

**Timeline:** 3-4 weeks

### Phase 3: ICP Hybrid (FUTURE)

**When:**
- You want tight integration with OuroC-Prima
- Need custom governance logic
- Want to showcase chain fusion capabilities

**Timeline:** 6-8 weeks

---

## Subscription Payment Flow

### How Members Fund the Treasury

```
Member Subscription Payment
├── 1. Member subscribes to guild ($50/month)
├── 2. OuroC-Prima creates subscription
│   ├── Subscriber: Member wallet
│   ├── Merchant: Guild treasury address (multisig)
│   ├── Amount: $50 in USDC
│   └── Interval: 30 days
├── 3. ICP Timer triggers payment every 30 days
├── 4. Payment sent to guild treasury
└── 5. Treasury balance increases by $50
```

### Proposal Execution Flow

```
Proposal Execution
├── 1. Member creates proposal ($5000 for conference)
├── 2. Members vote (via multisig signatures or token votes)
├── 3. Threshold reached (e.g., 3 of 5 signers)
├── 4. Transaction executes
│   ├── From: Guild treasury
│   ├── To: Proposal recipient
│   └── Amount: $5000
└── 5. Treasury balance decreases by $5000
```

---

## Code Example: Complete Flow

### 1. Create Guild with Treasury
```typescript
import { Squads } from "@sqds/sdk";
import { Connection, PublicKey } from "@solana/web3.js";

async function createGuild(
  connection: Connection,
  creator: Keypair,
  guildData: {
    name: string;
    initialMembers: PublicKey[];
    threshold: number; // e.g., 3
  }
) {
  // 1. Create Squads multisig
  const squads = Squads.endpoint(connection, creator);
  const multisig = await squads.createMultisig(
    guildData.threshold,
    guildData.initialMembers,
    guildData.initialMembers.length
  );

  // 2. Save to database
  const guild = await db.guilds.create({
    name: guildData.name,
    treasuryAddress: multisig.publicKey.toString(),
    governanceType: "multisig",
    threshold: guildData.threshold,
    members: guildData.initialMembers.map(m => ({
      address: m.toString(),
      role: "member",
      votingPower: 1
    }))
  });

  return guild;
}
```

### 2. Member Joins and Subscribes
```typescript
async function joinGuild(
  member: PublicKey,
  guildId: string,
  subscriptionAmount: number
) {
  const guild = await db.guilds.findById(guildId);

  // Create subscription to guild treasury
  const subscription = await createSubscription({
    subscriber: member,
    merchant: new PublicKey(guild.treasuryAddress),
    amount: subscriptionAmount,
    tokenMint: USDC_MINT,
    interval: 30 * 24 * 60 * 60, // 30 days in seconds
    apiKey: "ouro_community_shared_2025_demo_key"
  });

  // Add member to guild
  await db.guilds.update(guildId, {
    $push: {
      members: {
        address: member.toString(),
        role: "member",
        votingPower: 1,
        joinedAt: new Date()
      }
    }
  });

  return subscription;
}
```

### 3. Create Proposal
```typescript
async function createProposal(
  guildId: string,
  proposer: PublicKey,
  proposalData: {
    title: string;
    description: string;
    amount: number;
    recipient: string;
  }
) {
  const guild = await db.guilds.findById(guildId);

  // Verify proposer is member
  const isMember = guild.members.some(m => m.address === proposer.toString());
  if (!isMember) throw new Error("Not a member");

  // Create proposal
  const proposal = await db.proposals.create({
    guildId,
    title: proposalData.title,
    description: proposalData.description,
    amount: proposalData.amount,
    recipient: proposalData.recipient,
    proposer: proposer.toString(),
    status: "active",
    votesFor: 0,
    votesAgainst: 0,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    createdAt: new Date()
  });

  return proposal;
}
```

### 4. Vote on Proposal (Multisig)
```typescript
async function voteOnProposal(
  member: Keypair,
  proposalId: string
) {
  const proposal = await db.proposals.findById(proposalId);
  const guild = await db.guilds.findById(proposal.guildId);

  // Create multisig transaction
  const squads = Squads.endpoint(connection, member);

  const transferInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(guild.treasuryAddress),
    toPubkey: new PublicKey(proposal.recipient),
    lamports: proposal.amount * LAMPORTS_PER_SOL
  });

  const transaction = await squads.createTransaction(
    new PublicKey(guild.treasuryAddress),
    1
  );

  await transaction.addInstruction(transferInstruction);
  await transaction.activate();

  // Member signs
  await squads.approveTransaction(
    new PublicKey(guild.treasuryAddress),
    transaction.index
  );

  // Update vote count
  await db.proposals.update(proposalId, {
    $inc: { votesFor: 1 }
  });

  // Check if threshold met
  const signatures = await squads.getTransactionSignatures(
    new PublicKey(guild.treasuryAddress),
    transaction.index
  );

  if (signatures.length >= guild.threshold) {
    await db.proposals.update(proposalId, {
      status: "passed"
    });
  }
}
```

### 5. Execute Proposal
```typescript
async function executeProposal(proposalId: string) {
  const proposal = await db.proposals.findById(proposalId);

  if (proposal.status !== "passed") {
    throw new Error("Proposal has not passed");
  }

  // Squads will auto-execute when threshold is met
  // Just update status in database
  await db.proposals.update(proposalId, {
    status: "executed",
    executedAt: new Date()
  });

  // Record transaction
  await db.transactions.create({
    guildId: proposal.guildId,
    type: "proposal_execution",
    amount: proposal.amount,
    from: guild.treasuryAddress,
    to: proposal.recipient,
    proposalId: proposalId,
    timestamp: new Date()
  });
}
```

---

## Summary & Recommendation

### For OuroC-Mesos MVP:

**Use Squads Protocol Multisig**

**Why:**
1. ✅ **Fast Integration**: 1-2 weeks vs months
2. ✅ **Battle-Tested**: Used by major Solana projects
3. ✅ **Low Cost**: ~$4 to setup, pennies per transaction
4. ✅ **Secure**: Industry standard
5. ✅ **Works with OuroC-Prima**: Subscriptions can pay to multisig address
6. ✅ **Has UI**: https://v3.squads.so/

**Implementation Priority:**
1. Week 1: Integrate Squads SDK for multisig creation
2. Week 2: Connect subscription payments to multisig addresses
3. Week 3: Build proposal → multisig transaction flow
4. Week 4: Add member signing interface

This gives you a production-ready guild treasury system that works TODAY.

For advanced features (token-weighted voting, automated execution), you can add Realms DAO support in Phase 2.

For ultimate chain fusion showcase, implement ICP hybrid in Phase 3.
