# Yours2Cash

## Product Requirements Document (MVP)

Version 1.0
Owner: Eniola Ademowo
Status: Draft for build

---

## 1. Overview

Yours2Cash is a recommerce marketplace where people list pre-owned and surplus items for sale, browse listings, chat with sellers, place mock orders, and leave ratings after a transaction. The MVP is a responsive, installable web app (PWA) scoped to Nigeria, using Naira and Nigerian states and cities.

The goal of the MVP is a working, beautiful, accessible marketplace that proves the core loop: list an item, find an item, talk to the seller, place an order, rate the experience. Payments are deliberately out of scope for v1. Orders run through a mock flow with no money moving.

## 2. Goals and non goals

### Goals

Ship a premium looking, minimal marketplace that feels alive on first run through seed data. Prove the buyer and seller loop end to end without real payments. Deliver strong accessibility and an accessible dark mode from day one. Keep the architecture clean enough that Phase 2 (escrow, wallet, notifications) slots in without a rewrite.

### Non goals for v1

Real payments, escrow, or wallet. Wishlist. Push or email notifications. AI features. Seller verification. Admin dashboard. Loyalty and referral. Multi country or multi currency. Native mobile apps.

## 3. Target users

Sellers are individuals and small vendors who want a fast way to list items with photos and manage their sales. Buyers are shoppers looking for good value on pre-owned and surplus goods, who want to vet a seller through chat and reviews before committing.

## 4. Platform and scope

Web only, responsive, installable as a PWA. Single region: Nigeria. Currency: NGN. Location is chosen from Nigerian states and cities.

## 5. Tech stack

Frontend is a Vite React SPA written in TypeScript, styled with Tailwind CSS. Client routing uses React Router. Server state and caching use TanStack Query. Forms use React Hook Form with Zod for validation. Icons use Lucide. The app is a PWA via the Vite PWA plugin with a service worker and web manifest.

Backend is Supabase end to end: Postgres for data, Supabase Auth for accounts and sessions, Supabase Storage for listing images, Supabase Realtime for in app chat, and Row Level Security policies enforcing access rules. All data access rules live in Postgres RLS, not only in the client.

Tooling includes ESLint and Prettier, Vitest and React Testing Library for unit and component tests, and Playwright for a small set of end to end smoke tests. Deployment targets Vercel or Netlify for the frontend, with Supabase hosting the backend.

## 6. Design system

### Brand palette

The palette is built from six brand colors. Deep plum `#3D1119` and oxblood `#51181F` anchor the brand and carry primary actions and dark surfaces. The cool greys `#BABEC1`, `#D4D6D8`, and `#E8E8E8` handle borders, muted text, and light surfaces. White and near black round out the neutrals.

| Token | Light mode | Dark mode | Use |
|---|---|---|---|
| Brand primary | `#51181F` | `#B8434E` (lightened for contrast) | Primary buttons, active states |
| Brand deep | `#3D1119` | `#3D1119` | Dark surfaces, headers |
| Surface | `#FFFFFF` | `#1A0A0E` | Page background |
| Surface raised | `#E8E8E8` | `#241014` | Cards, sheets |
| Border | `#D4D6D8` | `#3A2228` | Dividers, input borders |
| Text muted | `#6B7075` (derived) | `#BABEC1` | Secondary text |
| Text | `#1A1416` (derived) | `#F5F0F1` | Primary text |

Note on accessibility: the raw oxblood on the light greys does not always clear the WCAG AA contrast bar for small text. In dark mode the primary is lightened to a rose tone so text and interactive elements stay legible. All final combinations must be verified to meet WCAG 2.1 AA (4.5:1 for body text, 3:1 for large text and UI components). Derived neutral text colors above are suggestions the agent should tune to pass AA against both themes.

### Typography

Pair a serif display face with a sans serif body. Serif (headings, hero, prices as display): a modern high contrast serif such as Fraunces or Playfair Display. Sans serif (body, UI, labels): Inter or General Sans. Serif carries personality on headings and section titles. Sans carries everything the user reads in volume. Load via Fontsource or self host for PWA offline support rather than blocking on a CDN.

### Feel

Minimal and modern with a premium restraint. Generous whitespace, a clear type scale, soft shadows, rounded but not bubbly corners (around 12 to 16px on cards), and subtle motion on hover and page transitions. Nothing loud. Let product photos and the serif headings do the talking.

### Dark mode

Class based dark mode toggled on the root element, persisted to local storage, defaulting to the system preference. Every color token has a light and dark value, and both themes must pass AA.

### Accessibility baseline

