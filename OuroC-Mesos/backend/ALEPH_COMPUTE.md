# Aleph.im for Backend Compute

**Question**: Can we run the backend on Aleph.im instead of Railway/ICP?

**Answer**: YES! Aleph.im has **Aleph VMs** and **Programs** for running code!

---

## Aleph.im Full Stack Architecture

Currently we use Aleph only for **storage**. But Aleph can do much more:

```
Current (Partial Aleph):
Frontend → Express (Railway) → Aleph.im (Storage only)

Possible (Full Aleph):
Frontend → Aleph.im (Compute + Storage)
```

---

## Aleph.im Compute Options

### 1. Aleph VMs (Virtual Machines) 🖥️

**What it is**: Run a full VM on Aleph's decentralized network

**Use case**: Host our Express backend

**How it works**:
```bash
# Create an Aleph VM running Ubuntu
aleph vm create \
  --runtime custom \
  --rootfs ubuntu-22.04 \
  --code ./backend-bundle.tar.gz \
  --memory 2048 \
  --vcpus 1
```

**Pros**:
- ✅ Run any code (Node.js, Python, etc.)
- ✅ Full control over environment
- ✅ Can use npm packages
- ✅ Decentralized hosting
- ✅ Pay-per-use pricing

**Cons**:
- ⚠️ Need to bundle application
- ⚠️ More complex setup than Railway
- ⚠️ Documentation is limited
- ⚠️ Beta stage

**Cost**: ~$5-15/month (comparable to Railway)

---

### 2. Aleph Programs (Lightweight Functions) ⚡

**What it is**: Serverless functions on Aleph

**Use case**: Individual API endpoints

**How it works**:
```python
# Python example (Aleph supports Python well)
from aleph_message.models import ItemType

async def handler(event, context):
    # Your API logic here
    content = event['body']

    # Store to Aleph
    result = await store_message(content)

    return {
        'statusCode': 200,
        'body': {'success': True, 'hash': result.item_hash}
    }
```

**Pros**:
- ✅ Simple serverless model
- ✅ Auto-scaling
- ✅ Pay only for executions
- ✅ Python SDK well-supported

**Cons**:
- ⚠️ Python only (no TypeScript yet)
- ⚠️ Would need to rewrite backend
- ⚠️ Limited to 30s execution time
- ⚠️ Cold starts

**Cost**: ~$0.01 per 1000 requests

---

## Full Aleph Architecture

### Storage + Compute on Aleph

```
┌─────────────────────────────────────────────────────┐
│              Frontend (React + Solana)              │
│  - Vercel / Fleek (decentralized hosting)          │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────┐
│           Aleph.im VM (Backend API)                 │
│  ┌──────────────────────────────────────────────┐  │
│  │ Express Server                                │  │
│  │  - POST /api/content                         │  │
│  │  - POST /api/guilds                          │  │
│  │  - POST /api/proposals                       │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ Aleph SDK (Local)                            │  │
│  │  - Sign messages with Solana account        │  │
│  │  - Post to Aleph storage                    │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│         Aleph.im Storage Network                    │
│  - Content metadata                                 │
│  - Guild metadata                                   │
│  - Proposal metadata                                │
└─────────────────────────────────────────────────────┘

Additional Layers:
┌─────────────────────────────────────────────────────┐
│ ICP Timer (Recurring Payments)                      │
│  - Schedules Solana transactions                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Squads Protocol (Guild Treasuries)                  │
│  - Multisig on Solana                               │
└─────────────────────────────────────────────────────┘
```

**Benefits**:
- ✅ Fully decentralized stack
- ✅ Compute + Storage on same network
- ✅ Lower latency (no external API calls)
- ✅ Censorship resistant
- ✅ No vendor lock-in

---

## Implementation Options

### Option A: Aleph VM with Express 🖥️

**Best for**: Minimal code changes

**Setup**:

```bash
# 1. Install Aleph CLI
pip install aleph-client

# 2. Package backend
cd backend
npm run build
tar -czf backend.tar.gz dist/ node_modules/ package.json

# 3. Create startup script
cat > start.sh << 'EOF'
#!/bin/bash
cd /opt/backend
npm install --production
node dist/server.js
EOF

# 4. Create Aleph VM
aleph vm create \
  --channel OuroC-Mesos \
  --runtime ubuntu-22.04 \
  --rootfs ./backend.tar.gz \
  --entrypoint ./start.sh \
  --memory 2048 \
  --vcpus 1 \
  --payment 100

# 5. Get VM URL
# https://<vm-hash>.aleph.sh
```

**Code Changes**: Almost none! Just deployment

---

### Option B: Aleph Programs (Serverless) ⚡

**Best for**: Cost optimization, auto-scaling

