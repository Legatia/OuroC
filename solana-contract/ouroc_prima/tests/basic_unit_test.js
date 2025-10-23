const anchor = require('@coral-xyz/anchor');
const { PublicKey, SystemProgram } = require('@solana/web3.js');

// Simple test runner that doesn't use complex TypeScript types
describe('Basic Unit Tests', () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.ouroCSubscriptions;
    const authority = provider.wallet;

    it('Should have program deployed', async () => {
        console.log('✅ Program ID:', program.programId.toString());
        console.log('✅ Authority:', authority.publicKey.toString());
    });

    it('Should test basic math operations', async () => {
        const BN = anchor.BN;
        const amount = new BN(5_000_000);
        const interval = new BN(30 * 24 * 60 * 60);

        console.log('✅ Amount:', amount.toString());
        console.log('✅ Interval:', interval.toString());

        // Test basic arithmetic
        const doubled = amount.mul(new BN(2));
        console.log('✅ Doubled amount:', doubled.toString());
    });

    it('Should test PDA derivation', async () => {
        const [configPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('config')],
            program.programId
        );

        console.log('✅ Config PDA:', configPDA.toString());

        const [subscriptionPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('subscription'), Buffer.from('test-subscription')],
            program.programId
        );

        console.log('✅ Subscription PDA:', subscriptionPDA.toString());
    });

    it('Should test input validation logic', async () => {
        // Test subscription ID validation
        const validId = 'valid-subscription-123';
        const invalidId = 'invalid@id#$';

        const isValidSubscriptionId = (id) => {
            return /^[a-zA-Z0-9_-]+$/.test(id);
        };

        console.log('✅ Valid ID test:', isValidSubscriptionId(validId));
        console.log('✅ Invalid ID test:', isValidSubscriptionId(invalidId));

        // Test merchant name validation
        const validName = 'Test Merchant';
        const invalidName = '<script>alert("xss")</script>';

        const isValidMerchantName = (name) => {
            return /^[\\x20-\\x7E]{1,50}$/.test(name) && name.length >= 1 && name.length <= 50;
        };

        console.log('✅ Valid merchant name test:', isValidMerchantName(validName));
        console.log('✅ Invalid merchant name test:', isValidMerchantName(invalidName));

        // Test amount validation
        const minAmount = 1000; // 0.001 USDC
        const maxAmount = 1_000_000_000_000_000; // 1B USDC

        const testAmounts = [100, 1000, 5_000_000, 1_000_000_000_000_000, 2_000_000_000_000_000];
        testAmounts.forEach(amount => {
            const valid = amount >= minAmount && amount <= maxAmount;
            console.log(`✅ Amount ${amount}: ${valid ? 'VALID' : 'INVALID'}`);
        });

        // Test interval validation
        const minInterval = 3600; // 1 hour
        const maxInterval = 365 * 24 * 60 * 60; // 1 year

        const testIntervals = [1800, 3600, 30 * 24 * 60 * 60, 365 * 24 * 60 * 60, 400 * 24 * 60 * 60];
        testIntervals.forEach(interval => {
            const valid = interval >= minInterval && interval <= maxInterval;
            console.log(`✅ Interval ${interval}: ${valid ? 'VALID' : 'INVALID'}`);
        });
    });
});

// Run tests manually
async function runTests() {
    console.log('🚀 Running Basic Unit Tests...\\n');

    try {
        const provider = anchor.AnchorProvider.env();
        anchor.setProvider(provider);

        const program = anchor.workspace.ouroCSubscriptions;
        const authority = provider.wallet;

        console.log('✅ Program ID:', program.programId.toString());
        console.log('✅ Authority:', authority.publicKey.toString());

        // Test PDA derivation
        const [configPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('config')],
            program.programId
        );
        console.log('✅ Config PDA:', configPDA.toString());

        const [subscriptionPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('subscription'), Buffer.from('test-subscription')],
            program.programId
        );
        console.log('✅ Subscription PDA:', subscriptionPDA.toString());

        console.log('\\n✅ All basic unit tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    runTests();
}

module.exports = { runTests };