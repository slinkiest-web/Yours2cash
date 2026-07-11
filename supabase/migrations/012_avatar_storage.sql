-- Migration 012: avatar storage
-- Create the avatars bucket used by profile setup and profile editing.
-- Mirrors the listing-images bucket pattern from migration 011, but the
-- ownership folder is the user's own id: {user_id}/avatar.{ext}.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone can read avatars (shown on public profiles, listings, reviews).
create policy "storage avatars: public read"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

-- A user can upload only into their own folder.
create policy "storage avatars: owner upload"
  on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- A user can overwrite (upsert) only their own avatar.
create policy "storage avatars: owner update"
  on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- A user can delete only their own avatar.
create policy "storage avatars: owner delete"
  on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and (string_to_array(name, '/'))[1] = auth.uid()::text
  );