Semantic HTML throughout. All interactive elements reachable and operable by keyboard with a visible focus ring. Images require alt text (listing photos use the product title as a sensible default). Forms use associated labels and inline error text tied to inputs via aria. Color is never the only signal. Respect prefers reduced motion. Target WCAG 2.1 AA.

## 7. Features (MVP)

### 7.1 User authentication

Users sign up with email and password, log in, and log out through Supabase Auth. Sessions persist across reloads. After first sign up the user completes a short profile setup (display name, avatar, default location by state and city, optional bio). Protected routes redirect unauthenticated users to log in. Password reset via email is included.

### 7.2 Home feed

The landing experience for signed in and signed out users. It shows a featured listings strip (a curated or most recent set), a recently added grid, and a category browse row. Listings render as cards with photo, title, price in NGN, condition badge, and location. Signed out users can browse and view; actions that require an account (chat, listing, ordering) prompt sign in.

### 7.3 Categories

Fixed category set: Beauty, Fashion, Electronics, Home and Living, Baby and Kids, Sports and Fitness, Books, Gaming, Others. Each category has its own browse view with the same filter bar as search. Categories are seeded, not user editable in v1.

### 7.4 Search and filter

A search bar matches on title and description. Filters: category, location (state, optionally city), condition, and price range (min and max NGN). Filters combine and reflect in the URL query string so results are shareable and survive refresh. Sort by newest and by price.

### 7.5 Product listing (create, edit, delete)

Authenticated users create a listing by uploading one to six photos to Supabase Storage, entering title, description, price in NGN, category, condition, and location. Listings validate on the client with Zod and on the server with RLS and constraints. Sellers can edit and delete their own listings only. A listing has a status (active, sold, removed). Marking an order delivered can flip the listing to sold.

### 7.6 Product details

A dedicated page per listing showing the photo gallery, title, price, condition, description, category, location, posted date, and a seller summary card (avatar, display name, average rating, review count). Primary actions: Message seller and Buy now (mock order). The seller viewing their own listing sees Edit and Delete instead.

### 7.7 In app chat

Realtime one to one chat between a buyer and a seller, scoped to a listing. Opening a chat from a product creates or reuses a conversation for that buyer, seller, and listing. Messages stream in real time via Supabase Realtime. A conversations inbox lists threads with the other party, last message preview, and unread indicator. Text only in v1, no attachments.

### 7.8 Orders (mock flow, no payment)

Buy now creates an order in a pending state with no money moving. Order states: pending, confirmed, shipped, delivered, cancelled. The buyer can cancel while pending. The seller can advance the order through confirmed, shipped, delivered from the seller dashboard. Delivered unlocks the ability to rate the seller and can mark the listing sold. This is the scaffold that Phase 2 escrow will plug into.

### 7.9 Order tracking

Buyers see their orders with the current state and a simple status timeline (pending to confirmed to shipped to delivered). Each order shows the listing snapshot, the other party, and timestamps for each state change.

### 7.10 Seller dashboard

A seller focused area with three tabs. My Listings: the seller's listings with quick status and edit and delete. My Orders: orders where the user is the seller, with controls to advance order state. Earnings: a read only summary of completed (delivered) order value in NGN. Earnings are informational in v1 since no real money moves.

### 7.11 User profile

The user's own profile shows and edits personal details (display name, avatar, location, bio). It surfaces purchase history (orders as buyer), sales history (orders as seller), and the reviews they have received. A public view of another user's profile shows display name, avatar, location, average rating, review count, and their active listings.

### 7.12 Ratings and reviews

After an order reaches delivered, the buyer can leave a one to five star rating and an optional written review for the seller. One review per order. Reviews appear on the seller's public profile and feed the seller's average rating shown across the app. Sellers cannot edit or delete reviews they receive; buyers can edit their own review.

## 8. Non functional requirements

Performance: home feed and search interactive within a couple of seconds on a mid range Android over 4G. Images served responsibly (compressed on upload where feasible, lazy loaded, correct sizing). Security: RLS on every table so users only read and write what they are allowed to; never trust the client. Reliability: optimistic UI where safe, with clear error and empty states everywhere. Offline: PWA shell loads offline; cached listings viewable, writes require connection. Privacy: only necessary personal data collected; email not shown publicly.

## 9. Seed data

Ship a seed script that populates roughly eight to twelve demo users, all nine categories, forty to sixty listings with placeholder images spread across categories and Nigerian cities, a handful of conversations with messages, several orders across different states, and a set of reviews. The app should look alive and populated on first run.

## 10. Data model

Supabase Postgres. All tables have Row Level Security enabled. `auth.users` is Supabase managed; `profiles` extends it one to one.

### profiles

