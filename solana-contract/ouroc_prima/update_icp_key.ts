import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import bs58 from "bs58";

async function main() {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const programId = new PublicKey("CFEtrptTe5eFXpZtB3hr1VMGuWF9oXguTnUFUaeVgeyT");
  const idl = JSON.parse(fs.readFileSync("./target/idl/ouroc_prima.json", "utf8"));
  const program = new Program(idl as anchor.Idl, provider);

  // Derive config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );

  // ICP mainnet canister Ed25519 public key (Base58)
  const icpPublicKeyBase58 = "6zrByBiExfFCaj6m1ELJGFoy1vYj4CyJeUQhzxQaosyh";

  // Decode from Base58 to get 32-byte array
  const icpPublicKeyBytes = bs58.decode(icpPublicKeyBase58);

  if (icpPublicKeyBytes.length !== 32) {
    throw new Error(`Invalid public key length: ${icpPublicKeyBytes.length}, expected 32`);
  }

  const icpPublicKeyArray = Array.from(icpPublicKeyBytes);

  console.log("Updating ICP public key in Solana contract config...");
  console.log("Config PDA:", configPda.toString());
  console.log("ICP Public Key (Base58):", icpPublicKeyBase58);
  console.log("ICP Public Key (bytes):", icpPublicKeyArray);
  console.log("Authority:", provider.wallet.publicKey.toString());

  try {
    const tx = await program.methods
      .updateAuthorizationMode(
        { icpSignature: {} }, // Keep ICPSignature mode
        icpPublicKeyArray // Update with mainnet public key
      )
      .accounts({
        config: configPda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    console.log("✅ ICP public key updated successfully!");
    console.log("Transaction signature:", tx);
  } catch (error) {
    console.error("❌ Update failed:", error);
    throw error;
  }
}

main();
