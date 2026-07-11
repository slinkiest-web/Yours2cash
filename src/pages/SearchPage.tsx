import React, { useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"
import { Search as SearchIcon, Filter, ShoppingBag } from "lucide-react"
import { Button } from "../components/ui/Button"
import { Select } from "../components/ui/Select"
import { Spinner } from "../components/ui/Spinner"
import { EmptyState } from "../components/ui/EmptyState"
import { ListingCard } from "../components/listings/ListingCard"
import { fetchCategories, searchListings, type ListingFilters } from "../lib/queries"
import { CONDITION_OPTIONS } from "../utils/listingOptions"
import { NIGERIAN_STATES } from "../utils/nigeria"

interface FilterFormValues {
  q: string
  category: string
  state: string
  condition: string
  minPrice: string
  maxPrice: string
  sort: "newest" | "price_asc" | "price_desc"
}

const paramsToFormValues = (params: URLSearchParams): FilterFormValues => ({
  q: params.get("q") ?? "",
  category: params.get("category") ?? "",
  state: params.get("state") ?? "",
  condition: params.get("condition") ?? "",
  minPrice: params.get("minPrice") ?? "",
  maxPrice: params.get("maxPrice") ?? "",
  sort: (params.get("sort") as FilterFormValues["sort"]) || "newest",
})

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: fetchCategories })
  const categories = useMemo(() => categoriesQuery.data?.data ?? [], [categoriesQuery.data])

  const { register, handleSubmit, reset } = useForm<FilterFormValues>({
    defaultValues: paramsToFormValues(searchParams),
  })

  useEffect(() => {
    reset(paramsToFormValues(searchParams))
  }, [searchParams, reset])

  const filters: ListingFilters = useMemo(() => {
    const categorySlug = searchParams.get("category") ?? ""
    const category = categories.find((c) => c.slug === categorySlug)
    const minPrice = searchParams.get("minPrice")
    const maxPrice = searchParams.get("maxPrice")

    return {
      query: searchParams.get("q") || undefined,
      categoryId: category?.id,
      state: searchParams.get("state") || undefined,
      condition: searchParams.get("condition") || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort: (searchParams.get("sort") as ListingFilters["sort"]) || "newest",
    }
  }, [searchParams, categories])

  const resultsQuery = useQuery({
    queryKey: ["listings", "search", filters],
    queryFn: () => searchListings(filters),
    enabled: !categoriesQuery.isLoading,
  })
  const results = resultsQuery.data?.data ?? []

  const onApply = (values: FilterFormValues) => {
    const next = new URLSearchParams()
    if (values.q) next.set("q", values.q)
    if (values.category) next.set("category", values.category)
    if (values.state) next.set("state", values.state)
    if (values.condition) next.set("condition", values.condition)
    if (values.minPrice) next.set("minPrice", values.minPrice)
    if (values.maxPrice) next.set("maxPrice", values.maxPrice)
    if (values.sort && values.sort !== "newest") next.set("sort", values.sort)
    setSearchParams(next)
  }

  return (
    <form onSubmit={handleSubmit(onApply)} className="grid grid-cols-1 md:grid-cols-4 gap-8">
      <div className="md:col-span-1 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-xl font-bold text-serif text-text flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" /> Filters
          </h2>
        </div>
        <div className="space-y-4">
          <Select
            label="Category"
            placeholder="All Categories"
            options={categories.map((c) => ({ value: c.slug, label: c.name }))}
            {...register("category")}
          />
          <Select
            label="State"
            placeholder="All Nigeria"
            options={NIGERIAN_STATES.map((s) => ({ value: s, label: s }))}
            {...register("state")}
          />
          <Select
            label="Condition"
            placeholder="Any Condition"
            options={CONDITION_OPTIONS}
            {...register("condition")}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium text-text">Price range (NGN)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="Min"
                className="w-full px-3 py-2 bg-surface text-text border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                {...register("minPrice")}
              />
              <span className="text-text-muted">–</span>
              <input
                type="number"
                min={0}
                placeholder="Max"
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
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
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

        {resultsQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
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
          />
        )}
      </div>
    </form>
  )
}
