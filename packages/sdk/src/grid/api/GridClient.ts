/**
 * Grid API Client
 * Wrapper for Squads Grid API v1
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  GridConfig,
  GridEmailAccount,
  GridSignerAccount,
  GridAccount,
  OTPVerification,
  OTPResponse,
  MultisigConfig,
  MultisigAccount,
  PrepareTransactionRequest,
  PreparedTransaction,
  SubmitTransactionRequest,
  SubmitTransactionResponse,
  CreateStandingOrderRequest,
  StandingOrder,
  SpendingLimit,
  GridError,
} from '../types/grid';
import {
  KYCSubmissionRequest,
  KYCStatusResponse,
  KYCLimits,
} from '../types/kyc';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class GridClient {
  private client: AxiosInstance;
  private config: GridConfig;

  // Caching layer
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly CACHE_TTL = {
    KYC_STATUS: 5 * 60 * 1000,      // 5 minutes
    ACCOUNT_BALANCE: 1 * 60 * 1000,  // 1 minute
    ACCOUNT_INFO: 5 * 60 * 1000,     // 5 minutes
  };

  constructor(config: GridConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'x-squads-network': config.network, // Required by Grid API
      },
    });

    // Add retry interceptor
    this.setupRetryInterceptor();
  }

  /**
   * Setup Axios retry interceptor with exponential backoff
   */
  private setupRetryInterceptor(): void {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second base delay

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;

        // Don't retry if no config or max retries reached
        if (!config || config.__retryCount >= MAX_RETRIES) {
          return Promise.reject(error);
        }

        // Initialize retry count
        config.__retryCount = config.__retryCount || 0;

        // Only retry on network errors or 5xx errors
        const shouldRetry =
          !error.response || // Network error
          (error.response.status >= 500 && error.response.status < 600); // Server error

        if (!shouldRetry) {
          return Promise.reject(error);
        }

        // Increment retry count
        config.__retryCount += 1;

        // Calculate exponential backoff delay
        const delay = RETRY_DELAY * Math.pow(2, config.__retryCount - 1);

        console.log(
          `[GridClient] Retry ${config.__retryCount}/${MAX_RETRIES} after ${delay}ms for ${config.url}`
        );

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Retry the request
        return this.client(config);
      }
    );
  }

  /**
   * Get cached data if available and not expired
   */
  private getFromCache<T>(key: string, ttl: number): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store data in cache
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache entry
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  // ============================================================================
  // Account Management
  // ============================================================================

  /**
   * Create email-based Grid account (for subscribers)
   */
  async createEmailAccount(email: string, accountType: 'USDC' | 'USDT' | 'SOL' = 'USDC'): Promise<GridAccount> {
    try {
      const payload: GridEmailAccount = {
        type: 'email',
        email,
        account_type: accountType,
      };

      const response = await this.client.post<GridAccount>('/accounts', payload);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create signer-based Grid account (for programmatic access or multisig)
   */
  async createSignerAccount(
    config: {
      type: 'signer' | 'signers';
      signer_public_key?: string;       // For single signer
      signers?: string[];                // For multisig
      threshold?: number;                // For multisig
      account_type: 'USDC' | 'USDT' | 'SOL';
      name?: string;
      description?: string;
    }
  ): Promise<GridAccount> {
    try {
      const payload = {
        type: config.type,
        ...(config.type === 'signer' && { signer_public_key: config.signer_public_key }),
        ...(config.type === 'signers' && {
          signers: config.signers,
          threshold: config.threshold
        }),
        account_type: config.account_type,
        name: config.name,
        description: config.description,
      };

      const response = await this.client.post<GridAccount>('/accounts', payload);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Verify OTP for email account
   */
  async verifyOTP(accountId: string, otpCode: string): Promise<OTPResponse> {
    try {
      const payload: OTPVerification = {
        account_id: accountId,
        otp_code: otpCode,
      };

      const response = await this.client.post<OTPResponse>(`/accounts/${accountId}/verify-otp`, payload);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get account details
   */
  async getAccount(accountId: string): Promise<GridAccount> {
    const cacheKey = `account:${accountId}`;
    const cached = this.getFromCache<GridAccount>(cacheKey, this.CACHE_TTL.ACCOUNT_INFO);
    if (cached) return cached;

    try {
      const response = await this.client.get<GridAccount>(`/accounts/${accountId}`);
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId: string): Promise<string> {
    const cacheKey = `balance:${accountId}`;
    const cached = this.getFromCache<string>(cacheKey, this.CACHE_TTL.ACCOUNT_BALANCE);
    if (cached) return cached;

    try {
      const account = await this.getAccount(accountId);
      this.setCache(cacheKey, account.balance);
      return account.balance;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Multisig Management
  // ============================================================================

  /**
   * Create multisig account (for merchants)
   */
  async createMultisigAccount(config: MultisigConfig): Promise<MultisigAccount> {
    try {
      const response = await this.client.post<MultisigAccount>('/accounts/multisig', config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update multisig configuration
   */
  async updateMultisigConfig(accountId: string, config: Partial<MultisigConfig>): Promise<MultisigAccount> {
    try {
      const response = await this.client.patch<MultisigAccount>(`/accounts/${accountId}/multisig`, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get pending approvals for multisig account
   */
  async getPendingApprovals(accountId: string): Promise<PreparedTransaction[]> {
    try {
      const response = await this.client.get<PreparedTransaction[]>(`/accounts/${accountId}/pending-approvals`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Transaction Management
  // ============================================================================

  /**
   * Prepare arbitrary transaction (e.g., OuroC subscription delegation)
   */
  async prepareTransaction(request: PrepareTransactionRequest): Promise<PreparedTransaction> {
    try {
      const response = await this.client.post<PreparedTransaction>(
        `/accounts/${request.account_id}/transactions/prepare-arbitrary`,
        request
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Submit signed transaction
   */
  async submitTransaction(request: SubmitTransactionRequest): Promise<SubmitTransactionResponse> {
    try {
      const response = await this.client.post<SubmitTransactionResponse>(
        `/accounts/${request.account_id}/transactions/submit`,
        request
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(accountId: string, transactionId: string): Promise<SubmitTransactionResponse> {
    try {
      const response = await this.client.get<SubmitTransactionResponse>(
        `/accounts/${accountId}/transactions/${transactionId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Standing Orders (NOT USED - OuroC uses ICP timer mechanism)
  // ============================================================================
  // NOTE: Grid standing orders are available but we use ICP canister timers
  // for subscription payment triggers to maintain OuroC's original architecture

  // ============================================================================
  // KYC Management
  // ============================================================================

  /**
   * Submit KYC documents for verification
   */
  async submitKYC(request: KYCSubmissionRequest): Promise<KYCStatusResponse> {
    try {
      const formData = new FormData();
      formData.append('account_id', request.account_id);
      formData.append('tier', request.tier);

      // Individual KYC fields
      if (request.first_name) formData.append('first_name', request.first_name);
      if (request.last_name) formData.append('last_name', request.last_name);
      if (request.date_of_birth) formData.append('date_of_birth', request.date_of_birth);
      if (request.nationality) formData.append('nationality', request.nationality);
      if (request.address) formData.append('address', JSON.stringify(request.address));

      // Business KYC fields
      if (request.business_name) formData.append('business_name', request.business_name);
      if (request.business_type) formData.append('business_type', request.business_type);
      if (request.tax_id) formData.append('tax_id', request.tax_id);
      if (request.incorporation_date) formData.append('incorporation_date', request.incorporation_date);
      if (request.business_address) formData.append('business_address', JSON.stringify(request.business_address));

      // Attach documents
      request.documents.forEach((doc, index) => {
        formData.append(`documents[${index}][type]`, doc.type);
        formData.append(`documents[${index}][file]`, doc.file, doc.fileName || `document_${index}`);
      });

      const response = await this.client.post<KYCStatusResponse>('/kyc/submit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get KYC status for account
   */
  async getKYCStatus(accountId: string): Promise<KYCStatusResponse> {
    const cacheKey = `kyc:${accountId}`;
    const cached = this.getFromCache<KYCStatusResponse>(cacheKey, this.CACHE_TTL.KYC_STATUS);
    if (cached) return cached;

    try {
      const response = await this.client.get<KYCStatusResponse>(`/accounts/${accountId}/kyc`);
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get KYC limits for tier
   */
  async getKYCLimits(tier: string): Promise<KYCLimits> {
    try {
      const response = await this.client.get<KYCLimits>(`/kyc/limits/${tier}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Spending Limits
  // ============================================================================

  /**
   * Set spending limits for account
   */
  async setSpendingLimits(limit: SpendingLimit): Promise<SpendingLimit> {
    try {
      const response = await this.client.post<SpendingLimit>(
        `/accounts/${limit.account_id}/spending-limits`,
        limit
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get spending limits for account
   */
  async getSpendingLimits(accountId: string): Promise<SpendingLimit> {
    try {
      const response = await this.client.get<SpendingLimit>(
        `/accounts/${accountId}/spending-limits`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<GridError>;
      if (axiosError.response?.data) {
        const gridError = axiosError.response.data;
        return new Error(`Grid API Error ${gridError.code}: ${gridError.message}`);
      }
      return new Error(`Grid API Request Failed: ${axiosError.message}`);
    }
    return error as Error;
  }
}
