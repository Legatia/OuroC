# P2P Content Marketplace - Feature Design

**Feature Name**: **Community Hub** ✅

**Why "Community Hub" is Perfect**:
- 🤝 Emphasizes peer-to-peer connection and collaboration
- 🌟 Welcoming and inclusive (not just for "creators")
- 💡 Suggests a central gathering place for learning and teaching
- ❤️ Builds sense of belonging and shared knowledge
- 🎯 Works for both sides: learners and teachers are part of the community

---

## 🎯 Core Concept

A **peer-to-peer content marketplace** where creators monetize recurring educational/skill-based content, and learners subscribe for ongoing access.

**Use Cases**:
- 📚 **Peer Learning**: Study groups, tutoring, course materials
- 🎨 **Skill Sharing**: Art tutorials, coding lessons, music instruction
- 💼 **Professional Mentorship**: Career coaching, business advice
- 🎮 **Gaming Coaching**: Game strategy, esports training
- 🏋️ **Fitness Training**: Workout plans, nutrition guides
- 🎵 **Music Lessons**: Instrument tutorials, music theory
- 📸 **Photography Courses**: Editing tutorials, shooting techniques

---

## 📐 Page Structure

### Layout: Two-Sided Marketplace

```
┌─────────────────────────────────────────────────────────────┐
│                      NAVBAR                                  │
│  Home | Subscriptions | Community Hub | Invoices | Settings │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     HERO SECTION                             │
│                                                              │
│   🎓 Learn from Peers, Earn from Teaching                   │
│                                                              │
│   [Browse Content]  [Become a Creator]                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────────────────────┐
│  SIDEBAR (Filters)   │         CONTENT GRID                  │
│                      │                                       │
│  Categories:         │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  ☐ Programming       │  │ JS  │ │React│ │Art  │ │Yoga │   │
│  ☐ Design            │  │ $10 │ │ $20 │ │ $15 │ │ $8  │   │
│  ☐ Music             │  └─────┘ └─────┘ └─────┘ └─────┘   │
│  ☐ Fitness           │                                       │
│  ☐ Language          │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│                      │  │Music│ │Biz  │ │Cook │ │Code │   │
│  Price Range:        │  │ $12 │ │ $50 │ │ $25 │ │ $30 │   │
│  $0 ────●──── $100   │  └─────┘ └─────┘ └─────┘ └─────┘   │
│                      │                                       │
│  Duration:           │         [Load More]                   │
│  ○ Weekly            │                                       │
│  ● Monthly           │                                       │
│  ○ Quarterly         │                                       │
└──────────────────────┴──────────────────────────────────────┘
```

---

## 🎨 Component Design

### 1. Content Card

```svelte
<!-- frontend/src/routes/creator-hub/ContentCard.svelte -->

<script lang="ts">
  export let content: P2PContent;

  interface P2PContent {
    id: string;
    title: string;
    creator: string;
    creatorWallet: string;
    category: string;
    price: number; // Monthly price in USDC
    subscribers: number;
    rating: number;
    thumbnail: string;
    description: string;
    interval: 'weekly' | 'monthly' | 'quarterly';
  }
</script>

<div class="content-card">
  <img src={content.thumbnail} alt={content.title} />

  <div class="content-info">
    <h3>{content.title}</h3>
    <p class="creator">by {content.creator}</p>
    <p class="description">{content.description}</p>

    <div class="stats">
      <span>⭐ {content.rating}/5</span>
      <span>👥 {content.subscribers} subscribers</span>
    </div>

    <div class="pricing">
      <span class="price">${content.price}/month</span>
      <button on:click={subscribe}>Subscribe</button>
    </div>
  </div>
</div>

<style>
  .content-card {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .content-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  }

  img {
    width: 100%;
    height: 180px;
    object-fit: cover;
  }

  .content-info {
    padding: 16px;
  }

  .creator {
    color: #6b7280;
    font-size: 14px;
  }

  .stats {
    display: flex;
    gap: 16px;
    font-size: 14px;
    color: #6b7280;
    margin: 12px 0;
  }

  .pricing {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
  }

  .price {
    font-size: 20px;
    font-weight: bold;
    color: #3b82f6;
  }

  button {
    background: #3b82f6;
    color: white;
    padding: 8px 20px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
  }

  button:hover {
    background: #2563eb;
  }
</style>
```

