# AI Handoff — Yours2Cash

> **Maintenance rule:** this file must be updated at the end of every prompt/task,
> before moving to the next one. Add a new dated entry under "Prompt Log", then
> refresh the "Completed Features", "Migrations", "Known Assumptions", and
> "Next Task" sections so they always reflect current reality, not history.

Product context lives in [prd_docs/prd_docs/Yours2Cash.md](prd_docs/prd_docs/Yours2Cash.md).
Yours2Cash is a Nigeria-only recommerce marketplace MVP (Vite + React + TS +
Tailwind, Supabase backend, no real payments — mock order flow only).

---

## Prompt log

### Prompt 1 — Scaffolding, design system, routing skeleton
*(predates this handoff doc; reconstructed from codebase inspection)*

- Vite + React 19 + TypeScript SPA, Tailwind (`darkMode: "class"`), React
  Router, TanStack Query, React Hook Form + Zod, Lucide icons, PWA plugin
  (manifest + Workbox in `vite.config.ts`), Vitest + RTL, oxlint/ESLint/Prettier.
- Brand palette as CSS variables in `src/index.css` (light + dark values),
  Fraunces (serif) + Inter (sans) via Fontsource.
- `ThemeContext` / `ThemeToggle` — class-based dark mode, persisted to
  localStorage, defaults to system preference.
- UI kit in `src/components/ui/`: Button, Card, Badge, Avatar, Input, Select,
  Textarea, Modal, Spinner, Toast, EmptyState.
- `AppShell` layout: header, search bar, nav, mobile menu, footer.
- All PRD routes wired in `App.tsx` to placeholder pages in
  `src/pages/Placeholders.tsx` (mock/hardcoded data, no real logic).

### Prompt 2 — Backend schema & data access layer
*(predates this handoff doc; reconstructed from codebase inspection)*

- 11 SQL migrations (`supabase/migrations/001`–`011`) implementing the full
  PRD §10 schema: enums, profiles, categories, listings, listing_images,
  conversations, messages, orders, order_events, reviews, storage
  (`listing-images` bucket). RLS enabled and policied on every table.
- Hand-written `src/types/database.ts` mirroring the Postgres schema in the
  shape `supabase gen types` would produce.
- Query helper layer in `src/lib/queries/` (listings, profiles, chat, orders,
  reviews) — typed Supabase calls returning `{ data, error }`.
- `src/lib/auth.ts` wrapping Supabase Auth (signUp, signIn, signOut,
  resetPassword, getSession, getUser, onAuthStateChange).
- `src/lib/supabase.ts` client init with env var handling.

### Prompt 3 — Authentication (this session)

Wired authentication end-to-end on top of the Prompt 2 data layer.

**Added**
- `AuthContext` / `useAuth` (`src/context/AuthContext.tsx`) — app-wide
  `user`, `session`, `profile`, `loading`, `profileComplete`; hydrates via
  `getSession()`, stays live via `onAuthStateChange`.
- `ProtectedRoute` (`src/components/auth/ProtectedRoute.tsx`) — redirects
  signed-out users to `/auth/login` (preserving intended destination), and
  redirects signed-in users with an incomplete profile to `/profile`.
- Real Login / Signup / Reset Password pages (`src/pages/auth/`), all React
  Hook Form + Zod (`src/lib/validation/auth.ts`). Signup handles the
  "confirm your email" case. Reset-password is dual-mode: request a link, or
  (landing back from the emailed link) set a new password.
- Real Profile page (`src/pages/ProfilePage.tsx`) doubling as first-run
  profile setup and ongoing profile editing: display name, Nigerian
  state/city (`src/utils/nigeria.ts`), bio, avatar upload.
- `supabase/migrations/012_avatar_storage.sql` — the `avatars` storage
  bucket + RLS (was missing; `uploadAvatar` already assumed it existed).

**Modified**
- `src/lib/auth.ts` — `onAuthStateChange` now also surfaces the Supabase
  auth event (needed to detect `PASSWORD_RECOVERY`); added `updatePassword`.
- `src/lib/queries/profiles.ts` — added `getAvatarPublicUrl`.
- `AppShell` — shows avatar + "Log out" when signed in, "Login" when not.
- `App.tsx` — added `AuthProvider`; `/sell`, `/chat`, `/chat/:id`, `/orders`,
  `/dashboard`, `/profile` now wrapped in `ProtectedRoute`.
- `Placeholders.tsx` — removed the 4 pages now implemented for real.

**Unplanned fixes discovered while verifying the build** (see Architectural
Decisions below for why): `src/types/database.ts` (missing `Relationships`
on every table — this silently typed all query helper mutations as `never`),
`src/components/ui/EmptyState.tsx` (type-only import), `src/lib/queries/index.ts`
(ambiguous re-exported `QueryResult` name). None of these changed behavior —
they unblocked `tsc -b` for code that was already there.

Verified: `tsc -b` clean, `vitest run` (6/6 pass), `oxlint` clean, `npm run build`
succeeds. Not verified against a live Supabase project (no `.env.local` in
this environment) — signup/login network calls, RLS behavior, and the
recovery-link redirect flow are unexercised against a real backend.

### Prompt 3 follow-up — Live backend verification (2026-07-04)

The user connected a real Supabase project and completed the verification
that the original Prompt 3 session couldn't do locally.

**Done today**
- Supabase project connected successfully.
- `.env.local` configured with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Migrations 001–012 executed successfully, in order, via the Supabase
  SQL Editor.
- Existing user profile backfilled (see "Issues encountered" below for why
  this was needed).
- Email signup and email verification tested successfully end-to-end.
- Login tested successfully against the live project.
- Dashboard loads successfully after login.

**Prompt 3 is now fully complete and verified against a live backend** — no
longer just typecheck/build/test clean, but confirmed working with real
signup, real email verification, real login, and a real Postgres schema.

**Issues encountered and resolution**
- *Symptom*: after logging in, the app hung indefinitely and never reached
  the dashboard. *Cause*: the Supabase dashboard showed "Last Migration: No
  migrations" — none of the 12 migration files had been run, so `profiles`
  (and every other app table) didn't exist yet. `AuthContext` would try to
  fetch a profile that could never be found, and `ProtectedRoute` would
  redirect to `/profile`, which itself waits on that same fetch — so the
  user saw an infinite spinner instead of a clear error. *Fix*: ran
  migrations 001–012 in order through the SQL Editor.
