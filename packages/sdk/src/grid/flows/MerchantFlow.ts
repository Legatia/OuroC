/**
 * Merchant Flow: Grid Multisig Account → OuroC Merchant Address (Unchanged)
 *
 * Grid Integration Points:
 * 1. Multisig account creation - Security improvement
 * 2. Configurable signing threshold - Enterprise feature
 * 3. Grid account = merchant address in OuroC
 * 4. OuroC sends payments to Grid multisig - UNCHANGED
 * 5. Merchant team approves withdrawals via Grid - Additional security layer
 *
 * Flow:
 * 1. Merchant creates Grid multisig account
 * 2. Configure signing threshold (e.g., 2-of-3)
 * 3. Grid multisig pubkey = merchant address in OuroC
 * 4. OuroC subscription sends payments to Grid multisig (existing logic)
 * 5. Merchant team approves withdrawals through Grid dashboard
 */

import { PublicKey } from '@solana/web3.js';
import { GridClient } from '../api/GridClient';
import { MultisigConfig, MultisigAccount, SpendingLimit } from '../types/grid';

export interface MerchantFlowConfig {
  gridClient: GridClient;
}

export interface CreateMerchantParams {
  signers: PublicKey[]; // Team member public keys
  threshold: number; // Required signatures (e.g., 2 for 2-of-3)
  name?: string;
  description?: string;
}

export interface MerchantFlowResult {
  multisigAccount: MultisigAccount;
  merchantPublicKey: PublicKey; // Use this as merchant address in OuroC
}

export class MerchantFlow {
  private gridClient: GridClient;

  constructor(config: MerchantFlowConfig) {
    this.gridClient = config.gridClient;
  }

  /**
   * Step 1: Create Grid multisig account for merchant
   * Returns multisig account that can be used as OuroC merchant
   */
  async createMerchant(params: CreateMerchantParams): Promise<MerchantFlowResult> {
    console.log(`[Grid] Creating merchant multisig account`);
    console.log(`[Grid] Signers: ${params.signers.length}, Threshold: ${params.threshold}`);

    // First create a base signer account for the multisig
    const baseAccount = await this.gridClient.createSignerAccount({
      type: 'signer',
      signer_public_key: params.signers[0].toString(),
      account_type: 'USDC'
    });

    // Configure as multisig
    const multisigConfig: MultisigConfig = {
      account_id: baseAccount.account_id,
      signers: params.signers.map(pk => pk.toString()),
      threshold: params.threshold,
      name: params.name,
      description: params.description,
    };

    const multisigAccount = await this.gridClient.createMultisigAccount(multisigConfig);

    console.log(`[Grid] ✅ Multisig account created: ${multisigAccount.account_id}`);
    console.log(`[Grid] Public key: ${multisigAccount.public_key}`);
    console.log(`[Grid] Threshold: ${multisigAccount.threshold}/${multisigAccount.signers.length}`);

    return {
      multisigAccount,
      merchantPublicKey: new PublicKey(multisigAccount.public_key),
    };
  }

  /**
   * Get merchant's public key (for creating OuroC subscription)
   */
  async getMerchantPublicKey(gridAccountId: string): Promise<PublicKey> {
    const account = await this.gridClient.getAccount(gridAccountId);
    return new PublicKey(account.public_key);
  }

  /**
   * Set spending limits (optional security feature)
   */
  async setSpendingLimits(
    gridAccountId: string,
    limits: {
      dailyLimit?: bigint;
      monthlyLimit?: bigint;
      perTransactionLimit?: bigint;
    }
  ): Promise<void> {
    console.log(`[Grid] Setting spending limits for merchant account`);

    const spendingLimit: SpendingLimit = {
      account_id: gridAccountId,
      token: 'USDC',
      daily_limit: limits.dailyLimit?.toString(),
      monthly_limit: limits.monthlyLimit?.toString(),
      per_transaction_limit: limits.perTransactionLimit?.toString(),
    };

    await this.gridClient.setSpendingLimits(spendingLimit);
    console.log(`[Grid] ✅ Spending limits configured`);
  }

  /**
   * Get account balance
   */
  async getBalance(gridAccountId: string): Promise<string> {
    return await this.gridClient.getAccountBalance(gridAccountId);
  }

  /**
   * Get pending approvals (for multisig)
   */
  async getPendingApprovals(gridAccountId: string) {
    return await this.gridClient.getPendingApprovals(gridAccountId);
  }
}

/**
 * Usage Example:
 *
 * // 1. Merchant creates multisig account
 * const result = await merchantFlow.createMerchant({
 *   signers: [ceo_pubkey, cfo_pubkey, cto_pubkey],
 *   threshold: 2, // 2-of-3 signatures required
 *   name: 'Acme Corp Treasury',
 *   description: 'Main merchant account for subscriptions'
 * });
 *
 * // 2. Merchant sets spending limits (optional)
 * await merchantFlow.setSpendingLimits(result.multisigAccount.account_id, {
 *   dailyLimit: BigInt(10_000_000_000), // 10,000 USDC
 *   monthlyLimit: BigInt(100_000_000_000), // 100,000 USDC
 * });
 *
 * // 3. Create OuroC subscription with Grid merchant (EXISTING CODE - NO CHANGES)
 * await ouroCProgram.methods.createSubscription(
 *   subscriptionId,
 *   amount,
 *   interval,
 *   result.merchantPublicKey, // ← Grid multisig pubkey
 *   subscriberPubkey,
 *   ...
 * ).rpc();
 *
 * // 4. OuroC sends payments to Grid multisig (EXISTING CODE - NO CHANGES)
 * // Merchant receives payments automatically
 *
 * // 5. Merchant withdraws funds (via Grid dashboard)
 * // Requires 2 signatures from team members
 * // Grid handles the approval workflow
 */
