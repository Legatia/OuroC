#!/bin/bash

# OuroC ICP Timer Canister Deployment Script

set -e

echo "🚀 Starting OuroC Timer Canister Deployment"

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "❌ dfx CLI not found. Please install DFINITY SDK first."
    echo "Visit: https://internetcomputer.org/docs/current/developer-docs/setup/install/"
    exit 1
fi

# Check dfx version
echo "📋 Checking dfx version..."
dfx --version

# Start local replica if not running
echo "🔄 Starting local replica..."
dfx start --background --clean

# Wait for replica to be ready
echo "⏳ Waiting for replica to be ready..."
sleep 5

# Deploy the canister
echo "📦 Deploying OuroC Timer Canister..."
dfx deploy OuroC_timer --with-cycles 1000000000000

# Get canister ID
CANISTER_ID=$(dfx canister id OuroC_timer)
echo "✅ Timer canister deployed successfully!"
echo "📋 Canister ID: $CANISTER_ID"

# Initialize the canister with Threshold Ed25519 wallets
echo "🔐 Initializing Threshold Ed25519 wallets..."
INIT_RESULT=$(dfx canister call OuroC_timer initialize_canister)
echo "Initialization result: $INIT_RESULT"

# Test basic functionality
echo "🧪 Running basic health check..."
dfx canister call OuroC_timer get_canister_status

# Get wallet addresses
echo "🏦 Getting wallet addresses..."
dfx canister call OuroC_timer get_wallet_addresses

# Check cycle status
echo "⚡ Checking cycle status..."
dfx canister call OuroC_timer get_cycle_status

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Fund the main wallet with SOL for transaction fees"
echo "2. Create a test subscription:"
echo "   dfx canister call OuroC_timer create_subscription '(record { solana_receiver=\"RECEIVER_ADDRESS\"; solana_payer=\"PAYER_ADDRESS\"; interval_seconds=300; start_time=null })'"
echo ""
echo "3. Monitor wallet balances:"
echo "   dfx canister call OuroC_timer get_wallet_balances"
echo ""
echo "4. Monitor cycle status:"
echo "   dfx canister call OuroC_timer get_cycle_status"
echo ""
echo "5. Monitor canister logs:"
echo "   dfx canister logs OuroC_timer"
echo ""
echo "6. Set up auto cycle refill if needed:"
echo "   dfx canister call OuroC_timer enable_auto_refill '(true)'"