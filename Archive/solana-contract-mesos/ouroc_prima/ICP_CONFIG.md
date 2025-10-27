# ICP Canister Configuration

## Your ICP Canister Details

**Canister ID**: `7tbxr-naaaa-aaaao-qkrca-cai`

**Status** (Retrieved: 2025-10-14):
```
total_subscriptions: 0
ed25519_key_name: "test_key_1"
active_timers: 0
active_subscriptions: 0
is_initialized: false
```

---

## Ed25519 Public Key (Main Wallet)

This is the public key your ICP canister uses to sign payment authorizations.

**Solana Address Format**: `D2hWeWekkcxJisDHLcFJEgzwvDE9yJmB7NKzLpvdSp6e`

**Hex Format**: `b2bba1499d6277171523421f5367fbcda8c961b1c49aba19587d55ac08d1276b`

**For Solana Contract Initialization** (32-byte array):
```rust
[178, 187, 161, 73, 157, 98, 119, 23, 21, 35, 66, 31, 83, 103, 251, 205, 168, 201, 97, 177, 196, 154, 186, 25, 88, 125, 85, 172, 8, 209, 39, 107]
```

**For TypeScript/JavaScript**:
```typescript
const ICP_PUBLIC_KEY = [
  178, 187, 161, 73, 157, 98, 119, 23, 21, 35, 66, 31, 83, 103, 251, 205,
  168, 201, 97, 177, 196, 154, 186, 25, 88, 125, 85, 172, 8, 209, 39, 107
];

// Or as PublicKey
import { PublicKey } from '@solana/web3.js';
const icpPublicKey = new PublicKey('D2hWeWekkcxJisDHLcFJEgzwvDE9yJmB7NKzLpvdSp6e');
```

---

## Fee Collection Address

Your ICP canister's fee collection wallet on Solana:

**Address**: `egE7ugJ46UQzA3t179X6fctKAZ6nBVjZ27kXYzmtKzR`

**Hex**: `09a6d7d77e4021bd8fb0f9a850b1b8cf6b1d99f863d4a1b422f0b8c0d666c6a2`

**Note**: You'll need to create a USDC token account for this address to receive fees:

```bash
# Get the associated token address (ATA) for USDC
spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU \
  --owner egE7ugJ46UQzA3t179X6fctKAZ6nBVjZ27kXYzmtKzR
```

Or in TypeScript:
```typescript
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'); // Devnet
const feeWallet = new PublicKey('egE7ugJ46UQzA3t179X6fctKAZ6nBVjZ27kXYzmtKzR');

const feeCollectionAta = await getAssociatedTokenAddress(
  USDC_MINT,
  feeWallet
);

console.log('Fee Collection USDC Account:', feeCollectionAta.toBase58());
```

---

## Initialize Solana Contract

Use this script to initialize your Solana program with the ICP canister's public key:

### `scripts/initialize-with-icp.ts`

```typescript
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { OuroCSubscriptions } from '../target/types/ouro_c_subscriptions';

async function main() {
  // Setup
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.OuroCSubscriptions as Program<OuroCSubscriptions>;

  // ICP Canister Configuration
  const ICP_PUBLIC_KEY = [
    178, 187, 161, 73, 157, 98, 119, 23, 21, 35, 66, 31, 83, 103, 251, 205,
    168, 201, 97, 177, 196, 154, 186, 25, 88, 125, 85, 172, 8, 209, 39, 107
  ];

  const ICP_FEE_COLLECTION = new PublicKey('egE7ugJ46UQzA3t179X6fctKAZ6nBVjZ27kXYzmtKzR');

  // Derive config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId
  );

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        OuroC Subscriptions - Initialization            ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Configuration:');
  console.log('  Program ID:', program.programId.toBase58());
  console.log('  Config PDA:', configPda.toBase58());
  console.log('  Authority:', provider.wallet.publicKey.toBase58());
  console.log('');
  console.log('ICP Canister:');
  console.log('  Canister ID: 7tbxr-naaaa-aaaao-qkrca-cai');
  console.log('  Main Wallet: D2hWeWekkcxJisDHLcFJEgzwvDE9yJmB7NKzLpvdSp6e');
  console.log('  Fee Wallet:', ICP_FEE_COLLECTION.toBase58());
  console.log('');
  console.log('Settings:');
  console.log('  Authorization Mode: Hybrid (ICP + Manual Fallback)');
  console.log('  Platform Fee: 1%');
  console.log('');

  try {
    const tx = await program.methods
      .initialize(
        { hybrid: {} },     // Authorization mode: Hybrid
        ICP_PUBLIC_KEY,     // 32-byte Ed25519 public key from ICP canister
        100                 // 1% fee (100 basis points)
      )
      .accounts({
        config: configPda,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('✅ SUCCESS! Program initialized');
    console.log('');
    console.log('Transaction:', tx);
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Create fee collection USDC account');
    console.log('  2. Update config with fee collection address');
    console.log('  3. Create test subscription');
    console.log('  4. Test ICP → Solana payment flow');

  } catch (error: any) {
    console.error('❌ ERROR: Initialization failed');
    console.error('');

    if (error.message?.includes('already in use')) {
      console.error('Config account already initialized!');
      console.error('Use update_authorization_mode to change settings.');
    } else {
      console.error('Error:', error.message);
      console.error('');
      console.error('Full error:', error);
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

### Run Initialization

```bash
cd /Users/tobiasd/Desktop/Ouro-C/solana-contract/ouro_c_subscriptions

