import React, { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, ShoppingBag, Star, X } from "lucide-react"
import { Avatar } from "../../components/ui/Avatar"
import { Badge } from "../../components/ui/Badge"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { EmptyState } from "../../components/ui/EmptyState"
import { Modal } from "../../components/ui/Modal"
import { Spinner } from "../../components/ui/Spinner"
import { Textarea } from "../../components/ui/Textarea"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import { cancelOrder, fetchOrderById } from "../../lib/queries/orders"
import { createReview, fetchReviewByOrder } from "../../lib/queries/reviews"
import { getListingImagePublicUrl } from "../../lib/queries/listings"
import { getAvatarPublicUrl } from "../../lib/queries/profiles"
import { canTransitionOrder, ORDER_STATUS_SEQUENCE, resolveActorRole } from "../../lib/orderStateMachine"
import { reviewSchema, type ReviewFormValues } from "../../lib/validation/review"
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
  const canReview = role === "buyer" && order.status === "delivered" && !existingReview

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
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-text">Your review</p>
            <span
              className="flex items-center gap-0.5 text-primary"
              aria-label={`${existingReview.rating} out of 5 stars`}
            >
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  aria-hidden="true"
                  className={`w-3.5 h-3.5 ${index < existingReview.rating ? "fill-current" : ""}`}
                />
              ))}
            </span>
          </div>
          {existingReview.comment && (
            <p className="text-sm text-text-muted">{existingReview.comment}</p>
          )}
        </Card>
      )}

      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onSubmitted={() => queryClient.invalidateQueries({ queryKey: ["review", id] })}
        orderId={order.id}
        sellerId={order.seller_id}
        buyerId={user.id}
      />
    </div>
  )
}

interface ReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmitted: () => void
  orderId: string
  sellerId: string
  buyerId: string
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  onSubmitted,
  orderId,
  sellerId,
  buyerId,
}) => {
  const { showToast } = useToast()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, comment: "" },
  })
  const rating = watch("rating")

  const onSubmit = async (values: ReviewFormValues) => {
    const { error } = await createReview(orderId, buyerId, sellerId, values.rating, values.comment || undefined)
    if (error) {
      showToast(error, "error")
      return
    }
    showToast("Review submitted. Thank you!", "success")
    reset()
    onSubmitted()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rate the Seller">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <span className="text-sm font-medium text-text">Rating</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                aria-pressed={rating === value}
                onClick={() => setValue("rating", value, { shouldValidate: true })}
                className="p-1"
              >
                <Star
                  className={`w-6 h-6 ${value <= rating ? "fill-current text-primary" : "text-border"}`}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
          {errors.rating && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400 font-medium">
              {errors.rating.message}
            </p>
          )}
        </div>

        <Textarea
          label="Comment (optional)"
          placeholder="Share details about your experience with this seller"
          rows={3}
          error={errors.comment?.message}
          {...register("comment")}
        />

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Submit Review
          </Button>
        </div>
      </form>
    </Modal>
  )
}
