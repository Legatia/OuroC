// Storage adapter interface for payment history indexing

export interface PaymentRecord {
  subscriptionId: string
  subscriber: string // Solana address
  merchant: string // Solana address
  amount: string // Store as string to preserve precision
  timestamp: number
  paymentNumber: number
  txSignature: string
  tokenMint?: string
}

export interface PaymentStats {
  totalPayments: number
  totalVolume: string
  uniqueSubscribers: number
  uniqueMerchants: number
  firstPayment?: number
  lastPayment?: number
}

export interface QueryOptions {
  limit?: number
  offset?: number
  startTime?: number
  endTime?: number
  sortBy?: 'timestamp' | 'amount'
  sortOrder?: 'asc' | 'desc'
}

export interface StorageAdapter {
  /**
   * Connect to the storage backend
   */
  connect(): Promise<void>

  /**
   * Disconnect from the storage backend
   */
  disconnect(): Promise<void>

  /**
   * Save a single payment record
   */
  savePayment(payment: PaymentRecord): Promise<void>

  /**
   * Save multiple payment records in batch
   */
  savePayments(payments: PaymentRecord[]): Promise<void>

  /**
   * Get all payments for a specific merchant
   */
  getPaymentsByMerchant(merchantAddress: string, options?: QueryOptions): Promise<PaymentRecord[]>

  /**
   * Get all payments for a specific subscription
   */
  getPaymentsBySubscription(subscriptionId: string, options?: QueryOptions): Promise<PaymentRecord[]>

  /**
   * Get payment statistics for a merchant
   */
  getStats(merchantAddress: string): Promise<PaymentStats>
}
