import React, { useState, useEffect } from 'react'
import { PublicKey } from '@solana/web3.js'

export interface SubscriptionData {
  id: string
  subscriber: PublicKey
  merchant: PublicKey
  amount: number
  intervalSeconds: number
  status: number
  icpFeePercentage: number
  lastPayment: number
  nextPayment: number
}

export interface PaymentData {
  id: string
  subscriber: string
  amount: number
  date: number
  status: 'success' | 'failed' | 'pending'
}

export interface MerchantDashboardProps {
  merchantAddress?: PublicKey
  subscriptions?: SubscriptionData[]
  payments?: PaymentData[]
  onFetchSubscriptions?: () => Promise<SubscriptionData[]>
  loading?: boolean
  className?: string
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({
  merchantAddress,
  subscriptions = [],
  payments = [],
  onFetchSubscriptions,
  loading = false,
  className = ''
}) => {
  const [localSubscriptions, setLocalSubscriptions] = useState<SubscriptionData[]>(subscriptions)
  const [isLoading, setIsLoading] = useState(loading)

  useEffect(() => {
    if (onFetchSubscriptions && merchantAddress) {
      setIsLoading(true)
      onFetchSubscriptions()
        .then(setLocalSubscriptions)
        .finally(() => setIsLoading(false))
    } else {
      setLocalSubscriptions(subscriptions)
    }
  }, [merchantAddress, onFetchSubscriptions])

  const calculateStats = () => {
    const total = localSubscriptions.length
    const active = localSubscriptions.filter(s => s.status === 0).length
    const totalRevenue = localSubscriptions.reduce((sum, sub) => {
      const merchantAmount = sub.amount * (1 - sub.icpFeePercentage / 10000)
      return sum + merchantAmount
    }, 0)

    return { total, active, totalRevenue }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const stats = calculateStats()

  return (
    <div className={`merchant-dashboard ${className}`}>
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon subscribers">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Subscribers</p>
            <p className="stat-value">{stats.total}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon active">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">Active</p>
            <p className="stat-value">{stats.active}</p>
            <span className="stat-badge">100%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon revenue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">Monthly Revenue</p>
            <p className="stat-value">${(stats.totalRevenue / 1e6).toFixed(2)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon growth">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">Growth</p>
            <p className="stat-value">${((stats.totalRevenue / 1e6) * 0.12).toFixed(2)}</p>
            <span className="stat-badge growth">+12%</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="dashboard-content">
        {/* Subscriptions List */}
        <div className="subscriptions-panel">
          <div className="panel-header">
            <h2>Active Subscriptions</h2>
          </div>

          {isLoading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading subscriptions...</p>
            </div>
          ) : localSubscriptions.length === 0 ? (
            <div className="empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p>No subscriptions found</p>
            </div>
          ) : (
            <div className="subscriptions-list">
              {localSubscriptions.map((subscription) => {
                const merchantAmount = subscription.amount * (1 - subscription.icpFeePercentage / 10000)
                const isActive = subscription.status === 0

                return (
                  <div key={subscription.id} className="subscription-item">
                    <div className="subscription-header">
                      <div>
                        <div className="subscription-id-row">
                          <h3>{subscription.id.substring(0, 12)}...</h3>
                          <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="subscriber-address">
                          {subscription.subscriber.toString().substring(0, 20)}...
                        </p>
                      </div>
                      <div className="subscription-amount">
                        <p className="amount">${(merchantAmount / 1e6).toFixed(2)}</p>
                        <p className="period">USDC/month</p>
                      </div>
                    </div>

                    <div className="subscription-details">
                      <div>
                        <p className="detail-label">Last Payment</p>
                        <p className="detail-value">{formatDate(subscription.lastPayment)}</p>
                      </div>
                      <div>
                        <p className="detail-label">Next Payment</p>
                        <p className="detail-value">{formatDate(subscription.nextPayment)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="payments-panel">
          <div className="panel-header">
            <h2>Recent Payments</h2>
          </div>

          <div className="payments-list">
            {payments.map((payment) => (
              <div key={payment.id} className="payment-item">
                <div className="payment-row">
                  <span className="payment-subscriber">{payment.subscriber}</span>
                  <span className="payment-amount">${payment.amount}</span>
                </div>
                <div className="payment-row">
                  <span className="payment-date">{formatDate(payment.date)}</span>
                  <span className={`payment-status ${payment.status}`}>
                    {payment.status === 'success' && '✓ Success'}
                    {payment.status === 'failed' && '✗ Failed'}
                    {payment.status === 'pending' && '⏳ Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="panel-footer">
            <button className="view-all-btn">View all transactions →</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MerchantDashboard
