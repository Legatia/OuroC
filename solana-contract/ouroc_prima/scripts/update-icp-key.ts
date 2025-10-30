import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { OurocPrima } from "../target/types/ouroc_prima";
import bs58 from "bs58";

/**
 * Update ICP Public Key in Solana Contract
 */

async function main() {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ourocPrima as Program<OurocPrima>;
  const authority = provider.wallet.publicKey;

  const PROGRAM_ID = new PublicKey("CFEtrptTe5eFXpZtB3hr1VMGuWF9oXguTnUFUaeVgeyT");

  console.log("\n🔑 Updating ICP Public Key");
  console.log("━".repeat(80));
  console.log("Program ID:", PROGRAM_ID.toString());
  console.log("Authority:", authority.toString());

  // Derive config PDA
  const [configPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );

  console.log("Config PDA:", configPDA.toString());

  // ICP public key from get_ed25519_public_key()
  const icpPublicKeyBase58 = "6zrByBiExfFCaj6m1ELJGFoy1vYj4CyJeUQhzxQaosyh";
  const icpPublicKeyBytes = bs58.decode(icpPublicKeyBase58);

  console.log("\n🔐 ICP Public Key (base58):", icpPublicKeyBase58);
  console.log("🔐 ICP Public Key (bytes):", Array.from(icpPublicKeyBytes));
  console.log("🔐 Length:", icpPublicKeyBytes.length, "bytes");

  if (icpPublicKeyBytes.length !== 32) {
    throw new Error(`Invalid public key length: expected 32 bytes, got ${icpPublicKeyBytes.length}`);
  }

  try {
    console.log("\n🔄 Updating authorization mode to ICPSignature with real public key...");

    const tx = await program.methods
      .updateAuthorizationMode(
        { icpSignature: {} }, // AuthorizationMode::ICPSignature
        Array.from(icpPublicKeyBytes) // Convert to array of numbers
      )
      .accounts({
        config: configPDA,
        authority: authority,
      })
      .rpc();

    console.log("\n✅ Authorization mode updated successfully!");
    console.log("Transaction signature:", tx);

    // Verify the update
    const config = await program.account.config.fetch(configPDA);
    console.log("\n📋 Updated Config:");
    console.log("   Authorization Mode:", Object.keys(config.authorizationMode)[0]);
    console.log("   ICP Public Key Set:", config.icpPublicKey !== null);

    if (config.icpPublicKey) {
      const retrievedKey = bs58.encode(Buffer.from(config.icpPublicKey));
      console.log("   ICP Public Key (base58):", retrievedKey);

      if (retrievedKey === icpPublicKeyBase58) {
        console.log("   ✅ Public key matches!");
      } else {
        console.log("   ⚠️  Public key mismatch!");
        console.log("      Expected:", icpPublicKeyBase58);
        console.log("      Got:", retrievedKey);
      }
    }

  } catch (error) {
    console.error("\n❌ Failed to update authorization mode:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
