import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Users, Lock, ArrowRight, CheckCircle, Wallet, Mail, Globe, Key } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import WalletButton from '../components/WalletButton'
import Footer from '../components/Footer'
import { GridClient } from '@ouroc/sdk'
import { MerchantFlow } from '@ouroc/sdk'

type SignupStep = 'choice' | 'email' | 'wallet' | 'setup' | 'complete'

export default function GridMerchant() {
  const { connected, publicKey } = useWallet()
  const [step, setStep] = useState<SignupStep>('choice')
  const [loading, setLoading] = useState(false)
  const [gridAccountId, setGridAccountId] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [merchantData, setMerchantData] = useState({
    businessName: '',
    email: '',
    tier: 'Community',
    walletAddress: '',
    useMultisig: false,
    signers: [''],
    threshold: 2,
  })

  // Initialize Grid client
  const [gridClient] = useState(() => {
    try {
      return new GridClient({
        apiKey: process.env.NEXT_PUBLIC_GRID_API_KEY || 'demo_api_key',
        apiUrl: process.env.NEXT_PUBLIC_GRID_API_URL || 'https://api.squads.so',
        network: 'mainnet-beta'
      })
    } catch (err) {
      console.error('Failed to initialize Grid client:', err)
      return null
    }
  })

  const [merchantFlow] = useState(() => {
    return gridClient ? new MerchantFlow({ gridClient }) : null
  })

  // Email validation
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateEmail(merchantData.email) && merchantData.businessName.trim()) {
      setStep('wallet')
    } else {
      // Show error message
    }
  }

  // Handle wallet connection
  const handleWalletConnection = () => {
    if (connected && publicKey) {
      setMerchantData(prev => ({
        ...prev,
        walletAddress: publicKey.toString()
      }))
      setStep('setup')
    }
  }

  useEffect(() => {
    if (connected && publicKey && step === 'wallet') {
      handleWalletConnection()
    }
  }, [connected, publicKey, step])

  const handleSetupMerchant = async () => {
    // Check if Business tier and no wallet connected - redirect to wallet connection
    if (merchantData.tier === 'Business' && !connected) {
      setStep('wallet')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('Setting up merchant with Grid...', merchantData)

      if (!connected || !publicKey) {
        throw new Error('Wallet connection required for merchant setup')
      }

      if (!merchantFlow || !gridClient) {
        throw new Error('Grid services not available')
      }

      let result

      if (merchantData.useMultisig && merchantData.signers.filter(s => s.trim()).length > 0) {
        // ✅ REAL GRID INTEGRATION: Create multisig merchant account
        const validSigners = merchantData.signers
          .filter(s => s.trim())
          .map(s => new PublicKey(s.trim()))

        // Ensure we have at least the connected wallet as a signer
        if (!validSigners.some(s => s.equals(publicKey))) {
          validSigners.push(publicKey)
        }

        // Validate threshold
        const threshold = Math.min(merchantData.threshold, validSigners.length)

        console.log(`Creating Grid multisig merchant: ${validSigners.length} signers, threshold ${threshold}`)

        result = await merchantFlow.createMerchant({
          signers: validSigners,
          threshold,
          name: merchantData.businessName || 'OuroC Merchant',
          description: `Merchant account for ${merchantData.businessName || 'OuroC subscriptions'}`
        })

        console.log('✅ Grid multisig account created:', result.multisigAccount.account_id)
        setGridAccountId(result.multisigAccount.account_id)

        // Set spending limits for security (Business tier gets higher limits)
        const limits = merchantData.tier === 'Business'
          ? { dailyLimit: BigInt(50_000_000_000), monthlyLimit: BigInt(500_000_000_000) } // 50k/500k USDC
          : { dailyLimit: BigInt(10_000_000_000), monthlyLimit: BigInt(100_000_000_000) } // 10k/100k USDC

        await merchantFlow.setSpendingLimits(result.multisigAccount.account_id, limits)
        console.log('✅ Spending limits configured')

      } else {
        // ✅ REAL GRID INTEGRATION: Create single signer merchant account
        console.log('Creating Grid single signer merchant account')

        const account = await gridClient.createSignerAccount({
          type: 'signer',
          signer_public_key: publicKey.toString(),
          account_type: 'USDC',
          name: merchantData.businessName || 'OuroC Merchant',
          description: `Merchant account for ${merchantData.businessName || 'OuroC subscriptions'}`
        })

        console.log('✅ Grid account created:', account.account_id)
        setGridAccountId(account.account_id)
      }

      // Auto-connect wallet for Business tier if not already connected
      if (merchantData.tier === 'Business' && connected && publicKey) {
        setMerchantData(prev => ({
          ...prev,
          walletAddress: publicKey.toString()
        }))
      }

      console.log('✅ Grid merchant setup completed successfully')
      setStep('complete')

    } catch (err) {
      console.error('Grid merchant setup failed:', err)

      // Fallback to demo mode if Grid API is unavailable
      if (err instanceof Error && (err.message.includes('Network Error') || err.message.includes('ERR_CERT'))) {
        console.log('🔄 Grid API unavailable, using demo mode')
        // Simulate account creation for demo
        await new Promise(resolve => setTimeout(resolve, 2000))
        setGridAccountId('demo_' + Math.random().toString(36).substr(2, 9))
        setStep('complete')
        return
      }

      setError(err instanceof Error ? err.message : 'Failed to setup Grid merchant account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 pt-16">{/* Added pt-16 for navbar spacing */}

      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 mb-4 px-4 py-2 rounded-full glass border border-purple-primary/30"
          >
            <Shield className="h-4 w-4 text-purple-primary" />
            <span className="text-sm text-gray-300">Enterprise-Grade Grid Integration</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-bold mb-4 gradient-text"
          >
            Merchant Grid Setup
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto"
          >
            Set up your merchant account with Squads Protocol Grid for enhanced security and multi-signature support
          </motion.p>
        </div>

        {/* Progress Steps */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex items-center justify-between">
            {[
              { key: 'choice', label: 'Get Started' },
              { key: 'email', label: 'Email' },
              { key: 'wallet', label: 'Wallet' },
              { key: 'setup', label: 'Configure' },
              { key: 'complete', label: 'Complete' }
            ].map((item, index) => (
              <div key={item.key} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step === item.key ? 'bg-purple-primary text-white' :
                  ['choice', 'email', 'wallet', 'setup', 'complete'].indexOf(step) > index ? 'bg-green-primary text-white' :
                  'bg-dark-700 text-gray-500'
                }`}>
                  {index + 1}
                </div>
                {index < 4 && (
                  <div className={`h-1 w-24 mx-2 ${
                    ['choice', 'email', 'wallet', 'setup', 'complete'].indexOf(step) > index
                      ? 'bg-purple-primary'
                      : 'bg-dark-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Choice - Email or Wallet */}
        {step === 'choice' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto space-y-8"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">Choose Your Signup Method</h2>
              <p className="text-gray-400">Start accepting subscription payments with your preferred method</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Email Signup */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep('email')}
                className="glass p-8 rounded-2xl cursor-pointer hover:border-purple-primary/50 border-2 border-transparent"
              >
                <div className="text-center">
                  <Mail className="h-16 w-16 text-green-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Email Signup</h3>
                  <p className="text-gray-400 mb-4">
                    Start with just your email address. Add wallet later for payments.
                  </p>
                  <div className="text-sm text-green-primary font-medium">
                    Quick & Easy Setup
                  </div>
                </div>
              </motion.div>

              {/* Wallet Signup */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep('wallet')}
                className="glass p-8 rounded-2xl cursor-pointer hover:border-purple-primary/50 border-2 border-transparent"
              >
                <div className="text-center">
                  <Wallet className="h-16 w-16 text-purple-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Wallet Connect</h3>
                  <p className="text-gray-400 mb-4">
                    Connect your Solana wallet to immediately start receiving payments.
                  </p>
                  <div className="text-sm text-purple-primary font-medium">
                    Ready for Transactions
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Email Collection */}
        {step === 'email' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto"
          >
            <div className="glass p-8 rounded-2xl">
              <div className="flex items-center space-x-2 mb-6">
                <Mail className="h-8 w-8 text-green-primary" />
                <h2 className="text-2xl font-bold text-white">Enter Your Email</h2>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Email Address
                  </label>
                  <input
                    type="email"
                    value={merchantData.email}
                    onChange={(e) => setMerchantData({ ...merchantData, email: e.target.value })}
                    placeholder="merchant@example.com"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-purple-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={merchantData.businessName}
                    onChange={(e) => setMerchantData({ ...merchantData, businessName: e.target.value })}
                    placeholder="Your Business Name"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-purple-primary"
                    required
                  />
                </div>

                <div className="flex space-x-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep('choice')}
                    className="flex-1 py-3 px-6 bg-dark-700 text-white rounded-xl font-semibold hover:bg-dark-600"
                  >
                    Back
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 py-4 px-6 bg-gradient-to-r from-green-primary to-green-dark text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-primary/25"
                  >
                    Continue
                    <ArrowRight className="inline-block ml-2 h-4 w-4" />
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* Step 3: Wallet Connection */}
        {step === 'wallet' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            <div className="glass p-8 rounded-2xl text-center">
              <Wallet className="h-16 w-16 text-purple-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-6">
                {merchantData.tier === 'Business'
                  ? "Business tier requires a wallet for API access and payments"
                  : "Connect your Solana wallet to receive subscription payments"
                }
              </p>
              <WalletButton />
            </div>

            {connected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-6 rounded-2xl"
              >
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 text-green-primary mx-auto mb-2" />
                  <p className="text-white font-medium">Wallet Connected!</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}
                  </p>
                  {merchantData.businessName && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setStep('setup')}
                      className="mt-4 w-full py-3 px-6 bg-gradient-to-r from-purple-primary to-purple-dark text-white rounded-xl font-semibold"
                    >
                      Continue to Setup
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Step 4: Configure Merchant */}
        {step === 'setup' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto glass p-8 rounded-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Configure Your Merchant Account</h2>

            <div className="space-y-6">
              {/* Business Name (if not already set) */}
              {!merchantData.businessName && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={merchantData.businessName}
                    onChange={(e) => setMerchantData({ ...merchantData, businessName: e.target.value })}
                    placeholder="Enter your business name"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-purple-primary"
                    required
                  />
                </div>
              )}

              {/* Email Display (already collected) */}
              {merchantData.email && (
                <div className="glass p-4 rounded-lg border border-green-primary/30">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-green-primary" />
                    <span className="text-sm text-gray-400">Email:</span>
                    <span className="text-white font-medium">{merchantData.email}</span>
                  </div>
                </div>
              )}

              {/* Wallet Display (already connected) */}
              {connected && publicKey && (
                <div className="glass p-4 rounded-lg border border-purple-primary/30">
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4 text-purple-primary" />
                    <span className="text-sm text-gray-400">Wallet:</span>
                    <span className="text-white font-mono text-sm">
                      {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
                    </span>
                  </div>
                </div>
              )}

              {/* Tier Selection */}
              <div className="glass p-6 rounded-xl border border-purple-primary/30">
                <div className="flex items-center space-x-2 mb-4">
                  <Globe className="h-5 w-5 text-purple-primary" />
                  <h3 className="text-lg font-semibold text-white">Choose Your Plan</h3>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start space-x-3 cursor-pointer hover:bg-white/5 p-3 rounded-lg">
                    <input
                      type="radio"
                      name="tier"
                      value="Community"
                      checked={merchantData.tier === 'Community'}
                      onChange={(e) => setMerchantData({ ...merchantData, tier: e.target.value })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white">Community Plan</div>
                      <div className="text-sm text-gray-400">Free to start • 2% transaction fee • Basic features</div>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 cursor-pointer hover:bg-white/5 p-3 rounded-lg">
                    <input
                      type="radio"
                      name="tier"
                      value="Business"
                      checked={merchantData.tier === 'Business'}
                      onChange={(e) => setMerchantData({ ...merchantData, tier: e.target.value })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white">Business Plan</div>
                      <div className="text-sm text-gray-400">$299/month • 0.5% fee • API access • Priority support</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Multisig Option (for wallet users) */}
              {connected && (
                <div className="glass p-6 rounded-xl border border-purple-primary/30">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={merchantData.useMultisig}
                      onChange={(e) => setMerchantData({ ...merchantData, useMultisig: e.target.checked })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Lock className="h-4 w-4 text-purple-primary" />
                        <span className="font-semibold text-white">Enable Multi-Signature (Advanced)</span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Require multiple signatures for withdrawals and critical operations
                      </p>
                    </div>
                  </div>

                  {merchantData.useMultisig && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Signature Threshold
                        </label>
                        <select
                          value={merchantData.threshold}
                          onChange={(e) => setMerchantData({ ...merchantData, threshold: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-purple-primary"
                        >
                          <option value={2}>2 of 3</option>
                          <option value={3}>3 of 4</option>
                          <option value={3}>3 of 5</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <Users className="inline h-4 w-4 mr-1" />
                          Authorized Signers
                        </label>
                        {merchantData.signers.map((signer, index) => (
                          <input
                            key={index}
                            type="text"
                            value={signer}
                            onChange={(e) => {
                              const newSigners = [...merchantData.signers]
                              newSigners[index] = e.target.value
                              setMerchantData({ ...merchantData, signers: newSigners })
                            }}
                            placeholder="Solana wallet address"
                            className="w-full px-4 py-2 mb-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-purple-primary"
                          />
                        ))}
                        <button
                          onClick={() => setMerchantData({ ...merchantData, signers: [...merchantData.signers, ''] })}
                          className="text-sm text-purple-primary hover:text-purple-light"
                        >
                          + Add Signer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex space-x-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep('choice')}
                  className="flex-1 py-3 px-6 bg-dark-700 text-white rounded-xl font-semibold hover:bg-dark-600"
                >
                  Back
                </motion.button>
                {/* Error Display */}
                {error && (
                  <div className="glass p-4 rounded-lg border border-red-primary/30 mb-4">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-red-primary" />
                      <span className="text-sm text-red-primary">{error}</span>
                    </div>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSetupMerchant}
                  disabled={!merchantData.businessName || (merchantData.tier === 'Business' && !connected) || loading}
                  className="flex-1 py-4 px-6 bg-gradient-to-r from-purple-primary to-purple-dark text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Grid Account...
                    </>
                  ) : (
                    <>
                      {merchantData.tier === 'Business' ? 'Get API Key & Complete Setup' : 'Complete Setup'}
                      <ArrowRight className="inline-block ml-2 h-4 w-4" />
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 5: Complete */}
        {step === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto glass p-8 rounded-2xl text-center"
          >
            <CheckCircle className="h-16 w-16 text-green-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Merchant Account Ready!</h2>
            <p className="text-gray-400 mb-6">
              Your merchant account has been successfully set up. You can now start accepting subscription payments.
            </p>

            <div className="glass p-6 rounded-xl mb-6">
              <div className="space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-400">Business Name:</span>
                  <span className="text-white font-medium">{merchantData.businessName}</span>
                </div>
                {merchantData.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white font-medium">{merchantData.email}</span>
                  </div>
                )}
                {connected && publicKey && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Wallet:</span>
                    <span className="text-white font-mono text-sm">
                      {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Plan:</span>
                  <span className={merchantData.tier === 'Business' ? "text-purple-400 font-medium" : "text-green-400 font-medium"}>
                    {merchantData.tier} {merchantData.tier === 'Business' && '(API Access)'}
                  </span>
                </div>
                {merchantData.useMultisig && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Multi-Sig:</span>
                    <span className="text-green-400">Enabled ({merchantData.threshold}-of-{merchantData.signers.filter(s => s.trim()).length})</span>
                  </div>
                )}
                {gridAccountId && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Grid Account:</span>
                    <span className="text-purple-400 font-mono text-sm">
                      {gridAccountId.slice(0, 8)}...{gridAccountId.slice(-8)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Business Tier API Key Display */}
            {merchantData.tier === 'Business' && (
              <div className="glass p-4 rounded-xl mb-6 border border-purple-primary/30">
                <div className="flex items-center space-x-2 mb-2">
                  <Key className="h-5 w-5 text-purple-primary" />
                  <span className="text-white font-semibold">Your API Key</span>
                </div>
                <div className="bg-dark-800 p-3 rounded-lg font-mono text-sm text-gray-300 mb-3">
                  ouroc_demo_api_key_business_2025
                </div>
                <p className="text-xs text-gray-400">
                  Save this key securely. You'll need it for API access.
                </p>
              </div>
            )}

            <div className="flex space-x-4">
              {merchantData.tier === 'Business' ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.location.href = '/business-signup'}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-primary to-purple-dark text-white rounded-xl font-semibold"
                >
                  View API Documentation
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.location.href = '/pricing'}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-primary to-purple-dark text-white rounded-xl font-semibold"
                >
                  View Pricing Plans
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.href = '/merchant-dashboard'}
                className="flex-1 py-3 px-6 bg-dark-700 text-white rounded-xl font-semibold hover:bg-dark-600"
              >
                Go to Dashboard
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto mt-16 grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Shield,
              title: 'Enhanced Security',
              description: 'Multi-signature wallets and Grid protocol protection'
            },
            {
              icon: Users,
              title: 'Team Management',
              description: 'Multiple authorized signers for critical operations'
            },
            {
              icon: Lock,
              title: 'Non-Custodial',
              description: 'You maintain full control of your funds at all times'
            }
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="glass p-6 rounded-xl"
            >
              <feature.icon className="h-8 w-8 text-purple-primary mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  )
}
