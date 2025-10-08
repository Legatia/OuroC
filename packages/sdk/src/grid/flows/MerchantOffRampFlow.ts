/**
 * Merchant Off-Ramp Flow
 * Handle USDC → Fiat withdrawals via Grid/Sphere
 *
 * Prerequisites: Merchant must have KYC approved
 */

import { PublicKey } from '@solana/web3.js';
import { GridClient } from '../api/GridClient';
import { MerchantKYCFlow } from './MerchantKYCFlow';

export interface OffRampFlowConfig {
  gridClient: GridClient;
}

export interface BankAccountInfo {
  accountHolderName: string;
  accountNumber: string;
  routingNumber?: string;    // US (ACH)
  swiftCode?: string;        // International
  iban?: string;             // Europe
  bankName: string;
  bankAddress?: string;
  accountType?: 'checking' | 'savings' | 'business';
  currency: 'USD' | 'EUR' | 'GBP';
}

export interface OffRampRequest {
  gridAccountId: string;
  amountUSDC: string;        // Amount in USDC (e.g., "1000.50")
  bankAccount: BankAccountInfo;
  memo?: string;
}

export interface OffRampQuote {
  amountUSDC: string;
  amountFiat: string;
  fiatCurrency: string;
  exchangeRate: number;
  fees: {
    conversionFee: string;
    networkFee: string;
    bankFee: string;
    totalFee: string;
  };
  estimatedArrival: string;  // ISO timestamp
  expiresAt: string;         // Quote expiry
}

export interface OffRampTransaction {
  transactionId: string;
  gridAccountId: string;
  amountUSDC: string;
  amountFiat: string;
  fiatCurrency: string;
  bankAccount: BankAccountInfo;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failureReason?: string;
}

export class MerchantOffRampFlow {
  private gridClient: GridClient;
  private kycFlow: MerchantKYCFlow;

  constructor(config: OffRampFlowConfig) {
    this.gridClient = config.gridClient;
    this.kycFlow = new MerchantKYCFlow({ gridClient: config.gridClient });
  }

  /**
   * Check if merchant can off-ramp (KYC approved + sufficient balance)
   */
  async canOffRamp(gridAccountId: string): Promise<{
    canOffRamp: boolean;
    reason?: string;
    kycStatus?: string;
    balance?: string;
  }> {
    // Check KYC status
    const isKYCApproved = await this.kycFlow.isKYCApproved(gridAccountId);

    if (!isKYCApproved) {
      const kycStatus = await this.kycFlow.getKYCStatus(gridAccountId);
      return {
        canOffRamp: false,
        reason: kycStatus.status === 'pending'
          ? 'KYC verification pending'
          : 'KYC verification required',
        kycStatus: kycStatus.status,
      };
    }

    // Check balance
    const balance = await this.gridClient.getAccountBalance(gridAccountId);
    const balanceNum = parseFloat(balance) / 1_000_000; // Convert to USDC

    if (balanceNum < 10) { // Minimum $10 for off-ramp
      return {
        canOffRamp: false,
        reason: 'Insufficient balance (minimum $10 USDC)',
        balance: balanceNum.toString(),
      };
    }

    return {
      canOffRamp: true,
      kycStatus: 'approved',
      balance: balanceNum.toString(),
    };
  }

  /**
   * Get off-ramp quote (estimate fees and exchange rate)
   */
  async getOffRampQuote(
    gridAccountId: string,
    amountUSDC: string,
    fiatCurrency: 'USD' | 'EUR' | 'GBP' = 'USD'
  ): Promise<OffRampQuote> {
    console.log(`[Off-Ramp] Getting quote for ${amountUSDC} USDC → ${fiatCurrency}`);

    // In production, this would call Grid/Sphere API for real-time quote
    // For now, we'll simulate the quote calculation

    const usdcAmount = parseFloat(amountUSDC);

    // Estimated fees (these would come from Sphere API)
    const conversionFeeRate = 0.005; // 0.5%
    const networkFeeFixed = 1.0; // $1 flat
    const bankFeeFixed = fiatCurrency === 'USD' ? 0 : 25; // International wire fee

    const conversionFee = usdcAmount * conversionFeeRate;
    const totalFees = conversionFee + networkFeeFixed + bankFeeFixed;
    const fiatAmount = usdcAmount - totalFees;

    // Exchange rate (1:1 for USDC → USD, would be dynamic for EUR/GBP)
    const exchangeRate = fiatCurrency === 'USD' ? 1.0 : 0.92; // Example EUR rate

    return {
      amountUSDC: amountUSDC,
      amountFiat: (fiatAmount * exchangeRate).toFixed(2),
      fiatCurrency: fiatCurrency,
      exchangeRate: exchangeRate,
      fees: {
        conversionFee: conversionFee.toFixed(2),
        networkFee: networkFeeFixed.toFixed(2),
        bankFee: bankFeeFixed.toFixed(2),
        totalFee: totalFees.toFixed(2),
      },
      estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min quote expiry
    };
  }

