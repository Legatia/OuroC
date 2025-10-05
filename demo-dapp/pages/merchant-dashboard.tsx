import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PublicKey, Connection } from '@solana/web3.js'
import { motion } from 'framer-motion'
import { Clock, DollarSign, Users, AlertCircle, CheckCircle, Pause } from 'lucide-react'
import ManualTriggerButton from '../components/ManualTriggerButton'
import { checkSubscriptionStatus, SubscriptionStatusResult, SubscriptionData } from '../utils/subscriptionStatus'

const PROGRAM_ID = process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID || ''

export default function MerchantDashboard() {
  const { publicKey, connected } = useWallet()
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (connected && publicKey) {
      fetchMerchantSubscriptions()
    }
  }, [connected, publicKey])

  const fetchMerchantSubscriptions = async () => {
    if (!publicKey) return

    setLoading(true)
    setError('')

    try {
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
      )

      // Fetch all subscriptions where merchant = publicKey
      // NOTE: In production, use getProgramAccounts with memcmp filter
      // or maintain an off-chain index

      console.log('Fetching subscriptions for merchant:', publicKey.toString())

      // Placeholder - implement actual fetching logic
      // const accounts = await connection.getProgramAccounts(
      //   new PublicKey(PROGRAM_ID),
      //   {
      //     filters: [
      //       { memcmp: { offset: 8 + 32, bytes: publicKey.toBase58() } }
      //     ]
      //   }
      // )

      // Mock data for demonstration
      setSubscriptions([])
      setLoading(false)

    } catch (err: any) {
      console.error('Error fetching subscriptions:', err)
      setError(err.message || 'Failed to fetch subscriptions')
      setLoading(false)
    }
  }

  const getStatusBadge = (status: SubscriptionStatusResult) => {
    const badges = {
      active: (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Active
        </span>
      ),
      overdue: (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Overdue
        </span>
      ),
      paused: (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <Pause className="w-3 h-3" />
          Paused
        </span>
      ),
      cancelled: (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
          Cancelled
        </span>
      )
    }

    return badges[status.status] || badges.active
  }

  const calculateStats = () => {
    const total = subscriptions.length
    const active = subscriptions.filter(s => s.status === 0).length
    const totalRevenue = subscriptions.reduce((sum, sub) => {
      const merchantAmount = sub.amount * (1 - sub.icpFeePercentage / 10000)
      return sum + merchantAmount
    }, 0)

    return { total, active, totalRevenue }
  }

  const stats = calculateStats()

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Merchant Dashboard</h1>
          <p className="text-gray-600 mb-6">Connect your wallet to view subscriptions</p>
          <WalletMultiButton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Merchant Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your subscriptions</p>
          </div>
          <WalletMultiButton />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Subscribers</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <Users className="w-12 h-12 text-purple-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Subscriptions</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.active}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expected Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  ${(stats.totalRevenue / 1e6).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-blue-500" />
            </div>
          </motion.div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </motion.div>
        )}

        {/* Subscriptions List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Subscriptions</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              <p className="text-gray-600 mt-4">Loading subscriptions...</p>
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No subscriptions found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {subscriptions.map((subscription) => {
                const status = checkSubscriptionStatus(subscription)
                const merchantAmount = subscription.amount * (1 - subscription.icpFeePercentage / 10000)

                return (
                  <motion.div
                    key={subscription.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            Subscription #{subscription.id.substring(0, 8)}...
                          </h3>
                          {getStatusBadge(status)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                          <div>
                            <p className="text-gray-600">Subscriber</p>
                            <p className="font-mono text-xs text-gray-900">
                              {subscription.subscriber.toString().substring(0, 12)}...
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Amount</p>
                            <p className="font-semibold text-gray-900">
                              ${(merchantAmount / 1e6).toFixed(2)} USDC
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Interval</p>
                            <p className="text-gray-900">
                              {subscription.intervalSeconds / 86400} days
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Status</p>
                            <p className="text-gray-900">{status.message}</p>
                          </div>
                        </div>
                      </div>

                      <div className="ml-6">
                        {status.shouldShowManualTrigger && (
                          <ManualTriggerButton
                            subscriptionId={subscription.id}
                            subscriptionData={subscription}
                            programId={PROGRAM_ID}
                            onSuccess={() => fetchMerchantSubscriptions()}
                            onError={(err) => setError(err)}
                          />
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
