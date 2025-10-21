# OuroC Demo DApp

A Next.js demonstration application showcasing the OuroC subscription payment protocol on Solana with ICP integration.

This document will take you through the steps of running the demo of an front-end application using OuroC for managing it's subscriptions.

If you have your front-end application where you would like to add OuroC, refer to the [User_Manual](../USER_MANUAL.md)

## Features

- 🔐 Wallet connection
- 💳 Subscription creation and management
- 📊 Merchant dashboard with analytics
- 🤖 AI-to-AI (A2A) payment demonstration
- 🔔 Email notifications via Grid API
- ⚡ Real-time subscription status tracking

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Solana wallet
- Devnet SOL tokens

### Installation

1. **Install Dependencies**

```bash
cd demo-dapp
npm install
```

2. **Configure Environment Variables**

Create a `.env.local` file from the example:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:

```env
# ICP Canister (use deployed canister or local)
NEXT_PUBLIC_ICP_CANISTER_ID=7tbxr-naaaa-aaaao-qkrca-cai
NEXT_PUBLIC_ICP_NETWORK=ic
NEXT_PUBLIC_ICP_HOST=https://ic0.app

# Solana Configuration
NEXT_PUBLIC_SOLANA_PROGRAM_ID=7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# USDC Mint (Devnet)
NEXT_PUBLIC_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Grid API (Optional - for email notifications)
NEXT_PUBLIC_GRID_API_KEY=your_grid_api_key_here
NEXT_PUBLIC_GRID_ENVIRONMENT=sandbox
```

3. **Build the SDK Package**

The demo-dapp depends on the SDK package, so build it first:

```bash
cd ../packages/sdk
npm install
npm run build
cd ../../demo-dapp
```

4. **Run the Development Server**

```bash
npm run dev
```

The app will be available at `http://localhost:3002`

### Setup Your Wallet

1. Install [Phantom](https://phantom.app/) or [Solflare](https://solflare.com/) wallet
2. Get devnet SOL:
   ```bash
   solana airdrop 2 <your-address> --url devnet
   ```
3. Connect your wallet in the demo app

## Available Pages

- **Main Dashboard** (`/`) - Create and manage subscriptions
- **Merchant Dashboard** (`/merchant-dashboard`) - View subscription analytics
- **A2A Demo** (`/a2a-demo`) - AI agent payment demonstration

## Project Structure

```
demo-dapp/
├── src/
│   ├── app/              # Next.js 14 app directory
│   ├── components/       # React components
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript types
├── public/              # Static assets
└── docs/               # Documentation
```

## Troubleshooting

### Module Resolution Errors

Clear Next.js cache and rebuild:

```bash
rm -rf .next
npm run build
npm run dev
```

### SDK Not Found

Ensure the SDK is built:

```bash
cd ../packages/sdk && npm run build
```

### Wallet Connection Issues

- Make sure you're on the correct network (devnet)
- Ensure you have SOL in your wallet
- Try disconnecting and reconnecting your wallet

## Documentation

- [Authorization Modes](./docs/AUTHORIZATION_MODES.md) - Different ways to authorize subscriptions
- [SDK Documentation](../packages/sdk/README.md) - OuroC SDK reference
- [Project README](../README.md) - Main project documentation

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Blockchain**: Solana Web3.js
- **State Management**: React Hooks
- **Wallet Adapters**: Solana Wallet Adapter

## License

MIT
