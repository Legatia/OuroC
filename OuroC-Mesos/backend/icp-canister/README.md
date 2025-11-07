# OuroC-Mesos Backend ICP Canister

**Status:** 🚧 Planned / In Development

This directory contains the ICP canister version of the OuroC-Mesos backend API. It provides the same functionality as the Express API but deployed as a fully decentralized ICP canister.

## Architecture

```
Frontend → ICP Canister → Aleph.im Network
(React)    (Motoko)       (Decentralized Storage)
```

### Why ICP Canister?

**Benefits over traditional Express backend:**
- ✅ Fully decentralized (no traditional server needed)
- ✅ Pay-as-you-go with cycles (no monthly fees)
- ✅ Built-in HTTPS (secure by default)
- ✅ Automatic scaling
- ✅ Internet Identity integration
- ✅ Threshold ECDSA for signing
- ✅ HTTPS outcalls for Aleph API

## Current Implementation

### What's Done:
- ✅ Basic canister structure (dfx.json)
- ✅ Type definitions matching Express API
- ✅ Health check endpoint
- ✅ Placeholder functions for all endpoints

### What's TODO:
- [ ] HTTPS outcalls to Aleph REST API
- [ ] Threshold ECDSA for Solana signing
- [ ] Internet Identity authentication
- [ ] Rate limiting and access control
- [ ] Error handling and retries
- [ ] Deployment scripts
- [ ] Testing suite

## Development

### Prerequisites

- dfx CLI installed (`sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"`)
- Motoko extension for VS Code (recommended)

### Local Development

```bash
# Start local ICP replica
dfx start --background --clean

# Deploy canister locally
dfx deploy ouroc_mesos_backend

# Call health endpoint
dfx canister call ouroc_mesos_backend health
```

### Testing

```bash
# TODO: Add test suite
```

## Deployment

### Local (Development)

```bash
dfx deploy ouroc_mesos_backend
```

### IC Mainnet (Production)

```bash
# Deploy to mainnet
dfx deploy --network ic ouroc_mesos_backend

# Get canister ID
dfx canister --network ic id ouroc_mesos_backend
```

## API Endpoints

### Health Check

```motoko
health() : async {
  status: Text;
  timestamp: Int;
  canister: Text;
}
```

### Store Content

```motoko
storeContent(content: ContentMetadata) : async ApiResponse<ContentMetadata>
```

### Store Guild

```motoko
storeGuild(guild: GuildMetadata) : async ApiResponse<GuildMetadata>
```

### Store Proposal

```motoko
storeProposal(proposal: ProposalMetadata) : async ApiResponse<ProposalMetadata>
```

### Get All Content

```motoko
getAllContent() : async ApiResponse<[ContentMetadata]>
```

### Get All Guilds

```motoko
getAllGuilds() : async ApiResponse<[GuildMetadata]>
```

### Get All Proposals

```motoko
getAllProposals() : async ApiResponse<[ProposalMetadata]>
```

## Implementation Plan

### Phase 1: Basic HTTPS Outcalls ✅ Current Phase
- [x] Create canister structure
- [ ] Implement HTTPS outcalls to Aleph REST API
- [ ] Test read operations (getAllContent, etc.)
- [ ] Deploy to local replica

### Phase 2: Threshold ECDSA Integration
- [ ] Generate Solana keypair using threshold ECDSA
- [ ] Sign Aleph messages with Solana account
- [ ] Test write operations (storeContent, etc.)
- [ ] Verify Aleph message posting

### Phase 3: Authentication & Security
- [ ] Add Internet Identity integration
- [ ] Implement caller-based access control
- [ ] Add rate limiting per caller
- [ ] Add input validation

### Phase 4: Production Deployment
- [ ] Deploy to IC mainnet
- [ ] Update frontend to use canister endpoints
- [ ] Monitor cycles consumption
- [ ] Set up automatic top-up

## Migration from Express

### Current (Express):
```typescript
// Frontend calls Express API
POST http://localhost:3001/api/content
```

