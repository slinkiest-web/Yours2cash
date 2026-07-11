import type { ListingStatus } from "../types/database"
import type { BadgeProps } from "../components/ui/Badge"

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  active: "Active",
  sold: "Sold",
  removed: "Removed",
}

export const LISTING_STATUS_BADGE_VARIANT: Record<ListingStatus, NonNullable<BadgeProps["variant"]>> = {
  active: "success",
  sold: "info",
  removed: "secondary",
}
