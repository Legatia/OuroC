# Community Hub - Backend Architecture Design

**Date**: November 4, 2025
**Status**: Design Phase
**Goal**: Build scalable backend for P2P learning marketplace

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Storage Strategy](#data-storage-strategy)
3. [API Design](#api-design)
4. [Integration with ICP Timer](#integration-with-icp-timer)
5. [Database Schema](#database-schema)
6. [File Storage (IPFS)](#file-storage-ipfs)
7. [Gamification Backend](#gamification-backend)
8. [Security Considerations](#security-considerations)
9. [Implementation Phases](#implementation-phases)

---

## Architecture Overview

### Technology Stack Options

#### **Option A: Hybrid (Recommended)**
```
Frontend (React)
    ↓
Backend API (Node.js/Express or Rust)
    ↓
PostgreSQL (metadata, stats) + IPFS (content, thumbnails)
    ↓
ICP Timer (subscription management via existing canister)
    ↓
Solana (on-chain payments via OuroC-Prima)
```

**Why Hybrid?**
- Fast queries for listings/search (PostgreSQL)
- Decentralized content storage (IPFS)
- Leverage existing ICP timer infrastructure
- No need to rewrite subscription logic

#### **Option B: Fully On-Chain (Future consideration)**
```
Frontend → ICP Canister (all logic) → Solana (payments)
```
- More decentralized but higher complexity
- Higher gas costs for frequent queries
- Better for later scaling

---

## Data Storage Strategy

### **Three-Tier Storage Model**

#### 1. **PostgreSQL/Supabase** (Fast, queryable metadata)
```
Purpose:
- Content metadata (title, description, category, price)
- Creator profiles and stats
- Search indexing
- Analytics data
- User activity logs

Why?
- Fast full-text search
- Complex queries (filtering, sorting)
- Real-time analytics
- Easy to scale with read replicas
```

#### 2. **IPFS** (Decentralized content storage)
```
Purpose:
- Course thumbnails
- Profile pictures
- Content files (videos, PDFs, etc.)
- Rich content metadata

Why?
- Immutable content addressing
- No centralized storage costs
- Content permanence
- Can migrate to Arweave later for permanent storage
```

#### 3. **ICP Timer Canister** (Subscription state)
```
Purpose:
- Subscription status (active, paused, cancelled)
- Payment schedule
- Next execution time
- Subscriber wallet addresses

Why?
- Already built and tested
- Handles payment automation
- Leverages existing agent network
```

---

## API Design

### **REST API Structure**

Base URL: `https://api.ouroc-mesos.com/v1`

#### **Content Endpoints**

```typescript
// ==========================================
// GET /community-hub/content
// Get all available content with filters
// ==========================================
GET /community-hub/content
Query Params:
  - category?: string
  - minPrice?: number
  - maxPrice?: number
  - search?: string
  - sortBy?: 'popular' | 'rating' | 'newest' | 'price-asc' | 'price-desc'
  - page?: number
  - limit?: number (default: 20)

Response:
{
  "data": [
    {
      "id": "content_123",
      "title": "Advanced React Patterns",
      "description": "Master advanced React...",
      "creator": {
        "wallet": "9BVTpkYk4FvZ5dMPF6H4SXdxYnpZtvdCJqG7TYjjkzHQ",
        "displayName": "John Doe",
        "level": 5,
        "badges": ["🎓", "⭐", "🔥"],
        "rating": 4.8
      },
      "price": 20,
      "interval": "monthly",
      "category": "Programming",
      "thumbnailUrl": "ipfs://QmXxx...",
      "stats": {
        "subscribers": 45,
        "rating": 4.8,
        "totalReviews": 23
      },
      "subscriptionId": "sub_react_patterns_123", // For ICP timer
      "createdAt": "2025-10-15T10:00:00Z",
      "updatedAt": "2025-11-01T15:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}

// ==========================================
// GET /community-hub/content/:id
// Get single content details
// ==========================================
GET /community-hub/content/:id

Response:
{
  "id": "content_123",
  "title": "Advanced React Patterns",
  "fullDescription": "Full markdown description...",
  "creator": { ... },
  "price": 20,
  "interval": "monthly",
  "thumbnailUrl": "ipfs://QmXxx...",
  "stats": { ... },
  "syllabus": [
    { "week": 1, "title": "Introduction to Render Props" },
    { "week": 2, "title": "Higher Order Components" },
    // ...
  ],
  "reviews": [
    {
      "id": "review_1",
      "subscriber": "8xK5J2vN...",
      "rating": 5,
      "comment": "Great course!",
      "createdAt": "2025-10-20T10:00:00Z"
    }
  ],
  "subscriptionId": "sub_react_patterns_123"
}

// ==========================================
// POST /community-hub/content
// Create new content (creators only)
// ==========================================
POST /community-hub/content
Headers:
  - Authorization: Bearer <wallet_signature>
  - X-Wallet-Address: <creator_wallet>

Body:
{
  "title": "Advanced React Patterns",
  "description": "Master advanced React...",
  "category": "Programming",
  "price": 20,
  "interval": "monthly",
  "thumbnailFile": "<base64_or_multipart>",
  "syllabus": [...]
}

Response:
{
  "id": "content_123",
  "subscriptionId": "sub_react_patterns_123", // Created in ICP
  "ipfsHash": "QmXxx...",
  "createdAt": "2025-11-04T10:00:00Z"
}

// ==========================================
// PATCH /community-hub/content/:id
// Update content (creator only)
// ==========================================
PATCH /community-hub/content/:id
Headers:
  - Authorization: Bearer <wallet_signature>
  - X-Wallet-Address: <creator_wallet>

Body:
{
  "title": "Updated Title",
  "description": "Updated description...",
  "price": 25
}

Response:
{
  "id": "content_123",
  "updatedAt": "2025-11-04T11:00:00Z"
}

// ==========================================
// DELETE /community-hub/content/:id
// Delete content (creator only)
// ==========================================
DELETE /community-hub/content/:id
Headers:
  - Authorization: Bearer <wallet_signature>

Response:
{
  "message": "Content deleted successfully",
  "subscriptionsCancelled": 12 // Auto-cancel all active subscriptions
}
```

#### **Subscription Endpoints**

```typescript
// ==========================================
// POST /community-hub/subscribe
// Subscribe to content
// ==========================================
POST /community-hub/subscribe
Headers:
  - Authorization: Bearer <wallet_signature>
  - X-Wallet-Address: <subscriber_wallet>

Body:
{
  "contentId": "content_123",
  "promoCode": "EARLYBIRD" // Optional
}

Flow:
1. Check USDC balance (via Solana RPC)
2. Check promo code validity
3. Calculate final price (with discount)
4. Approve delegation (Solana transaction)
5. Create subscription in ICP timer
6. Store subscription record in PostgreSQL
7. Update content subscriber count

Response:
{
  "subscriptionId": "sub_react_patterns_subscriber_123",
  "contentId": "content_123",
  "amountUSDC": 20000000, // 20 USDC in micro-units
  "interval": "monthly",
  "nextPaymentDate": "2025-12-04T10:00:00Z",
  "status": "active"
}

// ==========================================
// GET /community-hub/my-subscriptions
// Get user's subscriptions
// ==========================================
GET /community-hub/my-subscriptions
Headers:
  - X-Wallet-Address: <subscriber_wallet>

Response:
{
  "subscriptions": [
    {
      "id": "sub_123",
      "content": {
        "id": "content_123",
        "title": "Advanced React Patterns",
        "thumbnailUrl": "ipfs://QmXxx...",
        "creator": { ... }
      },
      "status": "active",
      "nextPaymentDate": "2025-12-04T10:00:00Z",
      "amountUSDC": 20,
      "subscribedAt": "2025-11-04T10:00:00Z"
    }
  ]
}
```

#### **Creator Dashboard Endpoints**

```typescript
// ==========================================
// GET /community-hub/creator/stats
// Get creator earnings and stats
// ==========================================
GET /community-hub/creator/stats
Headers:
  - X-Wallet-Address: <creator_wallet>

Response:
{
  "totalEarnings": 12500, // All-time in USD
  "monthlyEarnings": 1250,
  "totalSubscribers": 45,
  "activeSubscribers": 38,
  "totalCourses": 3,
  "level": 5,
  "badges": ["🎓", "⭐", "🔥"],
  "revenueChart": [
    { "month": "2025-08", "revenue": 800 },
    { "month": "2025-09", "revenue": 1000 },
    { "month": "2025-10", "revenue": 1250 }
  ],
  "topContent": [
    {
      "id": "content_1",
      "title": "Advanced React Patterns",
      "subscribers": 23,
      "revenue": 460,
      "rating": 4.8
    }
  ]
}

// ==========================================
// GET /community-hub/creator/content
// Get creator's content
// ==========================================
GET /community-hub/creator/content
Headers:
  - X-Wallet-Address: <creator_wallet>

Response:
{
  "content": [
    {
      "id": "content_1",
      "title": "Advanced React Patterns",
      "status": "active",
      "subscribers": 23,
      "monthlyRevenue": 460,
      "rating": 4.8,
      "views": 1250,
      "conversionRate": 1.84 // (23 / 1250) * 100
    }
  ]
}

// ==========================================
// GET /community-hub/creator/earnings
// Detailed earnings breakdown
// ==========================================
GET /community-hub/creator/earnings
Headers:
  - X-Wallet-Address: <creator_wallet>

Query Params:
  - startDate?: string
  - endDate?: string
  - contentId?: string

Response:
{
  "earnings": [
    {
      "date": "2025-11-01",
      "contentId": "content_1",
      "contentTitle": "Advanced React Patterns",
      "subscriber": "8xK5J2vN...",
      "amount": 20,
      "transactionHash": "5KJH...",
      "status": "completed"
    }
  ],
  "summary": {
    "totalEarnings": 460,
    "platformFee": 9.2, // 2% of 460
    "netEarnings": 450.8
  }
}
```

#### **Gamification Endpoints**

```typescript
// ==========================================
// GET /gamification/profile/:wallet
// Get user's gamification profile
// ==========================================
GET /gamification/profile/:wallet

Response:
{
  "wallet": "9BVTpkYk...",
  "userType": "creator", // or "learner" or "both"
  "creator": {
    "level": 5,
    "xp": 1250,
    "nextLevelXp": 1600,
    "badges": [
      {
        "id": "badge_educator",
        "name": "Educator",
        "icon": "🎓",
        "earnedAt": "2025-09-15T10:00:00Z"
      }
    ],
    "achievements": [
      {
        "id": "ach_first_sub",
        "title": "First Subscriber",
        "description": "Got your first subscriber",
        "icon": "🎉",
        "earnedAt": "2025-09-20T10:00:00Z"
      }
    ]
  },
  "learner": {
    "level": 3,
    "xp": 540,
    "nextLevelXp": 900,
    "badges": ["📚", "🎯", "💡"],
    "coursesCompleted": 2,
    "totalSpent": 240
  }
}

// ==========================================
// POST /gamification/claim-certificate
// Mint NFT certificate for course completion
// ==========================================
POST /gamification/claim-certificate
Headers:
  - Authorization: Bearer <wallet_signature>
  - X-Wallet-Address: <learner_wallet>

Body:
{
  "contentId": "content_123",
  "completionProof": "..." // e.g., quiz scores, attendance
}

Response:
{
  "certificateId": "cert_123",
  "nftMint": "Cert9BVTpkYk...", // Solana NFT mint address
  "transactionHash": "5KJH...",
  "ipfsMetadata": "ipfs://QmCert..."
}
```

---

## Integration with ICP Timer

### How Community Hub Works with Existing ICP Timer

```typescript
// ==========================================
// Flow: Creator Creates Content
// ==========================================

1. Frontend: Creator fills form and uploads thumbnail
   ↓
2. Backend API:
   - Store thumbnail in IPFS → Get IPFS hash
   - Generate unique subscription_id: "community_hub_content_123"
   ↓
3. Call ICP Timer Canister:
   createSubscriptionTemplate({
     subscription_id: "community_hub_content_123",
     merchant_address: creator_wallet,
     amount: price * 1_000_000, // USDC micro-units
     interval_seconds: getIntervalSeconds(interval),
     payment_token_mint: USDC_MINT_DEVNET,
     solana_contract_address: OUROC_PRIMA_CONTRACT
   })
   ↓
4. Store in PostgreSQL:
   INSERT INTO community_content (
     id, title, description, category, price,
     creator_wallet, thumbnail_ipfs, subscription_id, ...
   )
   ↓
5. Return to frontend: Content created!

// ==========================================
// Flow: Learner Subscribes to Content
// ==========================================

1. Frontend: User clicks "Subscribe" on content
   ↓
2. Backend API:
   - Fetch content from PostgreSQL
   - Get subscription_id: "community_hub_content_123"
   ↓
3. Frontend:
   - Check USDC balance
   - Approve delegation (Solana transaction)
   ↓
4. Call ICP Timer Canister:
   createSubscription({
     subscription_id: "community_hub_content_123_subscriber_456",
     // Uses the template created by creator
     subscriber_address: learner_wallet,
     merchant_address: creator_wallet,
     ...rest from template
   })
   ↓
5. Store subscription record in PostgreSQL:
   INSERT INTO subscriptions (
     id, content_id, subscriber_wallet, status, ...
   )
   ↓
6. Update content stats:
   UPDATE community_content
   SET subscriber_count = subscriber_count + 1
   WHERE id = 'content_123'
   ↓
7. Award gamification XP to both creator and learner
   ↓
8. Return to frontend: Subscribed successfully!

// ==========================================
// Flow: Agent Triggers Payment
// ==========================================

1. ICP Agent polls timer canister (existing flow)
   ↓
2. Agent triggers payment via OuroC-Prima contract
   ↓
3. Payment webhook → Backend API:
   POST /webhooks/payment-completed
   Body: {
     subscriptionId: "community_hub_content_123_subscriber_456",
     transactionHash: "5KJH...",
     amount: 20000000
   }
   ↓
4. Backend stores transaction:
   INSERT INTO earnings (
     creator_wallet, content_id, subscriber_wallet,
     amount, transaction_hash, date
   )
   ↓
5. Update creator stats in real-time
   ↓
6. Send notification to creator (optional)
```

---

## Database Schema

### **PostgreSQL Tables**

```sql
-- ==========================================
-- Community Content
-- ==========================================
CREATE TABLE community_content (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  full_description TEXT, -- Markdown
  category TEXT NOT NULL,

  -- Pricing
  price DECIMAL(10, 2) NOT NULL,
  interval TEXT NOT NULL CHECK (interval IN ('weekly', 'monthly', 'quarterly')),

  -- Creator info
  creator_wallet TEXT NOT NULL,
  creator_display_name TEXT,

  -- IPFS storage
  thumbnail_ipfs TEXT, -- ipfs://QmXxx...
  content_ipfs TEXT, -- Optional: syllabus, materials

  -- ICP Timer integration
  subscription_id TEXT UNIQUE NOT NULL, -- Links to ICP timer

  -- Stats
  subscriber_count INTEGER DEFAULT 0,
  total_revenue DECIMAL(15, 2) DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_creator_wallet (creator_wallet),
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- ==========================================
-- Subscriptions (Community Hub)
-- ==========================================
CREATE TABLE community_subscriptions (
  id TEXT PRIMARY KEY, -- Same as ICP timer subscription_id
  content_id TEXT REFERENCES community_content(id),

  -- Subscriber info
  subscriber_wallet TEXT NOT NULL,

  -- Subscription details
  amount_usdc DECIMAL(10, 6) NOT NULL,
  interval TEXT NOT NULL,

  -- Status synced from ICP timer
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  next_payment_date TIMESTAMP,

  -- Promo code
  promo_code TEXT,
  discount_percentage INTEGER,

  -- Timestamps
  subscribed_at TIMESTAMP DEFAULT NOW(),
  cancelled_at TIMESTAMP,

  -- Indexes
  INDEX idx_subscriber (subscriber_wallet),
  INDEX idx_content (content_id),
  INDEX idx_status (status)
);

-- ==========================================
-- Earnings (Transaction Log)
-- ==========================================
CREATE TABLE community_earnings (
  id SERIAL PRIMARY KEY,

  -- Payment details
  creator_wallet TEXT NOT NULL,
  content_id TEXT REFERENCES community_content(id),
  subscriber_wallet TEXT NOT NULL,
  subscription_id TEXT REFERENCES community_subscriptions(id),

  -- Amount breakdown
  amount_usdc DECIMAL(10, 6) NOT NULL,
  platform_fee DECIMAL(10, 6) NOT NULL, -- 2%
  creator_net DECIMAL(10, 6) NOT NULL, -- amount - platform_fee

  -- Blockchain proof
  transaction_hash TEXT NOT NULL,
  block_number BIGINT,

  -- Date
  payment_date TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_creator (creator_wallet),
  INDEX idx_payment_date (payment_date),
  INDEX idx_content (content_id)
);

-- ==========================================
-- Reviews
-- ==========================================
CREATE TABLE community_reviews (
  id SERIAL PRIMARY KEY,
  content_id TEXT REFERENCES community_content(id),

  -- Reviewer info
  subscriber_wallet TEXT NOT NULL,

  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Prevent duplicate reviews
  UNIQUE(content_id, subscriber_wallet),

  -- Indexes
  INDEX idx_content (content_id),
  INDEX idx_subscriber (subscriber_wallet)
);

-- ==========================================
-- Creator Stats Cache (for fast dashboard queries)
-- ==========================================
CREATE TABLE creator_stats_cache (
  creator_wallet TEXT PRIMARY KEY,

  -- Earnings
  total_earnings DECIMAL(15, 2) DEFAULT 0,
  monthly_earnings DECIMAL(15, 2) DEFAULT 0,

  -- Subscribers
  total_subscribers INTEGER DEFAULT 0,
  active_subscribers INTEGER DEFAULT 0,

  -- Content
  total_courses INTEGER DEFAULT 0,
  active_courses INTEGER DEFAULT 0,

  -- Gamification
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,

  -- Last updated
  last_updated TIMESTAMP DEFAULT NOW(),

  INDEX idx_last_updated (last_updated)
);

-- ==========================================
-- Gamification: User Profiles
-- ==========================================
CREATE TABLE gamification_profiles (
  wallet TEXT PRIMARY KEY,

  -- Creator stats
  creator_level INTEGER DEFAULT 0,
  creator_xp INTEGER DEFAULT 0,
  creator_badges TEXT[] DEFAULT '{}', -- Array of badge IDs

  -- Learner stats
  learner_level INTEGER DEFAULT 0,
  learner_xp INTEGER DEFAULT 0,
  learner_badges TEXT[] DEFAULT '{}',
  courses_completed INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- Gamification: Achievements
-- ==========================================
CREATE TABLE achievements (
  id SERIAL PRIMARY KEY,
  wallet TEXT NOT NULL,
  achievement_type TEXT NOT NULL, -- 'badge', 'certificate', 'milestone'

  -- Achievement details
  achievement_id TEXT NOT NULL, -- e.g., 'badge_educator'
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,

  -- Related content
  content_id TEXT REFERENCES community_content(id),

  -- NFT certificate (if applicable)
  nft_mint TEXT, -- Solana NFT address
  ipfs_metadata TEXT,

  -- Date
  earned_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_wallet (wallet),
  INDEX idx_type (achievement_type)
);
```

---

## File Storage (IPFS)

### **IPFS Integration Strategy**

#### **Option A: Pinata (Recommended for MVP)**
```typescript
// Upload thumbnail to Pinata
import pinataSDK from '@pinata/sdk';

const pinata = pinataSDK(PINATA_API_KEY, PINATA_SECRET);

async function uploadThumbnail(file: Buffer, fileName: string) {
  const result = await pinata.pinFileToIPFS(file, {
    pinataMetadata: {
      name: fileName,
      keyvalues: {
        contentType: 'thumbnail',
        createdAt: Date.now().toString()
      }
    }
  });

  return `ipfs://${result.IpfsHash}`;
}

// Fetch from IPFS via gateway
const imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
```

**Pros:**
- Easy to use, reliable
- Free tier: 1GB storage
- Fast retrieval via CDN
- Pin management UI

**Cons:**
- Centralized (single point of failure)
- Need to migrate if scaling

#### **Option B: Self-hosted IPFS Node**
```bash
# Run IPFS node
docker run -d --name ipfs_host \
  -v /data/ipfs:/data/ipfs \
  -p 4001:4001 -p 8080:8080 -p 5001:5001 \
  ipfs/go-ipfs:latest
```

**Pros:**
- Full control
- No API rate limits
- More decentralized

**Cons:**
- Infrastructure overhead
- Need to ensure pinning

#### **Option C: Web3.Storage (Future)**
- Backed by Filecoin
- Permanent storage
- Better for production

---

## Gamification Backend

### **XP Calculation System**

```typescript
// ==========================================
// XP Rules for Creators
// ==========================================
const CREATOR_XP_RULES = {
  createContent: 50,
  firstSubscriber: 100,
  milestone10Subscribers: 200,
  milestone50Subscribers: 500,
  milestone100Subscribers: 1000,
  receive5StarReview: 25,
  reachLevel5: 500,
  monthlyRevenue100: 150,
};

// ==========================================
// XP Rules for Learners
// ==========================================
const LEARNER_XP_RULES = {
  firstSubscription: 50,
  completeCourse: 100,
  leaveReview: 25,
  streak7Days: 150,
  streak30Days: 500,
  subscribeToNewCreator: 30,
};

// ==========================================
// Level Calculation
// ==========================================
function calculateLevel(xp: number): number {
  // Level = sqrt(XP / 100)
  return Math.floor(Math.sqrt(xp / 100));
}

// ==========================================
// Badge Awarding Logic
// ==========================================
async function checkAndAwardBadges(wallet: string, type: 'creator' | 'learner') {
  if (type === 'creator') {
    const stats = await getCreatorStats(wallet);

    // Seedling (0+ subscribers)
    if (stats.totalSubscribers >= 0) {
      await awardBadge(wallet, 'badge_seedling', '🌱');
    }

    // Educator (10+ subscribers)
    if (stats.totalSubscribers >= 10) {
      await awardBadge(wallet, 'badge_educator', '🎓');
    }

    // Rising Star (25+ subscribers)
    if (stats.totalSubscribers >= 25) {
      await awardBadge(wallet, 'badge_rising_star', '⭐');
    }

    // Top Creator (50+ subscribers)
    if (stats.totalSubscribers >= 50) {
      await awardBadge(wallet, 'badge_top_creator', '🔥');
    }

    // Master Teacher (100+ subscribers)
    if (stats.totalSubscribers >= 100) {
      await awardBadge(wallet, 'badge_master_teacher', '💎');
    }

    // Legend (200+ subscribers)
    if (stats.totalSubscribers >= 200) {
      await awardBadge(wallet, 'badge_legend', '👑');
    }
  }
}
```

### **NFT Certificate Minting**

```typescript
// ==========================================
// Mint Completion Certificate as NFT
// ==========================================
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';

async function mintCertificate(
  learnerWallet: string,
  contentId: string,
  contentTitle: string
) {
  const connection = new Connection(SOLANA_RPC_URL);
  const metaplex = Metaplex.make(connection).use(keypairIdentity(AUTHORITY_KEYPAIR));

  // Upload certificate metadata to IPFS
  const metadata = {
    name: `Certificate: ${contentTitle}`,
    description: `Completion certificate for ${contentTitle} on OuroC-Mesos`,
    image: `ipfs://${await generateCertificateImage(contentTitle, learnerWallet)}`,
    attributes: [
      { trait_type: 'Course', value: contentTitle },
      { trait_type: 'Learner', value: learnerWallet },
      { trait_type: 'Completion Date', value: new Date().toISOString() },
      { trait_type: 'Content ID', value: contentId },
    ],
  };

  const { uri } = await metaplex.nfts().uploadMetadata(metadata);

  // Mint NFT
  const { nft } = await metaplex.nfts().create({
    uri,
    name: metadata.name,
    sellerFeeBasisPoints: 0,
    tokenOwner: new PublicKey(learnerWallet),
  });

  return {
    mint: nft.address.toString(),
    metadataUri: uri,
  };
}
```

---

## Security Considerations

### **1. Authentication**

```typescript
// ==========================================
// Wallet Signature Verification
// ==========================================
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

function verifyWalletSignature(
  message: string,
  signature: string,
  walletAddress: string
): boolean {
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = bs58.decode(signature);
  const publicKeyBytes = new PublicKey(walletAddress).toBytes();

  return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
}

// Middleware for protected routes
async function requireAuth(req, res, next) {
  const walletAddress = req.headers['x-wallet-address'];
  const signature = req.headers['authorization']?.replace('Bearer ', '');
  const timestamp = req.headers['x-timestamp'];

  // Check timestamp (prevent replay attacks)
  if (Date.now() - parseInt(timestamp) > 5 * 60 * 1000) {
    return res.status(401).json({ error: 'Signature expired' });
  }

  // Verify signature
  const message = `OuroC-Mesos Auth: ${timestamp}`;
  if (!verifyWalletSignature(message, signature, walletAddress)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  req.walletAddress = walletAddress;
  next();
}
```

### **2. Rate Limiting**

```typescript
import rateLimit from 'express-rate-limit';

// API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});

// Stricter limit for content creation
const createContentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 content creations per hour
});

app.use('/api/', apiLimiter);
app.post('/api/community-hub/content', createContentLimiter, requireAuth, createContent);
```

### **3. Input Validation**

```typescript
import { z } from 'zod';

const CreateContentSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  category: z.enum(['Programming', 'Design', 'Music', 'Fitness', 'Language', 'Business', 'Art']),
  price: z.number().min(0.01).max(1000),
  interval: z.enum(['weekly', 'monthly', 'quarterly']),
});

// Validate before processing
app.post('/api/community-hub/content', requireAuth, async (req, res) => {
  try {
    const validated = CreateContentSchema.parse(req.body);
    // ... proceed with creation
  } catch (error) {
    return res.status(400).json({ error: 'Invalid input', details: error });
  }
});
```

### **4. Content Moderation**

```typescript
// ==========================================
// Automated Content Moderation (Optional)
// ==========================================
import OpenAI from 'openai';

async function moderateContent(title: string, description: string) {
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const moderation = await openai.moderations.create({
    input: `${title}\n\n${description}`,
  });

  const flagged = moderation.results[0].flagged;

  if (flagged) {
    return {
      allowed: false,
      reason: 'Content violates community guidelines',
      categories: moderation.results[0].categories,
    };
  }

  return { allowed: true };
}
```

---

## Implementation Phases

### **Phase 1: MVP (Week 1-2)**

**Goal**: Get basic Community Hub working

**Tasks**:
1. ✅ Set up PostgreSQL database (Supabase)
2. ✅ Implement content CRUD API
3. ✅ Integrate IPFS for thumbnails (Pinata)
4. ✅ Connect to ICP timer for subscriptions
5. ✅ Build creator dashboard API
6. ✅ Implement basic search and filtering

**No gamification yet** - Focus on core functionality

### **Phase 2: Subscriptions & Payments (Week 3)**

**Goal**: Enable real subscriptions

**Tasks**:
1. ✅ Implement subscription creation flow
2. ✅ Integrate with OuroC-Prima contract
3. ✅ Build payment webhook handler
4. ✅ Track earnings in database
5. ✅ Test end-to-end subscription flow

### **Phase 3: Gamification (Week 4)**

**Goal**: Add badges, levels, certificates

**Tasks**:
1. ✅ Implement XP system
2. ✅ Build badge awarding logic
3. ✅ Create NFT certificate minting
4. ✅ Add achievements API
5. ✅ Update frontend to display gamification

### **Phase 4: Analytics & Optimization (Week 5+)**

**Goal**: Improve UX and performance

**Tasks**:
1. ✅ Add detailed analytics for creators
2. ✅ Implement search indexing (Algolia/Meilisearch)
3. ✅ Add caching layer (Redis)
4. ✅ Build recommendation engine
5. ✅ Add email/push notifications

---

## Technology Recommendations

### **Backend Framework**

**Option A: Node.js + Express (Recommended)**
```bash
# Quick to build, lots of Solana/Web3 libraries
npm install express cors helmet express-rate-limit
npm install @solana/web3.js @coral-xyz/anchor
npm install pg pg-hstore sequelize
npm install @pinata/sdk
```

**Option B: Rust + Actix-Web**
```bash
# Better performance, but slower development
cargo add actix-web sqlx tokio
cargo add solana-client anchor-client
```

### **Database**

**Supabase** (PostgreSQL as a Service)
- Free tier: 500MB database
- Auto-generated REST API
- Real-time subscriptions
- Built-in authentication (optional)

### **File Storage**

**Pinata** (IPFS hosting)
- Free tier: 1GB
- Easy SDK
- Fast CDN

---

## Estimated Costs (MVP)

| Service | Free Tier | Paid (if needed) |
|---------|-----------|------------------|
| Supabase (PostgreSQL) | 500MB | $25/mo (Pro) |
| Pinata (IPFS) | 1GB | $20/mo (1TB) |
| Solana RPC (Helius) | Free (devnet) | $0 (devnet) |
| ICP Cycles | ~$5/mo | $5-20/mo |
| Hosting (Vercel/Railway) | Free | $5-20/mo |
| **Total** | **~$5/mo** | **~$50/mo** |

---

## Next Steps

1. **Choose architecture**: I recommend **Hybrid (PostgreSQL + IPFS + ICP)**
2. **Set up Supabase**: Create project and tables
3. **Build API**: Start with content CRUD endpoints
4. **Test with mock data**: Before connecting to ICP
5. **Integrate ICP timer**: Connect subscription flow
6. **Deploy MVP**: Get feedback from early users

---

## Questions to Decide

1. **Backend language**: Node.js (fast) or Rust (performant)?
2. **Database**: Supabase (managed) or self-hosted PostgreSQL?
3. **IPFS**: Pinata (easy) or self-hosted (control)?
4. **Deployment**: Vercel (serverless) or Railway (traditional)?
5. **Gamification timing**: MVP or Phase 2?

---

**Status**: Ready for implementation!
**Estimated time to working MVP**: 2-3 weeks
**Next action**: Set up Supabase project + implement first API endpoint

Would you like me to start implementing any specific part?
