#!/bin/bash

# OuroC Timer Canister Testing Script

set -e

echo "🧪 Testing OuroC Timer Canister"

# Check if canister is deployed
CANISTER_ID=$(dfx canister id OuroC_timer 2>/dev/null || echo "")
if [ -z "$CANISTER_ID" ]; then
    echo "❌ Timer canister not found. Please deploy first using ./deploy.sh"
    exit 1
fi

echo "📋 Testing canister: $CANISTER_ID"

# Test 1: Get initial status
echo ""
echo "📊 Test 1: Getting canister status..."
dfx canister call OuroC_timer get_canister_status

# Test 1.5: Get wallet addresses and balances
echo ""
echo "🏦 Test 1.5: Getting wallet information..."
dfx canister call OuroC_timer get_wallet_addresses
dfx canister call OuroC_timer get_wallet_balances

# Test 1.6: Check cycle status
echo ""
echo "⚡ Test 1.6: Checking cycle status..."
dfx canister call OuroC_timer get_cycle_status

# Test 2: Create a test subscription
echo ""
echo "📝 Test 2: Creating test subscription..."
SUBSCRIPTION_RESULT=$(dfx canister call OuroC_timer create_subscription '(record {
    solana_receiver="11111111111111111111111111111112";
    solana_payer="11111111111111111111111111111113";
    interval_seconds=120;
    start_time=null
})')

echo "Result: $SUBSCRIPTION_RESULT"

# Extract subscription ID from result
SUBSCRIPTION_ID=$(echo "$SUBSCRIPTION_RESULT" | grep -o '"sub_[0-9]*"' | tr -d '"' || echo "")

if [ -n "$SUBSCRIPTION_ID" ]; then
    echo "✅ Subscription created: $SUBSCRIPTION_ID"

    # Test 3: Get subscription details
    echo ""
    echo "📋 Test 3: Getting subscription details..."
    dfx canister call OuroC_timer get_subscription "(\"$SUBSCRIPTION_ID\")"

    # Test 4: List all subscriptions
    echo ""
    echo "📋 Test 4: Listing all subscriptions..."
    dfx canister call OuroC_timer list_subscriptions

    # Test 5: Pause subscription
    echo ""
    echo "⏸️ Test 5: Pausing subscription..."
    dfx canister call OuroC_timer pause_subscription "(\"$SUBSCRIPTION_ID\")"

    # Test 6: Resume subscription
    echo ""
    echo "▶️ Test 6: Resuming subscription..."
    dfx canister call OuroC_timer resume_subscription "(\"$SUBSCRIPTION_ID\")"

    # Test 7: Test fee configuration
    echo ""
    echo "💰 Test 7: Testing fee configuration..."
    dfx canister call OuroC_timer get_fee_config

    # Test 8: Test cycle monitoring
    echo ""
    echo "⚡ Test 8: Testing cycle monitoring..."
    dfx canister call OuroC_timer monitor_cycles

    # Test 9: Final status check
    echo ""
    echo "📊 Test 9: Final canister status..."
    dfx canister call OuroC_timer get_canister_status
    dfx canister call OuroC_timer get_cycle_status

    echo ""
    echo "🎉 All tests completed successfully!"
    echo ""
    echo "📋 Monitor the subscription execution:"
    echo "   dfx canister logs OuroC_timer"
    echo ""
    echo "📋 Check wallet balances periodically:"
    echo "   dfx canister call OuroC_timer get_wallet_balances"
    echo ""
    echo "📋 Monitor cycle status:"
    echo "   dfx canister call OuroC_timer get_cycle_status"
    echo ""
    echo "📋 To cancel the test subscription:"
    echo "   dfx canister call OuroC_timer cancel_subscription '(\"$SUBSCRIPTION_ID\")'"

else
    echo "❌ Failed to create subscription"
    exit 1
fi