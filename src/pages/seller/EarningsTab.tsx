import React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Info, TrendingUp } from "lucide-react"
import { Card } from "../../components/ui/Card"
import { EmptyState } from "../../components/ui/EmptyState"
import { Skeleton } from "../../components/ui/Skeleton"
import { useAuth } from "../../context/AuthContext"
import { fetchSellerOrders } from "../../lib/queries/orders"
import { getListingImagePublicUrl } from "../../lib/queries/listings"
import { calculateEarnings } from "../../lib/earnings"
import { formatNaira, formatRelativeTime } from "../../utils/formatters"

const RECENT_SALES_SKELETON_COUNT = 3

export const EarningsTab: React.FC = () => {
  const { user } = useAuth()

  const ordersQuery = useQuery({
    queryKey: ["orders", "seller", user?.id],
    queryFn: () => fetchSellerOrders(user!.id),
    enabled: !!user,
  })
  const orders = ordersQuery.data?.data ?? []
  const { totalEarnings, deliveredCount, recentSales } = calculateEarnings(orders)

  return (
    <div className="space-y-6 pt-6">
      <div className="bg-surface-raised border border-border rounded-card p-4 text-xs text-text-muted flex items-center gap-2">
        <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
        Informational only — Yours2Cash does not process real payments in this version.
      </div>

      {ordersQuery.isLoading ? (
        <div role="status" aria-live="polite" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <span className="sr-only">Loading earnings…</span>
          <Skeleton className="h-24" aria-hidden="true" />
          <Skeleton className="h-24" aria-hidden="true" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-6">
            <p className="text-sm text-text-muted">Total Earnings</p>
            <p className="text-3xl font-bold text-serif text-primary mt-1">{formatNaira(totalEarnings)}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-text-muted">Completed Sales</p>
            <p className="text-3xl font-bold text-serif text-text mt-1">{deliveredCount}</p>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-serif text-text">Recent Completed Sales</h2>
        {ordersQuery.isLoading ? (
          <div role="status" aria-live="polite" className="space-y-3">
            <span className="sr-only">Loading recent sales…</span>
            {Array.from({ length: RECENT_SALES_SKELETON_COUNT }).map((_, index) => (
              <Skeleton key={index} className="h-16" aria-hidden="true" />
            ))}
          </div>
        ) : recentSales.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No completed sales yet"
            description="Once an order is marked delivered, it will appear here."
          />
        ) : (
          <div className="space-y-3">
            {recentSales.map((order) => {
              // Sellers can always read their own listing under RLS regardless
              // of its status, so this is never null for a seller's own orders
              // (unlike the buyer-facing pages, which do handle a null listing).
              const listing = order.listing!
              const primaryImage = [...listing.listing_images].sort(
                (a, b) => a.position - b.position
              )[0]

              return (
                <Card key={order.id} className="p-4 flex items-center gap-4">
                  <Link
                    to={`/product/${listing.id}`}
                    className="w-12 h-12 rounded-lg overflow-hidden bg-border shrink-0"
                  >
                    {primaryImage ? (
                      <img
                        src={getListingImagePublicUrl(primaryImage.storage_path)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text truncate">{listing.title}</p>
                    <p className="text-xs text-text-muted">
                      Sold to {order.buyer.display_name} · {formatRelativeTime(order.updated_at)}
                    </p>
                  </div>
                  <div className="text-sm font-bold text-serif text-primary shrink-0">
                    {formatNaira(order.amount)}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
