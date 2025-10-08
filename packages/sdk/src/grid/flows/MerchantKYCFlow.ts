/**
 * Merchant KYC Flow
 * Handle KYC verification for Grid merchant accounts
 */

import { GridClient } from '../api/GridClient';
import {
  KYCSubmissionRequest,
  KYCStatusResponse,
  KYCTier,
  KYCDocument,
  DocumentType,
  KYC_TIER_REQUIREMENTS,
} from '../types/kyc';

export interface MerchantKYCConfig {
  gridClient: GridClient;
}

export interface IndividualMerchantKYC {
  type: 'individual';
  tier: 'tier1' | 'tier2';
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  nationality: string;
  address: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  documents: KYCDocument[];
}

export interface BusinessMerchantKYC {
  type: 'business';
  tier: 'tier3';
  businessName: string;
  businessType: 'llc' | 'corporation' | 'partnership' | 'sole_proprietorship';
  taxId: string; // EIN for US businesses
  incorporationDate: string; // YYYY-MM-DD
  businessAddress: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  // Beneficial owner info (required for business KYC)
  beneficialOwner: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
  };
  documents: KYCDocument[];
}

export type MerchantKYCSubmission = IndividualMerchantKYC | BusinessMerchantKYC;

export class MerchantKYCFlow {
  private gridClient: GridClient;

  constructor(config: MerchantKYCConfig) {
    this.gridClient = config.gridClient;
  }

  /**
   * Submit KYC for individual merchant
   */
  async submitIndividualKYC(
    gridAccountId: string,
    kycData: IndividualMerchantKYC
  ): Promise<KYCStatusResponse> {
    console.log(`[Grid KYC] Submitting individual KYC for merchant: ${gridAccountId}`);
    console.log(`[Grid KYC] Tier: ${kycData.tier}`);

    // Validate documents
    this.validateDocuments(kycData.tier, kycData.documents);

    const request: KYCSubmissionRequest = {
      account_id: gridAccountId,
      tier: kycData.tier,
      first_name: kycData.firstName,
      last_name: kycData.lastName,
      date_of_birth: kycData.dateOfBirth,
      nationality: kycData.nationality,
      address: {
        street: kycData.address.street,
        city: kycData.address.city,
        state: kycData.address.state,
        postal_code: kycData.address.postalCode,
        country: kycData.address.country,
      },
      documents: kycData.documents,
    };

    const response = await this.gridClient.submitKYC(request);
    console.log(`[Grid KYC] ✅ Submission complete. Status: ${response.status}`);

    return response;
  }

  /**
   * Submit KYC for business merchant (KYB)
   */
  async submitBusinessKYC(
    gridAccountId: string,
    kycData: BusinessMerchantKYC
  ): Promise<KYCStatusResponse> {
    console.log(`[Grid KYC] Submitting business KYC for merchant: ${gridAccountId}`);
    console.log(`[Grid KYC] Business: ${kycData.businessName}`);

    // Validate documents (Tier 3 required for business)
    this.validateDocuments('tier3', kycData.documents);

    const request: KYCSubmissionRequest = {
      account_id: gridAccountId,
      tier: 'tier3',
      business_name: kycData.businessName,
      business_type: kycData.businessType,
      tax_id: kycData.taxId,
      incorporation_date: kycData.incorporationDate,
      business_address: {
        street: kycData.businessAddress.street,
        city: kycData.businessAddress.city,
        state: kycData.businessAddress.state,
        postal_code: kycData.businessAddress.postalCode,
        country: kycData.businessAddress.country,
      },
      // Beneficial owner (required for business KYC)
      first_name: kycData.beneficialOwner.firstName,
      last_name: kycData.beneficialOwner.lastName,
      date_of_birth: kycData.beneficialOwner.dateOfBirth,
      nationality: kycData.beneficialOwner.nationality,
      documents: kycData.documents,
    };

    const response = await this.gridClient.submitKYC(request);
    console.log(`[Grid KYC] ✅ Submission complete. Status: ${response.status}`);

    return response;
  }

  /**
   * Get KYC status for merchant account
   */
  async getKYCStatus(gridAccountId: string): Promise<KYCStatusResponse> {
    return await this.gridClient.getKYCStatus(gridAccountId);
  }

  /**
   * Check if KYC is approved
   */
  async isKYCApproved(gridAccountId: string): Promise<boolean> {
    const status = await this.getKYCStatus(gridAccountId);
    return status.status === 'approved';
  }

