# Community Hub - Gamification & Creator System Design

**Feature**: Badges, Levels, Certificates & Creator Dashboard
**Date**: November 4, 2025

---

## 🎯 System Overview

A comprehensive **reputation and rewards system** that incentivizes both creators and learners through:

1. **Creator Badges** - Recognition for teaching quality
2. **Learner Levels** - Progress tracking for subscribers
3. **Certificates** - Proof of completion and achievement
4. **Creator Dashboard** - Earnings and content management

---

## 🏆 Badge System

### Creator Badges (Earned by Teaching)

| Badge | Name | Requirements | Benefits |
|-------|------|--------------|----------|
| 🌱 | **Seedling** | Create first content | Profile badge |
| 🎓 | **Educator** | 10+ subscribers | Featured in "Popular Creators" |
| ⭐ | **Rising Star** | 50+ subscribers, 4.5+ rating | Search boost |
| 🔥 | **Top Creator** | 100+ subscribers, 4.8+ rating | Homepage featured spot |
| 💎 | **Master Teacher** | 500+ subscribers, 4.9+ rating | Premium badge, lower fees |
| 👑 | **Legend** | 1000+ subscribers, 5.0 rating | VIP support, 1% platform fee |

### Specialty Badges

| Badge | Name | Earned By | Display |
|-------|------|-----------|---------|
| 🚀 | **Quick Start** | First payment received within 48h | Creator profile |
| 💯 | **Perfectionist** | 100% positive reviews (min 20) | Content cards |
| 🎯 | **Consistent** | Content posted weekly for 3 months | Profile banner |
| 🤝 | **Helpful** | 50+ questions answered in community | Profile sidebar |
| 📚 | **Prolific** | 10+ courses published | Creator name badge |

### Learner Badges (Earned by Learning)

| Badge | Name | Requirements | Benefits |
|-------|------|--------------|----------|
| 🔰 | **Newbie** | Subscribe to first course | Welcome bonus (5% off next) |
| 📖 | **Student** | Complete 3 courses | Profile badge |
| 🎓 | **Scholar** | Complete 10 courses | 10% discount on new subs |
| 🏆 | **Expert** | Complete 25 courses, earn 5 certs | Featured in community |
| 🌟 | **Lifelong Learner** | 1 year continuous learning | Annual recognition NFT |

---

## 📊 Level System

### Creator Levels

**Formula**: `Level = floor(sqrt(total_subscribers + total_revenue_usd / 10))`

```
Level 1: 0-9 subscribers or $0-$90 revenue
Level 2: 10-24 subscribers or $100-$240 revenue
Level 3: 25-49 subscribers or $250-$490 revenue
Level 4: 50-99 subscribers or $500-$990 revenue
Level 5: 100-249 subscribers or $1000-$2490 revenue
...
Level 10: 1000+ subscribers or $10,000+ revenue (Max)
```

**Level Benefits**:
- **Level 1-2**: Basic creator features
- **Level 3**: Can offer discounts
- **Level 4**: Custom branding on profile
- **Level 5**: Analytics dashboard access
- **Level 6**: Can create course bundles
- **Level 7**: Priority support
- **Level 8**: Lower platform fees (2%)
- **Level 9**: Featured homepage placement
- **Level 10**: VIP perks, 1% platform fee

### Learner Levels

**Formula**: `Level = floor(courses_completed / 3 + subscriptions_active)`

```
Level 1: Newbie (0-2 courses)
Level 2: Beginner (3-5 courses)
Level 3: Intermediate (6-10 courses)
Level 4: Advanced (11-20 courses)
Level 5: Expert (21-50 courses)
Level 6: Master (51+ courses)
```

**Level Benefits**:
- **Level 2**: Can leave reviews
- **Level 3**: 5% discount on new subscriptions
- **Level 4**: Early access to new courses
- **Level 5**: Can request custom content
- **Level 6**: Lifetime 10% discount + NFT certificate

---

## 🎓 Certificate System

### Types of Certificates

