// OuroC Core SDK - Framework-agnostic implementation
export { OuroC } from './core/OuroC'
export { OuroCClient } from './core/OuroCClient'

// Re-export types for convenience
export type {
  OuroCConfig,
  SubscriptionRequest,
  Subscription,
  X402PaymentRequest,
  X402PaymentResponse,
  PaymentRecord
} from './core/OuroC'

// Community Tier - Simplified types and interfaces
export type {
  CommunitySubscriptionRequest,
  CreateSubscriptionRequest,
  SubscriptionId,
  SolanaAddress,
  Timestamp,
  SupportedToken,
  AgentMetadata
} from './core/types'

// Community Tier - Hardcoded constants
export {
  COMMUNITY_NOTIFICATION_CONFIG,
  COMMUNITY_TIER_FEE,
  COMMUNITY_TIER_LIMITS,
  ICP_FEE_COLLECTION_ADDRESS,
  OUROC_CANISTER_IDS,
  SOLANA_PROGRAM_IDS,
  USDC_MINTS,
  SOLANA_RPC_ENDPOINTS,
  getCanisterId,
  getICPHost,
  getProgramId,
  getUSDCMint,
  getSolanaRPC,
  getFeeCollectionAddress,
  calculateFees
} from './core/constants'

// Community Tier - Utility functions
export {
  generateSubscriptionId,
  intervalToSeconds,
  secondsToInterval,
  toMicroUnits,
  fromMicroUnits,
  formatUSDC,
  validateInterval,
  getCommunityReminderDays,
  validateSolanaAddress,
  calculateNextPayment,
  formatTimestamp,
  daysUntilPayment
} from './core/utils'

// X.402 HTTP-Native Payments - For AI Agents & Merchants
export {
  // Payment functions
  createX402Payment,
  verifyX402Payment,
  settleX402Payment,
  // AI Agent client
  X402AgentClient,
  createAgentClient,
  createAgentClientFromEnv,
  // Server middleware
  x402Middleware,
  // Types
  type AgentFetchOptions,
  type AgentFetchResponse,
  type X402MiddlewareConfig,
  type X402PaymentInfo,
  type X402PaymentRequirements
} from './x402'

// Essential utilities
export {
  getIntervalSeconds,
  generateSubscriptionId,
  toMicroUnits,
  fromMicroUnits,
  formatTokenAmount,
  getTokenMint,
  isTokenAvailableOnDevnet,
  getSolanaEndpoint,
  getICPHost,
  getCommunityCanisterId,
  getLicenseRegistryCanisterId,
  getCommunityApiKey,
  isValidSolanaAddress,
  createSubscriptionRequest
} from './utils'