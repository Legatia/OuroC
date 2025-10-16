/**
 * OuroC Enterprise Privacy Module
 *
 * End-to-end encryption for subscription metadata
 * - AES-GCM-256 encryption (Web Crypto API)
 * - Off-chain storage (ICP canister)
 * - On-chain hash verification (Solana)
 * - GDPR compliance tools
 * - Future: Arcium MXE multi-party compute
 *
 * @module @ouroc/sdk/enterprise
 */

// Re-export all encryption utilities
export * from './core/encryption';

// Re-export privacy helper functions (to be created)
export * from './core/privacy/createPrivateSubscription';
export * from './core/privacy/getPrivateMetadata';
export * from './core/privacy/updatePrivateMetadata';
export * from './core/privacy/deletePrivateMetadata';
