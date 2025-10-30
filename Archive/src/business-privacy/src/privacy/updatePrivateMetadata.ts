/**
 * Update encrypted subscription metadata
 */

import type { OuroCClient } from '../OuroCClient';
import {
  encryptSubscriptionMetadata,
  type SubscriptionMetadata,
} from '../encryption';

/**
 * Update encrypted metadata for subscription
 *
 * Re-encrypts the metadata and updates both ICP storage and Solana hash
 *
 * @param client - OuroC SDK client instance
 * @param subscriptionId - Subscription ID
 * @param metadata - New metadata to encrypt and store
 * @param encryptionKey - Encryption key
 * @throws Error if update fails
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
 * await Enterprise.updatePrivateMetadata(client, 'sub_123', {
 *   name: 'Netflix Premium',
 *   userIdentifier: 'newemail@example.com',
 *   merchantNotes: 'Updated email',
 *   tags: ['streaming'],
 * }, encryptionKey);
 * ```
 */
export async function updatePrivateMetadata(
  client: OuroCClient,
  subscriptionId: string,
  metadata: SubscriptionMetadata,
  encryptionKey: CryptoKey
): Promise<void> {
  // Encrypt metadata
  const { encrypted, hash } = await encryptSubscriptionMetadata(
    metadata,
    encryptionKey
  );

  // Update in ICP canister
  const result = await client.icpActor.store_encrypted_metadata(
    subscriptionId,
    Buffer.from(JSON.stringify(encrypted)),
    Buffer.from(encrypted.iv, 'base64'),
    hash,
    encrypted.version
  );

  if ('err' in result) {
    throw new Error(`Failed to update metadata: ${result.err}`);
  }

  // Update Solana hash (optional, for verification)
  try {
    await client.program.methods
      .updateSubscriptionPrivacy(Array.from(Buffer.from(hash, 'base64')))
      .accounts({
        subscription: subscriptionId,
        authority: client.wallet.publicKey,
      })
      .rpc();
  } catch (error) {
    console.error('Error updating Solana hash:', error);
    // Not critical - hash stored in ICP
  }
}
