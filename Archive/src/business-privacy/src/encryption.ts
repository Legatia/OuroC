/**
 * OuroC Enterprise Privacy - Encryption Utilities
 *
 * Phase 1: Web Crypto API implementation (production-ready, no external dependencies)
 * Phase 2: Can be upgraded to Arcium MXE for advanced confidential computing
 *
 * Features:
 * - AES-GCM encryption (256-bit keys)
 * - Client-side encryption (browser + Node.js)
 * - Key derivation from user wallet
 * - Encrypted memo storage
 * - Off-chain metadata encryption
 */

import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

// ============================================================================
// Types
// ============================================================================

export interface EncryptedData {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded initialization vector (96 bits for GCM) */
  iv: string;
  /** Algorithm used (for future compatibility) */
  algorithm: 'AES-GCM-256';
  /** Version for migration to Arcium MXE later */
  version: 1;
  /** Optional: Public key used for encryption (for key recovery) */
  publicKey?: string;
}

export interface SubscriptionMetadata {
  /** User-facing subscription name/description */
  name?: string;
  /** Internal merchant notes */
  merchantNotes?: string;
  /** User identifier (email, username, etc.) */
  userIdentifier?: string;
  /** Custom fields for merchant-specific data */
  customFields?: Record<string, any>;
  /** Tags for categorization */
  tags?: string[];
}

// ============================================================================
// Encryption Core (Web Crypto API)
// ============================================================================

/**
 * Generate a cryptographically secure encryption key from a Solana wallet
 * Uses wallet's public key + signature as entropy source
 *
 * @param walletPublicKey - User's Solana wallet public key
 * @param signMessage - Function to sign message with wallet (for entropy)
 * @returns AES-GCM encryption key
 */
export async function deriveEncryptionKey(
  walletPublicKey: PublicKey,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<CryptoKey> {
  // Create deterministic message from public key
  const message = new TextEncoder().encode(
    `OuroC-Privacy-Key-${walletPublicKey.toBase58()}`
  );

  // Sign message to get entropy (wallet-specific)
  const signature = await signMessage(message);

  // Derive key material using SHA-256
  const keyMaterial = await crypto.subtle.digest('SHA-256', signature);

  // Import as AES-GCM key
  return crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // not extractable (security best practice)
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random encryption key (for merchant-side encryption)
 * @returns AES-GCM encryption key
 */
export async function generateRandomKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable (can be stored)
    ['encrypt', 'decrypt']
  );
}

/**
 * Export encryption key to storable format
 * @param key - CryptoKey to export
 * @returns Base64-encoded key material
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return Buffer.from(exported).toString('base64');
}

/**
 * Import encryption key from stored format
 * @param keyData - Base64-encoded key material
 * @returns CryptoKey for encryption/decryption
 */
export async function importKey(keyData: string): Promise<CryptoKey> {
  const rawKey = Buffer.from(keyData, 'base64');
  return crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 *
 * @param data - Data to encrypt (will be JSON serialized)
 * @param key - Encryption key
 * @returns Encrypted data with IV
 */
export async function encrypt<T = any>(
  data: T,
  key: CryptoKey
): Promise<EncryptedData> {
  // Serialize data to JSON
  const plaintext = JSON.stringify(data);
  const plaintextBytes = new TextEncoder().encode(plaintext);

  // Generate random IV (96 bits for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt with AES-GCM
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintextBytes
  );

  return {
    ciphertext: Buffer.from(ciphertext).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    algorithm: 'AES-GCM-256',
    version: 1,
  };
}

/**
 * Decrypt data using AES-GCM
 *
 * @param encryptedData - Encrypted data with IV
 * @param key - Decryption key
 * @returns Decrypted data
 */
