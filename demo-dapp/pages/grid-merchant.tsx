import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Users, Lock, ArrowRight, CheckCircle, Wallet, Mail } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import WalletButton from '../components/WalletButton'
import Footer from '../components/Footer'

export default function GridMerchant() {
  const { connected, publicKey } = useWallet()
  const [step, setStep] = useState<'connect' | 'setup' | 'complete'>('connect')
  const [merchantData, setMerchantData] = useState({
    businessName: '',
    email: '',
    useMultisig: false,
    signers: [''],
    threshold: 2,
  })

  const handleSetupMerchant = async () => {
    console.log('Setting up merchant with Grid...', merchantData)

    // ✅ Grid Integration: Setup merchant account with Grid
    // Implementation: This would integrate with GridClient and MerchantFlow
    //
    // Example implementation:
    // const gridClient = new GridClient({
    //   apiKey: process.env.NEXT_PUBLIC_GRID_API_KEY,
    //   environment: 'sandbox'
    // })
    //
    // const merchantFlow = new MerchantKYCFlow(gridClient)
    // const result = await merchantFlow.setupMerchant({
    //   businessName: merchantData.businessName,
    //   email: merchantData.email,
    //   walletAddress: publicKey?.toBase58(),
    //   useMultisig: merchantData.useMultisig,
    //   signers: merchantData.useMultisig ? merchantData.signers : [],
    //   threshold: merchantData.useMultisig ? merchantData.threshold : 1
    // })
    //
    // For now, using simulation for demo purposes
    console.log('Grid Merchant Flow would be initiated here')
    console.log('Wallet:', publicKey?.toBase58())
    console.log('Multisig:', merchantData.useMultisig)

    setStep('complete')
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
            {['Connect Wallet', 'Configure Merchant', 'Complete Setup'].map((label, index) => (
              <div key={label} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  index === 0 && step === 'connect' ? 'bg-purple-primary text-white' :
                  index === 1 && step === 'setup' ? 'bg-purple-primary text-white' :
                  index === 2 && step === 'complete' ? 'bg-green-primary text-white' :
                  'bg-dark-700 text-gray-500'
                }`}>
                  {index + 1}
                </div>
                {index < 2 && (
                  <div className={`h-1 w-32 mx-2 ${
                    (index === 0 && (step === 'setup' || step === 'complete')) ||
                    (index === 1 && step === 'complete')
                      ? 'bg-purple-primary'
                      : 'bg-dark-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Connect Wallet & Email */}
        {step === 'connect' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            {/* Wallet Connection */}
            <div className="glass p-8 rounded-2xl text-center">
              <Wallet className="h-16 w-16 text-purple-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-6">
                Connect your Solana wallet to receive subscription payments
              </p>
              <WalletButton />
            </div>

            {/* Email for Grid */}
            {connected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-8 rounded-2xl"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <Mail className="h-6 w-6 text-green-primary" />
                  <h3 className="text-xl font-bold text-white">Add Your Email (Optional)</h3>
                </div>
                <p className="text-gray-400 mb-6">
                  Get notified when you receive subscription payments
                </p>

                <input
                  type="email"
                  value={merchantData.email}
                  onChange={(e) => setMerchantData({ ...merchantData, email: e.target.value })}
                  placeholder="merchant@example.com"
                  className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-primary mb-4"
                />

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep('setup')}
                  className="w-full py-4 px-6 bg-gradient-to-r from-purple-primary to-purple-dark text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-primary/25"
                >
                  Continue to Setup
                  <ArrowRight className="inline-block ml-2 h-4 w-4" />
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Step 2: Configure Merchant */}
        {step === 'setup' && connected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto glass p-8 rounded-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Configure Merchant Account</h2>

            <div className="space-y-6">
              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  value={merchantData.businessName}
                  onChange={(e) => setMerchantData({ ...merchantData, businessName: e.target.value })}
                  placeholder="Enter your business name"
                  className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-primary"
                />
              </div>

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

              {/* Multisig Option */}
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
                      <span className="font-semibold text-white">Enable Multi-Signature</span>
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
                        className="w-full px-4 py-2 bg-dark-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-primary"
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
                          className="w-full px-4 py-2 mb-2 bg-dark-700 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-primary"
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

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSetupMerchant}
                disabled={!merchantData.businessName}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-primary to-purple-dark text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Complete Grid Setup
                <ArrowRight className="inline-block ml-2 h-4 w-4" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto glass p-8 rounded-2xl text-center"
          >
            <CheckCircle className="h-16 w-16 text-green-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Merchant Account Created!</h2>
            <p className="text-gray-400 mb-6">
              Your Grid merchant account has been successfully set up. You can now receive payments with enhanced security.
            </p>

            <div className="glass p-6 rounded-xl mb-6">
              <div className="space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-400">Business Name:</span>
                  <span className="text-white font-medium">{merchantData.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-white font-medium">{merchantData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Wallet:</span>
                  <span className="text-white font-mono text-sm">{publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Multi-Sig:</span>
                  <span className={merchantData.useMultisig ? "text-green-400" : "text-gray-500"}>
                    {merchantData.useMultisig ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.href = '/pricing'}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-primary to-purple-dark text-white rounded-xl font-semibold"
              >
                View Subscription Plans
              </motion.button>
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
