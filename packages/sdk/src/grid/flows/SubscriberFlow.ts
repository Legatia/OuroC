/**
 * Subscriber Flow: Grid Email Account → OuroC Subscription (Unchanged)
 *
 * Grid Integration Points:
 * 1. Email signup (Grid account creation) - UX improvement
 * 2. OTP verification - Security layer
 * 3. Grid account holds USDC - Better UX (no wallet needed)
 * 4. OuroC smart contract logic - UNCHANGED
 * 5. ICP triggers payments - UNCHANGED
 *
 * Flow:
 * 1. User signs up via email (Grid creates account)
 * 2. User verifies OTP
 * 3. Grid account = subscriber address in OuroC subscription
 * 4. OuroC subscription works exactly as before
 * 5. ICP triggers process_payment using Grid account as subscriber
 */

import { PublicKey } from '@solana/web3.js';
import { GridClient } from '../api/GridClient';
import { GridAccount } from '../types/grid';

export interface SubscriberFlowConfig {
  gridClient: GridClient;
}

export interface CreateSubscriberResult {
  gridAccount: GridAccount;
  subscriberPublicKey: PublicKey; // Use this as subscriber in OuroC
  awaitingOTP: boolean;
}

export class SubscriberFlow {
  private gridClient: GridClient;

  constructor(config: SubscriberFlowConfig) {
    this.gridClient = config.gridClient;
  }

  /**
   * Step 1 & 2: Create Grid email account
   * Returns Grid account that can be used as OuroC subscriber
   */
  async createSubscriber(email: string): Promise<CreateSubscriberResult> {
    console.log(`[Grid] Creating subscriber account for: ${email}`);

    // Create Grid account (sends OTP email)
    const gridAccount = await this.gridClient.createEmailAccount(email, 'USDC');

    console.log(`[Grid] Account created: ${gridAccount.account_id}`);
    console.log(`[Grid] OTP sent to ${email}`);

    return {
      gridAccount,
      subscriberPublicKey: new PublicKey(gridAccount.public_key),
      awaitingOTP: true,
    };
  }

  /**
   * Step 2: Verify OTP to activate account
   */
  async verifyOTP(accountId: string, otpCode: string): Promise<PublicKey> {
    console.log(`[Grid] Verifying OTP for account: ${accountId}`);

    const response = await this.gridClient.verifyOTP(accountId, otpCode);

    if (!response.verified) {
      throw new Error('OTP verification failed');
    }

    console.log(`[Grid] ✅ Account verified and active`);

    // Return the public key to use in OuroC subscription
    return new PublicKey(response.account.public_key);
  }

  /**
   * Get subscriber's public key (for creating OuroC subscription)
   */
  async getSubscriberPublicKey(gridAccountId: string): Promise<PublicKey> {
    const account = await this.gridClient.getAccount(gridAccountId);
    return new PublicKey(account.public_key);
  }

  /**
   * Get account balance
   */
  async getBalance(gridAccountId: string): Promise<string> {
    return await this.gridClient.getAccountBalance(gridAccountId);
  }
}

/**
 * Usage Example:
 *
 * // 1. User signs up
 * const result = await subscriberFlow.createSubscriber('user@example.com');
 * // Grid sends OTP to email
 *
 * // 2. User enters OTP
 * const subscriberPubkey = await subscriberFlow.verifyOTP(result.gridAccount.account_id, '123456');
 *
 * // 3. Create OuroC subscription (with merchant_name!)
 * await ouroCProgram.methods.createSubscription(
 *   subscriptionId,
 *   amount,
 *   interval,
 *   merchantAddress,
 *   "Netflix", // ← NEW: merchant_name for branded notifications
 *   paymentTokenMint,
 *   reminderDaysBeforePayment,
 *   slippageBps,
 *   icpSignature
 * )
 * .accounts({
 *   subscription: subscriptionPda,
 *   config: configPda,
 *   subscriber: subscriberPubkey, // ← Grid account pubkey
 *   systemProgram: SystemProgram.programId,
 * })
 * .rpc();
 *
 * // 4. User approves delegation (EXISTING CODE - NO CHANGES)
 * await ouroCProgram.methods.approveSubscriptionDelegate(
 *   subscriptionId,
 *   amount
 * ).rpc();
 *
 * // 5. Setup email notifications for Grid users
 * const webhookListener = new GridWebhookListener({
 *   connection,
 *   gridClient,
 *   emailService: new ResendEmailService(apiKey, fromEmail),
 * });
 * await webhookListener.monitorGridAccount(result.gridAccount.account_id);
 *
 * // 6. ICP triggers payments (EXISTING CODE - NO CHANGES)
 * // Grid user receives notifications via:
 * // - On-chain wallet notification (SPL Memo)
 * // - Email to user@example.com (via GridWebhookListener)
 */
