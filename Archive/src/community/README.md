# OuroC Community Tier

The open-source foundation of the OuroC protocol with transaction fee-based pricing.

## Features
- Basic subscription management
- Public transaction data on-chain
- Community support
- Standard notifications
- No encryption (all data public)

## Business Model
- **Percentage-based transaction fees**: Charged on each processed payment
- **Free to use**: No upfront cost or subscription
- **Open source**: All code available publicly

## Limits
- 10 API calls per hour
- 10 active subscriptions maximum
- Public transaction data only

## Use Cases
- Individual developers
- Open source projects
- Learning and testing
- Small personal projects

## Directory Structure
```
community/
├── src/
│   ├── core/           # Core subscription logic
│   ├── components/     # React components for basic UI
│   ├── hooks/          # React hooks for community features
│   └── examples/       # Example implementations
├── dist/               # Built distribution files
└── README.md          # This file
```