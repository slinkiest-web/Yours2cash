import React, { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Package, Pencil, PlusCircle, Trash2 } from "lucide-react"
import { Badge } from "../../components/ui/Badge"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { EmptyState } from "../../components/ui/EmptyState"
import { Skeleton } from "../../components/ui/Skeleton"
import { DeleteListingModal } from "../../components/listings/DeleteListingModal"
import { useAuth } from "../../context/AuthContext"
import { fetchListingsBySeller, getListingImagePublicUrl } from "../../lib/queries/listings"
import { formatNaira } from "../../utils/formatters"
import { LISTING_STATUS_BADGE_VARIANT, LISTING_STATUS_LABELS } from "../../utils/listingStatus"
import type { ListingWithImages } from "../../types/database"

const LISTINGS_SKELETON_COUNT = 3

export const MyListingsTab: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<ListingWithImages | null>(null)

  const listingsQuery = useQuery({
    queryKey: ["listings", "seller", user?.id],
    queryFn: () => fetchListingsBySeller(user!.id),
    enabled: !!user,
  })
  const listings = listingsQuery.data?.data ?? []

  return (
    <div className="space-y-6 pt-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-text-muted">
          {listings.length} listing{listings.length === 1 ? "" : "s"}
        </p>
        <Link to="/sell">
          <Button variant="primary" size="sm" className="flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4" /> List New Item
          </Button>
        </Link>
      </div>

      {listingsQuery.isLoading ? (
        <div role="status" aria-live="polite" className="space-y-4">
          <span className="sr-only">Loading your listings…</span>
          {Array.from({ length: LISTINGS_SKELETON_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-20" aria-hidden="true" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No listings yet"
          description="Create your first listing to start reaching buyers across Nigeria."
          actionLabel="Create Your First Listing"
          onAction={() => {
            window.location.href = "/sell"
          }}
        />
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => {
            const primaryImage = [...listing.listing_images].sort((a, b) => a.position - b.position)[0]

            return (
              <Card key={listing.id} className="p-4 flex flex-wrap items-center gap-4">
                <Link
                  to={`/product/${listing.id}`}
                  className="w-14 h-14 rounded-lg overflow-hidden bg-border shrink-0"
                >
                  {primaryImage ? (
                    <img
                      src={getListingImagePublicUrl(primaryImage.storage_path)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </Link>
                <div className="flex-1 min-w-[10rem]">
                  <Link
                    to={`/product/${listing.id}`}
                    className="font-bold text-text hover:text-primary transition-colors block truncate"
                  >
                    {listing.title}
                  </Link>
                  <span className="text-sm text-text-muted">{formatNaira(listing.price)}</span>
                </div>
                <Badge variant={LISTING_STATUS_BADGE_VARIANT[listing.status]}>
                  {LISTING_STATUS_LABELS[listing.status]}
                </Badge>
                <div className="flex gap-2 shrink-0">
                  <Link to={`/sell/${listing.id}`}>
                    <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex items-center gap-1.5"
                    onClick={() => setDeleteTarget(listing)}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {deleteTarget && (
        <DeleteListingModal
          isOpen
          onClose={() => setDeleteTarget(null)}
          listingId={deleteTarget.id}
          listingTitle={deleteTarget.title}
          onDeleted={() => {
            setDeleteTarget(null)
            queryClient.invalidateQueries({ queryKey: ["listings", "seller", user?.id] })
          }}
        />
      )}
    </div>
  )
}
