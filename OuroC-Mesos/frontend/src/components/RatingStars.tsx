import { useState } from "react";
import { Star } from "lucide-react";

interface RatingStarsProps {
  rating: number;
  onRate?: (rating: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  count?: number;
}

export function RatingStars({
  rating,
  onRate,
  readOnly = false,
  size = "md",
  showCount = false,
  count = 0,
}: RatingStarsProps) {
  const [hover, setHover] = useState(0);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const starSize = sizeClasses[size];

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} transition-colors ${
              !readOnly ? "cursor-pointer" : ""
            } ${
              (hover || rating) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
            onClick={() => !readOnly && onRate && onRate(star)}
            onMouseEnter={() => !readOnly && setHover(star)}
            onMouseLeave={() => !readOnly && setHover(0)}
          />
        ))}
      </div>
      {showCount && count > 0 && (
        <span className="text-sm text-muted-foreground ml-1">
          ({count})
        </span>
      )}
    </div>
  );
}
