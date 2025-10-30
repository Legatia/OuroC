/**
 * Solana Smart Contract Integration - REAL IMPLEMENTATION
 *
 * Handles interaction with the OuroC-Prima Solana subscription contract
 */

import {
  PublicKey,
  Transaction,
  Connection,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';
import idlJson from '../idl/ouroc_prima.json';

// Cast IDL to proper type (Anchor 0.30+ supports new IDL format with address field)
const idl = idlJson as Idl;

// USDC Mint Address on Solana Devnet
export const USDC_MINT_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

// OuroC-Prima Program ID (deployed on devnet)
export const PROGRAM_ID = new PublicKey('CFEtrptTe5eFXpZtB3hr1VMGuWF9oXguTnUFUaeVgeyT');

// SPL Memo Program
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

/**
 * Get Anchor provider from wallet
 */
async function getProvider(wallet: any, connection: Connection): Promise<AnchorProvider> {
  return new AnchorProvider(
    connection,
    wallet,
    { commitment: 'confirmed' }
  );
}

/**
 * Get Anchor program instance
 */
async function getProgram(wallet: any, connection: Connection): Promise<Program> {
  const provider = await getProvider(wallet, connection);

  // For Anchor 0.31 with new IDL format (spec 0.1.0), we need to ensure
  // the IDL accounts array has proper type definitions
  const processedIdl = {
    ...idl,
    accounts: [], // Disable account client generation to avoid 'size' error
  } as Idl;

  return new Program(processedIdl, provider);
}

/**
 * Derive subscription PDA address
 */
export function deriveSubscriptionPDA(subscriptionId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('subscription'), Buffer.from(subscriptionId)],
    PROGRAM_ID
  );
}

/**
 * Derive escrow PDA address
 */
export function deriveEscrowPDA(subscriptionId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), Buffer.from(subscriptionId)],
    PROGRAM_ID
  );
}

/**
 * Derive config PDA address
 */
export function deriveConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    PROGRAM_ID
  );
}

/**
 * Get or create escrow token account
 */
export async function getOrCreateEscrowAccount(
  subscriptionId: string,
  connection: Connection,
  payer: PublicKey
): Promise<PublicKey> {
  const [escrowPda] = deriveEscrowPDA(subscriptionId);

  const escrowTokenAccount = await getAssociatedTokenAddress(
    USDC_MINT_DEVNET,
    escrowPda,
    true // allowOwnerOffCurve for PDAs
  );

  // Check if account exists
  const accountInfo = await connection.getAccountInfo(escrowTokenAccount);

  if (!accountInfo) {
    console.log('📦 Creating escrow token account:', escrowTokenAccount.toString());
    // Account needs to be created (will be done in transaction)
    return escrowTokenAccount;
  }

  console.log('✅ Escrow token account exists:', escrowTokenAccount.toString());
  return escrowTokenAccount;
}

/**
 * Create Associated Token Account instruction
 */
export async function createEscrowTokenAccountIx(
  subscriptionId: string,
  payer: PublicKey
): Promise<[PublicKey, any]> {
  const [escrowPda] = deriveEscrowPDA(subscriptionId);

  const escrowTokenAccount = await getAssociatedTokenAddress(
    USDC_MINT_DEVNET,
    escrowPda,
    true
  );

  const ix = createAssociatedTokenAccountInstruction(
    payer,
    escrowTokenAccount,
    escrowPda,
    USDC_MINT_DEVNET
  );

  return [escrowTokenAccount, ix];
}

/**
 * Approve subscription PDA to spend USDC tokens (for recurring payments)
 * This allows the ICP timer to charge the user without requiring approval each time
 *
 * @param subscriptionId - Unique subscription ID (hash)
 * @param totalAmount - Total USDC amount to approve (in micro-units)
 * @param wallet - User's Solana wallet
 * @param connection - Solana connection
 */
