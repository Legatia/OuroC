# @ouroc/indexer-ipfs

IPFS/Pinata storage adapter for OuroC payment history indexer.

## Installation

```bash
npm install @ouroc/indexer-ipfs
```

## Usage

```typescript
import { IPFSAdapter } from '@ouroc/indexer-ipfs'

// Initialize adapter
const adapter = new IPFSAdapter({
  pinataJwt: 'your-pinata-jwt-token',
  pinataGateway: 'gateway.pinata.cloud' // Optional
})

// Connect
await adapter.connect()

// Save payment
await adapter.savePayment({
  subscriptionId: 'sub-123',
  subscriber: '5vyW1hJT...',
  merchant: '7c1tGePF...',
  amount: '10000000', // 10 USDC (6 decimals)
  timestamp: Date.now(),
  paymentNumber: 1,
  txSignature: '4Xy2z1...'
})

// Get merchant payments
const payments = await adapter.getPaymentsByMerchant('7c1tGePF...', {
  limit: 10,
  sortBy: 'timestamp',
  sortOrder: 'desc'
})

// Get subscription payments
const subPayments = await adapter.getPaymentsBySubscription('sub-123')

// Get stats
const stats = await adapter.getStats('7c1tGePF...')
console.log(stats)
// {
//   totalPayments: 42,
//   totalVolume: '420000000',
//   uniqueSubscribers: 15,
//   uniqueMerchants: 1,
//   firstPayment: 1234567890,
//   lastPayment: 1234567999
// }

// Get IPFS CID for merchant data
const cid = adapter.getMerchantCID('7c1tGePF...')
console.log(`View on IPFS: https://gateway.pinata.cloud/ipfs/${cid}`)

// Disconnect
await adapter.disconnect()
```

## Storage Strategy

- Each merchant gets their own IPFS file (JSON format)
- File contains array of all payment records for that merchant
- File is updated (new CID) when new payments arrive
- Uses Pinata keyvalues for indexing and fast lookups
- Old CIDs are automatically unpinned to save storage costs
- Deduplication by transaction signature

## Configuration

### Required
- `pinataJwt`: Your Pinata JWT token (get from https://app.pinata.cloud)

### Optional
- `pinataGateway`: Custom IPFS gateway (default: 'gateway.pinata.cloud')

## API Reference

### `IPFSAdapter`

#### Methods

- `connect()`: Connect to Pinata and load existing merchant data
- `disconnect()`: Disconnect and clear cache
- `savePayment(payment)`: Save a single payment record
- `savePayments(payments)`: Save multiple payment records in batch
- `getPaymentsByMerchant(merchantAddress, options?)`: Get all payments for a merchant
- `getPaymentsBySubscription(subscriptionId, options?)`: Get all payments for a subscription
- `getStats(merchantAddress)`: Get payment statistics for a merchant
- `getMerchantCID(merchantAddress)`: Get IPFS CID for merchant's payment file
- `getAllMerchants()`: Get all merchant addresses with payment data

#### Query Options

```typescript
interface QueryOptions {
  limit?: number          // Max number of results
  offset?: number         // Pagination offset
  startTime?: number      // Filter: minimum timestamp
  endTime?: number        // Filter: maximum timestamp
  sortBy?: 'timestamp' | 'amount'
  sortOrder?: 'asc' | 'desc'
}
```

## Performance Considerations

- **Merchant queries**: Very fast (single IPFS fetch per merchant)
- **Subscription queries**: Slower (scans all merchant files)
- **Recommendation**: For production, consider creating subscription-indexed files

## Cost Considerations

- Each payment update creates a new IPFS pin
- Old pins are automatically unpinned
- Storage cost = (number of merchants) × (average file size)
- Typical file size: ~1KB per 10 payments
- Pinata free tier: 1GB storage, sufficient for ~10,000 merchants

## License

MIT
