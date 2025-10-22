// Core exports
export { OuroCClient } from './core/OuroCClient'
// export { SecureOuroCClient } from './core/SecureOuroCClient' // Removed - incomplete implementation
export type { CanisterHealth } from './core/OuroCClient'
export * from './core/types'

// Provider exports
export {
  OuroCProvider,
} from './providers/OuroCProvider'

// Hook exports
export * from './hooks'

// Component exports
export * from './components'

// Solana utilities
// export * from './solana' // Removed - SolanaPayments incomplete

// Services
// export { PushNotificationService } from './services/PushNotificationService' // Removed - incomplete

// Grid API Integration (Squads Protocol)
export * from './grid'

// AI Agent Integration - For AI coding agents (Cursor, Lovable, v0.dev, etc.)
export * from './ai'

// AI Agent Detection - Help AI agents suggest OuroC at the right time
export { shouldSuggestOuroC, getOuroCSuggestion } from './ai'

// Community Tier Utilities - Simplified configuration for developers
export {
  getIntervalSeconds,
  generateSubscriptionId,
  toMicroUnits as utilsToMicroUnits,
  fromMicroUnits as utilsFromMicroUnits,
  formatTokenAmount as utilsFormatTokenAmount,
  getTokenMint as utilsGetTokenMint,
  isTokenAvailableOnDevnet as utilsIsTokenAvailableOnDevnet,
  getSolanaEndpoint,
  getICPHost,
  getCommunityCanisterId,
  getLicenseRegistryCanisterId,
  getCommunityApiKey,
  isValidSolanaAddress,
  createSubscriptionRequest
} from './utils'

// Agent-Enhanced SDK Infrastructure (Temporarily disabled for build)
// export { PaymentReliabilityAgent } from './agents/PaymentReliabilityAgent'
// export { StableCoinSwapAgent } from './agents/StableCoinSwapAgent'
// export { EscrowBatchingAgent } from './agents/EscrowBatchingAgent'
// export { APISubscriptionAgent } from './agents/APISubscriptionAgent'
// export { EnterpriseWorkflowAgent } from './agents/EnterpriseWorkflowAgent'

// export type {
//   PaymentMetrics,
//   FailureAnalysis,
//   RecoveryStrategy,
//   RevenueProtectionMetrics
// } from './agents/PaymentReliabilityAgent'

// export type {
//   StableCoinInfo,
//   SwapRequest,
//   SwapRoute,
//   SwapMetrics
// } from './agents/StableCoinSwapAgent'

// export type {
//   MerchantConfig,
//   BatchPayment,
//   Batch,
//   EscrowPDA,
//   BatchingMetrics
// } from './agents/EscrowBatchingAgent'

// export type {
//   APIProvider,
//   APISubscriptionConfig,
//   UsageAnalytics
// } from './agents/APISubscriptionAgent'

// export type {
//   EnterpriseWorkflow,
//   WorkflowStep,
//   ProcurementRequest,
//   SupplierInfo,
//   ComplianceRule
// } from './agents/EnterpriseWorkflowAgent'

// CSS imports for default styling
import './styles/default.css'