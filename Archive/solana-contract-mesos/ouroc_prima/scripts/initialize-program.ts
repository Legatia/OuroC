import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { OurocPrima } from "../target/types/ouroc_prima";

/**
 * Initialize OuroC-Prima Subscription Program on Devnet
 *
 * This is a one-time setup
 */

async function main() {
  // Configure provider for devnet
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ourocPrima as Program<OurocPrima>;
  const authority = provider.wallet.publicKey;

  const USDC_MINT_DEVNET = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  const PROGRAM_ID = new PublicKey("7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub");

  console.log("\n🚀 Initializing OuroC-Prima Subscription Program");
  console.log("━".repeat(80));
  console.log("Program ID:", PROGRAM_ID.toString());
  console.log("Authority:", authority.toString());
  console.log("USDC Mint:", USDC_MINT_DEVNET.toString());
  console.log("━".repeat(80));

  // Derive config PDA
  const [configPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );

  console.log("\n📝 Config PDA:", configPDA.toString());

  // Check if already initialized
  try {
    const config = await program.account.config.fetch(configPDA);
    console.log("\n⚠️  Program already initialized!");
    console.log("   Authority:", config.authority.toString());
    console.log("   Total Subs:", config.totalSubscriptions.toString());
    console.log("   Platform Fee:", config.platformFeeBps, "bps");
    console.log("   Paused:", config.paused);
    console.log("\nNo action needed. Program is ready to use.");
    return;
  } catch (e) {
    console.log("\n📝 Program not initialized. Initializing now...");
  }

  // ICP public key (mock for devnet - 32 bytes of zeros)
  const icpPublicKey = Array(32).fill(0);

  // Derive ICP fee USDC account
  const [icpFeeUsdcAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("icp_fee_usdc")],
    PROGRAM_ID
  );

  console.log("\n⚙️  ICP Fee Account:", icpFeeUsdcAccount.toString());
  console.log("   Platform Fee: 100 bps (1%)");
  console.log("   Authorization: ICP Signature");

  try {
    console.log("\n🔄 Sending initialization transaction...");

    const tx = await program.methods
      .initialize(
        { icpSignature: {} }, // AuthorizationMode
        icpPublicKey, // ICP public key (32 bytes)
        100 // Platform fee: 100 bps = 1%
      )
      .accounts({
        config: configPDA,
        authority: authority,
        icpFeeUsdcAccount: icpFeeUsdcAccount,
        usdcMint: USDC_MINT_DEVNET,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("\n✅ Program initialized successfully!");
    console.log("   Transaction:", tx);

    // Verify initialization
    const config = await program.account.config.fetch(configPDA);

    console.log("\n📋 Configuration:");
    console.log("   Authority:", config.authority.toString());
    console.log("   ICP Public Key:", Buffer.from(config.icpPublicKey).toString('hex').slice(0, 16) + "...");
    console.log("   Platform Fee:", config.platformFeeBps, "bps (1%)");
    console.log("   Paused:", config.paused);
    console.log("   Total Subscriptions:", config.totalSubscriptions.toString());

    console.log("\n🎉 Setup complete! You can now:");
    console.log("   • Create subscriptions");
    console.log("   • Register with ICP timer");
    console.log("   • Process payments");

    console.log("\n📋 Next steps:");
    console.log("   1. Run subscription flow test: npm run test:flow");
    console.log("   2. Wait for USDC faucet");
    console.log("   3. Test payment execution");

  } catch (error: any) {
    console.error("\n❌ Initialization failed:", error.message);
    if (error.logs) {
      console.log("\nProgram logs:");
      error.logs.forEach((log: string) => console.log("  ", log));
    }
    process.exit(1);
  }

  console.log("\n━".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
