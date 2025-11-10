import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import RecurringPurchase from "@/components/RecurringPurchase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { usePromoCodes } from "@/contexts/PromoCodesContext";
import { Copy, Gift, Plus, TrendingUp, Users, DollarSign, BookOpen, Award, Star, BarChart3, Calendar, CreditCard, Video } from "lucide-react";
import { format } from "date-fns";
import { listSubscriptions, cancelSubscription } from "@/lib/backend";
import { getAllContent, ContentMetadata, storeLiveLecture, LiveLecture } from "@/lib/alephSimple";
import { CreatorAnalytics } from "@/components/CreatorAnalytics";

const Profile = () => {
  const { connected, publicKey } = useWallet();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { promoCodes } = usePromoCodes();

  // Get tab from URL query parameter, default to "learn"
  const initialTab = searchParams.get('tab') || 'learn';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [recurringPurchases, setRecurringPurchases] = useState<any[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(false);

  // Real creator content from Aleph.im
  const [creatorContent, setCreatorContent] = useState<ContentMetadata[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Lecture scheduling state
  const [isSchedulingLecture, setIsSchedulingLecture] = useState(false);
  const [selectedContentForLecture, setSelectedContentForLecture] = useState<ContentMetadata | null>(null);
  const [lectureForm, setLectureForm] = useState({
    title: '',
    description: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: '60',
    streamUrl: '',
  });

  // Mock creator data (replace with real data from backend)
  const [creatorStats] = useState({
    monthlyEarnings: 1250,
    totalSubscribers: 45,
    totalCourses: 3,
    level: 5,
    badges: ['🎓', '⭐', '🔥'],
  });

  const [learnerStats] = useState({
    coursesEnrolled: 5,
    totalSpent: 240,
    level: 3,
    badges: ['📚', '🎯', '💡'],
    achievements: [
      { id: 1, title: 'First Subscription', icon: '🎉', date: '2025-10-15' },
      { id: 2, title: 'Early Adopter', icon: '🚀', date: '2025-10-20' },
      { id: 3, title: 'Consistent Learner', icon: '📈', date: '2025-10-28' },
    ],
  });

  useEffect(() => {
    if (connected && publicKey) {
      loadSubscriptions();
    }
  }, [connected, publicKey]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (connected && publicKey && activeTab === 'earn') {
      loadMyContent();
    }
  }, [connected, publicKey, activeTab]);

  const loadSubscriptions = async () => {
    if (!publicKey) return;

    setIsLoadingSubscriptions(true);
    try {
      const subs = await listSubscriptions(publicKey.toBase58());

      const transformed = subs.map((sub: any) => {
        let statusStr = "paused";
        if ('Active' in sub.status) statusStr = "active";
        else if ('Paused' in sub.status) statusStr = "paused";
        else if ('Cancelled' in sub.status) statusStr = "cancelled";
        else if ('Expired' in sub.status) statusStr = "expired";

        let nextPaymentDate = "Not scheduled";
        try {
          const nextExecutionNanos = Number(sub.next_execution);
          if (!isNaN(nextExecutionNanos) && nextExecutionNanos > 0 && isFinite(nextExecutionNanos)) {
            const nextExecutionMillis = nextExecutionNanos / 1_000_000;
            nextPaymentDate = new Date(nextExecutionMillis).toISOString().split('T')[0];
          }
        } catch (dateError) {
          console.error("Error converting date:", dateError);
        }

        return {
          id: sub.subscription_id,
          merchant: sub.merchant_address,
          amount: `$${(Number(sub.amount) / 1_000_000).toFixed(2)}`,
          interval: `${Number(sub.interval_seconds) / 86400} days`,
          status: statusStr,
          nextPayment: nextPaymentDate,
        };
      });

      setRecurringPurchases(transformed);
    } catch (error) {
      console.error("Failed to load subscriptions:", error);
      toast.error("Failed to load subscriptions");
    } finally {
      setIsLoadingSubscriptions(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!publicKey) return;

    try {
      await cancelSubscription(subscriptionId, publicKey.toBase58());
      toast.success("Subscription cancelled successfully");
      await loadSubscriptions();
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      toast.error("Failed to cancel subscription");
    }
  };

  const loadMyContent = async () => {
    if (!publicKey) return;

    setIsLoadingContent(true);
    try {
      const allContent = await getAllContent();
      const myContent = allContent.filter(
        (c) => c.creatorWallet === publicKey.toString()
      );
      setCreatorContent(myContent);
      console.log(`✅ Loaded ${myContent.length} content items for creator`);
    } catch (error) {
      console.error('Failed to load content:', error);
      toast.error('Failed to load content');
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleEditContent = (contentId: string) => {
    navigate(`/profile/edit-content/${contentId}`);
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!window.confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return;
    }

    try {
      // For now, just remove from local state
      // TODO: Add backend endpoint to mark as deleted on Aleph.im
      setCreatorContent(prev => prev.filter(c => c.id !== contentId));
      toast.success('Content deleted successfully');
    } catch (error) {
      console.error('Failed to delete content:', error);
      toast.error('Failed to delete content');
    }
  };

  const handleScheduleLecture = (content: ContentMetadata) => {
    setSelectedContentForLecture(content);
    setLectureForm({
      title: `Live Session: ${content.title}`,
      description: `Join us for a live session on ${content.title}`,
      scheduledDate: '',
      scheduledTime: '',
      duration: '60',
      streamUrl: '',
    });
    setIsSchedulingLecture(true);
  };

  const handleSubmitLecture = async () => {
    if (!publicKey || !selectedContentForLecture) return;

    // Validation
    if (!lectureForm.title || !lectureForm.scheduledDate || !lectureForm.scheduledTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Combine date and time into Unix timestamp
      const scheduledDateTime = new Date(`${lectureForm.scheduledDate}T${lectureForm.scheduledTime}`);
      const scheduledTime = scheduledDateTime.getTime();

      if (scheduledTime < Date.now()) {
        toast.error('Scheduled time must be in the future');
        return;
      }

      const lecture: LiveLecture = {
        id: `lecture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contentId: selectedContentForLecture.id,
        title: lectureForm.title.trim(),
        description: lectureForm.description.trim() || 'Join us for this live session',
        scheduledTime,
        duration: parseInt(lectureForm.duration) || 60,
        streamUrl: lectureForm.streamUrl.trim() || undefined,
        status: 'scheduled',
        creatorWallet: publicKey.toString(),
        creatorName: selectedContentForLecture.creatorName,
        attendees: [],
        createdAt: Date.now(),
      };

      const success = await storeLiveLecture(lecture);

      if (success) {
        toast.success('Live lecture scheduled successfully!');
        setIsSchedulingLecture(false);
        setSelectedContentForLecture(null);
        setLectureForm({
          title: '',
          description: '',
          scheduledDate: '',
          scheduledTime: '',
          duration: '60',
          streamUrl: '',
        });
      } else {
        toast.error('Failed to schedule lecture');
      }
    } catch (error) {
      console.error('Error scheduling lecture:', error);
      toast.error('Failed to schedule lecture');
    }
  };

  const handleCopyPromoCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Promo code copied!");
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-6">🔐</div>
          <h2 className="text-3xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-8">
            Please connect your wallet to view your profile and manage your subscriptions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Profile Header */}
        <div className="mb-8">
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                {/* Left: Avatar and Info */}
                <div className="flex items-start gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-3xl">
                      👤
                    </div>
                    <Badge className="absolute -bottom-1 -right-1 bg-purple-600">
                      L{activeTab === 'earn' ? creatorStats.level : learnerStats.level}
                    </Badge>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold mb-2">
                      {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-6)}
                    </h1>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex gap-1">
                        {(activeTab === 'earn' ? creatorStats.badges : learnerStats.badges).map((badge, i) => (
                          <span key={i} className="text-xl" title="Badge">
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      {activeTab === 'earn' ? (
                        <>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <DollarSign className="w-4 h-4" />
                            <span>${creatorStats.monthlyEarnings}/mo</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>{creatorStats.totalSubscribers} subscribers</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <BookOpen className="w-4 h-4" />
                            <span>{creatorStats.totalCourses} courses</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <BookOpen className="w-4 h-4" />
                            <span>{learnerStats.coursesEnrolled} enrolled</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <DollarSign className="w-4 h-4" />
                            <span>${learnerStats.totalSpent} spent</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Award className="w-4 h-4" />
                            <span>{learnerStats.achievements.length} achievements</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Quick Actions */}
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(publicKey?.toBase58() || '');
                      toast.success("Address copied!");
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Address
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content: Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Main Tabs (2/3 width) */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="glass w-full grid grid-cols-2 mb-6">
                <TabsTrigger value="learn" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  Learn
                </TabsTrigger>
                <TabsTrigger value="earn" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Earn
                </TabsTrigger>
              </TabsList>

              {/* Learn Tab */}
              <TabsContent value="learn" className="space-y-6">
                {/* Enrolled Courses */}
                <Card className="glass">
                  <CardHeader>
                    <CardTitle>My Courses</CardTitle>
                    <CardDescription>Courses you're currently enrolled in</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recurringPurchases.length > 0 ? (
                      <div className="space-y-4">
                        {recurringPurchases.filter(p => p.status === 'active').map((purchase) => (
                          <div key={purchase.id} className="p-4 border rounded-lg flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold">{purchase.merchant.slice(0, 20)}...</h4>
                              <p className="text-sm text-muted-foreground">
                                {purchase.amount} • {purchase.interval}
                              </p>
                            </div>
                            <Badge>{purchase.status}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No courses enrolled yet</p>
                        <Button
                          variant="link"
                          onClick={() => navigate('/community-hub')}
                          className="mt-2"
                        >
                          Browse Community Hub
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Achievements */}
                <Card className="glass">
                  <CardHeader>
                    <CardTitle>Achievements</CardTitle>
                    <CardDescription>Your learning milestones</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {learnerStats.achievements.map((achievement) => (
                        <div
                          key={achievement.id}
                          className="p-3 border rounded-lg flex items-center gap-4"
                        >
                          <div className="text-3xl">{achievement.icon}</div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{achievement.title}</h4>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(achievement.date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Earn Tab */}
              <TabsContent value="earn" className="space-y-6">
                {/* Creator Analytics */}
                <CreatorAnalytics
                  content={creatorContent}
                  subscriptions={recurringPurchases.map(p => ({
                    ...p,
                    amount: BigInt(parseFloat(p.amount.replace('$', '')) * 1_000_000),
                    interval_seconds: BigInt(parseInt(p.interval) * 86400),
                    status: p.status === 'active' ? { Active: null } : { Paused: null },
                    merchant_address: p.merchant,
                  }))}
                />

                {/* Content Management */}
                <Card className="glass">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Your Content</CardTitle>
                        <CardDescription>Manage your courses and earnings</CardDescription>
                      </div>
                      <Button
                        onClick={() => navigate('/profile/create-content')}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Create New Content
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingContent ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading your content...</p>
                      </div>
                    ) : creatorContent.length > 0 ? (
                      <div className="space-y-4">
                        {creatorContent.map((content) => (
                          <div key={content.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                              {/* Thumbnail */}
                              <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                {content.thumbnailUrl ? (
                                  <img
                                    src={content.thumbnailUrl}
                                    alt={content.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-2xl">
                                    📚
                                  </div>
                                )}
                              </div>

                              {/* Content Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold truncate">{content.title}</h4>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                      {content.description}
                                    </p>
                                  </div>
                                  <Badge className="ml-2 flex-shrink-0">
                                    {content.category}
                                  </Badge>
                                </div>

                                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="w-4 h-4" />
                                    ${content.price}/{content.interval}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(content.createdAt).toLocaleDateString()}
                                  </span>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigate(`/content/${content.id}`)}
                                  >
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleScheduleLecture(content)}
                                    className="text-purple-600 hover:text-purple-700 hover:border-purple-600"
                                  >
                                    <Video className="w-3 h-3 mr-1" />
                                    Schedule Lecture
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditContent(content.id)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteContent(content.id)}
                                    className="text-red-600 hover:text-red-700 hover:border-red-600"
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="mb-2">No content created yet</p>
                        <Button
                          onClick={() => navigate('/profile/create-content')}
                          className="mt-2"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Your First Content
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dashboard Stats */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Monthly Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${creatorStats.monthlyEarnings}</div>
                      <p className="text-xs text-green-600 mt-1">+12% from last month</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{creatorStats.totalSubscribers}</div>
                      <p className="text-xs text-green-600 mt-1">+5 this week</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{creatorStats.totalCourses}</div>
                      <p className="text-xs text-muted-foreground mt-1">2 active, 1 draft</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column: Sidebar (1/3 width) */}
          <div className="space-y-6">
            {/* Promo Codes */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Promo Codes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {promoCodes.length > 0 ? (
                  <div className="space-y-3">
                    {promoCodes.slice(0, 3).map((promo) => (
                      <div
                        key={promo.code}
                        className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <code className="font-mono text-sm font-semibold">{promo.code}</code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyPromoCode(promo.code)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p>Discount: {promo.discountPercentage}%</p>
                          <p>Expires: {format(new Date(promo.validUntil), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No promo codes yet</p>
                )}
              </CardContent>
            </Card>

            {/* Active Recurring */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Active Recurring
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingSubscriptions ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
                ) : recurringPurchases.filter(p => p.status === 'active').length > 0 ? (
                  <div className="space-y-3">
                    {recurringPurchases.filter(p => p.status === 'active').slice(0, 3).map((purchase) => (
                      <div key={purchase.id} className="p-3 border rounded-lg text-xs">
                        <div className="font-semibold mb-1">
                          {purchase.merchant.slice(0, 15)}...
                        </div>
                        <div className="text-muted-foreground">
                          <p>{purchase.amount} • {purchase.interval}</p>
                          <p>Next: {purchase.nextPayment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No active subscriptions</p>
                )}
              </CardContent>
            </Card>

            {/* Purchase History */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Purchase History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recurringPurchases.length > 0 ? (
                  <div className="space-y-3">
                    {recurringPurchases.slice(0, 3).map((purchase) => (
                      <div key={purchase.id} className="p-3 border rounded-lg text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold">{purchase.amount}</span>
                          <Badge variant="outline" className="text-xs">
                            {purchase.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">
                          {purchase.merchant.slice(0, 20)}...
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No purchase history</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Schedule Lecture Dialog */}
        <Dialog open={isSchedulingLecture} onOpenChange={setIsSchedulingLecture}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule Live Lecture</DialogTitle>
              <DialogDescription>
                Schedule a live session for {selectedContentForLecture?.title}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="lecture-title">Lecture Title *</Label>
                <Input
                  id="lecture-title"
                  value={lectureForm.title}
                  onChange={(e) => setLectureForm({ ...lectureForm, title: e.target.value })}
                  placeholder="e.g., Introduction to React Hooks"
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="lecture-description">Description</Label>
                <Textarea
                  id="lecture-description"
                  value={lectureForm.description}
                  onChange={(e) => setLectureForm({ ...lectureForm, description: e.target.value })}
                  placeholder="What will students learn in this session?"
                  rows={3}
                  maxLength={500}
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lecture-date">Date *</Label>
                  <Input
                    id="lecture-date"
                    type="date"
                    value={lectureForm.scheduledDate}
                    onChange={(e) => setLectureForm({ ...lectureForm, scheduledDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lecture-time">Time *</Label>
                  <Input
                    id="lecture-time"
                    type="time"
                    value={lectureForm.scheduledTime}
                    onChange={(e) => setLectureForm({ ...lectureForm, scheduledTime: e.target.value })}
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="lecture-duration">Duration (minutes)</Label>
                <Input
                  id="lecture-duration"
                  type="number"
                  min="15"
                  max="240"
                  value={lectureForm.duration}
                  onChange={(e) => setLectureForm({ ...lectureForm, duration: e.target.value })}
                  placeholder="60"
                />
              </div>

              {/* Stream URL */}
              <div className="space-y-2">
                <Label htmlFor="lecture-stream-url">Stream URL (optional)</Label>
                <Input
                  id="lecture-stream-url"
                  type="url"
                  value={lectureForm.streamUrl}
                  onChange={(e) => setLectureForm({ ...lectureForm, streamUrl: e.target.value })}
                  placeholder="https://youtube.com/live/... or https://twitch.tv/..."
                />
                <p className="text-xs text-muted-foreground">
                  YouTube Live, Twitch, or custom RTMP stream URL. You can add this later.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsSchedulingLecture(false);
                  setSelectedContentForLecture(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitLecture}>
                Schedule Lecture
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Profile;
