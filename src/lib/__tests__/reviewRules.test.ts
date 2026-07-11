import { describe, it, expect } from "vitest"
import { canEditReview, canLeaveReview } from "../reviewRules"
import type { OrderStatus } from "../../types/database"

// PRD §7.12: "After an order reaches delivered, the buyer can leave a one
// to five star rating... One review per order... The buyer can edit their
// own review." These two functions are the client-side embodiment of that
// rule — exactly one of them should be true at a time for a buyer with a
// delivered order, never both.

describe("canLeaveReview (one review per order)", () => {
  it("allows the buyer to leave a review once delivered with no existing review", () => {
    expect(canLeaveReview("delivered", "buyer", false)).toBe(true)
  })

  it("blocks a second review once one already exists — the core one-per-order rule", () => {
    expect(canLeaveReview("delivered", "buyer", true)).toBe(false)
  })

  it("blocks leaving a review before the order is delivered, regardless of existing review", () => {
    const statuses: OrderStatus[] = ["pending", "confirmed", "shipped", "cancelled"]
    for (const status of statuses) {
      expect(canLeaveReview(status, "buyer", false)).toBe(false)
    }
  })

  it("blocks the seller from leaving a review on their own order", () => {
    expect(canLeaveReview("delivered", "seller", false)).toBe(false)
  })

  it("blocks a non-participant (null role)", () => {
    expect(canLeaveReview("delivered", null, false)).toBe(false)
  })
})

describe("canEditReview", () => {
  it("allows the buyer to edit once delivered with an existing review", () => {
    expect(canEditReview("delivered", "buyer", true)).toBe(true)
  })

  it("has nothing to edit when no review exists yet", () => {
    expect(canEditReview("delivered", "buyer", false)).toBe(false)
  })

  it("blocks editing before delivered even if a review somehow exists", () => {
    expect(canEditReview("shipped", "buyer", true)).toBe(false)
  })

  it("blocks the seller from editing a review they received", () => {
    expect(canEditReview("delivered", "seller", true)).toBe(false)
  })

  it("blocks a non-participant (null role)", () => {
    expect(canEditReview("delivered", null, true)).toBe(false)
  })
})

describe("canLeaveReview and canEditReview are mutually exclusive for a buyer on a delivered order", () => {
  it("exactly one is true when a review exists", () => {
    expect(canLeaveReview("delivered", "buyer", true)).toBe(false)
    expect(canEditReview("delivered", "buyer", true)).toBe(true)
  })

  it("exactly one is true when no review exists yet", () => {
    expect(canLeaveReview("delivered", "buyer", false)).toBe(true)
    expect(canEditReview("delivered", "buyer", false)).toBe(false)
  })
})