  /**
   * Wait for KYC approval (polling)
   */
  async waitForKYCApproval(
    gridAccountId: string,
    options: {
      pollInterval?: number; // ms
      maxWaitTime?: number; // ms
      onStatusChange?: (status: KYCStatusResponse) => void;
    } = {}
  ): Promise<KYCStatusResponse> {
    const pollInterval = options.pollInterval || 10000; // 10 seconds
    const maxWaitTime = options.maxWaitTime || 7 * 24 * 60 * 60 * 1000; // 7 days

    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getKYCStatus(gridAccountId);

      if (options.onStatusChange) {
        options.onStatusChange(status);
      }

      if (status.status === 'approved') {
        return status;
      }

      if (status.status === 'rejected') {
        throw new Error(`KYC rejected: ${status.rejection_reason || 'No reason provided'}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('KYC approval timeout');
  }

  /**
   * Get required documents for tier
   */
  getRequiredDocuments(tier: KYCTier): DocumentType[] {
    return KYC_TIER_REQUIREMENTS[tier].requiredDocuments;
  }

  /**
   * Get tier information
   */
  getTierInfo(tier: KYCTier) {
    return KYC_TIER_REQUIREMENTS[tier];
  }

  /**
   * Validate documents against tier requirements
   */
  private validateDocuments(tier: KYCTier, documents: KYCDocument[]): void {
    const required = KYC_TIER_REQUIREMENTS[tier].requiredDocuments;
    const providedTypes = documents.map(d => d.type);

    const missing = required.filter(type => !providedTypes.includes(type));

    if (missing.length > 0) {
      throw new Error(
        `Missing required documents for ${tier}: ${missing.join(', ')}`
      );
    }

    // Validate file sizes and types
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_MIME_TYPES = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf',
    ];

    documents.forEach(doc => {
      // File size validation
      if (doc.file.size > MAX_FILE_SIZE) {
        throw new Error(
          `Document "${doc.type}" exceeds 10MB limit (${(doc.file.size / 1024 / 1024).toFixed(2)}MB)`
        );
      }

      // File type validation
      if (!ALLOWED_MIME_TYPES.includes(doc.file.type)) {
        throw new Error(
          `Document "${doc.type}" has invalid file type: ${doc.file.type}. Allowed: JPG, PNG, PDF`
        );
      }

      // Minimum file size (avoid empty files)
      if (doc.file.size < 1024) { // 1KB minimum
        throw new Error(
          `Document "${doc.type}" is too small (${doc.file.size} bytes). Minimum: 1KB`
        );
      }

      // File name validation (avoid path traversal)
      if (doc.fileName && (doc.fileName.includes('..') || doc.fileName.includes('/'))) {
        throw new Error(
          `Document "${doc.type}" has invalid file name: ${doc.fileName}`
        );
      }
    });
  }

  /**
   * Helper: Create KYC document from file input
   */
  createDocument(type: DocumentType, file: File): KYCDocument {
    return {
      type,
      file,
      fileName: file.name,
    };
  }
}

/**
 * Usage Example - Individual Merchant:
 *
 * const kycFlow = new MerchantKYCFlow({ gridClient });
 *
 * // Submit individual merchant KYC (Tier 1)
 * const status = await kycFlow.submitIndividualKYC(gridAccountId, {
 *   type: 'individual',
 *   tier: 'tier1',
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   dateOfBirth: '1990-01-01',
 *   nationality: 'US',
 *   address: {
 *     street: '123 Main St',
 *     city: 'San Francisco',
 *     state: 'CA',
 *     postalCode: '94102',
 *     country: 'US'
 *   },
 *   documents: [
 *     { type: 'drivers_license', file: idFile },
 *     { type: 'proof_of_address', file: addressFile }
 *   ]
 * });
 *
 * // Wait for approval
 * await kycFlow.waitForKYCApproval(gridAccountId, {
 *   onStatusChange: (status) => {
 *     console.log('KYC status:', status.status);
 *   }
 * });
 */

/**
 * Usage Example - Business Merchant:
 *
 * const kycFlow = new MerchantKYCFlow({ gridClient });
 *
 * // Submit business KYC (Tier 3)
 * const status = await kycFlow.submitBusinessKYC(gridAccountId, {
 *   type: 'business',
 *   tier: 'tier3',
 *   businessName: 'Acme Corp',
 *   businessType: 'llc',
 *   taxId: '12-3456789',
 *   incorporationDate: '2020-01-01',
 *   businessAddress: {
 *     street: '456 Business Blvd',
 *     city: 'New York',
 *     state: 'NY',
 *     postalCode: '10001',
 *     country: 'US'
 *   },
 *   beneficialOwner: {
 *     firstName: 'Jane',
 *     lastName: 'Smith',
 *     dateOfBirth: '1985-05-15',
 *     nationality: 'US'
 *   },
 *   documents: [
 *     { type: 'business_license', file: licenseFile },
 *     { type: 'articles_of_incorporation', file: articlesFile },
 *     { type: 'id_card', file: ownerIdFile }
 *   ]
 * });
 *
 * // Check if approved
 * const isApproved = await kycFlow.isKYCApproved(gridAccountId);
 */
