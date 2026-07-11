/**
 * Query helpers for orders and order_events.
 *
 * State transitions are enforced by Postgres triggers (see migration 008).
 * These helpers simply update the status column and let the database
 * reject illegal transitions — src/lib/orderStateMachine.ts mirrors the
 * same rules client-side so the UI can fail fast and gate which actions
 * render, but the trigger remains authoritative.
 */
import { supabase } from "../supabase"
import { updateListing } from "./listings"
import type {
  Order,
  OrderWithDetails,
  OrderStatus,
} from "../../types/database"
import type { QueryResult } from "./types"

const ORDER_SELECT = `
  *,
  listing:listings!orders_listing_id_fkey(id, title, price, listing_images(storage_path, position)),
  buyer:profiles!orders_buyer_id_fkey(id, display_name, avatar_url),
  seller:profiles!orders_seller_id_fkey(id, display_name, avatar_url),
  order_events(*)
`

export async function fetchBuyerOrders(
  buyerId: string
): Promise<QueryResult<OrderWithDetails[]>> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false })

  return { data: data as OrderWithDetails[] | null, error: error?.message ?? null }
}

export async function fetchSellerOrders(
  sellerId: string
): Promise<QueryResult<OrderWithDetails[]>> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })

  return { data: data as OrderWithDetails[] | null, error: error?.message ?? null }
}

export async function fetchOrderById(orderId: string): Promise<QueryResult<OrderWithDetails>> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .single()

  return { data: data as OrderWithDetails | null, error: error?.message ?? null }
}

/**
 * The buyer's currently open (pending/confirmed/shipped) order for this
 * listing, if any. Used to prevent placing a second, confusing concurrent
 * order for the same item — see migration 016 for the matching DB-level
 * safeguard.
 */
export async function fetchOpenOrderForListing(
  listingId: string,
  buyerId: string
): Promise<QueryResult<Order | null>> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .in("status", ["pending", "confirmed", "shipped"])
    .maybeSingle()

  return { data, error: error?.message ?? null }
}

export async function createOrder(
  listingId: string,
  buyerId: string,
  sellerId: string,
  amount: number
): Promise<QueryResult<Order>> {
  const { data, error } = await supabase
    .from("orders")
    .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: sellerId, amount })
    .select()
    .single()

  return { data, error: error?.message ?? null }
}

export async function advanceOrderStatus(
  orderId: string,
  nextStatus: OrderStatus
): Promise<QueryResult<Order>> {
  const { data, error } = await supabase
    .from("orders")
    .update({ status: nextStatus })
    .eq("id", orderId)
    .select()
    .single()

  return { data, error: error?.message ?? null }
}

/** Buyer cancels while the order is still pending. */
export async function cancelOrder(orderId: string): Promise<QueryResult<Order>> {
  return advanceOrderStatus(orderId, "cancelled")
}

/** Seller-only advancement steps — UI for these lands in the seller dashboard. */
export async function confirmOrder(orderId: string): Promise<QueryResult<Order>> {
  return advanceOrderStatus(orderId, "confirmed")
}

export async function shipOrder(orderId: string): Promise<QueryResult<Order>> {
  return advanceOrderStatus(orderId, "shipped")
}

/**
 * Marks the order delivered and flips the listing to sold. The two writes
 * are not atomic (the client SDK has no multi-statement transaction), so if
 * the listing update fails after the order succeeds, the order transition
 * itself still stands — same accepted limitation as listing photo upload
 * (Prompt 4) and avatar upload (Prompt 3).
 */
export async function deliverOrder(orderId: string, listingId: string): Promise<QueryResult<Order>> {
  const result = await advanceOrderStatus(orderId, "delivered")
  if (!result.error) {
    await updateListing(listingId, { status: "sold" })
  }
  return result
}