export async function approveDelegation(
  subscriptionId: string,
  totalAmount: number, // micro-USDC
  wallet: any,
  connection: Connection
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    console.log('🔐 Approving delegation for subscription:', subscriptionId);
    console.log('  Amount:', totalAmount, 'micro-USDC');

    // Derive subscription PDA
    const [subscriptionPda] = deriveSubscriptionPDA(subscriptionId);

    // Get user's USDC token account
    const userUsdcAccount = await getAssociatedTokenAddress(
      USDC_MINT_DEVNET,
      wallet.publicKey
    );

    // Build approve instruction using modern SPL Token API
    const { createApproveInstruction } = await import('@solana/spl-token');

    const approveIx = createApproveInstruction(
      userUsdcAccount,        // source account
      subscriptionPda,        // delegate
      wallet.publicKey,       // owner
      totalAmount,            // amount
      [],                     // multi-signers
      TOKEN_PROGRAM_ID        // programId
    );

    const approveTx = new Transaction().add(approveIx);

    // Send transaction
    const signature = await wallet.sendTransaction(approveTx, connection);
    await connection.confirmTransaction(signature, 'confirmed');

    console.log('✅ Delegation approved');
    console.log('  Signature:', signature);

    return {
      success: true,
      signature,
    };
  } catch (error) {
    console.error('❌ Delegation approval failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create subscription on Solana smart contract
 *
 * @param subscriptionId - Unique hash-based subscription ID
 * @param amount - USDC amount per payment (in micro-units)
 * @param intervalSeconds - -1 for one-time, positive for recurring
 * @param merchantAddress - Merchant's Solana wallet address
 * @param merchantName - Merchant's business name for display
 * @param reminderDays - Days before payment to send reminder (1-30)
 * @param wallet - User's Solana wallet
 * @param connection - Solana connection
 */
export async function createSolanaSubscription(
  subscriptionId: string,
  amount: number,
  intervalSeconds: number,
  merchantAddress: string,
  merchantName: string,
  reminderDays: number,
  wallet: any,
  connection: Connection
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    console.log('📝 Creating Solana subscription:', subscriptionId);
    console.log('  Amount:', amount, 'micro-USDC');
    console.log('  Interval:', intervalSeconds, 'seconds');
    console.log('  Merchant:', merchantName);
    console.log('  Type:', intervalSeconds === -1 ? 'one-time' : 'recurring');

    // Get Anchor program
    const program = await getProgram(wallet, connection);

    // Derive PDAs
    const [subscriptionPda] = deriveSubscriptionPDA(subscriptionId);
    const [configPda] = deriveConfigPDA();

    // Get real ICP signature from canister
    console.log('🔐 Requesting ICP signature from canister...');
    const { getPaymentSignature } = await import('./backend');
    const signatureResult = await getPaymentSignature(subscriptionId, amount);

    if (!signatureResult.success || !signatureResult.signature) {
      throw new Error(`Failed to get ICP signature: ${signatureResult.error}`);
    }

    const icpSignature = signatureResult.signature;
    console.log('✅ Received ICP signature:', icpSignature.length, 'bytes');

    // Ensure signature is exactly 64 bytes as a Uint8Array
    if (icpSignature.length !== 64) {
      throw new Error(`Invalid signature length: expected 64 bytes, got ${icpSignature.length}`);
    }
    const signatureArray = Array.from(icpSignature); // Convert to regular array for Anchor

    // Debug logging
    console.log('📋 Transaction parameters:');
    console.log('  subscriptionId:', subscriptionId, typeof subscriptionId);
    console.log('  subscriptionPda:', subscriptionPda.toString());
    console.log('  amount:', amount, 'as BN:', new BN(amount).toString());
    console.log('  intervalSeconds:', intervalSeconds, 'as BN:', new BN(intervalSeconds).toString());
    console.log('  merchantAddress:', merchantAddress);
    console.log('  merchantName:', merchantName, typeof merchantName);
    console.log('  reminderDays:', reminderDays, typeof reminderDays);
    console.log('  signatureArray:', signatureArray.length, 'bytes');

    // Check if subscription already exists
    const existingSubscription = await connection.getAccountInfo(subscriptionPda);
    if (existingSubscription) {
      console.warn('⚠️ Subscription already exists at PDA:', subscriptionPda.toString());
      throw new Error('Subscription already exists. Please refresh the page to create a new one.');
    }

    console.log('🚀 Submitting transaction to Solana...');

    // Call create_subscription instruction
    const tx = await program.methods
      .createSubscription(
        subscriptionId,
        new BN(amount),
        new BN(intervalSeconds), // i64 requires BN
        new PublicKey(merchantAddress),
        merchantName,
        reminderDays, // u32 can be a number
        signatureArray // [u8; 64] array
      )
      .accounts({
        subscription: subscriptionPda,
        config: configPda,
        subscriber: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ skipPreflight: true, maxRetries: 0 });

    console.log('✅ Subscription created on Solana');
    console.log('  Signature:', tx);
    console.log('  Subscription PDA:', subscriptionPda.toString());

    return {
      success: true,
      signature: tx,
    };
  } catch (error) {
    console.error('❌ Solana subscription creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process one-time payment for a subscription
 * This executes the payment immediately after subscription creation
 *
 * @param subscriptionId - Unique subscription ID (hash)
 * @param amount - USDC amount to pay (in micro-units)
 * @param anchorWallet - Anchor wallet for Anchor program
 * @param walletAdapter - Wallet adapter with sendTransaction for creating accounts
 * @param connection - Solana connection
 */
export async function processOneTimePayment(
  subscriptionId: string,
  amount: number,
  anchorWallet: any,
  walletAdapter: any,
  connection: Connection
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    console.log('💳 Processing one-time payment for subscription:', subscriptionId);
    console.log('  Amount:', amount, 'micro-USDC');

    // Get Anchor program
    const program = await getProgram(anchorWallet, connection);

    // Derive PDAs
    const [subscriptionPda] = deriveSubscriptionPDA(subscriptionId);
    const [configPda] = deriveConfigPDA();
    const [escrowPda] = deriveEscrowPDA(subscriptionId);

    // Get token accounts
    const subscriberUsdcAccount = await getAssociatedTokenAddress(
      USDC_MINT_DEVNET,
      anchorWallet.publicKey
    );

    const escrowUsdcAccount = await getAssociatedTokenAddress(
      USDC_MINT_DEVNET,
      escrowPda,
      true // allowOwnerOffCurve for PDAs
    );

    // Check if escrow account exists, create if not
    const escrowAccountInfo = await connection.getAccountInfo(escrowUsdcAccount);
    if (!escrowAccountInfo) {
      console.log('📦 Creating escrow USDC account...');
      const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');

      const createEscrowIx = createAssociatedTokenAccountInstruction(
        anchorWallet.publicKey,     // payer
        escrowUsdcAccount,          // ata
        escrowPda,                  // owner
        USDC_MINT_DEVNET            // mint
      );

      const createEscrowTx = new Transaction().add(createEscrowIx);
      const createSig = await walletAdapter.sendTransaction(createEscrowTx, connection);
      await connection.confirmTransaction(createSig, 'confirmed');
      console.log('✅ Escrow account created:', createSig);
    }

    // ICP fee account (from config)
    const icpFeeAccount = await getAssociatedTokenAddress(
      USDC_MINT_DEVNET,
      new PublicKey(import.meta.env.VITE_MERCHANT_ADDRESS || "HBvV7YqSRSPW4YEBsDvpvF2PrUWFubqVbTNYafkddTsy")
    );

    // Get ICP signature for payment
    console.log('🔐 Requesting ICP payment signature...');
    const { getPaymentSignature } = await import('./backend');
    const signatureResult = await getPaymentSignature(subscriptionId, amount);

    if (!signatureResult.success || !signatureResult.signature) {
      throw new Error(`Failed to get ICP signature: ${signatureResult.error}`);
    }

    const icpSignature = Array.from(signatureResult.signature);
    const timestamp = Math.floor(Date.now() / 1000);

    console.log('🚀 Submitting payment transaction...');

    // Get ICP public key from config by reading account data directly
    const configAccountData = await connection.getAccountInfo(configPda);
    if (!configAccountData) {
      throw new Error('Config account not found');
    }

    // Parse config account (skip 8-byte discriminator)
    // Config structure: discriminator(8) + authority(32) + fee_destination(32) + icp_pubkey(Option<32>) + ...
    const configData = configAccountData.data;
    const hasIcpPubkey = configData[72] === 1; // Option discriminator at byte 72

    if (!hasIcpPubkey) {
      throw new Error('ICP public key not set in config');
    }

    const icpPublicKey = Array.from(configData.slice(73, 105)); // 32 bytes starting at byte 73

    // Create message for signature verification (must match Rust side)
    const messageBuffer = Buffer.concat([
      Buffer.from(subscriptionId),
      Buffer.from(new BigInt64Array([BigInt(timestamp)]).buffer),
      Buffer.from(new BigUint64Array([BigInt(amount)]).buffer),
    ]);

    // Create Ed25519 signature verification instruction
    const ed25519Ix = {
      keys: [],
      programId: new PublicKey('Ed25519SigVerify111111111111111111111111111'),
      data: Buffer.concat([
        Buffer.from([1]), // 1 signature
        Buffer.from([0]), // padding
        Buffer.from(icpSignature), // 64 bytes signature
        Buffer.from(icpPublicKey), // 32 bytes pubkey
        Buffer.from(messageBuffer), // message
      ]),
    };

    // Build process_trigger instruction
    const processTriggerIx = await program.methods
      .processTrigger(
        0, // opcode 0 = payment
        icpSignature, // ICP signature
        new BN(timestamp) // timestamp as i64
      )
      .accounts({
        subscription: subscriptionPda,
        config: configPda,
        triggerAuthority: anchorWallet.publicKey,
        subscriberTokenAccount: subscriberUsdcAccount,
        escrowUsdcAccount: escrowUsdcAccount,
        icpFeeUsdcAccount: icpFeeAccount,
        usdcMint: USDC_MINT_DEVNET,
        subscriptionPda: subscriptionPda,
        subscriber: anchorWallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        memoProgram: MEMO_PROGRAM_ID,
        instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .instruction();

    // Combine Ed25519 verification + process_trigger into one transaction
    const tx = new Transaction().add(ed25519Ix, processTriggerIx);
    const sig = await walletAdapter.sendTransaction(tx, connection);
    await connection.confirmTransaction(sig, 'confirmed');

    const txSignature = sig;

    console.log('✅ Payment processed successfully');
    console.log('  Signature:', txSignature);

    return {
      success: true,
      signature: txSignature,
    };
  } catch (error) {
    console.error('❌ Payment processing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process one-time payment directly (no ICP timer needed)
 * For one-time purchases, we just transfer USDC directly from user to merchant
 * This is a simple USDC transfer - no subscription contract needed
 */
export async function processDirectOneTimePayment(
  amount: number,
  merchantAddress: string,
  walletAdapter: any,
  connection: Connection
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    console.log('💳 Processing direct one-time payment...');
    console.log('  Amount:', amount, 'micro-USDC');
    console.log('  Merchant:', merchantAddress);

    // Get token accounts
    const { createTransferInstruction } = await import('@solana/spl-token');

    const userUsdcAccount = await getAssociatedTokenAddress(
      USDC_MINT_DEVNET,
      walletAdapter.publicKey
    );

    const merchantUsdcAccount = await getAssociatedTokenAddress(
      USDC_MINT_DEVNET,
      new PublicKey(merchantAddress)
    );

    // Check if merchant token account exists, create if not
    const merchantAccountInfo = await connection.getAccountInfo(merchantUsdcAccount);
    const tx = new Transaction();

    if (!merchantAccountInfo) {
      console.log('📦 Creating merchant USDC account...');
      const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
      const createMerchantIx = createAssociatedTokenAccountInstruction(
        walletAdapter.publicKey, // payer
        merchantUsdcAccount,
        new PublicKey(merchantAddress),
        USDC_MINT_DEVNET
      );
      tx.add(createMerchantIx);
    }

    // Add transfer instruction
    const transferIx = createTransferInstruction(
      userUsdcAccount,
      merchantUsdcAccount,
      walletAdapter.publicKey,
      amount,
      [],
      TOKEN_PROGRAM_ID
    );

    tx.add(transferIx);

    // Send transaction
    console.log('🚀 Submitting payment transaction...');
    const sig = await walletAdapter.sendTransaction(tx, connection);
    await connection.confirmTransaction(sig, 'confirmed');

    console.log('✅ Payment completed!');
    console.log('  Signature:', sig);

    return {
      success: true,
      signature: sig,
    };
  } catch (error) {
    console.error('❌ Payment failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if user has sufficient USDC balance
 */
export async function checkUSDCBalance(
  walletAddress: string,
  requiredAmount: number, // micro-USDC
  connection: Connection
): Promise<{ sufficient: boolean; balance: number; error?: string }> {
  try {
    const wallet = new PublicKey(walletAddress);

    // Get user's USDC token account
    const usdcTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT_DEVNET,
      wallet
    );

    // Get account info
    const accountInfo = await connection.getTokenAccountBalance(usdcTokenAccount);

    const balance = parseInt(accountInfo.value.amount);

    console.log('💰 USDC Balance:', balance, 'micro-USDC');
    console.log('  Required:', requiredAmount, 'micro-USDC');
    console.log('  Sufficient:', balance >= requiredAmount);

    return {
      sufficient: balance >= requiredAmount,
      balance,
    };
  } catch (error) {
    console.error('❌ Balance check failed:', error);

    // If account doesn't exist, balance is 0
    if (error instanceof Error && error.message.includes('could not find account')) {
      return {
        sufficient: false,
        balance: 0,
        error: 'USDC account not found - user needs to receive USDC first',
      };
    }

    return {
      sufficient: false,
      balance: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate total delegation amount for recurring subscription
 * Formula: amount * estimated_payments_before_renewal
 */
export function calculateDelegationAmount(
  amountPerPayment: number,
  intervalSeconds: number
): number {
  // For one-time, return exact amount
  if (intervalSeconds === -1) {
    return amountPerPayment;
  }

  // Estimate number of payments to approve (e.g., 12 months worth)
  const secondsPerMonth = 30 * 24 * 60 * 60;
  const monthsToApprove = 12;
  const estimatedPayments = Math.ceil((monthsToApprove * secondsPerMonth) / intervalSeconds);

  // Approve at least 1 payment, max 100 payments
  const paymentsToApprove = Math.max(1, Math.min(100, estimatedPayments));

  return amountPerPayment * paymentsToApprove;
}

/**
 * Get subscription account data
 */
export async function getSubscription(
  subscriptionId: string,
  connection: Connection
): Promise<any> {
  try {
    const [subscriptionPda] = deriveSubscriptionPDA(subscriptionId);
    const accountInfo = await connection.getAccountInfo(subscriptionPda);

    if (!accountInfo) {
      throw new Error('Subscription not found');
    }

    // TODO: Deserialize account data using Anchor
    console.log('📊 Subscription account:', subscriptionPda.toString());
    console.log('  Data length:', accountInfo.data.length);

    return {
      subscriptionId,
      address: subscriptionPda.toString(),
      exists: true,
    };
  } catch (error) {
    console.error('Failed to get subscription:', error);
    throw error;
  }
}

/**
 * Get escrow balance for a subscription
 */
export async function getEscrowBalance(
  subscriptionId: string,
  connection: Connection
): Promise<number> {
  try {
    const [escrowPda] = deriveEscrowPDA(subscriptionId);
    const escrowTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT_DEVNET,
      escrowPda,
      true
    );

    const accountInfo = await connection.getTokenAccountBalance(escrowTokenAccount);
    return parseInt(accountInfo.value.amount);
  } catch (error) {
    console.error('Failed to get escrow balance:', error);
    return 0;
  }
}
