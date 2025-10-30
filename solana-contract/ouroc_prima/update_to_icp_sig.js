const { AnchorProvider, Wallet } = require('@coral-xyz/anchor');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const fs = require('fs');

// ICP public key from canister
const ICP_PUBLIC_KEY_BASE58 = '6zrByBiExfFCaj6m1ELJGFoy1vYj4CyJeUQhzxQaosyh';

async function updateToICPSignature() {
    try {
        console.log('🔧 Updating Solana contract to ICPSignature mode...');
        console.log('📋 ICP Public Key:', ICP_PUBLIC_KEY_BASE58);

        // Load wallet
        const walletPath = process.env.HOME + '/.config/solana/id.json';
        if (!fs.existsSync(walletPath)) {
            throw new Error('Wallet not found at ' + walletPath);
        }

        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        const walletKeypair = Keypair.fromSecretKey(
            Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
        );

        console.log('👛 Wallet:', walletKeypair.publicKey.toString());

        // Load program
        const programId = new PublicKey('7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub');
        const idl = JSON.parse(fs.readFileSync('./target/idl/ouroc_prima.json', 'utf-8'));

        const wallet = new Wallet(walletKeypair);
        const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });

        const { Program } = require('@coral-xyz/anchor');
        const program = new Program(idl, programId, provider);

        // Derive config PDA
        const [configPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('config')],
            programId
        );

        console.log('📋 Config PDA:', configPda.toString());

        // Convert ICP public key to bytes
        const icpPublicKey = PublicKey.decode(ICP_PUBLIC_KEY_BASE58);
        const icpPubkeyBytes = Array.from(icpPublicKey);

        console.log('🔐 ICP Public Key bytes:', icpPubkeyBytes.slice(0, 8), '... (32 bytes total)');

        // Update authorization mode to ICPSignature
        console.log('📡 Sending transaction to update authorization mode...');

        const tx = await program.methods
            .updateAuthorizationMode(
                { icpSignature: {} },  // ICPSignature variant
                icpPubkeyBytes         // ICP public key as [u8; 32]
            )
            .accounts({
                config: configPda,
                authority: walletKeypair.publicKey,
            })
            .rpc();

        console.log('✅ Authorization mode updated to ICPSignature');
        console.log('📝 Transaction signature:', tx);
        console.log('🔗 View on Solana Explorer:');
        console.log('   https://explorer.solana.com/tx/' + tx + '?cluster=devnet');
        console.log('');
        console.log('✨ Recurring payments are now enabled with ICP signatures!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Update frontend to call ICP canister for signatures');
        console.log('2. Test signature generation: dfx canister call timer_rust generate_payment_signature');
        console.log('3. Test recurring payment flow');

    } catch (error) {
        console.error('❌ Failed to update authorization mode:', error);
        if (error.logs) {
            console.error('📋 Transaction logs:', error.logs);
        }
        process.exit(1);
    }
}

updateToICPSignature().catch(console.error);
