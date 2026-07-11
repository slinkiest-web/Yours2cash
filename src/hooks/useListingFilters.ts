import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import {
  listingFiltersToParams,
  parseListingFilters,
  type ListingFilterState,
} from "../lib/listingFilters"

export function useListingFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(() => parseListingFilters(searchParams), [searchParams])

  const applyFilters = (next: ListingFilterState) => {
    setSearchParams(listingFiltersToParams(next))
  }

  return { filters, applyFilters }
}
