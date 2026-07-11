import React from "react"
import { useQuery } from "@tanstack/react-query"
import { MessageSquareOff } from "lucide-react"
import { EmptyState } from "../../components/ui/EmptyState"
import { Skeleton } from "../../components/ui/Skeleton"
import { ReviewListItem } from "../../components/reviews/ReviewListItem"
import { fetchReviewsForSeller } from "../../lib/queries/reviews"

const SKELETON_COUNT = 2

/**
 * Read-only: sellers cannot alter reviews they receive (PRD §7.12), so this
 * section has no edit/delete affordances, unlike the buyer-facing review
 * card on OrderTrackingPage.
 */
export const ReviewsReceivedSection: React.FC<{ userId: string }> = ({ userId }) => {
  const reviewsQuery = useQuery({
    queryKey: ["reviews", "seller", userId],
    queryFn: () => fetchReviewsForSeller(userId),
  })
  const reviews = reviewsQuery.data?.data ?? []

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-serif text-text">
        Reviews Received {reviews.length > 0 && `(${reviews.length})`}
      </h2>
      {reviewsQuery.isLoading ? (
        <div role="status" aria-live="polite" className="space-y-3">
          <span className="sr-only">Loading reviews…</span>
          {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-20" aria-hidden="true" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={MessageSquareOff}
          title="No reviews yet"
          description="Reviews buyers leave after a completed order will show up here."
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewListItem key={review.id} review={review} />
          ))}
        </div>
      )}
    </section>
  )
}