---

### 2. Creator Dashboard Component

```svelte
<!-- frontend/src/routes/creator-hub/CreatorDashboard.svelte -->

<script lang="ts">
  let earnings = {
    monthly: 1250,
    total: 8430,
    subscribers: 45,
  };

  let content = [
    {
      id: '1',
      title: 'Advanced React Patterns',
      subscribers: 23,
      revenue: 460,
      status: 'active',
    },
    // ... more content
  ];
</script>

<div class="creator-dashboard">
  <h1>Creator Dashboard</h1>

  <div class="stats-grid">
    <div class="stat-card">
      <h3>Monthly Earnings</h3>
      <p class="amount">${earnings.monthly}</p>
      <span class="change">+12% from last month</span>
    </div>

    <div class="stat-card">
      <h3>Total Subscribers</h3>
      <p class="amount">{earnings.subscribers}</p>
      <span class="change">+5 this week</span>
    </div>

    <div class="stat-card">
      <h3>Lifetime Earnings</h3>
      <p class="amount">${earnings.total}</p>
      <span class="change">Since Jan 2025</span>
    </div>
  </div>

  <div class="content-management">
    <div class="header">
      <h2>Your Content</h2>
      <button on:click={createContent}>+ Create New</button>
    </div>

    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Subscribers</th>
          <th>Monthly Revenue</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each content as item}
          <tr>
            <td>{item.title}</td>
            <td>{item.subscribers}</td>
            <td>${item.revenue}</td>
            <td>
              <span class="status-badge {item.status}">
                {item.status}
              </span>
            </td>
            <td>
              <button on:click={() => editContent(item.id)}>Edit</button>
              <button on:click={() => viewAnalytics(item.id)}>Analytics</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 24px;
    margin: 32px 0;
  }

  .stat-card {
    background: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .amount {
    font-size: 32px;
    font-weight: bold;
    color: #3b82f6;
    margin: 12px 0;
  }

  .change {
    color: #10b981;
    font-size: 14px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 12px;
    overflow: hidden;
  }

  th {
    background: #f3f4f6;
    padding: 16px;
    text-align: left;
    font-weight: 600;
  }

  td {
    padding: 16px;
    border-top: 1px solid #e5e7eb;
  }

  .status-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .status-badge.active {
    background: #d1fae5;
    color: #065f46;
  }
</style>
```

---

### 3. Create Content Form

