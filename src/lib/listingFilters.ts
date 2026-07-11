/**
 * Pure mapping between the URL query string and listing filter state.
 *
 * Kept framework-free (no React Router import) so it can be unit tested in
 * isolation and reused by both the URL-syncing hook and the Supabase query
 * builder input.
 */
import type { ListingFilters } from "./queries/listings"

export type ListingSort = "newest" | "price_asc" | "price_desc"

export interface ListingFilterState {
  q: string
  category: string
  state: string
  city: string
  condition: string
  minPrice: string
  maxPrice: string
  sort: ListingSort
}

export const DEFAULT_LISTING_FILTERS: ListingFilterState = {
  q: "",
  category: "",
  state: "",
  city: "",
  condition: "",
  minPrice: "",
  maxPrice: "",
  sort: "newest",
}

const VALID_SORTS: ListingSort[] = ["newest", "price_asc", "price_desc"]

/** Parse a URL query string into filter form state, defaulting missing/invalid fields. */
export function parseListingFilters(params: URLSearchParams): ListingFilterState {
  const sortParam = params.get("sort")
  const sort = VALID_SORTS.includes(sortParam as ListingSort)
    ? (sortParam as ListingSort)
    : DEFAULT_LISTING_FILTERS.sort

  return {
    q: params.get("q") ?? "",
    category: params.get("category") ?? "",
    state: params.get("state") ?? "",
    city: params.get("city") ?? "",
    condition: params.get("condition") ?? "",
    minPrice: params.get("minPrice") ?? "",
    maxPrice: params.get("maxPrice") ?? "",
    sort,
  }
}

/** Serialize filter form state back into a URL query string, omitting empty/default fields. */
export function listingFiltersToParams(filters: ListingFilterState): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q) params.set("q", filters.q)
  if (filters.category) params.set("category", filters.category)
  if (filters.state) params.set("state", filters.state)
  if (filters.city) params.set("city", filters.city)
  if (filters.condition) params.set("condition", filters.condition)
  if (filters.minPrice) params.set("minPrice", filters.minPrice)
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice)
  if (filters.sort && filters.sort !== DEFAULT_LISTING_FILTERS.sort) params.set("sort", filters.sort)
  return params
}

/**
 * Convert filter form state into the shape the Supabase query builder expects.
 * `categoryId` is resolved by the caller (category slug -> id requires the
 * categories list, which this pure module intentionally has no access to).
 */
export function listingFilterStateToQuery(
  filters: ListingFilterState,
  categoryId: string | undefined
): ListingFilters {
  const minPrice = filters.minPrice ? Number(filters.minPrice) : undefined
  const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : undefined

  return {
    query: filters.q || undefined,
    categoryId,
    state: filters.state || undefined,
    city: filters.city || undefined,
    condition: filters.condition || undefined,
    minPrice: minPrice !== undefined && !Number.isNaN(minPrice) ? minPrice : undefined,
    maxPrice: maxPrice !== undefined && !Number.isNaN(maxPrice) ? maxPrice : undefined,
    sort: filters.sort,
  }
}
