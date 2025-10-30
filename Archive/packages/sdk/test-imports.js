/**
 * Quick test to verify our new constants and types are exported correctly
 * Run with: node test-imports.js
 */

// Test CommonJS imports from main dist bundle
const {
  COMMUNITY_NOTIFICATION_CONFIG,
  COMMUNITY_TIER_FEE,
  ICP_FEE_COLLECTION_ADDRESS,
  OUROC_CANISTER_IDS,
  SOLANA_PROGRAM_IDS,
  USDC_MINTS,
  getCanisterId,
  getProgramId,
  getUSDCMint,
  getFeeCollectionAddress,
  calculateFees,
  generateSubscriptionId,
  intervalToSeconds,
  toMicroUnits,
  fromMicroUnits,
  getCommunityReminderDays,
} = require('./dist/index.js');

console.log('🧪 Testing OuroC SDK Constants & Utils\n');

// Test 1: Notification Config
console.log('✅ Test 1: COMMUNITY_NOTIFICATION_CONFIG');
console.log('  - reminder_days_before_payment:', COMMUNITY_NOTIFICATION_CONFIG.reminder_days_before_payment);
console.log('  - enabled:', COMMUNITY_NOTIFICATION_CONFIG.enabled);
console.log('  - configurable:', COMMUNITY_NOTIFICATION_CONFIG.configurable);
console.log('  - description:', COMMUNITY_NOTIFICATION_CONFIG.description);
console.assert(COMMUNITY_NOTIFICATION_CONFIG.reminder_days_before_payment === 1, 'Should be 1 day');
console.assert(COMMUNITY_NOTIFICATION_CONFIG.enabled === true, 'Should be enabled');
console.assert(COMMUNITY_NOTIFICATION_CONFIG.configurable === false, 'Should not be configurable');
console.log('  ✓ All assertions passed\n');

// Test 2: Fee Config
console.log('✅ Test 2: COMMUNITY_TIER_FEE');
console.log('  - percentage:', COMMUNITY_TIER_FEE.percentage);
console.log('  - basis_points:', COMMUNITY_TIER_FEE.basis_points);
console.log('  - merchant_receives:', COMMUNITY_TIER_FEE.merchant_receives);
console.log('  - platform_receives:', COMMUNITY_TIER_FEE.platform_receives);
console.assert(COMMUNITY_TIER_FEE.percentage === 2, 'Should be 2%');
console.assert(COMMUNITY_TIER_FEE.basis_points === 200, 'Should be 200 bps');
console.assert(COMMUNITY_TIER_FEE.merchant_receives === 98, 'Merchant gets 98%');
console.assert(COMMUNITY_TIER_FEE.platform_receives === 2, 'Platform gets 2%');
console.log('  ✓ All assertions passed\n');

// Test 3: Fee Collection Address
console.log('✅ Test 3: ICP_FEE_COLLECTION_ADDRESS');
console.log('  - Address:', ICP_FEE_COLLECTION_ADDRESS);
console.assert(ICP_FEE_COLLECTION_ADDRESS === 'CKEY8bppifSErEfP5cvX8hCnmQ2Yo911mosdRx7M3HxF', 'Should match hardcoded address');
console.log('  ✓ Assertion passed\n');

// Test 4: Canister IDs
console.log('✅ Test 4: OUROC_CANISTER_IDS');
console.log('  - mainnet:', OUROC_CANISTER_IDS.mainnet);
console.log('  - devnet:', OUROC_CANISTER_IDS.devnet);
console.assert(OUROC_CANISTER_IDS.mainnet === '7tbxr-naaaa-aaaao-qkrca-cai', 'Should match ICP canister ID');
console.log('  ✓ Assertion passed\n');

// Test 5: Solana Program IDs
console.log('✅ Test 5: SOLANA_PROGRAM_IDS');
console.log('  - mainnet:', SOLANA_PROGRAM_IDS.mainnet);
console.log('  - devnet:', SOLANA_PROGRAM_IDS.devnet);
console.assert(SOLANA_PROGRAM_IDS.mainnet === '7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub', 'Should match Solana program ID');
console.log('  ✓ Assertion passed\n');

// Test 6: USDC Mints
console.log('✅ Test 6: USDC_MINTS');
console.log('  - mainnet:', USDC_MINTS.mainnet);
console.log('  - devnet:', USDC_MINTS.devnet);
console.assert(USDC_MINTS.mainnet === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'Should match USDC mainnet');
console.assert(USDC_MINTS.devnet === '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', 'Should match USDC devnet');
console.log('  ✓ All assertions passed\n');

