import React from "react"
import { Link } from "react-router-dom"
import { MapPin } from "lucide-react"
import { Card } from "../ui/Card"
import { Badge } from "../ui/Badge"
import { formatNaira } from "../../utils/formatters"
import { formatCondition } from "../../utils/listingOptions"
import { getListingImagePublicUrl } from "../../lib/queries/listings"
import type { ListingWithImages } from "../../types/database"

export const ListingCard: React.FC<{ listing: ListingWithImages }> = ({ listing }) => {
  const primaryImage = [...listing.listing_images].sort((a, b) => a.position - b.position)[0]
  const location = [listing.state, listing.city].filter(Boolean).join(", ")

  return (
    <Link to={`/product/${listing.id}`} className="group block h-full">
      <Card hoverEffect className="flex flex-col h-full">
        <div className="aspect-video bg-border w-full overflow-hidden">
          {primaryImage ? (
            <img
              src={getListingImagePublicUrl(primaryImage.storage_path)}
              alt={listing.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted font-bold text-serif">
              No Photo
            </div>
          )}
        </div>
        <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-bold text-text group-hover:text-primary transition-colors line-clamp-1">
                {listing.title}
              </h3>
              <Badge variant="primary" className="shrink-0">
                {formatCondition(listing.condition)}
              </Badge>
            </div>
            {location && (
              <div className="flex items-center gap-1 text-xs text-text-muted mt-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{location}</span>
              </div>
            )}
          </div>
          <div className="text-lg font-bold text-serif text-primary mt-2">
            {formatNaira(listing.price)}
          </div>
        </div>
      </Card>
    </Link>
  )
}
