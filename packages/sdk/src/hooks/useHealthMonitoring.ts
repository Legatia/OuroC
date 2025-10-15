import { useState, useEffect, useCallback, useRef } from 'react'
import { OuroCClient, CanisterHealth } from '../core/OuroCClient'
import { SubscriptionId } from '../core/types'

export interface HealthMonitoringOptions {
  intervalMs?: number // Default: 86400000 (24 hours) for merchant mode
  autoStart?: boolean
  onHealthChange?: (health: CanisterHealth) => void
  onOverdueSubscriptions?: (subscriptionIds: SubscriptionId[]) => void
  role?: 'merchant' | 'admin' // Default: 'merchant'
}

export interface UseHealthMonitoringReturn {
  health: CanisterHealth | null
  isMonitoring: boolean
  isLoading: boolean
  error: Error | null
  startMonitoring: () => void
  stopMonitoring: () => void
  checkHealthNow: () => Promise<void>
  processManualPayment: (subscriptionId: SubscriptionId, walletAdapter: any) => Promise<string>
  overdueSubscriptions: SubscriptionId[]
  clearOverdueSubscriptions: () => void
  getOverdueSubscriptions: () => Promise<SubscriptionId[]>
}

export function useHealthMonitoring(
  client: OuroCClient | null,
  options: HealthMonitoringOptions = {}
): UseHealthMonitoringReturn {
  const [health, setHealth] = useState<CanisterHealth | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [overdueSubscriptions, setOverdueSubscriptions] = useState<SubscriptionId[]>([])

  const clientRef = useRef(client)
  const optionsRef = useRef(options)

  // Update refs when dependencies change
  useEffect(() => {
    clientRef.current = client
    optionsRef.current = options
  }, [client, options])

  const handleHealthChange = useCallback((newHealth: CanisterHealth) => {
    setHealth(newHealth)
    setError(null)
    optionsRef.current.onHealthChange?.(newHealth)
  }, [])

  const handleOverdueSubscriptions = useCallback((subscriptionIds: SubscriptionId[]) => {
    setOverdueSubscriptions(prev => {
      // Merge with existing, avoiding duplicates
      const existing = new Set(prev)
      const newIds = subscriptionIds.filter(id => !existing.has(id))
      const updated = [...prev, ...newIds]

      if (updated.length > prev.length) {
        optionsRef.current.onOverdueSubscriptions?.(updated)
      }

      return updated
    })
  }, [])

  const startMonitoring = useCallback(() => {
    if (!clientRef.current) {
      setError(new Error('OuroC client not initialized'))
      return
    }

    if (isMonitoring) {
      return // Already monitoring
    }

    setIsMonitoring(true)
    setError(null)

    // Default to 24-hour interval for merchant role, 30 seconds for admin
    const role = optionsRef.current.role || 'merchant'
    const defaultInterval = role === 'admin' ? 30000 : 86400000 // 30s for admin, 24h for merchant
    const interval = optionsRef.current.intervalMs ?? defaultInterval

    clientRef.current.startHealthMonitoring({
      intervalMs: interval,
      onHealthChange: handleHealthChange,
      onOverdueSubscriptions: handleOverdueSubscriptions
    })
  }, [isMonitoring, handleHealthChange, handleOverdueSubscriptions])

  const stopMonitoring = useCallback(() => {
    if (!clientRef.current) return

    setIsMonitoring(false)
    clientRef.current.stopHealthMonitoring()
  }, [])

  const checkHealthNow = useCallback(async () => {
    if (!clientRef.current) {
      setError(new Error('OuroC client not initialized'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const currentHealth = await clientRef.current.getCanisterHealth()
      handleHealthChange(currentHealth)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error checking health')
      setError(error)
      console.error('Error checking canister health:', error)
    } finally {
      setIsLoading(false)
    }
  }, [handleHealthChange])

  const processManualPayment = useCallback(async (subscriptionId: SubscriptionId, walletAdapter: any): Promise<string> => {
    if (!clientRef.current) {
      throw new Error('OuroC client not initialized')
    }

    try {
      const result = await clientRef.current.processManualPayment(subscriptionId, walletAdapter)

      // Remove from overdue subscriptions list
      setOverdueSubscriptions(prev => prev.filter(id => id !== subscriptionId))

      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error processing manual payment')
      setError(error)
      throw error
    }
  }, [])

  const getOverdueSubscriptions = useCallback(async (): Promise<SubscriptionId[]> => {
    if (!clientRef.current) {
      throw new Error('OuroC client not initialized')
    }

    try {
      const overdue = await clientRef.current.getOverdueSubscriptions()
      setOverdueSubscriptions(overdue)
      return overdue
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error getting overdue subscriptions')
      setError(error)
      throw error
    }
  }, [])

  const clearOverdueSubscriptions = useCallback(() => {
    setOverdueSubscriptions([])
  }, [])

  // Auto-start monitoring if requested
  useEffect(() => {
    if (options.autoStart && client && !isMonitoring) {
      startMonitoring()
    }
  }, [options.autoStart, client, isMonitoring, startMonitoring])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current?.isHealthMonitoringActive()) {
        clientRef.current.stopHealthMonitoring()
      }
    }
  }, [])

  return {
    health,
    isMonitoring,
    isLoading,
    error,
    startMonitoring,
    stopMonitoring,
    checkHealthNow,
    processManualPayment,
    overdueSubscriptions,
    clearOverdueSubscriptions,
    getOverdueSubscriptions
  }
}