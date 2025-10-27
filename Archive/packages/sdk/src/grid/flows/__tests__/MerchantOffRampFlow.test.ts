/**
 * Unit Tests for MerchantOffRampFlow
 */

import { MerchantOffRampFlow, BankAccountInfo, OffRampRequest } from '../MerchantOffRampFlow';
import { MerchantKYCFlow } from '../MerchantKYCFlow';
import { GridClient } from '../../api/GridClient';
import { KYCStatusResponse } from '../../types/kyc';

// Mock dependencies
jest.mock('../../api/GridClient');
jest.mock('../MerchantKYCFlow');

describe('MerchantOffRampFlow', () => {
  let offRampFlow: MerchantOffRampFlow;
  let mockGridClient: jest.Mocked<GridClient>;
  let mockKYCFlow: jest.Mocked<MerchantKYCFlow>;

  beforeEach(() => {
    mockGridClient = new GridClient({
      apiUrl: 'https://test.api',
      apiKey: 'test-key',
      network: 'devnet',
    }) as jest.Mocked<GridClient>;

    offRampFlow = new MerchantOffRampFlow({ gridClient: mockGridClient });
    mockKYCFlow = (offRampFlow as any).kycFlow as jest.Mocked<MerchantKYCFlow>;
  });

  describe('canOffRamp', () => {
    it('should return true if KYC approved and sufficient balance', async () => {
      mockKYCFlow.isKYCApproved = jest.fn().mockResolvedValue(true);
      mockGridClient.getAccountBalance = jest.fn().mockResolvedValue('20000000'); // 20 USDC

      const result = await offRampFlow.canOffRamp('test-account-123');

      expect(result.canOffRamp).toBe(true);
      expect(result.kycStatus).toBe('approved');
    });

    it('should return false if KYC not approved', async () => {
      const mockKYCStatus: KYCStatusResponse = {
        account_id: 'test-account-123',
        status: 'pending',
        tier: 'tier1',
        submitted_at: '2025-10-06T00:00:00Z',
      };

      mockKYCFlow.isKYCApproved = jest.fn().mockResolvedValue(false);
      mockKYCFlow.getKYCStatus = jest.fn().mockResolvedValue(mockKYCStatus);

      const result = await offRampFlow.canOffRamp('test-account-123');

      expect(result.canOffRamp).toBe(false);
      expect(result.reason).toBe('KYC verification pending');
    });

    it('should return false if balance below minimum', async () => {
      mockKYCFlow.isKYCApproved = jest.fn().mockResolvedValue(true);
      mockGridClient.getAccountBalance = jest.fn().mockResolvedValue('5000000'); // 5 USDC (below $10 min)

      const result = await offRampFlow.canOffRamp('test-account-123');

      expect(result.canOffRamp).toBe(false);
      expect(result.reason).toBe('Insufficient balance (minimum $10 USDC)');
    });
  });

  describe('getOffRampQuote', () => {
    it('should return quote for USD withdrawal', async () => {
      const quote = await offRampFlow.getOffRampQuote(
        'test-account-123',
        '1000.00',
        'USD'
      );

      expect(quote.amountUSDC).toBe('1000.00');
      expect(quote.fiatCurrency).toBe('USD');
      expect(quote.exchangeRate).toBe(1.0);
      expect(parseFloat(quote.amountFiat)).toBeLessThan(1000); // After fees
      expect(parseFloat(quote.fees.totalFee)).toBeGreaterThan(0);
    });

    it('should return quote for EUR withdrawal with international fee', async () => {
      const quote = await offRampFlow.getOffRampQuote(
        'test-account-123',
        '1000.00',
        'EUR'
      );

      expect(quote.amountUSDC).toBe('1000.00');
      expect(quote.fiatCurrency).toBe('EUR');
      expect(quote.exchangeRate).toBe(0.92);
      expect(parseFloat(quote.fees.bankFee)).toBe(25); // International wire fee
    });

    it('should include correct fee breakdown', async () => {
      const quote = await offRampFlow.getOffRampQuote(
        'test-account-123',
        '1000.00',
        'USD'
      );

      expect(parseFloat(quote.fees.conversionFee)).toBe(5.0); // 0.5% of 1000
      expect(parseFloat(quote.fees.networkFee)).toBe(1.0);
      expect(parseFloat(quote.fees.bankFee)).toBe(0); // No intl fee for USD
      expect(parseFloat(quote.fees.totalFee)).toBe(6.0);
    });
  });

  describe('initiateOffRamp', () => {
    const validBankAccount: BankAccountInfo = {
      accountHolderName: 'John Doe',
      accountNumber: '123456789',
      routingNumber: '021000021',
      bankName: 'Chase Bank',
      accountType: 'checking',
      currency: 'USD',
    };

    it('should initiate off-ramp successfully', async () => {
      mockKYCFlow.isKYCApproved = jest.fn().mockResolvedValue(true);
      mockGridClient.getAccountBalance = jest.fn().mockResolvedValue('1500000000'); // 1500 USDC

      const request: OffRampRequest = {
        gridAccountId: 'test-account-123',
        amountUSDC: '1000.00',
        bankAccount: validBankAccount,
        memo: 'Test withdrawal',
      };

      const result = await offRampFlow.initiateOffRamp(request);

      expect(result.transactionId).toBeDefined();
      expect(result.gridAccountId).toBe('test-account-123');
      expect(result.amountUSDC).toBe('1000.00');
      expect(result.status).toBe('pending');
      expect(result.bankAccount).toEqual(validBankAccount);
    });

    it('should throw error if cannot off-ramp', async () => {
      const mockKYCStatus: KYCStatusResponse = {
        account_id: 'test-account-123',
        status: 'pending',
        tier: 'tier1',
        submitted_at: '2025-10-06T00:00:00Z',
      };

      mockKYCFlow.isKYCApproved = jest.fn().mockResolvedValue(false);
      mockKYCFlow.getKYCStatus = jest.fn().mockResolvedValue(mockKYCStatus);

      const request: OffRampRequest = {
        gridAccountId: 'test-account-123',
        amountUSDC: '1000.00',
        bankAccount: validBankAccount,
      };

      await expect(offRampFlow.initiateOffRamp(request)).rejects.toThrow(
        'Cannot off-ramp: KYC verification pending'
      );
    });
  });

  describe('validateBankAccount', () => {
    it('should validate valid USD bank account', () => {
      const bankAccount: BankAccountInfo = {
        accountHolderName: 'John Doe',
        accountNumber: '123456789',
        routingNumber: '021000021',
        bankName: 'Chase Bank',
        accountType: 'checking',
        currency: 'USD',
      };

      const result = offRampFlow.validateBankAccount(bankAccount);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid international bank account with SWIFT', () => {
      const bankAccount: BankAccountInfo = {
        accountHolderName: 'Jane Smith',
        accountNumber: '987654321',
        swiftCode: 'CHASUS33',
        bankName: 'Chase Bank',
        accountType: 'checking',
        currency: 'EUR',
      };

      const result = offRampFlow.validateBankAccount(bankAccount);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing account holder name', () => {
      const bankAccount: BankAccountInfo = {
        accountHolderName: '',
        accountNumber: '123456789',
        routingNumber: '021000021',
        bankName: 'Chase Bank',
        currency: 'USD',
      };

      const result = offRampFlow.validateBankAccount(bankAccount);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Account holder name is required');
    });

    it('should reject USD account without routing number', () => {
      const bankAccount: BankAccountInfo = {
        accountHolderName: 'John Doe',
        accountNumber: '123456789',
        bankName: 'Chase Bank',
        currency: 'USD',
      };

      const result = offRampFlow.validateBankAccount(bankAccount);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Routing number is required for USD withdrawals');
    });

    it('should reject international account without SWIFT or IBAN', () => {
      const bankAccount: BankAccountInfo = {
        accountHolderName: 'Jane Smith',
        accountNumber: '987654321',
        bankName: 'European Bank',
        currency: 'EUR',
      };

      const result = offRampFlow.validateBankAccount(bankAccount);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SWIFT code or IBAN is required for international withdrawals');
    });

    it('should reject missing bank name', () => {
      const bankAccount: BankAccountInfo = {
        accountHolderName: 'John Doe',
        accountNumber: '123456789',
        routingNumber: '021000021',
        bankName: '',
        currency: 'USD',
      };

      const result = offRampFlow.validateBankAccount(bankAccount);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Bank name is required');
    });
  });

  describe('getSupportedCurrencies', () => {
    it('should return all supported currencies', () => {
      const currencies = offRampFlow.getSupportedCurrencies();

      expect(currencies).toHaveLength(3);
      expect(currencies.map(c => c.code)).toEqual(['USD', 'EUR', 'GBP']);
      expect(currencies.every(c => c.minAmount === 10)).toBe(true);
    });
  });
});
