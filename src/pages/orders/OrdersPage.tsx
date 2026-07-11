import React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ShoppingBag } from "lucide-react"
import { Card } from "../../components/ui/Card"
import { Badge } from "../../components/ui/Badge"
import { Skeleton } from "../../components/ui/Skeleton"
import { Spinner } from "../../components/ui/Spinner"
import { EmptyState } from "../../components/ui/EmptyState"
import { useAuth } from "../../context/AuthContext"
import { fetchBuyerOrders } from "../../lib/queries/orders"
import { getListingImagePublicUrl } from "../../lib/queries/listings"
import { formatNaira, formatRelativeTime } from "../../utils/formatters"
import { ORDER_STATUS_BADGE_VARIANT, ORDER_STATUS_LABELS } from "../../utils/orderStatus"

const ORDERS_SKELETON_COUNT = 3

export const OrdersPage: React.FC = () => {
  const { user } = useAuth()

  const ordersQuery = useQuery({
    queryKey: ["orders", "buyer", user?.id],
    queryFn: () => fetchBuyerOrders(user!.id),
    enabled: !!user,
  })

  if (!user) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  const orders = ordersQuery.data?.data ?? []

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-serif text-text">Your Orders</h1>
        <p className="text-text-muted text-sm mt-1">
          Track mock orders, no money moves in this marketplace.
        </p>
      </div>

      {ordersQuery.isLoading ? (
        <div role="status" aria-live="polite" className="space-y-4">
          <span className="sr-only">Loading your orders…</span>
          {Array.from({ length: ORDERS_SKELETON_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-24" aria-hidden="true" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="When you buy an item, it shows up here so you can track it to delivery."
          actionLabel="Browse Listings"
          onAction={() => {
            window.location.href = "/search"
          }}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const primaryImage = order.listing
              ? [...order.listing.listing_images].sort((a, b) => a.position - b.position)[0]
              : undefined

            return (
              <Link key={order.id} to={`/orders/${order.id}`} className="block">
                <Card hoverEffect className="p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-border shrink-0">
                    {primaryImage ? (
                      <img
                        src={getListingImagePublicUrl(primaryImage.storage_path)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-text truncate">
                      {order.listing?.title ?? "Listing no longer available"}
                    </h3>
                    <span className="text-xs text-text-muted">
                      {formatRelativeTime(order.created_at)}
                    </span>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <Badge variant={ORDER_STATUS_BADGE_VARIANT[order.status]}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                    <div className="text-sm font-bold text-serif text-primary">
                      {formatNaira(order.amount)}
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
