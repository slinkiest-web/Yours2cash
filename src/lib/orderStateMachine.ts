import type { OrderStatus } from "../types/database"

export type OrderActor = "buyer" | "seller"

interface OrderParticipants {
  buyer_id: string
  seller_id: string
}

/**
 * Mirrors supabase/migrations/008_orders.sql's enforce_order_state_transition
 * trigger exactly. Keep these two in sync — this is a client-side
 * convenience for fast feedback and for gating which UI actions render; the
 * database trigger remains the authoritative enforcement.
 */
const ORDER_TRANSITIONS: Record<OrderStatus, Partial<Record<OrderStatus, OrderActor>>> = {
  pending: { confirmed: "seller", cancelled: "buyer" },
  confirmed: { shipped: "seller" },
  shipped: { delivered: "seller" },
  delivered: {},
  cancelled: {},
}

/** Forward-progress order of the non-cancelled states, for rendering a timeline. */
export const ORDER_STATUS_SEQUENCE: readonly OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
]

const OPEN_STATUSES: ReadonlySet<OrderStatus> = new Set(["pending", "confirmed", "shipped"])

/** True for statuses that are still "in flight" (not delivered or cancelled). */
export function isOpenOrderStatus(status: OrderStatus): boolean {
  return OPEN_STATUSES.has(status)
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus, actor: OrderActor): boolean {
  return ORDER_TRANSITIONS[from]?.[to] === actor
}

/** Which statuses this actor may move the order to, from its current status. */
export function getAvailableActions(status: OrderStatus, actor: OrderActor): OrderStatus[] {
  const transitions = ORDER_TRANSITIONS[status] ?? {}
  return (Object.keys(transitions) as OrderStatus[]).filter((to) => transitions[to] === actor)
}

/** Resolve whether userId is the buyer, the seller, or neither, for a given order. */
export function resolveActorRole(
  order: OrderParticipants,
  userId: string | undefined
): OrderActor | null {
  if (!userId) return null
  if (order.buyer_id === userId) return "buyer"
  if (order.seller_id === userId) return "seller"
  return null
}

export interface OrderAdvanceAction {
  status: OrderStatus
  label: string
}

const SELLER_ADVANCE_LABELS: Partial<Record<OrderStatus, string>> = {
  confirmed: "Confirm Order",
  shipped: "Mark as Shipped",
  delivered: "Mark as Delivered",
}

/**
 * The single next seller-facing action available for this order, if any —
 * used by the seller dashboard to render exactly one "advance" button per
 * order. Built on top of getAvailableActions so it can never drift from the
 * transition rules above (there's only ever at most one forward step for a
 * seller at any given status).
 */
export function getSellerAdvanceAction(status: OrderStatus): OrderAdvanceAction | null {
  const [next] = getAvailableActions(status, "seller")
  if (!next) return null
  return { status: next, label: SELLER_ADVANCE_LABELS[next] ?? next }
}
