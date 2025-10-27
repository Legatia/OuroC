import { PinataSDK } from 'pinata-web3'
import type {
  StorageAdapter,
  PaymentRecord,
  PaymentStats,
  QueryOptions
} from './types'

export interface IPFSAdapterConfig {
  pinataJwt: string
  pinataGateway?: string
}

interface IPFSPaymentData {
  payments: PaymentRecord[]
  metadata: {
    merchantAddress?: string
    subscriptionId?: string
    createdAt: number
    updatedAt: number
  }
}

/**
 * IPFS/Pinata storage adapter for @ouroc payment history
 *
 * Storage Strategy:
 * - Each merchant gets their own IPFS file (JSON)
 * - File contains array of payment records
 * - File is updated (new CID) when new payments arrive
 * - Uses Pinata keyvalues for indexing/querying
 * - Old CIDs are unpinned to save storage
 */
export class IPFSAdapter implements StorageAdapter {
  private pinata: PinataSDK
  private gateway: string
  private connected: boolean = false

  // Cache of merchant -> CID mappings
  private merchantCIDCache: Map<string, string> = new Map()

  constructor(config: IPFSAdapterConfig) {
    this.pinata = new PinataSDK({
      pinataJwt: config.pinataJwt,
      pinataGateway: config.pinataGateway || 'gateway.pinata.cloud'
    })
    this.gateway = config.pinataGateway || 'gateway.pinata.cloud'
  }

  async connect(): Promise<void> {
    try {
      // Test connection by checking authentication
      await this.pinata.testAuthentication()
      this.connected = true

      // Load existing merchant CID mappings from Pinata
      await this.loadMerchantCIDCache()
    } catch (error) {
      throw new Error(`Failed to connect to IPFS/Pinata: ${error}`)
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.merchantCIDCache.clear()
  }

  /**
   * Load existing merchant -> CID mappings from Pinata metadata
   */
  private async loadMerchantCIDCache(): Promise<void> {
    try {
      const files = await this.pinata.files.list()
        .keyValue('ourocpay', 'true')
        .keyValue('type', 'merchant-payments')

      for (const file of files.files) {
        const merchantAddress = file.keyvalues?.merchantAddress
        if (merchantAddress && file.ipfs_pin_hash) {
          this.merchantCIDCache.set(merchantAddress, file.ipfs_pin_hash)
        }
      }
    } catch (error) {
      console.warn('Failed to load merchant CID cache:', error)
    }
  }

  async savePayment(payment: PaymentRecord): Promise<void> {
    await this.savePayments([payment])
  }

  async savePayments(payments: PaymentRecord[]): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to IPFS. Call connect() first.')
    }

    // Group payments by merchant
    const paymentsByMerchant = new Map<string, PaymentRecord[]>()

    for (const payment of payments) {
      const existing = paymentsByMerchant.get(payment.merchant) || []
      existing.push(payment)
      paymentsByMerchant.set(payment.merchant, existing)
    }

