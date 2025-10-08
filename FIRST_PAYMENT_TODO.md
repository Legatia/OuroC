# First Payment Implementation - TODO

## Current Issue
When a subscription is created, only the ICP timer is set up. The first payment is NOT executed immediately.

## What Should Happen
1. ✅ Create subscription on ICP canister (timer for recurring payments)
2. ❌ Create subscription on Solana program (on-chain subscription record)
3. ❌ Execute first payment immediately (USDC transfer)

## Implementation Plan

### 1. Update SDK's `createSubscription` Method

**File:** `packages/sdk/src/core/OuroCClient.ts`

```typescript
async createSubscription(request: CreateSubscriptionRequest, walletAdapter: any): Promise<SubscriptionId> {
  if (!this.actor) throw new OuroCError('Client not initialized', 'NOT_INITIALIZED')
  if (!walletAdapter?.connected) throw new OuroCError('Wallet not connected', 'WALLET_NOT_CONNECTED')

  try {
    // Step 1: Create subscription on ICP canister (timer setup)
    const result = await this.actor.create_subscription(request)

    if (!('ok' in result)) {
      throw new OuroCError(`Failed to create ICP subscription: ${result.err}`, 'CREATE_SUBSCRIPTION_ERROR')
    }

    const subscriptionId = result.ok

    // Step 2: Create subscription on Solana program
    await this.createSolanaSubscription(subscriptionId, request, walletAdapter)

    // Step 3: Execute first payment immediately
    await this.executeFirstPayment(subscriptionId, request, walletAdapter)

    return subscriptionId
  } catch (error) {
    if (error instanceof OuroCError) throw error
    throw new OuroCError('Unexpected error creating subscription', 'UNKNOWN_ERROR', error)
  }
}
```

### 2. Add Solana Program Integration

**File:** `packages/sdk/src/solana/SolanaSubscriptionProgram.ts` (NEW)

```typescript
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'

export class SolanaSubscriptionProgram {
  private program: Program
  private connection: Connection

  constructor(programId: string, connection: Connection) {
    this.connection = connection
    // Initialize Anchor program with IDL
    // this.program = new Program(IDL, programId, provider)
  }

  /**
   * Create subscription on Solana program
   */
  async createSubscription(
    subscriptionId: string,
    subscriber: PublicKey,
    merchant: PublicKey,
    amount: number,
    intervalSeconds: number,
    paymentTokenMint: PublicKey,
    reminderDays: number,
    slippageBps: number,
    icpSignature: Buffer,
    walletAdapter: any
  ): Promise<string> {
    // 1. Derive subscription PDA
    const [subscriptionPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from('subscription'),
        Buffer.from(subscriptionId),
        subscriber.toBuffer()
      ],
      this.program.programId
    )

    // 2. Get config PDA
    const [configPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('config')],
      this.program.programId
    )

    // 3. Build transaction
    const tx = await this.program.methods
      .createSubscription(
        subscriptionId,
        amount,
        intervalSeconds,
        merchant,
        paymentTokenMint,
        reminderDays,
        slippageBps,
        Array.from(icpSignature)
      )
      .accounts({
        subscription: subscriptionPDA,
        config: configPDA,
        subscriber: subscriber,
        systemProgram: web3.SystemProgram.programId,
      })
      .transaction()

    // 4. Sign and send
    const signed = await walletAdapter.signTransaction(tx)
    const signature = await this.connection.sendRawTransaction(signed.serialize())
    await this.connection.confirmTransaction(signature)

    return signature
  }

  /**
   * Process payment with swap (executes actual USDC transfer)
   */
  async processPayment(
    subscriptionId: string,
    subscriber: PublicKey,
    merchant: PublicKey,
    amount: number,
    paymentTokenMint: PublicKey,
    icpSignature: Buffer | null,
    walletAdapter: any
  ): Promise<string> {
    // 1. Derive PDAs
    const [subscriptionPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('subscription'), Buffer.from(subscriptionId), subscriber.toBuffer()],
      this.program.programId
    )

    const [configPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('config')],
      this.program.programId
    )

    // 2. Get token accounts
    const subscriberTokenAccount = await getAssociatedTokenAddress(
      paymentTokenMint,
      subscriber
    )

    const merchantTokenAccount = await getAssociatedTokenAddress(
      paymentTokenMint,
      merchant
    )

    // 3. Get fee collection account from config
    const config = await this.program.account.config.fetch(configPDA)
    const feeCollectionAccount = await getAssociatedTokenAddress(
      paymentTokenMint,
      config.feeCollectionAddress
    )

    // 4. Build payment transaction
    const timestamp = Math.floor(Date.now() / 1000)
    const tx = await this.program.methods
      .processPaymentWithSwap(
        icpSignature ? Array.from(icpSignature) : null,
        timestamp
      )
      .accounts({
        subscription: subscriptionPDA,
        config: configPDA,
        subscriber: subscriber,
        subscriberTokenAccount: subscriberTokenAccount,
        merchant: merchant,
        merchantTokenAccount: merchantTokenAccount,
        feeCollectionAccount: feeCollectionAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        // Add remaining accounts for Jupiter swap if needed
      })
      .transaction()

    // 5. Sign and send
    const signed = await walletAdapter.signTransaction(tx)
    const signature = await this.connection.sendRawTransaction(signed.serialize())
    await this.connection.confirmTransaction(signature)

    return signature
  }
}
```

