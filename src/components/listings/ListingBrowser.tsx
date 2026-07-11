import React, { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"
import { Search as SearchIcon, Filter, ShoppingBag } from "lucide-react"
import { Button } from "../ui/Button"
import { Input } from "../ui/Input"
import { Select } from "../ui/Select"
import { EmptyState } from "../ui/EmptyState"
import { ListingCard } from "./ListingCard"
import { ListingCardSkeleton } from "./ListingCardSkeleton"
import { useListingFilters } from "../../hooks/useListingFilters"
import { fetchCategories, searchListings } from "../../lib/queries"
import { listingFilterStateToQuery, type ListingFilterState } from "../../lib/listingFilters"
import { CONDITION_OPTIONS } from "../../utils/listingOptions"
import { NIGERIAN_STATES } from "../../utils/nigeria"
import type { Category } from "../../types/database"

export interface ListingBrowserProps {
  /** When set, the category filter is hidden and locked to this category. */
  lockedCategory?: Category
}

const RESULTS_SKELETON_COUNT = 6

export const ListingBrowser: React.FC<ListingBrowserProps> = ({ lockedCategory }) => {
  const { filters, applyFilters } = useListingFilters()

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    enabled: !lockedCategory,
  })
  const categories = useMemo(() => categoriesQuery.data?.data ?? [], [categoriesQuery.data])

  const { register, handleSubmit, reset } = useForm<ListingFilterState>({
    defaultValues: filters,
  })

  useEffect(() => {
    reset(filters)
  }, [filters, reset])

  const categoryId = lockedCategory
    ? lockedCategory.id
    : categories.find((c) => c.slug === filters.category)?.id

  const queryFilters = useMemo(
    () => listingFilterStateToQuery(filters, categoryId),
    [filters, categoryId]
  )

  const resultsQuery = useQuery({
    queryKey: ["listings", "search", queryFilters],
    queryFn: () => searchListings(queryFilters),
    enabled: lockedCategory ? true : !categoriesQuery.isLoading,
  })
  const results = resultsQuery.data?.data ?? []
  const isLoading = lockedCategory ? resultsQuery.isLoading : resultsQuery.isLoading || categoriesQuery.isLoading

  return (
    <form onSubmit={handleSubmit(applyFilters)} className="grid grid-cols-1 md:grid-cols-4 gap-8">
      <div className="md:col-span-1 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-xl font-bold text-serif text-text flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" aria-hidden="true" /> Filters
          </h2>
        </div>
        <div className="space-y-4">
          {!lockedCategory && (
            <Select
              label="Category"
              placeholder="All Categories"
              options={categories.map((c) => ({ value: c.slug, label: c.name }))}
              {...register("category")}
            />
          )}
          <Select
            label="State"
            placeholder="All Nigeria"
            options={NIGERIAN_STATES.map((s) => ({ value: s, label: s }))}
            {...register("state")}
          />
          <Input label="City" placeholder="e.g. Ikeja" {...register("city")} />
          <Select
            label="Condition"
            placeholder="Any Condition"
            options={CONDITION_OPTIONS}
            {...register("condition")}
          />
          <div className="space-y-2">
            <span className="text-sm font-medium text-text">Price range (NGN)</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="Min"
                aria-label="Minimum price in Naira"
                className="w-full px-3 py-2 bg-surface text-text border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                {...register("minPrice")}
              />
              <span className="text-text-muted" aria-hidden="true">
                –
              </span>
              <input
                type="number"
                min={0}
                placeholder="Max"
                aria-label="Maximum price in Naira"
                className="w-full px-3 py-2 bg-surface text-text border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                {...register("maxPrice")}
              />
            </div>
          </div>
          <Select
            label="Sort by"
            options={[
              { value: "newest", label: "Newest" },
              { value: "price_asc", label: "Price: Low to High" },
              { value: "price_desc", label: "Price: High to Low" },
            ]}
            {...register("sort")}
          />
          <Button type="submit" variant="secondary" className="w-full">
            Apply Filters
          </Button>
        </div>
      </div>

      <div className="md:col-span-3 space-y-6">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <label htmlFor="listing-search-input" className="sr-only">
              Search listings by title or description
            </label>
            <SearchIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"
              aria-hidden="true"
            />
            <input
              id="listing-search-input"
              type="text"
              placeholder="Search products, brands, or categories"
              className="w-full pl-10 pr-4 py-2.5 bg-surface text-text border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              {...register("q")}
            />
          </div>
          <Button type="submit" variant="primary">
            Search
          </Button>
        </div>

        {isLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <span className="sr-only">Loading listings…</span>
            {Array.from({ length: RESULTS_SKELETON_COUNT }).map((_, index) => (
              <ListingCardSkeleton key={index} />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ShoppingBag}
            title="No listings match your search"
            description="Try widening your filters or searching a different term."
            actionLabel="List an Item"
            onAction={() => {
              window.location.href = "/sell"
            }}
          />
        )}
      </div>
    </form>
  )
}
