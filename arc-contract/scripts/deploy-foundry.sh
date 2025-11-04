#!/bin/bash

# Deploy OuroCPrimaArc to Arc Testnet using Foundry
# Usage: ./scripts/deploy-foundry.sh

set -e

echo "🚀 Deploying OuroCPrimaArc to Arc Testnet using Foundry..."
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Error: .env file not found"
    echo "Copy .env.example to .env and configure your settings"
    exit 1
fi

# Validate required variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set in .env"
    exit 1
fi

if [ -z "$USDC_ADDRESS" ]; then
    echo "⚠️  Warning: USDC_ADDRESS not set, using placeholder"
    USDC_ADDRESS="0x0000000000000000000000000000000000000000"
fi

if [ -z "$ICP_SIGNER_PUBLIC_KEY" ]; then
    echo "⚠️  Warning: ICP_SIGNER_PUBLIC_KEY not set, using placeholder"
    ICP_SIGNER_PUBLIC_KEY="0x0000000000000000000000000000000000000000"
fi

# Get deployer address
DEPLOYER_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
echo "📍 Deployer Address: $DEPLOYER_ADDRESS"

# Check balance
BALANCE=$(cast balance $DEPLOYER_ADDRESS --rpc-url $ARC_TESTNET_RPC_URL)
BALANCE_USDC=$(cast --from-wei $BALANCE)
echo "💰 Balance: $BALANCE_USDC USDC"
echo ""

if [ "$BALANCE" = "0" ]; then
    echo "❌ Error: Deployer has no USDC for gas fees"
    echo "Get testnet USDC from: https://faucet.circle.com"
    echo "Select 'Arc Testnet' and use address: $DEPLOYER_ADDRESS"
    exit 1
fi

echo "📋 Deployment Parameters:"
echo "   USDC Address: $USDC_ADDRESS"
echo "   ICP Signer: $ICP_SIGNER_PUBLIC_KEY"
echo "   Fee Collector: $DEPLOYER_ADDRESS (will be updated later)"
echo ""

# Compile contracts
echo "🔨 Compiling contracts..."
forge build

# Deploy contract
echo "🚀 Deploying OuroCPrimaArc..."
DEPLOY_OUTPUT=$(forge create contracts/OuroCPrimaArc.sol:OuroCPrimaArc \
    --rpc-url $ARC_TESTNET_RPC_URL \
    --private-key $PRIVATE_KEY \
    --constructor-args $USDC_ADDRESS $ICP_SIGNER_PUBLIC_KEY $DEPLOYER_ADDRESS \
    --broadcast \
    --json)

# Extract contract address
CONTRACT_ADDRESS=$(echo $DEPLOY_OUTPUT | jq -r '.deployedTo')
TX_HASH=$(echo $DEPLOY_OUTPUT | jq -r '.transactionHash')

echo ""
echo "✅ Deployment Successful!"
echo ""
echo "📍 Contract Address: $CONTRACT_ADDRESS"
echo "📜 Transaction Hash: $TX_HASH"
echo "🔍 Explorer: https://explorer.testnet.arc.network/tx/$TX_HASH"
echo ""

# Save deployment info
cat > deployments/arc-testnet.json <<EOF
{
  "network": "arc-testnet",
  "contractAddress": "$CONTRACT_ADDRESS",
  "deployer": "$DEPLOYER_ADDRESS",
  "usdc": "$USDC_ADDRESS",
  "icpSigner": "$ICP_SIGNER_PUBLIC_KEY",
  "feeCollector": "$DEPLOYER_ADDRESS",
  "transactionHash": "$TX_HASH",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "💾 Deployment info saved to: deployments/arc-testnet.json"
echo ""

# Verify deployment
echo "🔍 Verifying deployment..."
USDC_CHECK=$(cast call $CONTRACT_ADDRESS "usdc()(address)" --rpc-url $ARC_TESTNET_RPC_URL)
ICP_SIGNER_CHECK=$(cast call $CONTRACT_ADDRESS "icpSignerAddress()(address)" --rpc-url $ARC_TESTNET_RPC_URL)

echo "Contract State:"
echo "   USDC: $USDC_CHECK"
echo "   ICP Signer: $ICP_SIGNER_CHECK"
echo ""

echo "🎯 Next Steps:"
echo ""
echo "1. Fund your wallet with more testnet USDC:"
echo "   https://faucet.circle.com"
echo ""
echo "2. Update .env with contract address:"
echo "   OUROC_PRIMA_ARC_ADDRESS=$CONTRACT_ADDRESS"
echo ""
echo "3. Get Arc testnet USDC contract address and update:"
echo "   USDC_ADDRESS=<arc_usdc_address>"
echo ""
echo "4. Update ICP Timer Canister:"
echo "   - Add Arc RPC endpoint"
echo "   - Set contract address: $CONTRACT_ADDRESS"
echo "   - Derive ECDSA public key and set as ICP_SIGNER_PUBLIC_KEY"
echo ""
echo "5. Test subscription creation:"
echo "   cast call $CONTRACT_ADDRESS \"totalSubscriptions()(uint256)\" --rpc-url \$ARC_TESTNET_RPC_URL"
echo ""
echo "6. Update frontend configuration"
echo ""

echo "✨ Deployment complete!"