export async function decrypt<T = any>(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<T> {
  // Decode ciphertext and IV
  const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
  const iv = Buffer.from(encryptedData.iv, 'base64');

  // Decrypt with AES-GCM
  const plaintextBytes = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  // Deserialize JSON
  const plaintext = new TextDecoder().decode(plaintextBytes);
  return JSON.parse(plaintext) as T;
}

// ============================================================================
// Hash Utilities (for on-chain storage)
// ============================================================================

/**
 * Generate SHA-256 hash of encrypted data (for on-chain storage)
 * Solana stores this hash, actual encrypted data stored off-chain
 *
 * @param encryptedData - Encrypted data to hash
 * @returns 32-byte hash as base58 string
 */
export async function hashEncryptedData(
  encryptedData: EncryptedData
): Promise<string> {
  const dataString = JSON.stringify(encryptedData);
  const dataBytes = new TextEncoder().encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
  return bs58.encode(new Uint8Array(hashBuffer));
}

/**
 * Verify encrypted data matches on-chain hash
 * @param encryptedData - Encrypted data to verify
 * @param onChainHash - Hash stored on Solana contract
 * @returns true if hash matches
 */
export async function verifyHash(
  encryptedData: EncryptedData,
  onChainHash: string
): Promise<boolean> {
  const computedHash = await hashEncryptedData(encryptedData);
  return computedHash === onChainHash;
}

// ============================================================================
// Subscription Metadata Encryption
// ============================================================================

/**
 * Encrypt subscription metadata for off-chain storage
 *
 * @param metadata - Subscription metadata to encrypt
 * @param key - Encryption key (derived from wallet or merchant key)
 * @returns Encrypted metadata + hash for on-chain storage
 */
export async function encryptSubscriptionMetadata(
  metadata: SubscriptionMetadata,
  key: CryptoKey
): Promise<{
  encrypted: EncryptedData;
  hash: string;
}> {
  const encrypted = await encrypt(metadata, key);
  const hash = await hashEncryptedData(encrypted);

  return { encrypted, hash };
}

/**
 * Decrypt subscription metadata from off-chain storage
 *
 * @param encryptedData - Encrypted metadata
 * @param key - Decryption key
 * @param onChainHash - Optional: verify against on-chain hash
 * @returns Decrypted metadata
 */
export async function decryptSubscriptionMetadata(
  encryptedData: EncryptedData,
  key: CryptoKey,
  onChainHash?: string
): Promise<SubscriptionMetadata> {
  // Verify hash if provided
  if (onChainHash) {
    const isValid = await verifyHash(encryptedData, onChainHash);
    if (!isValid) {
      throw new Error('Hash verification failed - data may be tampered');
    }
  }

  return decrypt<SubscriptionMetadata>(encryptedData, key);
}

// ============================================================================
// Encrypted Memo Field
// ============================================================================

/**
 * Encrypt a simple memo field (text string)
 * Lighter-weight than full metadata encryption
 *
 * @param memo - Text memo to encrypt
 * @param key - Encryption key
 * @returns Encrypted memo + hash
 */
export async function encryptMemo(
  memo: string,
  key: CryptoKey
): Promise<{
  encrypted: EncryptedData;
  hash: string;
}> {
  const encrypted = await encrypt({ memo }, key);
  const hash = await hashEncryptedData(encrypted);

  return { encrypted, hash };
}

/**
 * Decrypt a memo field
 *
 * @param encryptedData - Encrypted memo
 * @param key - Decryption key
 * @returns Decrypted memo string
 */
export async function decryptMemo(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<string> {
  const data = await decrypt<{ memo: string }>(encryptedData, key);
  return data.memo;
}

// ============================================================================
// Key Management Utilities
// ============================================================================

/**
 * Store encryption key in browser localStorage (NOT recommended for production)
 * Use only for testing/demo purposes
 * Production should use secure key management (HSM, ICP threshold ECDSA, etc.)
 *
 * @param walletAddress - Wallet address as key identifier
 * @param key - Encryption key to store
 */
export async function storeKeyLocally(
  walletAddress: string,
  key: CryptoKey
): Promise<void> {
  const exported = await exportKey(key);
  localStorage.setItem(`ouroc-key-${walletAddress}`, exported);
  console.warn('⚠️ Key stored in localStorage - NOT secure for production!');
}

/**
 * Retrieve encryption key from localStorage
 *
 * @param walletAddress - Wallet address as key identifier
 * @returns Encryption key or null if not found
 */
export async function retrieveKeyLocally(
  walletAddress: string
): Promise<CryptoKey | null> {
  const exported = localStorage.getItem(`ouroc-key-${walletAddress}`);
  if (!exported) return null;
  return importKey(exported);
}

/**
 * Delete encryption key from localStorage
 * @param walletAddress - Wallet address as key identifier
 */
export function deleteKeyLocally(walletAddress: string): void {
  localStorage.removeItem(`ouroc-key-${walletAddress}`);
}

// ============================================================================
// Migration Path to Arcium MXE (Future)
// ============================================================================

/**
 * PLACEHOLDER: Will be implemented in Phase 2
 *
 * Arcium MXE provides:
 * - Multi-party computation (MPC)
 * - Fully homomorphic encryption (FHE)
 * - Distributed key management
 * - 500+ node confidential compute network
 *
 * Migration strategy:
 * 1. Keep same encrypt/decrypt interface
 * 2. Add new EncryptedData.version = 2 for Arcium-encrypted data
 * 3. Implement arciumEncrypt/arciumDecrypt functions
 * 4. Gradually migrate existing data (re-encrypt with Arcium keys)
 */
export interface ArciumConfig {
  /** Arcium network endpoint (testnet/mainnet) */
  endpoint: string;
  /** MXE program ID on Solana */
  mxeProgramId: string;
  /** Client authentication */
  apiKey?: string;
}

// Placeholder for future implementation
export async function encryptWithArcium(
  data: any,
  config: ArciumConfig
): Promise<EncryptedData> {
  throw new Error('Arcium MXE integration coming in Phase 2');
  // Will use @arcium-hq/client package
  // Will fetch MXE public key from Solana program
  // Will use Rescue cipher + x25519 key exchange
}

export async function decryptWithArcium(
  encryptedData: EncryptedData,
  config: ArciumConfig
): Promise<any> {
  throw new Error('Arcium MXE integration coming in Phase 2');
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate a random nonce/ID for encrypted data
 * @returns Base58-encoded random ID
 */
export function generateDataId(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  return bs58.encode(randomBytes);
}

/**
 * Check if Web Crypto API is available
 * @returns true if encryption is supported
 */
export function isEncryptionSupported(): boolean {
  return typeof crypto !== 'undefined' &&
         typeof crypto.subtle !== 'undefined';
}
