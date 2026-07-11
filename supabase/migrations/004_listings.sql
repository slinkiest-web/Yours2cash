-- Migration 004: listings
-- Core product entity. Public read is scoped to status = 'active' so removed
-- and sold listings are invisible to buyers but remain in the database for order
-- history and audit purposes.

create table public.listings (
  id           uuid                     primary key default gen_random_uuid(),
  seller_id    uuid                     not null references public.profiles (id) on delete cascade,
  title        text                     not null check (char_length(title) between 3 and 120),
  description  text                     not null check (char_length(description) >= 10),
  price        numeric                  not null check (price >= 0),
  category_id  uuid                     not null references public.categories (id),
  condition    public.listing_condition not null,
  state        text                     not null,
  city         text,
  status       public.listing_status    not null default 'active',
  is_featured  boolean                  not null default false,
  created_at   timestamptz              not null default now(),
  updated_at   timestamptz              not null default now()
);

-- Keep updated_at current automatically on every row change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger listings_set_updated_at
  before update on public.listings
  for each row
  execute procedure public.set_updated_at();

-- Row Level Security
alter table public.listings enable row level security;

-- Anyone (including anonymous visitors) can read active listings.
-- Removed and sold listings are not exposed publicly.
create policy "listings: public read active"
  on public.listings
  for select
  using (status = 'active' or seller_id = auth.uid());

-- Authenticated sellers can insert listings where they own the seller_id column.
create policy "listings: seller insert"
  on public.listings
  for insert
  with check (seller_id = auth.uid());

-- Sellers can update only their own listings.
-- seller_id cannot be changed (it must equal auth.uid() both before and after).
create policy "listings: seller update"
  on public.listings
  for update
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

-- Sellers can hard delete only their own listings.
-- In practice the app sets status = 'removed' but true delete is also secured.
create policy "listings: seller delete"
  on public.listings
  for delete
  using (seller_id = auth.uid());
