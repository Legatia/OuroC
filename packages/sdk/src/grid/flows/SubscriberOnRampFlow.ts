/**
 * Subscriber On-Ramp Flow
 * Handle Fiat → USDC deposits via Grid/payment providers
 *
 * Prerequisites: User must have verified Grid account (email + OTP)
 */

import { GridClient } from '../api/GridClient';

export interface OnRampFlowConfig {
  gridClient: GridClient;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string; // visa, mastercard, etc.
  expiryMonth?: number;
  expiryYear?: number;
  bankName?: string;
  isDefault?: boolean;
}

export interface OnRampRequest {
  gridAccountId: string;
  amountUSD: string;        // Amount in USD (e.g., "100.50")
  paymentMethod: PaymentMethod;
  savePaymentMethod?: boolean;
}

export interface OnRampQuote {
  amountUSD: string;
  amountUSDC: string;
  exchangeRate: number;     // USD → USDC (should be ~1.0)
  fees: {
    processingFee: string;  // Payment processor fee
    networkFee: string;     // Solana network fee
    gridFee: string;        // Grid service fee
    totalFee: string;
  };
  estimatedArrival: string; // ISO timestamp
  expiresAt: string;        // Quote expiry
}

export interface OnRampTransaction {
  transactionId: string;
  gridAccountId: string;
  amountUSD: string;
  amountUSDC: string;
  paymentMethod: PaymentMethod;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failureReason?: string;
  providerTxId?: string;    // External provider transaction ID
}

export class SubscriberOnRampFlow {
  private gridClient: GridClient;

  constructor(config: OnRampFlowConfig) {
    this.gridClient = config.gridClient;
  }

  /**
   * Get supported deposit amounts and limits
   */
  getDepositLimits(): {
    minAmount: number;
    maxAmount: number;
    supportedAmounts: number[];
    currency: 'USD';
  } {
    return {
      minAmount: 10,           // $10 minimum
      maxAmount: 10000,        // $10k maximum daily
      supportedAmounts: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
      currency: 'USD',
    };
  }

  /**
   * Get on-ramp quote (estimate fees and USDC amount)
   */
  async getOnRampQuote(
    amountUSD: string,
    paymentMethodType: PaymentMethod['type']
  ): Promise<OnRampQuote> {
    console.log(`[On-Ramp] Getting quote for $${amountUSD} USD → USDC via ${paymentMethodType}`);

    const usdAmount = parseFloat(amountUSD);

    // Estimated fees (these would come from payment provider APIs)
    const processingFeeRates = {
      card: 0.029,           // 2.9% for cards
      bank_account: 0.005,   // 0.5% for ACH
      apple_pay: 0.029,      // Same as card
      google_pay: 0.029,     // Same as card
    };

    const networkFeeFixed = 0.50; // $0.50 for Solana network
    const gridFeeRate = 0.002;    // 0.2% Grid service fee

    const processingFee = usdAmount * processingFeeRates[paymentMethodType];
    const gridFee = usdAmount * gridFeeRate;
    const totalFees = processingFee + networkFeeFixed + gridFee;
    const usdcAmount = usdAmount - totalFees;

    // Exchange rate (should be very close to 1:1 for USDC)
    const exchangeRate = 0.999; // Slight slippage

    return {
      amountUSD: amountUSD,
      amountUSDC: (usdcAmount * exchangeRate).toFixed(2),
      exchangeRate: exchangeRate,
      fees: {
        processingFee: processingFee.toFixed(2),
        networkFee: networkFeeFixed.toFixed(2),
        gridFee: gridFee.toFixed(2),
        totalFee: totalFees.toFixed(2),
      },
      estimatedArrival: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min quote expiry
    };
  }

  /**
   * Create payment intent for card/bank deposit
   * In production, this would integrate with Stripe, MoonPay, etc.
   */
  async createPaymentIntent(
    request: OnRampRequest,
    quote: OnRampQuote
  ): Promise<{
    clientSecret?: string;    // For Stripe card payments
    redirectUrl?: string;     // For bank transfers or external providers
    provider: 'stripe' | 'moonpay' | 'transak' | 'coinbase';
    providerTxId: string;
  }> {
    console.log(`[On-Ramp] Creating payment intent for $${request.amountUSD}`);

    // For demo purposes, we'll simulate different providers based on payment method
    let provider: 'stripe' | 'moonpay' | 'transak' | 'coinbase';
    let response: any = {};

    switch (request.paymentMethod.type) {
      case 'card':
      case 'apple_pay':
      case 'google_pay':
        // Use Stripe for card payments
        provider = 'stripe';
        response = {
          clientSecret: 'pi_demo_' + Math.random().toString(36).substr(2, 20),
          provider,
          providerTxId: 'stripe_tx_' + Date.now(),
        };
        break;

      case 'bank_account':
        // Use MoonPay for bank transfers
        provider = 'moonpay';
        response = {
          redirectUrl: `https://buy.moonpay.com/buy?currency=USDC&amount=${request.amountUSD}`,
          provider,
          providerTxId: 'moonpay_tx_' + Date.now(),
        };
        break;

      default:
        throw new Error(`Unsupported payment method: ${request.paymentMethod.type}`);
    }

    console.log(`[On-Ramp] ✅ Payment intent created via ${provider}`);
    return response;
  }