```svelte
<!-- frontend/src/routes/creator-hub/CreateContent.svelte -->

<script lang="ts">
  import { createSubscription } from '$lib/backend';

  let formData = {
    title: '',
    description: '',
    category: 'programming',
    price: 10,
    interval: 'monthly',
    thumbnail: null as File | null,
  };

  const categories = [
    'Programming',
    'Design',
    'Music',
    'Fitness',
    'Language',
    'Business',
    'Art',
    'Photography',
    'Writing',
    'Other',
  ];

  async function handleSubmit() {
    // 1. Upload thumbnail to IPFS/Arweave
    const thumbnailUrl = await uploadThumbnail(formData.thumbnail);

    // 2. Create subscription on Solana + ICP
    const contentId = `content_${Date.now()}`;

    const result = await createSubscription({
      subscription_id: contentId,
      solana_contract_address: OUROC_PRIMA_CONTRACT,
      payment_token_mint: USDC_MINT_DEVNET,
      amount: formData.price * 1_000_000, // Convert to micro-USDC
      subscriber_address: '', // Will be filled by subscribers
      merchant_address: $walletAddress, // Creator's wallet
      interval_seconds: formData.interval === 'monthly' ? 2592000 : 604800,
      start_time: null,
      api_key: API_KEY,
    });

    // 3. Store metadata on-chain or IPFS
    const metadata = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      thumbnail: thumbnailUrl,
      creator: $walletAddress,
      price: formData.price,
      interval: formData.interval,
    };

    // 4. Redirect to content page
    goto(`/creator-hub/content/${contentId}`);
  }
</script>

<div class="create-content">
  <h1>Create New Content</h1>

  <form on:submit|preventDefault={handleSubmit}>
    <div class="form-group">
      <label for="title">Title</label>
      <input
        id="title"
        type="text"
        bind:value={formData.title}
        placeholder="e.g., Advanced React Patterns"
        required
      />
    </div>

    <div class="form-group">
      <label for="description">Description</label>
      <textarea
        id="description"
        bind:value={formData.description}
        placeholder="Describe what learners will get..."
        rows="6"
        required
      />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="category">Category</label>
        <select id="category" bind:value={formData.category}>
          {#each categories as category}
            <option value={category.toLowerCase()}>
              {category}
            </option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label for="price">Price (USDC/month)</label>
        <input
          id="price"
          type="number"
          bind:value={formData.price}
          min="1"
          step="0.01"
          required
        />
      </div>
    </div>

    <div class="form-group">
      <label for="interval">Billing Interval</label>
      <select id="interval" bind:value={formData.interval}>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="quarterly">Quarterly</option>
      </select>
    </div>

    <div class="form-group">
      <label for="thumbnail">Thumbnail Image</label>
      <input
        id="thumbnail"
        type="file"
        accept="image/*"
        on:change={(e) => formData.thumbnail = e.target.files[0]}
        required
      />
    </div>

    <button type="submit" class="submit-btn">
      Create Content
    </button>
  </form>
</div>

<style>
  .create-content {
    max-width: 800px;
    margin: 0 auto;
    padding: 32px;
  }

  .form-group {
    margin-bottom: 24px;
  }

  label {
    display: block;
    font-weight: 600;
    margin-bottom: 8px;
  }

  input, textarea, select {
    width: 100%;
    padding: 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 16px;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .submit-btn {
    width: 100%;
    background: #3b82f6;
    color: white;
    padding: 16px;
    border-radius: 8px;
    border: none;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .submit-btn:hover {
    background: #2563eb;
  }
</style>
```

---

## 🗄️ Data Model

### P2P Content Type

```typescript
// frontend/src/types/p2p.ts

export interface P2PContent {
  id: string; // e.g., "content_1730587123"
  title: string;
  description: string;
  category: ContentCategory;
  creator: {
    wallet: string;
    name: string;
    avatar?: string;
    rating: number;
    totalSubscribers: number;
  };
  pricing: {
    amount: number; // USDC
    interval: 'weekly' | 'monthly' | 'quarterly';
    currency: 'USDC';
  };
  media: {
    thumbnail: string; // IPFS URL
    preview?: string; // IPFS URL
  };
  stats: {
    subscribers: number;
    rating: number;
    reviewCount: number;
    createdAt: number;
  };
  status: 'active' | 'paused' | 'archived';
  subscriptionId: string; // Links to ICP timer subscription
}

export type ContentCategory =
  | 'programming'
  | 'design'
  | 'music'
  | 'fitness'
  | 'language'
  | 'business'
  | 'art'
  | 'photography'
  | 'writing'
  | 'other';

export interface CreatorProfile {
  wallet: string;
  name: string;
  bio: string;
  avatar?: string;
  coverImage?: string;
  socialLinks: {
    twitter?: string;
    github?: string;
    website?: string;
  };
  stats: {
    totalEarnings: number;
    totalSubscribers: number;
    contentCount: number;
    rating: number;
  };
  createdAt: number;
}
```

---

