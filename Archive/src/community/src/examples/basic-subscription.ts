/**
 * OuroC Community Tier Example
 *
 * Basic subscription creation with public transaction data
 * No encryption - all data is visible on-chain
 *
 * Pricing: Transaction fees only (no monthly cost)
 */

import { OuroCClient } from '@ouroc/sdk';

// Initialize the Community tier client
const client = new OuroCClient({
  canisterId: 'your-canister-id',
  network: 'ic',
  apiKey: 'ouro_community_your_api_key' // Community tier API key
});

async function createBasicSubscription() {
  try {
    // Create a basic subscription with public data
    const subscriptionRequest = {
      merchant: 'merchant-public-key',
      amount: 10000000, // 0.01 SOL in lamports
      interval: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
      payer: 'payer-public-key',
      memo: 'Basic subscription - public data', // Visible on-chain
      api_key: 'ouro_community_your_api_key'
    };

    const subscriptionId = await client.createSubscription(
      subscriptionRequest,
      walletAdapter // Your wallet adapter
    );

    console.log('✅ Community subscription created:', subscriptionId);
    console.log('📊 Transaction data is public on Solana blockchain');

    return subscriptionId;
  } catch (error) {
    console.error('❌ Failed to create community subscription:', error);
    throw error;
  }
}

async function checkSubscriptionStatus(subscriptionId: string) {
  try {
    const subscription = await client.getSubscription(subscriptionId);

    if (subscription) {
      console.log('📋 Subscription Status:');
      console.log('- Merchant:', subscription.merchant);
      console.log('- Amount:', client.lamportsToSOL(subscription.amount), 'SOL');
      console.log('- Status:', subscription.status);
      console.log('- Next Payment:', new Date(subscription.nextPayment).toLocaleString());

      // All data is public - no special access required
      console.log('🔓 All subscription data is publicly accessible');
    }

    return subscription;
  } catch (error) {
    console.error('❌ Failed to get subscription:', error);
    throw error;
  }
}

// Example usage
async function communityExample() {
  console.log('🌱 OuroC Community Tier Example');
  console.log('=====================================');

  try {
    // Create subscription
    const subscriptionId = await createBasicSubscription();

    // Check status
    await checkSubscriptionStatus(subscriptionId);

    console.log('💰 Transaction fees will be charged on each payment');
    console.log('🆓 No monthly subscription cost');

  } catch (error) {
    console.error('Community tier example failed:', error);
  }
}

export { createBasicSubscription, checkSubscriptionStatus, communityExample };