- *Symptom*: even after migrations ran, the pre-existing account (created
  before migration 002's `profiles`-creation trigger existed) still had no
  profile row, so the hang persisted for that one account. *Cause*: the
  `handle_new_user` trigger only fires on new `auth.users` inserts — it
  can't retroactively backfill accounts that signed up before the trigger
  existed. *Fix*: ran a one-time backfill query inserting a `profiles` row
  for any `auth.users` row missing one.

**Lessons learned**
- An empty/incomplete backend (no migrations run) and a real application
  bug both present the same symptom to a user — an infinite spinner — with
  no error surfaced anywhere in the UI. `ProtectedRoute` and `ProfilePage`
  currently have no "this is taking too long" or "something went wrong"
  fallback state; they just show a spinner forever if `profile` never
  resolves. Worth hardening later (e.g. a timeout or an error state) so a
  misconfigured backend fails loudly instead of silently.
- Schema-creation triggers (like `handle_new_user`) only affect rows
  created *after* the trigger exists. Any environment where auth signups
  happened before migrations were run will need the same backfill query
  used today. Worth keeping that backfill snippet handy for future fresh
  Supabase project setups, or folding it into a seed/setup script.
- Checking "Last Migration" in the Supabase dashboard is a fast way to
  confirm whether the schema was ever applied at all — worth checking
  first whenever behavior suggests missing tables rather than a code bug.

### Prompt 4 — Listings: create, edit, delete, browse, detail (2026-07-10)

Wired the Listings feature end-to-end on top of the Prompt 2 data layer,
reusing the `AuthContext`, `ProtectedRoute`, RHF+Zod, and query-layer
conventions established in Prompt 3.

**Added**
- `src/lib/queries/types.ts` — the shared `QueryResult<T>` interface,
  extracted out of the 5 query modules that each used to redeclare it
  (see Architectural decisions below).
- `src/lib/queries/categories.ts` — `fetchCategories()`, read-only.
- `src/lib/queries/listings.ts` additions — `getListingImagePublicUrl(path)`
  and `deleteListingImage(imageId, storagePath)` (removes both the storage
  object and the `listing_images` row).
- `src/lib/validation/listing.ts` — `listingSchema` (Zod) for the
  create/edit form.
- `src/utils/listingOptions.ts` — `CONDITION_OPTIONS`, `formatCondition()`,
  `MAX_LISTING_PHOTOS` (6, matching the PRD and the `listing_images.position`
  DB check constraint).
- `src/components/listings/ListingCard.tsx` — reusable listing card (photo,
  title, condition badge, location, price), used by Home/Search/Category.
- `src/pages/HomePage.tsx`, `src/pages/SearchPage.tsx`,
  `src/pages/CategoryPage.tsx` — real pages (moved out of `Placeholders.tsx`),
  wired to `fetchFeaturedListings` / `fetchRecentListings` / `searchListings`
  / `fetchListingsByCategory` / `fetchCategories` via TanStack Query
  `useQuery`. `SearchPage` syncs all filters (text, category, state,
  condition, price range, sort) to the URL query string via
  `useSearchParams`, so results are shareable and survive refresh (PRD §7.4).
- `src/pages/listings/ProductDetailPage.tsx` — real page: photo gallery,
  seller card (links to public profile), and conditional actions — the
  owner sees Edit/Delete (Delete behind a confirm `Modal`), everyone else
  sees Message Seller/Buy Now (unchanged placeholder destinations — Chat and
  Orders are still out of scope) unless the listing isn't active, in which
  case neither is shown.
- `src/pages/listings/ListingFormPage.tsx` — one page handles both create
  (`/sell`) and edit (`/sell/:id`), mirroring how `ProfilePage` doubles as
  setup+edit in Prompt 3. Handles photo selection with local object-URL
  previews, a 6-photo cap shared with the DB constraint, per-photo removal
  (existing photos via `deleteListingImage`, pending photos via
  `URL.revokeObjectURL`), and an ownership guard that redirects away if the
  logged-in user isn't the listing's seller.

**Modified**
- `src/lib/queries/listings.ts`, `profiles.ts`, `chat.ts`, `orders.ts`,
  `reviews.ts` — removed each file's locally-duplicated `QueryResult<T>`
  interface in favor of importing the one in `types.ts`.
- `src/lib/queries/index.ts` — re-exports `QueryResult` from `types.ts`
  (was a workaround re-export from `listings.ts`) and added
  `export * from "./categories"`.
- `App.tsx` — added the `/sell/:id` edit route (also `ProtectedRoute`-wrapped),
  pointed `/`, `/search`, `/category/:slug`, `/product/:id`, `/sell` at the
  new real pages.
- `Placeholders.tsx` — removed `HomePage`, `SearchPage`, `CategoryPage`,
  `ProductDetailPage`, `CreateListingPage` (now real) and their
  now-unused icon imports. `ChatInboxPage`, `ChatThreadPage`, `OrdersPage`,
  `SellerDashboardPage`, `PublicProfilePage`, `NotFoundPage` remain
  placeholders — untouched, out of scope for this prompt.

**Deliberately out of scope / unchanged**
- `SellerDashboardPage`'s "My Listings" tab is still a placeholder — a
  seller's own listings are only reachable today via a listing's own
  Product Detail page (Edit/Delete) or a direct `/sell/:id` URL, not from a
  dashboard list. `fetchListingsBySeller` already exists in the query layer
  and is unused — natural follow-up, but not required by the Prompt 4 scope
  as written in the previous "Next task" entry.
- "Mark as sold" is intentionally not implemented — PRD §7.8 ties that
  transition to the order-fulfillment flow (Prompt 5+ territory), so it
  wasn't added here. Delete (soft `status = 'removed'`) is the only status
  transition a seller can trigger from the UI right now.
- Message Seller / Buy Now buttons on Product Detail still point at the
  unbuilt Chat/Orders placeholders, unchanged from Prompt 1 — intentionally
  not touched.

**Verified**
- `tsc -b`, `vitest run` (6/6 pass), `oxlint` (only the same 3 pre-existing
  context/hook warnings from Prompt 3), and `npm run build` all clean.
- Live, non-destructive, anonymous-client smoke test against the connected
  Supabase project (categories seeded and publicly readable — all 9 present;
  `listings` readable under RLS with the active-only policy; both
  `listing-images` and `avatars` storage buckets reachable; an anonymous
  insert into `listings` is correctly rejected by RLS). Dev server boots and
  serves without error.
- Author (Claude) had no browser-automation tooling available to click
  through the authenticated UI directly — verification stopped at build/
  tests/lint plus the live anonymous-client smoke test above. **Builder has
  since manually tested and accepted Prompt 4** (create/edit/delete a
  listing with photos, browse via Home/Search/Category, all against the
  live project) — no defects reported. Prompt 4 is closed.

### Prompt 4 follow-up — Discovery hardening (2026-07-11)

Strengthened Home/Search/Category (PRD §7.2–7.4) to match the fuller spec:
same filter bar reused across Search and Category, a city filter, loading
skeletons instead of spinners, stricter accessibility, and unit tests for
the two most logic-heavy, framework-free pieces (URL↔filter-state mapping
and the Supabase query builder).

**Added**
- `src/lib/listingFilters.ts` — pure, React-free functions:
  `parseListingFilters(params)`, `listingFiltersToParams(filters)`, and
  `listingFilterStateToQuery(filters, categoryId)`. This is the "query
  string to filter state" mapping, deliberately kept out of any hook/component
  so it's trivially unit-testable.
- `src/hooks/useListingFilters.ts` — thin `useSearchParams` wrapper around
  the pure functions above; exposes `{ filters, applyFilters }`.
- `src/components/listings/ListingBrowser.tsx` — the shared filter bar +
  results grid, now used by **both** `SearchPage` and `CategoryPage` (PRD
  §7.3: "Each category has its own browse view with the same filter bar as
  search"). Takes an optional `lockedCategory` prop: when set, the category
  select is hidden and the results are pinned to that category while every
  other filter (state, city, condition, price, sort, text search) still
  works and still syncs to the URL.
- City filter — was in the `ListingFilters`/`searchListings` query contract
  already (Prompt 4) but had no UI. Added as an `Input` field in `ListingBrowser`.
- `src/components/ui/Skeleton.tsx` — generic pulsing placeholder primitive.
- `src/components/listings/ListingCardSkeleton.tsx` — card-shaped skeleton,
  used by `ListingBrowser`'s results grid and `HomePage`'s "Recently Added".
  `HomePage`'s category row also got skeleton tiles for its loading state.
  All loading grids are wrapped in `role="status" aria-live="polite"` with
  an `sr-only` "Loading…" label so screen readers announce the loading state
  instead of silence followed by a content jump.
- Accessibility pass on the filter bar: the top search input has a visible
  `sr-only` `<label>` (was placeholder-only before), the min/max price
  inputs each get an `aria-label` (they share one visual heading but need
  distinct accessible names), and `SearchPage`/all filter/sort controls use
  the existing `Input`/`Select` components (which already render a proper
  `<label htmlFor>`) rather than bare inputs — all native form controls, so
  keyboard operability was already correct and needed no changes.
- `src/lib/__tests__/listingFilters.test.ts` — 14 tests covering
  `parseListingFilters` (defaults, full parse, invalid/missing sort
  fallback, blank-vs-missing param equivalence), `listingFiltersToParams`
  (empty state → empty query string, default sort omitted, round-trip
  through `parseListingFilters`), and `listingFilterStateToQuery` (price
  string→number conversion, blank and non-numeric prices become
  `undefined` rather than `0`/`NaN`).
- `src/lib/queries/__tests__/listings.test.ts` — 10 tests for `searchListings`,
  mocking `supabase.from()` with a fake chainable, call-recording,
  self-thenable query builder (mirrors real supabase-js: every step in the
  chain is itself awaitable, so the mock doesn't assume which method is
  called last). Covers: default active-only/newest/limit-50 behavior, the
  `.or()` text search across title+description, every filter combining
  correctly in one call, price sort direction, and success/error result
  mapping.

**Modified**
- `SearchPage.tsx` — now just renders `<ListingBrowser />` (plus a
  `sr-only` `<h1>` for document structure); all filter-bar/results JSX moved
  into the shared component.
- `CategoryPage.tsx` — resolves the category from the slug, then renders
  `<ListingBrowser lockedCategory={category} />` instead of its own
  hand-rolled results grid.
- `HomePage.tsx` — category row and "Recently Added" loading states switched
  from `Spinner` to skeleton grids (see above).

**Verified**
- `tsc -b`, `oxlint` (same 3 pre-existing warnings, no new ones), and
  `npm run build` all clean.
- `vitest run`: **30/30 tests pass** (6 pre-existing + 14 + 10 new).
- Dev server boots and serves without error.
- Did not re-run the live anonymous Supabase smoke test from the Prompt 4
  entry above — `searchListings`'s actual query logic was not changed, only
  *where* its input filters come from (the new pure-mapping module), so the
  already-passing live-backend behavior isn't expected to have moved.
- **Builder has manually tested and accepted Prompt 4 in full**, including
  this discovery-hardening pass (shared filter bar on Search and Category,
  city filter, skeleton loading) — no defects reported. This closes the
  "author had no browser-automation tooling" gap noted above; Prompt 4 is
  closed.

### Prompt 5 — In-app chat (2026-07-11)

Built one-to-one realtime chat scoped to a listing (PRD §7.7), on top of
the Prompt 2 `chat.ts` query layer. The user chose Chat over Orders as the
next prompt.

**Added**
- `supabase/migrations/013_fix_messages_mark_read_policy.sql`,
  `014_conversations_reuse_update_policy.sql`,
  `015_conversations_last_message_preview.sql` — three RLS/schema fixes
  found while building this feature; see BUGS.md issues #10 and #11 for
  the two behavioral bugs (013 and 014 fix real bugs, 015 is a
  denormalization addition, not a bug fix).
- `src/pages/chat/ChatInboxPage.tsx` — real page: threads sorted by
  `last_message_at` (already the query's order), other-party name + avatar,
  last-message preview (with a "You: " prefix when you sent it last),
  relative timestamp, unread dot. Skeleton loading, empty state.
- `src/pages/chat/ChatThreadPage.tsx` — real page: message log, composer,
  optimistic send, live incoming messages, mark-as-read. See Architectural
  decisions below for the realtime/optimistic-update design.
- `src/lib/queries/__tests__/chat.test.ts` — 9 tests: `upsertConversation`
  (correct table/payload, the exact `onConflict`/`ignoreDuplicates: false`
  options that make reuse work rather than silently no-op, same id returned
  across repeat calls, error mapping) and `markMessagesRead` (correct
  `read_at` timestamp, scoped to the conversation, excludes the reader's
  own messages, only touches currently-unread rows, error mapping).
- `src/lib/queries/__tests__/testUtils.ts` — the mock Postgrest query
  builder extracted out of `listings.test.ts` now that `chat.test.ts` is a
  second real user of it (see Architectural decisions in the Prompt 4 entry
  above re: extracting shared pieces once a second call site exists).

**Modified**
- `src/lib/queries/chat.ts` — added `fetchConversationById` (single thread
  by id, used by `ChatThreadPage`), `fetchUnreadConversationIds` (backs the
  inbox's unread dot — one lightweight query, not N+1), extended
  `subscribeToMessages` with an `onStatusChange` callback (reconnection
  handling, see below), added `unsubscribeFromMessages`. `fetchConversations`
  now shares a `CONVERSATION_SELECT` constant with the new
  `fetchConversationById` instead of duplicating the embed string.
- `src/types/database.ts` — `conversations` gained `last_message_body` /
  `last_message_sender_id` (nullable); removed the old speculative
  `last_message?` field from `ConversationWithParticipants` now that it's
  real flat columns on the row itself.
- `src/pages/listings/ProductDetailPage.tsx` — "Message Seller" is no
  longer a dead `Link` to `/chat/:listingId` (wrong id shape, was always a
  placeholder) — it now calls `upsertConversation` and navigates to the
  real `/chat/:conversationId`. If clicked while signed out, it redirects
  to `/auth/login` with a return path, matching how `ProtectedRoute` already
  behaves for Buy Now/`/orders` (PRD: actions requiring an account should
  prompt sign-in for signed-out visitors).
- `App.tsx` — `/chat` and `/chat/:id` now point at the real pages.
- `Placeholders.tsx` — removed the placeholder `ChatInboxPage`/`ChatThreadPage`.

**Architectural notes specific to this feature**
- **Realtime + optimistic send via direct `queryClient.setQueryData`, not
  `useMutation`.** Consistent with the codebase's established mutation
  pattern (see Architectural decisions below): the composer appends a
  locally-built optimistic `MessageWithSender` to the `["messages", id]`
  query cache, calls `sendMessage`, then reconciles the temp id with the
  real one (or removes it and shows a toast on failure). The realtime
  INSERT handler dedupes by message id, so the sender's own message arriving
  back over the Realtime channel doesn't double-render.
- **Sender identity for realtime/optimistic messages is resolved
  client-side, not fetched.** A `postgres_changes` INSERT payload only
  contains the raw `messages` row, not the joined sender profile. Since a
  conversation only ever has two participants, `ChatThreadPage` resolves
  `sender_id` against the already-loaded conversation's `buyer`/`seller`
  profile objects (kept in a ref to avoid stale closures inside the
  subscription effect) instead of issuing a per-message fetch.
- **Reconnection handling**: `subscribeToMessages` now takes an optional
  status callback. `ChatThreadPage` invalidates `["messages", id]` whenever
  the channel reports `SUBSCRIBED` — which fires on both the initial
  connect and any automatic reconnect — because Supabase Realtime is a live
  feed, not a durable queue: events that occur while disconnected are never
  redelivered, so a refetch on (re)connect is the only way to close that gap.
- **Unsubscribe on unmount/thread-change**: the subscription effect depends
  on `[id, user, queryClient]` only (not `conversation`, which changes
  independently) and returns `unsubscribeFromMessages(channel)` as its
  cleanup, so switching threads or navigating away always tears down the
  previous channel before a new one (if any) is opened.
- **Accessibility**: the message list is `role="log" aria-live="polite"`
  with an `aria-label` naming the other participant, so only newly-arriving
  messages are announced (existing history loads silently, matching how a
  live region behaves on mount). Each bubble has a visually-hidden "You
  said" / "{name} said" prefix so an announcement has context. The composer
  is a plain native `<input>` in a `<form>` with an associated (visually
  hidden) `<label>` — fully keyboard operable with no custom key handling.

**Deliberately out of scope / unchanged**
- No typing indicators, read receipts beyond the unread dot, attachments,
  or message editing/deletion — none are in the PRD §7.7 scope for v1
  ("Text only").
- `ChatInboxPage` doesn't add a global unread badge to the `AppShell` nav
  "Inbox" link — the PRD only asked for the inbox's per-thread unread
  indicator, not a nav-level badge. `fetchUnreadConversationIds` could
  support one later without changes.

**Verified**
- `tsc -b`, `vitest run` (**39/39 pass**: 30 prior + 9 new), `oxlint` (same
  3 pre-existing warnings), and `npm run build` all clean. Dev server boots
  and serves without error.
- Migrations 013–015 were run and **confirmed applied by Builder on
  2026-07-11** via a guided walkthrough (013–014 confirmed individually at
  the time; 015 confirmed retroactively after the fact). Still outstanding:
  the manual click-through itself — click Message Seller from a product
  detail page as one user, send a few messages, and (ideally) check from a
  second account/browser that incoming messages appear live without a
  refresh.

### Prompt 6 — Mock order flow and tracking (2026-07-11)

Built order creation, cancellation, and buyer-facing tracking (PRD §7.8/§7.9)
on top of the Prompt 2 `orders.ts` query layer, plus enough of the review
write path to satisfy "delivered unlocks the review action." Seller-side
advancement (confirm/ship/deliver buttons) is explicitly deferred to the
next prompt (seller dashboard) per this session's instructions — the
mutations exist and are tested now, but nothing in this prompt's UI calls
`confirmOrder`/`shipOrder`/`deliverOrder` yet.

**Added**
- `supabase/migrations/016_orders_one_open_per_buyer_listing.sql` — partial
  unique index so a buyer can't have two open (pending/confirmed/shipped)
  orders for the same listing at once. Complements an app-level check
  (`fetchOpenOrderForListing`) that redirects to the existing order instead
  of erroring — the index just closes the race condition underneath it.
- `supabase/migrations/017_orders_freeze_immutable_columns.sql` — a real
  RLS gap found while implementing this feature; see BUGS.md #12.
- `src/lib/orderStateMachine.ts` — pure, framework-free module mirroring
  migration 008's `enforce_order_state_transition` trigger exactly:
  `canTransitionOrder(from, to, actor)`, `getAvailableActions(status, actor)`,
  `resolveActorRole(order, userId)`, `isOpenOrderStatus(status)`. Same "pure
  module, no I/O" pattern as `listingFilters.ts` (Prompt 4) — written
  specifically so the transition guards are unit-testable in isolation.
- `src/lib/__tests__/orderStateMachine.test.ts` — 17 tests covering every
  valid transition, wrong-actor rejections, skip/backward/terminal-state
  rejections, `getAvailableActions`, `resolveActorRole`, and
  `isOpenOrderStatus`.
- `src/lib/validation/review.ts` — `reviewSchema` (rating 1–5 required,
  optional comment).
- `src/utils/orderStatus.ts` — `ORDER_STATUS_LABELS` /
  `ORDER_STATUS_BADGE_VARIANT`, shared by the orders list and tracking page.
- `src/pages/orders/OrdersPage.tsx` — real page (moved out of
  `Placeholders.tsx`): buyer's own orders, listing thumbnail, status badge,
  amount, links to the tracking page. Buyer-only — seller's order list is
  explicitly next-prompt scope.
- `src/pages/orders/OrderTrackingPage.tsx` — real page: status badge,
  listing snapshot (thumbnail, title, amount actually paid — not the
  listing's current price), the other party, a status timeline built from
  `order_events` (see Architectural notes below for how cancelled renders),
  a Cancel button (buyer + pending only, gated by
  `canTransitionOrder`), and a Leave a Review action (buyer + delivered +
  not yet reviewed) that opens a small star-rating modal and calls
  `createReview`.

**Modified**
- `src/lib/queries/orders.ts` — added `fetchOrderById`, `fetchOpenOrderForListing`,
  and named wrappers `cancelOrder`/`confirmOrder`/`shipOrder`/`deliverOrder`
  around the existing generic `advanceOrderStatus`. `deliverOrder` also
  calls `updateListing(listingId, { status: "sold" })` (PRD: "delivered...
  can mark the listing sold") — not wired to any button yet, but ready for
  the seller dashboard prompt. Extracted a shared `ORDER_SELECT` constant
  (now including a `listing_images` embed for thumbnails) used by
  `fetchBuyerOrders`, `fetchSellerOrders`, and the new `fetchOrderById`.
- `src/types/database.ts` — `OrderWithDetails.listing` now also picks
  `listing_images` (storage_path, position) for the thumbnail shown on both
  the orders list and the tracking page.
- `src/pages/listings/ProductDetailPage.tsx` — "Buy Now" is no longer a
  dead `Link` to `/orders` — it checks for an existing open order first
  (redirects there with an info toast if found), otherwise calls
  `createOrder(listing.id, user.id, listing.seller_id, listing.price)`
  (the price snapshot) and navigates to `/orders/:id`. Signed-out click
  redirects to login with a return path, same pattern as Message Seller
  (Prompt 5). Self-ordering was already prevented by the existing `isOwner`
  gate (owners see Edit/Delete, never Buy Now) — no change needed there.
- `App.tsx` — `/orders` now points at the real buyer order list; added
  `/orders/:id` for the tracking page.
- `Placeholders.tsx` — removed the placeholder `OrdersPage`.

**Architectural notes specific to this feature**
- **Cancelled orders render as a distinct terminal state, not a stalled
  timeline.** Rather than showing the 4-step pending→delivered stepper
  frozen partway through, a cancelled order replaces the whole timeline
  card with a single "Order Cancelled" marker and its timestamp (read from
  `order_events`) — avoids the ambiguous "did it stop, or is it just slow?"
  reading a frozen forward-stepper would give.
- **The timeline's timestamps come from `order_events`, matched by status,
  not recomputed from `orders.updated_at`.** `order_events` is
  trigger-written and immutable (migration 009) — one row per status the
  order has ever been in — so each completed step in the timeline shows
  the actual time it was reached, not just the most recent update time.
- **`amount` is the order's own snapshot column, distinct from the
  listing's live `price`.** The tracking page and orders list both display
  `order.amount` (what was actually charged/agreed at purchase time), never
  `order.listing.price` (which could have changed since, or the listing
  could since be edited/removed) — this is the whole point of the snapshot
  per the PRD, and migration 017 (see BUGS.md #12) now makes it
  RLS-enforced, not just a client-side convention.
- **Client-side transition guards mirror the DB trigger exactly, on
  purpose, not just "closely."** `orderStateMachine.ts`'s
  `ORDER_TRANSITIONS` table is a direct transcription of migration 008's
  `enforce_order_state_transition` if/else chain. If that trigger is ever
  changed, this module must change with it — the tests in
  `orderStateMachine.test.ts` are the fastest way to notice drift (update
  the trigger, watch which client-side test expectations no longer make
  sense).

**Deliberately out of scope / unchanged**
- No seller-facing "advance order" UI (Confirm/Ship/Deliver buttons) —
  explicit next-prompt scope (seller dashboard), though the mutations
  (`confirmOrder`, `shipOrder`, `deliverOrder`) exist and are covered by the
  state-machine tests already.
- No review *editing* UI (the buyer can leave one review per order but
  there's no "edit your review" affordance yet, even though
  `updateReview` already exists in the query layer) — PRD §7.12 (Ratings
  and reviews) as a full feature, including showing reviews on a seller's
  public profile, is still its own future prompt. This prompt only
  implements the "unlocks the review action" piece PRD §7.8 explicitly
  calls out.
- `SellerDashboardPage`'s "Customer Orders" tab is still a placeholder —
  unchanged, same as Prompt 4/5's note about "My Listings."

**Verified**
- `tsc -b`, `vitest run` (**56/56 pass**: 39 prior + 17 new), `oxlint` (same
  3 pre-existing warnings), and `npm run build` all clean. Dev server boots
  and serves without error.
- Migrations 016–017 were run and **confirmed applied by Builder on
  2026-07-11** via a guided walkthrough (each confirmed individually).
  Still outstanding: the manual click-through itself — buy an item, confirm
  the pending order and tracking page render correctly, cancel a different
  pending order and confirm it renders as cancelled, and (once the seller
  dashboard exists) walk one order all the way to delivered to confirm the
  review action unlocks and the listing flips to sold.

### Prompt 7 — Seller dashboard (2026-07-12)

Built the three-tab seller dashboard (PRD §7.10), wiring together query
functions built but unused since earlier prompts: `fetchListingsBySeller`
(Prompt 2), `fetchSellerOrders`/`confirmOrder`/`shipOrder`/`deliverOrder`
(Prompt 6). **No new migrations or RLS changes this session** — every
mutation used here reuses schema/policies already live from prior prompts.

**Added**
- `src/components/ui/Tabs.tsx` — `Tabs`/`TabPanel`, a generic accessible
  tab primitive (proper `role="tablist"/"tab"/"tabpanel"`, `aria-selected`,
  roving `tabIndex`, arrow-key navigation between tabs). First dashboard
  feature to need tabs, so this is a new UI-kit primitive, not a
  dashboard-specific component — reusable if another multi-tab surface
  shows up later.
- `src/utils/listingStatus.ts` — `LISTING_STATUS_LABELS` /
  `LISTING_STATUS_BADGE_VARIANT` (active/sold/removed), same shape as
  Prompt 6's `orderStatus.ts`.
- `getSellerAdvanceAction(status)` added to `orderStateMachine.ts` — wraps
  `getAvailableActions(status, "seller")` plus a button label, so the
  dashboard always renders exactly one "advance" button per order and can
  never drift from the transition rules. New tests appended to
  `orderStateMachine.test.ts` (4 cases: one per real status plus the two
  terminal states).
- `src/lib/earnings.ts` — `calculateEarnings(orders)`, a pure function:
  filters to delivered orders, sums `amount` (never `listing.price`),
  and returns up to 5 recent sales sorted by their `order_events`
  "delivered" timestamp (same convention as the tracking page's timeline,
  not `updated_at`). `src/lib/__tests__/earnings.test.ts` — 7 tests
  (empty input, mixed statuses, amount-not-listing-price, multi-order sum,
  sort order, the 5-item cap, and the updated_at fallback when no
  'delivered' event exists).
- `src/components/listings/DeleteListingModal.tsx` — extracted out of
  `ProductDetailPage` now that `MyListingsTab` is a second real call site
  (same "extract once a second call site exists" principle as
  `ListingBrowser` in Prompt 4). Takes an `onDeleted` callback so each
  caller decides what happens next (`ProductDetailPage` navigates to
  `/dashboard`; `MyListingsTab` just invalidates and stays put).
- `src/pages/seller/SellerDashboardPage.tsx` — real page (moved out of
  `Placeholders.tsx`): tab shell only, local `useState` for the active tab
  (not URL-synced — no request for shareable tab state, unlike Search's
  filters).
- `src/pages/seller/MyListingsTab.tsx` — seller's listings (all statuses,
  not just active), thumbnail, status badge, Edit (→ `/sell/:id`) and
  Delete (→ `DeleteListingModal`), a "List New Item" entry point, empty
  state.
- `src/pages/seller/MyOrdersTab.tsx` — seller's orders, buyer avatar+name,
  item, amount, status badge, and the single advance button from
  `getSellerAdvanceAction` when one applies. Per-order loading state
  (`advancingOrderId`) so acting on one order doesn't spinner-lock the
  whole list.
- `src/pages/seller/EarningsTab.tsx` — total earnings, completed-sales
  count, recent-sales list (all from `calculateEarnings`), with an
  explicit "informational only, no real payments" banner per the PRD.

**Modified**
- `src/pages/listings/ProductDetailPage.tsx` — delete flow now delegates
  to `DeleteListingModal` instead of an inline `Modal` + local
  `isDeleting`/`handleDelete`.
- `App.tsx` — `/dashboard` now points at the real `SellerDashboardPage`.
- `Placeholders.tsx` — removed the placeholder `SellerDashboardPage` and
  its now-unused `ShoppingBag`/`Inbox`/`Button` imports.

**Architectural notes specific to this feature**
- **My Orders and Earnings share one query key on purpose.** Both tabs
  call `fetchSellerOrders` under the exact same key
  (`["orders", "seller", user.id]`). TanStack Query dedupes this to a
  single fetch/cache entry — Earnings doesn't need its own query, just a
  different pure-function view (`calculateEarnings`) over the same data.
  Only fetches when its tab is actually mounted (`TabPanel` returns `null`
  for inactive tabs, so an inactive tab's `useQuery` never runs — though
  since both tabs share a key, whichever mounts first primes the cache for
  the other).
- **Delivering an order invalidates three query keys, not one**: the
  seller's own order list, the specific `["order", id]` (in case a tracking
  page has it open), and `["listings"]` broadly — because `deliverOrder`
  (Prompt 6) also flips the listing to sold, so `MyListingsTab`'s status
  badge needs to refresh too.

**Deliberately out of scope / unchanged**
- Tab state is not synced to the URL (e.g. `?tab=orders`) — not requested,
  and the dashboard is always reached fresh from nav, not deep-linked.
- No pagination on any tab — matches every other list in the app so far
  (Home, Search, Inbox, Orders); revisit if seed data or real usage makes
  long lists a problem.
- Public profile pages still don't show a seller's listings or reviews
  (noted as a gap since Prompt 4/6) — untouched here, still PRD §7.11/7.12
  territory.

**Verified**
- `tsc -b`, `vitest run` (**67/67 pass**: 56 prior + 11 new), `oxlint`
  (same 3 pre-existing warnings), and `npm run build` all clean. Dev
  server boots and serves without error.
- No live-backend verification needed beyond what's already
  live — every query/mutation this dashboard calls was already exercised
  (or built and covered by existing RLS) in Prompts 2/4/6. Still worth a
  manual pass once Builder has time: as a seller, confirm → ship → deliver
  a real order and watch My Listings flip that listing to sold, watch
  Earnings update, and confirm the buyer's tracking page and review unlock
  reflect it (closing the loop Prompt 6 flagged as untestable until this
  dashboard existed).

### Regression fix — buyer Orders/tracking blank-page crash (2026-07-12)

Builder's manual pass on the seller dashboard (predicted above) surfaced
exactly the gap the Prompt 6 entry flagged as untestable until now — and
it found a real bug: clicking "My Orders" as a buyer navigated to a blank
page. Full write-up in **BUGS.md #14**; summary here since it required a
type change shared across both buyer and seller order pages.

**Root cause**: `OrderWithDetails.listing` was typed as always-present,
but it's a Postgrest embed subject to the `listings` table's own RLS
(`status = 'active' or seller_id = auth.uid()`). Once the seller dashboard
shipped a real "Mark as Delivered" button, a delivered order's listing
actually flips to `sold` for the first time via the app — and a buyer
(not the seller) viewing that order then fails the listings SELECT policy,
so the embedded `listing` comes back `null`. `OrdersPage.tsx` and
`OrderTrackingPage.tsx` both accessed `order.listing.title` /
`.listing_images` unguarded, so this threw during render and blanked the
page (no error boundary exists in this app). The vulnerable code was
written in Prompt 6; Prompt 7 (seller dashboard) is what first made the
code path reachable, which is why it only surfaced now.

**Fix**: widened `OrderWithDetails.listing` to nullable; added real
fallback UI ("Listing no longer available") to the two buyer-facing pages
that can genuinely hit it; added a documented non-null assertion to the
two seller-facing tab components that structurally can't (a seller always
has read access to their own listing). Diagnosed via a reproduction test
written *before* the fix (confirmed the exact `TypeError` and line), which
became the permanent regression test after the fix went in:
`src/pages/orders/__tests__/OrdersPage.test.tsx` and
`OrderTrackingPage.test.tsx` (3 tests total, both render an order with
`listing: null` and assert the fallback renders instead of crashing).

**Seller Dashboard functionality preserved**: `MyOrdersTab`/`EarningsTab`
changes are type-only (a non-null assertion plus a comment) — no
behavior change, confirmed by the full test suite staying green (70/70
after this fix, no regressions).

**Verified**: `tsc -b`, `vitest run` (**70/70 pass**: 67 prior + 3 new
regression tests), `oxlint`, `npm run build` all clean. Not yet
re-confirmed live by Builder — worth closing the loop on the original
manual-test report by clicking "My Orders" again as the buyer on the
account that had a delivered order.

### Regression fix — buyer Chat blank-page crash (2026-07-12)

Builder's next status check ("Buyer Chat broken") found the identical bug
class immediately after the Orders fix above, in a second feature. Full
write-up in **BUGS.md #15**; same reproduce-with-a-test-first method as
#14.

**Root cause**: `ConversationWithParticipants.listing` (Prompt 5, Chat) is
built from the exact same kind of embedded `listings` resource as
`OrderWithDetails.listing` was, subject to the same RLS
(`status = 'active' or seller_id = auth.uid()`) — and was typed
non-nullable for the same reason. Once a listing is marked sold, a buyer's
embedded `listing` on their conversation about it comes back `null`.
`ChatInboxPage.tsx` and `ChatThreadPage.tsx` both accessed
`conversation.listing.title` unguarded (four call sites total). This was
missed while fixing #14 because that fix was scoped to `OrderWithDetails`
only — the codebase wasn't searched for *other* types with the same
embedded-`listings` shape.

**Fix**: same pattern as #14 — widened the type to nullable, added
"Listing no longer available" / "a listing that is no longer available"
fallbacks at all four call sites (`ChatThreadPage` consolidated three of
them into one derived `listingTitle` variable rather than repeating the
fallback inline). Two new regression test files, each reproducing the
crash before the fix and confirming the fallback after:
`src/pages/chat/__tests__/ChatInboxPage.test.tsx` (2 tests) and
`ChatThreadPage.test.tsx` (1 test).

**Verified**: `tsc -b`, `vitest run` (**73/73 pass**: 70 prior + 3 new),
`oxlint`, `npm run build` all clean. Not yet re-confirmed live by Builder.

**Open follow-up, not done in this pass**: this is now the *second* time
the same embedded-`listings`-can-be-null gap was found in two unrelated
features built at different times. No other hand-written type in
`types/database.ts` currently embeds `listings`, so there's nothing left
to audit today — but see the new Architectural decisions entry below for
what to check before adding the next one.

### Prompt 9 — Profiles and reviews (2026-07-11)

Closed the remaining PRD §7.11/§7.12 gaps: real public profiles, the
own-profile purchase/sales/review history sections, review editing, and a
consistent seller-rating display everywhere it appears.

**Migration**: `018_fix_reviews_update_policy.sql` fixes BUGS.md #13 (the
tautological `reviews` UPDATE `with check`, same idiom as migrations
013/014/017) and additionally freezes `order_id`, which the original
policy never constrained at all — full reasoning in BUGS.md #13. Not yet
run against the live project; needs the same SQL Editor walkthrough as
prior migrations before review editing is used against production data.

**New pure module**: `src/lib/reviewRules.ts` — `canLeaveReview` and
`canEditReview`, mirroring the "one review per order" invariant (enforced
at the DB level by a unique constraint on `reviews.order_id`) the same way
`orderStateMachine.ts` mirrors the orders trigger. 12 tests in
`src/lib/__tests__/reviewRules.test.ts` cover both functions across every
role/status/existing-review combination, including the core "second
review is blocked" case the user explicitly asked to be tested.

**New shared components** (all under `src/components/reviews/` and
`src/components/profiles/`, extracted because a second real call site
existed for each — same bar as `ListingCard`/`ListingBrowser` in Prompt 4):
- `StarRating.tsx` — read-only stars, `role="img"` with a full text
  `aria-label` (e.g. "4 out of 5 stars"). Used on the tracking page's "Your
  review" card and every `ReviewListItem`.
- `StarRatingInput.tsx` — the accessible interactive picker the user
  explicitly required: native `<button>`s (keyboard-operable via Tab +
  Enter/Space with zero custom key handling), `role="group"` labelled via
  `useId()`, per-star `aria-label`/`aria-pressed` (selection state isn't
  color-only), and a visible **and** screen-reader-readable text
  equivalent ("3 out of 5" / "Not rated") next to the stars. 8 tests in
  `StarRatingInput.test.tsx`, including real keyboard-interaction tests
  (`userEvent.tab()` + `{Enter}`/`{Space}`), not just click simulation.
- `ReviewModal.tsx` — extracted from an inline sub-component that used to
  live inside `OrderTrackingPage.tsx`, and extended with an optional
  `existingReview` prop so the same modal handles both create (`createReview`)
  and edit (`updateReview`) by branching on whether it was passed.
- `ReviewListItem.tsx` — reviewer avatar/name/date/stars/comment card, used
  by both `PublicProfilePage` and the new `ReviewsReceivedSection`.
- `RatingSummary.tsx` — the avg-rating + review-count readout, now the
  single source of that markup wherever it's needed (`ProductDetailPage`'s
  seller card and `PublicProfilePage`'s header) so it renders identically
  everywhere, per the user's explicit "shows consistently across cards,
  product detail, and profiles" requirement. `ListingCard` doesn't render
  seller info, so it had no pre-existing duplicate to replace.

**New page**: `src/pages/profile/PublicProfilePage.tsx` replaces the
hardcoded placeholder that used to live in `Placeholders.tsx`. Fetches
profile (`fetchProfile`), active-only listings (new
`fetchActiveListingsBySeller` query function — active only, unlike the
seller's own dashboard which needs every status), and reviews
(`fetchReviewsForSeller`) as three independent `useQuery` calls. Renders
display name, avatar, state/city, `RatingSummary`, bio, an active-listings
grid, and a reviews list — structurally cannot expose email, since
`profiles` has no email column to begin with.

**Own profile additions**: three new sections render below the existing
edit form in `ProfilePage.tsx` (only once profile setup is already
complete, matching the page's existing `isSetupFlow` gate) —
`PurchaseHistorySection` (buyer orders, `fetchBuyerOrders`, query key
`["orders", "buyer", userId]` — same key `OrdersPage` already uses, so the
cache is shared), `SalesHistorySection` (mirror, `fetchSellerOrders`, key
`["orders", "seller", userId]` matching `MyOrdersTab`/`EarningsTab`), and
`ReviewsReceivedSection` (`fetchReviewsForSeller`, read-only — no edit
affordance, since the PRD is explicit that sellers cannot alter reviews
they receive). Each order card links to `/orders/:id`. All three take
`userId` as a prop rather than calling `useAuth()` internally, since
`ProfilePage` already has it.

**OrderTrackingPage**: now imports the extracted `ReviewModal`/`StarRating`
instead of its old inline copies, and the old inline `canReview` boolean
was replaced with `canLeaveReview`/`canEditReview` from `reviewRules.ts`.
Added an "Edit" button on the existing "Your review" card, wired to open
the same `ReviewModal` with `existingReview` set, which switches it into
edit mode.

**Verified**: `tsc -b --force` clean, `vitest run` — **93/93 pass** (13
files; 20 new tests across `reviewRules.test.ts` and
`StarRatingInput.test.tsx`, no regressions in the other 11 files including
`OrderTrackingPage.test.tsx`), `oxlint` clean (same 3 pre-existing warnings
in untouched files, no new ones), `npm run build` clean. Not yet
click-tested live by Builder — migration 018 needs to be run first.

---

## Architectural decisions

- **State/session management**: a single `AuthContext` is the source of
  truth for `user`/`session`/`profile` app-wide, hydrated once via
  `getSession()` then kept in sync by `onAuthStateChange`. Pages never call
  `supabase.auth` directly — they go through `lib/auth.ts` helpers, and read
  identity via `useAuth()`.
- **Profile completeness heuristic**: a `profiles` row always exists (a DB
  trigger creates it on `auth.users` insert, per migration 002) with
  `state` defaulting to `''`. The app treats `profile.state === ""` as
  "needs profile setup" — this is what `ProtectedRoute` gates on. No
  separate "onboarding complete" flag exists in the schema.
- **Forms**: React Hook Form + `zodResolver` everywhere, schemas centralized
  in `src/lib/validation/`. Server errors (from Supabase) are surfaced as a
  separate inline `role="alert"` paragraph, distinct from per-field Zod
  errors.
- **Query layer stays "dumb"**: helpers in `src/lib/queries/` return
  `{ data, error: string | null }` and do no business logic. Pages/contexts
  decide what to do with errors (toast, inline text, etc.).
- **Reset-password dual-mode on one route**: rather than a separate route,
  `/auth/reset-password` detects `#type=recovery` in the URL hash (checked
  synchronously on mount) and listens for the `PASSWORD_RECOVERY` auth event
  as a fallback, then swaps from "request a link" to "set a new password" UI.
  This matches the `redirectTo` Supabase is configured to use.
- **`Database` type shape must satisfy `@supabase/postgrest-js`'s
  `GenericSchema`**, which requires a `Relationships` array on every table
  entry — not just `Row`/`Insert`/`Update`. This is easy to omit when
  hand-writing types (as this project does, pending real `supabase gen
  types`) and fails silently as `never` typed mutations rather than a clear
  error. Worth remembering if `database.ts` is regenerated or hand-edited
  again.
- **Shared query-layer types live in `src/lib/queries/types.ts`, not
  redeclared per file.** BUGS.md issue #3 (Prompt 3) documented that all 5
  query modules independently declared identical `QueryResult<T>`
  interfaces, which `index.ts`'s `export *` made ambiguous. Prompt 4 applied
  the fix that issue recommended instead of patching around it again:
  extracted one shared `QueryResult<T>` into `types.ts`, all query modules
  (including the new `categories.ts`) import it. If a 6th query module is
  added, import from `types.ts` — don't redeclare.
- **Mutations use direct async handlers with RHF's `isSubmitting`, not
  `useMutation`.** Prompt 3's auth/profile forms call query helpers directly
  inside `onSubmit` and rely on React Hook Form's `formState.isSubmitting`
  for loading state — there's no `useMutation` anywhere in the codebase.
  Prompt 4 followed that precedent for `ListingFormPage` and
  `ProductDetailPage`'s delete flow (plain `useState` for `isDeleting`)
  rather than introducing `useMutation` as a second mutation paradigm.
  `useQuery` *is* used for reads (new in Prompt 4, justified by the
  explicit "TanStack Query for fetching/caching" requirement) — writes
  invalidate the relevant query keys manually via `queryClient.invalidateQueries()`
  after the direct async call succeeds.
- **Category URLs use the human-readable `slug`, not the `id`.** `/category/:slug`
  and the `SearchPage` `?category=` param both use the category slug.
  Category `id` (a uuid) is only resolved client-side from the cached
  `["categories"]` query when it's actually needed for a `categoryId` filter
  argument. This keeps URLs shareable/readable and means `HomePage`,
  `SearchPage`, and `CategoryPage` all share one `["categories"]` cache
  entry instead of each fetching it separately.
- **Listing photo upload is create-then-attach, not atomic.** `uploadListingPhoto`
  requires a `listingId` (the storage RLS policy checks the listing already
  exists and is owned by the caller), so `ListingFormPage` always calls
  `createListing`/`updateListing` first and uploads photos in a second step.
  If a photo upload fails after the listing row was created, the listing
  still exists (not rolled back) — the user sees a toast saying photos
  failed and can retry adding them from the edit page. This mirrors how
  Prompt 3's avatar upload already behaves (`updateProfile` succeeds
  independently of `uploadAvatar`).
- **URL-state logic is extracted into plain functions, not left inline in
  components.** `src/lib/listingFilters.ts` has zero React/React Router
  imports — it only knows about `URLSearchParams` and the `ListingFilters`
  query shape. The `useListingFilters` hook is a thin adapter on top. This
  split exists specifically so filter/URL logic can be unit tested without
  rendering a component tree or mocking the router; reuse this pattern
  (pure mapping module + thin hook) for any future feature that needs
  URL-synced state (e.g. a future Orders status filter).
- **Cross-page UI is extracted into a shared component when two pages
  need the literal same behavior, not just similar-looking markup.**
  `ListingBrowser` exists because the PRD explicitly requires Category to
  reuse Search's filter bar — it's parametrized (`lockedCategory`) rather
  than duplicated. Don't reach for this pattern preemptively; `ListingCard`
  (Prompt 4) and `ListingBrowser` (this entry) were both extracted only
  once a second real call site existed, not in anticipation of one.
- **Realtime subscriptions always refetch on `SUBSCRIBED`, not just on
  mount.** `REALTIME_SUBSCRIBE_STATES.SUBSCRIBED` fires on the initial
  connect *and* on every automatic reconnect after a dropped connection —
  Supabase Realtime is a live feed with no replay/durability guarantee, so
  anything that happened while disconnected is silently lost unless the
  client explicitly refetches when it reconnects. `chat.ts`'s
  `subscribeToMessages` exposes this via an `onStatusChange` callback;
  reuse that shape (status callback → `queryClient.invalidateQueries()` on
  `SUBSCRIBED`) for any future Realtime subscription (e.g. Orders status
  updates), rather than assuming the initial fetch + live stream is enough.
- **Realtime payloads only carry the raw table row, never joined data.**
  A `postgres_changes` event's `payload.new` matches the base table type,
  not any `select()` embed you use elsewhere for the same table. When the
  UI needs related data for a live-inserted row (e.g. the sender's profile
  for a new message), resolve it from data already loaded client-side
  (`ChatThreadPage` matches `sender_id` against the conversation's already-
  fetched `buyer`/`seller`) instead of issuing a fetch per realtime event.
- **When a DB trigger enforces a state machine, mirror it in a pure,
  tested client-side module — don't re-derive the rules ad hoc per
  component.** `orderStateMachine.ts` is a direct transcription of
  migration 008's trigger. Any future state machine enforced by a trigger
  (there's only Orders today) should follow the same shape: one pure module
  with a transitions table, `canTransitionX`/`getAvailableActions`-style
  functions, and tests that enumerate the trigger's full truth table —
  not scattered `if` checks in whichever page happens to render the button.
- **RLS `with check` gaps hide in what's *missing*, not just what's
  wrong.** Migrations 013/014 (Prompt 5) fixed tautological checks;
  migration 017 (this prompt) fixed an UPDATE policy with *no* `with check`
  at all, which is arguably worse — it silently allows every column to
  change, not just one. When adding or reviewing any RLS UPDATE policy,
  explicitly ask "which columns must never change here?" and write a
  `with check` for them, even if today's client code would never send
  those columns — RLS is the last line of defense against a client that
  doesn't go through the app's own query helpers at all.
- **A read-only "derived view" over data another tab already fetches
  should be a pure function, not its own query.** Earnings (Prompt 7) is a
  computation over the exact same order list My Orders already fetches —
  sharing the query key means one fetch serves both, and `calculateEarnings`
  stays trivially unit-testable with plain arrays, no mocking. Reach for
  this shape (shared query key + pure derive function) before adding a new
  fetch whenever a feature is "the same data, summarized differently."
- **Any hand-written type that embeds `listings` via a foreign key must be
  nullable, and this has to be checked per-type, not just once.**
  Confirmed twice now (BUGS.md #14 in `OrderWithDetails`, #15 in
  `ConversationWithParticipants`) — `listings` RLS is
  `status = 'active' or seller_id = auth.uid()`, so any embed of it is
  null for a non-owning caller once the listing stops being active. Before
  adding a new hand-written type with a `listings!<fkey>(...)` embed
  (`grep -rn "listings!" src/lib/queries/` to find every current embed
  site), default it to nullable and add fallback UI at every call site up
  front — don't wait for a third feature to hit this the hard way.
- **The "pure module mirrors a DB invariant" pattern extends past state
  machines.** `reviewRules.ts` (Prompt 9) applies the same shape
  `orderStateMachine.ts` established to a different kind of invariant — not
  a trigger-enforced transition table, but a unique-constraint-backed "one
  review per order" rule. Whenever a UI needs to gate an action based on a
  rule the database also enforces (a trigger, a unique constraint, an RLS
  check), write it once as a pure, tested function and call it from the
  component, rather than re-deriving the condition inline as a one-off
  boolean.

---

## Completed features (against PRD §7)

| PRD § | Feature | Status |
|---|---|---|
| 7.1 | User authentication | ✅ Done and verified live (signup, email verification, login, logout, session persistence, password reset, protected routes, profile setup — confirmed against a real Supabase project on 2026-07-04) |
| 7.2 | Home feed | ✅ Done (Prompt 4) — featured strip, recently added grid, category row, all real data, skeleton loading states |
| 7.3 | Categories | ✅ Done (Prompt 4) — real seeded categories; category pages reuse the exact same filter bar as Search (`ListingBrowser`, added 2026-07-11) |
| 7.4 | Search and filter | ✅ Done (Prompt 4, hardened 2026-07-11) — text, category, state, city, condition, price range, sort; fully synced to URL query string; skeleton loading; accessible labels |
| 7.5 | Product listing (CRUD) | ✅ Done (Prompt 4) — create/edit/delete, 1–6 photo upload, seller-only edit/delete |
| 7.6 | Product details | ✅ Done (Prompt 4) — gallery, seller card, condition/location/price/description, owner vs buyer actions |
| 7.7 | In-app chat | ✅ Done (Prompt 5) — realtime, scoped to a listing, create-or-reuse, optimistic send, unread tracking. Migrations applied and confirmed 2026-07-11; manual click-through still outstanding (see Known assumptions) |
| 7.8 | Orders (mock flow) | ✅ Done (Prompt 6 buyer side + Prompt 7 seller side) — create with price snapshot, cancel while pending, duplicate-open-order prevention, and now seller-side confirm/ship/deliver from the dashboard. Migrations applied and confirmed 2026-07-11 |
| 7.9 | Order tracking | ✅ Done (Prompt 6) — status timeline from `order_events`, listing snapshot, other party, cancelled renders distinctly |
| 7.10 | Seller dashboard | ✅ Done (Prompt 7, 2026-07-12) — My Listings (status, edit, delete, create entry point), My Orders (advance controls), Earnings (total/count/recent sales, informational banner) |
| 7.11 | User profile | ✅ Done (Prompt 9) — own profile (Prompt 3) now also shows purchase history, sales history, and reviews received; public profile view (`/profile/:id`) is real (avatar, location, rating, active listings, reviews — no email) |
| 7.12 | Ratings and reviews | ✅ Done (Prompt 9) — buyer can leave a 1–5 star rating + optional comment once delivered, one per order (DB unique constraint + client-mirrored `reviewRules.ts`), and can edit their own review; sellers cannot alter reviews they receive; reviews render on the seller's public profile and own-profile "Reviews Received"; avg rating shown consistently via a shared `RatingSummary` component |

Data/backend layer (schema + typed query helpers) exists for all of the
above already (Prompt 2) — remaining work is wiring real pages to it, the
same pattern Prompt 3 (auth) and Prompt 4 (listings) applied.

---

## Database migrations

Run in order; 001–011 predate this doc, 012 was added in Prompt 3. Prompt 5
(Chat) added three (013–015). Prompt 6 (Orders) added two more (016–017).
Prompt 7 (Seller dashboard) added none — it only wired up mutations and
queries that already existed against schema/RLS already live. Prompt 9
(Profiles and reviews) added one more (018).

**Status: migrations 001–017 have been run successfully against the live
Supabase project as of 2026-07-11.** 013–014 were confirmed individually
during a guided walkthrough; 015 was walked through in that same session
but its success wasn't explicitly confirmed in chat until afterward
(Builder confirmed retroactively: it completed successfully during that
session); 016–017 were walked through and confirmed individually in a
follow-up session. **018 has been written but not yet run against the live
project** — needs the same SQL Editor walkthrough before review editing is
used against production data.

| # | File | Purpose |
|---|---|---|
| 001 | `001_enums.sql` | listing_condition, listing_status, order_status enums |
| 002 | `002_profiles.sql` | profiles table + RLS + `handle_new_user` trigger |
| 003 | `003_categories.sql` | categories table + RLS |
| 004 | `004_listings.sql` | listings table + RLS |
| 005 | `005_listing_images.sql` | listing_images table + RLS |
| 006 | `006_conversations.sql` | conversations table + RLS |
| 007 | `007_messages.sql` | messages table + RLS, Realtime |
| 008 | `008_orders.sql` | orders table + RLS + state transition enforcement |
| 009 | `009_order_events.sql` | order_events table + RLS |
| 010 | `010_reviews.sql` | reviews table + RLS + rating trigger |
| 011 | `011_storage.sql` | `listing-images` bucket + RLS |
| 012 | `012_avatar_storage.sql` | `avatars` bucket + RLS (owner-scoped by `{user_id}/...` path) |
| 013 | `013_fix_messages_mark_read_policy.sql` | Fixes a tautological RLS check that let a participant rewrite a message's `sender_id` while marking it read (BUGS.md #10). **Applied.** |
| 014 | `014_conversations_reuse_update_policy.sql` | Adds the missing UPDATE policy `upsertConversation`'s reuse path needs (BUGS.md #11). **Applied.** |
| 015 | `015_conversations_last_message_preview.sql` | Denormalizes `last_message_body`/`last_message_sender_id` onto `conversations` for the inbox preview, no bug. **Applied.** |
| 016 | `016_orders_one_open_per_buyer_listing.sql` | Partial unique index: at most one open order per (listing, buyer). **Applied.** |
| 017 | `017_orders_freeze_immutable_columns.sql` | Adds the missing UPDATE `with check` on `orders` — without it, `amount`/`listing_id`/`buyer_id`/`seller_id` could be silently rewritten by either participant as long as `status` wasn't touched (BUGS.md #12). **Applied.** |
| 018 | `018_fix_reviews_update_policy.sql` | Fixes the tautological UPDATE `with check` on `reviews` and additionally freezes `order_id`, which the original policy never constrained (BUGS.md #13). **Not yet applied.** |

No seed script exists yet (PRD §9 calls for one) — still outstanding.

---

## Known assumptions / open questions

- "Profile complete" = `profile.state !== ""`. If the product wants a more
  explicit onboarding flag later, this heuristic needs revisiting alongside
  a schema change.
- Email confirmation on/off is a Supabase dashboard setting, not enforced by
  the app — both paths (immediate session vs. "check your email") are
  handled, but which one actually fires depends on that setting.
- ~~Auth flows are unverified against a live Supabase project~~ **Resolved
  2026-07-04**: signup, email verification, login, and dashboard access are
  now confirmed working against a real Supabase project. Password reset /
  recovery-link flow specifically has not yet been manually clicked through
  on the live project (only unit/typecheck verified) — worth a quick manual
  pass before considering it fully proven.
- Any Supabase project (fresh or pre-existing) needs migrations 001–012 run
  once via the SQL Editor before the app is usable — see the "Database
  migrations" section below. If auth signups happened before migrations
  were run, existing accounts also need the one-time `profiles` backfill
  query documented in the 2026-07-04 log entry above.
- **Chat (Prompt 5): migrations 013–015 are all confirmed applied**
  (2026-07-11) — see "Database migrations" above. Still needs the manual
  click-through: open a listing as a buyer, click Message Seller, send a
  message, confirm it appears live in a second browser/account for the
  seller, confirm the inbox's last-message preview renders, and confirm
  the unread dot clears when a thread is opened.
- **Orders (Prompt 6): migrations 016–017 are confirmed applied**
  (2026-07-11) — see "Database migrations" above. Still needs the manual
  click-through: buy an item, confirm the order and its tracking page
  render correctly (price snapshot, timeline), try Buy Now again on the
  same listing and confirm it redirects to the existing order instead of
  duplicating, cancel a pending order and confirm it renders as cancelled.
  The seller-side advance-to-delivered → review-unlock → listing-marked-sold
  chain can't be fully exercised until the seller dashboard (next prompt)
  adds the Confirm/Ship/Deliver buttons.
- **Migration 018 (fixes the `reviews` UPDATE policy, BUGS.md #13) has not
  yet been run against the live Supabase project.** The review-editing UI
  built in Prompt 9 calls `updateReview`, which will currently hit the
  *old*, still-live tautological policy until 018 is applied via the SQL
  Editor (same process as 013/014/017) — run it before Builder click-tests
  editing a review.
- No Playwright e2e suite yet, despite being named in the PRD tech stack.
  Claude's own verification of Prompt 4 stopped at build/tests/lint plus a
  live anonymous-client data-layer smoke script — no browser automation
  tool is available in this environment. **Resolved 2026-07-11**: Builder
  manually clicked through the authenticated flows (create/edit/delete a
  listing with photos, browse and filter via Home/Search/Category) against
  the live project and accepted Prompt 4 — no defects reported. The
  Playwright-suite gap itself remains open for future prompts; each new
  feature will need the same kind of manual acceptance pass until it exists.
- No seed data script yet (PRD §9). The live project had 0 listings as of
  2026-07-10 (confirmed via the anonymous smoke test); Builder's manual
  testing since then will have added at least one real listing.
- `SellerDashboardPage` ("My Listings" tab) is not wired to real data yet —
  a seller currently has no in-app list of their own listings; they can only
  reach an existing listing via its Product Detail page or a direct
  `/sell/:id` URL. `fetchListingsBySeller` already exists and is unused.

---

## Required environment variables

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Copy `.env.example` → `.env.local` and fill in real values. Without them the
app falls back to a placeholder Supabase URL and all backend calls fail.

---

## Next task

**Prompt 4 is closed** (Listings CRUD from 2026-07-10 + Discovery hardening
from 2026-07-11, both manually tested and accepted by Builder against the
live project).

**Prompt 5 (Chat): migrations confirmed applied.** Still needs the manual
click-through described in "Known assumptions" above before considering it
closed.

**Prompt 6 (Orders/tracking): migrations confirmed applied.** Still needs
the manual click-through described in "Known assumptions" above.

**Prompt 7 (Seller dashboard) is implementation-complete, no migrations
needed.** Worth a manual pass confirming the full seller-side loop end to
end (confirm → ship → deliver an order, watch My Listings flip to sold and
Earnings update) — see the "Verified" note in the 2026-07-12 log entry
above.

**Prompt 9 (Profiles and reviews) is implementation-complete.** §7.11 and
§7.12 are both now ✅ in the table above. **Before Builder click-tests
review editing or the public profile, migration 018 needs to be run
against the live Supabase project** (SQL Editor, same process as
013/014/017) — see "Database migrations" and "Known assumptions" above.
After that, a manual pass: view another user's public profile, leave a
review after a delivered order, edit it, confirm it appears on the
seller's public profile and their own "Reviews Received" section, and
confirm the avg rating matches across the product page, the public
profile, and (once more than one review exists) after editing one.

Also still outstanding, unrelated to any specific PRD section: no seed
script (§9), no Playwright suite.
