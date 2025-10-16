/**
 * Delete encrypted subscription metadata (GDPR compliance)
 */

import type { OuroCClient } from '../OuroCClient';

/**
 * Delete encrypted metadata for subscription
 *
 * Permanently removes encrypted metadata from ICP canister.
 * Subscription remains active on Solana (cannot delete on-chain state).
 *
 * This implements GDPR "Right to Erasure" for off-chain data.
 *
 * @param client - OuroC SDK client instance
 * @param subscriptionId - Subscription ID
 * @throws Error if deletion fails
 *
 * @example
 * ```typescript
 * import { OuroCClient } from '@ouroc/sdk';
 * import * as Enterprise from '@ouroc/sdk/enterprise';
 *
 * const client = new OuroCClient({ wallet });
 *
 * // Delete encrypted metadata (GDPR compliance)
 * await Enterprise.deletePrivateMetadata(client, 'sub_123');
 *
 * // Subscription still active on Solana
 * // Only off-chain metadata is deleted
 * ```
 */
export async function deletePrivateMetadata(
  client: OuroCClient,
  subscriptionId: string
): Promise<void> {
  const result = await client.icpActor.delete_encrypted_metadata(subscriptionId);

  if ('err' in result) {
    throw new Error(`Failed to delete metadata: ${result.err}`);
  }
}