  /**
   * Initiate off-ramp transaction
   * Returns transaction ID for tracking
   */
  async initiateOffRamp(request: OffRampRequest): Promise<OffRampTransaction> {
    console.log(`[Off-Ramp] Initiating withdrawal for ${request.gridAccountId}`);

    // Verify can off-ramp
    const canOffRamp = await this.canOffRamp(request.gridAccountId);
    if (!canOffRamp.canOffRamp) {
      throw new Error(`Cannot off-ramp: ${canOffRamp.reason}`);
    }

    // Get quote
    const quote = await this.getOffRampQuote(
      request.gridAccountId,
      request.amountUSDC,
      request.bankAccount.currency
    );

    console.log(`[Off-Ramp] Quote: ${quote.amountUSDC} USDC → ${quote.amountFiat} ${quote.fiatCurrency}`);
    console.log(`[Off-Ramp] Fees: ${quote.fees.totalFee} ${quote.fiatCurrency}`);

    // In production, this would call Grid/Sphere API to initiate withdrawal
    // For now, we'll simulate the transaction creation

    // Note: For multisig accounts, this would trigger approval workflow
    // The actual withdrawal happens after M-of-N signatures collected

    const transaction: OffRampTransaction = {
      transactionId: `offramp_${Date.now()}`,
      gridAccountId: request.gridAccountId,
      amountUSDC: request.amountUSDC,
      amountFiat: quote.amountFiat,
      fiatCurrency: request.bankAccount.currency,
      bankAccount: request.bankAccount,
      status: 'pending', // Waiting for multisig approvals (if applicable)
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log(`[Off-Ramp] ✅ Transaction created: ${transaction.transactionId}`);
    console.log(`[Off-Ramp] Status: ${transaction.status}`);

    return transaction;
  }

  /**
   * Get off-ramp transaction status
   */
  async getOffRampStatus(transactionId: string): Promise<OffRampTransaction> {
    console.log(`[Off-Ramp] Checking status for ${transactionId}`);

    // In production, query Grid/Sphere API
    // For now, simulate status check

    // This would return actual transaction status from API
    throw new Error('getOffRampStatus: Not implemented - requires Grid/Sphere API integration');
  }

  /**
   * List off-ramp transaction history
   */
  async getOffRampHistory(
    gridAccountId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: OffRampTransaction['status'];
    }
  ): Promise<OffRampTransaction[]> {
    console.log(`[Off-Ramp] Fetching history for ${gridAccountId}`);

    // In production, query Grid API
    // For now, return empty array

    return [];
  }

  /**
   * Cancel pending off-ramp transaction
   */
  async cancelOffRamp(transactionId: string): Promise<void> {
    console.log(`[Off-Ramp] Cancelling transaction ${transactionId}`);

    // In production, call Grid API to cancel
    // Only works for 'pending' status transactions

    throw new Error('cancelOffRamp: Not implemented - requires Grid API integration');
  }

  /**
   * Get supported fiat currencies for off-ramp
   */
  getSupportedCurrencies(): Array<{
    code: 'USD' | 'EUR' | 'GBP';
    name: string;
    minAmount: number;
    maxAmount: number;
  }> {
    return [
      {
        code: 'USD',
        name: 'US Dollar',
        minAmount: 10,
        maxAmount: 100000,
      },
      {
        code: 'EUR',
        name: 'Euro',
        minAmount: 10,
        maxAmount: 100000,
      },
      {
        code: 'GBP',
        name: 'British Pound',
        minAmount: 10,
        maxAmount: 100000,
      },
    ];
  }

  /**
   * Validate bank account info
   */
  validateBankAccount(bankAccount: BankAccountInfo): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!bankAccount.accountHolderName) {
      errors.push('Account holder name is required');
    }

    if (!bankAccount.accountNumber) {
      errors.push('Account number is required');
    }

    if (bankAccount.currency === 'USD' && !bankAccount.routingNumber) {
      errors.push('Routing number is required for USD withdrawals');
    }

    if (bankAccount.currency !== 'USD' && !bankAccount.swiftCode && !bankAccount.iban) {
      errors.push('SWIFT code or IBAN is required for international withdrawals');
    }

    if (!bankAccount.bankName) {
      errors.push('Bank name is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Usage Example:
 *
 * const offRampFlow = new MerchantOffRampFlow({ gridClient });
 *
 * // 1. Check if merchant can off-ramp
 * const eligibility = await offRampFlow.canOffRamp(gridAccountId);
 * if (!eligibility.canOffRamp) {
 *   console.log('Cannot off-ramp:', eligibility.reason);
 *   // Prompt merchant to complete KYC
 *   return;
 * }
 *
 * // 2. Get quote
 * const quote = await offRampFlow.getOffRampQuote(gridAccountId, '1000', 'USD');
 * console.log(`You'll receive: ${quote.amountFiat} USD`);
 * console.log(`Fees: ${quote.fees.totalFee} USD`);
 *
 * // 3. Initiate withdrawal
 * const transaction = await offRampFlow.initiateOffRamp({
 *   gridAccountId: gridAccountId,
 *   amountUSDC: '1000',
 *   bankAccount: {
 *     accountHolderName: 'Acme Corp',
 *     accountNumber: '123456789',
 *     routingNumber: '021000021',
 *     bankName: 'Chase Bank',
 *     accountType: 'business',
 *     currency: 'USD',
 *   },
 *   memo: 'Subscription revenue withdrawal'
 * });
 *
 * // 4. For multisig: Team members approve via Grid dashboard
 * // Once M-of-N signatures collected, Grid executes withdrawal
 *
 * // 5. Track status
 * const status = await offRampFlow.getOffRampStatus(transaction.transactionId);
 * console.log('Status:', status.status);
 */
