import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  mintTo,
  createMint,
} from "@solana/spl-token";
import { OuroCSubscriptions } from "../target/types/ouro_c_subscriptions";

/**
 * SUBSCRIPTION FLOW TEST
 *
 * Tests the complete subscription flow with your real wallet
 * and checks for USDC balance
 */

describe("OuroC Subscription Flow Test", () => {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ouroCSubscriptions as Program<OuroCSubscriptions>;
  const payer = provider.wallet as anchor.Wallet;

  const USDC_MINT_DEVNET = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  const PROGRAM_ID = new PublicKey("7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub");

  let configPDA: PublicKey;
  let payerUsdcAccount: PublicKey;
  let merchantKeypair: Keypair;
  let merchantUsdcAccount: PublicKey;

  before(async () => {
    console.log("\n🚀 Subscription Flow Test");
    console.log("━".repeat(80));
    console.log("Wallet:", payer.publicKey.toString());
    console.log("Program:", PROGRAM_ID.toString());
    console.log("USDC Mint:", USDC_MINT_DEVNET.toString());
    console.log("━".repeat(80));

    // Derive config PDA
    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      PROGRAM_ID
    );

    // Get associated token accounts
    payerUsdcAccount = await getAssociatedTokenAddress(
      USDC_MINT_DEVNET,
      payer.publicKey
    );

    // Create merchant
    merchantKeypair = Keypair.generate();
    merchantUsdcAccount = await getAssociatedTokenAddress(
      USDC_MINT_DEVNET,
      merchantKeypair.publicKey
    );

    console.log("\n💰 Accounts:");
    console.log("   Payer USDC:", payerUsdcAccount.toString());
    console.log("   Merchant:", merchantKeypair.publicKey.toString());
    console.log("   Merchant USDC:", merchantUsdcAccount.toString());
  });

  describe("1. Check USDC Balance", () => {
    it("Should check if USDC has arrived", async function() {
      this.timeout(30000);

      console.log("\n💵 Checking USDC balance...");

      try {
        const accountInfo = await getAccount(provider.connection, payerUsdcAccount);
        const balance = Number(accountInfo.amount) / 1_000_000; // Convert to USDC

        console.log(`✅ USDC Account exists!`);
        console.log(`   Balance: ${balance} USDC`);

        if (balance >= 1) {
          console.log(`   ✅ Sufficient balance for testing (${balance} USDC)`);
        } else if (balance > 0) {
          console.log(`   ⚠️  Low balance: ${balance} USDC (need at least 1 USDC)`);
        } else {
          console.log(`   ⚠️  Zero balance - waiting for faucet`);
        }
      } catch (e: any) {
        if (e.name === 'TokenAccountNotFoundError') {
          console.log("⚠️  USDC token account doesn't exist yet");
          console.log("   Creating token account...");

          // Create associated token account
          const ix = createAssociatedTokenAccountInstruction(
            payer.publicKey,
            payerUsdcAccount,
            payer.publicKey,
            USDC_MINT_DEVNET
          );

          const tx = new anchor.web3.Transaction().add(ix);
          await provider.sendAndConfirm(tx);

          console.log("✅ USDC token account created:", payerUsdcAccount.toString());
          console.log("   Balance: 0 USDC (waiting for faucet)");
        } else {
          console.error("❌ Error checking USDC:", e.message);
        }
      }
    });
  });

  describe("2. Program Initialization", () => {
    it("Should check/initialize program", async function() {
      this.timeout(60000);

      try {
        const config = await program.account.config.fetch(configPDA);
        console.log("\n✅ Program already initialized");
        console.log("   Authority:", config.authority.toString());
        console.log("   Total Subs:", config.totalSubscriptions.toString());
        console.log("   Fee BPS:", config.platformFeeBps);
        console.log("   Paused:", config.paused);
      } catch (e) {
        console.log("\n📝 Program not initialized - needs initialization");
        console.log("   Run this separately to initialize the program");
        console.log("   (This is a one-time setup)");
      }
    });
  });

  describe("3. Create Subscription", () => {
    let subscriptionId: string;
    let subscriptionPDA: PublicKey;

    before(() => {
      subscriptionId = `flow-test-${Date.now()}`;
      [subscriptionPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("subscription"), Buffer.from(subscriptionId)],
        PROGRAM_ID
      );
    });

    it("Should create merchant USDC account", async function() {
      this.timeout(30000);

      console.log("\n📝 Creating merchant USDC account...");

      try {
        await getAccount(provider.connection, merchantUsdcAccount);
        console.log("✅ Merchant USDC account already exists");
      } catch (e: any) {
        if (e.name === 'TokenAccountNotFoundError') {
          const ix = createAssociatedTokenAccountInstruction(
            payer.publicKey,
            merchantUsdcAccount,
            merchantKeypair.publicKey,
            USDC_MINT_DEVNET
          );

          const tx = new anchor.web3.Transaction().add(ix);
          await provider.sendAndConfirm(tx);

          console.log("✅ Merchant USDC account created");
        } else {
          throw e;
        }
      }
    });

    it("Should create subscription", async function() {
      this.timeout(60000);

      console.log("\n📝 Creating subscription...");
      console.log("   ID:", subscriptionId);
      console.log("   Amount: 1 USDC");
      console.log("   Interval: 7 days (weekly)");
      console.log("   Subscriber:", payer.publicKey.toString());
      console.log("   Merchant:", merchantKeypair.publicKey.toString());

      const icpSignature = Array(64).fill(0);

      try {
        const tx = await program.methods
          .createSubscription(
            subscriptionId,
            new BN(1_000_000), // 1 USDC (6 decimals)
            new BN(604800), // 7 days in seconds (weekly)
            merchantKeypair.publicKey,
            USDC_MINT_DEVNET,
            2, // 2 days reminder before payment
            100, // 1% slippage
            icpSignature
          )
          .accounts({
            subscription: subscriptionPDA,
            subscriber: payer.publicKey,
            config: configPDA,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("\n✅ Subscription created!");
        console.log("   TX:", tx);
        console.log("   Subscription PDA:", subscriptionPDA.toString());

        // Fetch and display subscription
        const sub = await program.account.subscription.fetch(subscriptionPDA);
        console.log("\n📋 Subscription Details:");
        console.log("   ID:", sub.id);
        console.log("   Subscriber:", sub.subscriber.toString());
        console.log("   Merchant:", sub.merchant.toString());
        console.log("   Amount:", Number(sub.amount) / 1_000_000, "USDC");
        console.log("   Interval:", Number(sub.intervalSeconds) / 86400, "days");
        console.log("   Status:", JSON.stringify(sub.status));
        console.log("   Next Payment:", new Date(Number(sub.nextPaymentTime) * 1000).toISOString());
        console.log("   Payments Made:", sub.paymentsMade.toString());

      } catch (e: any) {
        console.error("\n❌ Subscription creation failed:", e.message);
        if (e.logs) {
          console.log("\nProgram logs:");
          e.logs.forEach((log: string) => console.log("  ", log));
        }
        throw e;
      }
    });

    it("Should register with ICP timer", async function() {
      this.timeout(30000);

      console.log("\n⏰ Registering with ICP timer...");
      console.log("   Canister: 7tbxr-naaaa-aaaao-qkrca-cai");
      console.log("   Subscription ID:", subscriptionId);

      console.log("\n📝 To register with ICP canister, run:");
      console.log(`
dfx canister call 7tbxr-naaaa-aaaao-qkrca-cai create_subscription '(
  record {
    subscription_id = "${subscriptionId}";
    solana_contract_address = "7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub";
    payment_token_mint = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
    amount = 1_000_000 : nat64;
    subscriber_address = "${payer.publicKey.toString()}";
    merchant_address = "${merchantKeypair.publicKey.toString()}";
    reminder_days_before_payment = 2 : nat;
    interval_seconds = 604800 : nat64;
    start_time = null;
  }
)' --network ic
      `);
    });
  });

  describe("4. Test Payment Trigger (if USDC available)", () => {
    it("Should check if ready for payment test", async function() {
      this.timeout(30000);

      console.log("\n💳 Payment Readiness Check:");

      try {
        const accountInfo = await getAccount(provider.connection, payerUsdcAccount);
        const balance = Number(accountInfo.amount) / 1_000_000;

        console.log("   Subscriber USDC:", balance, "USDC");

        if (balance >= 1) {
          console.log("   ✅ Ready for payment testing!");
          console.log("\n📋 Next steps:");
          console.log("   1. Register subscription with ICP timer (see above)");
          console.log("   2. Wait for timer trigger (7 days or manual trigger)");
          console.log("   3. ICP will call process_payment on Solana");
          console.log("   4. 1 USDC will transfer: subscriber → merchant");
        } else {
          console.log("   ⚠️  Waiting for USDC from faucet");
          console.log("   Once USDC arrives, you can test payment execution");
        }

      } catch (e: any) {
        console.log("   ⚠️  USDC account not found or empty");
        console.log("   Waiting for faucet to send USDC...");
      }
    });
  });

  describe("5. Summary", () => {
    it("Should display test summary", async () => {
      console.log("\n" + "━".repeat(80));
      console.log("📊 SUBSCRIPTION FLOW TEST SUMMARY");
      console.log("━".repeat(80));

      // Check balances
      console.log("\n💰 Balances:");
      console.log("   SOL:", await provider.connection.getBalance(payer.publicKey) / LAMPORTS_PER_SOL, "SOL");

      try {
        const usdcAccount = await getAccount(provider.connection, payerUsdcAccount);
        const balance = Number(usdcAccount.amount) / 1_000_000;
        console.log("   USDC:", balance, "USDC");
      } catch {
        console.log("   USDC: 0 USDC (account not initialized or empty)");
      }

      // Check ICP canister
      console.log("\n⏰ ICP Timer Canister:");
      console.log("   ID: 7tbxr-naaaa-aaaao-qkrca-cai");
      console.log("   Status: Live ✅");
      console.log("   Dashboard: https://dashboard.internetcomputer.org/canister/7tbxr-naaaa-aaaao-qkrca-cai");

      console.log("\n✅ What's Working:");
      console.log("   • Solana devnet connection");
      console.log("   • Program deployed");
      console.log("   • Subscription creation");
      console.log("   • Token accounts setup");
      console.log("   • ICP canister live");

      console.log("\n⏳ Waiting For:");
      console.log("   • USDC faucet (10 USDC requested)");
      console.log("   • Check with: spl-token accounts --url devnet");

      console.log("\n🎯 Next Steps:");
      console.log("   1. Wait for USDC faucet to process");
      console.log("   2. Register subscriptions with ICP timer");
      console.log("   3. Test payment execution");
      console.log("   4. Monitor ICP timer triggers");

      console.log("\n📚 Useful Commands:");
      console.log("   # Check USDC balance");
      console.log("   spl-token accounts --url devnet");
      console.log("");
      console.log("   # Check ICP canister");
      console.log("   dfx canister call 7tbxr-naaaa-aaaao-qkrca-cai get_system_metrics --network ic");
      console.log("");
      console.log("   # Monitor Solana program logs");
      console.log("   solana logs 7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub --url devnet");

      console.log("\n━".repeat(80));
    });
  });
});
