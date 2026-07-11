-- Migration 005: listing_images
-- One to many photos per listing. Position 0 is the primary cover image.
-- The check constraint caps images at six per listing at the DB level, enforced
-- by a trigger rather than a simple column check (which cannot count siblings).

create table public.listing_images (
  id            uuid  primary key default gen_random_uuid(),
  listing_id    uuid  not null references public.listings (id) on delete cascade,
  storage_path  text  not null,
  position      int   not null default 0 check (position >= 0 and position <= 5)
);

-- Prevent more than six images per listing at the storage layer.
create or replace function public.check_listing_image_limit()
returns trigger
language plpgsql
as $$
declare
  image_count int;
begin
  select count(*) into image_count
  from public.listing_images
  where listing_id = new.listing_id;

  if image_count >= 6 then
    raise exception 'A listing may have at most 6 images';
  end if;

  return new;
end;
$$;

create trigger listing_images_limit
  before insert on public.listing_images
  for each row
  execute procedure public.check_listing_image_limit();

-- Row Level Security
alter table public.listing_images enable row level security;

-- Read follows the visibility of the parent listing (active or owned by caller).
create policy "listing_images: public read"
  on public.listing_images
  for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'active' or l.seller_id = auth.uid())
    )
  );

-- Only the seller of the parent listing may insert images.
create policy "listing_images: seller insert"
  on public.listing_images
  for insert
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.seller_id = auth.uid()
    )
  );

-- Only the seller of the parent listing may delete images.
create policy "listing_images: seller delete"
  on public.listing_images
  for delete
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.seller_id = auth.uid()
    )
  );
