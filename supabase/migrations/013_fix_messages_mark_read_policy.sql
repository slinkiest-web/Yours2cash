-- Migration 013: fix messages "mark read" RLS policy
--
-- The original with check in migration 007 read `sender_id = sender_id`.
-- Both sides of that comparison resolve to the NEW row's value inside an
-- UPDATE policy's with check, so the expression is a tautology: it always
-- evaluates true no matter what sender_id is submitted. In practice this
-- meant a participant marking a message read could also silently rewrite
-- that message's sender_id, undermining the "cannot impersonate the other
-- party" guarantee described in the insert policy's comment.
--
-- The fix compares the submitted sender_id against the row's current
-- stored value (looked up by primary key), which is the standard Postgres
-- RLS idiom for "this column must not change on update".

drop policy if exists "messages: participant mark read" on public.messages;

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
    sender_id = (select m.sender_id from public.messages m where m.id = messages.id)
  );
