import React, { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Pencil, ShoppingBag, Star, X } from "lucide-react"
import { Avatar } from "../../components/ui/Avatar"
import { Badge } from "../../components/ui/Badge"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { EmptyState } from "../../components/ui/EmptyState"
import { Spinner } from "../../components/ui/Spinner"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import { cancelOrder, fetchOrderById } from "../../lib/queries/orders"
import { fetchReviewByOrder } from "../../lib/queries/reviews"
import { getListingImagePublicUrl } from "../../lib/queries/listings"
import { getAvatarPublicUrl } from "../../lib/queries/profiles"
import { canTransitionOrder, ORDER_STATUS_SEQUENCE, resolveActorRole } from "../../lib/orderStateMachine"
import { canEditReview, canLeaveReview } from "../../lib/reviewRules"
import { ReviewModal } from "../../components/reviews/ReviewModal"
import { StarRating } from "../../components/reviews/StarRating"
import { formatNaira, formatRelativeTime } from "../../utils/formatters"
import { ORDER_STATUS_BADGE_VARIANT, ORDER_STATUS_LABELS } from "../../utils/orderStatus"

export const OrderTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isCancelling, setIsCancelling] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)

  const orderQuery = useQuery({
    queryKey: ["order", id],
    queryFn: () => fetchOrderById(id!),
    enabled: !!id,
  })
  const order = orderQuery.data?.data

  const reviewQuery = useQuery({
    queryKey: ["review", id],
    queryFn: () => fetchReviewByOrder(id!),
    enabled: !!id && order?.status === "delivered",
  })
  const existingReview = reviewQuery.data?.data

  const role = order && user ? resolveActorRole(order, user.id) : null

  const handleCancel = async () => {
    if (!order) return
    setIsCancelling(true)
    const { error } = await cancelOrder(order.id)
    setIsCancelling(false)
    if (error) {
      showToast(error, "error")
      return
    }
    showToast("Order cancelled.", "success")
    queryClient.invalidateQueries({ queryKey: ["order", id] })
    queryClient.invalidateQueries({ queryKey: ["orders"] })
  }

  if (orderQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!order || !user) {
    return (
      <div className="py-12">
        <EmptyState
          icon={ShoppingBag}
          title="Order not found"
          description="This order does not exist, or you do not have access to it."
          actionLabel="Go to Orders"
          onAction={() => navigate("/orders")}
        />
      </div>
    )
  }

  const otherParty = role === "seller" ? order.buyer : order.seller
  const primaryImage = order.listing
    ? [...order.listing.listing_images].sort((a, b) => a.position - b.position)[0]
    : undefined
  const eventTimestamps = new Map(order.order_events.map((event) => [event.status, event.created_at]))
  const isCancelled = order.status === "cancelled"
  const currentIndex = ORDER_STATUS_SEQUENCE.indexOf(
    order.status as (typeof ORDER_STATUS_SEQUENCE)[number]
  )
  const canCancel = role === "buyer" && canTransitionOrder(order.status, "cancelled", "buyer")
  const canReview = canLeaveReview(order.status, role, !!existingReview)
  const canEdit = canEditReview(order.status, role, !!existingReview)

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="border-b border-border pb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-serif text-text">Order Tracking</h1>
          <p className="text-text-muted text-sm mt-1">Placed {formatRelativeTime(order.created_at)}</p>
        </div>
        <Badge variant={ORDER_STATUS_BADGE_VARIANT[order.status]}>
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
      </div>

      <Card className="p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-border shrink-0">
          {primaryImage ? (
            <img
              src={getListingImagePublicUrl(primaryImage.storage_path)}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          {order.listing ? (
            <Link
              to={`/product/${order.listing.id}`}
              className="font-bold text-text hover:text-primary transition-colors"
            >
              {order.listing.title}
            </Link>
          ) : (
            <p className="font-bold text-text">Listing no longer available</p>
          )}
          <p className="text-xs text-text-muted">Order #{order.id.slice(0, 8)}</p>
        </div>
        <div className="text-lg font-bold text-serif text-primary shrink-0">
          {formatNaira(order.amount)}
        </div>
      </Card>

      <Card className="p-5 flex items-center gap-3">
        <Avatar name={otherParty.display_name} src={getAvatarPublicUrl(otherParty.avatar_url)} />
        <div>
          <p className="text-xs text-text-muted">{role === "seller" ? "Buyer" : "Seller"}</p>
          <p className="font-semibold text-text">{otherParty.display_name}</p>
        </div>
      </Card>

      <Card className="p-6">
        {isCancelled ? (
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 shrink-0">
              <X className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-bold text-text">Order Cancelled</p>
              {eventTimestamps.get("cancelled") && (
                <p className="text-xs text-text-muted">
                  {formatRelativeTime(eventTimestamps.get("cancelled")!)}
                </p>
              )}
            </div>
          </div>
        ) : (
          <ol className="space-y-6">
            {ORDER_STATUS_SEQUENCE.map((step, index) => {
              const done = index <= currentIndex
              const isCurrent = index === currentIndex
              const timestamp = eventTimestamps.get(step)
              return (
                <li key={step} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      done
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border text-text-muted"
                    }`}
                  >
                    {done ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-current" />
                    )}
                  </span>
                  <div>
                    <p
                      className={`font-semibold ${
                        isCurrent ? "text-primary" : done ? "text-text" : "text-text-muted"
                      }`}
                    >
                      {ORDER_STATUS_LABELS[step]}
                    </p>
                    <p className="text-xs text-text-muted">
                      {timestamp ? formatRelativeTime(timestamp) : "Not yet"}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </Card>

      {(canCancel || canReview) && (
        <div className="flex gap-4">
          {canCancel && (
            <Button
              variant="destructive"
              isLoading={isCancelling}
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel Order
            </Button>
          )}
          {canReview && (
            <Button
              variant="primary"
              onClick={() => setIsReviewOpen(true)}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4" /> Leave a Review
            </Button>
          )}
        </div>
      )}

      {existingReview && (
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-text">Your review</p>
              <StarRating rating={existingReview.rating} />
            </div>
            {canEdit && (
              <Button
                variant="secondary"
                onClick={() => setIsReviewOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit
              </Button>
            )}
          </div>
          {existingReview.comment && (
            <p className="text-sm text-text-muted">{existingReview.comment}</p>
          )}
        </Card>
      )}

      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["review", id] })}
        orderId={order.id}
        sellerId={order.seller_id}
        buyerId={user.id}
        existingReview={existingReview}
      />
    </div>
  )
}
