/**
 * OuroC Enterprise Privacy Module
 *
 * CURRENT: Business Tier (Web Crypto API)
 * FUTURE: Enterprise Tier (Arcium MXE)
 *
 * Business Tier Features:
 * - AES-GCM-256 encryption (Web Crypto API)
 * - Off-chain storage (ICP canister)
 * - On-chain hash verification (Solana)
 * - GDPR compliance tools
 *
 * Enterprise Tier Features (Q2 2026):
 * - Arcium MXE confidential computing
 * - Zero-knowledge proofs
 * - Multi-party computation
 * - Confidential transaction amounts
 * - Hidden transaction parties
 * - Advanced privacy controls
 *
 * @module @ouroc/sdk/enterprise
 */

// Re-export all encryption utilities (Business Tier)
export * from './core/encryption';

// Re-export privacy helper functions
export * from './core/privacy/createPrivateSubscription';
export * from './core/privacy/getPrivateMetadata';
export * from './core/privacy/updatePrivateMetadata';
export * from './core/privacy/deletePrivateMetadata';

// Arcium MXE (Enterprise Tier - Coming Q2 2026)
// Temporarily removed for hackathon - will be published after mainnet deploy
// export * from './enterprise/arcium';

// Export tier information and migration utilities
export { getTierInfo, isEnterpriseTier } from './core/tier';
