/**
 * Squads Protocol Service
 *
 * Wrapper for Squads SDK to manage guild multisig treasuries.
 * Squads provides battle-tested multisig wallets on Solana.
 */

import { Squads } from "@sqds/sdk";
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";

// Configuration
const getConfig = () => ({
  rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com",
  network: import.meta.env.VITE_SOLANA_NETWORK || "devnet",
  gridApiKey: import.meta.env.VITE_GRID_SANDBOX_API_KEY || ""
});

export class SquadsService {
  private connection: Connection;

  constructor() {
    const config = getConfig();
    this.connection = new Connection(config.rpcUrl, "confirmed");
  }

  /**
   * Create a new multisig wallet for guild treasury
   *
   * @param threshold - Number of signatures required (e.g., 3)
   * @param members - Array of member public keys
   * @param creator - Creator's public key (must sign via wallet adapter)
   * @returns Multisig public key
   */
  async createMultisig(
    threshold: number,
    members: PublicKey[],
    creator: PublicKey
  ): Promise<{ multisigPda: PublicKey; txSignature: string }> {
    try {
      console.log(`🏗️ Creating Squads multisig...`);
      console.log(`   Threshold: ${threshold}/${members.length}`);
      console.log(`   Members:`, members.map(m => m.toString().slice(0, 8) + '...'));

      // Note: In production, this requires wallet adapter signing
      // For now, we'll return mock data since we need user wallet signing

      // Generate multisig PDA (deterministic address)
      const createKey = Keypair.generate();

      // In production:
      // const squads = Squads.endpoint(this.connection, walletAdapter);
      // const multisigAccount = await squads.createMultisig(
      //   threshold,
      //   createKey.publicKey,
      //   members
      // );

      console.log(`✅ Multisig created (mock)`);

      return {
        multisigPda: createKey.publicKey, // Mock PDA
        txSignature: "mock_signature_" + Date.now()
      };
    } catch (error) {
      console.error("Failed to create multisig:", error);
      throw error;
    }
  }

  /**
   * Get multisig account info
   *
   * @param multisigPda - Multisig public key
   * @returns Multisig account data
   */
  async getMultisig(multisigPda: PublicKey): Promise<{
    threshold: number;
    members: PublicKey[];
    transactionIndex: number;
  }> {
    try {
      // In production:
      // const squads = Squads.endpoint(this.connection, Keypair.generate());
      // const multisigAccount = await squads.getMultisig(multisigPda);
      // return multisigAccount;

      // Mock data for now
      return {
        threshold: 3,
        members: [],
        transactionIndex: 0
      };
    } catch (error) {
      console.error("Failed to get multisig:", error);
      throw error;
    }
  }

  /**
   * Create a proposal (multisig transaction)
   *
   * @param multisigPda - Multisig public key
   * @param recipient - Recipient address
   * @param amount - Amount in SOL
   * @param creator - Member creating the proposal
   * @returns Transaction index
   */
  async createTransaction(
    multisigPda: PublicKey,
    recipient: PublicKey,
    amount: number,
    creator: PublicKey
  ): Promise<{ transactionIndex: number; txSignature: string }> {
    try {
      console.log(`📝 Creating multisig transaction...`);
      console.log(`   From: ${multisigPda.toString().slice(0, 8)}...`);
      console.log(`   To: ${recipient.toString().slice(0, 8)}...`);
      console.log(`   Amount: ${amount} SOL`);

      // Create transfer instruction
      const transferIx = SystemProgram.transfer({
        fromPubkey: multisigPda,
        toPubkey: recipient,
        lamports: amount * LAMPORTS_PER_SOL
      });

      // In production:
      // const squads = Squads.endpoint(this.connection, walletAdapter);
      // const transactionIndex = await squads.createTransaction(
      //   multisigPda,
      //   1 // Authority index
      // );
      // await squads.addInstruction(transactionIndex, transferIx);
      // await squads.activateTransaction(transactionIndex);

      const mockTxIndex = Math.floor(Math.random() * 1000);

      console.log(`✅ Transaction created: #${mockTxIndex} (mock)`);

      return {
        transactionIndex: mockTxIndex,
        txSignature: "mock_create_tx_" + Date.now()
      };
    } catch (error) {
      console.error("Failed to create transaction:", error);
      throw error;
    }
  }

