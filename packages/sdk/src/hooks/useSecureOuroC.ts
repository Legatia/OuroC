import { useState, useEffect, useCallback, useRef } from 'react'
import { SecureOuroCClient, SecurityConfig, AuthState } from '../core/SecureOuroCClient'
import { OuroCError } from '../core/types'

export interface UseSecureOuroCOptions {
  canisterId: string
  network?: 'mainnet' | 'testnet' | 'devnet' | 'local'
  icpHost?: string
  securityConfig?: Partial<SecurityConfig>
  autoConnect?: boolean
  onAuthChange?: (authState: AuthState) => void
  onError?: (error: OuroCError) => void
}

export interface UseSecureOuroCReturn {
  // Client instance (secure)
  client: SecureOuroCClient | null

  // Authentication state
  authState: AuthState
  isAuthenticated: boolean
  isConnecting: boolean

  // Authentication methods
  authenticate: (walletAdapter: any) => Promise<void>
  logout: () => Promise<void>

  // Security info
  securityConfig: SecurityConfig | null
  rateLimitRemaining: number

  // Error handling
  error: OuroCError | null
  clearError: () => void
}

/**
 * Secure React hook for OuroC integration
 * Enforces security policies and manages authentication state
 */
export function useSecureOuroC(options: UseSecureOuroCOptions): UseSecureOuroCReturn {
  const [client, setClient] = useState<SecureOuroCClient | null>(null)
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    permissions: [],
    rateLimitRemaining: 60
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<OuroCError | null>(null)
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig | null>(null)

  const optionsRef = useRef(options)
  optionsRef.current = options

  // Initialize secure client
  useEffect(() => {
    try {
      const secureClient = new SecureOuroCClient(
        options.canisterId,
        options.network,
        options.icpHost,
        undefined, // solanaConfig - can be added later if needed
        options.securityConfig
      )

      setClient(secureClient)
      setSecurityConfig(secureClient.getSecurityConfig())
      setAuthState(secureClient.getAuthState())

    } catch (err) {
      const error = err instanceof OuroCError ? err : new OuroCError(
        'Failed to initialize secure client',
        'CLIENT_INIT_ERROR',
        err
      )
      setError(error)
      optionsRef.current.onError?.(error)
    }
  }, [options.canisterId, options.network, options.icpHost])

  // Authentication function
  const authenticate = useCallback(async (walletAdapter: any) => {
    if (!client) {
      throw new OuroCError('Client not initialized', 'CLIENT_NOT_INITIALIZED')
    }

    setIsConnecting(true)
    setError(null)

    try {
      await client.authenticate(walletAdapter)
      const newAuthState = client.getAuthState()
      setAuthState(newAuthState)
      optionsRef.current.onAuthChange?.(newAuthState)

    } catch (err) {
      const error = err instanceof OuroCError ? err : new OuroCError(
        'Authentication failed',
        'AUTH_ERROR',
        err
      )
      setError(error)
      optionsRef.current.onError?.(error)
      throw error
    } finally {
      setIsConnecting(false)
    }
  }, [client])

  // Logout function
  const logout = useCallback(async () => {
    if (!client) return

    try {
      await client.logout()
      const newAuthState = client.getAuthState()
      setAuthState(newAuthState)
      optionsRef.current.onAuthChange?.(newAuthState)

    } catch (err) {
      const error = err instanceof OuroCError ? err : new OuroCError(
        'Logout failed',
        'LOGOUT_ERROR',
        err
      )
      setError(error)
      optionsRef.current.onError?.(error)
    }
  }, [client])

  // Clear error function
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Auto-connect if requested
  useEffect(() => {
    if (options.autoConnect && client && !authState.isAuthenticated && !isConnecting) {
      // Auto-connect would require a wallet adapter, so we skip this for now
      // In a real implementation, this would check for previously connected wallets
    }
  }, [options.autoConnect, client, authState.isAuthenticated, isConnecting])

  // Session expiry monitoring
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.expiresAt) return

    const checkExpiry = () => {
      if (Date.now() > (authState.expiresAt || 0)) {
        // Session expired, update state
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: false
        }))
        optionsRef.current.onAuthChange?.({
          ...authState,
          isAuthenticated: false
        })
      }
    }

    const interval = setInterval(checkExpiry, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [authState.isAuthenticated, authState.expiresAt])

  return {
    client,
    authState,
    isAuthenticated: authState.isAuthenticated,
    isConnecting,
    authenticate,
    logout,
    securityConfig,
    rateLimitRemaining: authState.rateLimitRemaining,
    error,
    clearError
  }
}