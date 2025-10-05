import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Clock,
  Bell,
  CreditCard,
  ArrowRight,
  Wallet,
  Server,
  Smartphone
} from 'lucide-react'

const steps = [
  {
    id: 1,
    title: 'User Subscribes',
    description: 'User connects wallet and selects a subscription plan',
    icon: Wallet,
    color: 'from-blue-500 to-cyan-600',
    details: [
      'Connect Solana wallet (Phantom, Solflare, etc.)',
      'Select subscription plan and payment frequency',
      'Approve initial subscription transaction',
      'Ouro-C creates recurring payment schedule'
    ]
  },
  {
    id: 2,
    title: 'ICP Timer Activated',
    description: 'Internet Computer Protocol schedules automatic payments',
    icon: Server,
    color: 'from-purple-500 to-pink-600',
    details: [
      'ICP canister creates timer for payment schedule',
      'Timer runs reliably in decentralized environment',
      'Smart contract handles payment logic automatically',
      'No centralized servers required'
    ]
  },
  {
    id: 3,
    title: 'Smart Notifications',
    description: 'Users get notified before payments via multiple channels',
    icon: Bell,
    color: 'from-green-500 to-emerald-600',
    details: [
      'Email notifications 7, 3, 1 days before payment',
      'Discord webhook alerts for communities',
      'Slack integration for team notifications',
      'Custom webhook for dApp integration'
    ]
  },
  {
    id: 4,
    title: 'Automatic Payment',
    description: 'USDC payment is processed automatically on schedule',
    icon: CreditCard,
    color: 'from-yellow-500 to-orange-600',
    details: [
      'Timer triggers USDC payment execution',
      'Solana USDC transaction sent from user wallet',
      'Payment confirmed on blockchain',
      'Next payment automatically scheduled'
    ]
  },
  {
    id: 5,
    title: 'Multi-Device Alerts',
    description: 'Confirmation sent across all notification channels',
    icon: Smartphone,
    color: 'from-indigo-500 to-purple-600',
    details: [
      'Payment success notifications sent',
      'dApp receives webhook confirmation',
      'User dashboard updated in real-time',
      'Receipt and transaction details provided'
    ]
  }
]

export default function OuroCShowcase() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setCurrentStep(0)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    } else {
      setCurrentStep(steps.length - 1)
    }
  }

  const startDemo = () => {
    setIsPlaying(true)
    setHasStarted(true)
    setCurrentStep(0)
  }

  const pauseDemo = () => {
    setIsPlaying(false)
  }

  const resetDemo = () => {
    setIsPlaying(false)
    setCurrentStep(0)
    setHasStarted(false)
  }

  // Auto-advance steps when playing
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) {
          return prev + 1
        } else {
          setIsPlaying(false)
          return prev
        }
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [isPlaying])

  const currentStepData = steps[currentStep]

  return (
    <div className="glass-purple p-8 rounded-2xl max-w-6xl mx-auto mb-16">
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-white mb-4">
          🎬 Ouro-C in Action
        </h3>
        <p className="text-gray-300">
          Watch how Ouro-C handles subscription payments automatically
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-4 mb-8">
        <button
          onClick={isPlaying ? pauseDemo : startDemo}
          className={`btn-${isPlaying ? 'secondary' : 'primary'} inline-flex items-center space-x-2`}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          <span>{isPlaying ? 'Pause' : 'Start'} Demo</span>
        </button>

        <button
          onClick={resetDemo}
          className="glass border border-white/20 px-4 py-2 rounded-lg text-white hover:bg-white/10 transition-colors inline-flex items-center space-x-2"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Progress</span>
          <span className="text-sm text-gray-400">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <motion.div
            className="h-2 bg-gradient-to-r from-purple-primary to-green-primary rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Step Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Timeline */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-white mb-4">Payment Flow</h4>
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            const isFuture = index > currentStep

            return (
              <motion.div
                key={step.id}
                className={`flex items-start space-x-4 p-4 rounded-lg transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-white/10 border border-purple-primary/50'
                    : isCompleted
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-gray-800/30 border border-gray-600/30'
                }`}
                onClick={() => setCurrentStep(index)}
                whileHover={{ scale: 1.02 }}
              >
                <div
                  className={`p-3 rounded-xl bg-gradient-to-r ${step.color} ${
                    isFuture ? 'opacity-50' : ''
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-6 w-6 text-white" />
                  ) : (
                    <Icon className="h-6 w-6 text-white" />
                  )}
                </div>

                <div className="flex-1">
                  <h5
                    className={`font-semibold ${
                      isActive ? 'text-white' : isCompleted ? 'text-green-400' : 'text-gray-400'
                    }`}
                  >
                    {step.title}
                  </h5>
                  <p className="text-sm text-gray-400 mt-1">{step.description}</p>

                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3"
                    >
                      <div className="flex items-center space-x-2 text-xs text-purple-300">
                        <Clock className="h-3 w-3" />
                        <span>Currently processing...</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {isActive && (
                  <ArrowRight className="h-5 w-5 text-purple-primary animate-pulse" />
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Current Step Details */}
        <div className="glass p-6 rounded-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${currentStepData.color}`}>
                  <currentStepData.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">{currentStepData.title}</h4>
                  <p className="text-gray-400">{currentStepData.description}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-semibold text-white mb-3">What happens:</h5>
                {currentStepData.details.map((detail, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-start space-x-3"
                  >
                    <CheckCircle className="h-4 w-4 text-green-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">{detail}</span>
                  </motion.div>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-8">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <button
                  onClick={nextStep}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {currentStep === steps.length - 1 ? 'Restart →' : 'Next →'}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Benefits Summary */}
      <div className="mt-8 pt-8 border-t border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Fully Automated',
              description: 'No manual intervention required once set up',
              icon: '🤖'
            },
            {
              title: 'Crypto Native',
              description: 'Built specifically for Solana and Web3',
              icon: '⚡'
            },
            {
              title: 'Developer Friendly',
              description: '5-minute integration with React SDK',
              icon: '👨‍💻'
            }
          ].map((benefit, index) => (
            <div key={benefit.title} className="text-center">
              <div className="text-2xl mb-2">{benefit.icon}</div>
              <h6 className="font-semibold text-white mb-1">{benefit.title}</h6>
              <p className="text-sm text-gray-400">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}