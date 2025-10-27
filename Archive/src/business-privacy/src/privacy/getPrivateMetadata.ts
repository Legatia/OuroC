/**
 * Retrieve and decrypt subscription metadata
 */

import type { OuroCClient } from '../OuroCClient';
import {
  decryptSubscriptionMetadata,
  type SubscriptionMetadata,
  type EncryptedData,
} from '../encryption';

/**
 * Retrieve encrypted metadata for subscription and decrypt
 *
 * @param client - OuroC SDK client instance
 * @param subscriptionId - Subscription ID
 * @param decryptionKey - Decryption key (must match encryption key)
 * @returns Decrypted subscription metadata
 * @throws Error if metadata not found or decryption fails
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
 * const metadata = await Enterprise.getPrivateMetadata(
 *   client,
 *   'sub_123',
 *   encryptionKey
 * );
 *
 * console.log(metadata.name); // "Netflix Premium"
 * ```
 */
export async function getPrivateMetadata(
  client: OuroCClient,
  subscriptionId: string,
  decryptionKey: CryptoKey
): Promise<SubscriptionMetadata> {
  // Fetch from ICP canister
  const result = await client.icpActor.get_encrypted_metadata(subscriptionId);

  if ('err' in result) {
    throw new Error(`Failed to get metadata: ${result.err}`);
  }

  const encryptedMetadata = result.ok;

  // Parse encrypted data
  const encrypted: EncryptedData = JSON.parse(
    Buffer.from(encryptedMetadata.encrypted_data).toString('utf-8')
  );

  // Decrypt and verify hash
  const metadata = await decryptSubscriptionMetadata(
    encrypted,
    decryptionKey,
    encryptedMetadata.data_hash // Verify integrity
  );

  return metadata;
}
