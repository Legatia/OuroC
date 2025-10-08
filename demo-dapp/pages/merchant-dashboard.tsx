import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'
import WalletButton from '../components/WalletButton'
import { MerchantDashboard as SDKMerchantDashboard, SubscriptionData, PaymentData } from '@ouroc/sdk'

// Mock data for demo
const MOCK_SUBSCRIPTIONS: SubscriptionData[] = [
  {
    id: 'sub_1a2b3c4d',
    subscriber: new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'),
    merchant: new PublicKey('HBvV7YqSRSPW4YEBsDvpvF2PrUWFubqVbTNYafkddTsy'),
    amount: 10_000_000, // 10 USDC
    intervalSeconds: 2592000, // 30 days
    status: 0, // Active
    icpFeePercentage: 200, // 2%
    lastPayment: Date.now() - 86400000 * 5,
    nextPayment: Date.now() + 86400000 * 25,
  },
  {
    id: 'sub_5e6f7g8h',
    subscriber: new PublicKey('9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'),
    merchant: new PublicKey('HBvV7YqSRSPW4YEBsDvpvF2PrUWFubqVbTNYafkddTsy'),
    amount: 25_000_000, // 25 USDC
    intervalSeconds: 2592000,
    status: 0,
    icpFeePercentage: 200,
    lastPayment: Date.now() - 86400000 * 2,
    nextPayment: Date.now() + 86400000 * 28,
  },
]

const MOCK_PAYMENTS: PaymentData[] = [
  { id: '1', subscriber: '7xKX...gAsU', amount: 10, date: Date.now() - 86400000 * 5, status: 'success' },
  { id: '2', subscriber: '9xKX...gAsU', amount: 25, date: Date.now() - 86400000 * 2, status: 'success' },
  { id: '3', subscriber: '7xKX...gAsU', amount: 10, date: Date.now() - 86400000 * 35, status: 'success' },
]

export default function MerchantDashboardPage() {
  const { publicKey, connected } = useWallet()
  const [loading, setLoading] = useState(false)

  const fetchSubscriptions = async (): Promise<SubscriptionData[]> => {
    setLoading(true)
    try {
      // For demo, use mock data
      // In production, fetch from Solana program
      await new Promise(resolve => setTimeout(resolve, 500))
      return MOCK_SUBSCRIPTIONS
    } finally {
      setLoading(false)
    }
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 pt-16 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-12 rounded-2xl text-center max-w-md"
        >
          <Shield className="h-16 w-16 text-purple-primary mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Merchant Dashboard</h1>
          <p className="text-gray-400 mb-8">Connect your wallet to view subscriptions and revenue</p>
          <WalletButton />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 pt-16">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Merchant Dashboard</h1>
            <p className="text-gray-400">Monitor your subscription revenue and customer status</p>
          </div>
        </div>

        {/* SDK Dashboard Component */}
        <SDKMerchantDashboard
          merchantAddress={publicKey || undefined}
          subscriptions={MOCK_SUBSCRIPTIONS}
          payments={MOCK_PAYMENTS}
          onFetchSubscriptions={fetchSubscriptions}
          loading={loading}
        />
      </div>

      <style jsx global>{`
        /* Merchant Dashboard Styles */
        .merchant-dashboard {
          width: 100%;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .stat-icon {
          padding: 0.75rem;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-center;
        }

        .stat-icon.subscribers {
          background: rgba(139, 92, 246, 0.2);
          color: #a78bfa;
        }

        .stat-icon.active {
          background: rgba(34, 197, 94, 0.2);
          color: #4ade80;
        }

        .stat-icon.revenue {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
        }

        .stat-icon.growth {
          background: rgba(251, 146, 60, 0.2);
          color: #fb923c;
        }

        .stat-content {
          flex: 1;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #9ca3af;
          margin-bottom: 0.25rem;
        }

        .stat-value {
          font-size: 1.875rem;
          font-weight: bold;
          color: white;
        }

        .stat-badge {
          font-size: 0.75rem;
          font-weight: 600;
          color: #4ade80;
          margin-left: 0.5rem;
        }

        .stat-badge.growth {
          color: #4ade80;
        }

        .dashboard-content {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }

        @media (max-width: 1024px) {
          .dashboard-content {
            grid-template-columns: 1fr;
          }
        }

        .subscriptions-panel,
        .payments-panel {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          overflow: hidden;
        }

        .panel-header {
          padding: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .panel-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: white;
        }

        .loading-state,
        .empty-state {
          padding: 3rem;
          text-align: center;
          color: #9ca3af;
        }

        .spinner {
          display: inline-block;
          width: 3rem;
          height: 3rem;
          border: 2px solid rgba(139, 92, 246, 0.3);
          border-top-color: #a78bfa;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .subscriptions-list,
        .payments-list {
          divide-y: 1px solid rgba(255, 255, 255, 0.1);
        }

        .subscription-item {
          padding: 1.5rem;
          transition: background-color 0.2s;
        }

        .subscription-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .subscription-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .subscription-id-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .subscription-id-row h3 {
          font-weight: 600;
          color: white;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 9999px;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .status-badge.active {
          background: rgba(34, 197, 94, 0.2);
          color: #4ade80;
        }

        .status-badge.inactive {
          background: rgba(156, 163, 175, 0.2);
          color: #9ca3af;
        }

        .subscriber-address {
          font-family: monospace;
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .subscription-amount {
          text-align: right;
        }

        .subscription-amount .amount {
          font-size: 1.5rem;
          font-weight: bold;
          color: white;
        }

        .subscription-amount .period {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .subscription-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          font-size: 0.875rem;
        }

        .detail-label {
          color: #9ca3af;
          margin-bottom: 0.25rem;
        }

        .detail-value {
          color: white;
        }

        .payment-item {
          padding: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .payment-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .payment-row:last-child {
          margin-bottom: 0;
        }

        .payment-subscriber {
          font-family: monospace;
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .payment-amount {
          color: white;
          font-weight: 600;
        }

        .payment-date {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .payment-status {
          font-size: 0.75rem;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .payment-status.success {
          color: #4ade80;
        }

        .panel-footer {
          padding: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .view-all-btn {
          width: 100%;
          font-size: 0.875rem;
          color: #a78bfa;
          transition: color 0.2s;
        }

        .view-all-btn:hover {
          color: #c4b5fd;
        }
      `}</style>
    </div>
  )
}
