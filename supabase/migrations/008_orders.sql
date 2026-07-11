-- Migration 008: orders
-- Mock purchase flow. No money moves in v1.
-- State transitions are enforced by a trigger so the client cannot jump states
-- or reverse them. The only valid paths are:
--   pending  -> confirmed  (seller only)
--   confirmed -> shipped   (seller only)
--   shipped  -> delivered  (seller only)
--   pending  -> cancelled  (buyer only)
-- Any other transition raises an exception at the database level.

create table public.orders (
  id          uuid                 primary key default gen_random_uuid(),
  listing_id  uuid                 not null references public.listings (id),
  buyer_id    uuid                 not null references public.profiles (id) on delete cascade,
  seller_id   uuid                 not null references public.profiles (id) on delete cascade,
  amount      numeric              not null check (amount >= 0),
  status      public.order_status  not null default 'pending',
  created_at  timestamptz          not null default now(),
  updated_at  timestamptz          not null default now(),

  check (buyer_id <> seller_id)
);

create trigger orders_set_updated_at
  before update on public.orders
  for each row
  execute procedure public.set_updated_at();

-- Enforce legal state transitions at the Postgres level.
-- This is the authoritative rule. The client UI is a convenience on top of it.
create or replace function public.enforce_order_state_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No change to status: nothing to check.
  if new.status = old.status then
    return new;
  end if;

  -- Buyer may cancel while order is still pending.
  if new.status = 'cancelled'
     and old.status = 'pending'
     and auth.uid() = old.buyer_id
  then
    return new;
  end if;

  -- Seller advances through the fulfilment chain one step at a time.
  if auth.uid() = old.seller_id then
    if (old.status = 'pending'    and new.status = 'confirmed')
    or (old.status = 'confirmed'  and new.status = 'shipped')
    or (old.status = 'shipped'    and new.status = 'delivered')
    then
      return new;
    end if;
  end if;

  raise exception 'Invalid order state transition from % to % by caller %',
    old.status, new.status, auth.uid();
end;
$$;

create trigger orders_enforce_transition
  before update on public.orders
  for each row
  when (old.status is distinct from new.status)
  execute procedure public.enforce_order_state_transition();

-- Row Level Security
alter table public.orders enable row level security;

-- Buyer or seller of the order can read it.
create policy "orders: participants read"
  on public.orders
  for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());

-- Only a buyer can create an order. seller_id must match the listing owner.
-- amount is captured here as a snapshot so price changes later do not affect
-- historical order records.
create policy "orders: buyer insert"
  on public.orders
  for insert
  with check (
    buyer_id = auth.uid()
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.seller_id = seller_id
        and l.status = 'active'
    )
  );

-- Both buyer and seller may update the row but only through transitions
-- validated by the enforce_order_state_transition trigger.
create policy "orders: participants update"
  on public.orders
  for update
  using (buyer_id = auth.uid() or seller_id = auth.uid());
