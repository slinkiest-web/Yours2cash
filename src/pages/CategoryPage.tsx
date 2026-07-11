import React from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ShoppingBag } from "lucide-react"
import { Spinner } from "../components/ui/Spinner"
import { EmptyState } from "../components/ui/EmptyState"
import { ListingBrowser } from "../components/listings/ListingBrowser"
import { fetchCategories } from "../lib/queries"

export const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: fetchCategories })
  const category = categoriesQuery.data?.data?.find((c) => c.slug === slug)
  const title = category?.name ?? (categoriesQuery.isLoading ? "Loading…" : "Category not found")

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-3xl font-extrabold text-serif text-text">{title}</h1>
        {category && (
          <p className="text-text-muted text-sm mt-1">
            Showing listings under {category.name} in Nigeria. Use the filters to narrow your search.
          </p>
        )}
      </div>

      {categoriesQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : !category ? (
        <EmptyState
          icon={ShoppingBag}
          title="Category not found"
          description="That category does not exist. Try browsing from the categories row on the home page."
        />
      ) : (
        <ListingBrowser lockedCategory={category} />
      )}
    </div>
  )
}
