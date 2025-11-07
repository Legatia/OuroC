import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { RatingStars } from "./RatingStars";
import { User } from "lucide-react";
import { format } from "date-fns";

export interface Review {
  id: string;
  contentId: string;
  reviewerWallet: string;
  reviewerName?: string;
  rating: number;
  comment: string;
  createdAt: number;
}

interface ReviewListProps {
  contentId: string;
  reviews: Review[];
  onSubmitReview: (rating: number, comment: string) => Promise<void>;
}

export function ReviewList({ contentId, reviews, onSubmitReview }: ReviewListProps) {
  const { publicKey } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");

  // Check if user has already reviewed
  const userReview = reviews.find(
    (r) => publicKey && r.reviewerWallet === publicKey.toString()
  );

  const handleSubmit = async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet to leave a review");
      return;
    }

    if (newRating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!newComment.trim()) {
      toast.error("Please write a review");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitReview(newRating, newComment);
      setNewRating(0);
      setNewComment("");
      toast.success("Review submitted successfully!");
    } catch (error) {
      console.error("Failed to submit review:", error);
      toast.error("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate average rating
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  // Calculate rating distribution
  const ratingCounts = [0, 0, 0, 0, 0];
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingCounts[r.rating - 1]++;
    }
  });

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Ratings & Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-8">
            {/* Average Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {averageRating.toFixed(1)}
              </div>
              <RatingStars rating={averageRating} readOnly size="lg" />
              <p className="text-sm text-muted-foreground mt-2">
                {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((stars) => (
                <div key={stars} className="flex items-center gap-2 mb-2">
                  <span className="text-sm w-12">{stars} star</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400"
                      style={{
                        width: `${
                          reviews.length > 0
                            ? (ratingCounts[stars - 1] / reviews.length) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-sm w-8 text-right">
                    {ratingCounts[stars - 1]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Write Review Form */}
      {!userReview && publicKey && (
        <Card>
          <CardHeader>
            <CardTitle>Write a Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Your Rating
              </label>
              <RatingStars
                rating={newRating}
                onRate={setNewRating}
                size="lg"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Your Review
              </label>
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your experience with this content..."
                className="min-h-[100px]"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || newRating === 0 || !newComment.trim()}
            >
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5" />
                  </div>

                  {/* Review Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold truncate">
                          {review.reviewerName ||
                            `${review.reviewerWallet.slice(0, 8)}...${review.reviewerWallet.slice(-6)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(review.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <RatingStars rating={review.rating} readOnly size="sm" />
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {review.comment}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>No reviews yet. Be the first to review this content!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