## 🔗 Backend Integration

### Store P2P Content Metadata

**Option 1: On-Chain Storage (Solana)**
```rust
// Store minimal metadata in Solana subscription account
pub struct SubscriptionMetadata {
    pub content_type: ContentType, // P2P, Invoice, etc.
    pub metadata_url: String, // IPFS hash with full metadata
}
```

**Option 2: IPFS Storage (Recommended)**
```typescript
// Upload to IPFS/Arweave
const metadata = {
  title: "Advanced React Patterns",
  description: "...",
  category: "programming",
  creator: "...",
  // ... rest of metadata
};

const ipfsHash = await uploadToIPFS(JSON.stringify(metadata));
// Result: "QmXyz123..."

// Store IPFS hash in subscription
const subscriptionId = `p2p_${ipfsHash}`;
```

**Option 3: Centralized Database (Fastest MVP)**
```typescript
// Store in Supabase/PostgreSQL
CREATE TABLE p2p_content (
  id TEXT PRIMARY KEY,
  subscription_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  creator_wallet TEXT NOT NULL,
  price DECIMAL NOT NULL,
  interval TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'active'
);

CREATE INDEX idx_category ON p2p_content(category);
CREATE INDEX idx_creator ON p2p_content(creator_wallet);
```

---

## 🎬 User Flows

### Flow 1: Browse and Subscribe

```
1. User visits /creator-hub
   ↓
2. Browse content grid or search
   ↓
3. Click content card → View details
   ↓
4. Click "Subscribe" button
   ↓
5. Connect wallet (if not connected)
   ↓
6. Approve USDC delegation on Solana
   ↓
7. Create subscription via ICP timer
   ↓
8. Confirmation: "Subscribed! ✅"
   ↓
9. Access content (link to creator's platform)
```

### Flow 2: Create Content

```
1. Creator visits /creator-hub
   ↓
2. Click "Become a Creator" or "Create New"
   ↓
3. Fill out creation form:
   - Title, description, category
   - Price and interval
   - Upload thumbnail
   ↓
4. Submit form
   ↓
5. System creates:
   - Solana subscription template
   - ICP timer configuration
   - IPFS metadata upload
   ↓
6. Content published to marketplace
   ↓
7. Creator dashboard shows new content
```

---

## 💡 Key Features

### For Learners/Subscribers:
- ✅ Browse by category
- ✅ Filter by price range
- ✅ Search by keyword
- ✅ Read reviews and ratings
- ✅ Subscribe with one click
- ✅ Manage active subscriptions
- ✅ Pause/resume subscriptions
- ✅ Auto-renewal with USDC

### For Creators:
- ✅ Create content listings
- ✅ Set custom pricing
- ✅ Track earnings dashboard
- ✅ View subscriber analytics
- ✅ Withdraw earnings
- ✅ Pause/archive content
- ✅ Respond to reviews
- ✅ Offer discounts/promotions

---

## 🚀 Implementation Roadmap

### Phase 1: MVP (2 weeks)
- ✅ Content card component
- ✅ Browse page with filters
- ✅ Create content form
- ✅ Subscribe functionality
- ✅ Basic creator dashboard
- ✅ Integration with existing ICP timer

### Phase 2: Enhanced (1 week)
- ✅ Search functionality
- ✅ Ratings and reviews
- ✅ Creator profiles
- ✅ Analytics dashboard
- ✅ Earnings withdrawal

### Phase 3: Advanced (2 weeks)
- ✅ Content preview system
- ✅ Messaging between creator/subscriber
- ✅ Promotional campaigns
- ✅ Referral program
- ✅ Advanced analytics

---

## 🎨 Design Mockup (ASCII)

