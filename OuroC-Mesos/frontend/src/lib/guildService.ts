/**
 * Guild Service
 *
 * Manages guild operations including treasury, proposals, and voting.
 * Integrates with Squads Protocol for multisig treasury management.
 * Uses Aleph.im for decentralized persistent storage.
 */

import { PublicKey } from "@solana/web3.js";
import { squadsService } from "./squadsService";
import { createSubscription } from "./backend";
import {
  storeGuild,
  getAllGuilds,
  getGuildById,
  storeProposal,
  getGuildProposals,
  type GuildMetadata,
  type ProposalMetadata,
} from "./alephDatabase";

// Types
export interface Guild {
  id: string;
  name: string;
  description: string;
  category: string;
  subscriptionPrice: number;
  interval: 'monthly' | 'quarterly' | 'yearly';
  treasuryAddress: string;
  governanceType: 'multisig' | 'dao';
  votingThreshold: number;
  threshold: number;
  memberCount: number;
  treasuryBalance: number;
  logoEmoji: string;
  tags: string[];
  membershipType: 'open' | 'approval-required' | 'invite-only';
  createdAt: Date;
}

export interface GuildMember {
  walletAddress: string;
  role: 'admin' | 'moderator' | 'member';
  votingPower: number;
  joinedAt: Date;
}

export interface Proposal {
  id: string;
  guildId: string;
  title: string;
  description: string;
  proposer: string;
  amount: number;
  recipient: string;
  votesFor: number;
  votesAgainst: number;
  totalVotingPower: number;
  status: 'active' | 'passed' | 'rejected' | 'executed';
  multisigTxIndex: number | null;
  deadline: Date;
  createdAt: Date;
  executedAt?: Date;
  txHash?: string;
}

export interface Transaction {
  id: string;
  guildId: string;
  type: 'subscription' | 'proposal_execution';
  amount: number;
  from: string;
  to: string;
  proposalId?: string;
  txHash: string;
  date: Date;
}

// Storage now handled by Aleph.im (decentralized database)
// Guilds: storeGuild(), getAllGuilds(), getGuildById()
// Proposals: storeProposal(), getGuildProposals()
// Members & Transactions: TODO - Add to alephDatabase.ts if needed

// In-memory cache for members, transactions, votes (until we add to Aleph)
const membersStore: Map<string, GuildMember[]> = new Map();
const transactionsStore: Map<string, Transaction[]> = new Map();
const votesStore: Map<string, Set<string>> = new Map(); // proposalId -> Set of voter addresses

// Helper functions
function generateId(): string {
  return 'id_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function intervalToSeconds(interval: string): number {
  switch (interval) {
    case 'monthly': return 30 * 24 * 60 * 60;
    case 'quarterly': return 90 * 24 * 60 * 60;
    case 'yearly': return 365 * 24 * 60 * 60;
    default: return 30 * 24 * 60 * 60;
  }
}

/**
 * Guild Service Class
 */
