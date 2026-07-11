-- Migration 014: allow the upsert-reuse path on conversations
--
-- lib/queries/chat.ts's upsertConversation() opens-or-reuses a thread via
-- `.upsert(..., { onConflict: "listing_id,buyer_id,seller_id" })`, i.e. an
-- INSERT ... ON CONFLICT DO UPDATE. Postgres RLS checks the DO UPDATE path
-- against the table's UPDATE policies, not its INSERT policy. Migration 006
-- deliberately created no UPDATE policy at all (the comment there assumed
-- conversations are only ever mutated by the security-definer message
-- trigger) — so every *second* call to upsertConversation for the same
-- (listing, buyer, seller) triple would be rejected by RLS, breaking the
-- "reuse the conversation" requirement.
--
-- This policy allows a participant to update their own conversation row
-- only when the identifying triple is unchanged, i.e. exactly the no-op
-- re-submit that the upsert's conflict path performs. It does not open the
-- door to reassigning a conversation to a different listing or party.

create policy "conversations: participant upsert reuse"
  on public.conversations
  for update
  using (buyer_id = auth.uid() or seller_id = auth.uid())
  with check (
    listing_id = (select c.listing_id from public.conversations c where c.id = conversations.id)
    and buyer_id = (select c.buyer_id from public.conversations c where c.id = conversations.id)
    and seller_id = (select c.seller_id from public.conversations c where c.id = conversations.id)
  );
