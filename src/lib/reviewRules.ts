import type { OrderStatus } from "../types/database"
import type { OrderActor } from "./orderStateMachine"

/**
 * One review per order (PRD §7.12, enforced at the DB level by a unique
 * constraint on reviews.order_id — this mirrors that rule client-side so
 * the UI can gate "Leave a Review" vs. "Edit Review" without a round trip,
 * same "pure module mirrors a DB invariant" pattern as orderStateMachine.ts.
 */
export function canLeaveReview(
  status: OrderStatus,
  role: OrderActor | null,
  hasExistingReview: boolean
): boolean {
  return role === "buyer" && status === "delivered" && !hasExistingReview
}

export function canEditReview(
  status: OrderStatus,
  role: OrderActor | null,
  hasExistingReview: boolean
): boolean {
  return role === "buyer" && status === "delivered" && hasExistingReview
}