export class GuildService {
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
    votingThreshold: number;
    initialMembers: string[];
    creatorWallet: string;
    logoEmoji: string;
    tags: string[];
    membershipType: 'open' | 'approval-required' | 'invite-only';
  }): Promise<{ guild: Guild; multisigAddress: string }> {
    try {
      // Calculate threshold (e.g., 60% of 5 = 3 signatures)
      const threshold = Math.ceil(
        (params.votingThreshold / 100) * params.initialMembers.length
      );

      // Convert addresses to PublicKeys
      const memberPubkeys = params.initialMembers.map(addr => new PublicKey(addr));
      const creatorPubkey = new PublicKey(params.creatorWallet);

      // Create Squads multisig
      console.log(`🏗️ Creating guild with Squads multisig...`);
      const { multisigPda } = await squadsService.createMultisig(
        threshold,
        memberPubkeys,
        creatorPubkey
      );

      // Create guild metadata
      const guildId = generateId();

      // Prepare guild metadata for Aleph
      const guildMetadata: GuildMetadata = {
        id: guildId,
        name: params.name,
        description: params.description,
        category: params.category,
        treasuryAddress: multisigPda.toString(),
        subscriptionPrice: params.subscriptionPrice,
        interval: params.interval as 'weekly' | 'monthly' | 'quarterly', // Convert yearly to quarterly for now
        threshold: threshold,
        members: params.initialMembers,
        logoEmoji: params.logoEmoji,
        tags: params.tags,
        createdAt: Date.now(),
      };

      // Store in Aleph.im (decentralized storage)
      console.log('💾 Storing guild in Aleph.im...');
      const storeResult = await storeGuild(guildMetadata);

      if (!storeResult.success) {
        throw new Error(storeResult.error || 'Failed to store guild in Aleph');
      }

      console.log('✅ Guild stored in Aleph.im:', storeResult.hash);

      // Create local Guild object for return
      const guild: Guild = {
        id: guildId,
        name: params.name,
        description: params.description,
        category: params.category,
        subscriptionPrice: params.subscriptionPrice,
        interval: params.interval,
        treasuryAddress: multisigPda.toString(),
        governanceType: params.governanceType,
        votingThreshold: params.votingThreshold,
        threshold: threshold,
        memberCount: params.initialMembers.length,
        treasuryBalance: 0,
        logoEmoji: params.logoEmoji,
        tags: params.tags,
        membershipType: params.membershipType,
        createdAt: new Date()
      };

      // Add initial members
      const members: GuildMember[] = params.initialMembers.map(addr => ({
        walletAddress: addr,
        role: addr === params.creatorWallet ? 'admin' : 'member',
        votingPower: 1,
        joinedAt: new Date()
      }));

      membersStore.set(guildId, members);
      proposalsStore.set(guildId, []);
      transactionsStore.set(guildId, []);

      console.log(`✅ Guild created: ${guildId}`);
      console.log(`   Treasury: ${multisigPda.toString()}`);
      console.log(`   Threshold: ${threshold}/${params.initialMembers.length}`);

      return {
        guild,
        multisigAddress: multisigPda.toString()
      };
    } catch (error) {
      console.error("Failed to create guild:", error);
      throw error;
    }
  }

  /**
   * Get guild by ID (from Aleph)
   */
  async getGuild(guildId: string): Promise<Guild | null> {
    try {
      console.log('📖 Fetching guild from Aleph:', guildId);
      const result = await getGuildById(guildId);

      if (!result.success || !result.data) {
        return null;
      }

      // Convert GuildMetadata to Guild
      const metadata = result.data;
      const guild: Guild = {
        id: metadata.id,
        name: metadata.name,
        description: metadata.description,
        category: metadata.category,
        subscriptionPrice: metadata.subscriptionPrice,
        interval: metadata.interval === 'weekly' ? 'monthly' : metadata.interval, // Map back
        treasuryAddress: metadata.treasuryAddress,
        governanceType: 'multisig', // Default for now
        votingThreshold: 60, // Default for now
        threshold: metadata.threshold,
        memberCount: metadata.members.length,
        treasuryBalance: 0, // TODO: Fetch from blockchain
        logoEmoji: metadata.logoEmoji || '🏰',
        tags: metadata.tags || [],
        membershipType: 'open', // Default for now
        createdAt: new Date(metadata.createdAt)
      };

      return guild;
    } catch (error) {
      console.error('Failed to fetch guild:', error);
      return null;
    }
  }

  /**
   * Get all guilds (from Aleph)
   */
  async getAllGuilds(): Promise<Guild[]> {
    try {
      console.log('📖 Fetching all guilds from Aleph...');
      const result = await getAllGuilds();

      if (!result.success || !result.data) {
        console.log('No guilds found in Aleph, returning empty array');
        return [];
      }

      // Convert GuildMetadata[] to Guild[]
      const guilds: Guild[] = result.data.map(metadata => ({
        id: metadata.id,
        name: metadata.name,
        description: metadata.description,
        category: metadata.category,
        subscriptionPrice: metadata.subscriptionPrice,
        interval: metadata.interval === 'weekly' ? 'monthly' : metadata.interval,
        treasuryAddress: metadata.treasuryAddress,
        governanceType: 'multisig',
        votingThreshold: 60,
        threshold: metadata.threshold,
        memberCount: metadata.members.length,
        treasuryBalance: 0,
        logoEmoji: metadata.logoEmoji || '🏰',
        tags: metadata.tags || [],
        membershipType: 'open',
        createdAt: new Date(metadata.createdAt)
      }));

      console.log(`✅ Loaded ${guilds.length} guilds from Aleph`);
      return guilds;
    } catch (error) {
      console.error('Failed to fetch guilds:', error);
      return [];
    }
  }

  /**
   * Join guild (creates subscription to treasury)
   */
  async joinGuild(params: {
    guildId: string;
    memberWallet: string;
  }): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    try {
      // Fetch guild from Aleph
      const guild = await this.getGuild(params.guildId);
      if (!guild) {
        return { success: false, error: "Guild not found" };
      }

      const members = membersStore.get(params.guildId) || [];

      // Check if already a member
      const existingMember = members.find(m => m.walletAddress === params.memberWallet);
      if (existingMember) {
        return { success: false, error: "Already a guild member" };
      }

      // Create subscription to guild treasury
      console.log(`💳 Creating subscription to guild treasury...`);
      const result = await createSubscription(
        params.memberWallet,          // subscriber
        guild.treasuryAddress,        // merchant (guild treasury)
        guild.subscriptionPrice,      // amount
        intervalToSeconds(guild.interval), // interval
        guild.name                    // merchant name
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Add member
      const newMember: GuildMember = {
        walletAddress: params.memberWallet,
        role: 'member',
        votingPower: 1,
        joinedAt: new Date()
      };

      members.push(newMember);
      membersStore.set(params.guildId, members);

      // Update member count
      guild.memberCount = members.length;
      guildsStore.set(params.guildId, guild);

      console.log(`✅ Member joined guild: ${params.memberWallet.slice(0, 8)}...`);

      return {
        success: true,
        subscriptionId: result.subscriptionId
      };
    } catch (error) {
      console.error("Failed to join guild:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get guild members
   */
  async getGuildMembers(guildId: string): Promise<GuildMember[]> {
    return membersStore.get(guildId) || [];
  }

  /**
   * Check if wallet is a member
   */
  async isMember(guildId: string, walletAddress: string): Promise<boolean> {
    const members = membersStore.get(guildId) || [];
    return members.some(m => m.walletAddress === walletAddress);
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
  }): Promise<{ success: boolean; proposal?: Proposal; error?: string }> {
    try {
      // Fetch guild from Aleph
      const guild = await this.getGuild(params.guildId);
      if (!guild) {
        return { success: false, error: "Guild not found" };
      }

      // Verify proposer is member
      const isMember = await this.isMember(params.guildId, params.proposer);
      if (!isMember) {
        return { success: false, error: "Only guild members can create proposals" };
      }

      // Verify sufficient balance
      if (params.amount > guild.treasuryBalance) {
        return { success: false, error: "Insufficient treasury balance" };
      }

      // Get total voting power
      const members = membersStore.get(params.guildId) || [];
      const totalVotingPower = members.reduce((sum, m) => sum + m.votingPower, 0);

      // Create proposal
      const proposalId = generateId();

      // Prepare proposal metadata for Aleph
      const proposalMetadata: ProposalMetadata = {
        id: proposalId,
        guildId: params.guildId,
        title: params.title,
        description: params.description,
        amount: params.amount,
        recipient: params.recipient,
        createdBy: params.proposer,
        createdAt: Date.now(),
        status: 'active',
        votesFor: 0,
        votesAgainst: 0,
        multisigTxIndex: undefined,
      };

      // Store in Aleph.im
      console.log('💾 Storing proposal in Aleph.im...');
      const storeResult = await storeProposal(proposalMetadata);

      if (!storeResult.success) {
        throw new Error(storeResult.error || 'Failed to store proposal in Aleph');
      }

      console.log('✅ Proposal stored in Aleph.im:', storeResult.hash);

      // Create local Proposal object for return
      const proposal: Proposal = {
        id: proposalId,
        guildId: params.guildId,
        title: params.title,
        description: params.description,
        proposer: params.proposer,
        amount: params.amount,
        recipient: params.recipient,
        votesFor: 0,
        votesAgainst: 0,
        totalVotingPower: totalVotingPower,
        status: 'active',
        multisigTxIndex: null,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date()
      };

      // Initialize vote tracking (still in-memory for now)
      votesStore.set(proposalId, new Set());

      console.log(`✅ Proposal created: ${proposalId}`);
      console.log(`   Title: ${params.title}`);
      console.log(`   Amount: $${params.amount}`);

      return { success: true, proposal };
    } catch (error) {
      console.error("Failed to create proposal:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Vote on proposal
   */
  async voteOnProposal(params: {
    proposalId: string;
    voterWallet: string;
    vote: 'for' | 'against';
  }): Promise<{ success: boolean; proposal?: Proposal; error?: string }> {
    try {
      // Find proposal
      let proposal: Proposal | undefined;
      let guildId: string | undefined;

      for (const [id, proposals] of proposalsStore.entries()) {
        const found = proposals.find(p => p.id === params.proposalId);
        if (found) {
          proposal = found;
          guildId = id;
          break;
        }
      }

      if (!proposal || !guildId) {
        return { success: false, error: "Proposal not found" };
      }

      const guild = guildsStore.get(guildId);
      if (!guild) {
        return { success: false, error: "Guild not found" };
      }

      // Verify voter is member
      const isMember = await this.isMember(guildId, params.voterWallet);
      if (!isMember) {
        return { success: false, error: "Only guild members can vote" };
      }

      // Check if already voted
      const voters = votesStore.get(params.proposalId) || new Set();
      if (voters.has(params.voterWallet)) {
        return { success: false, error: "Already voted on this proposal" };
      }

      // If voting "for" and transaction doesn't exist, create it
      if (params.vote === 'for' && !proposal.multisigTxIndex) {
        const voterPubkey = new PublicKey(params.voterWallet);
        const recipientPubkey = new PublicKey(proposal.recipient);
        const multisigPda = new PublicKey(guild.treasuryAddress);

        const { transactionIndex } = await squadsService.createTransaction(
          multisigPda,
          recipientPubkey,
          proposal.amount,
          voterPubkey
        );

        proposal.multisigTxIndex = transactionIndex;
      }

      // Sign transaction
      const voterPubkey = new PublicKey(params.voterWallet);
      const multisigPda = new PublicKey(guild.treasuryAddress);

      if (params.vote === 'for') {
        await squadsService.approveTransaction(
          multisigPda,
          proposal.multisigTxIndex!,
          voterPubkey
        );
        proposal.votesFor += 1;
      } else {
        await squadsService.rejectTransaction(
          multisigPda,
          proposal.multisigTxIndex!,
          voterPubkey
        );
        proposal.votesAgainst += 1;
      }

      // Record vote
      voters.add(params.voterWallet);
      votesStore.set(params.proposalId, voters);

      // Check if threshold met
      const approvalRate = (proposal.votesFor / proposal.totalVotingPower) * 100;

      if (approvalRate >= guild.votingThreshold) {
        proposal.status = 'passed';
        console.log(`🎉 Proposal passed! (${proposal.votesFor}/${proposal.totalVotingPower} votes, ${approvalRate.toFixed(1)}%)`);

        // Auto-execute if ready
        const isReady = await squadsService.isReadyToExecute(
          multisigPda,
          proposal.multisigTxIndex!
        );

        if (isReady) {
          await this.executeProposal({ proposalId: params.proposalId });
        }
      }

      // Update proposal in store
      const proposals = proposalsStore.get(guildId) || [];
      const index = proposals.findIndex(p => p.id === params.proposalId);
      if (index !== -1) {
        proposals[index] = proposal;
        proposalsStore.set(guildId, proposals);
      }

      console.log(`✅ Vote recorded: ${params.vote}`);
      console.log(`   Current tally: ${proposal.votesFor} for, ${proposal.votesAgainst} against`);

      return { success: true, proposal };
    } catch (error) {
      console.error("Failed to vote on proposal:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Execute passed proposal
   */
  async executeProposal(params: {
    proposalId: string;
  }): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      // Find proposal
      let proposal: Proposal | undefined;
      let guildId: string | undefined;

      for (const [id, proposals] of proposalsStore.entries()) {
        const found = proposals.find(p => p.id === params.proposalId);
        if (found) {
          proposal = found;
          guildId = id;
          break;
        }
      }

      if (!proposal || !guildId) {
        return { success: false, error: "Proposal not found" };
      }

      if (proposal.status !== 'passed') {
        return { success: false, error: "Proposal has not passed" };
      }

      const guild = guildsStore.get(guildId);
      if (!guild) {
        return { success: false, error: "Guild not found" };
      }

      // Execute transaction
      const multisigPda = new PublicKey(guild.treasuryAddress);
      const executorPubkey = new PublicKey(proposal.proposer); // Any member can execute

      const signature = await squadsService.executeTransaction(
        multisigPda,
        proposal.multisigTxIndex!,
        executorPubkey
      );

      // Update proposal
      proposal.status = 'executed';
      proposal.executedAt = new Date();
      proposal.txHash = signature;

      // Update treasury balance
      guild.treasuryBalance -= proposal.amount;
      guildsStore.set(guildId, guild);

      // Record transaction
      const transaction: Transaction = {
        id: generateId(),
        guildId: guildId,
        type: 'proposal_execution',
        amount: proposal.amount,
        from: guild.treasuryAddress,
        to: proposal.recipient,
        proposalId: params.proposalId,
        txHash: signature,
        date: new Date()
      };

      const transactions = transactionsStore.get(guildId) || [];
      transactions.push(transaction);
      transactionsStore.set(guildId, transactions);

      // Update proposal in store
      const proposals = proposalsStore.get(guildId) || [];
      const index = proposals.findIndex(p => p.id === params.proposalId);
      if (index !== -1) {
        proposals[index] = proposal;
        proposalsStore.set(guildId, proposals);
      }

      console.log(`🎉 Proposal executed!`);
      console.log(`   Signature: ${signature.slice(0, 16)}...`);

      return { success: true, signature };
    } catch (error) {
      console.error("Failed to execute proposal:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get guild proposals
   */
  async getGuildProposals(guildId: string): Promise<Proposal[]> {
    return proposalsStore.get(guildId) || [];
  }

  /**
   * Get guild transactions
   */
  async getGuildTransactions(guildId: string): Promise<Transaction[]> {
    return transactionsStore.get(guildId) || [];
  }

  /**
   * Update treasury balance from blockchain
   */
  async updateTreasuryBalance(guildId: string): Promise<number> {
    try {
      const guild = guildsStore.get(guildId);
      if (!guild) {
        throw new Error("Guild not found");
      }

      const balance = await squadsService.getBalance(new PublicKey(guild.treasuryAddress));

      guild.treasuryBalance = balance;
      guildsStore.set(guildId, guild);

      return balance;
    } catch (error) {
      console.error("Failed to update treasury balance:", error);
      return 0;
    }
  }
}

// Export singleton instance
export const guildService = new GuildService();
