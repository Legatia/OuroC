/**
 * OuroC Business Tier Example
 *
 * Private subscription with Web Crypto API encryption
 * Metadata encrypted and stored off-chain (ICP canister)
 * Only transaction hashes stored on-chain (Solana)
 *
 * Pricing: $299/month subscription - unlimited transactions
 */

import { SecureOuroCClient } from '@ouroc/sdk';
import { createPrivateSubscription, getPrivateMetadata } from '../privacy';

// Initialize the Business tier client with encryption
const client = new SecureOuroCClient({
  canisterId: 'your-canister-id',
  network: 'ic',
  license: {
    api_key: 'ouro_business_your_api_key', // Business tier API key
    tier: 'Business'
  },
  enableLicenseValidation: true,
  enableRateLimiting: true
});

async function createPrivateSubscription() {
  try {
    // Create a private subscription with encrypted metadata
    const subscriptionRequest = {
      merchant: 'merchant-public-key',
      amount: 10000000, // 0.01 SOL in lamports
      interval: 30 * 24 * 60 * 60 * 1000, // 30 days
      payer: 'payer-public-key',
      memo: 'Private subscription - encrypted metadata',
      api_key: 'ouro_business_your_api_key'
    };

    // Private metadata that will be encrypted
    const privateMetadata = {
      customerEmail: 'customer@example.com',
      productName: 'Premium Service',
      billingAddress: '123 Business St, Commerce City',
      specialInstructions: 'Deliver between 9-5 weekdays',
      discountCode: 'BUSINESS2025'
    };

    // Create subscription with private metadata
    const subscriptionId = await createPrivateSubscription(
      client,
      subscriptionRequest,
      privateMetadata,
      walletAdapter
    );

    console.log('✅ Business subscription created with private metadata:', subscriptionId);
    console.log('🔐 Metadata encrypted with Web Crypto API (AES-GCM-256)');
    console.log('🏢 Encrypted data stored in ICP canister');

    return subscriptionId;
  } catch (error) {
    console.error('❌ Failed to create private subscription:', error);
    throw error;
  }
}

async function accessPrivateMetadata(subscriptionId: string) {
  try {
    // Access the private metadata (requires proper authorization)
    const privateMetadata = await getPrivateMetadata(client, subscriptionId);

    if (privateMetadata) {
      console.log('🔓 Private metadata accessed:');
      console.log('- Customer Email:', privateMetadata.customerEmail);
      console.log('- Product:', privateMetadata.productName);
      console.log('- Billing Address:', privateMetadata.billingAddress);
      console.log('🛡️ Only accessible with proper authorization');
    }

    return privateMetadata;
  } catch (error) {
    console.error('❌ Failed to access private metadata:', error);
    throw error;
  }
}

async function checkComplianceFeatures() {
  try {
    // Check if Business tier supports compliance features
    const supportsGDPR = await client.supportsFeature('gdpr_compliance_tools');
    const supportsAnalytics = await client.supportsFeature('enhanced_analytics');
    const hasAPIAccess = await client.supportsFeature('api_access');

    console.log('📊 Business Tier Features:');
    console.log('- GDPR Compliance Tools:', supportsGDPR ? '✅' : '❌');
    console.log('- Enhanced Analytics:', supportsAnalytics ? '✅' : '❌');
    console.log('- API Access:', hasAPIAccess ? '✅' : '❌');

    // Get usage statistics
    const usage = await client.getUsageStats();
    console.log('📈 Usage Statistics:');
    console.log('- Tier:', usage.tier);
    console.log('- Subscriptions Created:', usage.subscriptions_created);
    console.log('- Rate Limit Used:', `${usage.rate_limit_used}/${usage.rate_limit_total}`);

  } catch (error) {
    console.error('❌ Failed to check compliance features:', error);
  }
}

// Example usage
async function businessExample() {
  console.log('💼 OuroC Business Tier Example');
  console.log('=====================================');

  try {
    // Create private subscription
    const subscriptionId = await createPrivateSubscription();

    // Access private metadata
    await accessPrivateMetadata(subscriptionId);

    // Check compliance features
    await checkComplianceFeatures();

    console.log('💳 $299/month subscription - unlimited transactions');
    console.log('🔧 Web Crypto API encryption for GDPR compliance');

  } catch (error) {
    console.error('Business tier example failed:', error);
  }
}

export {
  createPrivateSubscription,
  accessPrivateMetadata,
  checkComplianceFeatures,
  businessExample
};