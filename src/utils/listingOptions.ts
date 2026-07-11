import type { ListingCondition } from "../types/database"

export const CONDITION_OPTIONS: { value: ListingCondition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
]

export function formatCondition(condition: string): string {
  return CONDITION_OPTIONS.find((option) => option.value === condition)?.label ?? condition
}

export const MAX_LISTING_PHOTOS = 6
