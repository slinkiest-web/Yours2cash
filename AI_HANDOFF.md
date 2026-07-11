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
- **Not verified against the live Supabase project**: migrations 013–015
  have not been run yet (author has no migration-execution access, only the
  anon key) — until they are, `conversations.last_message_body`/
  `last_message_sender_id` don't exist on the live table, and the two RLS
  fixes aren't live either. Needs the same "run migrations via SQL Editor,
  then manually click through" cycle as Prompt 3/4: run 013–015 in order,
  then click Message Seller from a product detail page as one user, send a
  few messages, and (ideally) check from a second account/browser that
  incoming messages appear live without a refresh.

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
| 7.7 | In-app chat | ✅ Done (Prompt 5, 2026-07-11) — realtime, scoped to a listing, create-or-reuse, optimistic send, unread tracking. **Not yet run against the live project** (migrations 013–015 pending) |
| 7.8 | Orders (mock flow) | ⏳ Placeholder UI only, query layer exists — **candidate next** |
| 7.9 | Order tracking | ⏳ Placeholder UI only |
| 7.10 | Seller dashboard | ⏳ Placeholder UI only — "My Listings"/"My Orders" tabs still not wired even though `fetchListingsBySeller` exists |
| 7.11 | User profile | ✅ Own profile done and verified live (Prompt 3); public profile view (`/profile/:id`) still placeholder, does not yet show the seller's real listings |
| 7.12 | Ratings and reviews | ⏳ Placeholder UI only, query layer exists |

Data/backend layer (schema + typed query helpers) exists for all of the
above already (Prompt 2) — remaining work is wiring real pages to it, the
same pattern Prompt 3 (auth) and Prompt 4 (listings) applied.

---

## Database migrations

Run in order; 001–011 predate this doc, 012 was added in Prompt 3. Prompt 4
added no new migrations. Prompt 5 (Chat) added three (013–015).
**Status: 001–012 have been run successfully against the live Supabase
project as of 2026-07-04. 013–015 have NOT been run yet** — author has no
migration-execution access in this environment (anon key only); these need
to go through the SQL Editor like every migration before them.

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
| **013** | **`013_fix_messages_mark_read_policy.sql`** | **Fixes a tautological RLS check that let a participant rewrite a message's `sender_id` while marking it read (BUGS.md #10)** |
| **014** | **`014_conversations_reuse_update_policy.sql`** | **Adds the missing UPDATE policy `upsertConversation`'s reuse path needs — without it, opening the same thread twice was rejected by RLS (BUGS.md #11)** |
| **015** | **`015_conversations_last_message_preview.sql`** | **Denormalizes `last_message_body`/`last_message_sender_id` onto `conversations` for the inbox preview, no bug** |

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
- **Chat (Prompt 5) is implementation-complete but migrations 013–015 have
  not been run against the live project yet** — run them via the SQL
  Editor, in order, before testing Chat at all. Until then, Message
  Seller/the inbox/the thread page will error (missing columns and/or RLS
  rejections on the second `upsertConversation` call). Once migrations run,
  needs the same kind of manual click-through Prompt 3/4 got: open a
  listing as a buyer, click Message Seller, send a message, confirm it
  appears live in a second browser/account for the seller, and confirm the
  unread dot clears when a thread is opened.
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

**Prompt 5 (Chat) is implementation-complete but not yet verified live** —
run migrations 013–015 via the SQL Editor, then do the manual click-through
described in "Known assumptions" above, before considering it closed.

**After that: Orders (PRD §7.8), then Order tracking (§7.9), then Seller
dashboard (§7.10, including finally wiring `fetchListingsBySeller` into
the "My Listings" tab — noted as a gap since Prompt 4), then Ratings and
reviews (§7.12).** Orders has a complete query layer already
(`src/lib/queries/orders.ts`) and only placeholder UI
(`OrdersPage`/`SellerDashboardPage` in `Placeholders.tsx`). Confirm with
the user before starting, per this session's established pattern.
