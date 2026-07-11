-- Migration 015: last-message preview on conversations
--
-- The inbox needs to show each thread's most recent message body without
-- an N+1 query per conversation. Denormalize it onto the parent row,
-- maintained by the same security-definer trigger that already keeps
-- last_message_at current on every insert (migration 007) — this mirrors
-- how profiles.avg_rating/review_count are already denormalized elsewhere
-- in this schema.

alter table public.conversations
  add column last_message_body text,
  add column last_message_sender_id uuid references public.profiles (id);

create or replace function public.update_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      last_message_body = new.body,
      last_message_sender_id = new.sender_id
  where id = new.conversation_id;
  return new;
end;
$$;