Extends the auth user with public facing account data.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | references auth.users.id |
| display_name | text | required after profile setup |
| avatar_url | text | nullable, Supabase Storage path |
| bio | text | nullable |
| state | text | Nigerian state |
| city | text | nullable |
| avg_rating | numeric | denormalized, maintained by trigger or view, default 0 |
| review_count | int | denormalized, default 0 |
| created_at | timestamptz | default now |

RLS: anyone can read; a user can insert and update only their own row.

### categories

Fixed lookup set, seeded, not user editable.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| slug | text, unique | e.g. beauty, home-and-living |
| name | text | display name |
| sort_order | int | controls display order |

RLS: read only to all; no client writes.

### listings

A product for sale.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| seller_id | uuid, FK profiles.id | owner |
| title | text | required |
| description | text | required |
| price | numeric | NGN, non negative |
| category_id | uuid, FK categories.id | |
| condition | text | enum: new, like_new, good, fair |
| state | text | Nigerian state |
| city | text | nullable |
| status | text | enum: active, sold, removed, default active |
| is_featured | boolean | default false, drives featured strip |
| created_at | timestamptz | default now |
| updated_at | timestamptz | maintained on update |

RLS: anyone can read active listings; a seller can insert, update, and delete only rows where seller_id is their own id.

### listing_images

Photos for a listing, one to many.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| listing_id | uuid, FK listings.id | on delete cascade |
| storage_path | text | Supabase Storage path |
| position | int | ordering, 0 is primary |

RLS: read follows listing visibility; write allowed only to the listing's seller.

### conversations

A chat thread between a buyer and a seller about a listing.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| listing_id | uuid, FK listings.id | context |
| buyer_id | uuid, FK profiles.id | |
| seller_id | uuid, FK profiles.id | |
| created_at | timestamptz | default now |
| last_message_at | timestamptz | maintained on new message |

Unique on (listing_id, buyer_id, seller_id) so opening chat reuses a thread. RLS: only the buyer or seller in the row can read or write.

### messages

Individual chat messages.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| conversation_id | uuid, FK conversations.id | on delete cascade |
| sender_id | uuid, FK profiles.id | |
| body | text | required |
| read_at | timestamptz | nullable, drives unread badge |
| created_at | timestamptz | default now |

RLS: only participants of the parent conversation can read; a participant can insert messages where sender_id is their own id. Realtime enabled on this table.

### orders

A mock purchase, no money moves in v1.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| listing_id | uuid, FK listings.id | item |
| buyer_id | uuid, FK profiles.id | |
| seller_id | uuid, FK profiles.id | denormalized from listing |
| amount | numeric | NGN snapshot of price at order time |
| status | text | enum: pending, confirmed, shipped, delivered, cancelled |
| created_at | timestamptz | default now |
| updated_at | timestamptz | maintained on state change |

RLS: buyer or seller of the row can read. Buyer can insert (creating pending) and cancel while pending. Seller can advance status through confirmed, shipped, delivered. State transitions enforced by a check or a trigger, not just the client.

### order_events

Timeline entries powering order tracking.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| order_id | uuid, FK orders.id | on delete cascade |
| status | text | the state entered |
| created_at | timestamptz | default now |

RLS: read follows the parent order. Written by the same actor allowed to make the transition (ideally via trigger on orders update).

### reviews

Buyer rates seller after delivery.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| order_id | uuid, FK orders.id, unique | one review per order |
| reviewer_id | uuid, FK profiles.id | the buyer |
| seller_id | uuid, FK profiles.id | subject |
| rating | int | 1 to 5 |
| comment | text | nullable |
| created_at | timestamptz | default now |

RLS: anyone can read; only the buyer on a delivered order can insert, and only edit their own row. A trigger recomputes the seller's avg_rating and review_count on insert and update.

### Phase 2 tables (not built in v1, noted for schema headroom)

wishlists (user_id, listing_id), payments and escrow ledger, wallets and wallet_transactions, notifications, seller_verification, referrals. The v1 schema is designed so these attach without reshaping existing tables.

## 11. Key user flows

Seller lists an item: sign in, open create listing, upload photos, fill details, publish, see it live in the feed and in My Listings. Buyer discovers and buys: browse or search, open a product, message the seller, place a mock order, track it to delivered, leave a review. Seller fulfils: see the new order in My Orders, advance it through confirmed, shipped, delivered, watch earnings update.

## 12. Success criteria for the MVP

A new user can sign up, complete profile setup, and log back in. A seller can create, edit, and delete a listing with photos. A buyer can search and filter and reliably find a seeded item. Two users can chat in real time. A full mock order runs from pending to delivered with a working tracking timeline. A delivered order can be reviewed and the seller's rating updates everywhere. Dark mode and light mode both pass WCAG AA on core screens.