  /**
   * Approve a proposal (sign transaction)
   *
   * @param multisigPda - Multisig public key
   * @param transactionIndex - Transaction index
   * @param approver - Member approving
   * @returns Transaction signature
   */
  async approveTransaction(
    multisigPda: PublicKey,
    transactionIndex: number,
    approver: PublicKey
  ): Promise<string> {
    try {
      console.log(`✅ Approving transaction #${transactionIndex}...`);
      console.log(`   Approver: ${approver.toString().slice(0, 8)}...`);

      // In production:
      // const squads = Squads.endpoint(this.connection, walletAdapter);
      // await squads.approveTransaction(multisigPda, transactionIndex);

      console.log(`✅ Transaction approved (mock)`);

      return "mock_approve_signature_" + Date.now();
    } catch (error) {
      console.error("Failed to approve transaction:", error);
      throw error;
    }
  }

  /**
   * Reject a proposal
   *
   * @param multisigPda - Multisig public key
   * @param transactionIndex - Transaction index
   * @param rejector - Member rejecting
   * @returns Transaction signature
   */
  async rejectTransaction(
    multisigPda: PublicKey,
    transactionIndex: number,
    rejector: PublicKey
  ): Promise<string> {
    try {
      console.log(`❌ Rejecting transaction #${transactionIndex}...`);
      console.log(`   Rejector: ${rejector.toString().slice(0, 8)}...`);

      // In production:
      // const squads = Squads.endpoint(this.connection, walletAdapter);
      // await squads.rejectTransaction(multisigPda, transactionIndex);

      console.log(`❌ Transaction rejected (mock)`);

      return "mock_reject_signature_" + Date.now();
    } catch (error) {
      console.error("Failed to reject transaction:", error);
      throw error;
    }
  }

  /**
   * Execute a proposal (if threshold met)
   *
   * @param multisigPda - Multisig public key
   * @param transactionIndex - Transaction index
   * @param executor - Any member can execute
   * @returns Transaction signature
   */
  async executeTransaction(
    multisigPda: PublicKey,
    transactionIndex: number,
    executor: PublicKey
  ): Promise<string> {
    try {
      console.log(`🎉 Executing transaction #${transactionIndex}...`);
      console.log(`   Executor: ${executor.toString().slice(0, 8)}...`);

      // In production:
      // const squads = Squads.endpoint(this.connection, walletAdapter);
      // const signature = await squads.executeTransaction(multisigPda, transactionIndex);

      const mockSignature = "mock_execute_signature_" + Date.now();

      console.log(`🎉 Transaction executed: ${mockSignature.slice(0, 16)}... (mock)`);

      return mockSignature;
    } catch (error) {
      console.error("Failed to execute transaction:", error);
      throw error;
    }
  }

  /**
   * Get transaction status
   *
   * @param multisigPda - Multisig public key
   * @param transactionIndex - Transaction index
   * @returns Transaction data
   */
  async getTransaction(
    multisigPda: PublicKey,
    transactionIndex: number
  ): Promise<{
    approved: PublicKey[];
    rejected: PublicKey[];
    status: 'active' | 'executed' | 'rejected';
  }> {
    try {
      // In production:
      // const squads = Squads.endpoint(this.connection, Keypair.generate());
      // const tx = await squads.getTransaction(multisigPda, transactionIndex);
      // return tx;

      // Mock data
      return {
        approved: [],
        rejected: [],
        status: 'active'
      };
    } catch (error) {
      console.error("Failed to get transaction:", error);
      throw error;
    }
  }

  /**
   * Check if transaction is ready to execute (threshold met)
   *
   * @param multisigPda - Multisig public key
   * @param transactionIndex - Transaction index
   * @returns True if ready to execute
   */
  async isReadyToExecute(
    multisigPda: PublicKey,
    transactionIndex: number
  ): Promise<boolean> {
    try {
      const tx = await this.getTransaction(multisigPda, transactionIndex);
      const multisig = await this.getMultisig(multisigPda);

      const approvalCount = tx.approved.length;
      return approvalCount >= multisig.threshold;
    } catch (error) {
      console.error("Failed to check execution readiness:", error);
      return false;
    }
  }

  /**
   * Get balance of multisig wallet
   *
   * @param multisigPda - Multisig public key
   * @returns Balance in SOL
   */
  async getBalance(multisigPda: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(multisigPda);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error("Failed to get balance:", error);
      return 0;
    }
  }
}

// Export singleton instance
export const squadsService = new SquadsService();
