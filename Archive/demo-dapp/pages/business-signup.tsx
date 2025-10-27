import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { motion } from 'framer-motion'
import { Shield, Mail, Wallet, CheckCircle, AlertCircle, Key, Lock, Zap, Globe, Database } from 'lucide-react'
import WalletButton from '../components/WalletButton'

// ICP Canister configuration
const LICENSE_REGISTRY_CANISTER_ID = "gbuo5-iyaaa-aaaao-qkuba-cai"
const ICP_NETWORK = "https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io"

type SignupStep = 'email' | 'wallet' | 'payment' | 'complete' | 'error'

interface BusinessRegistration {
  name: string
  email: string
  projectDescription: string
  walletAddress?: string
  billingMethod: 'card' | 'crypto'
}

export default function BusinessSignup() {
  const { publicKey, connected } = useWallet()
  const [currentStep, setCurrentStep] = useState<SignupStep>('email')
  const [registration, setRegistration] = useState<BusinessRegistration>({
    name: '',
    email: '',
    projectDescription: '',
    billingMethod: 'card'
  })
  const [apiKey, setApiKey] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [developerId, setDeveloperId] = useState<string>('')

  // Email validation
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // Call ICP canister
  const callCanister = async (methodName: string, args: any[]) => {
    try {
      const response = await fetch(`${ICP_NETWORK}/?id=${LICENSE_REGISTRY_CANISTER_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/candid',
        },
        body: JSON.stringify({
          method: methodName,
          args: args
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (err) {
      throw new Error(`Failed to call canister: ${err}`)
    }
  }

  // Register Business developer with ICP
  const registerBusinessDeveloper = async () => {
    setLoading(true)
    setError('')

    try {
      // Validate inputs
      if (!registration.name.trim()) {
        throw new Error('Business name is required')
      }
      if (!validateEmail(registration.email)) {
        throw new Error('Valid email is required')
      }
      if (registration.projectDescription.length < 10) {
        throw new Error('Project description must be at least 10 characters')
      }
      if (!connected || !publicKey) {
        throw new Error('Wallet connection is required')
      }

      // Prepare Business tier registration
      const registrationRequest = {
        name: registration.name,
        email: registration.email,
        tier: 'Business',
        project_description: registration.projectDescription
      }

      // Call ICP canister to register Business developer
      const result = await callCanister('register_developer', [registrationRequest])

      if (result.Ok) {
        setApiKey(result.Ok.api_key)
        setDeveloperId(result.Ok.developer_id)
        setCurrentStep('payment')
      } else {
        throw new Error(result.Err || 'Business registration failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Business registration failed')
      setCurrentStep('error')
    } finally {
      setLoading(false)
    }
  }

  // Handle email form submission
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateEmail(registration.email) && registration.name.trim()) {
      setCurrentStep('wallet')
    } else {
      setError('Please fill in all required fields correctly')
    }
  }

  // Handle wallet connection
  useEffect(() => {
    if (connected && publicKey && currentStep === 'wallet') {
      setRegistration(prev => ({
        ...prev,
        walletAddress: publicKey.toString()
      }))
      registerBusinessDeveloper()
    }
  }, [connected, publicKey, currentStep])

  // Handle payment (simulation)
  const handlePayment = async () => {
    setLoading(true)
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      setCurrentStep('complete')
    } catch (err) {
      setError('Payment processing failed')
      setCurrentStep('error')
    } finally {
      setLoading(false)
    }
  }

  // Business tier features
  const features = [
    {
      icon: Key,
      title: 'API Access',
      description: 'Get your Business tier API key for SDK integration'
    },
    {
      icon: Lock,
      title: 'Web Crypto API',
      description: 'AES-GCM-256 encryption for GDPR compliance'
    },
    {
      icon: Zap,
      title: '1,000 Subscriptions',
      description: 'Scale up to 1,000 active subscriptions'
    },
    {
      icon: Database,
      title: 'Priority Support',
      description: '24/7 email and chat support for your business'
    },
    {
      icon: Globe,
      title: 'GDPR Compliant',
      description: 'Built-in privacy tools for data protection'
    },
    {
      icon: Shield,
      title: 'Advanced Analytics',
      description: 'Detailed revenue and customer analytics'
    }
  ]

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 'email':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
          >
            <div className="text-center mb-8">
              <Key className="h-16 w-16 text-purple-primary mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">Business Tier</h2>
              <p className="text-gray-400 mb-2">Get API access for your applications</p>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-primary/20 rounded-full mb-4">
                <span className="text-purple-primary font-semibold">$299/month</span>
                <span className="text-gray-400 text-sm">• Billed monthly</span>
              </div>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={registration.name}
                  onChange={(e) => setRegistration(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-dark-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-primary focus:border-transparent"
                  placeholder="Your Business Name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Business Email *
                </label>
                <input
                  type="email"
                  value={registration.email}
                  onChange={(e) => setRegistration(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 bg-dark-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-primary focus:border-transparent"
                  placeholder="your@business.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What will you build with OuroC?
                </label>
                <textarea
                  value={registration.projectDescription}
                  onChange={(e) => setRegistration(prev => ({ ...prev, projectDescription: e.target.value }))}
                  className="w-full px-4 py-3 bg-dark-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-primary focus:border-transparent h-24 resize-none"
                  placeholder="Tell us about your project and how you plan to use recurring payments..."
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-red-400 text-sm">{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-6 bg-gradient-to-r from-purple-primary to-purple-dark text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-primary/25 transition-all"
              >
                Continue to Get API Key
              </button>
            </form>
          </motion.div>
        )

      case 'wallet':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto text-center"
          >
            <Wallet className="h-16 w-16 text-purple-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8">
              Connect your Solana wallet to generate your Business API key
            </p>

            <div className="glass p-6 rounded-lg mb-6">
              <p className="text-sm text-gray-300 mb-2">
                Business: <span className="text-white">{registration.name}</span>
              </p>
              <p className="text-sm text-gray-300">
                Email: <span className="text-white">{registration.email}</span>
              </p>
            </div>

            <div className="glass p-4 rounded-lg mb-6 border border-green-primary/30">
              <p className="text-sm text-green-primary font-semibold mb-2">
                ✅ Free API key generation
              </p>
              <p className="text-xs text-gray-400">
                Your API key will be generated immediately after wallet connection. Billing starts at $299/month.
              </p>
            </div>

            <WalletButton />
          </motion.div>
        )

      case 'payment':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto text-center"
          >
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">API Key Generated!</h2>
            <p className="text-gray-400 mb-8">
              Your Business tier API key is ready. Complete payment to activate your subscription.
            </p>

            <div className="glass p-6 rounded-lg mb-6">
              <h3 className="text-white font-semibold mb-4">Your Business API Key</h3>
              <div className="bg-dark-800 p-4 rounded-lg border border-white/10 mb-4">
                <code className="text-green-400 text-sm break-all">{apiKey}</code>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Save this key securely. You'll need it for SDK integration.
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(apiKey)}
                className="w-full py-2 px-4 bg-purple-primary/20 text-purple-primary rounded-lg hover:bg-purple-primary/30 transition-all text-sm font-semibold"
              >
                Copy API Key
              </button>
            </div>

            <div className="glass p-6 rounded-lg mb-6">
              <h4 className="text-white font-semibold mb-4">Subscription Details</h4>
              <div className="space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-400">Plan:</span>
                  <span className="text-white font-semibold">Business Tier</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price:</span>
                  <span className="text-white font-semibold">$299/month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">API Calls:</span>
                  <span className="text-white">100/hour</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Subscriptions:</span>
                  <span className="text-white">Up to 1,000</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setCurrentStep('complete')}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-primary to-purple-dark text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-primary/25 transition-all"
              >
                I'll Pay Later
              </button>
              <button
                onClick={handlePayment}
                disabled={loading}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-green-primary to-green-dark text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-green-primary/25 transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Pay $299'}
              </button>
            </div>
          </motion.div>
        )

      case 'complete':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center"
          >
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Welcome to OuroC Business!</h2>
            <p className="text-gray-400 mb-8">Your Business tier account is ready for development</p>

            <div className="glass p-6 rounded-lg mb-6">
              <h3 className="text-white font-semibold mb-4">Your Business API Key</h3>
              <div className="bg-dark-800 p-4 rounded-lg border border-white/10 mb-4">
                <code className="text-green-400 text-sm break-all">{apiKey}</code>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Save this key securely for SDK integration
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(apiKey)}
                className="w-full py-2 px-4 bg-purple-primary/20 text-purple-primary rounded-lg hover:bg-purple-primary/30 transition-all text-sm font-semibold"
              >
                Copy API Key
              </button>
            </div>

            <div className="glass p-6 rounded-lg mb-6">
              <h4 className="text-white font-semibold mb-4">What's Next?</h4>
              <div className="space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <span className="text-purple-primary">1.</span>
                  <p className="text-gray-300 text-sm">Install the OuroC SDK in your project</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-purple-primary">2.</span>
                  <p className="text-gray-300 text-sm">Initialize with your API key</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-purple-primary">3.</span>
                  <p className="text-gray-300 text-sm">Create your first subscription timer</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-purple-primary">4.</span>
                  <p className="text-gray-300 text-sm">Monitor your revenue in the dashboard</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => window.location.href = '/merchant-dashboard'}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-primary to-purple-dark text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-primary/25 transition-all"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => window.open('https://github.com/ouroc/sdk', '_blank')}
                className="flex-1 py-3 px-6 bg-dark-700 text-white font-semibold rounded-lg hover:bg-dark-600 transition-all"
              >
                SDK Documentation
              </button>
            </div>
          </motion.div>
        )

      case 'error':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center"
          >
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Registration Failed</h2>
            <p className="text-gray-400 mb-8">{error}</p>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setError('')
                  setCurrentStep('email')
                }}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-primary to-purple-dark text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-primary/25 transition-all"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/merchant-signup'}
                className="flex-1 py-3 px-6 bg-dark-700 text-white font-semibold rounded-lg hover:bg-dark-600 transition-all"
              >
                View Other Plans
              </button>
            </div>
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 pt-16">
      {/* Header with features */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-4">Business Tier</h1>
          <p className="text-xl text-gray-400">Get API access and build scalable subscription products</p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          {features.map((feature, index) => {
            const IconComponent = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass p-6 rounded-2xl text-center"
              >
                <IconComponent className="h-12 w-12 text-purple-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-16">
        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[
              { step: 'email', label: 'Info', icon: Mail },
              { step: 'wallet', label: 'Wallet', icon: Wallet },
              { step: 'payment', label: 'Payment', icon: Key },
              { step: 'complete', label: 'Complete', icon: CheckCircle }
            ].map((item, index) => {
              const isActive = currentStep === item.step
              const isCompleted = ['email', 'wallet', 'payment'].indexOf(currentStep) > index
              const IconComponent = item.icon

              return (
                <div key={item.step} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    isActive || isCompleted
                      ? 'border-purple-primary bg-purple-primary/20'
                      : 'border-white/20'
                  }`}>
                    <IconComponent className={`h-5 w-5 ${
                      isActive || isCompleted ? 'text-purple-primary' : 'text-gray-500'
                    }`} />
                  </div>
                  {index < 3 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      isCompleted ? 'bg-purple-primary' : 'bg-white/20'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Current Step Content */}
        {renderStep()}
      </div>
    </div>
  )
}