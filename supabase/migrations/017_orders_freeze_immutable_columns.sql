-- Migration 017: freeze immutable order columns on update
--
-- The "orders: participants update" policy (migration 008) has a USING
-- clause but no WITH CHECK at all. enforce_order_state_transition only
-- fires when `status` changes (its trigger has `when (old.status is
-- distinct from new.status)`), so an update that leaves status alone but
-- changes another column — amount, listing_id, buyer_id, seller_id — would
-- pass RLS unchecked. That undermines the whole reason this table snapshots
-- amount at order time: "price changes later do not affect historical
-- order records" only holds if amount can't be silently rewritten after
-- the fact via a bare `.update()` call that never goes through the app's
-- own status-transition helpers.
--
-- Freeze the columns that must never change after creation, using the same
-- "compare against the row's stored value" idiom as migrations 013/014.
-- updated_at is deliberately left unconstrained (the orders_set_updated_at
-- trigger needs to be able to bump it on every legitimate update).

drop policy if exists "orders: participants update" on public.orders;

create policy "orders: participants update"
  on public.orders
  for update
  using (buyer_id = auth.uid() or seller_id = auth.uid())
  with check (
    listing_id = (select o.listing_id from public.orders o where o.id = orders.id)
    and buyer_id = (select o.buyer_id from public.orders o where o.id = orders.id)
    and seller_id = (select o.seller_id from public.orders o where o.id = orders.id)
    and amount = (select o.amount from public.orders o where o.id = orders.id)
  );
