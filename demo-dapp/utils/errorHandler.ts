/**
 * Error handling utilities for manual trigger operations
 */

export enum ErrorType {
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INSUFFICIENT_ALLOWANCE = 'INSUFFICIENT_ALLOWANCE',
  SUBSCRIPTION_NOT_FOUND = 'SUBSCRIPTION_NOT_FOUND',
  SUBSCRIPTION_PAUSED = 'SUBSCRIPTION_PAUSED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  INVALID_AUTHORITY = 'INVALID_AUTHORITY',
  PAYMENT_TOO_EARLY = 'PAYMENT_TOO_EARLY',
  INVALID_TOKEN_MINT = 'INVALID_TOKEN_MINT',
  RPC_ERROR = 'RPC_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  SIGNATURE_REJECTED = 'SIGNATURE_REJECTED',
  UNKNOWN = 'UNKNOWN'
}

export interface ParsedError {
  type: ErrorType
  message: string
  userMessage: string
  retryable: boolean
  suggestedAction?: string
}

/**
 * Maps Anchor error codes to error types
 */
const ANCHOR_ERROR_MAP: Record<number, ErrorType> = {
  6000: ErrorType.SUBSCRIPTION_PAUSED,
  6001: ErrorType.SUBSCRIPTION_CANCELLED,
  6002: ErrorType.INVALID_AUTHORITY,
  6003: ErrorType.PAYMENT_TOO_EARLY,
  6004: ErrorType.INVALID_TOKEN_MINT,
  6005: ErrorType.INSUFFICIENT_ALLOWANCE,
}

/**
 * Parses error from transaction or wallet operation
 */
export function parseError(error: any): ParsedError {
  const errorString = error?.toString() || error?.message || ''

  // Wallet errors
  if (errorString.includes('User rejected') || errorString.includes('User denied')) {
    return {
      type: ErrorType.SIGNATURE_REJECTED,
      message: errorString,
      userMessage: 'Transaction was rejected',
      retryable: true,
      suggestedAction: 'Please approve the transaction in your wallet'
    }
  }

  if (errorString.includes('Wallet not connected')) {
    return {
      type: ErrorType.WALLET_NOT_CONNECTED,
      message: errorString,
      userMessage: 'Wallet is not connected',
      retryable: false,
      suggestedAction: 'Please connect your wallet'
    }
  }

  // Solana errors
  if (errorString.includes('insufficient funds') || errorString.includes('InsufficientFunds')) {
    return {
      type: ErrorType.INSUFFICIENT_FUNDS,
      message: errorString,
      userMessage: 'Insufficient funds for transaction',
      retryable: false,
      suggestedAction: 'Please ensure you have enough USDC and SOL for transaction fees'
    }
  }

  if (errorString.includes('insufficient allowance') || errorString.includes('InsufficientAllowance')) {
    return {
      type: ErrorType.INSUFFICIENT_ALLOWANCE,
      message: errorString,
      userMessage: 'Token allowance is insufficient',
      retryable: false,
      suggestedAction: 'Please approve spending for the subscription contract'
    }
  }

  if (errorString.includes('Account does not exist') || errorString.includes('AccountNotFound')) {
    return {
      type: ErrorType.SUBSCRIPTION_NOT_FOUND,
      message: errorString,
      userMessage: 'Subscription not found',
      retryable: false,
      suggestedAction: 'The subscription may have been cancelled'
    }
  }

  // RPC errors
  if (errorString.includes('429') || errorString.includes('rate limit')) {
    return {
      type: ErrorType.RPC_ERROR,
      message: errorString,
      userMessage: 'Network is busy',
      retryable: true,
      suggestedAction: 'Please try again in a few moments'
    }
  }

  if (errorString.includes('timeout') || errorString.includes('timed out')) {
    return {
      type: ErrorType.RPC_ERROR,
      message: errorString,
      userMessage: 'Request timed out',
      retryable: true,
      suggestedAction: 'Check your internet connection and try again'
    }
  }

  // Anchor program errors
  const anchorErrorMatch = errorString.match(/custom program error: 0x([0-9a-f]+)/i)
  if (anchorErrorMatch) {
    const errorCode = parseInt(anchorErrorMatch[1], 16)
    const errorType = ANCHOR_ERROR_MAP[errorCode]

    if (errorType) {
      return {
        type: errorType,
        message: errorString,
        userMessage: getErrorMessage(errorType),
        retryable: errorType === ErrorType.PAYMENT_TOO_EARLY,
        suggestedAction: getSuggestedAction(errorType)
      }
    }
  }

  // Transaction simulation errors
  if (errorString.includes('Transaction simulation failed')) {
    return {
      type: ErrorType.TRANSACTION_FAILED,
      message: errorString,
      userMessage: 'Transaction would fail',
      retryable: false,
      suggestedAction: 'Check subscription status and token balances'
    }
  }

  // Generic transaction failure
  if (errorString.includes('Transaction failed') || errorString.includes('SendTransactionError')) {
    return {
      type: ErrorType.TRANSACTION_FAILED,
      message: errorString,
      userMessage: 'Transaction failed to execute',
      retryable: true,
      suggestedAction: 'Please try again or contact support if the issue persists'
    }
  }

  // Unknown error
  return {
    type: ErrorType.UNKNOWN,
    message: errorString,
    userMessage: 'An unexpected error occurred',
    retryable: true,
    suggestedAction: 'Please try again or contact support'
  }
}

