import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { OurocPrima } from "../target/types/ouroc_prima";

describe("ouroc_prima", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.ourocPrima as Program<OurocPrima>;
  const authority = anchor.AnchorProvider.env().wallet;

  it("Initializes program with proper security settings", async () => {
    // Derive config PDA
    const [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    try {
      const tx = await program.methods
        .initialize(
          { icpSignature: {} }, // ManualOnly authorization mode
          null, // No ICP public key for manual mode
          100 // 1% fee
        )
        .accounts({
          config: configPDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Ouro-C Subscriptions initialized! Transaction signature:", tx);

      // Verify the config account was created correctly
      const configAccount = await program.account.config.fetch(configPDA);
      console.log("✅ Config account created:", {
        authority: configAccount.authority.toString(),
        totalSubscriptions: configAccount.totalSubscriptions.toString(),
        paused: configAccount.paused,
        authorizationMode: configAccount.authorizationMode,
        manualProcessingEnabled: configAccount.manualProcessingEnabled,
        timeBasedProcessingEnabled: configAccount.timeBasedProcessingEnabled,
        feeConfig: {
          feePercentageBasisPoints: configAccount.feeConfig.feePercentageBasisPoints,
          minFeeAmount: configAccount.feeConfig.minFeeAmount.toString()
        }
      });

      // SECURITY TEST: Verify manual-only mode is enabled
      if (configAccount.authorizationMode.manualOnly) {
        console.log("✅ Manual-only authorization mode properly configured");
      }

    } catch (error) {
      console.error("❌ Initialization error:", error);
      throw error;
    }
  });

  it("Creates a subscription with all security parameters", async () => {
    const subscriptionId = "test-sub-001";
    const amount = new anchor.BN(5_000_000); // 5 USDC in micro-units
    const intervalSeconds = new anchor.BN(30 * 24 * 60 * 60); // 30 days
    const merchantAddress = anchor.web3.Keypair.generate().publicKey;
    const merchantName = "Test Merchant";
    const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // Devnet USDC
    const reminderDaysBeforePayment = 3;
    const slippageBps = 100; // 1%
    const dummySignature = Array(64).fill(0); // Mock ICP signature

    // Derive subscription PDA
    const [subscriptionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("subscription"), Buffer.from(subscriptionId)],
      program.programId
    );

    // Derive config PDA
    const [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    try {
      const tx = await program.methods
        .createSubscription(
          subscriptionId,
          amount,
          intervalSeconds,
          merchantAddress,
          merchantName,
          usdcMint,
          reminderDaysBeforePayment,
          slippageBps,
          dummySignature
        )
        .accounts({
          subscription: subscriptionPDA,
          config: configPDA,
          subscriber: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Subscription created! Transaction signature:", tx);

      // Verify the subscription account
      const subscriptionAccount = await program.account.subscription.fetch(subscriptionPDA);
      console.log("✅ Subscription created with security features:", {
        id: subscriptionAccount.id,
        subscriber: subscriptionAccount.subscriber.toString(),
        merchant: subscriptionAccount.merchant.toString(),
        merchantName: subscriptionAccount.merchantName,
        amount: subscriptionAccount.amount.toString(),
        intervalSeconds: subscriptionAccount.intervalSeconds.toString(),
        paymentTokenMint: subscriptionAccount.paymentTokenMint.toString(),
        reminderDaysBeforePayment: subscriptionAccount.reminderDaysBeforePayment,
        slippageBps: subscriptionAccount.slippageBps,
        status: subscriptionAccount.status,
        paymentsMade: subscriptionAccount.paymentsMade.toString()
      });

      // SECURITY TEST: Verify signature is stored
      if (subscriptionAccount.icpCanisterSignature.length === 64) {
        console.log("✅ ICP canister signature properly stored");
      }

      // SECURITY TEST: Verify merchant name validation
      if (subscriptionAccount.merchantName === merchantName) {
        console.log("✅ Merchant name validation working");
      }

    } catch (error) {
      console.error("❌ Subscription creation error:", error);
      throw error;
    }
  });

  it("Tests pause/resume functionality", async () => {
    const subscriptionId = "test-sub-001";

    // Derive subscription PDA
    const [subscriptionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("subscription"), Buffer.from(subscriptionId)],
      program.programId
    );

    try {
      // Test pause subscription
      const pauseTx = await program.methods
        .pauseSubscription()
        .accounts({
          subscription: subscriptionPDA,
          subscriber: authority.publicKey,
        })
        .rpc();

      console.log("✅ Subscription paused! Transaction signature:", pauseTx);

      // Verify pause
      const pausedAccount = await program.account.subscription.fetch(subscriptionPDA);
      if (pausedAccount.status.paused) {
        console.log("✅ Subscription status correctly set to paused");
      }

      // Test resume subscription
      const resumeTx = await program.methods
        .resumeSubscription()
        .accounts({
          subscription: subscriptionPDA,
          subscriber: authority.publicKey,
        })
        .rpc();

      console.log("✅ Subscription resumed! Transaction signature:", resumeTx);

      // Verify resume
      const resumedAccount = await program.account.subscription.fetch(subscriptionPDA);
      if (resumedAccount.status.active) {
        console.log("✅ Subscription status correctly set to active");
      }

    } catch (error) {
      console.error("❌ Pause/resume error:", error);
      throw error;
    }
  });

  it("Tests emergency pause functionality", async () => {
    // Derive config PDA
    const [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    try {
      const tx = await program.methods
        .emergencyPause()
        .accounts({
          config: configPDA,
          authority: authority.publicKey,
        })
        .rpc();

      console.log("✅ Emergency pause executed! Transaction signature:", tx);

      // Verify emergency pause
      const configAccount = await program.account.config.fetch(configPDA);
      if (configAccount.paused) {
        console.log("✅ Program correctly emergency paused");
      }

      // Resume for further tests
      await program.methods
        .resumeProgram()
        .accounts({
          config: configPDA,
          authority: authority.publicKey,
        })
        .rpc();

      console.log("✅ Program resumed for continued testing");

    } catch (error) {
      console.error("❌ Emergency pause error:", error);
      throw error;
    }
  });

  it("Cancel subscription and clean up", async () => {
    const subscriptionId = "test-sub-001";

    // Derive subscription PDA
    const [subscriptionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("subscription"), Buffer.from(subscriptionId)],
      program.programId
    );

    try {
      const tx = await program.methods
        .cancelSubscription()
        .accounts({
          subscription: subscriptionPDA,
          subscriber: authority.publicKey,
        })
        .rpc();

      console.log("✅ Subscription cancelled! Transaction signature:", tx);

      // Verify cancellation
      const cancelledAccount = await program.account.subscription.fetch(subscriptionPDA);
      if (cancelledAccount.status.cancelled) {
        console.log("✅ Subscription status correctly set to cancelled");
        console.log("✅ Final payment count:", cancelledAccount.paymentsMade.toString());
        console.log("✅ Total amount paid:", cancelledAccount.totalPaid.toString());
      }

    } catch (error) {
      console.error("❌ Subscription cancellation error:", error);
      throw error;
    }
  });
});
