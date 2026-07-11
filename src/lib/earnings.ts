import type { OrderWithDetails } from "../types/database"

export interface EarningsSummary {
  totalEarnings: number
  deliveredCount: number
  recentSales: OrderWithDetails[]
}

const RECENT_SALES_LIMIT = 5

/**
 * The moment an order was actually delivered, sourced from its immutable
 * order_events log (same convention as the tracking page's timeline) rather
 * than `updated_at`, which is only a proxy for "most recently touched."
 * Falls back to updated_at in the unexpected case no 'delivered' event is
 * present, so sorting still degrades gracefully instead of throwing.
 */
function deliveredAt(order: OrderWithDetails): string {
  return order.order_events.find((event) => event.status === "delivered")?.created_at ?? order.updated_at
}

/** Read-only earnings summary for the seller dashboard: total value, count, and a recent-sales list — delivered orders only. */
export function calculateEarnings(orders: OrderWithDetails[]): EarningsSummary {
  const delivered = orders.filter((order) => order.status === "delivered")

  const totalEarnings = delivered.reduce((sum, order) => sum + order.amount, 0)

  const recentSales = [...delivered]
    .sort((a, b) => new Date(deliveredAt(b)).getTime() - new Date(deliveredAt(a)).getTime())
    .slice(0, RECENT_SALES_LIMIT)

  return {
    totalEarnings,
    deliveredCount: delivered.length,
    recentSales,
  }
}
