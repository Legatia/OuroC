# Feature Implementation Plan - Community Hub Enhancements

**Date**: November 6, 2025
**Status**: Ready to implement
**Estimated Total Time**: 3-4 weeks

---

## Overview

We need to implement 6 major feature categories:
1. Profile Content Management (enhance existing)
2. Subscription Management Page (new)
3. Ratings & Reviews System (new)
4. Creator Analytics (new)
5. Advanced Filtering (enhance existing)
6. Social Features (new)

---

## Priority Matrix

### 🔴 Phase 1: Critical (Week 1)
**User Impact**: HIGH | **Effort**: Medium

1. **Profile Content Management** - Creators need to see/manage their content
2. **Subscription Management Page** - Users need to manage subscriptions

### 🟡 Phase 2: Important (Week 2)
**User Impact**: MEDIUM | **Effort**: High

3. **Ratings & Reviews** - Trust and discovery
4. **Creator Analytics** - Creator retention

### 🟢 Phase 3: Nice-to-Have (Week 3-4)
**User Impact**: MEDIUM | **Effort**: Medium

5. **Advanced Filtering** - Better discovery
6. **Social Features** - Community engagement

---

## Detailed Implementation

### 1. Profile Content Management 🔴

**Goal**: Let creators see, edit, and delete their content

**Current Status**: Mock data showing, no real content loaded

**Implementation**:

#### A. Load Creator's Content
```typescript
// In Profile.tsx
const [myContent, setMyContent] = useState<ContentMetadata[]>([]);
const [isLoadingContent, setIsLoadingContent] = useState(false);

useEffect(() => {
  if (publicKey && activeTab === 'earn') {
    loadMyContent();
  }
}, [publicKey, activeTab]);

const loadMyContent = async () => {
  setIsLoadingContent(true);
  try {
    const allContent = await getAllContent();
    const myContent = allContent.filter(
      c => c.creatorWallet === publicKey.toString()
    );
    setMyContent(myContent);
  } catch (error) {
    toast.error('Failed to load content');
  } finally {
    setIsLoadingContent(false);
  }
};
```

#### B. Display Content Cards
```typescript
<CardContent>
  {myContent.length > 0 ? (
    <div className="grid md:grid-cols-2 gap-4">
      {myContent.map(content => (
        <div key={content.id} className="border rounded-lg p-4">
          <img src={content.thumbnailUrl} className="w-full h-32 object-cover rounded mb-3" />
          <h4 className="font-semibold">{content.title}</h4>
          <p className="text-sm text-muted-foreground">{content.category}</p>
          <div className="mt-2 flex justify-between">
            <span className="font-bold">${content.price}/{content.interval}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleEdit(content.id)}>
                Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(content.id)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="text-center py-8">
      <p>No content created yet</p>
      <Button onClick={() => navigate('/profile/create-content')}>
        Create Your First Content
      </Button>
    </div>
  )}
</CardContent>
```

#### C. Edit Content Functionality
```typescript
const handleEdit = (contentId: string) => {
  navigate(`/profile/edit-content/${contentId}`);
};

// Create new page: EditContent.tsx (copy of CreateContent with pre-filled data)
```

#### D. Delete Content Functionality
```typescript
const handleDelete = async (contentId: string) => {
  if (!confirm('Are you sure you want to delete this content?')) return;

  try {
    // Call backend API to mark as deleted
    await fetch(`${BACKEND_URL}/api/content/${contentId}`, {
      method: 'DELETE'
    });

    toast.success('Content deleted');
    loadMyContent(); // Reload list
  } catch (error) {
    toast.error('Failed to delete content');
  }
};
```

**Files to Create/Modify**:
- `Profile.tsx` - Add content loading and management
- `EditContent.tsx` - New page for editing content
- `backend/src/server.ts` - Add DELETE `/api/content/:id` endpoint

**Estimated Time**: 2 days

---

### 2. Subscription Management Page 🔴

**Goal**: Centralized page for users to manage all subscriptions

**Implementation**:

