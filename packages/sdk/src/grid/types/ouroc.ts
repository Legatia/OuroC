/**
 * OuroC Subscription Types
 */

import { PublicKey } from '@solana/web3.js';

export interface OuroCSubscription {
  id: string;
  subscriber: PublicKey;
  merchant: PublicKey;
  amount: bigint; // USDC amount in smallest units
  intervalSeconds: bigint;
  nextPaymentTime: bigint;
  status: 'Active' | 'Paused' | 'Cancelled';
  createdAt: bigint;
  lastPaymentTime?: bigint;
  paymentsMade: bigint;
  totalPaid: bigint;
  paymentTokenMint: PublicKey;
  reminderDaysBeforePayment: number;
  slippageBps: number;
}

export interface CreateSubscriptionParams {
  subscriptionId: string;
  amount: bigint;
  intervalSeconds: bigint;
  merchantAddress: PublicKey;
  paymentTokenMint: PublicKey;
  reminderDaysBeforePayment: number;
  slippageBps: number;
  icpCanisterSignature: number[];
}

export interface ApproveDelegateParams {
  subscriptionId: string;
  amount: bigint;
}

// Grid-OuroC Mapping
export interface GridSubscriptionMapping {
  gridAccountId: string; // Grid account that owns the subscription
  gridStandingOrderId?: string; // Optional Grid standing order
  ouroCSubscriptionId: string; // OuroC subscription ID
  ouroCSubscriptionPda: PublicKey; // Subscription PDA address
  createdAt: Date;
  status: 'active' | 'paused' | 'cancelled';
}

// Merchant Grid Account
export interface GridMerchantAccount {
  gridAccountId: string;
  multisigConfig?: {
    signers: PublicKey[];
    threshold: number;
  };
  ouroCMerchantPubkey: PublicKey;
  createdAt: Date;
}
