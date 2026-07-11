import React from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { MapPin, MessageSquareOff, Package, User as UserIcon } from "lucide-react"
import { Avatar } from "../../components/ui/Avatar"
import { Card } from "../../components/ui/Card"
import { EmptyState } from "../../components/ui/EmptyState"
import { Skeleton } from "../../components/ui/Skeleton"
import { Spinner } from "../../components/ui/Spinner"
import { ListingCard } from "../../components/listings/ListingCard"
import { ListingCardSkeleton } from "../../components/listings/ListingCardSkeleton"
import { ReviewListItem } from "../../components/reviews/ReviewListItem"
import { RatingSummary } from "../../components/profiles/RatingSummary"
import { fetchActiveListingsBySeller } from "../../lib/queries/listings"
import { fetchProfile, getAvatarPublicUrl } from "../../lib/queries/profiles"
import { fetchReviewsForSeller } from "../../lib/queries/reviews"

const LISTINGS_SKELETON_COUNT = 3
const REVIEWS_SKELETON_COUNT = 2

export const PublicProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  const profileQuery = useQuery({
    queryKey: ["profile", id],
    queryFn: () => fetchProfile(id!),
    enabled: !!id,
  })
  const listingsQuery = useQuery({
    queryKey: ["listings", "activeBySeller", id],
    queryFn: () => fetchActiveListingsBySeller(id!),
    enabled: !!id,
  })
  const reviewsQuery = useQuery({
    queryKey: ["reviews", "seller", id],
    queryFn: () => fetchReviewsForSeller(id!),
    enabled: !!id,
  })

  if (profileQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  const profile = profileQuery.data?.data

  if (!profile) {
    return (
      <div className="py-12">
        <EmptyState
          icon={UserIcon}
          title="Profile not found"
          description="This user does not exist, or the link is incorrect."
        />
      </div>
    )
  }

  const location = [profile.state, profile.city].filter(Boolean).join(", ")
  const listings = listingsQuery.data?.data ?? []
  const reviews = reviewsQuery.data?.data ?? []

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Card className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
        <Avatar
          name={profile.display_name}
          src={getAvatarPublicUrl(profile.avatar_url)}
          size="lg"
          className="w-20 h-20 text-2xl"
        />
        <div className="space-y-2 flex-1">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-serif text-text">{profile.display_name}</h1>
              {location && (
                <span className="text-sm text-text-muted flex items-center gap-1 justify-center md:justify-start mt-1">
                  <MapPin className="w-4 h-4" aria-hidden="true" /> {location}
                </span>
              )}
            </div>
            <RatingSummary avgRating={profile.avg_rating} reviewCount={profile.review_count} />
          </div>
          {profile.bio && <p className="text-text-muted text-sm">{profile.bio}</p>}
        </div>
      </Card>

      <section className="space-y-6">
        <h2 className="text-xl font-bold text-serif text-text">Active Listings</h2>
        {listingsQuery.isLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          >
            <span className="sr-only">Loading listings…</span>
            {Array.from({ length: LISTINGS_SKELETON_COUNT }).map((_, index) => (
              <ListingCardSkeleton key={index} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No active listings"
            description={`${profile.display_name} does not have any active listings right now.`}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-bold text-serif text-text">
          Reviews {reviews.length > 0 && `(${reviews.length})`}
        </h2>
        {reviewsQuery.isLoading ? (
          <div role="status" aria-live="polite" className="space-y-3">
            <span className="sr-only">Loading reviews…</span>
            {Array.from({ length: REVIEWS_SKELETON_COUNT }).map((_, index) => (
              <Skeleton key={index} className="h-20" aria-hidden="true" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={MessageSquareOff}
            title="No reviews yet"
            description={`${profile.display_name} has not received any reviews yet.`}
          />
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <ReviewListItem key={review.id} review={review} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
