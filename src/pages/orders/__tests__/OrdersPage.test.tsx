import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { User } from "@supabase/supabase-js"
import { OrdersPage } from "../OrdersPage"
import { fetchBuyerOrders } from "../../../lib/queries/orders"
import { useAuth } from "../../../context/AuthContext"
import type { OrderWithDetails, Profile } from "../../../types/database"

vi.mock("../../../context/AuthContext")
vi.mock("../../../lib/queries/orders")

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
  listing: { id: "listing-1", title: "Sold Item", price: 5000, listing_images: [] },
  buyer: makeProfile(),
  seller: makeProfile({ id: "seller-1", display_name: "Seller" }),
  order_events: [],
}

function renderOrdersPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe("OrdersPage", () => {
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
  })

  it("renders an order whose listing is still visible", async () => {
    vi.mocked(fetchBuyerOrders).mockResolvedValue({ data: [baseOrder], error: null })

    renderOrdersPage()

    expect(await screen.findByText("Sold Item")).toBeInTheDocument()
  })

  // Regression: once an order is marked delivered, the seller's listing
  // flips to status 'sold'. RLS on `listings` only lets a non-owner read
  // `active` (or their own) rows, so the buyer's embedded `listing` for
  // that order comes back null — this only became reachable once the
  // seller dashboard shipped a way to actually mark orders delivered.
  it("does not crash and shows a fallback when an order's listing is null (RLS-hidden after being marked sold)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const orderWithHiddenListing: OrderWithDetails = { ...baseOrder, listing: null as never }
    vi.mocked(fetchBuyerOrders).mockResolvedValue({ data: [orderWithHiddenListing], error: null })

    renderOrdersPage()

    expect(await screen.findByText(/no longer available/i)).toBeInTheDocument()
    consoleError.mockRestore()
  })
})
