-- Migration 016: prevent duplicate open orders
--
-- A buyer can legitimately place more than one order for the same listing
-- over time (a previous order was cancelled, or they're reordering after a
-- prior one was delivered), so a blanket unique constraint on
-- (listing_id, buyer_id) would be wrong. What should never happen is two
-- *open* (not yet delivered or cancelled) orders for the same buyer and
-- listing at once — that's just a confusing double order. The app already
-- checks for this before inserting (fetchOpenOrderForListing in
-- lib/queries/orders.ts), but a partial unique index closes the race
-- condition (double-click, two tabs) at the database level too.

create unique index orders_one_open_per_buyer_listing
  on public.orders (listing_id, buyer_id)
  where status in ('pending', 'confirmed', 'shipped');