#### A. Create Subscriptions Page
```typescript
// frontend/src/pages/Subscriptions.tsx
export default function Subscriptions() {
  const { publicKey } = useWallet();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (publicKey) loadSubscriptions();
  }, [publicKey]);

  const loadSubscriptions = async () => {
    const subs = await listSubscriptions(publicKey.toString());
    setSubscriptions(subs);
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6">
      <h1>My Subscriptions</h1>

      {subscriptions.map(sub => (
        <Card key={sub.id}>
          <CardHeader>
            <CardTitle>{sub.merchant_address}</CardTitle>
            <CardDescription>
              ${(Number(sub.amount) / 1_000_000).toFixed(2)} every {Number(sub.interval_seconds) / 86400} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge>{sub.status}</Badge>
              <p>Next payment: {formatDate(sub.next_execution)}</p>
            </div>

            <div className="mt-4 flex gap-2">
              {'Active' in sub.status && (
                <Button onClick={() => handlePause(sub.id)} variant="outline">
                  Pause
                </Button>
              )}

              {'Paused' in sub.status && (
                <Button onClick={() => handleResume(sub.id)}>
                  Resume
                </Button>
              )}

              <Button onClick={() => handleCancel(sub.id)} variant="destructive">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

#### B. Pause/Resume/Cancel Functions
```typescript
const handlePause = async (subscriptionId: string) => {
  try {
    await pauseSubscription(subscriptionId);
    toast.success('Subscription paused');
    loadSubscriptions();
  } catch (error) {
    toast.error('Failed to pause subscription');
  }
};

const handleResume = async (subscriptionId: string) => {
  try {
    await resumeSubscription(subscriptionId);
    toast.success('Subscription resumed');
    loadSubscriptions();
  } catch (error) {
    toast.error('Failed to resume subscription');
  }
};

