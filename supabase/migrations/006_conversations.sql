-- Migration 006: conversations
-- One conversation per (listing, buyer, seller) triple. The unique constraint
-- means opening a chat from a product page reuses an existing thread rather
-- than creating duplicates.

create table public.conversations (
  id               uuid        primary key default gen_random_uuid(),
  listing_id       uuid        not null references public.listings (id) on delete cascade,
  buyer_id         uuid        not null references public.profiles (id) on delete cascade,
  seller_id        uuid        not null references public.profiles (id) on delete cascade,
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz not null default now(),

  -- Enforce that a buyer cannot open two threads with the same seller about
  -- the same listing. Covers the race condition if a client sends two requests.
  unique (listing_id, buyer_id, seller_id),

  -- A user cannot message themselves.
  check (buyer_id <> seller_id)
);

-- Row Level Security
alter table public.conversations enable row level security;

-- Only the buyer or seller named in the row can see the conversation.
create policy "conversations: participants read"
  on public.conversations
  for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());

-- Only the buyer can start a conversation (the buyer is the one initiating
-- contact from a product page). seller_id must match the actual listing owner.
create policy "conversations: buyer insert"
  on public.conversations
  for insert
  with check (
    buyer_id = auth.uid()
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.seller_id = seller_id
    )
  );

-- Both participants can update last_message_at (done via message trigger).
-- Direct updates are intentionally not exposed to the client API.
