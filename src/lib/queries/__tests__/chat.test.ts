import { describe, it, expect, vi, beforeEach } from "vitest"
import { markMessagesRead, upsertConversation } from "../chat"
import { supabase } from "../../supabase"
import { createMockQueryBuilder, findCalls } from "./testUtils"

vi.mock("../../supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe("upsertConversation (create-or-reuse)", () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it("targets the conversations table with the listing, buyer, and seller ids", async () => {
    const { builder, calls } = createMockQueryBuilder({
      data: { id: "conv-1", listing_id: "listing-1", buyer_id: "buyer-1", seller_id: "seller-1" },
      error: null,
    })
    vi.mocked(supabase.from).mockReturnValue(builder as never)

    await upsertConversation("listing-1", "buyer-1", "seller-1")

    expect(supabase.from).toHaveBeenCalledWith("conversations")
    const upsertCalls = findCalls(calls, "upsert")
    expect(upsertCalls).toHaveLength(1)
    expect(upsertCalls[0].args[0]).toEqual({
      listing_id: "listing-1",
      buyer_id: "buyer-1",
      seller_id: "seller-1",
    })
  })

  it("requests merge-on-conflict (not ignore) so a repeat call reuses the row instead of erroring or no-opping", async () => {
    const { builder, calls } = createMockQueryBuilder({
      data: { id: "conv-1" },
      error: null,
    })
    vi.mocked(supabase.from).mockReturnValue(builder as never)

    await upsertConversation("listing-1", "buyer-1", "seller-1")

    const upsertCalls = findCalls(calls, "upsert")
    // onConflict must match the DB's unique (listing_id, buyer_id, seller_id)
    // constraint exactly, and ignoreDuplicates must be false — if it were
    // true, opening the same thread twice would silently return no row
    // instead of reusing the existing conversation.
    expect(upsertCalls[0].args[1]).toEqual({
      onConflict: "listing_id,buyer_id,seller_id",
      ignoreDuplicates: false,
    })
    expect(findCalls(calls, "select")).toHaveLength(1)
    expect(findCalls(calls, "single")).toHaveLength(1)
  })

  it("returns the same conversation id whether it's the first or a repeat call", async () => {
    const existingConversation = { id: "conv-shared", listing_id: "l1", buyer_id: "b1", seller_id: "s1" }

    const first = createMockQueryBuilder({ data: existingConversation, error: null })
    vi.mocked(supabase.from).mockReturnValue(first.builder as never)
    const firstResult = await upsertConversation("l1", "b1", "s1")

    const second = createMockQueryBuilder({ data: existingConversation, error: null })
    vi.mocked(supabase.from).mockReturnValue(second.builder as never)
    const secondResult = await upsertConversation("l1", "b1", "s1")

    expect(firstResult.data?.id).toBe("conv-shared")
    expect(secondResult.data?.id).toBe("conv-shared")
    expect(firstResult.error).toBeNull()
    expect(secondResult.error).toBeNull()
  })

  it("maps a Supabase error (e.g. RLS rejection) to a plain error message", async () => {
    const { builder } = createMockQueryBuilder({
      data: null,
      error: { message: "new row violates row-level security policy" },
    })
    vi.mocked(supabase.from).mockReturnValue(builder as never)

    const result = await upsertConversation("listing-1", "buyer-1", "seller-1")

    expect(result.data).toBeNull()
    expect(result.error).toBe("new row violates row-level security policy")
  })
})

describe("markMessagesRead", () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it("updates read_at with a valid timestamp", async () => {
    const { builder, calls } = createMockQueryBuilder({ data: null, error: null })
    vi.mocked(supabase.from).mockReturnValue(builder as never)

    await markMessagesRead("conv-1", "reader-1")

    expect(supabase.from).toHaveBeenCalledWith("messages")
    const updateCalls = findCalls(calls, "update")
    expect(updateCalls).toHaveLength(1)
    const payload = updateCalls[0].args[0] as { read_at: string }
    expect(new Date(payload.read_at).toString()).not.toBe("Invalid Date")
  })

  it("scopes the update to the given conversation", async () => {
    const { builder, calls } = createMockQueryBuilder({ data: null, error: null })
    vi.mocked(supabase.from).mockReturnValue(builder as never)

    await markMessagesRead("conv-42", "reader-1")

    expect(findCalls(calls, "eq")).toEqual([{ method: "eq", args: ["conversation_id", "conv-42"] }])
  })

  it("excludes the reader's own messages, so you can't mark your own sends read", async () => {
    const { builder, calls } = createMockQueryBuilder({ data: null, error: null })
    vi.mocked(supabase.from).mockReturnValue(builder as never)

    await markMessagesRead("conv-1", "reader-99")

    expect(findCalls(calls, "neq")).toEqual([{ method: "neq", args: ["sender_id", "reader-99"] }])
  })

  it("only touches messages that are currently unread", async () => {
    const { builder, calls } = createMockQueryBuilder({ data: null, error: null })
    vi.mocked(supabase.from).mockReturnValue(builder as never)

    await markMessagesRead("conv-1", "reader-1")

    expect(findCalls(calls, "is")).toEqual([{ method: "is", args: ["read_at", null] }])
  })

  it("returns null error on success and a mapped message on failure", async () => {
    const ok = createMockQueryBuilder({ data: null, error: null })
    vi.mocked(supabase.from).mockReturnValue(ok.builder as never)
    expect((await markMessagesRead("conv-1", "reader-1")).error).toBeNull()

    const fail = createMockQueryBuilder({ data: null, error: { message: "permission denied" } })
    vi.mocked(supabase.from).mockReturnValue(fail.builder as never)
    expect((await markMessagesRead("conv-1", "reader-1")).error).toBe("permission denied")
  })
})
