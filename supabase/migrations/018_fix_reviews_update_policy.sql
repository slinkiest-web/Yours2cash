-- Migration 018: fix reviews "reviewer update own" RLS policy
--
-- BUGS.md #13: the original with check in migration 010 read
-- `reviewer_id = reviewer_id and seller_id = seller_id`. Inside an UPDATE
-- policy's with check, a bare column reference resolves to the NEW row's
-- value, so both comparisons are tautologies — always true regardless of
-- what's submitted. This is the same mistake as migration 007 (fixed by
-- migration 013). In practice this meant a buyer editing their own review
-- could also reassign it to a different seller or claim a different
-- reviewer identity.
--
-- While fixing this, also freeze order_id, which the original policy never
-- constrained at all: without it, a buyer could "move" their review onto a
-- different order (order_id has a unique constraint, so this would only
-- work against an order that doesn't already have a review, but that's
-- still a real integrity gap — a review is supposed to be permanently tied
-- to the order it was written for).
--
-- rating and comment are deliberately left unconstrained: those are
-- exactly the columns a legitimate "edit your review" action changes.

drop policy if exists "reviews: reviewer update own" on public.reviews;

create policy "reviews: reviewer update own"
  on public.reviews
  for update
  using (reviewer_id = auth.uid())
  with check (
    reviewer_id = auth.uid()
    and reviewer_id = (select r.reviewer_id from public.reviews r where r.id = reviews.id)
    and seller_id = (select r.seller_id from public.reviews r where r.id = reviews.id)
    and order_id = (select r.order_id from public.reviews r where r.id = reviews.id)
  );