# Make sure Solana CLI is set to devnet
solana config set --url devnet

# Run the initialization script
ts-node scripts/initialize-with-icp.ts
```

---

## Verify Configuration

After initialization, verify the config:

### `scripts/check-config.ts`

```typescript
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { OuroCSubscriptions } from '../target/types/ouro_c_subscriptions';

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.OuroCSubscriptions as Program<OuroCSubscriptions>;

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId
  );

  console.log('Fetching config from:', configPda.toBase58());

  const config = await program.account.config.fetch(configPda);

  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║           OuroC Configuration Status                   ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Authority:', config.authority.toBase58());
  console.log('Paused:', config.paused ? '❌ YES' : '✅ NO');
  console.log('Authorization Mode:', Object.keys(config.authorizationMode)[0]);
  console.log('');
  console.log('Features:');
  console.log('  Manual Processing:', config.manualProcessingEnabled ? '✅' : '❌');
  console.log('  Time-based Processing:', config.timeBasedProcessingEnabled ? '✅' : '❌');
  console.log('');
  console.log('Fee Configuration:');
  console.log('  Fee Rate:', config.feeConfig.feeBasisPoints, 'bps',
              `(${config.feeConfig.feeBasisPoints / 100}%)`);
  console.log('  Fee Enabled:', config.feeConfig.feeEnabled ? '✅' : '❌');
  console.log('');

  if (config.icpPublicKey) {
    const icpPubkeyHex = Buffer.from(config.icpPublicKey).toString('hex');
    const expectedHex = 'b2bba1499d6277171523421f5367fbcda8c961b1c49aba19587d55ac08d1276b';

    const icpPubkeySolana = new PublicKey(Buffer.from(config.icpPublicKey));

    console.log('ICP Canister:');
    console.log('  Public Key (hex):', icpPubkeyHex);
    console.log('  Public Key (address):', icpPubkeySolana.toBase58());
    console.log('  Matches Expected:', icpPubkeyHex === expectedHex ? '✅ YES' : '❌ NO');

    if (icpPubkeyHex !== expectedHex) {
      console.log('');
      console.log('⚠️  WARNING: ICP public key mismatch!');
      console.log('  Expected:', expectedHex);
      console.log('  Got:', icpPubkeyHex);
    }
  } else {
    console.log('⚠️  ICP Public Key: NOT SET');
  }

  console.log('');

  if (config.icpFeeCollectionAddress) {
    console.log('Fee Collection:', config.icpFeeCollectionAddress.toBase58());
  } else {
    console.log('Fee Collection: NOT SET (needs update)');
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
```

### Run Verification

```bash
ts-node scripts/check-config.ts
```

---

## Update Fee Collection Address

After creating the USDC token account for fees:

```typescript
await program.methods
  .updateFeeConfig(
    100, // fee_basis_points (1%)
    true, // fee_enabled
    feeCollectionUsdcAta // The ATA you created
  )
  .accounts({
    config: configPda,
    authority: provider.wallet.publicKey,
  })
  .rpc();
```

---

## Testing Signature Verification

### Current Status (Devnet Bypass)

The contract is currently built with `devnet-bypass-signature` feature enabled, which allows testing without real ICP signatures.

### For Production

To enable real Ed25519 signature verification:

1. **Build without bypass**:
   ```bash
   anchor build --no-default-features
   ```

2. **ICP canister must sign messages using `sign_message()`** (already implemented in `threshold_ed25519.mo:111`)

3. **Include Ed25519 instruction in transaction** (see SECURITY_NOTICE.md for details)

---

## Key Information Summary

| Item | Value |
|------|-------|
| **ICP Canister ID** | `7tbxr-naaaa-aaaao-qkrca-cai` |
| **Ed25519 Key Name** | `test_key_1` |
| **Main Wallet** | `D2hWeWekkcxJisDHLcFJEgzwvDE9yJmB7NKzLpvdSp6e` |
| **Fee Wallet** | `egE7ugJ46UQzA3t179X6fctKAZ6nBVjZ27kXYzmtKzR` |
| **Public Key (hex)** | `b2bba1...d1276b` |
| **Initialization Status** | `is_initialized: false` (ICP side) |
| **Active Subscriptions** | 0 |

---

## Important Notes

⚠️ **Key Name**: Your canister uses `test_key_1`. For mainnet production, update to `Ed25519:key_1` (the production key).

⚠️ **Initialization**: Your ICP canister shows `is_initialized: false`. You may need to call an initialization function on the ICP side as well.

⚠️ **Fee Collection**: Make sure to create the USDC token account for the fee wallet before processing payments.

✅ **Ready**: Your ICP canister public key is confirmed and ready to use in the Solana contract!

---

Last updated: 2025-10-14
