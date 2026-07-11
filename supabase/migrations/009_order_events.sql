-- Migration 009: order_events
-- Immutable timeline entries that power the order tracking UI.
-- Rows are written by a trigger on orders, not by the client, so the timeline
-- cannot be forged or edited after the fact.

create table public.order_events (
  id          uuid                 primary key default gen_random_uuid(),
  order_id    uuid                 not null references public.orders (id) on delete cascade,
  status      public.order_status  not null,
  created_at  timestamptz          not null default now()
);

-- Append a timeline entry every time an order status changes.
create or replace function public.record_order_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Write the new status into the event log.
  insert into public.order_events (order_id, status)
  values (new.id, new.status);
  return new;
end;
$$;

-- Fire on insert (captures the initial 'pending' state) and on status change.
create trigger orders_record_event_on_insert
  after insert on public.orders
  for each row
  execute procedure public.record_order_event();

create trigger orders_record_event_on_update
  after update on public.orders
  for each row
  when (old.status is distinct from new.status)
  execute procedure public.record_order_event();

-- Row Level Security
alter table public.order_events enable row level security;

-- Read access follows the parent order. Participants of the order can see the
-- timeline, nobody else can.
create policy "order_events: participants read"
  on public.order_events
  for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

-- No direct client writes. The trigger is the only path to new rows.
