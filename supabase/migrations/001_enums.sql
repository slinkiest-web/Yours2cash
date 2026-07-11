-- Migration 001: enums
-- Define all custom enum types used across the schema.
-- Using named enums (not plain text with check constraints) so Postgres
-- enforces valid values at the storage layer, not just the application layer.

create type public.listing_condition as enum (
  'new',
  'like_new',
  'good',
  'fair'
);

create type public.listing_status as enum (
  'active',
  'sold',
  'removed'
);

create type public.order_status as enum (
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled'
);
