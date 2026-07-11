import React, { useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { MapPin, MessageSquare, Pencil, ShoppingBag, Star, Trash2 } from "lucide-react"
import { Button } from "../../components/ui/Button"
import { Badge } from "../../components/ui/Badge"
import { Avatar } from "../../components/ui/Avatar"
import { Spinner } from "../../components/ui/Spinner"
import { EmptyState } from "../../components/ui/EmptyState"
import { Modal } from "../../components/ui/Modal"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import { deleteListing, fetchListingById, getListingImagePublicUrl } from "../../lib/queries/listings"
import { upsertConversation } from "../../lib/queries/chat"
import { createOrder, fetchOpenOrderForListing } from "../../lib/queries/orders"
import { getAvatarPublicUrl } from "../../lib/queries/profiles"
import { formatNaira, formatRelativeTime } from "../../utils/formatters"
import { formatCondition } from "../../utils/listingOptions"

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const queryClient = useQueryClient()
  const [activeImage, setActiveImage] = useState(0)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isStartingChat, setIsStartingChat] = useState(false)
  const [isBuying, setIsBuying] = useState(false)

  const listingQuery = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListingById(id!),
    enabled: !!id,
  })
  const listing = listingQuery.data?.data

  const handleDelete = async () => {
    setIsDeleting(true)
    const { error } = await deleteListing(id!)
    setIsDeleting(false)
    if (error) {
      showToast(error, "error")
      return
    }
    showToast("Listing removed.", "success")
    queryClient.invalidateQueries({ queryKey: ["listings"] })
    navigate("/dashboard")
  }

  const handleMessageSeller = async () => {
    if (!listing) return
    if (!user) {
      navigate("/auth/login", { state: { from: routerLocation } })
      return
    }
    setIsStartingChat(true)
    const { data, error } = await upsertConversation(listing.id, user.id, listing.seller_id)
    setIsStartingChat(false)
    if (error || !data) {
      showToast(error ?? "Could not start the conversation.", "error")
      return
    }
    navigate(`/chat/${data.id}`)
  }

  const handleBuyNow = async () => {
    if (!listing) return
    if (!user) {
      navigate("/auth/login", { state: { from: routerLocation } })
      return
    }
    setIsBuying(true)

    const { data: existingOrder } = await fetchOpenOrderForListing(listing.id, user.id)
    if (existingOrder) {
      setIsBuying(false)
      showToast("You already have an order in progress for this listing.", "info")
      navigate(`/orders/${existingOrder.id}`)
      return
    }

    const { data, error } = await createOrder(listing.id, user.id, listing.seller_id, listing.price)
    setIsBuying(false)
    if (error || !data) {
      showToast(error ?? "Could not place order.", "error")
      return
    }
    showToast("Order placed.", "success")
    navigate(`/orders/${data.id}`)
  }

  if (listingQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="py-12">
        <EmptyState
          icon={ShoppingBag}
          title="Listing not found"
          description="This listing may have been removed, sold, or the link is incorrect."
          actionLabel="Browse Listings"
          onAction={() => navigate("/search")}
        />
      </div>
    )
  }

  const images = [...listing.listing_images].sort((a, b) => a.position - b.position)
  const location = [listing.state, listing.city].filter(Boolean).join(", ")
  const isOwner = user?.id === listing.seller_id
  const isPurchasable = listing.status === "active" && !isOwner

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <div className="aspect-square bg-surface-raised border border-border rounded-card overflow-hidden shadow-soft">
            {images.length > 0 ? (
              <img
                src={getListingImagePublicUrl(images[activeImage]?.storage_path ?? images[0].storage_path)}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted font-bold text-serif">
                No Photos
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setActiveImage(index)}
                  aria-label={`Show photo ${index + 1}`}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    index === activeImage ? "border-primary" : "border-border"
                  }`}
                >
                  <img
                    src={getListingImagePublicUrl(image.storage_path)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="primary">{formatCondition(listing.condition)}</Badge>
                {listing.status !== "active" && (
                  <Badge variant="secondary">{listing.status}</Badge>
                )}
              </div>
              {location && (
                <div className="flex items-center gap-1 text-sm text-text-muted">
                  <MapPin className="w-4 h-4" />
                  <span>{location}</span>
                </div>
              )}
            </div>
            <h1 className="text-3xl font-bold text-serif text-text">{listing.title}</h1>
            <div className="text-3xl font-bold text-serif text-primary">{formatNaira(listing.price)}</div>
            <p className="text-text-muted leading-relaxed whitespace-pre-line">{listing.description}</p>
            <p className="text-xs text-text-muted">Posted {formatRelativeTime(listing.created_at)}</p>
          </div>

          <div className="space-y-4 border-t border-border pt-6">
            <Link to={`/profile/${listing.profiles.id}`} className="flex items-center gap-3 group w-fit">
              <Avatar
                name={listing.profiles.display_name}
                src={getAvatarPublicUrl(listing.profiles.avatar_url)}
              />
              <div>
                <div className="font-bold text-text group-hover:text-primary transition-colors">
                  {listing.profiles.display_name}
                </div>
                <div className="text-xs text-text-muted flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-current text-primary" />
                  {listing.profiles.avg_rating.toFixed(1)} ({listing.profiles.review_count} reviews)
                </div>
              </div>
            </Link>

            {isOwner ? (
              <div className="flex gap-4">
                <Link to={`/sell/${listing.id}`} className="flex-1">
                  <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
                    <Pencil className="w-4 h-4" /> Edit
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  className="flex-1 flex items-center justify-center gap-2"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              </div>
            ) : isPurchasable ? (
              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  className="flex-1 flex items-center justify-center gap-2"
                  isLoading={isStartingChat}
                  onClick={handleMessageSeller}
                >
                  <MessageSquare className="w-5 h-5" /> Message Seller
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 flex items-center justify-center gap-2"
                  isLoading={isBuying}
                  onClick={handleBuyNow}
                >
                  Buy Now
                </Button>
              </div>
            ) : (
              <p className="text-sm text-text-muted">
                This listing is no longer available for purchase.
              </p>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete this listing?">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            This removes "{listing.title}" from Yours2Cash. Buyers will no longer be able to find or
            message you about it. This cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" isLoading={isDeleting} onClick={handleDelete}>
              Delete Listing
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
