/**
 * Unit Tests for SubscriberFlow
 */

import { PublicKey } from '@solana/web3.js';
import { SubscriberFlow } from '../SubscriberFlow';
import { GridClient } from '../../api/GridClient';
import { GridAccount, OTPResponse } from '../../types/grid';

// Mock GridClient
jest.mock('../../api/GridClient');

describe('SubscriberFlow', () => {
  let subscriberFlow: SubscriberFlow;
  let mockGridClient: jest.Mocked<GridClient>;

  beforeEach(() => {
    // Create mocked GridClient
    mockGridClient = new GridClient({
      apiUrl: 'https://test.api',
      apiKey: 'test-key',
      network: 'devnet',
    }) as jest.Mocked<GridClient>;

    subscriberFlow = new SubscriberFlow({ gridClient: mockGridClient });
  });

  describe('createSubscriber', () => {
    it('should create subscriber with email account', async () => {
      const mockAccount: GridAccount = {
        account_id: 'test-account-123',
        account_type: 'USDC',
        email: 'subscriber@example.com',
        public_key: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        status: 'pending_verification',
        balance: '0',
        created_at: '2025-10-06T00:00:00Z',
      };

      mockGridClient.createEmailAccount = jest.fn().mockResolvedValue(mockAccount);

      const result = await subscriberFlow.createSubscriber('subscriber@example.com');

      expect(mockGridClient.createEmailAccount).toHaveBeenCalledWith(
        'subscriber@example.com',
        'USDC'
      );
      expect(result.gridAccount).toEqual(mockAccount);
      expect(result.subscriberPublicKey).toBeInstanceOf(PublicKey);
      expect(result.subscriberPublicKey.toString()).toBe(mockAccount.public_key);
      expect(result.awaitingOTP).toBe(true);
    });

    it('should throw error if email is invalid', async () => {
      mockGridClient.createEmailAccount = jest.fn().mockRejectedValue(
        new Error('Grid API Error 400: Invalid email format')
      );

      await expect(
        subscriberFlow.createSubscriber('invalid-email')
      ).rejects.toThrow('Grid API Error 400: Invalid email format');
    });
  });

  describe('verifyOTP', () => {
    it('should verify OTP and return subscriber public key', async () => {
      const mockOTPResponse: OTPResponse = {
        verified: true,
        account: {
          account_id: 'test-account-123',
          account_type: 'USDC',
          email: 'subscriber@example.com',
          public_key: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
          status: 'active',
          balance: '0',
          created_at: '2025-10-06T00:00:00Z',
        },
      };

      mockGridClient.verifyOTP = jest.fn().mockResolvedValue(mockOTPResponse);

      const result = await subscriberFlow.verifyOTP('test-account-123', '123456');

      expect(mockGridClient.verifyOTP).toHaveBeenCalledWith('test-account-123', '123456');
      expect(result).toBeInstanceOf(PublicKey);
      expect(result.toString()).toBe('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');
    });

    it('should throw error if OTP is invalid', async () => {
      mockGridClient.verifyOTP = jest.fn().mockRejectedValue(
        new Error('Grid API Error 401: Invalid OTP code')
      );

      await expect(
        subscriberFlow.verifyOTP('test-account-123', '000000')
      ).rejects.toThrow('Grid API Error 401: Invalid OTP code');
    });
  });

  describe('getBalance', () => {
    it('should return subscriber balance', async () => {
      mockGridClient.getAccountBalance = jest.fn().mockResolvedValue('1000000000'); // 1000 USDC in lamports

      const balance = await subscriberFlow.getBalance('test-account-123');

      expect(mockGridClient.getAccountBalance).toHaveBeenCalledWith('test-account-123');
      expect(balance).toBe('1000000000');
    });

    it('should handle zero balance', async () => {
      mockGridClient.getAccountBalance = jest.fn().mockResolvedValue('0');

      const balance = await subscriberFlow.getBalance('test-account-123');

      expect(balance).toBe('0');
    });
  });

  describe('edge cases', () => {
    it('should handle network errors gracefully', async () => {
      mockGridClient.createEmailAccount = jest.fn().mockRejectedValue(
        new Error('Network timeout')
      );

      await expect(
        subscriberFlow.createSubscriber('test@example.com')
      ).rejects.toThrow('Network timeout');
    });

    it('should create subscriber with USDC by default', async () => {
      const mockAccount: GridAccount = {
        account_id: 'test-account-456',
        account_type: 'USDC',
        email: 'subscriber@example.com',
        public_key: '8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV',
        status: 'pending_verification',
        balance: '0',
        created_at: '2025-10-06T00:00:00Z',
      };

      mockGridClient.createEmailAccount = jest.fn().mockResolvedValue(mockAccount);

      const result = await subscriberFlow.createSubscriber('subscriber@example.com');

      expect(mockGridClient.createEmailAccount).toHaveBeenCalledWith(
        'subscriber@example.com',
        'USDC'
      );
      expect(result.gridAccount.account_type).toBe('USDC');
    });
  });
});
