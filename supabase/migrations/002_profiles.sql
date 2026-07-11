-- Migration 002: profiles
-- Extends the Supabase auth.users table one to one.
-- Public read is intentional: buyers need to see seller display names and ratings.
-- Write is restricted to the owner via RLS so no user can mutate another profile.

create table public.profiles (
  id            uuid        primary key references auth.users (id) on delete cascade,
  display_name  text        not null,
  avatar_url    text,
  bio           text,
  state         text        not null default '',
  city          text,
  avg_rating    numeric     not null default 0 check (avg_rating >= 0 and avg_rating <= 5),
  review_count  int         not null default 0 check (review_count >= 0),
  created_at    timestamptz not null default now()
);

-- Row Level Security
alter table public.profiles enable row level security;

-- Anyone can read any profile (display_name, avatar, rating are public data).
create policy "profiles: public read"
  on public.profiles
  for select
  using (true);

-- A user can only insert their own profile row (id must equal the caller uid).
create policy "profiles: owner insert"
  on public.profiles
  for insert
  with check (id = auth.uid());

-- A user can only update their own profile row.
create policy "profiles: owner update"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Auto create a profile row when a new auth user signs up.
-- The trigger fires after insert on auth.users so the profile always exists.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
