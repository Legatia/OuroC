/**
 * Aleph.im SDK Integration
 * Handles message posting and retrieval from Aleph network
 *
 * NOTE: Using Solana account for signing (Solana-first architecture)
 * EVM support was only for Arc preparation, production uses Solana
 */

import { solana } from 'aleph-sdk-ts/dist/accounts/index.js';
import { post } from 'aleph-sdk-ts/dist/messages/index.js';
import { ItemType } from 'aleph-sdk-ts/dist/messages/types/base.js';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import type { ContentMetadata, GuildMetadata, ProposalMetadata } from './types.js';

// Configuration
const ALEPH_CHANNEL = process.env.ALEPH_CHANNEL || 'OuroC-Mesos';
const ALEPH_API_URL = process.env.ALEPH_API_URL || 'https://api2.aleph.im';

// Message types
const MESSAGE_TYPES = {
  CONTENT: 'OuroC-Mesos-Content',
  GUILD: 'OuroC-Mesos-Guild',
  PROPOSAL: 'OuroC-Mesos-Proposal',
} as const;

/**
 * Initialize Aleph account from Solana private key
 *
 * Supports both formats:
 * - Base58 string: "5J8..." (from Phantom export)
 * - Byte array JSON: "[1,2,3,...]" (from solana-keygen)
 */
export function initAlephAccount() {
  const privateKey = process.env.SOLANA_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('SOLANA_PRIVATE_KEY not set in environment variables');
  }

  try {
    // Try to parse as Solana keypair
    let keypair: Keypair;
    let secretKey: Uint8Array;

    // Check if it's a byte array format "[1,2,3,...]"
    if (privateKey.startsWith('[')) {
      secretKey = new Uint8Array(JSON.parse(privateKey));
      keypair = Keypair.fromSecretKey(secretKey);
    }
    // Otherwise assume it's base58 format
    else {
      secretKey = bs58.decode(privateKey);
      keypair = Keypair.fromSecretKey(secretKey);
    }

    // Import into Aleph SDK (expects Uint8Array)
    const account = solana.ImportAccountFromPrivateKey(secretKey);

    console.log('✅ Aleph account initialized (Solana):', account.address);
    console.log('📍 Solana PublicKey:', keypair.publicKey.toString());
    return account;
  } catch (error) {
    console.error('❌ Failed to initialize Solana account:', error);
    throw new Error('Invalid SOLANA_PRIVATE_KEY format. Use base58 or byte array.');
  }
}

/**
 * Store content metadata on Aleph
 */
export async function storeContent(
  account: any,
  content: ContentMetadata
): Promise<{ hash: string }> {
  try {
    console.log('📤 Storing content on Aleph...', content.id);

    const message = await post.Publish({
      account,
      postType: MESSAGE_TYPES.CONTENT,
      channel: ALEPH_CHANNEL,
      content: content,
      storageEngine: ItemType.inline,
    });

    console.log('✅ Content stored on Aleph:', message.item_hash);
    return { hash: message.item_hash };
  } catch (error) {
    console.error('❌ Failed to store content:', error);
    throw error;
  }
}

/**
 * Store guild metadata on Aleph
 */
export async function storeGuild(
  account: any,
  guild: GuildMetadata
): Promise<{ hash: string }> {
  try {
    console.log('📤 Storing guild on Aleph...', guild.id);

    const message = await post.Publish({
      account,
      postType: MESSAGE_TYPES.GUILD,
      channel: ALEPH_CHANNEL,
      content: guild,
      storageEngine: ItemType.inline,
    });

    console.log('✅ Guild stored on Aleph:', message.item_hash);
    return { hash: message.item_hash };
  } catch (error) {
    console.error('❌ Failed to store guild:', error);
    throw error;
  }
}

/**
 * Store proposal metadata on Aleph
 */
export async function storeProposal(
  account: any,
  proposal: ProposalMetadata
): Promise<{ hash: string }> {
  try {
    console.log('📤 Storing proposal on Aleph...', proposal.id);

    const message = await post.Publish({
      account,
      postType: MESSAGE_TYPES.PROPOSAL,
      channel: ALEPH_CHANNEL,
      content: proposal,
      storageEngine: ItemType.inline,
    });

    console.log('✅ Proposal stored on Aleph:', message.item_hash);
    return { hash: message.item_hash };
  } catch (error) {
    console.error('❌ Failed to store proposal:', error);
    throw error;
  }
}

/**
 * Get all content from Aleph (read-only, no account needed)
 */
export async function getAllContent(): Promise<ContentMetadata[]> {
  try {
    const response = await fetch(
      `${ALEPH_API_URL}/api/v0/posts.json?types=${MESSAGE_TYPES.CONTENT}&channels=${ALEPH_CHANNEL}`
    );

    if (!response.ok) {
      throw new Error(`Aleph API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    const content = data.posts?.map((post: any) => post.content as ContentMetadata) || [];

    console.log(`✅ Fetched ${content.length} courses from Aleph`);
    return content;
  } catch (error) {
    console.error('❌ Failed to fetch content:', error);
    return [];
  }
}

/**
 * Get all guilds from Aleph
 */
export async function getAllGuilds(): Promise<GuildMetadata[]> {
  try {
    const response = await fetch(
      `${ALEPH_API_URL}/api/v0/posts.json?types=${MESSAGE_TYPES.GUILD}&channels=${ALEPH_CHANNEL}`
    );

    if (!response.ok) {
      throw new Error(`Aleph API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    const guilds = data.posts?.map((post: any) => post.content as GuildMetadata) || [];

    console.log(`✅ Fetched ${guilds.length} guilds from Aleph`);
    return guilds;
  } catch (error) {
    console.error('❌ Failed to fetch guilds:', error);
    return [];
  }
}

/**
 * Get all proposals from Aleph
 */
export async function getAllProposals(): Promise<ProposalMetadata[]> {
  try {
    const response = await fetch(
      `${ALEPH_API_URL}/api/v0/posts.json?types=${MESSAGE_TYPES.PROPOSAL}&channels=${ALEPH_CHANNEL}`
    );

    if (!response.ok) {
      throw new Error(`Aleph API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    const proposals = data.posts?.map((post: any) => post.content as ProposalMetadata) || [];

    console.log(`✅ Fetched ${proposals.length} proposals from Aleph`);
    return proposals;
  } catch (error) {
    console.error('❌ Failed to fetch proposals:', error);
    return [];
  }
}
