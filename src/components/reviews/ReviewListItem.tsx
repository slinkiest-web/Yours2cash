import React from "react"
import { Avatar } from "../ui/Avatar"
import { Card } from "../ui/Card"
import { getAvatarPublicUrl } from "../../lib/queries/profiles"
import { formatRelativeTime } from "../../utils/formatters"
import { StarRating } from "./StarRating"
import type { ReviewWithReviewer } from "../../types/database"

export const ReviewListItem: React.FC<{ review: ReviewWithReviewer }> = ({ review }) => (
  <Card className="p-4 space-y-2">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Avatar
          name={review.profiles.display_name}
          src={getAvatarPublicUrl(review.profiles.avatar_url)}
          size="sm"
        />
        <span className="font-semibold text-text text-sm">{review.profiles.display_name}</span>
      </div>
      <span className="text-xs text-text-muted shrink-0">{formatRelativeTime(review.created_at)}</span>
    </div>
    <StarRating rating={review.rating} />
    {review.comment && <p className="text-sm text-text-muted">{review.comment}</p>}
  </Card>
)
