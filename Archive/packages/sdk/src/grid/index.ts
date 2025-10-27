/**
 * OuroC SDK
 * Complete SDK for OuroC subscriptions with Grid integration
 *
 * @packageDocumentation
 */

// ============================================================================
// Grid API Integration
// ============================================================================
export { GridClient } from './api/GridClient';
export { SubscriberFlow } from './flows/SubscriberFlow';
export { SubscriberOnRampFlow } from './flows/SubscriberOnRampFlow';
export { MerchantFlow } from './flows/MerchantFlow';
export { MerchantMultisigFlow } from './flows/MerchantMultisigFlow';
export { MerchantKYCFlow } from './flows/MerchantKYCFlow';
export { MerchantOffRampFlow } from './flows/MerchantOffRampFlow';

// ============================================================================
// React Components (import from '@ouroc/sdk/components')
// ============================================================================
// These are exported separately to avoid bundling React in non-React projects
// Usage: import { SubscriberSignup } from '@ouroc/sdk/components'

// ============================================================================
// TypeScript Types
// ============================================================================
export * from './types/grid';
export * from './types/ouroc';
export * from './types/kyc';

// Re-export for convenience
export type {
  GridConfig,
  GridAccount,
  MultisigAccount,
} from './types/grid';

export type {
  CreateSubscriberResult,
  SubscriberFlowConfig,
} from './flows/SubscriberFlow';

export type {
  CreateMerchantParams,
  MerchantFlowResult,
  MerchantFlowConfig,
} from './flows/MerchantFlow';

export type {
  MerchantMultisigConfig,
  MultisigSignerInfo,
  CreateMultisigMerchantParams,
  MerchantMultisigResult,
} from './flows/MerchantMultisigFlow';