**Requires**: Rewrite in Python

```python
# aleph_backend/content.py
from aleph.sdk.client import AuthenticatedAlephClient
from aleph.sdk.chains.solana import SOLAccount

async def store_content(event, context):
    """Store content on Aleph"""

    # Initialize Aleph client
    account = SOLAccount(private_key=SOLANA_PRIVATE_KEY)
    async with AuthenticatedAlephClient(account) as client:

        # Parse request
        content = event['body']

        # Post to Aleph
        message = await client.create_post(
            post_content=content,
            post_type='OuroC-Mesos-Content',
            channel='OuroC-Mesos',
        )

        return {
            'statusCode': 200,
            'body': {
                'success': True,
                'hash': message.item_hash,
            }
        }

# Deploy
# aleph program upload ./aleph_backend
```

**Code Changes**: Complete rewrite (TypeScript → Python)

---

### Option C: Hybrid Aleph + ICP ⚙️

**Best for**: Best of both worlds

```
Frontend (Vercel)
    ↓
ICP Canister (Azle TypeScript)
    ↓
Aleph.im Storage
```

**Why?**
- ICP for compute (TypeScript, threshold ECDSA)
- Aleph for storage (decentralized, cheap)
- Both decentralized
- Best tooling for each layer

---

## Detailed Comparison

| Feature | Aleph VM | Aleph Programs | Railway | ICP Azle |
|---------|----------|----------------|---------|----------|
| **Code Changes** | Minimal | Complete rewrite | None | ~20% |
| **Language** | Any | Python | Any | TypeScript |
| **Decentralized** | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **Cost/month** | $5-15 | $0.01/1k req | $5-20 | $2-5 |
| **Auto-scaling** | ⚠️ Manual | ✅ Yes | ⚠️ Manual | ✅ Yes |
| **Maturity** | ⚠️ Beta | ⚠️ Beta | ✅ Stable | ⚠️ Beta |
| **Docs Quality** | ⚠️ Limited | ⚠️ Limited | ✅ Excellent | ✅ Good |
| **Cold Starts** | ❌ No | ✅ Yes | ❌ No | ❌ No |
| **Max Request Time** | ∞ | 30s | ∞ | 20s |
| **Storage Integration** | ✅ Same network | ✅ Built-in | 🔌 External | 🔌 External |

---

## Cost Comparison (1000 users, 10k requests/month)

### Aleph VM
```
VM (2GB RAM, 1 vCPU): $10/month
Storage (100GB): $0.50/month
Bandwidth: Included
Total: ~$10.50/month
```

### Aleph Programs
```
Compute: 10k requests × $0.01/1k = $0.10
Storage (100GB): $0.50/month
Total: ~$0.60/month ⭐ Cheapest!
```

### Railway
```
Starter plan: $5/month
Overages: ~$5/month
Total: ~$10/month
```

### ICP Azle
```
Storage: $0.42/month
Compute: $1.50/month
HTTPS outcalls: $0.50/month
Total: ~$2.42/month
```

**Winner by cost**: Aleph Programs ($0.60/month) 🏆

**Winner by ease**: Railway ($10/month) ⚡

**Winner by decentralization**: All except Railway ✅

---

## Recommendation Matrix

### Choose Aleph VM If:
- ✅ You want full decentralization
- ✅ You want to use existing Express code
- ✅ You're okay with beta-stage platform
- ✅ You want storage + compute on same network
- ⚠️ You can handle limited documentation

### Choose Aleph Programs If:
- ✅ You want serverless/auto-scaling
- ✅ You want lowest cost ($0.60/month!)
- ✅ You're willing to rewrite in Python
- ✅ Your functions run < 30s
- ⚠️ You can handle beta-stage platform

### Choose Railway If:
- ✅ You need production TODAY
- ✅ You want zero code changes
- ✅ You want excellent documentation
- ✅ You're okay with centralized (for now)
- ✅ You value stability over decentralization

### Choose ICP Azle If:
- ✅ You want TypeScript on blockchain
- ✅ You want threshold ECDSA signing
- ✅ You value ICP ecosystem integration
- ✅ You're okay with $2-5/month
- ✅ You want integration with ICP Timer

---

## Full Aleph Stack Example

### Deploy Express Backend to Aleph VM

**Step 1: Prepare Application**

```bash
# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY dist ./dist
CMD ["node", "dist/server.js"]
```

**Step 2: Create Aleph VM Configuration**

```yaml
# aleph-vm.yaml
resources:
  vcpus: 1
  memory: 2048
  seconds: 30

runtime:
  ref: ubuntu-22.04
  use_latest: true

rootfs:
  parent:
    ref: ubuntu-22.04
    use_latest: true

volumes:
  - mount: /app
    ref: <your-volume-hash>
    use_latest: true

environment:
  SOLANA_PRIVATE_KEY: "[161,127,...]"
  FRONTEND_URL: "https://your-frontend.vercel.app"
  NODE_ENV: "production"
```