```
┌─────────────────────────────────────────────────────────────┐
│  CREATOR HUB - Learn from Peers, Earn from Teaching        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Search: "react patterns"...]        [Filter ▼] [Sort ▼]  │
│                                                              │
├──────────────┬───────────────────────────────────────────────┤
│  FILTERS     │         CONTENT GRID                          │
│              │                                               │
│  Category    │  ┌──────────────┐  ┌──────────────┐         │
│  □ Code      │  │  [IMG]       │  │  [IMG]       │         │
│  □ Design    │  │              │  │              │         │
│  □ Music     │  │ React        │  │ Figma        │         │
│  □ Fitness   │  │ Patterns     │  │ Mastery      │         │
│              │  │              │  │              │         │
│  Price       │  │ by John      │  │ by Sarah     │         │
│  $0 ●─── $50│  │ ⭐4.8 (45)   │  │ ⭐4.9 (102)  │         │
│              │  │              │  │              │         │
│  Interval    │  │ $20/month    │  │ $15/month    │         │
│  ○ Weekly    │  │ [Subscribe]  │  │ [Subscribe]  │         │
│  ● Monthly   │  └──────────────┘  └──────────────┘         │
│  ○ Quarterly │                                               │
│              │  ┌──────────────┐  ┌──────────────┐         │
│              │  │  [IMG]       │  │  [IMG]       │         │
│              │  │  Yoga        │  │  Piano       │         │
│              │  │  Basics      │  │  Lessons     │         │
│              │  │              │  │              │         │
│              │  │ $12/month    │  │ $25/month    │         │
│              │  │ [Subscribe]  │  │ [Subscribe]  │         │
│              │  └──────────────┘  └──────────────┘         │
└──────────────┴───────────────────────────────────────────────┘
```

---

## 📱 Mobile Responsiveness

```svelte
<style>
  /* Mobile-first design */
  .content-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }

  /* Tablet */
  @media (min-width: 768px) {
    .content-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* Desktop */
  @media (min-width: 1024px) {
    .content-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  /* Large desktop */
  @media (min-width: 1280px) {
    .content-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }
</style>
```

---

## 🔒 Security Considerations

1. **Creator Verification**:
   - Verify wallet ownership
   - Optional KYC for high-earning creators
   - Content moderation system

2. **Payment Security**:
   - All payments via smart contract
   - Escrow for dispute resolution
   - Automatic refunds for cancelled subscriptions

3. **Content Protection**:
   - IPFS for decentralized storage
   - Hash verification for content integrity
   - Report abuse system

---

## 💰 Revenue Model

**Platform Fee Options**:

1. **Transaction Fee**: 2-5% per subscription payment
2. **Creator Fee**: $5-10/month for creator account
3. **Premium Features**: Advanced analytics, promotions ($20/month)
4. **Freemium**: Free basic, paid for advanced features

**Recommended**: 3% transaction fee (already implemented in escrow system)

---

## 🎯 Success Metrics

- **Creator Metrics**:
  - Number of active creators
  - Average earnings per creator
  - Content published per month
  - Creator retention rate

- **Subscriber Metrics**:
  - Monthly active subscribers
  - Average subscriptions per user
  - Churn rate
  - Lifetime value (LTV)

- **Platform Metrics**:
  - Total transaction volume
  - Platform revenue
  - Growth rate (MoM)
  - Content categories performance

---

## 📚 Next Steps

1. **Decide on navbar name** (Recommendation: "Creator Hub")
2. **Create route**: `frontend/src/routes/creator-hub/+page.svelte`
3. **Implement components**:
   - ContentCard.svelte
   - ContentGrid.svelte
   - CreatorDashboard.svelte
   - CreateContent.svelte
4. **Add to navbar**: Update `Navbar.svelte`
5. **Backend integration**: Use existing ICP timer + Solana contract
6. **Storage**: Choose between IPFS, Arweave, or centralized DB
7. **Test**: Create sample content and test subscription flow

---

**Estimated Development Time**: 2-3 weeks for MVP
**Tech Stack**: SvelteKit + existing ICP/Solana infrastructure
**Storage**: IPFS (recommended) or Supabase (faster MVP)
