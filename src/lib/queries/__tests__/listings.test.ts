import { describe, it, expect, vi, beforeEach } from "vitest"
import { searchListings } from "../listings"
import { supabase } from "../../supabase"
import { createMockQueryBuilder, findCalls } from "./testUtils"

vi.mock("../../supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe("searchListings", () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it("always scopes to active listings and defaults to newest-first, limit 50", async () => {
    const { builder, calls } = createMockQueryBuilder({ data: [], error: null })
    vi.mocked(supabase.from).mockReturnValue(builder as never)

    await searchListings({})

    expect(supabase.from).toHaveBeenCalledWith("listings")
    expect(findCalls(calls, "eq")).toEqual([{ method: "eq", args: ["status", "active"] }])
    expect(findCalls(calls, "order")).toEqual([
      { method: "order", args: ["created_at", { ascending: false }] },
    ])
    expect(findCalls(calls, "limit")).toEqual([{ method: "limit", args: [50] }])
    expect(findCalls(calls, "or")).toHaveLength(0)
    expect(findCalls(calls, "gte")).toHaveLength(0)
    expect(findCalls(calls, "lte")).toHaveLength(0)
  })

  it("applies a text search across title and description via .or()", async () => {
    const { builder, calls } = createMockQueryBuilder({ data: [], error: null })
    vi.mocked(supabase.from).mockReturnValue(builder as never)

    await searchListings({ query: "sound bar" })

    const orCalls = findCalls(calls, "or")
    expect(orCalls).toHaveLength(1)
    expect(orCalls[0].args[0]).toBe("title.ilike.%sound bar%,description.ilike.%sound bar%")
  })

  it("combines category, state, city, and condition as separate equality filters", async () => {
    const { builder, calls } = createMockQueryBuilder({ data: [], error: null })
    vi.mocked(supabase.from).mockReturnValue(builder as never)

    await searchListings({
      categoryId: "cat-1",
      state: "Lagos",
      city: "Ikeja",
      condition: "like_new",
    })

    const eqCalls = findCalls(calls, "eq")
    expect(eqCalls).toContainEqual({ method: "eq", args: ["status", "active"] })
    expect(eqCalls).toContainEqual({ method: "eq", args: ["category_id", "cat-1"] })
    expect(eqCalls).toContainEqual({ method: "eq", args: ["state", "Lagos"] })
    expect(eqCalls).toContainEqual({ method: "eq", args: ["city", "Ikeja"] })
    expect(eqCalls).toContainEqual({ method: "eq", args: ["condition", "like_new"] })
  })

  it("applies minPrice and maxPrice as gte/lte on price", async () => {
    const { builder, calls } = createMockQueryBuilder({ data: [], error: null })
    vi.mocked(supabase.from).mockReturnValue(builder as never)

    await searchListings({ minPrice: 10000, maxPrice: 50000 })

    expect(findCalls(calls, "gte")).toEqual([{ method: "gte", args: ["price", 10000] }])
    expect(findCalls(calls, "lte")).toEqual([{ method: "lte", args: ["price", 50000] }])
  })

  it("applies only minPrice when maxPrice is not provided, and vice versa", async () => {
    const min = createMockQueryBuilder({ data: [], error: null })
    vi.mocked(supabase.from).mockReturnValue(min.builder as never)
    await searchListings({ minPrice: 5000 })
    expect(findCalls(min.calls, "gte")).toHaveLength(1)
    expect(findCalls(min.calls, "lte")).toHaveLength(0)

    const max = createMockQueryBuilder({ data: [], error: null })
    vi.mocked(supabase.from).mockReturnValue(max.builder as never)
    await searchListings({ maxPrice: 5000 })
    expect(findCalls(max.calls, "lte")).toHaveLength(1)
    expect(findCalls(max.calls, "gte")).toHaveLength(0)
  })

  it("sorts by price ascending when sort is price_asc", async () => {
    const { builder, calls } = createMockQueryBuilder({ data: [], error: null })
    vi.mocked(supabase.from).mockReturnValue(builder as never)

    await searchListings({ sort: "price_asc" })

    expect(findCalls(calls, "order")).toEqual([
      { method: "order", args: ["price", { ascending: true }] },
    ])
  })

  it("sorts by price descending when sort is price_desc", async () => {
    const { builder, calls } = createMockQueryBuilder({ data: [], error: null })
    vi.mocked(supabase.from).mockReturnValue(builder as never)

    await searchListings({ sort: "price_desc" })

    expect(findCalls(calls, "order")).toEqual([
      { method: "order", args: ["price", { ascending: false }] },
    ])
  })

  it("combines every filter together in a single call", async () => {
    const { builder, calls } = createMockQueryBuilder({ data: [], error: null })
    vi.mocked(supabase.from).mockReturnValue(builder as never)

    await searchListings({
      query: "watch",
      categoryId: "cat-1",
      state: "Lagos",
      city: "Ikeja",
      condition: "new",
      minPrice: 1000,
      maxPrice: 100000,
      sort: "price_asc",
    })

    expect(findCalls(calls, "or")).toHaveLength(1)
    expect(findCalls(calls, "eq")).toHaveLength(5) // status + category + state + city + condition
    expect(findCalls(calls, "gte")).toHaveLength(1)
    expect(findCalls(calls, "lte")).toHaveLength(1)
    expect(findCalls(calls, "order")).toEqual([
      { method: "order", args: ["price", { ascending: true }] },
    ])
  })

  it("returns the resolved data on success", async () => {
    const fakeListing = { id: "l1", title: "Test Listing" }
    const { builder } = createMockQueryBuilder({ data: [fakeListing], error: null })
    vi.mocked(supabase.from).mockReturnValue(builder as never)

    const result = await searchListings({})

    expect(result.error).toBeNull()
    expect(result.data).toEqual([fakeListing])
  })

  it("maps a Supabase error to a plain error message", async () => {
    const { builder } = createMockQueryBuilder({
      data: null,
      error: { message: "relation does not exist" },
    })
    vi.mocked(supabase.from).mockReturnValue(builder as never)

    const result = await searchListings({})

    expect(result.data).toBeNull()
    expect(result.error).toBe("relation does not exist")
  })
})
