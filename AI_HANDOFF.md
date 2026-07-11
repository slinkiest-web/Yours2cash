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
- **Not yet done**: an authenticated, interactive click-through (create a
  listing with photos, see it on Home/Search/Category, open it, edit it,
  delete it) against the live project. That requires either a real logged-in
  session in a browser or browser-automation tooling neither available in
  this environment — same limitation noted at the end of Prompt 3. Handed
  off to the user with a specific checklist (see chat for the checklist);
  Prompt 4 should not be considered closed until that pass comes back clean.

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

---

## Completed features (against PRD §7)

| PRD § | Feature | Status |
|---|---|---|
| 7.1 | User authentication | ✅ Done and verified live (signup, email verification, login, logout, session persistence, password reset, protected routes, profile setup — confirmed against a real Supabase project on 2026-07-04) |
| 7.2 | Home feed | ✅ Done (Prompt 4) — featured strip, recently added grid, category row, all real data |
| 7.3 | Categories | ✅ Done (Prompt 4) — real seeded categories, category browse pages |
| 7.4 | Search and filter | ✅ Done (Prompt 4) — text, category, state, condition, price range, sort; synced to URL query string |
| 7.5 | Product listing (CRUD) | ✅ Done (Prompt 4) — create/edit/delete, 1–6 photo upload, seller-only edit/delete |
| 7.6 | Product details | ✅ Done (Prompt 4) — gallery, seller card, condition/location/price/description, owner vs buyer actions |
| 7.7 | In-app chat | ⏳ Placeholder UI only, query layer exists — **candidate next (Prompt 5)** |
| 7.8 | Orders (mock flow) | ⏳ Placeholder UI only, query layer exists — **candidate next (Prompt 5)** |
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
added no new migrations — Listings uses only tables/buckets that already
existed (`listings`, `listing_images`, `categories`, `listing-images` bucket).
**Status: all 12 have been run successfully against the live Supabase
project as of 2026-07-04.**

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
| **012** | **`012_avatar_storage.sql`** | **`avatars` bucket + RLS (owner-scoped by `{user_id}/...` path)** |

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
- No Playwright e2e suite yet, despite being named in the PRD tech stack.
  This also means Prompt 4's listing flows were verified via build/tests
  plus a live anonymous-client data-layer smoke script (see 2026-07-10 log
  entry), not an actual browser click-through — no browser automation tool
  is available in this environment. **Needs a manual authenticated
  click-through before Prompt 4 is considered fully closed**: create a
  listing with 1–6 photos, confirm it appears on Home/Search/Category,
  open its detail page, edit it (including removing a photo and adding a
  new one), then delete it and confirm it disappears from listings.
- No seed data script yet (PRD §9). As of 2026-07-10 the live project has
  0 listings (confirmed via the anonymous smoke test) — Home/Search/Category
  will show their empty states until either the manual click-through above
  or a seed script adds data.
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

**Immediate: close out Prompt 4.** Run the manual authenticated
click-through described in "Known assumptions" above against the live
project and report back — this implementation is not considered done until
that passes (per this session's instructions).

**After that: Prompt 5 — In-app chat (PRD §7.7) or Orders (PRD §7.8).**
Both have a complete query layer already (`src/lib/queries/chat.ts` /
`orders.ts`) and only placeholder UI in `Placeholders.tsx`
(`ChatInboxPage`, `ChatThreadPage`, `OrdersPage`). PRD ordering and the
Product Detail page's existing "Message Seller" button (already linking to
`/chat/:id`, currently a placeholder thread) both point at Chat as the more
natural next step, but this hasn't been confirmed with the user — ask
before starting either. `SellerDashboardPage` wiring (My Listings tab) is
a smaller, related follow-up worth bundling into whichever prompt comes
next, since `fetchListingsBySeller` is already sitting unused.
