import { describe, it, expect } from "vitest"
import { calculateEarnings } from "../earnings"
import type { OrderEvent, OrderStatus, OrderWithDetails, Profile } from "../../types/database"

const makeProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: "profile-1",
  display_name: "Test User",
  avatar_url: null,
  bio: null,
  state: "Lagos",
  city: null,
  avg_rating: 0,
  review_count: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
})

const makeEvent = (status: OrderStatus, created_at: string): OrderEvent => ({
  id: `event-${status}`,
  order_id: "order-1",
  status,
  created_at,
})

interface MakeOrderOptions {
  id?: string
  amount?: number
  status?: OrderStatus
  deliveredAt?: string
  updated_at?: string
}

const makeOrder = ({
  id = "order-1",
  amount = 10000,
  status = "delivered",
  deliveredAt,
  updated_at = "2026-01-05T00:00:00.000Z",
}: MakeOrderOptions = {}): OrderWithDetails => ({
  id,
  listing_id: "listing-1",
  buyer_id: "buyer-1",
  seller_id: "seller-1",
  amount,
  status,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at,
  listing: { id: "listing-1", title: "Test Listing", price: amount, listing_images: [] },
  buyer: makeProfile({ id: "buyer-1", display_name: "Buyer" }),
  seller: makeProfile({ id: "seller-1", display_name: "Seller" }),
  order_events:
    status === "delivered"
      ? [makeEvent("pending", "2026-01-01T00:00:00.000Z"), makeEvent("delivered", deliveredAt ?? updated_at)]
      : [makeEvent("pending", "2026-01-01T00:00:00.000Z")],
})

describe("calculateEarnings", () => {
  it("returns zeroes and an empty list for no orders", () => {
    expect(calculateEarnings([])).toEqual({ totalEarnings: 0, deliveredCount: 0, recentSales: [] })
  })

  it("only counts delivered orders toward earnings and the count", () => {
    const orders = [
      makeOrder({ id: "o1", amount: 5000, status: "delivered" }),
      makeOrder({ id: "o2", amount: 3000, status: "pending" }),
      makeOrder({ id: "o3", amount: 7000, status: "cancelled" }),
      makeOrder({ id: "o4", amount: 2000, status: "shipped" }),
    ]

    const result = calculateEarnings(orders)

    expect(result.totalEarnings).toBe(5000)
    expect(result.deliveredCount).toBe(1)
    expect(result.recentSales.map((o) => o.id)).toEqual(["o1"])
  })

  it("sums the order's own amount snapshot, not the listing's current price", () => {
    const order = makeOrder({ id: "o1", amount: 12000, status: "delivered" })
    order.listing!.price = 99999 // listing price may have changed since; must not be used

    expect(calculateEarnings([order]).totalEarnings).toBe(12000)
  })

  it("sums multiple delivered orders correctly", () => {
    const orders = [
      makeOrder({ id: "o1", amount: 1000, status: "delivered" }),
      makeOrder({ id: "o2", amount: 2500, status: "delivered" }),
      makeOrder({ id: "o3", amount: 500, status: "delivered" }),
    ]

    expect(calculateEarnings(orders).totalEarnings).toBe(4000)
    expect(calculateEarnings(orders).deliveredCount).toBe(3)
  })

  it("sorts recent sales by delivered date, most recent first", () => {
    const orders = [
      makeOrder({ id: "oldest", status: "delivered", deliveredAt: "2026-01-01T00:00:00.000Z" }),
      makeOrder({ id: "newest", status: "delivered", deliveredAt: "2026-01-10T00:00:00.000Z" }),
      makeOrder({ id: "middle", status: "delivered", deliveredAt: "2026-01-05T00:00:00.000Z" }),
    ]

    const result = calculateEarnings(orders)

    expect(result.recentSales.map((o) => o.id)).toEqual(["newest", "middle", "oldest"])
  })

  it("caps recent sales at 5 even when there are more delivered orders", () => {
    const orders = Array.from({ length: 8 }, (_, i) =>
      makeOrder({ id: `o${i}`, status: "delivered", deliveredAt: `2026-01-0${(i % 9) + 1}T00:00:00.000Z` })
    )

    expect(calculateEarnings(orders).recentSales).toHaveLength(5)
  })

  it("falls back to updated_at when a delivered order has no delivered event", () => {
    const order = makeOrder({ id: "o1", status: "delivered", updated_at: "2026-02-01T00:00:00.000Z" })
    order.order_events = [makeEvent("pending", "2026-01-01T00:00:00.000Z")] // no 'delivered' event

    const result = calculateEarnings([order])

    expect(result.recentSales).toHaveLength(1)
    expect(result.totalEarnings).toBe(order.amount)
  })
})