### Future (ICP Canister):
```typescript
// Frontend calls canister directly
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "./declarations/ouroc_mesos_backend";

const agent = new HttpAgent({ host: "https://ic0.app" });
const actor = Actor.createActor(idlFactory, {
  agent,
  canisterId: "rrkah-fqaaa-aaaaa-aaaaq-cai",
});

const result = await actor.storeContent({
  id: "content_123",
  title: "My Course",
  // ...
});
```

### Dual Deployment Strategy

For a smooth migration, we can run both simultaneously:

```
Frontend
├─ Primary: ICP Canister (decentralized)
└─ Fallback: Express API (traditional server)
```

## Cost Comparison

### Express (Traditional):
- Server: $5-20/month (Railway, DigitalOcean)
- Always running (even with no traffic)
- Manual scaling required

### ICP Canister:
- Storage: ~$5/GB/year
- Compute: ~$0.50 per million instructions
- HTTPS outcalls: ~$0.02 per 1000 calls
- **Example**: 1000 users, 10k requests/month = ~$2/month
- Only pay for actual usage
- Automatic scaling included

**Winner:** ICP Canister (cheaper + decentralized)

## Technical Details

### Solana Signing with Threshold ECDSA

```motoko
import IC "mo:base/ExperimentalInternetComputer";

// Generate Solana-compatible ECDSA key
let key_id = {
  curve = #secp256k1;
  name = "solana_key_1";
};

// Sign message for Aleph
public func signAlephMessage(message: Blob) : async Blob {
  let signature = await IC.sign_with_ecdsa({
    message_hash = message;
    derivation_path = [Blob.fromArray([0, 1, 2, 3])];
    key_id = key_id;
  });

  return signature.signature;
};
```

### HTTPS Outcalls to Aleph

```motoko
import IC "mo:base/ExperimentalInternetComputer";

public func postToAleph(content: Text) : async Text {
  let request : IC.HttpRequestArgs = {
    url = alephApiUrl # "/api/v0/posts";
    max_response_bytes = ?1000;
    headers = [
      { name = "Content-Type"; value = "application/json" }
    ];
    body = ?Text.encodeUtf8(content);
    method = #post;
    transform = null;
  };

  let response = await IC.http_request(request);

  switch (response.status) {
    case (200) {
      // Parse response and return Aleph hash
      return "QmSuccess";
    };
    case (_) {
      throw Error.reject("Aleph API error");
    };
  };
};
```

## Security Considerations

### Access Control

```motoko
import Principal "mo:base/Principal";

stable var admins : [Principal] = [];

public shared(msg) func storeContent(content: ContentMetadata) : async ApiResponse<ContentMetadata> {
  // Only allow authenticated users
  if (Principal.isAnonymous(msg.caller)) {
    return {
      success = false;
      data = null;
      error = ?"Authentication required";
      hash = null;
    };
  };

  // Rate limiting per caller
  // TODO: Implement rate limiting logic

  // Proceed with storage
  // ...
};
```

## Monitoring & Cycles

### Check Canister Status

```bash
dfx canister --network ic status ouroc_mesos_backend
```

### Top Up Cycles

```bash
dfx ledger --network ic top-up ouroc_mesos_backend --amount 1.0
```

### Set Up Auto-Top-Up

```motoko
// In canister code
public func checkCycles() : async Nat {
  let balance = ExperimentalCycles.balance();

  // Alert if below threshold
  if (balance < 1_000_000_000_000) {
    // Log warning or notify admin
  };

  return balance;
};
```

## Resources

- [ICP Developer Docs](https://internetcomputer.org/docs)
- [Motoko Language Guide](https://internetcomputer.org/docs/current/motoko/main/getting-started/motoko-introduction)
- [Threshold ECDSA](https://internetcomputer.org/docs/current/developer-docs/integrations/t-ecdsa/)
- [HTTPS Outcalls](https://internetcomputer.org/docs/current/developer-docs/integrations/https-outcalls/)
- [Aleph.im Docs](https://docs.aleph.im)

## Status

**Current**: Express API running in development ✅

**Next Step**: Implement HTTPS outcalls to Aleph REST API

**Timeline**:
- Week 1-2: HTTPS outcalls for read operations
- Week 3-4: Threshold ECDSA for Solana signing
- Week 5-6: Authentication and security
- Week 7-8: Production deployment

**Contact**: Open an issue for questions or collaboration!
