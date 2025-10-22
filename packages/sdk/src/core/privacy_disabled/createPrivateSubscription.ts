/**
 * Create a subscription with encrypted metadata
 */

import type { OuroCClient } from '../OuroCClient';
import {
  encryptSubscriptionMetadata,
  type SubscriptionMetadata,
} from '../encryption';

export interface CreatePrivateSubscriptionParams {
  merchant: string;
  amount: number;
  interval: number;
  token: string;
  metadata: SubscriptionMetadata;
  encryptionKey: CryptoKey;
}

export interface Subscription {
  id: string;
  publicKey: string;
  merchant: string;
  amount: number;
  interval: number;
  token: string;
  status: 'active' | 'paused' | 'cancelled';
}

/**
 * Create subscription with encrypted metadata
 *
 * @param client - OuroC SDK client instance
 * @param params - Subscription parameters with metadata
 * @returns Created subscription with encrypted metadata stored off-chain
 *
 * @example
 * ```typescript
 * import { OuroCClient } from '@ouroc/sdk';
 * import * as Enterprise from '@ouroc/sdk/enterprise';
 *
 * const client = new OuroCClient({ wallet });
 * const encryptionKey = await Enterprise.deriveEncryptionKey(
 *   wallet.publicKey,
 *   (msg) => wallet.signMessage(msg)
 * );
 *
 * const subscription = await Enterprise.createPrivateSubscription(client, {
 *   merchant: 'MERCHANT_PUBKEY',
 *   amount: 10_000000, // 10 USDC
 *   interval: 30 * 24 * 60 * 60, // 30 days
 *   token: 'USDC_MINT',
 *   metadata: {
 *     name: 'Netflix Premium',
 *     userIdentifier: 'user@example.com',
 *     tags: ['streaming'],
 *   },
 *   encryptionKey,
 * });
 * ```
 */
export async function createPrivateSubscription(
  client: OuroCClient,
  params: CreatePrivateSubscriptionParams
): Promise<Subscription> {
  // 1. Create standard subscription on Solana
  const subscription = await client.createSubscription({
    merchant: params.merchant,
    amount: params.amount,
    interval: params.interval,
    token: params.token,
  });

  // 2. Encrypt metadata
  const { encrypted, hash } = await encryptSubscriptionMetadata(
    params.metadata,
    params.encryptionKey
  );

  // 3. Store in ICP canister
  try {
    const result = await client.icpActor.store_encrypted_metadata(
      subscription.id,
      Buffer.from(JSON.stringify(encrypted)),
      Buffer.from(encrypted.iv, 'base64'),
      hash,
      encrypted.version
    );

    if ('err' in result) {
      console.error('Failed to store encrypted metadata:', result.err);
      // Subscription still created, just without metadata
    }
  } catch (error) {
    console.error('Error storing encrypted metadata:', error);
    // Continue - subscription is still valid
  }

  // 4. Update Solana contract with hash (optional, for verification)
  try {
    await client.program.methods
      .updateSubscriptionPrivacy(Array.from(Buffer.from(hash, 'base64')))
      .accounts({
        subscription: subscription.publicKey,
        authority: client.wallet.publicKey,
      })
      .rpc();
  } catch (error) {
    console.error('Error updating Solana hash:', error);
    // Not critical - hash stored in ICP
  }

  return subscription;
}
