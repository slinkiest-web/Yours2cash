-- Migration 011: storage
-- Create the listing_images bucket. Policies use the storage.objects table
-- which Supabase populates automatically on file upload.

-- Create the bucket. is_public = true means unauthenticated GET requests work
-- for rendered images in the product gallery.
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- Anyone can read objects in the bucket (images are shown to all visitors).
create policy "storage listing_images: public read"
  on storage.objects
  for select
  using (bucket_id = 'listing-images');

-- Only authenticated users can upload. The folder structure is
-- {listing_id}/{filename} and the listing must belong to the caller.
-- We extract the listing_id from the first path segment and verify ownership.
create policy "storage listing_images: seller upload"
  on storage.objects
  for insert
  with check (
    bucket_id = 'listing-images'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from public.listings l
      where l.id = (string_to_array(name, '/'))[1]::uuid
        and l.seller_id = auth.uid()
    )
  );

-- Sellers can delete only their own listing photos.
create policy "storage listing_images: seller delete"
  on storage.objects
  for delete
  using (
    bucket_id = 'listing-images'
    and exists (
      select 1 from public.listings l
      where l.id = (string_to_array(name, '/'))[1]::uuid
        and l.seller_id = auth.uid()
    )
  );
