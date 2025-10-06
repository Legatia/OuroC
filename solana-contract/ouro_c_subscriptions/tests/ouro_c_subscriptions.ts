import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { OuroCSubscriptions } from "../target/types/ouro_c_subscriptions";

describe("ouro_c_subscriptions", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.ouroCSubscriptions as Program<OuroCSubscriptions>;
  const authority = anchor.AnchorProvider.env().wallet;

  it("Is initialized!", async () => {
    // Derive config PDA
    const [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    try {
      const tx = await program.methods
        .initialize()
        .accounts({
          config: configPDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Ouro-C Subscriptions initialized! Transaction signature:", tx);

      // Verify the config account was created correctly
      const configAccount = await program.account.config.fetch(configPDA);
      console.log("Config account created:", {
        authority: configAccount.authority.toString(),
        totalSubscriptions: configAccount.totalSubscriptions.toString(),
        paused: configAccount.paused
      });

    } catch (error) {
      console.error("Initialization error:", error);
      throw error;
    }
  });

  it("Creates a subscription", async () => {
    const subscriptionId = "test-sub-001";
    const amount = new anchor.BN(5_000_000); // 5 USDC in micro-units
    const intervalSeconds = new anchor.BN(30 * 24 * 60 * 60); // 30 days
    const merchantAddress = anchor.web3.Keypair.generate().publicKey;
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
          dummySignature
        )
        .accounts({
          subscription: subscriptionPDA,
          config: configPDA,
          subscriber: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Subscription created! Transaction signature:", tx);

      // Verify the subscription account
      const subscriptionAccount = await program.account.subscription.fetch(subscriptionPDA);
      console.log("Subscription created:", {
        id: subscriptionAccount.id,
        subscriber: subscriptionAccount.subscriber.toString(),
        merchant: subscriptionAccount.merchant.toString(),
        amount: subscriptionAccount.amount.toString(),
        intervalSeconds: subscriptionAccount.intervalSeconds.toString(),
        status: subscriptionAccount.status,
        paymentsMade: subscriptionAccount.paymentsMade.toString()
      });

    } catch (error) {
      console.error("Subscription creation error:", error);
      throw error;
    }
  });
});
