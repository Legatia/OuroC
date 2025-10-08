import { useState, useEffect, useCallback } from 'react'
import { useOuroC } from '../providers/OuroCProvider'
import {
  Subscription,
  CreateSubscriptionRequest,
  SubscriptionId,
  UseSubscriptionReturn,
  OuroCError
} from '../core/types'

export function useSubscription(): UseSubscriptionReturn {
  const { client, isConnected, publicKey, config } = useOuroC()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Handle errors consistently
  const handleError = (error: unknown, context: string) => {
    let message: string

    if (error instanceof OuroCError) {
      message = error.message
    } else if (error instanceof Error) {
      message = error.message
    } else {
      message = 'An unexpected error occurred'
    }

    setError(message)

    if (config.onError) {
      const errorObj = error instanceof Error ? error : new Error(message)
      config.onError(errorObj, context)
    }
  }

  // Fetch subscriptions for connected wallet
  const refresh = useCallback(async () => {
    if (!isConnected || !publicKey) {
      setSubscriptions([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const userSubscriptions = await client.listSubscriptions(publicKey.toBase58())
      setSubscriptions(userSubscriptions)
    } catch (error) {
      handleError(error, 'FETCH_SUBSCRIPTIONS')
    } finally {
      setLoading(false)
    }
  }, [client, isConnected, publicKey, config])

  // Auto-refresh when wallet connects
  useEffect(() => {
    refresh()
  }, [refresh])

  // Create new subscription
  const create = useCallback(async (request: CreateSubscriptionRequest): Promise<SubscriptionId> => {
    if (!isConnected || !publicKey) {
      throw new OuroCError('Wallet not connected', 'WALLET_NOT_CONNECTED')
    }

    setLoading(true)
    setError(null)

    try {
      // Ensure payer is the connected wallet
      const subscriptionRequest: CreateSubscriptionRequest = {
        ...request,
        solana_payer: publicKey.toBase58()
      }

      const subscriptionId = await client.createSubscription(subscriptionRequest)

      // Trigger callback if provided
      if (config.onSubscriptionCreate) {
        // We'll need to fetch the created subscription for the callback
        try {
          const newSubscription = await client.getSubscription(subscriptionId)
          config.onSubscriptionCreate(newSubscription)
        } catch (error) {
          // Don't fail the whole operation if callback fails
          console.warn('Failed to trigger onSubscriptionCreate callback:', error)
        }
      }

      // Refresh the list to include the new subscription
      await refresh()

      return subscriptionId
    } catch (error) {
      handleError(error, 'CREATE_SUBSCRIPTION')
      throw error
    } finally {
      setLoading(false)
    }
  }, [client, isConnected, publicKey, config, refresh])

  // Pause subscription
  const pause = useCallback(async (subscriptionId: SubscriptionId): Promise<void> => {
    if (!isConnected) {
      throw new OuroCError('Wallet not connected', 'WALLET_NOT_CONNECTED')
    }

    setLoading(true)
    setError(null)

    try {
      await client.pauseSubscription(subscriptionId)
      await refresh() // Refresh to update status
    } catch (error) {
      handleError(error, 'PAUSE_SUBSCRIPTION')
      throw error
    } finally {
      setLoading(false)
    }
  }, [client, isConnected, refresh])

  // Resume subscription
  const resume = useCallback(async (subscriptionId: SubscriptionId): Promise<void> => {
    if (!isConnected) {
      throw new OuroCError('Wallet not connected', 'WALLET_NOT_CONNECTED')
    }

    setLoading(true)
    setError(null)

    try {
      await client.resumeSubscription(subscriptionId)
      await refresh() // Refresh to update status
    } catch (error) {
      handleError(error, 'RESUME_SUBSCRIPTION')
      throw error
    } finally {
      setLoading(false)
    }
  }, [client, isConnected, refresh])

  // Cancel subscription
  const cancel = useCallback(async (subscriptionId: SubscriptionId): Promise<void> => {
    if (!isConnected) {
      throw new OuroCError('Wallet not connected', 'WALLET_NOT_CONNECTED')
    }

    setLoading(true)
    setError(null)

    try {
      await client.cancelSubscription(subscriptionId)
      await refresh() // Refresh to update status
    } catch (error) {
      handleError(error, 'CANCEL_SUBSCRIPTION')
      throw error
    } finally {
      setLoading(false)
    }
  }, [client, isConnected, refresh])

  return {
    subscriptions,
    loading,
    error,
    create,
    pause,
    resume,
    cancel,
    refresh
  }
}

// Helper hook for managing a single subscription
export function useSubscriptionById(subscriptionId: SubscriptionId | null) {
  const { client } = useOuroC()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!subscriptionId) {
      setSubscription(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const sub = await client.getSubscription(subscriptionId)
      setSubscription(sub)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch subscription')
    } finally {
      setLoading(false)
    }
  }, [client, subscriptionId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    subscription,
    loading,
    error,
    refresh
  }
}