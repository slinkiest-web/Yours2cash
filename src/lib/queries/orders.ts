/**
 * Query helpers for orders and order_events.
 *
 * State transitions are enforced by Postgres triggers. These helpers simply
 * update the status column and let the database reject illegal transitions.
 */
import { supabase } from "../supabase"
import type {
  Order,
  OrderWithDetails,
  OrderStatus,
} from "../../types/database"
import type { QueryResult } from "./types"

export async function fetchBuyerOrders(
  buyerId: string
): Promise<QueryResult<OrderWithDetails[]>> {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      listing:listings!orders_listing_id_fkey(id, title, price),
      buyer:profiles!orders_buyer_id_fkey(id, display_name, avatar_url),
      seller:profiles!orders_seller_id_fkey(id, display_name, avatar_url),
      order_events(*)
    `)
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false })

  return { data: data as OrderWithDetails[] | null, error: error?.message ?? null }
}

export async function fetchSellerOrders(
  sellerId: string
): Promise<QueryResult<OrderWithDetails[]>> {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      listing:listings!orders_listing_id_fkey(id, title, price),
      buyer:profiles!orders_buyer_id_fkey(id, display_name, avatar_url),
      seller:profiles!orders_seller_id_fkey(id, display_name, avatar_url),
      order_events(*)
    `)
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })

  return { data: data as OrderWithDetails[] | null, error: error?.message ?? null }
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