#### 1. Course Completion Certificate
**Issued when**: Learner completes all lessons in a course

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│        🎓 CERTIFICATE OF COMPLETION                 │
│                                                     │
│              This certifies that                    │
│                                                     │
│              [Student Name]                         │
│                                                     │
│       has successfully completed the course         │
│                                                     │
│         [Course Name]                               │
│                                                     │
│       Taught by: [Creator Name]                     │
│       Date: [Completion Date]                       │
│       Certificate ID: [On-chain Hash]               │
│                                                     │
│    Verified on Solana Blockchain                    │
│    [QR Code for verification]                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Features**:
- ✅ Stored as NFT on Solana
- ✅ Shareable link
- ✅ QR code for verification
- ✅ Downloadable PDF
- ✅ LinkedIn integration

#### 2. Skill Achievement Certificate
**Issued when**: Learner completes related courses in a skill track

**Example**: "Full Stack Developer" (complete React + Node + Database courses)

#### 3. Annual Learning Certificate
**Issued when**: Learner maintains active subscriptions for 12 months

#### 4. Creator Excellence Certificate
**Issued when**: Creator reaches Top Creator or higher badge

---

## 🎨 UI Components

### Badge Display Component

```typescript
// BadgeDisplay.tsx
interface Badge {
  id: string;
  icon: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt?: Date;
  progress?: number; // For in-progress badges
}

const BadgeCard = ({ badge }: { badge: Badge }) => (
  <div className={`badge-card ${badge.rarity} ${badge.earnedAt ? 'earned' : 'locked'}`}>
    <div className="badge-icon">{badge.icon}</div>
    <div className="badge-name">{badge.name}</div>
    <div className="badge-description">{badge.description}</div>
    {badge.progress !== undefined && (
      <div className="progress-bar">
        <div style={{ width: `${badge.progress}%` }} />
      </div>
    )}
  </div>
);
```

### Level Progress Bar

```typescript
// LevelProgress.tsx
interface LevelProgressProps {
  currentLevel: number;
  currentXP: number;
  nextLevelXP: number;
  userType: 'creator' | 'learner';
}

const LevelProgress = ({ currentLevel, currentXP, nextLevelXP, userType }: LevelProgressProps) => (
  <div className="level-progress">
    <div className="level-info">
      <span className="level-badge">Level {currentLevel}</span>
      <span className="xp-text">{currentXP} / {nextLevelXP} XP</span>
    </div>
    <div className="progress-bar">
      <div
        className="progress-fill"
        style={{ width: `${(currentXP / nextLevelXP) * 100}%` }}
      />
    </div>
    <p className="next-level-text">
      {nextLevelXP - currentXP} XP to Level {currentLevel + 1}
    </p>
  </div>
);
```

---

## 📱 Profile Page Enhancement

### New Profile Structure

```
Profile Page
├── Header
│   ├── Avatar
│   ├── Name
│   ├── Creator/Learner Toggle
│   ├── Level Badge
│   └── Badge Collection (Top 3)
│
├── Tabs
│   ├── Overview
│   ├── Content (Creators only)
│   ├── Dashboard (Creators only)
│   ├── My Learning (Learners only)
│   ├── Certificates
│   └── Achievements
│
└── Content Area (Tab-based)
    ├── Overview Tab
    │   ├── About Me
    │   ├── Stats Summary
    │   ├── Recent Activity
    │   └── Badge Showcase
    │
    ├── Content Tab (Creators)
    │   ├── Published Courses
    │   ├── Draft Courses
    │   └── [Create New Content] Button ✨
    │
    ├── Dashboard Tab (Creators)
    │   ├── Revenue Chart
    │   ├── Subscriber Growth
    │   ├── Course Performance
    │   └── Payout Settings
    │
    ├── My Learning Tab (Learners)
    │   ├── Active Subscriptions
    │   ├── Completed Courses
    │   └── Wishlist
    │
    ├── Certificates Tab
    │   ├── Earned Certificates
    │   └── [Download/Share] Options
    │
    └── Achievements Tab
        ├── All Badges (Earned + Locked)
        ├── Level Progress
        └── Milestones
```

---

