import React from "react"
import { Star } from "lucide-react"

export interface StarRatingProps {
  /** Whole-number rating, 1-5 (e.g. an individual review's rating). */
  rating: number
  size?: "sm" | "md"
}

/** Read-only star display. For the interactive version, see StarRatingInput. */
export const StarRating: React.FC<StarRatingProps> = ({ rating, size = "sm" }) => {
  const starClass = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5"

  return (
    <span
      className="inline-flex items-center gap-0.5 text-primary"
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} aria-hidden="true" className={`${starClass} ${index < rating ? "fill-current" : ""}`} />
      ))}
    </span>
  )
}
