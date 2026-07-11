import React from "react"
import { Star } from "lucide-react"

export interface RatingSummaryProps {
  avgRating: number
  reviewCount: number
}

/**
 * The seller-rating readout shown wherever a rating needs to appear —
 * product detail's seller card, public profiles — so the average rating
 * (driven by the profiles.avg_rating DB trigger) renders identically
 * everywhere instead of each page hand-rolling its own markup.
 */
export const RatingSummary: React.FC<RatingSummaryProps> = ({ avgRating, reviewCount }) => (
  <div className="text-xs text-text-muted flex items-center gap-1">
    <Star className="w-3.5 h-3.5 fill-current text-primary" aria-hidden="true" />
    <span>
      {avgRating.toFixed(1)} ({reviewCount} review{reviewCount === 1 ? "" : "s"})
    </span>
  </div>
)
