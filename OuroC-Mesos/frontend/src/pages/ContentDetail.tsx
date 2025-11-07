import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getAllContent, ContentMetadata, getContentReviews, storeReview, Review } from '@/lib/alephSimple';
import { createSubscription, listSubscriptions } from '@/lib/backend';
import { ArrowLeft, Check, Share2, Heart } from 'lucide-react';
import { ReviewList } from '@/components/ReviewList';

// Interval mapping: UI string → seconds
const INTERVAL_MAP: Record<string, number> = {
  'weekly': 604800,      // 7 days
  'monthly': 2592000,    // 30 days
  'quarterly': 7776000,  // 90 days
};

export default function ContentDetail() {
  const { contentId } = useParams<{ contentId: string }>();
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [content, setContent] = useState<ContentMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Load content on mount
  useEffect(() => {
    async function loadContent() {
      try {
        console.log('📖 Loading content:', contentId);
        const allContent = await getAllContent();
        const found = allContent.find(c => c.id === contentId);

        if (found) {
          console.log('✅ Content found:', found);
          setContent(found);
        } else {
          console.error('❌ Content not found:', contentId);
          toast({
            title: 'Content not found',
            description: 'The content you are looking for does not exist.',
            variant: 'destructive',
          });
          navigate('/community');
        }
      } catch (error) {
        console.error('Failed to load content:', error);
        toast({
          title: 'Error loading content',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, [contentId, navigate, toast]);

  // Check if user is already subscribed
  useEffect(() => {
    async function checkSubscription() {
      if (!publicKey || !content) return;

      setCheckingSubscription(true);
      try {
        console.log('🔍 Checking if user is subscribed...');
        const subscriptions = await listSubscriptions(publicKey.toString());

        // Check if user has active subscription to this creator
        const activeSubscription = subscriptions.find(sub =>
          sub.merchant_address === content.creatorWallet &&
          'Active' in sub.status
        );

        if (activeSubscription) {
          console.log('✅ User is already subscribed:', activeSubscription.id);
          setIsSubscribed(true);
        } else {
          console.log('ℹ️ User is not subscribed');
          setIsSubscribed(false);
        }
      } catch (error) {
        console.error('Failed to check subscription:', error);
        // Don't show error to user, just assume not subscribed
        setIsSubscribed(false);
      } finally {
        setCheckingSubscription(false);
      }
    }

    checkSubscription();
  }, [publicKey, content]);

  // Load reviews for this content
  useEffect(() => {
    async function loadReviews() {
      if (!contentId) return;

      setLoadingReviews(true);
      try {
        const contentReviews = await getContentReviews(contentId);
        setReviews(contentReviews);
      } catch (error) {
        console.error('Failed to load reviews:', error);
      } finally {
        setLoadingReviews(false);
      }
    }

    loadReviews();
  }, [contentId]);

  const handleSubscribe = async () => {
    if (!publicKey) {
      toast({
        title: 'Connect your wallet',
        description: 'Please connect your Phantom wallet to subscribe',
        variant: 'destructive',
      });
      return;
    }

    if (!content) return;

    setSubscribing(true);

    try {
      // Convert interval string to seconds
      const intervalSeconds = INTERVAL_MAP[content.interval];

      if (!intervalSeconds) {
        throw new Error(`Invalid interval: ${content.interval}`);
      }

      console.log('🔔 Creating subscription:', {
        walletAddress: publicKey.toString(),
        merchantAddress: content.creatorWallet,
        amountUsdc: content.price,
        intervalSeconds,
        merchantName: content.creatorName || 'Creator',
      });

      // Call ICP Timer to create subscription
      const result = await createSubscription(
        publicKey.toString(),           // User's wallet
        content.creatorWallet,          // Creator's wallet (merchant)
        content.price,                  // Content price in USDC
        intervalSeconds,                // Payment interval in seconds
        content.creatorName || 'OuroC Creator'
      );

      if (result.success) {
        console.log('✅ Subscription created successfully!');
        console.log('   Subscription ID:', result.subscriptionId);
        console.log('   Recurring:', result.isRecurring);

        toast({
          title: 'Subscribed successfully!',
          description: `You are now subscribed to ${content.title}. ${
            result.isRecurring
              ? `You'll receive a reminder 1 day before each ${content.interval} payment.`
              : 'This is a one-time purchase.'
          }`,
        });

        setIsSubscribed(true);

        // TODO: Step 2 would be to approve delegation on Solana
        // This requires calling the Solana smart contract
        // For now, the subscription is created in ICP Timer only

      } else {
        throw new Error(result.error || 'Failed to create subscription');
      }

    } catch (error) {
      console.error('❌ Subscription failed:', error);
      toast({
        title: 'Subscription failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setSubscribing(false);
    }
  };

  const handleSubmitReview = async (rating: number, comment: string) => {
    if (!publicKey || !contentId || !content) {
      throw new Error('Missing required data');
    }

    const review: Review = {
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contentId,
      reviewerWallet: publicKey.toString(),
      reviewerName: undefined, // Could get from profile if available
      rating,
      comment,
      createdAt: Date.now(),
    };

    const success = await storeReview(review);
    if (success) {
      // Reload reviews
      const updatedReviews = await getContentReviews(contentId);
      setReviews(updatedReviews);
    } else {
      throw new Error('Failed to store review');
    }
  };

  const handleShare = async () => {
    if (!content) return;

    const shareData = {
      title: content.title,
      text: `Check out "${content.title}" by ${content.creatorName} on OuroC-Mesos!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast({
          title: 'Shared successfully!',
          description: 'Thanks for spreading the word!',
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: 'Link copied!',
          description: 'Share link copied to clipboard',
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleLike = () => {
    // TODO: Implement like functionality with backend
    toast({
      title: 'Feature coming soon!',
      description: 'Like functionality will be available in the next update',
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded-lg mb-6"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-muted-foreground">Content not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/community')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Community Hub
      </Button>

      {/* Thumbnail */}
      {content.thumbnailUrl && (
        <img
          src={content.thumbnailUrl}
          alt={content.title}
          className="w-full h-64 object-cover rounded-lg mb-6"
          onError={(e) => {
            // Fallback if image fails to load
            e.currentTarget.src = 'https://via.placeholder.com/800x400?text=Content+Image';
          }}
        />
      )}

      {/* Title and Social Actions */}
      <div className="flex items-start justify-between mb-4">
        <h1 className="text-4xl font-bold flex-1">{content.title}</h1>
        <div className="flex gap-2 ml-4">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={handleLike}>
            <Heart className="w-4 h-4 mr-2" />
            Like
          </Button>
        </div>
      </div>

      {/* Creator info */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
          {content.creatorName?.[0]?.toUpperCase() || 'C'}
        </div>
        <div>
          <p className="font-semibold text-lg">{content.creatorName || 'Creator'}</p>
          <p className="text-sm text-muted-foreground">
            {content.creatorWallet.slice(0, 8)}...{content.creatorWallet.slice(-6)}
          </p>
        </div>
      </div>

      {/* Price and subscription section */}
      <div className="bg-card border rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Subscription Price</p>
            <p className="text-3xl font-bold">
              ${content.price.toFixed(2)}
              <span className="text-lg text-muted-foreground ml-1">/{content.interval}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Billed every {content.interval === 'weekly' ? '7 days' : content.interval === 'monthly' ? '30 days' : '90 days'}
            </p>
          </div>

          {/* Subscribe button */}
          <div className="flex flex-col gap-2">
            {checkingSubscription ? (
              <Button disabled size="lg" className="w-full md:w-auto">
                Checking status...
              </Button>
            ) : isSubscribed ? (
              <Button disabled size="lg" className="w-full md:w-auto">
                <Check className="mr-2 h-4 w-4" />
                Subscribed
              </Button>
            ) : (
              <Button
                onClick={handleSubscribe}
                disabled={subscribing || !publicKey}
                size="lg"
                className="w-full md:w-auto"
              >
                {subscribing ? 'Subscribing...' : `Subscribe $${content.price}/${content.interval}`}
              </Button>
            )}
            {!publicKey && (
              <p className="text-xs text-muted-foreground text-center">
                Connect wallet to subscribe
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Category badge */}
      <div className="mb-6">
        <span className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
          {content.category}
        </span>
      </div>

      {/* Description */}
      <div className="prose prose-slate max-w-none mb-8">
        <h2 className="text-2xl font-bold mb-3">About this content</h2>
        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {content.description}
        </p>
      </div>

      {/* What you'll get section */}
      <div className="bg-card border rounded-lg p-6 mb-6">
        <h3 className="text-xl font-bold mb-4">What you'll get</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center mt-0.5">
              <Check className="w-3 h-3 text-green-500" />
            </div>
            <span className="text-muted-foreground">
              Access to exclusive {content.category.toLowerCase()} content
            </span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center mt-0.5">
              <Check className="w-3 h-3 text-green-500" />
            </div>
            <span className="text-muted-foreground">
              Automatic {content.interval} billing via USDC
            </span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center mt-0.5">
              <Check className="w-3 h-3 text-green-500" />
            </div>
            <span className="text-muted-foreground">
              Payment reminders 1 day before each billing cycle
            </span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center mt-0.5">
              <Check className="w-3 h-3 text-green-500" />
            </div>
            <span className="text-muted-foreground">
              Cancel anytime from your profile - no commitments
            </span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center mt-0.5">
              <Check className="w-3 h-3 text-green-500" />
            </div>
            <span className="text-muted-foreground">
              Secure payments via Solana blockchain
            </span>
          </li>
        </ul>
      </div>

      {/* Subscription info */}
      <div className="bg-muted/50 border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">How it works</h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-bold text-primary">1.</span>
            <span>Click "Subscribe" and connect your Phantom wallet</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">2.</span>
            <span>Approve the subscription in your wallet (one-time approval)</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">3.</span>
            <span>Get instant access to the content</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">4.</span>
            <span>Receive a reminder notification 1 day before each payment</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">5.</span>
            <span>Payments are processed automatically every {content.interval}</span>
          </li>
        </ol>
      </div>

      {/* Reviews Section */}
      <div className="mt-12">
        {loadingReviews ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading reviews...</p>
          </div>
        ) : (
          <ReviewList
            contentId={contentId!}
            reviews={reviews}
            onSubmitReview={handleSubmitReview}
          />
        )}
      </div>
    </div>
  );
}
