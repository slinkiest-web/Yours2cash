-- Migration 003: categories
-- Fixed lookup table seeded once. No client writes are allowed.
-- sort_order drives the display sequence in the UI category row.

create table public.categories (
  id          uuid    primary key default gen_random_uuid(),
  slug        text    not null unique,
  name        text    not null,
  sort_order  int     not null default 0
);

-- Row Level Security
alter table public.categories enable row level security;

-- Read only for everyone. No insert, update, or delete policies are created
-- so no authenticated or anonymous user can mutate categories through the client.
create policy "categories: public read"
  on public.categories
  for select
  using (true);

-- Seed the nine fixed categories defined in the PRD.
insert into public.categories (slug, name, sort_order) values
  ('beauty',           'Beauty',           1),
  ('fashion',          'Fashion',          2),
  ('electronics',      'Electronics',      3),
  ('home-and-living',  'Home and Living',  4),
  ('baby-and-kids',    'Baby and Kids',    5),
  ('sports-fitness',   'Sports and Fitness', 6),
  ('books',            'Books',            7),
  ('gaming',           'Gaming',           8),
  ('others',           'Others',           9);