### 3. Update OuroCClient to Use Solana Program

```typescript
private solanaProgram: SolanaSubscriptionProgram

constructor(...) {
  // ... existing code

  this.solanaProgram = new SolanaSubscriptionProgram(
    SOLANA_PROGRAM_ID,
    this.connection
  )
}

private async createSolanaSubscription(
  subscriptionId: string,
  request: CreateSubscriptionRequest,
  walletAdapter: any
): Promise<void> {
  const icpSignature = await this.getICPSignature(subscriptionId)

  await this.solanaProgram.createSubscription(
    subscriptionId,
    new PublicKey(request.subscriber_address),
    new PublicKey(request.merchant_address),
    Number(request.amount),
    Number(request.interval_seconds),
    new PublicKey(request.payment_token_mint),
    request.reminder_days_before_payment,
    100, // Default slippage 1%
    icpSignature,
    walletAdapter
  )
}

private async executeFirstPayment(
  subscriptionId: string,
  request: CreateSubscriptionRequest,
  walletAdapter: any
): Promise<void> {
  await this.solanaProgram.processPayment(
    subscriptionId,
    new PublicKey(request.subscriber_address),
    new PublicKey(request.merchant_address),
    Number(request.amount),
    new PublicKey(request.payment_token_mint),
    null, // No ICP signature needed for manual first payment
    walletAdapter
  )
}
```

### 4. Update Demo Component

**File:** `demo-dapp/components/RealSubscriptionCard.tsx`

```typescript
const handleSubscribe = async () => {
  if (!connected || !publicKey || !wallet) return
  if (!client) {
    setSubscriptionError('Ouro-C client not initialized')
    return
  }

  setIsSubscribing(true)
  setSubscriptionError(null)

  try {
    // ... existing config setup

    console.log('Creating subscription with config:', subscriptionConfig)

    // Pass wallet adapter for Solana transactions
    const subscription = await client.createSubscription(
      subscriptionConfig,
      wallet.adapter  // ✅ Pass wallet adapter!
    )

    console.log('Subscription created and first payment processed:', subscription)
    setSubscriptionSuccess(true)
    onSubscribe(plan)

  } catch (error: any) {
    console.error('Subscription creation failed:', error)
    setSubscriptionError(error.message || 'Failed to create subscription')
  } finally {
    setIsSubscribing(false)
  }
}
```

## Required Files

1. ✅ Generate Anchor IDL from Solana program
   ```bash
   cd solana-contract/ouro_c_subscriptions
   anchor build
   # Copy target/idl/ouro_c_subscriptions.json to SDK
   ```

2. ❌ Create `packages/sdk/src/solana/SolanaSubscriptionProgram.ts`
3. ❌ Update `packages/sdk/src/core/OuroCClient.ts`
4. ❌ Add Anchor dependencies to SDK
   ```bash
   cd packages/sdk
   npm install @coral-xyz/anchor @solana/spl-token
   ```

## Testing Plan

1. **With USDC in wallet:**
   - Create subscription
   - Verify first payment executes
   - Check merchant receives USDC
   - Check subscription is active

2. **Without USDC:**
   - Should get clear error message
   - Subscription should NOT be created if payment fails

3. **Edge cases:**
   - Insufficient balance
   - Token account not initialized
   - Slippage exceeded

## Notes

- First payment should happen in the same transaction as subscription creation
- If first payment fails, subscription creation should revert
- User needs to approve both transactions (create + payment)
- Consider combining into single transaction for better UX

