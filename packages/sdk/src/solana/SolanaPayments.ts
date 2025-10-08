import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  SendTransactionError
} from '@solana/web3.js'
import { OuroCError, Subscription } from '../core/types'

export interface SolanaPaymentConfig {
  connection: Connection
  programId?: PublicKey // Your Solana subscription program ID
}

export class SolanaPayments {
  private connection: Connection
  private programId?: PublicKey

  constructor(config: SolanaPaymentConfig) {
    this.connection = config.connection
    this.programId = config.programId
  }

  /**
   * Process a manual subscription payment via direct SOL transfer
   * This is a basic implementation - you would replace this with your actual subscription program logic
   */
  async processDirectPayment(
    subscription: Subscription,
    walletAdapter: any
  ): Promise<string> {
    if (!walletAdapter?.connected || !walletAdapter.publicKey) {
      throw new OuroCError('Wallet not connected', 'WALLET_NOT_CONNECTED')
    }

    try {
      // Get the latest blockhash
      const latestBlockhash = await this.connection.getLatestBlockhash()

      // Create transaction for direct SOL transfer
      const transaction = new Transaction({
        feePayer: walletAdapter.publicKey,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      })

      // Parse addresses
      const payerPubkey = new PublicKey(subscription.solana_payer)
      const receiverPubkey = new PublicKey(subscription.solana_receiver)

      // Verify payer matches connected wallet
      if (!payerPubkey.equals(walletAdapter.publicKey)) {
        throw new OuroCError(
          'Connected wallet does not match subscription payer',
          'WALLET_MISMATCH'
        )
      }

      // Add transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: payerPubkey,
        toPubkey: receiverPubkey,
        lamports: Number(subscription.payment_amount)
      })

      transaction.add(transferInstruction)

