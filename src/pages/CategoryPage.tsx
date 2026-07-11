import React from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ShoppingBag } from "lucide-react"
import { Spinner } from "../components/ui/Spinner"
import { EmptyState } from "../components/ui/EmptyState"
import { ListingCard } from "../components/listings/ListingCard"
import { fetchCategories, fetchListingsByCategory } from "../lib/queries"

export const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: fetchCategories })
  const category = categoriesQuery.data?.data?.find((c) => c.slug === slug)

  const listingsQuery = useQuery({
    queryKey: ["listings", "category", category?.id],
    queryFn: () => fetchListingsByCategory(category!.id),
    enabled: !!category,
  })
  const listings = listingsQuery.data?.data ?? []

  const title = category?.name ?? (categoriesQuery.isLoading ? "Loading…" : "Category not found")

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-3xl font-extrabold text-serif text-text">{title}</h1>
        {category && (
          <p className="text-text-muted text-sm mt-1">
            Showing all active listings under {category.name} in Nigeria.
          </p>
        )}
      </div>

      {categoriesQuery.isLoading || listingsQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : !category ? (
        <EmptyState
          icon={ShoppingBag}
          title="Category not found"
          description="That category does not exist. Try browsing from the categories row on the home page."
        />
      ) : listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ShoppingBag}
          title={`No active listings in ${category.name}`}
          description="Be the first person to publish a listing in this category, upload photos and reach buyers now."
          actionLabel="List an Item"
          onAction={() => {
            window.location.href = "/sell"
          }}
        />
      )}
    </div>
  )
}
