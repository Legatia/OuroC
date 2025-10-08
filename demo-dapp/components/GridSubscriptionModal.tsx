import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import GridSubscriberLogin from './GridSubscriberLogin'
import RealSubscriptionCard from './RealSubscriptionCard'

interface Plan {
  name: string
  price: number
  period: string
  description: string
  features: string[]
  popular: boolean
  color: string
}

interface GridSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  plan: Plan | null
  merchantAddress: string
}

export default function GridSubscriptionModal({
  isOpen,
  onClose,
  plan,
  merchantAddress
}: GridSubscriptionModalProps) {
  const [gridAccount, setGridAccount] = useState<any | null>(null)
  const [showSubscription, setShowSubscription] = useState(false)

  const handleGridSuccess = (email: string, account: any) => {
    console.log('Grid account created:', email, account)
    setGridAccount(account)
    setShowSubscription(true)
  }

  const handleSkip = () => {
    setShowSubscription(true)
  }

  const handleSubscribe = (subscribedPlan: Plan) => {
    console.log('Subscription created for plan:', subscribedPlan)
    // Close modal after brief delay
    setTimeout(() => {
      onClose()
    }, 2000)
  }

  if (!plan) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto pointer-events-auto glass rounded-2xl"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 glass border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {showSubscription ? 'Complete Subscription' : 'Sign in with Grid'}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {plan.name} Plan - ${plan.price} USDC/{plan.period}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {!showSubscription ? (
                  <GridSubscriberLogin
                    onSuccess={handleGridSuccess}
                    onSkip={handleSkip}
                  />
                ) : (
                  <div className="max-w-2xl mx-auto">
                    {gridAccount && (
                      <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                        <p className="text-sm text-green-300">
                          ✓ Grid account connected: <span className="font-medium">{gridAccount.email}</span>
                        </p>
                      </div>
                    )}

                    <RealSubscriptionCard
                      plan={plan}
                      onSubscribe={handleSubscribe}
                      merchantAddress={merchantAddress}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
