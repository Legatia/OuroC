import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { OurocPrima } from "../target/types/ouroc_prima";

/**
 * Test the new ONE-CLICK subscription creation flow
 * This demonstrates that users only need to sign once to:
 * 1. Create their subscription on-chain
 * 2. Approve delegation for automated payments
 */

async function main() {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ourocPrima as Program<OurocPrima>;
  const subscriber = provider.wallet.publicKey;

  const PROGRAM_ID = new PublicKey("CFEtrptTe5eFXpZtB3hr1VMGuWF9oXguTnUFUaeVgeyT");

  // Test subscription parameters
  const subscriptionId = `test_${Date.now()}`; // Unique ID for this test
  const amount = 1_000_000; // 1 USDC
  const intervalSeconds = 10; // 10 seconds for quick testing
  const merchantPubkey = subscriber; // For testing, merchant is same as subscriber
  const merchantName = "Test Merchant";
  const reminderDaysBeforePayment = 1;

  console.log("\n🧪 Testing ONE-CLICK Subscription Creation");
  console.log("━".repeat(80));
  console.log("Program ID:", PROGRAM_ID.toString());
  console.log("Subscription ID:", subscriptionId);
  console.log("Amount:", amount / 1_000_000, "USDC per payment");
  console.log("Interval:", intervalSeconds, "seconds");
  console.log("Subscriber (you):", subscriber.toString());
  console.log("Merchant:", merchantPubkey.toString());

  // Derive subscription PDA
  const [subscriptionPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("subscription"), Buffer.from(subscriptionId)],
    PROGRAM_ID
  );

  console.log("\n🔍 Derived subscription PDA:", subscriptionPDA.toString());

  // Derive config PDA
  const [configPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );

  console.log("Config PDA:", configPDA.toString());

  // Get or create subscriber's USDC token account
  const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  const subscriberTokenAccount = await getAssociatedTokenAddress(
    usdcMint,
    subscriber
  );

  console.log("Subscriber USDC Token Account:", subscriberTokenAccount.toString());

  // Check USDC balance
  try {
    const connection = provider.connection;
    const tokenAccountInfo = await connection.getTokenAccountBalance(subscriberTokenAccount);
    console.log("Current USDC Balance:", tokenAccountInfo.value.uiAmount, "USDC");

    if (parseFloat(tokenAccountInfo.value.amount) < amount) {
      console.log("\n⚠️  Warning: Insufficient USDC balance for payment");
      console.log("   You may need to fund this account for actual payments to work");
    }
  } catch (e) {
    console.log("\n⚠️  USDC token account not found. Creating it...");
    // Token account will be created automatically when needed
  }

  // For testing: Generate a dummy ICP signature (64 bytes of zeros)
  // In production, this should come from the ICP canister
  const icpSignature = Array.from({ length: 64 }, () => 0);

  console.log("\n💡 ONE-CLICK FLOW Benefits:");
  console.log("   ✅ User signs only ONCE");
  console.log("   ✅ Subscription created on-chain");
  console.log("   ✅ Delegation approved automatically (1 year of payments)");
  console.log("   ✅ No need for separate approve_subscription_delegate call");
  console.log("   ✅ Better UX - fewer transactions, lower fees");

  console.log("\n⚠️  Using dummy ICP signature for testing");
  console.log("   In production, get signature from: dfx canister call timer_rust generate_payment_signature");

  try {
    console.log("\n🔄 Sending create_subscription transaction...");
    console.log("   (This single transaction does both creation AND delegation approval)");

    const tx = await program.methods
      .createSubscription(
        subscriptionId,
        new anchor.BN(amount),
        new anchor.BN(intervalSeconds),
        merchantPubkey,
        merchantName,
        reminderDaysBeforePayment,
        icpSignature
      )
      .accountsStrict({
        subscription: subscriptionPDA,
        subscriptionPda: subscriptionPDA,
        subscriberTokenAccount: subscriberTokenAccount,
        config: configPDA,
        subscriber: subscriber,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("\n✅ SUCCESS! Subscription created with automatic delegation!");
    console.log("━".repeat(80));
    console.log("Transaction signature:", tx);
    console.log("Subscription PDA:", subscriptionPDA.toString());

    // Verify creation
    const createdSub = await program.account.subscription.fetch(subscriptionPDA);
    console.log("\n📋 Created Subscription Details:");
    console.log("   ID:", createdSub.id);
    console.log("   Subscriber:", createdSub.subscriber.toString());
    console.log("   Merchant:", createdSub.merchant.toString());
    console.log("   Amount:", createdSub.amount.toString(), "micro-USDC (", createdSub.amount.toNumber() / 1_000_000, "USDC)");
    console.log("   Interval:", createdSub.intervalSeconds.toString(), "seconds");
    console.log("   Status:", Object.keys(createdSub.status)[0]);
    console.log("   Next Payment:", new Date(createdSub.nextPaymentTime.toNumber() * 1000).toISOString());
    console.log("   Total Subscriptions Created:", (await program.account.config.fetch(configPDA)).totalSubscriptions.toString());

    // Verify delegation was approved
    const connection = provider.connection;
    const tokenAccountInfo = await connection.getParsedAccountInfo(subscriberTokenAccount);
    if (tokenAccountInfo.value && 'parsed' in tokenAccountInfo.value.data) {
      const delegateInfo = tokenAccountInfo.value.data.parsed.info.delegate;
      const delegatedAmount = tokenAccountInfo.value.data.parsed.info.delegatedAmount?.uiAmount;

      console.log("\n✅ Delegation Verification:");
      console.log("   Delegate PDA:", delegateInfo || "Not set");
      console.log("   Delegated Amount:", delegatedAmount || 0, "USDC");

      if (delegateInfo === subscriptionPDA.toString()) {
        console.log("   ✅ Delegation correctly set to subscription PDA!");
      }
    }

    console.log("\n🎉 One-click subscription creation successful!");
    console.log("   Now ICP timer can trigger automated recurring payments");
    console.log("\n📝 Next Steps:");
    console.log("   1. Register this subscription in ICP timer canister");
    console.log("   2. ICP will automatically trigger payments at the specified interval");
    console.log("   3. User doesn't need to sign again for recurring payments!");

  } catch (error: any) {
    console.error("\n❌ Failed to create subscription:");
    if (error.logs) {
      console.error("\nProgram Logs:");
      error.logs.forEach((log: string) => console.error("  ", log));
    }
    console.error("\nError:", error.message || error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
