#!/bin/bash

###############################################################################
# OuroC ICP Timer Canister - Devnet Deployment Script
#
# This script deploys the ICP timer canister configured for Solana devnet
#
# Program ID: 7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub
# USDC Mint:  4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CANISTER_NAME="OuroC_timer"
NETWORK="ic"  # Use "local" for local testing
SOLANA_PROGRAM_ID="7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub"
SOLANA_USDC_MINT="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  OuroC ICP Timer Canister - Devnet Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Target Network:${NC}      Internet Computer (IC)"
echo -e "${YELLOW}Solana Network:${NC}      Devnet"
echo -e "${YELLOW}Program ID:${NC}          $SOLANA_PROGRAM_ID"
echo -e "${YELLOW}USDC Mint:${NC}           $SOLANA_USDC_MINT"
echo ""

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo -e "${RED}❌ Error: dfx is not installed${NC}"
    echo ""
    echo "Install dfx with:"
    echo "  sh -ci \"\$(curl -fsSL https://sdk.dfinity.org/install.sh)\""
    exit 1
fi

echo -e "${GREEN}✅ dfx found: $(dfx --version)${NC}"
echo ""

# Get current identity
IDENTITY=$(dfx identity whoami)
PRINCIPAL=$(dfx identity get-principal)

echo -e "${YELLOW}Identity:${NC}  $IDENTITY"
echo -e "${YELLOW}Principal:${NC} $PRINCIPAL"
echo ""

# Confirm deployment
read -p "Deploy canister to $NETWORK? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Deployment cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}📦 Building canister...${NC}"
dfx build $CANISTER_NAME

echo ""
echo -e "${BLUE}🚀 Deploying to $NETWORK...${NC}"

if [ "$NETWORK" == "local" ]; then
    # Start local replica if needed
    if ! pgrep -x "dfx" > /dev/null; then
        echo -e "${YELLOW}⚠️  Starting local replica...${NC}"
        dfx start --background --clean
        sleep 5
    fi
    dfx deploy $CANISTER_NAME
else
    dfx deploy $CANISTER_NAME --network $NETWORK
fi

# Get canister ID
if [ "$NETWORK" == "local" ]; then
    CANISTER_ID=$(dfx canister id $CANISTER_NAME)
else
    CANISTER_ID=$(dfx canister id $CANISTER_NAME --network $NETWORK)
fi

echo ""
echo -e "${GREEN}✅ Canister deployed successfully!${NC}"
echo -e "${YELLOW}Canister ID:${NC} $CANISTER_ID"
echo ""

# Initialize canister for Devnet
echo -e "${BLUE}⚙️  Initializing canister for Solana Devnet...${NC}"

if [ "$NETWORK" == "local" ]; then
    dfx canister call $CANISTER_NAME init_canister '(variant { Devnet })'
else
    dfx canister call $CANISTER_NAME init_canister '(variant { Devnet })' --network $NETWORK
fi

echo ""
echo -e "${GREEN}✅ Canister initialized for Devnet${NC}"
echo ""

# Verify initialization
echo -e "${BLUE}🔍 Verifying canister status...${NC}"

if [ "$NETWORK" == "local" ]; then
    ACTIVE_COUNT=$(dfx canister call $CANISTER_NAME get_active_subscription_count | grep -o '[0-9]*')
else
    ACTIVE_COUNT=$(dfx canister call $CANISTER_NAME get_active_subscription_count --network $NETWORK | grep -o '[0-9]*')
fi

echo -e "${YELLOW}Active Subscriptions:${NC} $ACTIVE_COUNT"
echo ""

# Check cycle balance (only for IC mainnet)
if [ "$NETWORK" == "ic" ]; then
    echo -e "${BLUE}💰 Checking cycle balance...${NC}"
    dfx canister status $CANISTER_NAME --network $NETWORK
    echo ""
fi

# Update test configuration
TEST_ENV_FILE="../solana-contract/ouro_c_subscriptions/.env.devnet"

if [ -f "$TEST_ENV_FILE" ]; then
    echo -e "${BLUE}📝 Updating test configuration...${NC}"

    # Check if ICP_TIMER_CANISTER_ID already exists
    if grep -q "^ICP_TIMER_CANISTER_ID=" "$TEST_ENV_FILE"; then
        # Update existing line
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^ICP_TIMER_CANISTER_ID=.*/ICP_TIMER_CANISTER_ID=$CANISTER_ID/" "$TEST_ENV_FILE"
        else
            sed -i "s/^ICP_TIMER_CANISTER_ID=.*/ICP_TIMER_CANISTER_ID=$CANISTER_ID/" "$TEST_ENV_FILE"
        fi
        echo -e "${GREEN}✅ Updated ICP_TIMER_CANISTER_ID in $TEST_ENV_FILE${NC}"
    else
        # Append new line
        echo "ICP_TIMER_CANISTER_ID=$CANISTER_ID" >> "$TEST_ENV_FILE"
        echo -e "${GREEN}✅ Added ICP_TIMER_CANISTER_ID to $TEST_ENV_FILE${NC}"
    fi

    # Update USE_MOCK_ICP to false
    if grep -q "^USE_MOCK_ICP=" "$TEST_ENV_FILE"; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^USE_MOCK_ICP=.*/USE_MOCK_ICP=false/" "$TEST_ENV_FILE"
        else
            sed -i "s/^USE_MOCK_ICP=.*/USE_MOCK_ICP=false/" "$TEST_ENV_FILE"
        fi
        echo -e "${GREEN}✅ Set USE_MOCK_ICP=false${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Test config not found: $TEST_ENV_FILE${NC}"
    echo "   Please create it from .env.devnet.example"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Canister ID:${NC}         $CANISTER_ID"
echo -e "${YELLOW}Network:${NC}             $NETWORK"
echo -e "${YELLOW}Solana Network:${NC}      Devnet"
echo -e "${YELLOW}Program ID:${NC}          $SOLANA_PROGRAM_ID"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo "1. Run integration tests:"
echo "   ${BLUE}cd solana-contract/ouro_c_subscriptions${NC}"
echo "   ${BLUE}npm run test:integration${NC}"
echo ""
echo "2. Create a test subscription:"
echo "   ${BLUE}dfx canister call $CANISTER_NAME create_subscription '(...)'${NC}"
echo ""
echo "3. Monitor canister status:"
if [ "$NETWORK" == "local" ]; then
    echo "   ${BLUE}dfx canister status $CANISTER_NAME${NC}"
else
    echo "   ${BLUE}dfx canister status $CANISTER_NAME --network $NETWORK${NC}"
fi
echo ""
echo "4. View canister logs:"
if [ "$NETWORK" == "local" ]; then
    echo "   ${BLUE}dfx canister logs $CANISTER_NAME${NC}"
else
    echo "   ${BLUE}dfx canister logs $CANISTER_NAME --network $NETWORK${NC}"
fi
echo ""
echo -e "${GREEN}Documentation:${NC}"
echo "   • ICP_CANISTER_DEPLOYMENT.md"
echo "   • DEVNET_TESTING_GUIDE.md"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
