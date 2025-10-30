/**
 * Recurring Payment Timer Service
 *
 * Runs in the IC-hosted frontend and executes recurring payments when they're due.
 * This provides a decentralized fallback for when ICP timer signing has issues.
 *
 * Architecture:
 * - Checks ICP timer canister for due subscriptions every 60 seconds
 * - Gets ICP signatures via `getPaymentSignature()`
 * - Executes payments directly to Solana via Anchor
 * - Updates ICP timer state after execution
 *
 * Benefits:
 * - Still decentralized (IC-hosted frontend)
 * - Works immediately (bypasses ICP signing issues)
 * - Reuses existing frontend infrastructure
 * - Easy to monitor and debug
 */

import { Connection, PublicKey, SystemProgram, SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Program, BN } from '@coral-xyz/anchor';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import {
  listSubscriptions,
  getPaymentSignature,
  type Subscription
} from './backend';
import {
  getProgram,
  deriveSubscriptionPDA,
  deriveConfigPDA,
  deriveEscrowPDA,
  USDC_MINT_DEVNET,
  PROGRAM_ID
} from './solana';

// Configuration
const CHECK_INTERVAL_MS = 60000; // Check every 60 seconds
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// Main wallet address (ICP canister's Solana address for fees)
const ICP_MAIN_WALLET = new PublicKey('CJ4FquWBYdtejheLLbDnMascYKC4VBUeJpBaKqrcdGJK');

export interface PaymentExecution {
  subscriptionId: string;
  success: boolean;
  txSignature?: string;
  error?: string;
  timestamp: number;
}

export class RecurringPaymentTimer {
  private wallet: WalletContextState;
  private connection: Connection;
  private program: Program | null = null;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;
  private lastCheckTime: number = 0;
  private executionHistory: PaymentExecution[] = [];

  constructor(wallet: WalletContextState, connection: Connection) {
    this.wallet = wallet;
    this.connection = connection;
  }

  /**
   * Start the timer service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Timer service already running');
      return;
    }

    if (!this.wallet.connected || !this.wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('🚀 Starting recurring payment timer service...');
    console.log(`   Wallet: ${this.wallet.publicKey.toString()}`);
    console.log(`   Checking every ${CHECK_INTERVAL_MS / 1000} seconds`);

    // Initialize program
    this.program = await getProgram(this.wallet, this.connection);

    this.isRunning = true;

    // Run immediately on start
    this.checkAndExecutePayments().catch(console.error);

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.checkAndExecutePayments().catch(console.error);
    }, CHECK_INTERVAL_MS);
  }

  /**
   * Stop the timer service
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️  Timer service not running');
      return;
    }

    console.log('🛑 Stopping recurring payment timer service...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Main execution loop - check for due payments and execute them
   */
  private async checkAndExecutePayments(): Promise<void> {
    try {
      this.lastCheckTime = Date.now();
      console.log('\n⏰ Checking for due payments...');

      if (!this.wallet.publicKey) {
        console.log('   ⚠️  Wallet disconnected, skipping check');
        return;
      }

      // 1. Get all subscriptions for this wallet
      const subscriptions = await listSubscriptions(this.wallet.publicKey.toString());
      console.log(`   Found ${subscriptions.length} subscriptions`);

      if (subscriptions.length === 0) {
        console.log('   ℹ️  No subscriptions found for this wallet');
        return;
      }

      // 2. Filter for subscriptions that are due
      const now = BigInt(Date.now()) * BigInt(1_000_000); // Convert to nanoseconds
      const dueSubscriptions = subscriptions.filter(sub => {
        // Check if active
        if (!('Active' in sub.status)) return false;

        // Check if due (next_execution <= now)
        return sub.next_execution <= now;
      });

      console.log(`   ${dueSubscriptions.length} subscriptions are due for payment`);

      // 3. Execute each due payment
      for (const sub of dueSubscriptions) {
        await this.executeSubscriptionPayment(sub);
      }

      if (dueSubscriptions.length === 0) {
        console.log('   ✅ No payments due at this time');
      }

    } catch (error) {
      console.error('❌ Error in payment check cycle:', error);
    }
  }