## 🎨 Creator Dashboard Design

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  CREATOR DASHBOARD                          [Create Content] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 💰 Earnings  │  │ 👥 Subscribers│  │ 📚 Courses   │      │
│  │              │  │               │  │              │      │
│  │  $1,250      │  │     45        │  │      3       │      │
│  │  +12% ↑      │  │     +5 ↑      │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Revenue Chart (Last 30 days)                          │ │
│  │                                                         │ │
│  │   $     ╱╲                                              │ │
│  │        ╱  ╲        ╱╲                                   │ │
│  │       ╱    ╲      ╱  ╲     ╱╲                          │ │
│  │      ╱      ╲    ╱    ╲   ╱  ╲                         │ │
│  │  ───┴────────┴──┴──────┴─┴────┴───> Days               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Your Courses                      [Sort by ▼]         │ │
│  │  ┌────────────────────────────────────────────────┐    │ │
│  │  │ Advanced React Patterns                        │    │ │
│  │  │ 23 subscribers | $460/month | ⭐ 4.8           │    │ │
│  │  │ [Edit] [Analytics] [Pause]                     │    │ │
│  │  └────────────────────────────────────────────────┘    │ │
│  │  ┌────────────────────────────────────────────────┐    │ │
│  │  │ Figma Design Mastery                           │    │ │
│  │  │ 15 subscribers | $225/month | ⭐ 4.9           │    │ │
│  │  │ [Edit] [Analytics] [Pause]                     │    │ │
│  │  └────────────────────────────────────────────────┘    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Recent Activity                                        │ │
│  │  • New subscriber: John D. (Advanced React Patterns)   │ │
│  │  • Payment received: $20 from Sarah C.                 │ │
│  │  • Review: ⭐⭐⭐⭐⭐ "Excellent course!" - Mike K.        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Plan

### Phase 1: Profile Enhancement (3-4 days)

**1. Update Profile Page Structure**
```typescript
// frontend/src/pages/Profile.tsx

const Profile = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [userMode, setUserMode] = useState<'creator' | 'learner'>('learner');

  return (
    <div className="profile-page">
      {/* Header with Level & Badges */}
      <ProfileHeader
        level={currentLevel}
        badges={topBadges}
        mode={userMode}
        onModeChange={setUserMode}
      />

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {userMode === 'creator' && (
            <>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            </>
          )}
          {userMode === 'learner' && (
            <TabsTrigger value="learning">My Learning</TabsTrigger>
          )}
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        {userMode === 'creator' && (
          <>
            <TabsContent value="content">
              <ContentManagementTab />
            </TabsContent>
            <TabsContent value="dashboard">
              <CreatorDashboard />
            </TabsContent>
          </>
        )}

        {/* ... other tabs */}
      </Tabs>
    </div>
  );
};
```

**2. Create "Create Content" Button in Profile**
```typescript
// ContentManagementTab.tsx
const ContentManagementTab = () => {
  const navigate = useNavigate();

  return (
    <div className="content-management">
      <div className="header">
        <h2>Your Content</h2>
        <Button
          size="lg"
          onClick={() => navigate('/profile/create-content')}
        >
          ✨ Create New Content
        </Button>
      </div>

      {/* List of existing content */}
      <ContentList />
    </div>
  );
};
```

### Phase 2: Badge System (2-3 days)

**1. Database Schema**
```sql
CREATE TABLE badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'creator' | 'learner'
  rarity TEXT NOT NULL, -- 'common' | 'rare' | 'epic' | 'legendary'
  requirements JSONB NOT NULL
);

CREATE TABLE user_badges (
  id SERIAL PRIMARY KEY,
  user_wallet TEXT NOT NULL,
  badge_id TEXT REFERENCES badges(id),
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_wallet, badge_id)
);

CREATE TABLE user_levels (
  user_wallet TEXT PRIMARY KEY,
  user_type TEXT NOT NULL, -- 'creator' | 'learner'
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  total_subscribers INTEGER DEFAULT 0,
  total_revenue_cents INTEGER DEFAULT 0,
  courses_completed INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**2. Badge Calculation Logic**
```typescript
// lib/gamification.ts

