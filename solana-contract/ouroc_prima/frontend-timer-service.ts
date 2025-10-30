/**
 * Frontend Timer Service for Recurring Payments
 *
 * This service runs in the IC-hosted frontend and executes recurring payments
 * by calling the Solana contract directly. It's a decentralized alternative to
 * the ICP timer canister when threshold signing has issues.
 *
 * Architecture:
 * - Runs in IC-hosted frontend (still decentralized!)
 * - Checks ICP timer for due subscriptions
 * - Executes payments directly to Solana
 * - Updates ICP timer state
 *
 * Benefits:
 * - Works immediately (bypasses ICP signing issues)
 * - Still decentralized (IC frontend, not cloud)
 * - Easy to monitor and debug
 * - Uses standard Solana tooling
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { OurocPrima } from "./target/types/ouroc_prima";

// Configuration
const SOLANA_RPC_URL = "https://api.devnet.solana.com";
const ICP_CANISTER_ID = "ar3bl-2aaaa-aaaag-auhda-cai"; // Your timer canister
const PROGRAM_ID = new PublicKey("CFEtrptTe5eFXpZtB3hr1VMGuWF9oXguTnUFUaeVgeyT");
const CHECK_INTERVAL_MS = 60000; // Check every 60 seconds
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

interface Subscription {
  id: string;
  solana_contract_address: string;
  subscriber_address: string;
  merchant_address: string;
  amount: bigint;
  interval_seconds: bigint;
  next_execution: bigint;
  status: { Active?: null; Paused?: null; Cancelled?: null };
  last_triggered?: bigint;
}

/**
 * Main timer service class
 */
export class RecurringPaymentTimerService {
  private program: Program<OurocPrima>;
  private connection: Connection;
  private icpActor: any; // ICP canister actor
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor(
    program: Program<OurocPrima>,
    connection: Connection,
    icpActor: any
  ) {
    this.program = program;
    this.connection = connection;
    this.icpActor = icpActor;
  }

  /**
   * Start the timer service
   */
  start() {
    if (this.isRunning) {
      console.log("⚠️  Timer service already running");
      return;
    }

    console.log("🚀 Starting recurring payment timer service...");
    console.log(`   Checking every ${CHECK_INTERVAL_MS / 1000} seconds`);
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
  stop() {
    if (!this.isRunning) {
      console.log("⚠️  Timer service not running");
      return;
    }

    console.log("🛑 Stopping recurring payment timer service...");
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Main execution loop - check for due payments and execute them
   */
  private async checkAndExecutePayments() {
    try {
      console.log("\n⏰ Checking for due payments...");

      // 1. Get all subscriptions from ICP timer
      const subscriptions: Subscription[] = await this.icpActor.list_subscriptions();
      console.log(`   Found ${subscriptions.length} total subscriptions`);

      // 2. Filter for active subscriptions that are due
      const now = BigInt(Date.now()) * BigInt(1_000_000); // Convert to nanoseconds
      const dueSubscriptions = subscriptions.filter(sub => {
        // Check if active
        if (!sub.status.Active) return false;

        // Check if due (next_execution <= now)
        return sub.next_execution <= now;
      });

      console.log(`   ${dueSubscriptions.length} subscriptions are due for payment`);

      // 3. Execute each due payment
      for (const sub of dueSubscriptions) {
        await this.executeSubscriptionPayment(sub);
      }

      if (dueSubscriptions.length === 0) {
        console.log("   ✅ No payments due at this time");
      }

    } catch (error) {
      console.error("❌ Error in payment check cycle:", error);
    }
  }

  /**
   * Execute a single subscription payment
   */
  private async executeSubscriptionPayment(sub: Subscription) {
    console.log(`\n💰 Processing payment for subscription: ${sub.id}`);
    console.log(`   Amount: ${Number(sub.amount) / 1_000_000} USDC`);
    console.log(`   Subscriber: ${sub.subscriber_address}`);
    console.log(`   Merchant: ${sub.merchant_address}`);

    try {
      // 1. Get ICP signature for this payment
      console.log("   🔐 Getting ICP signature...");
      const { signature, timestamp } = await this.getICPSignature(
        sub.id,
        Number(sub.amount)
      );

      // 2. Derive PDAs
      const [subscriptionPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("subscription"), Buffer.from(sub.id)],
        PROGRAM_ID
      );

      const [configPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        PROGRAM_ID
      );

      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), Buffer.from(sub.id)],
        PROGRAM_ID
      );

      // 3. Get token accounts
      const subscriberPubkey = new PublicKey(sub.subscriber_address);
      const merchantPubkey = new PublicKey(sub.merchant_address);

