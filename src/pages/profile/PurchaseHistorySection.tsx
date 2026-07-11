import React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ShoppingBag } from "lucide-react"
import { Badge } from "../../components/ui/Badge"
import { Card } from "../../components/ui/Card"
import { EmptyState } from "../../components/ui/EmptyState"
import { Skeleton } from "../../components/ui/Skeleton"
import { fetchBuyerOrders } from "../../lib/queries/orders"
import { formatNaira, formatRelativeTime } from "../../utils/formatters"
import { ORDER_STATUS_BADGE_VARIANT, ORDER_STATUS_LABELS } from "../../utils/orderStatus"

const SKELETON_COUNT = 2

export const PurchaseHistorySection: React.FC<{ userId: string }> = ({ userId }) => {
  const ordersQuery = useQuery({
    queryKey: ["orders", "buyer", userId],
    queryFn: () => fetchBuyerOrders(userId),
  })
  const orders = ordersQuery.data?.data ?? []

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-serif text-text">Purchase History</h2>
      {ordersQuery.isLoading ? (
        <div role="status" aria-live="polite" className="space-y-3">
          <span className="sr-only">Loading purchase history…</span>
          {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-16" aria-hidden="true" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No purchases yet"
          description="Items you buy will show up here so you can track them to delivery."
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} to={`/orders/${order.id}`} className="block">
              <Card hoverEffect className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text truncate">
                    {order.listing?.title ?? "Listing no longer available"}
                  </p>
                  <span className="text-xs text-text-muted">{formatRelativeTime(order.created_at)}</span>
                </div>
                <Badge variant={ORDER_STATUS_BADGE_VARIANT[order.status]}>
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
                <div className="text-sm font-bold text-serif text-primary shrink-0">
                  {formatNaira(order.amount)}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
