import React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight, ShoppingBag } from "lucide-react"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { Skeleton } from "../components/ui/Skeleton"
import { EmptyState } from "../components/ui/EmptyState"
import { ListingCard } from "../components/listings/ListingCard"
import { ListingCardSkeleton } from "../components/listings/ListingCardSkeleton"
import { fetchCategories, fetchFeaturedListings, fetchRecentListings } from "../lib/queries"

const CATEGORY_SKELETON_COUNT = 9
const RECENT_SKELETON_COUNT = 6

export const HomePage: React.FC = () => {
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  })
  const featuredQuery = useQuery({
    queryKey: ["listings", "featured"],
    queryFn: fetchFeaturedListings,
  })
  const recentQuery = useQuery({
    queryKey: ["listings", "recent"],
    queryFn: () => fetchRecentListings(),
  })

  const categories = categoriesQuery.data?.data ?? []
  const featured = featuredQuery.data?.data ?? []
  const recent = recentQuery.data?.data ?? []

  return (
    <div className="space-y-12">
      <section className="text-center max-w-2xl mx-auto space-y-4 py-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-serif tracking-tight text-text">
          Buy and sell pre owned items in Nigeria
        </h1>
        <p className="text-lg text-text-muted">
          Yours2Cash is the premium recommerce marketplace, browse items, talk to sellers, place mock orders.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link to="/search">
            <Button variant="primary" size="lg">
              Browse Listings
            </Button>
          </Link>
          <Link to="/sell">
            <Button variant="secondary" size="lg">
              List an Item
            </Button>
          </Link>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-2xl font-bold text-serif text-text">Browse Categories</h2>
        </div>
        {categoriesQuery.isLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4"
          >
            <span className="sr-only">Loading categories…</span>
            {Array.from({ length: CATEGORY_SKELETON_COUNT }).map((_, index) => (
              <Skeleton key={index} className="h-[68px] rounded-card" aria-hidden="true" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {categories.map((category) => (
              <Link key={category.id} to={`/category/${category.slug}`} className="group block">
                <Card hoverEffect className="p-6 text-center transition-all duration-300">
                  <span className="font-semibold text-text group-hover:text-primary transition-colors">
                    {category.name}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {featured.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-2xl font-bold text-serif text-text">Featured Deals</h2>
            <Link to="/search" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {featured.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-2xl font-bold text-serif text-text">Recently Added</h2>
          <Link to="/search" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
            See all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {recentQuery.isLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
          >
            <span className="sr-only">Loading recently added listings…</span>
            {Array.from({ length: RECENT_SKELETON_COUNT }).map((_, index) => (
              <ListingCardSkeleton key={index} />
            ))}
          </div>
        ) : recent.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {recent.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ShoppingBag}
            title="No listings yet"
            description="Be the first to publish a listing and reach buyers across Nigeria."
            actionLabel="List an Item"
            onAction={() => {
              window.location.href = "/sell"
            }}
          />
        )}
      </section>
    </div>
  )
}
