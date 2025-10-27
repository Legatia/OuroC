import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";

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

  console.log("Initializing program...");
  console.log("Config PDA:", configPda.toString());
  console.log("Authority:", provider.wallet.publicKey.toString());

  try {
    const tx = await program.methods
      .initialize(
        { icpSignature: {} }, // AuthorizationMode::ICPSignature
        null // No ICP public key for now (optional)
      )
      .accounts({
        config: configPda,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Program initialized!");
    console.log("Transaction signature:", tx);
  } catch (error) {
    console.error("❌ Initialization failed:", error);
    throw error;
  }
}

main();
