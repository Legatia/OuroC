/**
 * Merchant Multisig Flow
 * Grid multisig account creation for merchant treasury
 *
 * Key Point: Grid multisig pubkey is just a regular Solana address
 * OuroC smart contracts treat it identically to a wallet address
 */

import { PublicKey } from '@solana/web3.js';
import { GridClient } from '../api/GridClient';

export interface MerchantMultisigConfig {
  gridClient: GridClient;
}

export interface MultisigSignerInfo {
  name: string;        // e.g., "CEO", "CFO", "CTO"
  publicKey: PublicKey;
  email?: string;      // Optional: for Grid notifications
}

export interface CreateMultisigMerchantParams {
  signers: MultisigSignerInfo[];
  threshold: number;   // M-of-N (e.g., 2 for 2-of-3)
  merchantName?: string;
  description?: string;
}

export interface MerchantMultisigResult {
  gridAccountId: string;           // Grid's internal account ID
  merchantAddress: PublicKey;       // Use this in OuroC smart contract!
  signers: PublicKey[];
  threshold: number;
  createdAt: Date;
}

export class MerchantMultisigFlow {
  private gridClient: GridClient;

  constructor(config: MerchantMultisigConfig) {
    this.gridClient = config.gridClient;
  }

  /**
   * Create Grid multisig account for merchant
   * Returns a Solana public key that can be used as merchant address in OuroC
   */
  async createMultisigMerchant(
    params: CreateMultisigMerchantParams
  ): Promise<MerchantMultisigResult> {
    console.log('[Grid] Creating multisig merchant account');
    console.log(`[Grid] Signers: ${params.signers.length}, Threshold: ${params.threshold}`);

    // Validate threshold
    if (params.threshold < 1 || params.threshold > params.signers.length) {
      throw new Error(
        `Invalid threshold: ${params.threshold}. Must be between 1 and ${params.signers.length}`
      );
    }

    // Create Grid multisig account
    const gridAccount = await this.gridClient.createSignerAccount({
      type: 'signers',
      signers: params.signers.map(s => s.publicKey.toString()),
      threshold: params.threshold,
      account_type: 'USDC',
      name: params.merchantName,
      description: params.description,
    });

    console.log(`[Grid] ✅ Multisig account created: ${gridAccount.account_id}`);
    console.log(`[Grid] Merchant address: ${gridAccount.public_key}`);
    console.log(`[Grid] Threshold: ${params.threshold}/${params.signers.length}`);

    return {
      gridAccountId: gridAccount.account_id,
      merchantAddress: new PublicKey(gridAccount.public_key), // ← Use in OuroC!
      signers: params.signers.map(s => s.publicKey),
      threshold: params.threshold,
      createdAt: new Date(),
    };
  }

  /**
   * Get merchant address from existing Grid multisig account
   */
  async getMerchantAddress(gridAccountId: string): Promise<PublicKey> {
    const account = await this.gridClient.getAccount(gridAccountId);
    return new PublicKey(account.public_key);
  }

  /**
   * Get multisig account details
   */
  async getMultisigDetails(gridAccountId: string) {
    const account = await this.gridClient.getAccount(gridAccountId);

    return {
      accountId: account.account_id,
      merchantAddress: new PublicKey(account.public_key),
      signers: account.signers?.map(s => new PublicKey(s)) || [],
      threshold: account.threshold || 0,
      balance: account.balance,
    };
  }

  /**
   * Get merchant USDC balance
   */
  async getBalance(gridAccountId: string): Promise<string> {
    return await this.gridClient.getAccountBalance(gridAccountId);
  }

  /**
   * Update multisig configuration (add/remove signers, change threshold)
   */
  async updateMultisigConfig(
    gridAccountId: string,
    updates: {
      signers?: PublicKey[];
      threshold?: number;
      name?: string;
      description?: string;
    }
  ): Promise<void> {
    console.log(`[Grid] Updating multisig configuration for ${gridAccountId}`);

    await this.gridClient.updateMultisigConfig(gridAccountId, {
      signers: updates.signers?.map(pk => pk.toString()),
      threshold: updates.threshold,
      name: updates.name,
      description: updates.description,
    });

    console.log(`[Grid] ✅ Multisig configuration updated`);
  }

  /**
   * Get pending approval requests (withdrawals, config changes, etc.)
   */
  async getPendingApprovals(gridAccountId: string) {
    return await this.gridClient.getPendingApprovals(gridAccountId);
  }

  /**
   * Helper: Validate signer public keys
   */
  validateSigners(signers: MultisigSignerInfo[]): boolean {
    if (signers.length < 2) {
      throw new Error('Multisig requires at least 2 signers');
    }

    if (signers.length > 10) {
      throw new Error('Maximum 10 signers allowed');
    }

    // Check for duplicate public keys
    const uniqueKeys = new Set(signers.map(s => s.publicKey.toString()));
    if (uniqueKeys.size !== signers.length) {
      throw new Error('Duplicate signer public keys detected');
    }

    return true;
  }

  /**
   * Helper: Calculate recommended threshold based on signer count
   */
  getRecommendedThreshold(signerCount: number): number {
    // Security best practices:
    // 2 signers → 2-of-2 (100% consensus)
    // 3 signers → 2-of-3 (66% consensus)
    // 4-5 signers → 3-of-N (60% consensus)
    // 6+ signers → ceil(N * 0.6)

    if (signerCount === 2) return 2;
    if (signerCount === 3) return 2;
    if (signerCount <= 5) return 3;
    return Math.ceil(signerCount * 0.6);
  }
}

/**
 * Usage Example:
 *
 * // 1. Merchant team creates multisig
 * const multisigFlow = new MerchantMultisigFlow({ gridClient });
 *
 * const result = await multisigFlow.createMultisigMerchant({
 *   signers: [
 *     { name: 'CEO', publicKey: ceo_pubkey },
 *     { name: 'CFO', publicKey: cfo_pubkey },
 *     { name: 'CTO', publicKey: cto_pubkey }
 *   ],
 *   threshold: 2, // 2-of-3 signatures required
 *   merchantName: 'Acme Corp Treasury',
 *   description: 'Main merchant account for OuroC subscriptions'
 * });
 *
 * // 2. Use merchant address in OuroC (SAME AS WALLET!)
 * const merchantAddress = result.merchantAddress;
 *
 * // 3. Register in OuroC smart contract
 * await ouroCProgram.methods.registerMerchant(
 *   merchantAddress, // ← Grid multisig pubkey (just a regular Solana address)
 *   merchantName,
 *   // ... other params
 * ).rpc();
 *
 * // 4. Subscribers create subscriptions
 * await ouroCProgram.methods.createSubscription(
 *   subscriptionId,
 *   amount,
 *   interval,
 *   merchantAddress, // ← Grid multisig address (OuroC doesn't care it's multisig!)
 *   subscriberPubkey,
 *   // ...
 * ).rpc();
 *
 * // 5. ICP timer triggers payments → Grid multisig (works identically!)
 * // Payments accumulate in Grid multisig account
 *
 * // 6. Merchant withdraws (Grid handles multisig approval)
 * // - CEO logs into Grid dashboard → Approves withdrawal
 * // - CFO logs into Grid dashboard → Approves withdrawal
 * // - Grid executes withdrawal (2-of-3 threshold met)
 * // OuroC never involved in withdrawal - that's Grid's responsibility!
 */
