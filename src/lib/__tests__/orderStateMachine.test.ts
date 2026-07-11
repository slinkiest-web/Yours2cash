import { describe, it, expect } from "vitest"
import {
  canTransitionOrder,
  getAvailableActions,
  getSellerAdvanceAction,
  isOpenOrderStatus,
  resolveActorRole,
} from "../orderStateMachine"
import type { OrderStatus } from "../../types/database"

// Mirrors supabase/migrations/008_orders.sql's enforce_order_state_transition
// trigger. Valid paths are:
//   pending   -> confirmed  (seller only)
//   confirmed -> shipped    (seller only)
//   shipped   -> delivered  (seller only)
//   pending   -> cancelled  (buyer only)
// Everything else must be rejected.

describe("canTransitionOrder", () => {
  it("allows the seller to advance pending -> confirmed -> shipped -> delivered, one step at a time", () => {
    expect(canTransitionOrder("pending", "confirmed", "seller")).toBe(true)
    expect(canTransitionOrder("confirmed", "shipped", "seller")).toBe(true)
    expect(canTransitionOrder("shipped", "delivered", "seller")).toBe(true)
  })

  it("allows the buyer to cancel only while pending", () => {
    expect(canTransitionOrder("pending", "cancelled", "buyer")).toBe(true)
  })

  it("rejects the seller performing the buyer's cancel", () => {
    expect(canTransitionOrder("pending", "cancelled", "seller")).toBe(false)
  })

  it("rejects the buyer performing any seller advancement", () => {
    expect(canTransitionOrder("pending", "confirmed", "buyer")).toBe(false)
    expect(canTransitionOrder("confirmed", "shipped", "buyer")).toBe(false)
    expect(canTransitionOrder("shipped", "delivered", "buyer")).toBe(false)
  })

  it("rejects the buyer cancelling once the order is past pending", () => {
    expect(canTransitionOrder("confirmed", "cancelled", "buyer")).toBe(false)
    expect(canTransitionOrder("shipped", "cancelled", "buyer")).toBe(false)
    expect(canTransitionOrder("delivered", "cancelled", "buyer")).toBe(false)
  })

  it("rejects skipping states forward", () => {
    expect(canTransitionOrder("pending", "shipped", "seller")).toBe(false)
    expect(canTransitionOrder("pending", "delivered", "seller")).toBe(false)
    expect(canTransitionOrder("confirmed", "delivered", "seller")).toBe(false)
  })

  it("rejects moving backward", () => {
    expect(canTransitionOrder("confirmed", "pending", "seller")).toBe(false)
    expect(canTransitionOrder("shipped", "confirmed", "seller")).toBe(false)
    expect(canTransitionOrder("delivered", "shipped", "seller")).toBe(false)
  })

  it("rejects any transition out of a terminal state", () => {
    const terminal: OrderStatus[] = ["delivered", "cancelled"]
    const targets: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "cancelled"]
    for (const from of terminal) {
      for (const to of targets) {
        expect(canTransitionOrder(from, to, "seller")).toBe(false)
        expect(canTransitionOrder(from, to, "buyer")).toBe(false)
      }
    }
  })
})

describe("getAvailableActions", () => {
  it("gives the seller exactly the next forward step", () => {
    expect(getAvailableActions("pending", "seller")).toEqual(["confirmed"])
    expect(getAvailableActions("confirmed", "seller")).toEqual(["shipped"])
    expect(getAvailableActions("shipped", "seller")).toEqual(["delivered"])
  })

  it("gives the buyer only cancel, and only while pending", () => {
    expect(getAvailableActions("pending", "buyer")).toEqual(["cancelled"])
    expect(getAvailableActions("confirmed", "buyer")).toEqual([])
    expect(getAvailableActions("shipped", "buyer")).toEqual([])
  })

  it("gives nobody any actions once delivered or cancelled", () => {
    expect(getAvailableActions("delivered", "seller")).toEqual([])
    expect(getAvailableActions("delivered", "buyer")).toEqual([])
    expect(getAvailableActions("cancelled", "seller")).toEqual([])
    expect(getAvailableActions("cancelled", "buyer")).toEqual([])
  })
})

describe("resolveActorRole", () => {
  const order = { buyer_id: "buyer-1", seller_id: "seller-1" }

  it("identifies the buyer", () => {
    expect(resolveActorRole(order, "buyer-1")).toBe("buyer")
  })

  it("identifies the seller", () => {
    expect(resolveActorRole(order, "seller-1")).toBe("seller")
  })

  it("returns null for an unrelated user", () => {
    expect(resolveActorRole(order, "someone-else")).toBeNull()
  })

  it("returns null when there is no signed-in user", () => {
    expect(resolveActorRole(order, undefined)).toBeNull()
  })
})

describe("isOpenOrderStatus", () => {
  it("treats pending, confirmed, and shipped as open", () => {
    expect(isOpenOrderStatus("pending")).toBe(true)
    expect(isOpenOrderStatus("confirmed")).toBe(true)
    expect(isOpenOrderStatus("shipped")).toBe(true)
  })

  it("treats delivered and cancelled as not open", () => {
    expect(isOpenOrderStatus("delivered")).toBe(false)
    expect(isOpenOrderStatus("cancelled")).toBe(false)
  })
})

// Powers the seller dashboard's single "advance this order" button. Built on
// getAvailableActions, but tested separately so a regression in the
// dashboard-facing wrapper (wrong label, wrong target status) is caught even
// if the underlying transition table is untouched.
describe("getSellerAdvanceAction", () => {
  it("offers Confirm Order from pending", () => {
    expect(getSellerAdvanceAction("pending")).toEqual({ status: "confirmed", label: "Confirm Order" })
  })

  it("offers Mark as Shipped from confirmed", () => {
    expect(getSellerAdvanceAction("confirmed")).toEqual({ status: "shipped", label: "Mark as Shipped" })
  })

  it("offers Mark as Delivered from shipped", () => {
    expect(getSellerAdvanceAction("shipped")).toEqual({ status: "delivered", label: "Mark as Delivered" })
  })

  it("offers nothing once delivered or cancelled", () => {
    expect(getSellerAdvanceAction("delivered")).toBeNull()
    expect(getSellerAdvanceAction("cancelled")).toBeNull()
  })
})