/**
 * Gets user-friendly error message for error type
 */
function getErrorMessage(errorType: ErrorType): string {
  const messages: Record<ErrorType, string> = {
    [ErrorType.WALLET_NOT_CONNECTED]: 'Please connect your wallet',
    [ErrorType.INSUFFICIENT_FUNDS]: 'Insufficient funds in your account',
    [ErrorType.INSUFFICIENT_ALLOWANCE]: 'Token spending allowance is too low',
    [ErrorType.SUBSCRIPTION_NOT_FOUND]: 'Subscription not found',
    [ErrorType.SUBSCRIPTION_PAUSED]: 'This subscription is paused',
    [ErrorType.SUBSCRIPTION_CANCELLED]: 'This subscription has been cancelled',
    [ErrorType.INVALID_AUTHORITY]: 'You are not authorized to trigger this payment',
    [ErrorType.PAYMENT_TOO_EARLY]: 'Payment is not due yet',
    [ErrorType.INVALID_TOKEN_MINT]: 'Invalid token type for payment',
    [ErrorType.RPC_ERROR]: 'Network connection issue',
    [ErrorType.TRANSACTION_FAILED]: 'Transaction could not be processed',
    [ErrorType.SIGNATURE_REJECTED]: 'Transaction was rejected',
    [ErrorType.UNKNOWN]: 'An unexpected error occurred'
  }

  return messages[errorType]
}

/**
 * Gets suggested action for error type
 */
function getSuggestedAction(errorType: ErrorType): string {
  const actions: Record<ErrorType, string> = {
    [ErrorType.WALLET_NOT_CONNECTED]: 'Connect your wallet to continue',
    [ErrorType.INSUFFICIENT_FUNDS]: 'Add USDC to your wallet',
    [ErrorType.INSUFFICIENT_ALLOWANCE]: 'Approve token spending for the subscription',
    [ErrorType.SUBSCRIPTION_NOT_FOUND]: 'Verify the subscription exists',
    [ErrorType.SUBSCRIPTION_PAUSED]: 'Resume the subscription first',
    [ErrorType.SUBSCRIPTION_CANCELLED]: 'Create a new subscription',
    [ErrorType.INVALID_AUTHORITY]: 'Only the merchant or ICP canister can trigger payments',
    [ErrorType.PAYMENT_TOO_EARLY]: 'Wait for the next payment cycle',
    [ErrorType.INVALID_TOKEN_MINT]: 'Ensure you are using USDC tokens',
    [ErrorType.RPC_ERROR]: 'Try again in a few moments',
    [ErrorType.TRANSACTION_FAILED]: 'Review transaction details and try again',
    [ErrorType.SIGNATURE_REJECTED]: 'Approve the transaction in your wallet',
    [ErrorType.UNKNOWN]: 'Contact support if this persists'
  }

  return actions[errorType]
}

/**
 * Logs error with context for debugging
 */
export function logError(
  context: string,
  error: any,
  additionalInfo?: Record<string, any>
) {
  const parsed = parseError(error)

  console.error(`[${context}] Error:`, {
    type: parsed.type,
    message: parsed.message,
    userMessage: parsed.userMessage,
    retryable: parsed.retryable,
    suggestedAction: parsed.suggestedAction,
    ...additionalInfo
  })

  // In production, send to error tracking service
  // e.g., Sentry, LogRocket, etc.
}

/**
 * Formats error for display to user
 */
export function formatErrorForDisplay(error: any): string {
  const parsed = parseError(error)

  if (parsed.suggestedAction) {
    return `${parsed.userMessage}. ${parsed.suggestedAction}`
  }

  return parsed.userMessage
}
