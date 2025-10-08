import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { OuroCClient } from '../core/OuroCClient'
import { OuroCConfig, OuroCTheme, OuroCError } from '../core/types'

// Default theme
const defaultTheme: OuroCTheme = {
  colors: {
    primary: '#9945FF',
    secondary: '#00D18C',
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#212529',
    textSecondary: '#6c757d',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545'
  },
  fonts: {
    primary: 'Inter, sans-serif',
    monospace: 'JetBrains Mono, monospace'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem'
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    md: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
    lg: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)'
  }
}

interface OuroCContextValue {
  client: OuroCClient
  isConnected: boolean
  publicKey: PublicKey | null
  connect: () => Promise<void>
  disconnect: () => void
  canisterId: string
  network: string
  theme: OuroCTheme
  config: OuroCConfig
  error: string | null
}

const OuroCContext = createContext<OuroCContextValue | null>(null)

interface OuroCProviderProps {
  children: ReactNode
  canisterId: string
  network?: 'mainnet' | 'testnet' | 'devnet' | 'local'
  icpHost?: string
  theme?: Partial<OuroCTheme>
  onError?: (error: Error, context: string) => void
  onSubscriptionCreate?: (subscription: any) => void
  onPaymentSuccess?: (paymentHash: string) => void
  onBalanceLow?: (balance: bigint) => void
}

export function OuroCProvider({
  children,
  canisterId,
  network = 'mainnet',
  icpHost,
  theme: themeOverride,
  onError,
  onSubscriptionCreate,
  onPaymentSuccess,
  onBalanceLow
}: OuroCProviderProps) {
  const wallet = useWallet()
  const [client] = useState(() => new OuroCClient(canisterId, network, icpHost))
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Merge default theme with overrides
  const theme: OuroCTheme = {
    colors: { ...defaultTheme.colors, ...themeOverride?.colors },
    fonts: { ...defaultTheme.fonts, ...themeOverride?.fonts },
    spacing: { ...defaultTheme.spacing, ...themeOverride?.spacing },
    borderRadius: { ...defaultTheme.borderRadius, ...themeOverride?.borderRadius },
    shadows: { ...defaultTheme.shadows, ...themeOverride?.shadows }
  }

  const config: OuroCConfig = {
    canisterId,
    network,
    icpHost,
    theme,
    onError,
    onSubscriptionCreate,
    onPaymentSuccess,
    onBalanceLow
  }

  // Handle wallet connection changes
  useEffect(() => {
    setIsConnected(wallet.connected && wallet.publicKey !== null)
  }, [wallet.connected, wallet.publicKey])

  // Error handler
  const handleError = (error: Error, context: string) => {
    const message = error instanceof OuroCError ? error.message : 'An unexpected error occurred'
    setError(message)

    if (onError) {
      onError(error, context)
    } else {
      console.error(`OuroC Error (${context}):`, error)
    }

    // Auto-clear error after 5 seconds
    setTimeout(() => setError(null), 5000)
  }

  const connect = async () => {
    try {
      if (!wallet.connect) {
        throw new OuroCError('No wallet adapter available', 'NO_WALLET')
      }

      await wallet.connect()
    } catch (error) {
      handleError(
        error instanceof Error ? error : new Error('Failed to connect wallet'),
        'WALLET_CONNECTION'
      )
    }
  }

  const disconnect = () => {
    try {
      if (wallet.disconnect) {
        wallet.disconnect()
      }
    } catch (error) {
      handleError(
        error instanceof Error ? error : new Error('Failed to disconnect wallet'),
        'WALLET_DISCONNECTION'
      )
    }
  }

  const contextValue: OuroCContextValue = {
    client,
    isConnected,
    publicKey: wallet.publicKey,
    connect,
    disconnect,
    canisterId,
    network,
    theme,
    config,
    error
  }

  return (
    <OuroCContext.Provider value={contextValue}>
      <div
        style={{
          '--OuroC-primary': theme.colors.primary,
          '--OuroC-secondary': theme.colors.secondary,
          '--OuroC-background': theme.colors.background,
          '--OuroC-surface': theme.colors.surface,
          '--OuroC-text': theme.colors.text,
          '--OuroC-text-secondary': theme.colors.textSecondary,
          '--OuroC-success': theme.colors.success,
          '--OuroC-warning': theme.colors.warning,
          '--OuroC-error': theme.colors.error,
          '--OuroC-font-primary': theme.fonts.primary,
          '--OuroC-font-monospace': theme.fonts.monospace,
          '--OuroC-spacing-xs': theme.spacing.xs,
          '--OuroC-spacing-sm': theme.spacing.sm,
          '--OuroC-spacing-md': theme.spacing.md,
          '--OuroC-spacing-lg': theme.spacing.lg,
          '--OuroC-spacing-xl': theme.spacing.xl,
          '--OuroC-border-radius-sm': theme.borderRadius.sm,
          '--OuroC-border-radius-md': theme.borderRadius.md,
          '--OuroC-border-radius-lg': theme.borderRadius.lg,
          '--OuroC-shadow-sm': theme.shadows.sm,
          '--OuroC-shadow-md': theme.shadows.md,
          '--OuroC-shadow-lg': theme.shadows.lg
        } as React.CSSProperties}
      >
        {children}
      </div>
    </OuroCContext.Provider>
  )
}

export function useOuroC(): OuroCContextValue {
  const context = useContext(OuroCContext)
  if (!context) {
    throw new OuroCError(
      'useOuroC must be used within a OuroCProvider',
      'CONTEXT_ERROR'
    )
  }
  return context
}

// Theme hook for accessing current theme
export function useOuroCTheme(): OuroCTheme {
  const { theme } = useOuroC()
  return theme
}

// Error hook for displaying errors
export function useOuroCError(): {
  error: string | null
  clearError: () => void
} {
  const context = useContext(OuroCContext)
  if (!context) {
    throw new OuroCError(
      'useOuroCError must be used within a OuroCProvider',
      'CONTEXT_ERROR'
    )
  }

  return {
    error: context.error,
    clearError: () => {
      // TODO: Implement error clearing in provider state
      console.warn('clearError is not yet implemented')
    }
  }
}