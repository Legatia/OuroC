import { useState, useEffect, useCallback } from 'react'
import { useOuroC } from '../providers/OuroCProvider'
import { UseBalanceReturn, OuroCError } from '../core/types'

export function useBalance(): UseBalanceReturn {
  const { client, isConnected, publicKey, config } = useOuroC()
  const [balance, setBalance] = useState<bigint | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Convert balance to SOL
  const balanceSOL = balance ? client.lamportsToSOL(balance) : null

  // Check if balance is low (less than 0.01 SOL)
  const isLowBalance = balance ? balance < BigInt(10_000_000) : false

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

  // Fetch balance from Solana
  const refresh = useCallback(async () => {
    if (!isConnected || !publicKey) {
      setBalance(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const walletBalance = await client.getBalance(publicKey)
      setBalance(walletBalance)

      // Trigger low balance callback if applicable
      if (config.onBalanceLow && walletBalance < BigInt(10_000_000)) {
        config.onBalanceLow(walletBalance)
      }
    } catch (error) {
      handleError(error, 'FETCH_BALANCE')
    } finally {
      setLoading(false)
    }
  }, [client, isConnected, publicKey, config])

  // Auto-refresh when wallet connects
  useEffect(() => {
    refresh()
  }, [refresh])

  // Auto-refresh every 30 seconds when connected
  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(refresh, 30000) // 30 seconds
    return () => clearInterval(interval)
  }, [isConnected, refresh])

  return {
    balance,
    balanceSOL,
    loading,
    error,
    isLowBalance,
    refresh
  }
}

// Hook for checking balance against a specific amount
export function useBalanceCheck(requiredAmount: bigint | null) {
  const { balance, loading, error } = useBalance()

  const sufficient = balance && requiredAmount ? balance >= requiredAmount : null
  const shortfall = balance && requiredAmount && balance < requiredAmount
    ? requiredAmount - balance
    : null

  return {
    balance,
    sufficient,
    shortfall,
    loading,
    error
  }
}