import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getAccount,
} from '@solana/spl-token'
import { OuroCError } from '../core/types'

/**
 * Handles first payment execution for subscriptions
 * Executes immediate USDC transfer when subscription is created
 */
export class FirstPaymentHandler {
  private connection: Connection

  constructor(connection: Connection) {
    this.connection = connection
  }

  /**
   * Execute first payment for a subscription
   * Transfers USDC from subscriber to merchant immediately
   */
  async executeFirstPayment(
    subscriberPubkey: PublicKey,
    merchantPubkey: PublicKey,
    amount: number, // Amount in USDC (with 6 decimals, e.g., 10000000 = 10 USDC)
    usdcMintAddress: PublicKey,
    walletAdapter: any
  ): Promise<string> {
    if (!walletAdapter?.connected || !walletAdapter.publicKey) {
      throw new OuroCError('Wallet not connected', 'WALLET_NOT_CONNECTED')
    }

    try {
      // 1. Get token accounts
      const subscriberTokenAccount = await getAssociatedTokenAddress(
        usdcMintAddress,
        subscriberPubkey
      )

      const merchantTokenAccount = await getAssociatedTokenAddress(
        usdcMintAddress,
        merchantPubkey
      )

      // 2. Check subscriber has enough balance
      try {
        const subscriberAccount = await getAccount(
          this.connection,
          subscriberTokenAccount
        )

        if (Number(subscriberAccount.amount) < amount) {
          throw new OuroCError(
            `Insufficient USDC balance. Need ${amount / 1_000_000} USDC, have ${Number(subscriberAccount.amount) / 1_000_000} USDC`,
            'INSUFFICIENT_BALANCE'
          )
        }
      } catch (error: any) {
        if (error.name === 'TokenAccountNotFoundError' || error.message?.includes('could not find account')) {
          throw new OuroCError(
            `No USDC token account found. You need to:\n1. Get devnet USDC from https://faucet.circle.com/\n2. Or airdrop devnet USDC to your wallet: ${subscriberPubkey.toBase58()}`,
            'NO_TOKEN_ACCOUNT'
          )
        }
        throw error
      }

      // 3. Build transfer transaction
      const transferInstruction = createTransferInstruction(
        subscriberTokenAccount,
        merchantTokenAccount,
        subscriberPubkey,
        amount,
        [],
        TOKEN_PROGRAM_ID
      )

      const latestBlockhash = await this.connection.getLatestBlockhash('finalized')

      const transaction = new Transaction({
        feePayer: subscriberPubkey,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      })

      transaction.add(transferInstruction)

      // 4. Sign and send
      console.log(`Executing first payment: ${amount / 1_000_000} USDC to ${merchantPubkey.toBase58()}`)

      const signedTransaction = await walletAdapter.signTransaction(transaction)
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3,
        }
      )

      // 5. Confirm transaction
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }, 'confirmed')

      if (confirmation.value.err) {
        throw new OuroCError(
          `First payment transaction failed: ${JSON.stringify(confirmation.value.err)}`,
          'TRANSACTION_FAILED'
        )
      }

      console.log(`✅ First payment successful! Signature: ${signature}`)

      return signature
    } catch (error: any) {
      if (error instanceof OuroCError) throw error

      console.error('First payment error:', error)

      // Handle specific Solana errors
      if (error.message?.includes('0x1')) {
        throw new OuroCError(
          'Insufficient balance for transaction fees',
          'INSUFFICIENT_SOL_FOR_FEES'
        )
      }

      throw new OuroCError(
        `Failed to execute first payment: ${error.message}`,
        'FIRST_PAYMENT_FAILED',
        error
      )
    }
  }

  /**
   * Check if user has sufficient USDC balance
   */
  async checkBalance(
    subscriberPubkey: PublicKey,
    requiredAmount: number,
    usdcMintAddress: PublicKey
  ): Promise<{ hasEnough: boolean; balance: number }> {
    try {
      const tokenAccount = await getAssociatedTokenAddress(
        usdcMintAddress,
        subscriberPubkey
      )

      const account = await getAccount(this.connection, tokenAccount)
      const balance = Number(account.amount)

      return {
        hasEnough: balance >= requiredAmount,
        balance,
      }
    } catch (error: any) {
      if (error.message?.includes('could not find account')) {
        return { hasEnough: false, balance: 0 }
      }
      throw error
    }
  }
}