      // Sign and send transaction
      const signedTransaction = await walletAdapter.signTransaction(transaction)
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        }
      )

      // Wait for confirmation
      await this.connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, 'confirmed')

      return signature
    } catch (error) {
      if (error instanceof OuroCError) throw error

      if (error instanceof SendTransactionError) {
        throw new OuroCError(
          `Transaction failed: ${error.message}`,
          'TRANSACTION_FAILED',
          error
        )
      }

      throw new OuroCError(
        'Failed to process Solana payment',
        'SOLANA_PAYMENT_ERROR',
        error
      )
    }
  }

  /**
   * Process payment via your subscription program (to be implemented)
   * This is where you would integrate with your actual Solana program
   */
  async processSubscriptionPayment(
    subscription: Subscription,
    walletAdapter: any
  ): Promise<string> {
    if (!this.programId) {
      throw new OuroCError(
        'Subscription program not configured - using direct payment instead',
        'PROGRAM_NOT_CONFIGURED'
      )
    }

    try {
      // 1. Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash()

      // 2. Create subscription instruction for Ouro-C program
      const instruction = await this.createSubscriptionInstruction(
        config.programId,
        config.payer,
        config.receiver,
        config.amount,
        config.interval
      )

      // 3. Build transaction
      const transaction = new Transaction({
        feePayer: config.payer,
        recentBlockhash: blockhash,
      }).add(instruction)

      // 4. Sign and send transaction
      const signed = await wallet.signTransaction!(transaction)
      const signature = await this.connection.sendRawTransaction(signed.serialize())

      // 5. Confirm transaction
      await this.connection.confirmTransaction(signature, 'processed')

      return signature
    } catch (error: any) {
      throw new OuroCError(
        `Subscription creation failed: ${error.message}`,
      'SUBSCRIPTION_CREATION_FAILED'
    )
    }
  }

  private async createSubscriptionInstruction(
    programId: PublicKey,
    payer: PublicKey,
    receiver: PublicKey,
    amount: number,
    intervalSeconds: number
  ): Promise<TransactionInstruction> {
    // Generate subscription ID
    const subscriptionId = this.generateSubscriptionId()

    // Find subscription PDA
    const [subscriptionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('subscription'), Buffer.from(subscriptionId)],
      programId
    )

    // Find config PDA
    const [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      programId
    )

    // Create ICP canister signature placeholder (64 bytes)
    const icpSignature = Array(64).fill(0)

    // Convert amount to micro-USDC (6 decimals)
    const microAmount = Math.floor(amount * 1_000_000)

    // Create instruction data
    const instructionData = Buffer.alloc(1000) // Allocate enough space
    let offset = 0

    // Method discriminator for create_subscription (8 bytes)
    const discriminator = Buffer.from([
      0x18, 0x1e, 0xc8, 0x28, 0x05, 0x1c, 0x07, 0x75
    ])
    discriminator.copy(instructionData, offset)
    offset += 8

    // Subscription ID (string length + data)
    const subscriptionIdBuffer = Buffer.from(subscriptionId, 'utf8')
    instructionData.writeUInt32LE(subscriptionIdBuffer.length, offset)
    offset += 4
    subscriptionIdBuffer.copy(instructionData, offset)
    offset += subscriptionIdBuffer.length

    // Amount (8 bytes, little endian)
    const amountBuffer = Buffer.alloc(8)
    amountBuffer.writeBigUInt64LE(BigInt(microAmount), 0)
    amountBuffer.copy(instructionData, offset)
    offset += 8

    // Interval seconds (8 bytes, little endian)
    const intervalBuffer = Buffer.alloc(8)
    intervalBuffer.writeBigInt64LE(BigInt(intervalSeconds), 0)
    intervalBuffer.copy(instructionData, offset)
    offset += 8

    // Merchant address (32 bytes)
    receiver.toBytes().forEach((byte, i) => {
      instructionData[offset + i] = byte
    })
    offset += 32

    // ICP canister signature (64 bytes)
    icpSignature.forEach((byte, i) => {
      instructionData[offset + i] = byte
    })
    offset += 64

    // Trim instruction data to actual size
    const finalInstructionData = instructionData.slice(0, offset)

    return new TransactionInstruction({
      keys: [
        { pubkey: subscriptionPDA, isSigner: false, isWritable: true },
        { pubkey: configPDA, isSigner: false, isWritable: true },
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId,
      data: finalInstructionData,
    })
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get subscription payment details for display
   */
  async getPaymentPreview(subscription: Subscription): Promise<{
    fromAddress: string
    toAddress: string
    amountSOL: number
    amountLamports: bigint
    estimatedFee: number
  }> {
    try {
      // Estimate transaction fee
      const recentBlockhash = await this.connection.getLatestBlockhash()
      const feeCalculator = await this.connection.getFeeForMessage(
        new Transaction({
          feePayer: new PublicKey(subscription.solana_payer),
          blockhash: recentBlockhash.blockhash,
          lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
        }).add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(subscription.solana_payer),
            toPubkey: new PublicKey(subscription.solana_receiver),
            lamports: Number(subscription.amount) // Updated: use 'amount' instead of 'payment_amount'
          })
        ).compileMessage()
      )

      return {
        fromAddress: subscription.solana_payer,
        toAddress: subscription.solana_receiver,
        amountSOL: Number(subscription.amount) / LAMPORTS_PER_SOL, // Updated
        amountLamports: BigInt(subscription.amount), // Updated
        estimatedFee: (feeCalculator?.value || 5000) / LAMPORTS_PER_SOL
      }
    } catch (error) {
      throw new OuroCError(
        'Failed to get payment preview',
        'PAYMENT_PREVIEW_ERROR',
        error
      )
    }
  }

  /**
   * Validate wallet balance before payment
   */
  async validatePayerBalance(
    payerAddress: string,
    paymentAmount: bigint
  ): Promise<{
    balance: bigint
    sufficient: boolean
    shortfall?: bigint
  }> {
    try {
      const pubkey = new PublicKey(payerAddress)
      const balance = BigInt(await this.connection.getBalance(pubkey))
      const required = paymentAmount + BigInt(5000) // Add fee buffer

      return {
        balance,
        sufficient: balance >= required,
        shortfall: balance < required ? required - balance : undefined
      }
    } catch (error) {
      throw new OuroCError(
        'Failed to check payer balance',
        'BALANCE_CHECK_ERROR',
        error
      )
    }
  }
}