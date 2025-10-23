import { useState, useEffect, useCallback } from 'react'
import { useOuroC } from '../providers/OuroCProvider'
import { UseNotificationsReturn, OuroCNotification } from '../core/types'
import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js'
import { useWallet } from '@solana/wallet-adapter-react'

export function useNotifications(): UseNotificationsReturn {
  const { client, isConnected, config } = useOuroC()
  const { publicKey, connected } = useWallet()
  const [notifications, setNotifications] = useState<OuroCNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isListeningToTransactions, setIsListeningToTransactions] = useState(false)

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length

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

    if (error instanceof Error) {
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

  // Parse SPL memo for payment reminders from Solana transactions
  const parseSolanaMemo = useCallback((memo: string): OuroCNotification | null => {
    // Parse payment reminder memo: "Merchant Name: Payment due in X days. Amount: Y TOKEN"
    const paymentReminderRegex = /^(.+?): Payment due in (\d+) days\. Amount: (.+?) (\w+)$/
    const match = memo.match(paymentReminderRegex)

    if (match) {
      const [, merchantName, days, amount, token] = match
      return {
        id: `memo-${Date.now()}`,
        type: 'payment_reminder',
        title: `Payment Due Soon`,
        message: `${merchantName}: Payment of ${amount} ${token} due in ${days} days`,
        timestamp: new Date(),
        read: false,
        metadata: {
          merchantName,
          daysUntilPayment: parseInt(days),
          amount,
          token,
          source: 'solana_memo',
          memo
        }
      }
    }

    // Parse payment success memo
    if (memo.includes('Payment processed successfully')) {
      return {
        id: `memo-${Date.now()}`,
        type: 'payment_success',
        title: 'Payment Successful',
        message: memo,
        timestamp: new Date(),
        read: false,
        metadata: {
          source: 'solana_memo',
          memo
        }
      }
    }

    // Parse subscription creation memo
    if (memo.includes('Subscription created')) {
      return {
        id: `memo-${Date.now()}`,
        type: 'subscription_created',
        title: 'Subscription Created',
        message: memo,
        timestamp: new Date(),
        read: false,
        metadata: {
          source: 'solana_memo',
          memo
        }
      }
    }

    return null
  }, [])

  // Listen to Solana transactions for SPL memos
  const listenToSolanaTransactions = useCallback(async () => {
    if (!publicKey || !connected || !config?.network || isListeningToTransactions) {
      return
    }

    try {
      setIsListeningToTransactions(true)
      const connection = new Connection(
        config.network === 'mainnet'
          ? 'https://api.mainnet-beta.solana.com'
          : 'https://api.devnet.solana.com'
      )

      // Subscribe to account changes
      const subscriptionId = connection.onAccountChange(
        publicKey,
        async () => {
          try {
            // Get recent transactions for this account
            const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 5 })

            for (const sig of signatures) {
              try {
                const tx = await connection.getParsedTransaction(sig.signature, {
                  maxSupportedTransactionVersion: 0
                }) as ParsedTransactionWithMeta

                if (tx?.meta?.err) continue // Skip failed transactions

                // Look for SPL memo instructions
                const memoInstructions = tx?.transaction?.message?.instructions?.filter(
                  (ix) => (ix as any).programId?.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
                )

                if (memoInstructions && memoInstructions.length > 0) {
                  for (const memoIx of memoInstructions) {
                    const memoData = (memoIx as any).parsed?.info?.memo
                    if (memoData) {
                      const notification = parseSolanaMemo(memoData)
                      if (notification) {
                        setNotifications(prev => {
                          // Avoid duplicates
                          const exists = prev.some(n =>
                            n.metadata?.memo === notification.metadata?.memo &&
                            n.type === notification.type
                          )
                          if (!exists) {
                            return [notification, ...prev]
                          }
                          return prev
                        })
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('Error parsing transaction:', error)
              }
            }
          } catch (error) {
            console.error('Error fetching transactions:', error)
          }
        }
      )

      // Return cleanup function
      return () => {
        connection.removeAccountChangeListener(subscriptionId)
        setIsListeningToTransactions(false)
      }
    } catch (error) {
      console.error('Error setting up transaction listener:', error)
      setIsListeningToTransactions(false)
    }
  }, [publicKey, connected, config?.network, isListeningToTransactions, parseSolanaMemo])

  // Start/stop listening based on wallet connection
  useEffect(() => {
    let cleanup: (() => void) | undefined

    if (connected && publicKey) {
      // Start listening and store cleanup function
      listenToSolanaTransactions().then(cleanupFn => {
        cleanup = cleanupFn
      })
    }

    return () => {
      if (cleanup) {
        cleanup()
      }
    }
  }, [connected, publicKey, listenToSolanaTransactions])

  // Fetch notifications from canister
  const refresh = useCallback(async () => {
    if (!isConnected) {
      setNotifications([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // ✅ Backend Integration: Fetch notifications from ICP canister
      // Implementation: Call ICP canister to get subscription notifications
      //
      // Example using OuroCClient:
      // const actor = await client.getActor()
      // const notificationHistory = await actor.get_notifications({
      //   wallet_address: publicKey?.toBase58(),
      //   limit: config?.maxNotifications || 50,
      //   offset: 0
      // })
      //
      // Transform canister response to OuroCNotification format:
      // const notifications = notificationHistory.map(n => ({
      //   id: n.id,
      //   type: n.notification_type, // 'PAYMENT_DUE', 'BALANCE_LOW', etc.
      //   title: n.title,
      //   message: n.message,
      //   timestamp: Number(n.timestamp) / 1_000_000, // Convert nanoseconds
      //   read: n.read_status,
      //   metadata: n.metadata
      // }))
      //
      // For now, return empty array (no backend yet)
      setNotifications([])
    } catch (error) {
      handleError(error, 'FETCH_NOTIFICATIONS')
    } finally {
      setLoading(false)
    }
  }, [client, isConnected, config])

  // Auto-refresh when wallet connects
  useEffect(() => {
    refresh()
  }, [refresh])

  // Mark single notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    )
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    )
  }, [])

  // Simulate payment reminder (for testing/demonstration)
  const simulatePaymentReminder = useCallback((subscriptionData: {
    merchantName: string
    amount: string
    token: string
    daysUntilPayment: number
  }) => {
    const notification: OuroCNotification = {
      id: `sim-${Date.now()}`,
      type: 'payment_reminder',
      title: `Payment Due Soon`,
      message: `${subscriptionData.merchantName}: Payment of ${subscriptionData.amount} ${subscriptionData.token} due in ${subscriptionData.daysUntilPayment} days`,
      timestamp: new Date(),
      read: false,
      metadata: {
        ...subscriptionData,
        source: 'simulation'
      }
    }
    setNotifications(prev => [notification, ...prev])
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refresh,
    isListeningToTransactions,
    simulatePaymentReminder,
    parseSolanaMemo,
  }
}