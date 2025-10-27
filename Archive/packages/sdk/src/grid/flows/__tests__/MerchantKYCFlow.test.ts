/**
 * Unit Tests for MerchantKYCFlow
 */

import { MerchantKYCFlow, IndividualMerchantKYC, BusinessMerchantKYC } from '../MerchantKYCFlow';
import { GridClient } from '../../api/GridClient';
import { KYCStatusResponse } from '../../types/kyc';

// Mock GridClient
jest.mock('../../api/GridClient');

describe('MerchantKYCFlow', () => {
  let kycFlow: MerchantKYCFlow;
  let mockGridClient: jest.Mocked<GridClient>;

  beforeEach(() => {
    mockGridClient = new GridClient({
      apiUrl: 'https://test.api',
      apiKey: 'test-key',
      network: 'devnet',
    }) as jest.Mocked<GridClient>;

    kycFlow = new MerchantKYCFlow({ gridClient: mockGridClient });
  });

  describe('submitIndividualKYC', () => {
    it('should submit individual KYC successfully', async () => {
      const mockFile = new File(['test'], 'id.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 1024 * 100 }); // 100KB

      const kycData: IndividualMerchantKYC = {
        type: 'individual',
        tier: 'tier1',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'US',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102',
          country: 'US',
        },
        documents: [
          { type: 'id_card', file: mockFile },
          { type: 'proof_of_address', file: mockFile },
        ],
      };

      const mockResponse: KYCStatusResponse = {
        account_id: 'test-account-123',
        status: 'pending',
        tier: 'tier1',
        submitted_at: '2025-10-06T00:00:00Z',
      };

      mockGridClient.submitKYC = jest.fn().mockResolvedValue(mockResponse);

      const result = await kycFlow.submitIndividualKYC('test-account-123', kycData);

      expect(mockGridClient.submitKYC).toHaveBeenCalled();
      expect(result.status).toBe('pending');
      expect(result.tier).toBe('tier1');
    });

    it('should reject files larger than 10MB', async () => {
      const largeFile = new File(['test'], 'large.jpg', { type: 'image/jpeg' });
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 }); // 11MB

      const validFile = new File(['test'], 'proof.pdf', { type: 'application/pdf' });
      Object.defineProperty(validFile, 'size', { value: 1024 * 100 });

      const kycData: IndividualMerchantKYC = {
        type: 'individual',
        tier: 'tier1',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'US',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102',
          country: 'US',
        },
        documents: [
          { type: 'id_card', file: largeFile },
          { type: 'proof_of_address', file: validFile },
        ],
      };

      await expect(
        kycFlow.submitIndividualKYC('test-account-123', kycData)
      ).rejects.toThrow('exceeds 10MB limit');
    });

    it('should reject invalid file types', async () => {
      const invalidFile = new File(['test'], 'doc.txt', { type: 'text/plain' });
      Object.defineProperty(invalidFile, 'size', { value: 1024 });

      const validFile = new File(['test'], 'proof.pdf', { type: 'application/pdf' });
      Object.defineProperty(validFile, 'size', { value: 1024 * 100 });

      const kycData: IndividualMerchantKYC = {
        type: 'individual',
        tier: 'tier1',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'US',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102',
          country: 'US',
        },
        documents: [
          { type: 'id_card', file: invalidFile },
          { type: 'proof_of_address', file: validFile },
        ],
      };

      await expect(
        kycFlow.submitIndividualKYC('test-account-123', kycData)
      ).rejects.toThrow('invalid file type');
    });

    it('should reject files smaller than 1KB', async () => {
      const tinyFile = new File(['x'], 'tiny.jpg', { type: 'image/jpeg' });
      Object.defineProperty(tinyFile, 'size', { value: 10 }); // 10 bytes

      const validFile = new File(['test'], 'proof.pdf', { type: 'application/pdf' });
      Object.defineProperty(validFile, 'size', { value: 1024 * 100 });

      const kycData: IndividualMerchantKYC = {
        type: 'individual',
        tier: 'tier1',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'US',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102',
          country: 'US',
        },
        documents: [
          { type: 'id_card', file: tinyFile },
          { type: 'proof_of_address', file: validFile },
        ],
      };

      await expect(
        kycFlow.submitIndividualKYC('test-account-123', kycData)
      ).rejects.toThrow('too small');
    });

    it('should reject missing required documents', async () => {
      const mockFile = new File(['test'], 'id.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 1024 * 100 });

      const kycData: IndividualMerchantKYC = {
        type: 'individual',
        tier: 'tier1',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'US',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102',
          country: 'US',
        },
        documents: [
          { type: 'id_card', file: mockFile },
          // Missing proof_of_address
        ],
      };

      await expect(
        kycFlow.submitIndividualKYC('test-account-123', kycData)
      ).rejects.toThrow('Missing required documents');
    });
  });

  describe('submitBusinessKYC', () => {
    it('should submit business KYC successfully', async () => {
      const mockFile = new File(['test'], 'license.pdf', { type: 'application/pdf' });
      Object.defineProperty(mockFile, 'size', { value: 1024 * 500 }); // 500KB

      const kycData: BusinessMerchantKYC = {
        type: 'business',
        tier: 'tier3',
        businessName: 'Acme Corp',
        businessType: 'corporation',
        taxId: '12-3456789',
        incorporationDate: '2020-01-01',
        businessAddress: {
          street: '456 Business Blvd',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
        },
        beneficialOwner: {
          firstName: 'Jane',
          lastName: 'Smith',
          dateOfBirth: '1985-05-15',
          nationality: 'US',
        },
        documents: [
          { type: 'business_license', file: mockFile },
          { type: 'articles_of_incorporation', file: mockFile },
          { type: 'id_card', file: mockFile },
        ],
      };

      const mockResponse: KYCStatusResponse = {
        account_id: 'test-account-456',
        status: 'pending',
        tier: 'tier3',
        submitted_at: '2025-10-06T00:00:00Z',
      };

      mockGridClient.submitKYC = jest.fn().mockResolvedValue(mockResponse);

      const result = await kycFlow.submitBusinessKYC('test-account-456', kycData);

      expect(mockGridClient.submitKYC).toHaveBeenCalled();
      expect(result.status).toBe('pending');
      expect(result.tier).toBe('tier3');
    });
  });

  describe('isKYCApproved', () => {
    it('should return true if KYC is approved', async () => {
      const mockStatus: KYCStatusResponse = {
        account_id: 'test-account-123',
        status: 'approved',
        tier: 'tier1',
        submitted_at: '2025-10-06T00:00:00Z',
        approved_at: '2025-10-07T00:00:00Z',
      };

      mockGridClient.getKYCStatus = jest.fn().mockResolvedValue(mockStatus);

      const result = await kycFlow.isKYCApproved('test-account-123');

      expect(result).toBe(true);
    });

    it('should return false if KYC is pending', async () => {
      const mockStatus: KYCStatusResponse = {
        account_id: 'test-account-123',
        status: 'pending',
        tier: 'tier1',
        submitted_at: '2025-10-06T00:00:00Z',
      };

      mockGridClient.getKYCStatus = jest.fn().mockResolvedValue(mockStatus);

      const result = await kycFlow.isKYCApproved('test-account-123');

      expect(result).toBe(false);
    });
  });

  describe('waitForKYCApproval', () => {
    it('should resolve when KYC is approved', async () => {
      const mockStatus: KYCStatusResponse = {
        account_id: 'test-account-123',
        status: 'approved',
        tier: 'tier1',
        submitted_at: '2025-10-06T00:00:00Z',
        approved_at: '2025-10-07T00:00:00Z',
      };

      mockGridClient.getKYCStatus = jest.fn().mockResolvedValue(mockStatus);

      const result = await kycFlow.waitForKYCApproval('test-account-123', {
        pollInterval: 100,
        maxWaitTime: 5000,
      });

      expect(result.status).toBe('approved');
    });

    it('should reject if KYC is rejected', async () => {
      const mockStatus: KYCStatusResponse = {
        account_id: 'test-account-123',
        status: 'rejected',
        tier: 'tier1',
        submitted_at: '2025-10-06T00:00:00Z',
        rejection_reason: 'Invalid document',
      };

      mockGridClient.getKYCStatus = jest.fn().mockResolvedValue(mockStatus);

      await expect(
        kycFlow.waitForKYCApproval('test-account-123', {
          pollInterval: 100,
          maxWaitTime: 5000,
        })
      ).rejects.toThrow('KYC rejected: Invalid document');
    });

    it('should timeout if approval takes too long', async () => {
      const mockStatus: KYCStatusResponse = {
        account_id: 'test-account-123',
        status: 'pending',
        tier: 'tier1',
        submitted_at: '2025-10-06T00:00:00Z',
      };

      mockGridClient.getKYCStatus = jest.fn().mockResolvedValue(mockStatus);

      await expect(
        kycFlow.waitForKYCApproval('test-account-123', {
          pollInterval: 100,
          maxWaitTime: 500,
        })
      ).rejects.toThrow('KYC approval timeout');
    }, 10000);
  });
});