      const subscriberTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        subscriberPubkey
      );

      const escrowTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        escrowPDA,
        true // allowOwnerOffCurve
      );

      // ICP fee account (you may need to configure this)
      const icpFeeAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        new PublicKey("CJ4FquWBYdtejheLLbDnMascYKC4VBUeJpBaKqrcdGJK") // ICP main wallet
      );

      // 4. Build and send transaction
      console.log("   📤 Sending transaction to Solana...");

      const tx = await this.program.methods
        .processTrigger(
          0, // opcode: 0 = Payment
          signature ? Array.from(signature) : null,
          new anchor.BN(timestamp)
        )
        .accountsStrict({
          subscription: subscriptionPDA,
          config: configPDA,
          triggerAuthority: this.program.provider.publicKey!,
          subscriberTokenAccount: subscriberTokenAccount,
          escrowUsdcAccount: escrowTokenAccount,
          icpFeeUsdcAccount: icpFeeAccount,
          usdcMint: USDC_MINT,
          subscriptionPda: subscriptionPDA,
          subscriber: subscriberPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          memoProgram: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
          instructionsSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .rpc();

      console.log(`   ✅ Payment executed successfully!`);
      console.log(`   Transaction: ${tx}`);
      console.log(`   View: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

      // 5. Notify ICP timer that payment was executed
      await this.notifyICPPaymentExecuted(sub.id, tx);

    } catch (error: any) {
      console.error(`   ❌ Failed to execute payment for ${sub.id}:`, error.message || error);

      // Notify ICP timer of failure
      await this.notifyICPPaymentFailed(sub.id, error.message || String(error));
    }
  }

  /**
   * Get ICP signature for payment authorization
   */
  private async getICPSignature(
    subscriptionId: string,
    amount: number
  ): Promise<{ signature: Uint8Array; timestamp: number }> {
    try {
      // Call ICP canister to generate signature
      const result = await this.icpActor.generate_payment_signature(
        subscriptionId,
        BigInt(amount)
      );

      // Result format: { Ok: [signature_bytes, timestamp] } or { Err: string }
      if ('Err' in result) {
        throw new Error(result.Err);
      }

      const [signatureVec, timestamp] = result.Ok;
      return {
        signature: new Uint8Array(signatureVec),
        timestamp: Number(timestamp)
      };
    } catch (error) {
      console.error("Failed to get ICP signature:", error);
      throw error;
    }
  }

  /**
   * Notify ICP timer that payment was executed successfully
   */
  private async notifyICPPaymentExecuted(
    subscriptionId: string,
    txSignature: string
  ) {
    try {
      await this.icpActor.mark_payment_executed(subscriptionId, txSignature);
      console.log(`   ℹ️  Notified ICP timer of successful payment`);
    } catch (error) {
      console.error("Failed to notify ICP of payment success:", error);
      // Don't throw - payment succeeded, notification failure is non-critical
    }
  }

  /**
   * Notify ICP timer that payment failed
   */
  private async notifyICPPaymentFailed(
    subscriptionId: string,
    errorMessage: string
  ) {
    try {
      await this.icpActor.mark_payment_failed(subscriptionId, errorMessage);
      console.log(`   ℹ️  Notified ICP timer of payment failure`);
    } catch (error) {
      console.error("Failed to notify ICP of payment failure:", error);
      // Don't throw - this is best-effort notification
    }
  }

  /**
   * Get service status
   */
  getStatus(): { isRunning: boolean; checkInterval: number } {
    return {
      isRunning: this.isRunning,
      checkInterval: CHECK_INTERVAL_MS
    };
  }
}

/**
 * Factory function to create and initialize the service
 */
export async function createTimerService(
  walletKeypair: Keypair, // Service wallet for transaction fees
  icpActor: any // ICP canister actor
): Promise<RecurringPaymentTimerService> {
  // Setup Solana connection and program
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const wallet = new Wallet(walletKeypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed"
  });

  // Load program IDL
  const idl = await Program.fetchIdl(PROGRAM_ID, provider);
  if (!idl) {
    throw new Error("Failed to fetch program IDL");
  }

  const program = new Program(idl as any, provider);

  // Create service
  return new RecurringPaymentTimerService(program, connection, icpActor);
}

/**
 * Example usage in your IC-hosted frontend:
 *
 * ```typescript
 * import { createTimerService } from './frontend-timer-service';
 * import { Actor, HttpAgent } from '@dfinity/agent';
 *
 * // 1. Create ICP actor for timer canister
 * const agent = new HttpAgent({ host: 'https://ic0.app' });
 * const icpActor = Actor.createActor(idlFactory, {
 *   agent,
 *   canisterId: ICP_CANISTER_ID
 * });
 *
 * // 2. Create service wallet (fund this with SOL for tx fees)
 * const serviceWallet = Keypair.fromSecretKey(SERVICE_WALLET_SECRET);
 *
 * // 3. Create and start timer service
 * const timerService = await createTimerService(serviceWallet, icpActor);
 * timerService.start();
 *
 * // Service will now check every 60 seconds and execute due payments
 *
 * // To stop:
 * // timerService.stop();
 * ```
 */
