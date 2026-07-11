import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { User } from "@supabase/supabase-js"
import { ChatThreadPage } from "../ChatThreadPage"
import { fetchConversationById, fetchMessages, markMessagesRead } from "../../../lib/queries/chat"
import { useAuth } from "../../../context/AuthContext"
import { ToastProvider } from "../../../components/ui/Toast"
import type { ConversationWithParticipants, Profile } from "../../../types/database"

vi.mock("../../../context/AuthContext")
vi.mock("../../../lib/queries/chat")

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
  last_message_body: null,
  last_message_sender_id: null,
  listing: null, // marked sold once delivered; RLS hides it from the buyer
  buyer: makeProfile(),
  seller: makeProfile({ id: "seller-1", display_name: "Seller" }),
}

function renderChatThreadPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={["/chat/conv-1"]}>
          <Routes>
            <Route path="/chat/:id" element={<ChatThreadPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

describe("ChatThreadPage", () => {
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
    vi.mocked(fetchMessages).mockResolvedValue({ data: [], error: null })
    vi.mocked(markMessagesRead).mockResolvedValue({ error: null })
  })

  // Regression: same root cause as ChatInboxPage's null-listing test and
  // BUGS.md #14/#15 — a buyer opening a thread for a listing that's since
  // been marked sold must not crash.
  it("does not crash and shows a fallback when the conversation's listing is null", async () => {
    vi.mocked(fetchConversationById).mockResolvedValue({ data: baseConversation, error: null })

    renderChatThreadPage()

    expect(await screen.findByText("a listing that is no longer available")).toBeInTheDocument()
    expect(screen.getByText("Seller")).toBeInTheDocument()
  })
})
