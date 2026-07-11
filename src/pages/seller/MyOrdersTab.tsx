import React, { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ShoppingBag } from "lucide-react"
import { Avatar } from "../../components/ui/Avatar"
import { Badge } from "../../components/ui/Badge"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { EmptyState } from "../../components/ui/EmptyState"
import { Skeleton } from "../../components/ui/Skeleton"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import { confirmOrder, deliverOrder, fetchSellerOrders, shipOrder } from "../../lib/queries/orders"
import { getListingImagePublicUrl } from "../../lib/queries/listings"
import { getAvatarPublicUrl } from "../../lib/queries/profiles"
import { getSellerAdvanceAction } from "../../lib/orderStateMachine"
import { formatNaira } from "../../utils/formatters"
import { ORDER_STATUS_BADGE_VARIANT, ORDER_STATUS_LABELS } from "../../utils/orderStatus"
import type { OrderStatus, OrderWithDetails } from "../../types/database"

const ORDERS_SKELETON_COUNT = 3

export const MyOrdersTab: React.FC = () => {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [advancingOrderId, setAdvancingOrderId] = useState<string | null>(null)

  const ordersQuery = useQuery({
    queryKey: ["orders", "seller", user?.id],
    queryFn: () => fetchSellerOrders(user!.id),
    enabled: !!user,
  })
  const orders = ordersQuery.data?.data ?? []

  const handleAdvance = async (order: OrderWithDetails, targetStatus: OrderStatus) => {
    setAdvancingOrderId(order.id)
    const result =
      targetStatus === "confirmed"
        ? await confirmOrder(order.id)
        : targetStatus === "shipped"
          ? await shipOrder(order.id)
          : // Sellers can always read their own listing under RLS regardless
            // of its status, so this is never null for a seller's own orders.
            await deliverOrder(order.id, order.listing!.id)
    setAdvancingOrderId(null)

    if (result.error) {
      showToast(result.error, "error")
      return
    }
    showToast(`Order marked ${ORDER_STATUS_LABELS[targetStatus].toLowerCase()}.`, "success")
    queryClient.invalidateQueries({ queryKey: ["orders", "seller", user?.id] })
    queryClient.invalidateQueries({ queryKey: ["order", order.id] })
    if (targetStatus === "delivered") {
      queryClient.invalidateQueries({ queryKey: ["listings"] })
    }
  }

  return (
    <div className="space-y-6 pt-6">
      {ordersQuery.isLoading ? (
        <div role="status" aria-live="polite" className="space-y-4">
          <span className="sr-only">Loading your orders…</span>
          {Array.from({ length: ORDERS_SKELETON_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-20" aria-hidden="true" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="When a buyer purchases one of your listings, it shows up here for you to fulfil."
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const action = getSellerAdvanceAction(order.status)
            // Sellers can always read their own listing under RLS regardless
            // of its status, so this is never null for a seller's own orders
            // (unlike the buyer-facing pages, which do handle a null listing).
            const listing = order.listing!
            const primaryImage = [...listing.listing_images].sort(
              (a, b) => a.position - b.position
            )[0]

            return (
              <Card key={order.id} className="p-4 flex flex-wrap items-center gap-4">
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
                  <div className="flex items-center gap-1.5 text-xs text-text-muted mt-1">
                    <Avatar
                      name={order.buyer.display_name}
                      src={getAvatarPublicUrl(order.buyer.avatar_url)}
                      size="sm"
                      className="w-4 h-4 text-[10px]"
                    />
                    {order.buyer.display_name}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <Badge variant={ORDER_STATUS_BADGE_VARIANT[order.status]}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                  <div className="text-sm font-bold text-serif text-primary mt-1">
                    {formatNaira(order.amount)}
                  </div>
                </div>

                {action && (
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={advancingOrderId === order.id}
                    onClick={() => handleAdvance(order, action.status)}
                  >
                    {action.label}
                  </Button>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
