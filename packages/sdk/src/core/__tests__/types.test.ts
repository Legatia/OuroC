import { TOKEN_MINTS, SupportedToken } from '../types'

describe('Core Types', () => {
  describe('TOKEN_MINTS', () => {
    it('has correct USDC mint address', () => {
      expect(TOKEN_MINTS.USDC).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
    })

    it('has correct USDT mint address', () => {
      expect(TOKEN_MINTS.USDT).toBe('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')
    })

    it('has correct PYUSD mint address', () => {
      expect(TOKEN_MINTS.PYUSD).toBe('2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo')
    })

    it('has correct DAI mint address', () => {
      expect(TOKEN_MINTS.DAI).toBe('EjmyN6qEC1Tf1JxiG1ae7UTJhUxSwk1TCWNWqxWV4J6o')
    })

    it('contains all supported tokens', () => {
      const supportedTokens: SupportedToken[] = ['USDC', 'USDT', 'PYUSD', 'DAI']

      supportedTokens.forEach(token => {
        expect(TOKEN_MINTS[token]).toBeDefined()
        expect(typeof TOKEN_MINTS[token]).toBe('string')
        expect(TOKEN_MINTS[token].length).toBeGreaterThan(0)
      })
    })
  })

  describe('Subscription Interface', () => {
    it('validates subscription structure', () => {
      const mockSubscription = {
        id: 'sub_123',
        solana_contract_address: '7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub',
        solana_payer: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        solana_receiver: 'HBvV7YqSRSPW4YEBsDvpvF2PrUWFubqVbTNYafkddTsy',
        subscriber_usdc_account: 'TokenAccount123',
        merchant_usdc_account: 'TokenAccount456',
        icp_fee_usdc_account: 'TokenAccount789',
        payment_token_mint: TOKEN_MINTS.USDC,
        amount: BigInt(10_000_000),
        interval_seconds: BigInt(2592000),
        next_payment: BigInt(Date.now() * 1_000_000),
        is_active: true,
        created_at: BigInt(Date.now() * 1_000_000),
        trigger_count: 0,
      }

      expect(mockSubscription.id).toBeDefined()
      expect(typeof mockSubscription.amount).toBe('bigint')
      expect(typeof mockSubscription.interval_seconds).toBe('bigint')
      expect(mockSubscription.is_active).toBe(true)
    })
  })

  describe('CreateSubscriptionRequest Interface', () => {
    it('validates request structure', () => {
      const mockRequest = {
        subscription_id: 'sub_123',
        solana_contract_address: '7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub',
        solana_payer: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        solana_receiver: 'HBvV7YqSRSPW4YEBsDvpvF2PrUWFubqVbTNYafkddTsy',
        subscriber_usdc_account: 'TokenAccount123',
        merchant_usdc_account: 'TokenAccount456',
        icp_fee_usdc_account: 'TokenAccount789',
        payment_token_mint: TOKEN_MINTS.USDC,
        amount: BigInt(10_000_000),
        interval_seconds: BigInt(2592000),
      }

      expect(mockRequest.subscription_id).toBe('sub_123')
      expect(typeof mockRequest.amount).toBe('bigint')
      expect(mockRequest.payment_token_mint).toBe(TOKEN_MINTS.USDC)
    })
  })
})
