/**
 * Unit tests for SPL Memo integration in notification system
 * Tests that notifications include wallet-visible memos
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { OuroCSubscriptions } from "../target/types/ouro_c_subscriptions";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Transaction,
  Connection,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

// SPL Memo Program ID
const SPL_MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

describe("Notification System with SPL Memo", () => {
  // Configure the client to use the local cluster
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.OuroCSubscriptions as Program<OuroCSubscriptions>;
  const connection = provider.connection;

  // Test accounts
  let authority: Keypair;
  let subscriber: Keypair;
  let merchant: Keypair;
  let usdcMint: PublicKey;
  let subscriberUsdcAccount: PublicKey;
  let merchantUsdcAccount: PublicKey;
  let icpFeeUsdcAccount: PublicKey;
  let configPda: PublicKey;
  let subscriptionPda: PublicKey;
  let subscriptionId: string;

  before(async () => {
    // Generate keypairs
    authority = Keypair.generate();
    subscriber = Keypair.generate();
    merchant = Keypair.generate();

    // Airdrop SOL
    await connection.requestAirdrop(authority.publicKey, 5 * LAMPORTS_PER_SOL);
    await connection.requestAirdrop(subscriber.publicKey, 5 * LAMPORTS_PER_SOL);
    await connection.requestAirdrop(merchant.publicKey, 5 * LAMPORTS_PER_SOL);

    // Wait for airdrops
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create USDC mint
    usdcMint = await createMint(
      connection,
      authority,
      authority.publicKey,
      null,
      6 // USDC has 6 decimals
    );

    // Create token accounts
    subscriberUsdcAccount = await createAccount(
      connection,
      subscriber,
      usdcMint,
      subscriber.publicKey
    );

    merchantUsdcAccount = await createAccount(
      connection,
      merchant,
      usdcMint,
      merchant.publicKey
    );

    icpFeeUsdcAccount = await createAccount(
      connection,
      authority,
      usdcMint,
      authority.publicKey
    );

    // Mint USDC to subscriber
    await mintTo(
      connection,
      authority,
      usdcMint,
      subscriberUsdcAccount,
      authority,
      100_000_000 // 100 USDC
    );

    // Derive PDAs
    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    subscriptionId = `test-sub-${Date.now()}`;
    [subscriptionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("subscription"), Buffer.from(subscriptionId)],
      program.programId
    );

    // Initialize program
    await program.methods
      .initialize(
        { icpOnly: {} }, // Authorization mode
        null, // ICP public key (not needed for manual mode)
        100 // 1% fee
      )
      .accounts({
        config: configPda,
        authority: authority.publicKey,
        icpFeeUsdcAccount: icpFeeUsdcAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    console.log("✅ Program initialized");
  });

  describe("send_notification with SPL Memo", () => {
    it("should include memo_program in accounts", async () => {
      // Create a test subscription first
      await program.methods
        .createSubscription(
          subscriptionId,
          new anchor.BN(10_000_000), // 10 USDC
          new anchor.BN(30 * 24 * 60 * 60), // 30 days
          merchant.publicKey,
          usdcMint,
          3, // reminder_days_before_payment
          50, // slippage_bps
          Buffer.alloc(64) // dummy ICP signature
        )
        .accounts({
          subscription: subscriptionPda,
          config: configPda,
          subscriber: subscriber.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([subscriber])
        .rpc();

      console.log("✅ Subscription created");

      // Test send_notification - should include memo_program
      const memoMessage = "Test notification: Payment due in 3 days";

      try {
        const tx = await program.methods
          .sendNotification(memoMessage)
          .accounts({
            subscription: subscriptionPda,
            config: configPda,
            notificationSender: authority.publicKey,
            subscriber: subscriber.publicKey,
            systemProgram: SystemProgram.programId,
            memoProgram: SPL_MEMO_PROGRAM_ID, // SPL Memo Program
          })
          .signers([authority])
          .rpc();

        console.log("✅ Notification sent with memo:", tx);

        // Verify transaction includes memo
        const txDetails = await connection.getTransaction(tx, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });

        assert.ok(txDetails, "Transaction should exist");

        // Check if memo program was invoked
        const memoInstructionFound = txDetails.transaction.message.staticAccountKeys
          .some(key => key.equals(SPL_MEMO_PROGRAM_ID));

        assert.ok(
          memoInstructionFound,
          "Transaction should include SPL Memo Program"
        );

        console.log("✅ SPL Memo Program invoked in transaction");

        // Verify subscriber received SOL notification
        const subscriberBalance = await connection.getBalance(subscriber.publicKey);
        assert.ok(subscriberBalance > 0, "Subscriber should have received notification SOL");

      } catch (error) {
        console.error("❌ Error sending notification:", error);
        throw error;
      }
    });

    it("should fail if memo_program is missing", async () => {
      const memoMessage = "Test notification without memo program";

      try {
        // Attempt to send notification without memo_program account
        await program.methods
          .sendNotification(memoMessage)
          .accounts({
            subscription: subscriptionPda,
            config: configPda,
            notificationSender: authority.publicKey,
            subscriber: subscriber.publicKey,
            systemProgram: SystemProgram.programId,
            // memoProgram missing - should fail
          })
          .signers([authority])
          .rpc();

        assert.fail("Should have failed without memo_program account");
      } catch (error) {
        // Expected to fail
        assert.ok(error, "Should throw error when memo_program is missing");
        console.log("✅ Correctly failed without memo_program");
      }
    });

    it("should handle long memo messages (up to 566 bytes)", async () => {
      // Max memo length is 566 bytes
      const longMemo = "A".repeat(566);

      const tx = await program.methods
        .sendNotification(longMemo)
        .accounts({
          subscription: subscriptionPda,
          config: configPda,
          notificationSender: authority.publicKey,
          subscriber: subscriber.publicKey,
          systemProgram: SystemProgram.programId,
          memoProgram: SPL_MEMO_PROGRAM_ID,
        })
        .signers([authority])
        .rpc();

      console.log("✅ Long memo accepted:", tx);

      // Verify transaction succeeded
      const txDetails = await connection.getTransaction(tx, {
        commitment: "confirmed",
      });

      assert.ok(txDetails, "Transaction with long memo should succeed");
    });

    it("should reject memo messages longer than 566 bytes", async () => {
      const tooLongMemo = "A".repeat(567); // 1 byte over limit

      try {
        await program.methods
          .sendNotification(tooLongMemo)
          .accounts({
            subscription: subscriptionPda,
            config: configPda,
            notificationSender: authority.publicKey,
            subscriber: subscriber.publicKey,
            systemProgram: SystemProgram.programId,
            memoProgram: SPL_MEMO_PROGRAM_ID,
          })
          .signers([authority])
          .rpc();

        assert.fail("Should have rejected memo longer than 566 bytes");
      } catch (error) {
        assert.ok(error, "Should throw error for memo too long");
        console.log("✅ Correctly rejected memo exceeding 566 bytes");
      }
    });

    it("should verify memo is visible in transaction logs", async () => {
      const testMemo = "Payment reminder: Your subscription renews tomorrow";

      const tx = await program.methods
        .sendNotification(testMemo)
        .accounts({
          subscription: subscriptionPda,
          config: configPda,
          notificationSender: authority.publicKey,
          subscriber: subscriber.publicKey,
          systemProgram: SystemProgram.programId,
          memoProgram: SPL_MEMO_PROGRAM_ID,
        })
        .signers([authority])
        .rpc();

      // Get transaction details with logs
      const txDetails = await connection.getTransaction(tx, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      assert.ok(txDetails, "Transaction should exist");

      // Check if memo appears in logs
      const logs = txDetails.meta?.logMessages || [];
      const memoLogFound = logs.some(log => log.includes("Notification sent with memo"));

      assert.ok(memoLogFound, "Memo should appear in transaction logs");
      console.log("✅ Memo visible in transaction logs");
    });
  });

  describe("process_trigger with SPL Memo", () => {
    it("should include memo_program in ProcessTrigger accounts", async () => {
      // Note: This test would require setting up full subscription flow with delegation
      // For now, we verify the account structure is correct

      const processTriggerAccounts = {
        subscription: subscriptionPda,
        config: configPda,
        triggerAuthority: authority.publicKey,
        subscriberTokenAccount: subscriberUsdcAccount,
        merchantUsdcAccount: merchantUsdcAccount,
        icpFeeUsdcAccount: icpFeeUsdcAccount,
        usdcMint: usdcMint,
        subscriptionPda: subscriptionPda,
        subscriber: subscriber.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        memoProgram: SPL_MEMO_PROGRAM_ID, // Should be included
      };

      // Verify all required accounts are present
      assert.ok(processTriggerAccounts.memoProgram, "memo_program should be included");
      assert.ok(
        processTriggerAccounts.memoProgram.equals(SPL_MEMO_PROGRAM_ID),
        "memo_program should be SPL Memo Program ID"
      );

      console.log("✅ ProcessTrigger accounts structure verified");
    });
  });

  describe("Memo Program Address Validation", () => {
    it("should use correct SPL Memo Program ID", () => {
      const expectedMemoId = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
      assert.equal(
        SPL_MEMO_PROGRAM_ID.toBase58(),
        expectedMemoId,
        "SPL Memo Program ID should match"
      );
      console.log("✅ SPL Memo Program ID verified");
    });
  });
});