**Step 3: Deploy**

```bash
# Install Aleph CLI
pip install aleph-client

# Create account
aleph account create

# Upload code
aleph storage upload ./backend-bundle.tar.gz

# Create VM
aleph vm create \
  --config aleph-vm.yaml \
  --channel OuroC-Mesos

# Get URL
# Your API is now at: https://<vm-hash>.aleph.sh
```

**Step 4: Update Frontend**

```bash
# frontend/.env.production
VITE_BACKEND_URL=https://<vm-hash>.aleph.sh
```

---

## Aleph Resources

### Documentation
- [Aleph VMs Guide](https://docs.aleph.im/computing/vms/)
- [Aleph Programs Guide](https://docs.aleph.im/computing/programs/)
- [Python SDK](https://docs.aleph.im/libraries/python-sdk/)
- [Storage Docs](https://docs.aleph.im/storage/)

### Examples
- [Aleph VM Examples](https://github.com/aleph-im/aleph-vm-examples)
- [Python Program Examples](https://github.com/aleph-im/aleph-sdk-python/tree/main/examples)

### Community
- [Aleph Discord](https://discord.gg/aleph)
- [Aleph Forum](https://community.aleph.im)

---

## Decision Framework

### Priority: Speed to Market
**Recommendation**: Railway → Migrate later
- Deploy today
- Proven stack
- Migrate to Aleph/ICP in 2-3 months

### Priority: Full Decentralization + Keep TypeScript
**Recommendation**: ICP Azle
- TypeScript works
- Threshold ECDSA built-in
- Aleph for storage only
- 1-2 week migration

### Priority: Full Decentralization + Aleph Native
**Recommendation**: Aleph VM
- Backend on Aleph
- Storage on Aleph
- Same network, lower latency
- 1-2 week migration

### Priority: Lowest Cost
**Recommendation**: Aleph Programs
- $0.60/month (95% cheaper!)
- Serverless auto-scaling
- Requires Python rewrite
- 2-4 week migration

---

## Ultimate Stack Comparison

### Stack 1: All Aleph 🌟
```
Frontend (Fleek) → Aleph VM → Aleph Storage
```
**Cost**: $10-15/month
**Decentralized**: ✅ 100%
**Code**: Minimal changes
**Time**: 1-2 weeks

### Stack 2: ICP + Aleph 🚀
```
Frontend (Vercel) → ICP Azle → Aleph Storage
```
**Cost**: $2-5/month
**Decentralized**: ✅ 100%
**Code**: ~20% changes
**Time**: 1-2 weeks

### Stack 3: Traditional + Aleph ⚡
```
Frontend (Vercel) → Railway → Aleph Storage
```
**Cost**: $10-20/month
**Decentralized**: ⚠️ 50%
**Code**: Zero changes
**Time**: 1 day

### Stack 4: Aleph Serverless 💰
```
Frontend (Fleek) → Aleph Programs → Aleph Storage
```
**Cost**: $0.60/month ⭐ Cheapest!
**Decentralized**: ✅ 100%
**Code**: Complete rewrite (Python)
**Time**: 2-4 weeks

---

## My Updated Recommendation

### Phase 1: Railway (Now - Month 1)
```
Frontend → Railway → Aleph Storage
```
- Deploy today
- Get users
- Zero code changes

### Phase 2: Evaluate (Month 2-3)
Test both:
- **ICP Azle**: Better for threshold ECDSA, ICP Timer integration
- **Aleph VM**: Better for all-in-one Aleph stack

### Phase 3: Choose Winner (Month 4+)
Based on:
- Performance testing
- Cost analysis
- Developer experience
- Community support

**Likely Winner**: ICP Azle
- TypeScript ✅
- Threshold ECDSA ✅
- Best integration with ICP Timer ✅
- Lower cost than Aleph VM ✅
- Aleph for storage ✅

---

## Final Answer

**Can we use Aleph for backend compute?**
**YES!** Three ways:

1. **Aleph VM** - Run Express as-is on Aleph (~$10/month)
2. **Aleph Programs** - Serverless Python functions (~$0.60/month)
3. **Hybrid** - ICP Azle for compute, Aleph for storage (~$2/month)

**Best Strategy**:
1. Start with Railway (today)
2. Evaluate ICP Azle vs Aleph VM (month 2-3)
3. Migrate to winner (month 4+)

**Most Likely Outcome**: ICP Azle for compute + Aleph for storage = Best balance of cost, features, and decentralization! 🎯
