#!/bin/bash

# Load environment variables
if [ -f .env.devnet ]; then
    export $(grep -v '^#' .env.devnet | xargs)
fi

# Set Anchor environment variables
export ANCHOR_PROVIDER_URL="https://api.devnet.solana.com"
export ANCHOR_WALLET="$HOME/.config/solana/id.json"

# Run basic test
npm run test:basic