const handleCancel = async (subscriptionId: string) => {
  if (!confirm('Are you sure? This cannot be undone.')) return;

  try {
    await cancelSubscription(subscriptionId);
    toast.success('Subscription cancelled');
    loadSubscriptions();
  } catch (error) {
    toast.error('Failed to cancel subscription');
  }
};
```

#### C. Payment History
```typescript
<Card>
  <CardHeader>
    <CardTitle>Payment History</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      {subscription.payments.map(payment => (
        <div key={payment.id} className="flex justify-between">
          <span>{formatDate(payment.date)}</span>
          <span>${payment.amount.toFixed(2)}</span>
          <Badge>{payment.status}</Badge>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

**Files to Create**:
- `frontend/src/pages/Subscriptions.tsx` - Full subscription management
- Add route in `App.tsx`: `<Route path="/subscriptions" element={<Subscriptions />} />`

**Estimated Time**: 2 days

---

### 3. Ratings & Reviews System 🟡

**Goal**: Allow users to rate and review content

**Implementation**:

#### A. Data Structures
```typescript
interface Review {
  id: string;
  contentId: string;
  reviewerWallet: string;
  reviewerName: string;
  rating: number; // 1-5 stars
  review: string;
  createdAt: number;
  helpful: number;
}
```

#### B. Rating Component
```typescript
// frontend/src/components/RatingStars.tsx
export function RatingStars({ rating, onRate, readOnly = false }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          className={`w-5 h-5 cursor-pointer ${
            (hover || rating) >= star
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
          }`}
          onClick={() => !readOnly && onRate(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
        />
      ))}
    </div>
  );
}
```

#### C. Review Submission
```typescript
// In ContentDetail.tsx
const [myRating, setMyRating] = useState(0);
const [myReview, setMyReview] = useState('');

const handleSubmitReview = async () => {
  if (!publicKey) return;

  try {
    const review: Review = {
      id: `review_${Date.now()}`,
      contentId: content.id,
      reviewerWallet: publicKey.toString(),
      reviewerName: 'User', // TODO: Get from profile
      rating: myRating,
      review: myReview,
      createdAt: Date.now(),
      helpful: 0
    };

    // Store on Aleph.im
    await fetch(`${BACKEND_URL}/api/reviews`, {
      method: 'POST',
      body: JSON.stringify(review)
    });

    toast.success('Review submitted!');
  } catch (error) {
    toast.error('Failed to submit review');
  }
};

// Display in ContentDetail.tsx
<Card>
  <CardHeader>
    <CardTitle>Reviews</CardTitle>
    <CardDescription>Average: {calculateAverage(reviews)} stars</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="mb-6">
      <h4 className="font-semibold mb-2">Write a Review</h4>
      <RatingStars rating={myRating} onRate={setMyRating} />
      <textarea
        value={myReview}
        onChange={(e) => setMyReview(e.target.value)}
        placeholder="Share your experience..."
        className="w-full mt-2 p-2 border rounded"
      />
      <Button onClick={handleSubmitReview}>Submit Review</Button>
    </div>

    <div className="space-y-4">
      {reviews.map(review => (
        <div key={review.id} className="border-b pb-4">
          <div className="flex justify-between">
            <div>
              <p className="font-semibold">{review.reviewerName}</p>
              <RatingStars rating={review.rating} readOnly />
            </div>
            <span className="text-sm text-muted-foreground">
              {formatDate(review.createdAt)}
            </span>
          </div>
          <p className="mt-2">{review.review}</p>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

#### D. Backend Support
```typescript
// backend/src/server.ts
app.post('/api/reviews', async (req, res) => {
  const review = req.body;

  // Store on Aleph.im
  const message = await post.publish({
    account,
    content: review,
    channel: 'OuroC-Mesos-Reviews',
    post_type: 'review'
  });

  res.json({ success: true, hash: message.item_hash });
});

app.get('/api/reviews/:contentId', async (req, res) => {
  const { contentId } = req.params;

  // Fetch from Aleph.im
  const messages = await posts.get({
    channel: 'OuroC-Mesos-Reviews',
    post_type: 'review'
  });

  const reviews = messages.posts
    .filter(p => p.content.contentId === contentId)
    .map(p => p.content);

  res.json(reviews);
});
```

**Files to Create**:
- `frontend/src/components/RatingStars.tsx` - Star rating component
- `frontend/src/components/ReviewList.tsx` - Display reviews
- Update `ContentDetail.tsx` - Add review section
- Update `backend/src/server.ts` - Add review endpoints

**Estimated Time**: 3 days

---

### 4. Creator Analytics 🟡

**Goal**: Show creators revenue, subscribers, and growth metrics

**Implementation**:

#### A. Analytics Dashboard Component
```typescript
// frontend/src/components/CreatorAnalytics.tsx
export function CreatorAnalytics({ creatorWallet }: { creatorWallet: string }) {
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalSubscribers: 0,
    activeSubscribers: 0,
    contentCount: 0,
    avgRating: 0,
    revenueGrowth: 0,
    subscriberGrowth: 0
  });

  useEffect(() => {
    loadAnalytics();
  }, [creatorWallet]);

  const loadAnalytics = async () => {
    // Fetch all content by this creator
    const allContent = await getAllContent();
    const myContent = allContent.filter(c => c.creatorWallet === creatorWallet);

    // Fetch all subscriptions to this creator
    const allSubs = await fetch(`${BACKEND_URL}/api/subscriptions/by-merchant/${creatorWallet}`);
    const subscriptions = await allSubs.json();

    // Calculate metrics
    const totalRevenue = subscriptions.reduce((sum, sub) =>
      sum + (Number(sub.total_paid) / 1_000_000), 0
    );

    const activeSubscribers = subscriptions.filter(sub =>
      'Active' in sub.status
    ).length;

    // TODO: Calculate growth (compare last 30 days vs previous 30 days)

    setAnalytics({
      totalRevenue,
      monthlyRevenue: totalRevenue / 12, // Rough estimate
      totalSubscribers: subscriptions.length,
      activeSubscribers,
      contentCount: myContent.length,
      avgRating: 4.8, // TODO: Calculate from reviews
      revenueGrowth: 15, // TODO: Calculate
      subscriberGrowth: 8 // TODO: Calculate
    });
  };

  return (
    <div className="grid md:grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">${analytics.totalRevenue.toFixed(2)}</p>
          <p className="text-sm text-green-600">+{analytics.revenueGrowth}% this month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Active Subscribers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{analytics.activeSubscribers}</p>
          <p className="text-sm text-green-600">+{analytics.subscriberGrowth}% this month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Content Published</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{analytics.contentCount}</p>
          <p className="text-sm text-muted-foreground">courses</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Average Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{analytics.avgRating}</p>
          <RatingStars rating={analytics.avgRating} readOnly />
        </CardContent>
      </Card>
    </div>
  );
}
```

#### B. Revenue Chart
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const revenueData = [
  { month: 'Jan', revenue: 400 },
  { month: 'Feb', revenue: 600 },
  { month: 'Mar', revenue: 800 },
  // ...
];

<Card>
  <CardHeader>
    <CardTitle>Revenue Trend</CardTitle>
  </CardHeader>
  <CardContent>
    <LineChart width={600} height={300} data={revenueData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
    </LineChart>
  </CardContent>
</Card>
```

#### C. Content Performance Table
```typescript
<Card>
  <CardHeader>
    <CardTitle>Content Performance</CardTitle>
  </CardHeader>
  <CardContent>
    <table className="w-full">
      <thead>
        <tr>
          <th>Content</th>
          <th>Subscribers</th>
          <th>Revenue</th>
          <th>Rating</th>
        </tr>
      </thead>
      <tbody>
        {myContent.map(content => (
          <tr key={content.id}>
            <td>{content.title}</td>
            <td>{getSubscriberCount(content.id)}</td>
            <td>${getRevenue(content.id).toFixed(2)}</td>
            <td>{getAvgRating(content.id)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </CardContent>
</Card>
```

**Files to Create**:
- `frontend/src/components/CreatorAnalytics.tsx` - Analytics dashboard
- Update `Profile.tsx` - Add analytics tab/section
- Install `recharts` for charts: `npm install recharts`

**Estimated Time**: 3 days

---

### 5. Advanced Filtering 🟢

**Goal**: Better content discovery with sorting and pagination

**Implementation**:

#### A. Sort Options
```typescript
// In CommunityHub.tsx
const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high' | 'rating' | 'popular'>('newest');

const sortContent = (content: CommunityContent[]) => {
  switch (sortBy) {
    case 'newest':
      return [...content].sort((a, b) => b.createdAt - a.createdAt);
    case 'price-low':
      return [...content].sort((a, b) => a.price - b.price);
    case 'price-high':
      return [...content].sort((a, b) => b.price - a.price);
    case 'rating':
      return [...content].sort((a, b) => b.rating - a.rating);
    case 'popular':
      return [...content].sort((a, b) => b.subscribers - a.subscribers);
    default:
      return content;
  }
};

// UI
<Select value={sortBy} onValueChange={setSortBy}>
  <SelectTrigger>
    <SelectValue placeholder="Sort by..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="newest">Newest First</SelectItem>
    <SelectItem value="price-low">Price: Low to High</SelectItem>
    <SelectItem value="price-high">Price: High to Low</SelectItem>
    <SelectItem value="rating">Highest Rated</SelectItem>
    <SelectItem value="popular">Most Popular</SelectItem>
  </SelectContent>
</Select>
```

#### B. Multi-Category Selection
```typescript
const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

const toggleCategory = (category: string) => {
  setSelectedCategories(prev =>
    prev.includes(category)
      ? prev.filter(c => c !== category)
      : [...prev, category]
  );
};

// Filter logic
const filtered = allContent.filter(content =>
  selectedCategories.length === 0 || selectedCategories.includes(content.category)
);
```

#### C. Pagination
```typescript
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 12;

const paginatedContent = filteredContent.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
);

const totalPages = Math.ceil(filteredContent.length / itemsPerPage);

// UI
<div className="flex justify-center gap-2 mt-6">
  <Button
    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
    disabled={currentPage === 1}
  >
    Previous
  </Button>
  <span>Page {currentPage} of {totalPages}</span>
  <Button
    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
    disabled={currentPage === totalPages}
  >
    Next
  </Button>
</div>
```

**Files to Modify**:
- `frontend/src/pages/CommunityHub.tsx` - Add sorting and pagination

**Estimated Time**: 1-2 days

---

### 6. Social Features 🟢

**Goal**: Share, follow, and engage with community

**Implementation**:

#### A. Share Content
```typescript
// In ContentDetail.tsx
const handleShare = async () => {
  const url = `${window.location.origin}/content/${content.id}`;

  if (navigator.share) {
    await navigator.share({
      title: content.title,
      text: content.description,
      url
    });
  } else {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  }
};

<Button onClick={handleShare} variant="outline">
  <Share2 className="w-4 h-4 mr-2" />
  Share
</Button>
```

#### B. Follow Creators
```typescript
const [following, setFollowing] = useState<string[]>([]);

const handleFollow = async (creatorWallet: string) => {
  const newFollowing = [...following, creatorWallet];
  setFollowing(newFollowing);

  // Store in backend
  await fetch(`${BACKEND_URL}/api/follow`, {
    method: 'POST',
    body: JSON.stringify({
      follower: publicKey.toString(),
      creator: creatorWallet
    })
  });

  toast.success('Following creator!');
};

<Button onClick={() => handleFollow(content.creatorWallet)}>
  <Heart className="w-4 h-4 mr-2" />
  Follow
</Button>
```

#### C. Comments/Discussions
```typescript
// Simple comments on content
const [comments, setComments] = useState<Comment[]>([]);
const [newComment, setNewComment] = useState('');

const handlePostComment = async () => {
  const comment = {
    id: `comment_${Date.now()}`,
    contentId: content.id,
    author: publicKey.toString(),
    text: newComment,
    createdAt: Date.now()
  };

  await fetch(`${BACKEND_URL}/api/comments`, {
    method: 'POST',
    body: JSON.stringify(comment)
  });

  setComments([...comments, comment]);
  setNewComment('');
  toast.success('Comment posted!');
};
```

**Files to Modify**:
- `ContentDetail.tsx` - Add share and follow buttons
- `backend/src/server.ts` - Add follow and comment endpoints

**Estimated Time**: 2 days

---

## Total Estimated Time: 3-4 weeks

### Week 1 Deliverables:
- ✅ Profile content management
- ✅ Subscription management page

### Week 2 Deliverables:
- ✅ Ratings & reviews system
- ✅ Creator analytics

### Week 3-4 Deliverables:
- ✅ Advanced filtering
- ✅ Social features

---

## Success Criteria

### Profile Content Management:
- [ ] Creators can see all their content
- [ ] Edit button navigates to edit page
- [ ] Delete button removes content
- [ ] Real-time updates after changes

### Subscription Management:
- [ ] List all user subscriptions
- [ ] Pause/resume works
- [ ] Cancel works
- [ ] Payment history visible

### Ratings & Reviews:
- [ ] Users can submit ratings (1-5 stars)
- [ ] Users can write reviews
- [ ] Average rating calculated correctly
- [ ] Reviews display on content page

### Creator Analytics:
- [ ] Revenue tracking
- [ ] Subscriber counts
- [ ] Growth metrics
- [ ] Content performance table

### Advanced Filtering:
- [ ] Sort by price, rating, popularity
- [ ] Multi-category selection
- [ ] Pagination works
- [ ] Results update smoothly

### Social Features:
- [ ] Share button copies link
- [ ] Follow button works
- [ ] Comments can be posted
- [ ] Comments display correctly

---

## Next Steps

1. Review this plan
2. Prioritize features based on user feedback
3. Start with Phase 1 (Profile + Subscriptions)
4. Test thoroughly after each phase
5. Gather user feedback
6. Iterate and improve

**Ready to start implementation!**