  /**
   * Execute a single subscription payment
   */
  private async executeSubscriptionPayment(sub: Subscription): Promise<void> {
    const startTime = Date.now();
    console.log(`\n💰 Processing payment for subscription: ${sub.id}`);
    console.log(`   Amount: ${Number(sub.amount) / 1_000_000} USDC`);
    console.log(`   Subscriber: ${sub.subscriber_address}`);
    console.log(`   Merchant: ${sub.merchant_address}`);

    try {
      if (!this.program || !this.wallet.publicKey) {
        throw new Error('Program or wallet not initialized');
      }

      // 1. Get ICP signature for this payment
      console.log('   🔐 Getting ICP signature...');
      const sigResult = await getPaymentSignature(sub.id, Number(sub.amount));

      if (!sigResult.success || !sigResult.signature || sigResult.timestamp === undefined) {
        throw new Error(sigResult.error || 'Failed to get ICP signature');
      }

      const signature = sigResult.signature;
      const timestamp = sigResult.timestamp;

      console.log(`   ✅ Got signature (${signature.length} bytes) with timestamp ${timestamp}`);

      // 2. Derive PDAs
      const [subscriptionPDA] = deriveSubscriptionPDA(sub.id);
      const [configPDA] = deriveConfigPDA();
      const [escrowPDA] = deriveEscrowPDA(sub.id);

      // 3. Get token accounts
      const subscriberPubkey = new PublicKey(sub.subscriber_address);
      const merchantPubkey = new PublicKey(sub.merchant_address);

      const subscriberTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT_DEVNET,
        subscriberPubkey
      );

      const escrowTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT_DEVNET,
        escrowPDA,
        true // allowOwnerOffCurve
      );

      const icpFeeAccount = await getAssociatedTokenAddress(
        USDC_MINT_DEVNET,
        ICP_MAIN_WALLET
      );

      // 4. Build and send transaction
      console.log('   📤 Sending transaction to Solana...');

      const tx = await this.program.methods
        .processTrigger(
          0, // opcode: 0 = Payment
          signature, // ICP signature
          new BN(timestamp.toString()) // timestamp
        )
        .accounts({
          subscription: subscriptionPDA,
          config: configPDA,
          triggerAuthority: this.wallet.publicKey,
          subscriberTokenAccount: subscriberTokenAccount,
          escrowUsdcAccount: escrowTokenAccount,
          icpFeeUsdcAccount: icpFeeAccount,
          usdcMint: USDC_MINT_DEVNET,
          subscriptionPda: subscriptionPDA,
          subscriber: subscriberPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          memoProgram: MEMO_PROGRAM_ID,
          instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .rpc();

      const executionTime = Date.now() - startTime;
      console.log(`   ✅ Payment executed successfully in ${executionTime}ms!`);
      console.log(`   Transaction: ${tx}`);
      console.log(`   View: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

      // Record success
      this.executionHistory.push({
        subscriptionId: sub.id,
        success: true,
        txSignature: tx,
        timestamp: Date.now(),
      });

      // Keep only last 100 executions
      if (this.executionHistory.length > 100) {
        this.executionHistory = this.executionHistory.slice(-100);
      }

    } catch (error: any) {
      console.error(`   ❌ Failed to execute payment for ${sub.id}:`, error.message || error);

      // Record failure
      this.executionHistory.push({
        subscriptionId: sub.id,
        success: false,
        error: error.message || String(error),
        timestamp: Date.now(),
      });

      // Keep only last 100 executions
      if (this.executionHistory.length > 100) {
        this.executionHistory = this.executionHistory.slice(-100);
      }
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    isRunning: boolean;
    checkInterval: number;
    lastCheckTime: number;
    walletConnected: boolean;
    executionHistory: PaymentExecution[];
  } {
    return {
      isRunning: this.isRunning,
      checkInterval: CHECK_INTERVAL_MS,
      lastCheckTime: this.lastCheckTime,
      walletConnected: this.wallet.connected && !!this.wallet.publicKey,
      executionHistory: this.executionHistory,
    };
  }

  /**
   * Get recent execution history
   */
  getExecutionHistory(limit: number = 10): PaymentExecution[] {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory = [];
  }
}

/**
 * Create and return timer service instance
 * Use this in your React component
 */
export function createRecurringPaymentTimer(
  wallet: WalletContextState,
  connection: Connection
): RecurringPaymentTimer {
  return new RecurringPaymentTimer(wallet, connection);
}
