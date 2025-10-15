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
    <div className={`merchant-dashboard ${className}`} style={{
      backgroundColor: 'transparent',
      color: 'white',
      padding: '24px'
    }}>
      {/* Stats Cards */}
      <div className="stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div className="stat-card" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div className="stat-icon subscribers" style={{
            backgroundColor: 'rgba(139, 92, 246, 0.2)',
            borderRadius: '12px',
            padding: '12px',
            color: '#a78bfa'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label" style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '4px' }}>Total Subscribers</p>
            <p className="stat-value" style={{ color: 'white', fontSize: '32px', fontWeight: 'bold', margin: 0 }}>{stats.total}</p>
          </div>
        </div>

        <div className="stat-card" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div className="stat-icon active" style={{
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            borderRadius: '12px',
            padding: '12px',
            color: '#4ade80'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label" style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '4px' }}>Active</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <p className="stat-value" style={{ color: 'white', fontSize: '32px', fontWeight: 'bold', margin: 0 }}>{stats.active}</p>
              <span className="stat-badge" style={{ color: '#4ade80', fontSize: '12px', fontWeight: '600' }}>100%</span>
            </div>
          </div>
        </div>

        <div className="stat-card" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div className="stat-icon revenue" style={{
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderRadius: '12px',
            padding: '12px',
            color: '#60a5fa'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label" style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '4px' }}>Monthly Revenue</p>
            <p className="stat-value" style={{ color: 'white', fontSize: '32px', fontWeight: 'bold', margin: 0 }}>${(stats.totalRevenue / 1e6).toFixed(2)}</p>
          </div>
        </div>

        <div className="stat-card" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div className="stat-icon growth" style={{
            backgroundColor: 'rgba(236, 72, 153, 0.2)',
            borderRadius: '12px',
            padding: '12px',
            color: '#f472b6'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label" style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '4px' }}>Growth</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <p className="stat-value" style={{ color: 'white', fontSize: '32px', fontWeight: 'bold', margin: 0 }}>${((stats.totalRevenue / 1e6) * 0.12).toFixed(2)}</p>
              <span className="stat-badge growth" style={{ color: '#4ade80', fontSize: '12px', fontWeight: '600' }}>+12%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="dashboard-content" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px'
      }}>
        {/* Subscriptions List */}
        <div className="subscriptions-panel" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px'
        }}>
          <div className="panel-header" style={{ marginBottom: '20px' }}>
            <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '600', margin: 0 }}>Active Subscriptions</h2>
          </div>

          {isLoading ? (
            <div className="loading-state" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              color: '#9ca3af'
            }}>
              <div className="spinner" style={{
                width: '32px',
                height: '32px',
                border: '3px solid rgba(255, 255, 255, 0.1)',
                borderTopColor: '#a78bfa',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '16px'
              }} />
              <p style={{ margin: 0 }}>Loading subscriptions...</p>
            </div>
          ) : localSubscriptions.length === 0 ? (
            <div className="empty-state" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              color: '#6b7280'
            }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5, marginBottom: '16px' }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p style={{ margin: 0 }}>No subscriptions found</p>
            </div>
          ) : (
            <div className="subscriptions-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {localSubscriptions.map((subscription) => {
                const merchantAmount = subscription.amount * (1 - subscription.icpFeePercentage / 10000)
                const isActive = subscription.status === 0

                return (
                  <div key={subscription.id} className="subscription-item" style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '16px'
                  }}>
                    <div className="subscription-header" style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <div className="subscription-id-row" style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '6px'
                        }}>
                          <h3 style={{
                            color: 'white',
                            fontSize: '16px',
                            fontWeight: '600',
                            margin: 0
                          }}>{subscription.id.substring(0, 12)}...</h3>
                          <span className={`status-badge ${isActive ? 'active' : 'inactive'}`} style={{
                            backgroundColor: isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                            color: isActive ? '#4ade80' : '#9ca3af',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="subscriber-address" style={{
                          color: '#9ca3af',
                          fontSize: '13px',
                          margin: 0,
                          fontFamily: 'monospace'
                        }}>
                          {subscription.subscriber.toString().substring(0, 20)}...
                        </p>
                      </div>
                      <div className="subscription-amount" style={{ textAlign: 'right' }}>
                        <p className="amount" style={{
                          color: 'white',
                          fontSize: '18px',
                          fontWeight: '600',
                          margin: 0,
                          marginBottom: '2px'
                        }}>${(merchantAmount / 1e6).toFixed(2)}</p>
                        <p className="period" style={{
                          color: '#9ca3af',
                          fontSize: '12px',
                          margin: 0
                        }}>USDC/month</p>
                      </div>
                    </div>

                    <div className="subscription-details" style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '16px',
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <div>
                        <p className="detail-label" style={{
                          color: '#6b7280',
                          fontSize: '12px',
                          margin: 0,
                          marginBottom: '4px'
                        }}>Last Payment</p>
                        <p className="detail-value" style={{
                          color: '#d1d5db',
                          fontSize: '14px',
                          margin: 0
                        }}>{formatDate(subscription.lastPayment)}</p>
                      </div>
                      <div>
                        <p className="detail-label" style={{
                          color: '#6b7280',
                          fontSize: '12px',
                          margin: 0,
                          marginBottom: '4px'
                        }}>Next Payment</p>
                        <p className="detail-value" style={{
                          color: '#d1d5db',
                          fontSize: '14px',
                          margin: 0
                        }}>{formatDate(subscription.nextPayment)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="payments-panel" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px'
        }}>
          <div className="panel-header" style={{ marginBottom: '20px' }}>
            <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '600', margin: 0 }}>Recent Payments</h2>
          </div>

          <div className="payments-list" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {payments.map((payment) => (
              <div key={payment.id} className="payment-item" style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <div className="payment-row" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <span className="payment-subscriber" style={{
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    fontFamily: 'monospace'
                  }}>{payment.subscriber}</span>
                  <span className="payment-amount" style={{
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}>${payment.amount}</span>
                </div>
                <div className="payment-row" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span className="payment-date" style={{
                    color: '#9ca3af',
                    fontSize: '13px'
                  }}>{formatDate(payment.date)}</span>
                  <span className={`payment-status ${payment.status}`} style={{
                    color: payment.status === 'success' ? '#4ade80' :
                           payment.status === 'failed' ? '#f87171' : '#fbbf24',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}>
                    {payment.status === 'success' && '✓ Success'}
                    {payment.status === 'failed' && '✗ Failed'}
                    {payment.status === 'pending' && '⏳ Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="panel-footer" style={{
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <button className="view-all-btn" style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '8px',
              color: '#a78bfa',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>View all transactions →</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MerchantDashboard