export async function checkAndAwardBadges(
  userWallet: string,
  userType: 'creator' | 'learner'
) {
  const stats = await getUserStats(userWallet, userType);
  const availableBadges = await getBadgesByType(userType);

  for (const badge of availableBadges) {
    const earned = await hasUserEarnedBadge(userWallet, badge.id);
    if (!earned && checkBadgeRequirements(stats, badge.requirements)) {
      await awardBadge(userWallet, badge.id);
      // Send notification
      await sendBadgeNotification(userWallet, badge);
    }
  }
}

function checkBadgeRequirements(
  stats: UserStats,
  requirements: BadgeRequirements
): boolean {
  if (requirements.minSubscribers && stats.subscribers < requirements.minSubscribers) {
    return false;
  }
  if (requirements.minRating && stats.rating < requirements.minRating) {
    return false;
  }
  // ... other checks
  return true;
}
```

### Phase 3: Level System (1-2 days)

**1. Level Calculation**
```typescript
// lib/levels.ts

export function calculateCreatorLevel(
  subscribers: number,
  revenueUSD: number
): { level: number; xp: number; nextLevelXP: number } {
  const xp = subscribers + Math.floor(revenueUSD / 10);
  const level = Math.min(10, Math.floor(Math.sqrt(xp)));
  const nextLevelXP = Math.pow(level + 1, 2);

  return { level, xp, nextLevelXP };
}

export function calculateLearnerLevel(
  coursesCompleted: number,
  activeSubscriptions: number
): { level: number; xp: number; nextLevelXP: number } {
  const xp = Math.floor(coursesCompleted / 3) + activeSubscriptions;
  const level = Math.min(6, xp);
  const nextLevelXP = level + 1;

  return { level, xp, nextLevelXP };
}
```

**2. Level Benefits Checker**
```typescript
export function getLevelBenefits(level: number, type: 'creator' | 'learner') {
  if (type === 'creator') {
    return {
      platformFeeDiscount: level >= 8 ? 0.01 : level >= 7 ? 0.005 : 0,
      canOfferDiscounts: level >= 3,
      hasCustomBranding: level >= 4,
      hasAnalytics: level >= 5,
      hasPrioritySupport: level >= 7,
      featuredPlacement: level >= 9,
    };
  } else {
    return {
      discountPercentage: level >= 6 ? 0.10 : level >= 3 ? 0.05 : 0,
      canLeaveReviews: level >= 2,
      hasEarlyAccess: level >= 4,
      canRequestCustom: level >= 5,
    };
  }
}
```

### Phase 4: Certificate System (2-3 days)

**1. NFT Certificate Minting**
```typescript
// lib/certificates.ts

export async function mintCompletionCertificate(
  courseId: string,
  studentWallet: string,
  creatorWallet: string,
  courseName: string
): Promise<string> {
  // 1. Generate certificate metadata
  const metadata = {
    name: `Certificate: ${courseName}`,
    description: `Completion certificate for ${courseName}`,
    image: await generateCertificateImage({
      courseName,
      studentWallet,
      creatorWallet,
      date: new Date(),
    }),
    attributes: [
      { trait_type: 'Course', value: courseName },
      { trait_type: 'Completion Date', value: new Date().toISOString() },
      { trait_type: 'Creator', value: creatorWallet },
    ],
  };

  // 2. Upload to IPFS
  const metadataUri = await uploadToIPFS(metadata);

  // 3. Mint NFT on Solana
  const mintAddress = await mintNFT({
    recipient: studentWallet,
    metadataUri,
    collection: CERTIFICATE_COLLECTION_ADDRESS,
  });

  // 4. Store in database
  await storeCertificate({
    studentWallet,
    courseId,
    mintAddress,
    issuedAt: new Date(),
  });

  return mintAddress;
}
```

**2. Certificate Verification Page**
```typescript
// pages/VerifyCertificate.tsx

