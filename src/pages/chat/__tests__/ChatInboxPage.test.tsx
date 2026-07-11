import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { User } from "@supabase/supabase-js"
import { ChatInboxPage } from "../ChatInboxPage"
import { fetchConversations, fetchUnreadConversationIds } from "../../../lib/queries"
import { useAuth } from "../../../context/AuthContext"
import type { ConversationWithParticipants, Profile } from "../../../types/database"

vi.mock("../../../context/AuthContext")
vi.mock("../../../lib/queries")

const makeProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: "buyer-1",
  display_name: "Buyer",
  avatar_url: null,
  bio: null,
  state: "Lagos",
  city: null,
  avg_rating: 0,
  review_count: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
})

const baseConversation: ConversationWithParticipants = {
  id: "conv-1",
  listing_id: "listing-1",
  buyer_id: "buyer-1",
  seller_id: "seller-1",
  created_at: "2026-01-01T00:00:00.000Z",
  last_message_at: "2026-01-02T00:00:00.000Z",
  last_message_body: "Is this still available?",
  last_message_sender_id: "buyer-1",
  listing: { id: "listing-1", title: "Vintage Boots", price: 5000 },
  buyer: makeProfile(),
  seller: makeProfile({ id: "seller-1", display_name: "Seller" }),
}

function renderChatInboxPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ChatInboxPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe("ChatInboxPage", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "buyer-1" } as unknown as User,
      session: null,
      profile: null,
      loading: false,
      profileComplete: true,
      refreshProfile: vi.fn(),
      signOut: vi.fn(),
    })
    vi.mocked(fetchUnreadConversationIds).mockResolvedValue({ data: [], error: null })
  })

  it("renders a conversation whose listing is still visible", async () => {
    vi.mocked(fetchConversations).mockResolvedValue({ data: [baseConversation], error: null })

    renderChatInboxPage()

    expect(await screen.findByText("Vintage Boots")).toBeInTheDocument()
  })

  // Regression: once an order for the conversation's listing is delivered,
  // the seller's listing flips to 'sold'. RLS on `listings` only lets a
  // non-owner read `active` (or their own) rows, so the buyer's embedded
  // `listing` for that conversation comes back null — this only became
  // reachable once the seller dashboard shipped a way to actually mark
  // orders delivered (same root cause as BUGS.md #14, in Chat instead of
  // Orders).
  it("does not crash and shows a fallback when a conversation's listing is null", async () => {
    const conversationWithHiddenListing: ConversationWithParticipants = {
      ...baseConversation,
      listing: null,
    }
    vi.mocked(fetchConversations).mockResolvedValue({
      data: [conversationWithHiddenListing],
      error: null,
    })

    renderChatInboxPage()

    expect(await screen.findByText("Listing no longer available")).toBeInTheDocument()
  })
})
