import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { OurocPrima } from '../target/types/ouroc_prima';

async function main() {
  // Setup provider
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();

  const programId = new PublicKey('7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub');

  // Load IDL
  const idl = await Program.fetchIdl(programId, provider);
  if (!idl) {
    throw new Error('IDL not found');
  }

  const program = new Program(idl, provider) as Program<OurocPrima>;

  // ICP Canister Public Key (from initialized canister)
  // Main wallet: D2hWeWekkcxJisDHLcFJEgzwvDE9yJmB7NKzLpvdSp6e
  const ICP_PUBLIC_KEY = [
    178, 187, 161, 73, 157, 98, 119, 23, 21, 35, 66, 31, 83, 103, 251, 205,
    168, 201, 97, 177, 196, 154, 186, 25, 88, 125, 85, 172, 8, 209, 39, 107
  ];

  // Derive config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    programId
  );

  // ICP Fee wallet address
  const ICP_FEE_WALLET = new PublicKey('egE7ugJ46UQzA3t179X6fctKAZ6nBVjZ27kXYzmtKzR');

  // USDC mint (devnet)
  const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

  // Get ICP fee collection USDC account
  const icpFeeUsdcAccount = await getAssociatedTokenAddress(
    USDC_MINT,
    ICP_FEE_WALLET
  );

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║            OuroC-Prima - Initialization                ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Configuration:');
  console.log('  Program ID:', programId.toBase58());
  console.log('  Config PDA:', configPda.toBase58());
  console.log('  Authority:', provider.wallet.publicKey.toBase58());
  console.log('');
  console.log('ICP Canister:');
  console.log('  Canister ID: 7tbxr-naaaa-aaaao-qkrca-cai');
  console.log('  Main Wallet: D2hWeWekkcxJisDHLcFJEgzwvDE9yJmB7NKzLpvdSp6e');
  console.log('  Fee Wallet:', ICP_FEE_WALLET.toBase58());
  console.log('  Fee USDC Account:', icpFeeUsdcAccount.toBase58());
  console.log('  Public Key (hex):', Buffer.from(ICP_PUBLIC_KEY).toString('hex'));
  console.log('');
  console.log('Settings:');
  console.log('  Authorization Mode: Hybrid (ICP + Manual Fallback)');
  console.log('  Platform Fee: 1%');
  console.log('');

  // Check if already initialized
  try {
    const existingConfig = await program.account.config.fetch(configPda);
    console.log('⚠️  Config already initialized!');
    console.log('');
    console.log('Existing configuration:');
    console.log('  Authority:', existingConfig.authority.toBase58());
    console.log('  Paused:', existingConfig.paused);
    console.log('  Authorization Mode:', Object.keys(existingConfig.authorizationMode)[0]);
    console.log('  Fee:', existingConfig.feeConfig.feePercentageBasisPoints, 'bps');

    if (existingConfig.icpPublicKey) {
      const existingKey = Buffer.from(existingConfig.icpPublicKey).toString('hex');
      const newKey = Buffer.from(ICP_PUBLIC_KEY).toString('hex');
      console.log('  ICP Public Key:', existingKey);
      console.log('  Matches new key:', existingKey === newKey ? '✅ YES' : '❌ NO');
    }

    console.log('');
    console.log('To update, use update_authorization_mode instruction.');
    return;
  } catch (error: any) {
    if (!error.message?.includes('Account does not exist')) {
      throw error;
    }
    // Config doesn't exist, proceed with initialization
  }

  console.log('Initializing program...');
  console.log('');

  try {
    const tx = await program.methods
      .initialize(
        { hybrid: {} },     // Authorization mode: Hybrid
        ICP_PUBLIC_KEY,     // 32-byte Ed25519 public key from ICP canister
        100                 // 1% fee (100 basis points)
      )
      .accounts({
        authority: provider.wallet.publicKey,
        icpFeeUsdcAccount: icpFeeUsdcAccount,
      })
      .rpc();

    console.log('✅ SUCCESS! Program initialized');
    console.log('');
    console.log('Transaction:', tx);
    console.log('Config PDA:', configPda.toBase58());
    console.log('');
    console.log('View on Solscan:');
    console.log('  https://solscan.io/tx/' + tx + '?cluster=devnet');
    console.log('  https://solscan.io/account/' + configPda.toBase58() + '?cluster=devnet');
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Create fee collection USDC account for ICP fee wallet');
    console.log('  2. Update config with fee collection address');
    console.log('  3. Create test subscription');
    console.log('  4. Test ICP → Solana payment flow');

  } catch (error: any) {
    console.error('❌ ERROR: Initialization failed');
    console.error('');

    if (error.message?.includes('already in use')) {
      console.error('Config account already initialized!');
      console.error('Use update_authorization_mode to change settings.');
    } else if (error.logs) {
      console.error('Program logs:');
      error.logs.forEach((log: string) => console.error('  ', log));
    } else {
      console.error('Error:', error.message || error);
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
