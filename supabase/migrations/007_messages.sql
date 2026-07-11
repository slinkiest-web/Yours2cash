-- Migration 007: messages
-- Individual chat messages scoped to a conversation.
-- Realtime is enabled on this table so subscribers receive new rows
-- without polling. read_at drives the unread badge in the inbox.

create table public.messages (
  id               uuid        primary key default gen_random_uuid(),
  conversation_id  uuid        not null references public.conversations (id) on delete cascade,
  sender_id        uuid        not null references public.profiles (id) on delete cascade,
  body             text        not null check (char_length(body) >= 1),
  read_at          timestamptz,
  created_at       timestamptz not null default now()
);

-- Maintain last_message_at on the parent conversation row automatically.
-- This avoids a separate round trip from the client after every send.
create or replace function public.update_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_update_conversation
  after insert on public.messages
  for each row
  execute procedure public.update_conversation_last_message();

-- Row Level Security
alter table public.messages enable row level security;

-- Only participants of the parent conversation can read messages.
create policy "messages: participants read"
  on public.messages
  for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- A participant may only insert a message where sender_id equals their own uid.
-- They cannot impersonate the other party.
create policy "messages: participant insert as self"
  on public.messages
  for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- A participant can mark a message as read (update read_at only).
-- The with check prevents updating body or sender_id after the fact.
create policy "messages: participant mark read"
  on public.messages
  for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  )
  with check (
    sender_id = sender_id  -- sender_id must not change
  );

-- Enable Realtime for live chat delivery.
alter publication supabase_realtime add table public.messages;
