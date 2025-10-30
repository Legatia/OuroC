import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { OurocPrima } from "../target/types/ouroc_prima";

/**
 * Create the missing subscription on Solana
 * This subscription exists in ICP but not on Solana blockchain
 */

async function main() {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ourocPrima as Program<OurocPrima>;

  const PROGRAM_ID = new PublicKey("CFEtrptTe5eFXpZtB3hr1VMGuWF9oXguTnUFUaeVgeyT");

  // Subscription details from ICP
  const subscriptionId = "b1fb16380ebfd2822a4e025116373893";
  const amount = 1_000_000; // 1 USDC
  const intervalSeconds = 10; // 10 seconds
  const subscriberPubkey = new PublicKey("4m1oKRyqhRG1xHPCWM5uUxL6kDgsazErsdThMMe2Z8Sd");
  const merchantPubkey = new PublicKey("HBvV7YqSRSPW4YEBsDvpvF2PrUWFubqVbTNYafkddTsy");
  const merchantName = "Test Merchant";
  const reminderDaysBeforePayment = 1;

  console.log("\n🏗️  Creating Missing Subscription on Solana");
  console.log("━".repeat(80));
  console.log("Program ID:", PROGRAM_ID.toString());
  console.log("Subscription ID:", subscriptionId);
  console.log("Amount:", amount / 1_000_000, "USDC");
  console.log("Interval:", intervalSeconds, "seconds");
  console.log("Subscriber:", subscriberPubkey.toString());
  console.log("Merchant:", merchantPubkey.toString());

  // Derive subscription PDA
  const [subscriptionPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("subscription"), Buffer.from(subscriptionId)],
    PROGRAM_ID
  );

  console.log("\n🔍 Derived subscription PDA:", subscriptionPDA.toString());

  // Check if subscription already exists
  try {
    const existingSub = await program.account.subscription.fetch(subscriptionPDA);
    console.log("\n⚠️  Subscription already exists!");
    console.log("   Subscriber:", existingSub.subscriber.toString());
    console.log("   Merchant:", existingSub.merchant.toString());
    console.log("   Amount:", existingSub.amount.toString());
    return;
  } catch (e) {
    console.log("\n✅ Subscription doesn't exist yet, proceeding with creation...");
  }

  // Derive config PDA
  const [configPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );

  console.log("Config PDA:", configPDA.toString());

  // Get subscriber's USDC token account (USDC devnet mint)
  const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  const subscriberTokenAccount = await getAssociatedTokenAddress(
    usdcMint,
    subscriberPubkey
  );

  console.log("Subscriber USDC Token Account:", subscriberTokenAccount.toString());

  // For testing: Generate a dummy ICP signature (64 bytes of zeros)
  // In production, this should come from the ICP canister
  const icpSignature = new Array(64).fill(0);

  console.log("\n⚠️  Using dummy ICP signature for testing");
  console.log("   In production, this must come from ICP canister's Ed25519 signature");
  console.log("\n💡 ONE-CLICK FLOW: This single transaction will:");
  console.log("   1. Create the subscription account on-chain");
  console.log("   2. Automatically approve delegation for 1 year of payments");
  console.log("   User only needs to sign ONCE! ✅");

  try {
    console.log("\n🔄 Sending create_subscription transaction (with auto-delegation)...");

    const tx = await program.methods
      .createSubscription(
        subscriptionId,
        new anchor.BN(amount),
        new anchor.BN(intervalSeconds),
        merchantPubkey,
        merchantName,
        reminderDaysBeforePayment,
        Buffer.from(icpSignature)
      )
      .accounts({
        subscription: subscriptionPDA,
        subscriptionPda: subscriptionPDA,
        subscriberTokenAccount: subscriberTokenAccount,
        config: configPDA,
        subscriber: subscriberPubkey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("\n✅ Subscription created successfully!");
    console.log("Transaction signature:", tx);
    console.log("Subscription PDA:", subscriptionPDA.toString());

    // Verify creation
    const createdSub = await program.account.subscription.fetch(subscriptionPDA);
    console.log("\n📋 Created Subscription Details:");
    console.log("   ID:", createdSub.id);
    console.log("   Subscriber:", createdSub.subscriber.toString());
    console.log("   Merchant:", createdSub.merchant.toString());
    console.log("   Amount:", createdSub.amount.toString(), "micro-USDC");
    console.log("   Interval:", createdSub.intervalSeconds.toString(), "seconds");
    console.log("   Status:", Object.keys(createdSub.status)[0]);
    console.log("   Next Payment:", new Date(createdSub.nextPaymentTime.toNumber() * 1000).toISOString());

  } catch (error) {
    console.error("\n❌ Failed to create subscription:");
    console.error(error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
