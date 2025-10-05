import { useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Loader, CheckCircle, AlertCircle } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

interface ManualTriggerButtonProps {
  subscriptionId: string
  subscriptionData: any
  programId: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

// USDC Mint Address
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

// Authorization modes from Solana contract
enum AuthorizationMode {
  ICPSignature = 0,
  ManualOnly = 1,
  TimeBased = 2,
  Hybrid = 3
}

export default function ManualTriggerButton({
  subscriptionId,
  subscriptionData,
  programId,
  onSuccess,
  onError
}: ManualTriggerButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error' | 'disabled'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const { publicKey, wallet, signTransaction } = useWallet()

  // Check if manual trigger is allowed based on authorization mode
  const isManualTriggerAllowed = (): boolean => {
    const authMode = subscriptionData.authorizationMode as AuthorizationMode

    // Manual trigger is only allowed in these modes:
    // 1. ManualOnly - always allowed for subscriber/merchant
    // 2. Hybrid - allowed as fallback when ICP fails (payment overdue)
    // 3. TimeBased - allowed for anyone if payment is due

    switch (authMode) {
      case AuthorizationMode.ICPSignature:
        // Only ICP can trigger, manual is NOT allowed
        return false

      case AuthorizationMode.ManualOnly:
        // Manual trigger is always allowed for authorized users
        return true

      case AuthorizationMode.TimeBased:
        // Anyone can trigger if payment is due
        const currentTime = Math.floor(Date.now() / 1000)
        return currentTime >= subscriptionData.nextPaymentTime

      case AuthorizationMode.Hybrid:
        // Manual is allowed as fallback when payment is overdue (ICP failed)
        const now = Math.floor(Date.now() / 1000)
        const gracePeriod = 300 // 5 minutes grace period
        const isOverdue = now >= subscriptionData.nextPaymentTime + gracePeriod
        return isOverdue

      default:
        return false
    }
  }

  const triggerPayment = async () => {
    if (!publicKey || !wallet) {
      setErrorMessage('Please connect your wallet')
      setStatus('error')
      onError?.('Wallet not connected')
      return
    }

    // Check if manual trigger is allowed
    if (!isManualTriggerAllowed()) {
      setErrorMessage('Manual trigger not allowed in current authorization mode')
      setStatus('error')
      onError?.('Manual trigger not allowed')
      return
    }

    // Verify user is authorized (subscriber or merchant)
    const isAuthorized = publicKey.equals(subscriptionData.subscriber) ||
                        publicKey.equals(subscriptionData.merchant)

    if (!isAuthorized && subscriptionData.authorizationMode !== AuthorizationMode.TimeBased) {
      setErrorMessage('You are not authorized to trigger this payment')
      setStatus('error')
      onError?.('Unauthorized')
      return
    }

    setIsProcessing(true)
    setStatus('processing')
    setErrorMessage('')

    try {
      // Create provider
      const connection = new web3.Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
      )

      const provider = new AnchorProvider(
        connection,
        wallet.adapter as any,
        { commitment: 'confirmed' }
      )

      // Load program (you'll need to provide the IDL)
      // For now, we'll construct the transaction manually

      // Derive PDAs
      const [subscriptionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('subscription'), Buffer.from(subscriptionId)],
        new PublicKey(programId)
      )

      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        new PublicKey(programId)
      )

      // Get current timestamp
      const timestamp = Math.floor(Date.now() / 1000)

      console.log('Triggering manual payment for subscription:', subscriptionId)
      console.log('Subscription PDA:', subscriptionPda.toString())
      console.log('Config PDA:', configPda.toString())

      // Build instruction data
      // Format: [discriminator: 8 bytes] + [Option<signature>: 1+64 bytes] + [timestamp: 8 bytes]
      const instructionData = Buffer.alloc(1 + 8) // None + timestamp
      instructionData.writeUInt8(0, 0) // None for signature
      instructionData.writeBigInt64LE(BigInt(timestamp), 1)

      // Create instruction (simplified - in production use Anchor)
      const instruction = new web3.TransactionInstruction({
        keys: [
          { pubkey: subscriptionPda, isSigner: false, isWritable: true },
          { pubkey: configPda, isSigner: false, isWritable: false },
          { pubkey: publicKey, isSigner: true, isWritable: false }, // trigger_authority
          { pubkey: subscriptionData.subscriber, isSigner: false, isWritable: false },
          { pubkey: subscriptionData.subscriberTokenAccount, isSigner: false, isWritable: true },
          { pubkey: subscriptionData.merchantTokenAccount, isSigner: false, isWritable: true },
          { pubkey: subscriptionData.icpFeeTokenAccount, isSigner: false, isWritable: true },
          { pubkey: USDC_MINT, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: new PublicKey(programId),
        data: instructionData,
      })

      // Create and send transaction
      const transaction = new web3.Transaction().add(instruction)
      const signature = await provider.sendAndConfirm(transaction)

      console.log('Payment processed successfully:', signature)
      setStatus('success')
      onSuccess?.()

      // Reset after 3 seconds
      setTimeout(() => {
        setStatus('idle')
        setIsProcessing(false)
      }, 3000)

    } catch (error: any) {
      console.error('Manual trigger failed:', error)
      const message = error.message || 'Failed to process payment'
      setErrorMessage(message)
      setStatus('error')
      onError?.(message)

      setTimeout(() => {
        setStatus('idle')
        setIsProcessing(false)
      }, 5000)
    }
  }

  // Check if button should be disabled
  const isButtonDisabled = isProcessing || !isManualTriggerAllowed()

  return (
    <div className="space-y-2">
      <motion.button
        onClick={triggerPayment}
        disabled={isButtonDisabled}
        className={`
          w-full px-4 py-3 rounded-lg font-semibold
          transition-all duration-200
          flex items-center justify-center gap-2
          ${status === 'success'
            ? 'bg-green-500 text-white'
            : status === 'error'
            ? 'bg-red-500 text-white'
            : !isManualTriggerAllowed()
            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
          }
          ${isButtonDisabled ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-lg'}
        `}
        whileHover={!isButtonDisabled ? { scale: 1.02 } : {}}
        whileTap={!isButtonDisabled ? { scale: 0.98 } : {}}
      >
        {status === 'processing' && (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            Processing Payment...
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-5 h-5" />
            Payment Processed!
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="w-5 h-5" />
            Payment Failed
          </>
        )}
        {status === 'idle' && !isManualTriggerAllowed() && (
          <>
            <CreditCard className="w-5 h-5" />
            ICP Timer Active
          </>
        )}
        {status === 'idle' && isManualTriggerAllowed() && (
          <>
            <CreditCard className="w-5 h-5" />
            Process Payment Now
          </>
        )}
      </motion.button>

      {!isManualTriggerAllowed() && status === 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg"
        >
          {subscriptionData.authorizationMode === AuthorizationMode.ICPSignature &&
            'This subscription uses ICP automatic payments only'}
          {subscriptionData.authorizationMode === AuthorizationMode.Hybrid &&
            'Manual trigger available after 5 min grace period if ICP fails'}
          {subscriptionData.authorizationMode === AuthorizationMode.TimeBased &&
            'Manual trigger will be available when payment is due'}
        </motion.div>
      )}

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-600 bg-red-50 p-3 rounded-lg"
        >
          {errorMessage}
        </motion.div>
      )}
    </div>
  )
}
