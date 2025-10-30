import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import idl from './target/idl/ouroc_prima.json';

async function checkConfig() {
    const connection = new Connection('https://api.devnet.solana.com');
    const programId = new PublicKey('7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub');

    // Derive config PDA
    const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        programId
    );

    console.log('📋 Config PDA:', configPda.toString());

    try {
        // Fetch config account
        const accountInfo = await connection.getAccountInfo(configPda);

        if (!accountInfo) {
            console.log('❌ Config account not found - contract may not be initialized');
            console.log('   Run: anchor run initialize');
            return;
        }

        console.log('✅ Config account exists');
        console.log('   Data length:', accountInfo.data.length, 'bytes');

        // Try to parse with Anchor
        const program = new Program(idl as any, programId);
        const config = await program.account.config.fetch(configPda);

        console.log('\n📊 Current Configuration:');
        console.log('   Authority:', (config as any).authority.toString());
        console.log('   Total Subscriptions:', (config as any).totalSubscriptions?.toString() || '0');
        console.log('   Paused:', (config as any).paused);
        console.log('   Authorization Mode:', (config as any).authorizationMode);
        console.log('   ICP Public Key:', (config as any).icpPublicKey || 'Not set');
        console.log('   Manual Processing:', (config as any).manualProcessingEnabled);
        console.log('   Time-Based Processing:', (config as any).timeBasedProcessingEnabled);
        console.log('   ICP Fee Address:', (config as any).icpFeeCollectionAddress || 'Not set');

        // Analyze authorization mode
        const authMode = (config as any).authorizationMode;
        console.log('\n🔍 Analysis:');

        if (authMode?.icpSignature !== undefined || authMode?.ICPSignature !== undefined) {
            console.log('⚠️  Mode: ICPSignature');
            console.log('   ❌ PROBLEM: Recurring payments require valid ICP signatures');
            console.log('   ❌ Dummy signatures will be rejected');
            console.log('   🔧 SOLUTION: Change to TimeBased or ManualOnly mode');
        } else if (authMode?.timeBased !== undefined || authMode?.TimeBased !== undefined) {
            console.log('✅ Mode: TimeBased');
            console.log('   ✅ OK: Payments process automatically when due');
            console.log('   ✅ No ICP signature required');
        } else if (authMode?.manualOnly !== undefined || authMode?.ManualOnly !== undefined) {
            console.log('✅ Mode: ManualOnly');
            console.log('   ⚠️  Payments require manual trigger by subscriber/merchant');
            console.log('   ✅ No ICP signature required');
        } else if (authMode?.hybrid !== undefined || authMode?.Hybrid !== undefined) {
            console.log('⚠️  Mode: Hybrid');
            console.log('   Multiple authorization methods enabled');
        } else {
            console.log('❓ Unknown authorization mode:', authMode);
        }

    } catch (error) {
        console.error('❌ Error fetching config:', error);
        if (error instanceof Error) {
            console.error('   Message:', error.message);
        }
    }
}

checkConfig().catch(console.error);
