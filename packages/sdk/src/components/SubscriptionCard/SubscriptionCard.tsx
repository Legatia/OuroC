import React, { useState } from 'react'
import { useOuroC } from '../../providers/OuroCProvider'
import { useSubscription } from '../../hooks/useSubscription'
import { SubscriptionCardProps, SubscriptionPlan } from '../../core/types'
import './SubscriptionCard.css'

export function SubscriptionCard({
  planName,
  price,
  interval,
  features,
  popular = false,
  customInterval,
  className = '',
  onSubscribe
}: SubscriptionCardProps) {
  const { isConnected, connect, theme } = useOuroC()
  const { loading } = useSubscription()
  const [isSubscribing, setIsSubscribing] = useState(false)

  // Calculate interval in seconds
  const getIntervalSeconds = (interval: string, customInterval?: number): number => {
    if (customInterval) return customInterval

    switch (interval) {
      case 'daily': return 24 * 60 * 60
      case 'weekly': return 7 * 24 * 60 * 60
      case 'monthly': return 30 * 24 * 60 * 60
      case 'yearly': return 365 * 24 * 60 * 60
      default: return 30 * 24 * 60 * 60
    }
  }

  const handleSubscribe = async () => {
    if (!isConnected) {
      await connect()
      return
    }

    const plan: SubscriptionPlan = {
      id: planName.toLowerCase().replace(/\s+/g, '-'),
      name: planName,
      price,
      interval,
      intervalSeconds: getIntervalSeconds(interval, customInterval),
      features
    }

    setIsSubscribing(true)
    try {
      await onSubscribe(plan)
    } catch (error) {
      console.error('Failed to handle subscription:', error)
    } finally {
      setIsSubscribing(false)
    }
  }

  const formatPrice = (price: number): string => {
    return price.toFixed(4) // Show 4 decimal places for SOL
  }

  const formatInterval = (interval: string): string => {
    switch (interval) {
      case 'daily': return 'day'
      case 'weekly': return 'week'
      case 'monthly': return 'month'
      case 'yearly': return 'year'
      default: return interval
    }
  }

  return (
    <div
      className={`OuroC-subscription-card ${popular ? 'popular' : ''} ${className}`}
      style={{
        backgroundColor: theme.colors.surface,
        border: popular
          ? `2px solid ${theme.colors.primary}`
          : `1px solid ${theme.colors.background}`,
        borderRadius: theme.borderRadius.lg,
        boxShadow: popular ? theme.shadows.md : theme.shadows.sm,
        color: theme.colors.text,
        fontFamily: theme.fonts.primary
      }}
    >
      {popular && (
        <div
          className="popular-badge"
          style={{
            backgroundColor: theme.colors.primary,
            color: 'white',
            borderRadius: theme.borderRadius.sm
          }}
        >
          Most Popular
        </div>
      )}

      <div className="card-header">
        <h3
          className="plan-name"
          style={{ color: theme.colors.text }}
        >
          {planName}
        </h3>

        <div className="price-section">
          <span
            className="price"
            style={{
              color: theme.colors.primary,
              fontFamily: theme.fonts.monospace
            }}
          >
            {formatPrice(price)} SOL
          </span>
          <span
            className="interval"
            style={{ color: theme.colors.textSecondary }}
          >
            / {formatInterval(interval)}
          </span>
        </div>
      </div>

      <ul
        className="features-list"
        style={{ color: theme.colors.text }}
      >
        {features.map((feature, index) => (
          <li key={index} className="feature-item">
            <span
              className="checkmark"
              style={{ color: theme.colors.success }}
            >
              ✓
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <button
        className={`subscribe-button ${isConnected ? 'connected' : 'not-connected'}`}
        onClick={handleSubscribe}
        disabled={loading || isSubscribing}
        style={{
          backgroundColor: isConnected ? theme.colors.primary : theme.colors.secondary,
          color: 'white',
          border: 'none',
          borderRadius: theme.borderRadius.md,
          fontFamily: theme.fonts.primary,
          cursor: (loading || isSubscribing) ? 'not-allowed' : 'pointer',
          opacity: (loading || isSubscribing) ? 0.6 : 1
        }}
      >
        {loading || isSubscribing ? (
          <span className="loading-spinner">⟳ Processing...</span>
        ) : isConnected ? (
          `Subscribe for ${formatPrice(price)} SOL`
        ) : (
          'Connect Wallet to Subscribe'
        )}
      </button>

      {isConnected && (
        <div
          className="payment-info"
          style={{
            color: theme.colors.textSecondary,
            fontSize: '0.875rem'
          }}
        >
          <div>🔒 Powered by OuroC</div>
          <div>💰 Automatic SOL payments</div>
          <div>⏰ Cancel anytime</div>
        </div>
      )}
    </div>
  )
}

// Higher-order component for easy subscription creation
export function createSubscriptionCard(
  defaultReceiverAddress: string,
  defaultMetadata?: string
) {
  return function ConfiguredSubscriptionCard(props: Omit<SubscriptionCardProps, 'onSubscribe'>) {
    const { create } = useSubscription()
    const { client, config } = useOuroC()

    const handleSubscribe = async (plan: SubscriptionPlan) => {
      try {
        const subscriptionId = await create({
          solana_payer: '', // Will be filled by the hook
          solana_receiver: defaultReceiverAddress,
          payment_amount: client.SOLToLamports(plan.price),
          interval_seconds: BigInt(plan.intervalSeconds),
          metadata: defaultMetadata || `${plan.name} subscription`
        })

        console.log('Subscription created:', subscriptionId)

        // Trigger success callback if provided
        if (config.onSubscriptionCreate) {
          // Note: The hook will handle this callback
        }
      } catch (error) {
        console.error('Failed to create subscription:', error)
        throw error
      }
    }

    return <SubscriptionCard {...props} onSubscribe={handleSubscribe} />
  }
}