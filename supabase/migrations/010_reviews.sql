-- Migration 010: reviews
-- Buyer rates a seller after delivery. One review per order (unique constraint).
-- A trigger recomputes avg_rating and review_count on the profiles table every
-- time a review is inserted or updated, keeping those denormalized columns fresh.

create table public.reviews (
  id           uuid        primary key default gen_random_uuid(),
  order_id     uuid        not null unique references public.orders (id) on delete cascade,
  reviewer_id  uuid        not null references public.profiles (id) on delete cascade,
  seller_id    uuid        not null references public.profiles (id) on delete cascade,
  rating       int         not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz not null default now()
);

-- Recompute the seller aggregate after any review insert or update.
create or replace function public.refresh_seller_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_seller_id uuid;
begin
  -- On delete use old row; for insert and update use new row.
  if tg_op = 'DELETE' then
    target_seller_id := old.seller_id;
  else
    target_seller_id := new.seller_id;
  end if;

  update public.profiles
  set
    avg_rating   = coalesce((
      select round(avg(rating)::numeric, 2)
      from public.reviews
      where seller_id = target_seller_id
    ), 0),
    review_count = (
      select count(*)
      from public.reviews
      where seller_id = target_seller_id
    )
  where id = target_seller_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger reviews_refresh_seller_rating
  after insert or update or delete on public.reviews
  for each row
  execute procedure public.refresh_seller_rating();

-- Row Level Security
alter table public.reviews enable row level security;

-- Anyone can read reviews (they appear on public seller profiles).
create policy "reviews: public read"
  on public.reviews
  for select
  using (true);

-- Only the buyer of a delivered order may insert a review for that order.
-- reviewer_id must be the caller and match the buyer on the parent order.
create policy "reviews: buyer of delivered order insert"
  on public.reviews
  for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.buyer_id = auth.uid()
        and o.status = 'delivered'
    )
  );

-- Buyers may edit only their own review. seller_id and reviewer_id must not
-- change, which is enforced by the with check clause.
create policy "reviews: reviewer update own"
  on public.reviews
  for update
  using (reviewer_id = auth.uid())
  with check (
    reviewer_id = auth.uid()
    and reviewer_id = reviewer_id
    and seller_id = seller_id
  );
