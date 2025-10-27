# OuroC Directory Structure

Clear organization of the three-tier business model: Community → Business → Enterprise

## 🏗️ Directory Overview

```
src/
├── community/               # 🌱 Community Tier (Transaction Fees)
│   ├── src/
│   │   ├── examples/        # Basic subscription examples
│   │   └── README.md        # Community tier documentation
│   └── dist/               # Built files
│
├── business-privacy/        # 💼 Business Tier (Subscription)
│   ├── src/
│   │   ├── encryption.ts    # Web Crypto API (AES-GCM-256)
│   │   ├── privacy/         # Private subscription management
│   │   ├── examples/        # Business use case examples
│   │   └── README.md        # Business tier documentation
│   └── dist/               # Built files
│
├── enterprise-privacy/      # 🏢 Enterprise Tier (Licensing)
│   ├── src/
│   │   ├── arcium.ts        # Arcium MXE integration
│   │   ├── examples/        # Enterprise use case examples
│   │   └── README.md        # Enterprise tier documentation
│   └── dist/               # Built files
│
├── admin-panel/            # 🔐 License Management Admin Panel
│   ├── src/                # React admin interface
│   ├── canisters/          # ICP canister declarations
│   └── dist/               # Built admin panel
│
├── license_registry/       # 📋 License Registry Canister
│   └── LicenseRegistry.mo  # Motoko license registry
│
└── timer/                  # ⏰ Subscription Timer Canister
    └── main.mo            # Motoko timer implementation
```

## 💰 Business Model Summary

| Tier | Pricing Model | Target Users | Key Features |
|------|---------------|--------------|--------------|
| **Community** | Transaction fees | Individuals, Open source | Basic subscriptions, Public data |
| **Business** | $299/month | SMBs, Startups | Web Crypto encryption, GDPR compliance |
| **Enterprise** | Custom licensing | Large enterprises | Arcium MXE, ZK proofs, MPC |

## 🔐 Security & Privacy Levels

### Community Tier (🌱)
- **No encryption** - All data public on-chain
- **Transaction fees** - Pay per use
- **Basic features** - Essential subscription management
- **Community support** - Forum and documentation

### Business Tier (💼)
- **Web Crypto API** - AES-GCM-256 encryption
- **Off-chain storage** - ICP canister for metadata
- **On-chain hashes** - Solana for verification
- **GDPR compliance** - Privacy tools for EU customers
- **Priority support** - Dedicated business support

### Enterprise Tier (🏢)
- **Arcium MXE** - Multi-party confidential computing
- **Zero-knowledge proofs** - Prove validity without revealing data
- **Confidential amounts** - Hidden transaction values
- **Hidden parties** - Private transaction participants
- **Enterprise support** - Dedicated account manager

## 🚀 Getting Started

### For Community Tier Users
```bash
import { OuroCClient } from '@ouroc/sdk';

const client = new OuroCClient({
  apiKey: 'ouro_community_your_key'
});
```

### For Business Tier Users
```bash
import { SecureOuroCClient } from '@ouroc/sdk';

const client = new SecureOuroCClient({
  license: {
    apiKey: 'ouro_business_your_key',
    tier: 'Business'
  }
});
```

### For Enterprise Tier Users (Q2 2026)
```bash
import { ArciumMXEClient } from '@ouroc/sdk/enterprise';

const arciumClient = await initializeEnterpriseEncryption('Enterprise');
```

## 📚 Documentation

- [Community Tier Documentation](./community/README.md)
- [Business Tier Documentation](./business-privacy/README.md)
- [Enterprise Tier Documentation](./enterprise-privacy/README.md)
- [Admin Panel Guide](./admin-panel/README.md)
- [License Registry API](./license_registry/README.md)

## 🛣️ Migration Paths

### Community → Business
- Upgrade from transaction fees to subscription
- Add Web Crypto API encryption
- Access to GDPR compliance tools

### Business → Enterprise (Q2 2026)
- Upgrade from Web Crypto to Arcium MXE
- Add zero-knowledge proofs
- Multi-party computation capabilities

## 📞 Support

- **Community**: GitHub Issues, Discord, Documentation
- **Business**: Priority email support, Knowledge base
- **Enterprise**: Dedicated account manager, Custom SLA

---

This structure provides immediate clarity about:
1. **Business model**: Each directory clearly states its pricing model
2. **Target users**: Use cases are clearly defined
3. **Features**: Security and privacy capabilities are obvious
4. **Migration path**: Clear upgrade paths between tiers