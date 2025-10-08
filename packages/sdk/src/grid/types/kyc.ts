/**
 * KYC Types for Grid Integration
 * Based on Grid API documentation
 */

export type KYCTier = 'tier1' | 'tier2' | 'tier3';
export type KYCStatus = 'not_started' | 'pending' | 'approved' | 'rejected' | 'expired';
export type DocumentType = 'id_card' | 'passport' | 'drivers_license' | 'proof_of_address' | 'business_license' | 'articles_of_incorporation';

export interface KYCDocument {
  type: DocumentType;
  file: File | Blob;
  fileName?: string;
}

export interface KYCSubmissionRequest {
  account_id: string;
  tier: KYCTier;
  // Individual KYC
  first_name?: string;
  last_name?: string;
  date_of_birth?: string; // ISO 8601 format
  nationality?: string;
  address?: {
    street: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
  };
  // Business KYC (KYB)
  business_name?: string;
  business_type?: 'llc' | 'corporation' | 'partnership' | 'sole_proprietorship';
  tax_id?: string; // EIN for US businesses
  incorporation_date?: string;
  business_address?: {
    street: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
  };
  documents: KYCDocument[];
}

export interface KYCStatusResponse {
  account_id: string;
  status: KYCStatus;
  tier: KYCTier;
  kyc_type: 'individual' | 'business';
  submitted_at?: string;
  reviewed_at?: string;
  approved_at?: string;
  expires_at?: string;
  rejection_reason?: string;
  required_documents?: DocumentType[];
  submitted_documents?: {
    type: DocumentType;
    status: 'pending' | 'approved' | 'rejected';
    uploaded_at: string;
  }[];
}

export interface KYCLimits {
  tier: KYCTier;
  daily_limit: string;   // In USD
  monthly_limit: string; // In USD
  annual_limit: string;  // In USD
  per_transaction_limit: string;
}

// KYC Tier Requirements
export const KYC_TIER_REQUIREMENTS: Record<KYCTier, {
  description: string;
  requiredDocuments: DocumentType[];
  limits: {
    daily: string;
    monthly: string;
    annual: string;
  };
}> = {
  tier1: {
    description: 'Basic verification for individuals',
    requiredDocuments: ['id_card', 'proof_of_address'],
    limits: {
      daily: '$10,000',
      monthly: '$50,000',
      annual: '$500,000',
    },
  },
  tier2: {
    description: 'Enhanced verification for high-volume users',
    requiredDocuments: ['passport', 'proof_of_address'],
    limits: {
      daily: '$50,000',
      monthly: '$250,000',
      annual: '$2,500,000',
    },
  },
  tier3: {
    description: 'Business verification (KYB)',
    requiredDocuments: ['business_license', 'articles_of_incorporation', 'id_card'],
    limits: {
      daily: '$100,000',
      monthly: '$1,000,000',
      annual: 'Unlimited',
    },
  },
};