const VerifyCertificate = () => {
  const [certificateId, setCertificateId] = useState('');
  const [certificate, setCertificate] = useState(null);

  const verifyCertificate = async () => {
    // Check on-chain
    const onChainData = await fetchNFTMetadata(certificateId);

    // Verify authenticity
    const isValid = await verifyCertificateSignature(onChainData);

    setCertificate({ ...onChainData, isValid });
  };

  return (
    <div className="verify-page">
      <h1>Verify Certificate</h1>
      <Input
        placeholder="Enter certificate ID or scan QR code"
        value={certificateId}
        onChange={(e) => setCertificateId(e.target.value)}
      />
      <Button onClick={verifyCertificate}>Verify</Button>

      {certificate && (
        <CertificateDisplay
          certificate={certificate}
          showValidity={true}
        />
      )}
    </div>
  );
};
```

### Phase 5: Creator Dashboard (3-4 days)

**Already covered in implementation above**

---

## 🎨 Visual Design Examples

### Badge Rarity Styles

```css
/* Common Badge */
.badge-card.common {
  border: 2px solid #9ca3af;
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
}

/* Rare Badge */
.badge-card.rare {
  border: 2px solid #3b82f6;
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
}

/* Epic Badge */
.badge-card.epic {
  border: 2px solid #a855f7;
  background: linear-gradient(135deg, #f3e8ff, #e9d5ff);
  box-shadow: 0 0 15px rgba(168, 85, 247, 0.4);
  animation: glow-epic 2s ease-in-out infinite;
}

/* Legendary Badge */
.badge-card.legendary {
  border: 2px solid #f59e0b;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.5);
  animation: glow-legendary 1.5s ease-in-out infinite;
}

@keyframes glow-epic {
  0%, 100% { box-shadow: 0 0 15px rgba(168, 85, 247, 0.4); }
  50% { box-shadow: 0 0 25px rgba(168, 85, 247, 0.6); }
}

@keyframes glow-legendary {
  0%, 100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.5); }
  50% { box-shadow: 0 0 30px rgba(245, 158, 11, 0.8); }
}
```

---

## 📊 Data Model Summary

```typescript
// Types for gamification system

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: 'creator' | 'learner';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirements: BadgeRequirements;
}

interface BadgeRequirements {
  minSubscribers?: number;
  minRating?: number;
  minRevenue?: number;
  minCourses?: number;
  minReviews?: number;
  customCheck?: (stats: UserStats) => boolean;
}

interface UserLevel {
  userWallet: string;
  userType: 'creator' | 'learner';
  level: number;
  xp: number;
  nextLevelXP: number;
  totalSubscribers?: number; // Creator only
  totalRevenue?: number; // Creator only
  coursesCompleted?: number; // Learner only
}

interface Certificate {
  id: string;
  type: 'course_completion' | 'skill_achievement' | 'annual' | 'excellence';
  studentWallet: string;
  courseId?: string;
  courseName: string;
  creatorWallet: string;
  issuedAt: Date;
  nftMintAddress: string;
  metadataUri: string;
  verified: boolean;
}
```

---

## 🎯 Key Features Summary

### For Creators:
- ✅ **Badge System**: Recognition and trust-building
- ✅ **Level Progression**: Clear path to success
- ✅ **Dashboard**: Track earnings and growth
- ✅ **Excellence Certificates**: Proof of quality teaching
- ✅ **Fee Discounts**: Reward for high performance

### For Learners:
- ✅ **Achievement Tracking**: Gamified learning journey
- ✅ **Completion Certificates**: NFT-based proof of skills
- ✅ **Discounts**: Save money as you level up
- ✅ **Early Access**: Perks for active learners
- ✅ **Profile Showcase**: Display achievements

### For Platform:
- ✅ **Engagement**: Gamification increases retention
- ✅ **Trust**: Badges verify quality creators
- ✅ **Transparency**: On-chain certificates prevent fraud
- ✅ **Community**: Levels create social competition
- ✅ **Revenue**: More engagement = more subscriptions

---

## 🚀 Implementation Timeline

**Total: 2-3 weeks**

- Week 1: Profile enhancement + Badge system
- Week 2: Level system + Certificate NFTs
- Week 3: Creator dashboard + Polish

**Priority Order**:
1. Profile page restructure (Foundation)
2. Creator content tab + "Create" button (Core feature)
3. Badge system (Engagement)
4. Level system (Progression)
5. Certificates (Trust/Proof)
6. Dashboard (Creator retention)

---

**Next Step**: Should I start implementing the Profile page enhancement with the creator content tab? 🚀
