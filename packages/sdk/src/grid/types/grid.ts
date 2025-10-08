/**
 * Grid API Types
 * Based on: https://grid.squads.xyz/grid/v1/api-reference/
 */

export interface GridConfig {
  apiUrl: string;
  apiKey: string;
  network: 'devnet' | 'mainnet-beta';
}

// Account Types
export type GridAccountType = 'email' | 'signer';

export interface GridEmailAccount {
  type: 'email';
  email: string;
  account_type: 'USDC' | 'USDT' | 'SOL';
}

export interface GridSignerAccount {
  type: 'signer';
  signer_public_key: string; // ed25519 public key
  account_type: 'USDC' | 'USDT' | 'SOL';
}

export interface GridAccount {
  account_id: string;
  account_type: string;
  email?: string;
  public_key: string;
  status: 'pending_verification' | 'active' | 'suspended';
  balance: string;
  created_at: string;
  // Multisig fields (if account is multisig type)
  signers?: string[];
  threshold?: number;
}

// OTP Verification
export interface OTPVerification {
  account_id: string;
  otp_code: string;
}

export interface OTPResponse {
  verified: boolean;
  account: GridAccount;
}

// Multisig Configuration
export interface MultisigConfig {
  account_id: string;
  signers: string[]; // Array of public keys
  threshold: number; // Number of signatures required
  name?: string;
  description?: string;
}

export interface MultisigAccount extends GridAccount {
  signers: string[];
  threshold: number;
  pending_approvals: number;
}

// Transaction Types
export interface PrepareTransactionRequest {
  account_id: string;
  instructions: SolanaInstruction[];
  fee_payer: string;
  recent_blockhash?: string;
}

export interface SolanaInstruction {
  program_id: string;
  accounts: AccountMeta[];
  data: number[] | Buffer;
}

export interface AccountMeta {
  pubkey: string;
  is_signer: boolean;
  is_writable: boolean;
}

export interface PreparedTransaction {
  transaction: string; // Base64 encoded
  transaction_id: string;
  signers_required: string[];
}

export interface SubmitTransactionRequest {
  account_id: string;
  transaction: string; // Base64 encoded signed transaction
}

export interface SubmitTransactionResponse {
  transaction_id: string;
  signature: string;
  status: 'pending' | 'confirmed' | 'failed';
}

// Standing Orders (NOT USED - OuroC uses ICP timer mechanism)
// These types are kept for reference but not used in OuroC integration
// OuroC maintains its ICP canister timer architecture for payment triggers
export interface CreateStandingOrderRequest {
  account_id: string;
  recipient: string;
  amount: string;
  token: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  start_date?: string;
  end_date?: string;
}

export interface StandingOrder extends CreateStandingOrderRequest {
  order_id: string;
  status: 'active' | 'paused' | 'cancelled';
  created_at: string;
  next_execution: string;
}

// Spending Limits
export interface SpendingLimit {
  account_id: string;
  token: string;
  daily_limit?: string;
  monthly_limit?: string;
  per_transaction_limit?: string;
}

// Error Response
export interface GridError {
  error: string;
  message: string;
  code: number;
  details?: any;
}