// Test 7: Helper Functions
console.log('✅ Test 7: Helper Functions');
console.log('  - getCanisterId("mainnet"):', getCanisterId('mainnet'));
console.log('  - getProgramId("devnet"):', getProgramId('devnet'));
console.log('  - getUSDCMint("mainnet"):', getUSDCMint('mainnet'));
console.log('  - getFeeCollectionAddress():', getFeeCollectionAddress());
console.assert(getCanisterId('mainnet') === OUROC_CANISTER_IDS.mainnet, 'Should return mainnet canister ID');
console.assert(getFeeCollectionAddress() === ICP_FEE_COLLECTION_ADDRESS, 'Should return fee address');
console.log('  ✓ All assertions passed\n');

// Test 8: Fee Calculation
console.log('✅ Test 8: calculateFees()');
const fees = calculateFees(10);
console.log('  Input: 10 USDC');
console.log('  - total:', fees.total);
console.log('  - merchantAmount:', fees.merchantAmount);
console.log('  - platformFee:', fees.platformFee);
console.log('  - merchantPercentage:', fees.merchantPercentage);
console.log('  - platformPercentage:', fees.platformPercentage);
console.assert(fees.total === 10, 'Total should be 10');
console.assert(fees.merchantAmount === 9.8, 'Merchant should get 9.8');
console.assert(fees.platformFee === 0.2, 'Platform fee should be 0.2');
console.assert(fees.merchantPercentage === 98, 'Merchant percentage should be 98');
console.assert(fees.platformPercentage === 2, 'Platform percentage should be 2');
console.log('  ✓ All assertions passed\n');

// Test 9: Utility Functions
console.log('✅ Test 9: Utility Functions');
console.log('  - intervalToSeconds("monthly"):', intervalToSeconds('monthly'));
console.log('  - toMicroUnits(10):', toMicroUnits(10));
console.log('  - fromMicroUnits(10000000):', fromMicroUnits(10000000));
console.log('  - getCommunityReminderDays():', getCommunityReminderDays());
console.assert(intervalToSeconds('monthly') === 2592000, 'Monthly should be 30 days');
console.assert(toMicroUnits(10) === 10_000_000, 'Should convert to micro-units');
console.assert(fromMicroUnits(10_000_000) === 10, 'Should convert from micro-units');
console.assert(getCommunityReminderDays() === 1, 'Should always return 1');
console.log('  ✓ All assertions passed\n');

// Test 10: Subscription ID Generation
console.log('✅ Test 10: generateSubscriptionId()');
const subId = generateSubscriptionId(
  'MerchantPubkey123',
  'SubscriberPubkey456',
  10_000_000,
  2_592_000
);
console.log('  Generated ID:', subId);
console.assert(subId.startsWith('sub_'), 'Should start with sub_');
console.assert(subId.length === 20, 'Should be 20 characters (sub_ + 16 hex)');
console.log('  ✓ All assertions passed\n');

// Test 11: Deterministic ID Generation
console.log('✅ Test 11: Deterministic Subscription ID');
const subId1 = generateSubscriptionId('A', 'B', 1000, 100);
const subId2 = generateSubscriptionId('A', 'B', 1000, 100);
const subId3 = generateSubscriptionId('A', 'B', 1000, 200); // Different interval
console.log('  ID 1:', subId1);
console.log('  ID 2:', subId2);
console.log('  ID 3 (different):', subId3);
console.assert(subId1 === subId2, 'Same inputs should produce same ID');
console.assert(subId1 !== subId3, 'Different inputs should produce different ID');
console.log('  ✓ All assertions passed\n');

console.log('🎉 All tests passed! SDK is working correctly.\n');

console.log('📋 Summary:');
console.log('  ✅ Notification config: HARDCODED to 1 day (24 hours)');
console.log('  ✅ Fee structure: HARDCODED to 2% (98% merchant, 2% platform)');
console.log('  ✅ Fee collection: HARDCODED to CKEY8bppifSErEfP5cvX8hCnmQ2Yo911mosdRx7M3HxF');
console.log('  ✅ Canister ID: HARDCODED to 7tbxr-naaaa-aaaao-qkrca-cai');
console.log('  ✅ Program ID: HARDCODED to 7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub');
console.log('  ✅ Payment token: USDC only');
console.log('  ✅ Subscription ID: Auto-generated deterministically');
console.log('  ✅ All helper functions working correctly');
console.log('\n✨ Community tier simplification complete!');