  /**
   * Initiate on-ramp transaction
   * Returns transaction ID for tracking
   */
  async initiateOnRamp(
    request: OnRampRequest
  ): Promise<OnRampTransaction> {
    console.log(`[On-Ramp] Initiating deposit for ${request.gridAccountId}`);

    // Get quote
    const quote = await this.getOnRampQuote(request.amountUSD, request.paymentMethod.type);

    console.log(`[On-Ramp] Quote: $${request.amountUSD} USD → ${quote.amountUSDC} USDC`);
    console.log(`[On-Ramp] Fees: $${quote.fees.totalFee} USD`);

    // Create payment intent
    const paymentIntent = await this.createPaymentIntent(request, quote);

    const transaction: OnRampTransaction = {
      transactionId: `onramp_${Date.now()}`,
      gridAccountId: request.gridAccountId,
      amountUSD: request.amountUSD,
      amountUSDC: quote.amountUSDC,
      paymentMethod: request.paymentMethod,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      providerTxId: paymentIntent.providerTxId,
    };

    console.log(`[On-Ramp] ✅ Transaction created: ${transaction.transactionId}`);
    console.log(`[On-Ramp] Provider: ${paymentIntent.provider}`);

    // In production, you would:
    // 1. For cards: Charge card via Stripe using clientSecret
    // 2. For banks: Redirect user to MoonPay/other provider
    // 3. Webhook handler would receive confirmation and credit Grid account
    // 4. Update transaction status to 'completed'

    return transaction;
  }

  /**
   * Get on-ramp transaction status
   */
  async getOnRampStatus(transactionId: string): Promise<OnRampTransaction> {
    console.log(`[On-Ramp] Checking status for ${transactionId}`);

    // In production, query payment provider API
    // For now, simulate status check
    throw new Error('getOnRampStatus: Not implemented - requires payment provider API integration');
  }

  /**
   * List on-ramp transaction history
   */
  async getOnRampHistory(
    gridAccountId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: OnRampTransaction['status'];
    }
  ): Promise<OnRampTransaction[]> {
    console.log(`[On-Ramp] Fetching history for ${gridAccountId}`);

    // In production, query Grid API and payment provider APIs
    // For now, return empty array
    return [];
  }

  /**
   * Get current Grid account balance
   */
  async getBalance(gridAccountId: string): Promise<string> {
    return await this.gridClient.getAccountBalance(gridAccountId);
  }

  /**
   * Validate payment amount
   */
  validateAmount(amountUSD: string): {
    valid: boolean;
    error?: string;
    suggestedAmount?: number;
  } {
    const limits = this.getDepositLimits();
    const amount = parseFloat(amountUSD);

    if (isNaN(amount) || amount <= 0) {
      return { valid: false, error: 'Please enter a valid amount' };
    }

    if (amount < limits.minAmount) {
      return {
        valid: false,
        error: `Minimum amount is $${limits.minAmount}`,
        suggestedAmount: limits.minAmount
      };
    }

    if (amount > limits.maxAmount) {
      return {
        valid: false,
        error: `Maximum amount is $${limits.maxAmount} per day`,
        suggestedAmount: limits.maxAmount
      };
    }

    return { valid: true };
  }

  /**
   * Get supported payment methods by region
   */
  getSupportedPaymentMethods(region: 'US' | 'EU' | 'UK' | 'GLOBAL' = 'US'): PaymentMethod['type'][] {
    const methodsByRegion = {
      US: ['card', 'bank_account', 'apple_pay', 'google_pay'],
      EU: ['card', 'bank_account', 'apple_pay', 'google_pay'],
      UK: ['card', 'bank_account', 'apple_pay', 'google_pay'],
      GLOBAL: ['card', 'apple_pay', 'google_pay'],
    };

    return methodsByRegion[region];
  }
}

/**
 * Usage Example:
 *
 * const onRampFlow = new SubscriberOnRampFlow({ gridClient });
 *
 * // 1. Get deposit limits
 * const limits = onRampFlow.getDepositLimits();
 * console.log(`Min: $${limits.minAmount}, Max: $${limits.maxAmount}`);
 *
 * // 2. Get quote for amount
 * const quote = await onRampFlow.getOnRampQuote('100', 'card');
 * console.log(`You'll receive: ${quote.amountUSDC} USDC`);
 * console.log(`Fees: $${quote.fees.totalFee} USD`);
 *
 * // 3. User selects payment method and confirms
 * const transaction = await onRampFlow.initiateOnRamp({
 *   gridAccountId: 'grid_abc123',
 *   amountUSD: '100',
 *   paymentMethod: {
 *     type: 'card',
 *     last4: '4242',
 *     brand: 'visa',
 *     expiryMonth: 12,
 *     expiryYear: 2025,
 *   },
 *   savePaymentMethod: true,
 * });
 *
 * // 4. Process payment (Stripe/MoonPay/etc.)
 * // 5. Webhook receives confirmation and credits Grid account
 * // 6. Update transaction status to 'completed'
 */