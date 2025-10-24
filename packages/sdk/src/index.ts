// OuroC Core SDK - Framework-agnostic implementation
export { OuroC } from './core/OuroC'

// Re-export types for convenience
export type {
  OuroCConfig,
  SubscriptionRequest,
  Subscription,
  X402PaymentRequest,
  X402PaymentResponse,
  PaymentRecord
} from './core/OuroC'

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