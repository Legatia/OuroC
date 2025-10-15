import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, CheckCircle, AlertCircle, Loader } from 'lucide-react'

interface GridSubscriberLoginProps {
  onSuccess: (email: string, gridAccount: any) => void
  onSkip?: () => void
}

export default function GridSubscriberLogin({ onSuccess, onSkip }: GridSubscriberLoginProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'email' | 'verify' | 'complete'>('email')
  const [verificationCode, setVerificationCode] = useState('')

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // ✅ Grid Integration: Create subscriber account via Grid API
      // Implementation: This would integrate with GridClient from @sqds/grid package
      //
      // Example implementation:
      // const gridClient = new GridClient({ apiKey: process.env.NEXT_PUBLIC_GRID_API_KEY })
      // const result = await gridClient.subscribers.create({ email })
      //
      // For now, using simulation for demo purposes
      console.log('Creating Grid subscriber with email:', email)
      console.log('Grid API would be called here with apiKey from env')

      // Simulate API call (replace with actual Grid API call)
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Move to verification step
      setStep('verify')
    } catch (err: any) {
      setError(err.message || 'Failed to send verification email')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // ✅ Grid Integration: Verify code and complete account creation
      // Implementation: Verify the email code and create Grid account
      //
      // Example implementation:
      // const gridClient = new GridClient({ apiKey: process.env.NEXT_PUBLIC_GRID_API_KEY })
      // const gridAccount = await gridClient.subscribers.verify({
      //   email,
      //   code: verificationCode
      // })
      //
      // For now, using simulation for demo purposes
      console.log('Verifying code:', verificationCode)
      console.log('Grid API verification would be called here')

      // Simulate API call (replace with actual Grid API call)
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Create mock Grid account (replace with actual Grid response)
      const gridAccount = {
        email,
        verified: true,
        gridAddress: 'grid_' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString()
      }

      setStep('complete')

      // Call success callback after animation
      setTimeout(() => {
        onSuccess(email, gridAccount)
      }, 1000)
    } catch (err: any) {
      setError(err.message || 'Invalid verification code')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Email Step */}
      {step === 'email' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-2xl"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-primary/20 mb-4">
              <Mail className="h-8 w-8 text-purple-primary" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Sign in with Grid
            </h3>
            <p className="text-gray-400">
              Enter your email to create a secure Grid account for your subscription
            </p>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-purple-primary"
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-300">{error}</span>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading || !email}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-primary to-purple-dark text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                  Sending verification...
                </>
              ) : (
                <>
                  Continue with Email
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </motion.button>

            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="w-full text-sm text-gray-400 hover:text-white transition-colors"
              >
                Skip for now (wallet only)
              </button>
            )}
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-start space-x-2 text-xs text-gray-400">
              <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>
                Your email is encrypted and secured by Squads Protocol Grid.
                We'll send you payment reminders and subscription updates.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Verification Step */}
      {step === 'verify' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-2xl"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-primary/20 mb-4">
              <Mail className="h-8 w-8 text-purple-primary" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Check Your Email
            </h3>
            <p className="text-gray-400">
              We sent a verification code to <span className="text-white font-medium">{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerification} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                required
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 text-center text-2xl tracking-wider font-mono placeholder-gray-500 focus:outline-none focus:border-purple-primary"
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-300">{error}</span>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading || verificationCode.length !== 6}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-primary to-purple-dark text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify & Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </motion.button>

            <button
              type="button"
              onClick={() => setStep('email')}
              className="w-full text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Back to email
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleEmailSubmit}
              className="text-sm text-purple-primary hover:text-purple-light"
            >
              Resend verification code
            </button>
          </div>
        </motion.div>
      )}

      {/* Complete Step */}
      {step === 'complete' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-2xl text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <CheckCircle className="h-16 w-16 text-green-primary mx-auto mb-4" />
          </motion.div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Email Verified!
          </h3>
          <p className="text-gray-400 mb-6">
            Your Grid account has been created successfully
          </p>

          <div className="glass p-4 rounded-lg mb-6">
            <div className="flex items-center justify-center space-x-2 text-sm">
              <Mail className="h-4 w-4 text-purple-primary" />
              <span className="text-white font-medium">{email}</span>
              <CheckCircle className="h-4 w-4 text-green-primary" />
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Proceeding to subscription setup...
          </p>
        </motion.div>
      )}
    </div>
  )
}