    // Update each merchant's file
    for (const [merchantAddress, merchantPayments] of paymentsByMerchant) {
      await this.updateMerchantFile(merchantAddress, merchantPayments)
    }
  }

  /**
   * Update a merchant's payment file on IPFS
   */
  private async updateMerchantFile(
    merchantAddress: string,
    newPayments: PaymentRecord[]
  ): Promise<void> {
    let existingData: IPFSPaymentData | null = null
    const oldCID = this.merchantCIDCache.get(merchantAddress)

    // Fetch existing data if available
    if (oldCID) {
      try {
        existingData = await this.fetchIPFSData(oldCID)
      } catch (error) {
        console.warn(`Failed to fetch existing data for ${merchantAddress}:`, error)
      }
    }

    // Merge new payments with existing
    const allPayments = [
      ...(existingData?.payments || []),
      ...newPayments
    ]

    // Deduplicate by txSignature
    const uniquePayments = Array.from(
      new Map(allPayments.map(p => [p.txSignature, p])).values()
    )

    // Sort by timestamp descending (newest first)
    uniquePayments.sort((a, b) => b.timestamp - a.timestamp)

    const updatedData: IPFSPaymentData = {
      payments: uniquePayments,
      metadata: {
        merchantAddress,
        createdAt: existingData?.metadata.createdAt || Date.now(),
        updatedAt: Date.now()
      }
    }

    // Upload to IPFS
    const blob = new Blob([JSON.stringify(updatedData, null, 2)], {
      type: 'application/json'
    })
    const file = new File([blob], `merchant-${merchantAddress}.json`)

    const upload = await this.pinata.upload.file(file).addMetadata({
      name: `OuroC Merchant Payments: ${merchantAddress}`,
      keyvalues: {
        ourocpay: 'true',
        type: 'merchant-payments',
        merchantAddress,
        paymentCount: String(uniquePayments.length),
        lastUpdated: String(Date.now())
      }
    })

    const newCID = upload.IpfsHash

    // Update cache
    this.merchantCIDCache.set(merchantAddress, newCID)

    // Unpin old CID to save storage
    if (oldCID && oldCID !== newCID) {
      try {
        await this.pinata.unpin([oldCID])
      } catch (error) {
        console.warn(`Failed to unpin old CID ${oldCID}:`, error)
      }
    }
  }

  /**
   * Fetch data from IPFS by CID
   */
  private async fetchIPFSData(cid: string): Promise<IPFSPaymentData> {
    const response = await fetch(`https://${this.gateway}/ipfs/${cid}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch IPFS data: ${response.statusText}`)
    }
    return await response.json()
  }

  async getPaymentsByMerchant(
    merchantAddress: string,
    options?: QueryOptions
  ): Promise<PaymentRecord[]> {
    if (!this.connected) {
      throw new Error('Not connected to IPFS. Call connect() first.')
    }

    const cid = this.merchantCIDCache.get(merchantAddress)
    if (!cid) {
      return [] // No payments for this merchant
    }

    const data = await this.fetchIPFSData(cid)
    let payments = data.payments

    // Apply filters
    if (options?.startTime) {
      payments = payments.filter(p => p.timestamp >= options.startTime!)
    }
    if (options?.endTime) {
      payments = payments.filter(p => p.timestamp <= options.endTime!)
    }

    // Apply sorting
    if (options?.sortBy) {
      payments.sort((a, b) => {
        const aVal = options.sortBy === 'timestamp' ? a.timestamp : parseFloat(a.amount)
        const bVal = options.sortBy === 'timestamp' ? b.timestamp : parseFloat(b.amount)
        return options.sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      })
    }

    // Apply pagination
    const offset = options?.offset || 0
    const limit = options?.limit || payments.length
    return payments.slice(offset, offset + limit)
  }

  async getPaymentsBySubscription(
    subscriptionId: string,
    options?: QueryOptions
  ): Promise<PaymentRecord[]> {
    if (!this.connected) {
      throw new Error('Not connected to IPFS. Call connect() first.')
    }

    // This requires scanning all merchant files
    // Not efficient for IPFS - consider creating subscription-indexed files in production
    const allPayments: PaymentRecord[] = []

    for (const [_merchantAddress, cid] of this.merchantCIDCache) {
      try {
        const data = await this.fetchIPFSData(cid)
        const subscriptionPayments = data.payments.filter(
          p => p.subscriptionId === subscriptionId
        )
        allPayments.push(...subscriptionPayments)
      } catch (error) {
        console.warn(`Failed to fetch payments from CID ${cid}:`, error)
      }
    }

    // Apply filters and sorting (same as getPaymentsByMerchant)
    let payments = allPayments

    if (options?.startTime) {
      payments = payments.filter(p => p.timestamp >= options.startTime!)
    }
    if (options?.endTime) {
      payments = payments.filter(p => p.timestamp <= options.endTime!)
    }

    if (options?.sortBy) {
      payments.sort((a, b) => {
        const aVal = options.sortBy === 'timestamp' ? a.timestamp : parseFloat(a.amount)
        const bVal = options.sortBy === 'timestamp' ? b.timestamp : parseFloat(b.amount)
        return options.sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      })
    }

    const offset = options?.offset || 0
    const limit = options?.limit || payments.length
    return payments.slice(offset, offset + limit)
  }

  async getStats(merchantAddress: string): Promise<PaymentStats> {
    if (!this.connected) {
      throw new Error('Not connected to IPFS. Call connect() first.')
    }

    const payments = await this.getPaymentsByMerchant(merchantAddress)

    if (payments.length === 0) {
      return {
        totalPayments: 0,
        totalVolume: '0',
        uniqueSubscribers: 0,
        uniqueMerchants: 1
      }
    }

    const uniqueSubscribers = new Set(payments.map(p => p.subscriber)).size
    const totalVolume = payments.reduce(
      (sum, p) => sum + BigInt(p.amount),
      BigInt(0)
    ).toString()

    const timestamps = payments.map(p => p.timestamp).sort((a, b) => a - b)

    return {
      totalPayments: payments.length,
      totalVolume,
      uniqueSubscribers,
      uniqueMerchants: 1,
      firstPayment: timestamps[0],
      lastPayment: timestamps[timestamps.length - 1]
    }
  }

  /**
   * Get the IPFS CID for a merchant's payment file
   */
  getMerchantCID(merchantAddress: string): string | undefined {
    return this.merchantCIDCache.get(merchantAddress)
  }

  /**
   * Get all merchant addresses with payment data
   */
  getAllMerchants(): string[] {
    return Array.from(this.merchantCIDCache.keys())
  }
}
