import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { User } from "@supabase/supabase-js"
import { OrderTrackingPage } from "../OrderTrackingPage"
import { fetchOrderById } from "../../../lib/queries/orders"
import { fetchReviewByOrder } from "../../../lib/queries/reviews"
import { useAuth } from "../../../context/AuthContext"
import { ToastProvider } from "../../../components/ui/Toast"
import type { OrderWithDetails, Profile } from "../../../types/database"

vi.mock("../../../context/AuthContext")
vi.mock("../../../lib/queries/orders")
vi.mock("../../../lib/queries/reviews")

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

const baseOrder: OrderWithDetails = {
  id: "order-1",
  listing_id: "listing-1",
  buyer_id: "buyer-1",
  seller_id: "seller-1",
  amount: 5000,
  status: "delivered",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
  listing: null, // marked sold once delivered; RLS hides it from the buyer
  buyer: makeProfile(),
  seller: makeProfile({ id: "seller-1", display_name: "Seller" }),
  order_events: [{ id: "e1", order_id: "order-1", status: "delivered", created_at: "2026-01-02T00:00:00.000Z" }],
}

function renderOrderTrackingPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={["/orders/order-1"]}>
          <Routes>
            <Route path="/orders/:id" element={<OrderTrackingPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

describe("OrderTrackingPage", () => {
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
    vi.mocked(fetchReviewByOrder).mockResolvedValue({ data: null, error: null })
  })

  // Regression: once an order is delivered, the seller's listing flips to
  // 'sold'. RLS on `listings` only lets a non-owner read `active` (or their
  // own) rows, so the buyer's embedded `listing` for that order comes back
  // null — this only became reachable once the seller dashboard shipped a
  // way to actually mark orders delivered.
  it("does not crash and shows a fallback when the order's listing is null", async () => {
    vi.mocked(fetchOrderById).mockResolvedValue({ data: baseOrder, error: null })

    renderOrderTrackingPage()

    expect(await screen.findByText("Listing no longer available")).toBeInTheDocument()
    expect(screen.getByText("Order Tracking")).toBeInTheDocument()
  })
})
