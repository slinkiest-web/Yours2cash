# Bugs — Yours2Cash

Issues encountered during Prompt 3 (Authentication), Prompt 4 (Listings),
Prompt 5 (Chat), and Prompt 6 (Orders/tracking). Add new entries here as
issues come up in future prompts, using the same format.

---

## 1. Hand-written `Database` type missing `Relationships` — all query mutations silently typed as `never`

**Symptoms**
`npx tsc -b` failed across nearly every file in `src/lib/queries/` (listings,
chat, orders, profiles, reviews) with errors like:
```
error TS2345: Argument of type '{ ... }' is not assignable to parameter of type 'never'.
error TS2353: Object literal may only specify known properties, and 'listing_id' does not exist in type 'never[]'.
```
This was discovered while establishing a clean baseline *before* writing any
new authentication code — it predated Prompt 3 but had never been caught.

**Root Cause**
`@supabase/supabase-js` requires `Database["public"]` to satisfy the SDK's
`GenericSchema` type, which requires every table entry to have a
`Relationships: GenericRelationship[]` array — not just `Row`/`Insert`/`Update`.
The hand-written `src/types/database.ts` (written to match the shape
`supabase gen types` produces, since no real Supabase project existed yet)
was missing `Relationships` on all 9 tables. Because it was missing on even
one table, the *entire* `Tables` map failed to satisfy `GenericSchema`,
which cascaded into every `.insert()`/`.update()` call across the whole
query layer resolving to `never`.

**Resolution**
Added an accurate `Relationships` array (with real foreign-key metadata) to
all 9 tables in `src/types/database.ts`.

**How to avoid in future**
When hand-writing Supabase types ahead of a real `supabase gen types` run,
always include `Relationships` per table, even if empty (`Relationships: []`)
— and prefer running `npx supabase gen types typescript` against the real
project as soon as it exists, to avoid hand-maintaining this shape at all.

**Status:** Resolved

---

## 2. `EmptyState.tsx` type-only import violation

**Symptoms**
`npx tsc -b` failed with:
```
src/components/ui/EmptyState.tsx(2,10): error TS1484: 'LucideIcon' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.
```

**Root Cause**
`tsconfig.app.json` has `verbatimModuleSyntax: true`, which requires
type-only imports to use `import type`. `EmptyState.tsx` imported
`LucideIcon` (a type) as a normal value import.

**Resolution**
Changed `import { LucideIcon } from "lucide-react"` to
`import type { LucideIcon } from "lucide-react"`.

**How to avoid in future**
With `verbatimModuleSyntax` on, always use `import type { ... }` for
anything that's only used as a type. Consider enabling
`@typescript-eslint/consistent-type-imports` (or the oxlint equivalent) to
catch this automatically instead of relying on `tsc -b` to surface it.

**Status:** Resolved

---

## 3. Ambiguous `QueryResult` re-export in `lib/queries/index.ts`

**Symptoms**
`npx tsc -b` failed with:
```
src/lib/queries/index.ts(2,1): error TS2308: Module "./listings" has already exported a member named 'QueryResult'. Consider explicitly re-exporting to resolve the ambiguity.
```
(repeated for `./profiles`, `./chat`, `./orders`, `./reviews`)

**Root Cause**
Each of the five query modules (`listings.ts`, `profiles.ts`, `chat.ts`,
`orders.ts`, `reviews.ts`) independently declared its own identical local
`QueryResult<T>` interface. `index.ts` re-exported all five modules with
`export *`, which is ambiguous when the same name is exported by more than
one of them.

**Resolution**
Added one explicit `export type { QueryResult } from "./listings"` line in
`index.ts` — an explicit named export takes precedence over an ambiguous
`export *` and resolves the conflict without touching the five query
modules themselves.

**How to avoid in future**
Define shared types like `QueryResult<T>` once in a single shared module
(e.g. `src/lib/queries/types.ts`) and import it into each query file,
rather than redeclaring the same interface in multiple files.

**Status:** Resolved

---

## 4. Missing `avatars` storage bucket

**Symptoms**
`uploadAvatar()` in `src/lib/queries/profiles.ts` calls
`supabase.storage.from("avatars").upload(...)`, but no migration created an
`avatars` bucket — only `011_storage.sql` (`listing-images`) existed. Avatar
uploads would have failed at runtime with a "bucket not found" error the
first time a user tried to set a profile picture.

**Root Cause**
The `avatars` bucket was never provisioned. `uploadAvatar()` was written
assuming it existed, but no migration ever created it.

**Resolution**
Added `supabase/migrations/012_avatar_storage.sql`, mirroring the
`listing-images` bucket pattern: public read, and owner-scoped
insert/update/delete based on the `{user_id}/...` path prefix.

**How to avoid in future**
Before wiring a new feature to `supabase.storage.from("<bucket>")`, grep the
migrations folder to confirm that bucket has actually been created and
policied — don't assume a bucket exists just because a helper function
references it.

**Status:** Resolved

---

## 5. `.env.local` not configured

**Symptoms**
No `.env.local` file existed in the project. Without it, `src/lib/supabase.ts`
falls back to a placeholder URL/key (`https://placeholder.supabase.co`), so
every Supabase call — auth included — silently targets a project that
doesn't exist.

**Root Cause**
`.env.local` is git-ignored by design (it holds project-specific secrets),
so a fresh clone or a fresh Supabase project always starts without it. It
simply hadn't been created yet for this project.

**Resolution**
Copied `.env.example` to `.env.local` and filled in the real project's
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase dashboard
(Project Settings → API).

**How to avoid in future**
This step is unavoidable per-environment (it's a secret, so it can't be
committed), but it's worth checking first — before debugging "weird"
auth/data behavior — whenever a fresh environment is involved. `supabase.ts`
already logs a console warning when the env vars are missing; that warning
is the fastest signal that this is the problem.

**Status:** Resolved

---

## 6. Database migrations never executed against the live Supabase project

**Symptoms**
The Supabase dashboard showed **"Last Migration: No migrations."** None of
the 9 application tables (`profiles`, `listings`, etc.) or the 2 storage
buckets existed on the live project, even though `.env.local` was correctly
pointed at it and Supabase Auth (signup/login) worked fine.

**Root Cause**
Migrations 001–012 are plain `.sql` files in `supabase/migrations/` — they
are not applied automatically. Nothing had run them against this project
yet (they'd only ever been reviewed/typechecked locally, never executed
against a real database). Auth itself worked because `auth.users` is a
Supabase-managed table that exists regardless of whether the project's own
migrations have been run.

**Resolution**
Ran all 12 migration files, in order, through the Supabase Dashboard SQL
Editor (copy file contents → paste → Run → confirm success before moving to
the next file). Verified afterwards via
`select table_name from information_schema.tables where table_schema = 'public'`
and by checking the Storage tab for both buckets.

**How to avoid in future**
Check "Last Migration" in the Supabase dashboard (or run the table-listing
query above) as the very first troubleshooting step on any *new* Supabase
project, before assuming a code-level bug. Longer term, consider adopting
the Supabase CLI (`supabase link` + `supabase db push`) so migrations are
applied via one command instead of manual copy/paste, and so "have the
migrations been run" isn't a manual thing to remember.

**Status:** Resolved

---

## 7. App hangs indefinitely after login, never reaches the dashboard

**Symptoms**
After a successful login, the app showed an infinite loading spinner and
never navigated to the dashboard (or any protected page). No error was
shown anywhere in the UI.

**Root Cause**
This was a direct downstream effect of Issue #6 (no migrations run). With
the `profiles` table missing, `AuthContext`'s `fetchProfile` call could
never find a row, so `profile` stayed `null` forever. `ProtectedRoute`
would redirect to `/profile` (since an incomplete/missing profile routes
there), and `ProfilePage` itself guards on `if (!profile || !user) return
<Spinner />` — which spins forever if `profile` can structurally never
resolve. Neither component has a timeout or error fallback, so the failure
was silent instead of surfacing a clear message.

**Resolution**
Resolved by fixing Issue #6 (running the migrations) and Issue #8 (below,
backfilling the existing account's profile row). No code changes were
needed — this was purely a missing-backend-schema issue, not an app bug.

**How to avoid in future**
`ProtectedRoute` and `ProfilePage` currently have no "this is taking too
long" or "something went wrong" state — worth adding one (e.g. a timeout
that shows an error message and a retry/logout option) so a misconfigured
or unreachable backend fails loudly instead of presenting as an
indistinguishable infinite spinner. Not fixed yet — tracked here as a
follow-up, not implemented in Prompt 3.

**Status:** Resolved (root cause fixed; the "silent infinite spinner" UX
gap itself is still open — see note above)

---

## 8. Existing user account had no profile row after migrations were applied

**Symptoms**
After running all 12 migrations, the account that had been created *before*
the migrations existed still hit the same infinite-spinner behavior as
Issue #7 — logging out and back in did not fix it.

**Root Cause**
Migration 002 creates a `handle_new_user` trigger that inserts a `profiles`
row automatically, but only on `insert` into `auth.users` — i.e. only for
*new* signups going forward. It cannot retroactively create rows for
accounts that already existed in `auth.users` before the trigger was
created, so this one account was permanently missing its profile row.

**Resolution**
Ran a one-time backfill query in the SQL Editor:
```sql
insert into public.profiles (id, display_name)
select id, split_part(email, '@', 1) from auth.users
where id not in (select id from public.profiles);
```
This created a profile row for any existing `auth.users` row missing one,
without touching or duplicating existing profiles.

**How to avoid in future**
Whenever migrations that include a signup trigger are applied to a project
that already has auth users (e.g. a project used for manual testing before
the schema existed), plan to run this backfill query immediately
afterwards. Worth adding this snippet to a setup/README step, or folding it
into a seed script, so it isn't rediscovered from scratch next time.

**Status:** Resolved

---

## 9. `zod` coerce + React Hook Form resolver type mismatch on the listing price field

**Symptoms**
`npx tsc -b` failed on `src/pages/listings/ListingFormPage.tsx` with:
```
error TS2322: Type 'Resolver<{ ... price: unknown ... }>' is not assignable to type 'Resolver<{ ... price: number ... }>'.
error TS2345: Argument of type '(values: ListingFormValues) => Promise<void>' is not assignable to parameter of type 'SubmitHandler<TFieldValues>'.
```

**Root Cause**
The listing schema used `z.coerce.number()` for the price field so a raw
`<input type="number">` string value would coerce to a number. `z.coerce.number()`
makes the schema's *input* type `unknown` while its *output* type (what
`z.infer<typeof schema>` gives you) is `number`. `useForm<ListingFormValues>`
was instantiated with the output type, but React Hook Form's resolver needs
to type-check against the *input* type the form actually produces — the two
didn't match.

**Resolution**
Switched from `z.coerce.number()` to a plain `z.number("Enter a price in Naira")`
in `src/lib/validation/listing.ts`, and registered the field with RHF's
built-in coercion instead: `register("price", { valueAsNumber: true })` in
`ListingFormPage.tsx`. This keeps both the schema's input and output types
as `number`, so `useForm<ListingFormValues>` (built from `z.infer`) matches
what the resolver expects. Verified zod's behavior directly (`node -e`
against the installed zod version) before and after the change, including
that an empty/invalid input becomes `NaN` and is correctly rejected by
`z.number()` with a clear message rather than silently passing.

**How to avoid in future**
When a Zod-validated numeric field is fed from an HTML text/number input,
prefer `register(name, { valueAsNumber: true })` with a plain `z.number()`
over `z.coerce.number()`. Reserve `z.coerce.*` for schemas whose form type
and output type are allowed to genuinely differ (rare when the schema type
is fed straight into `useForm<T>`). When in doubt, sanity-check the exact
zod API/behavior with a throwaway `node -e` snippet against the project's
actual installed zod version rather than assuming v3/v4 parity — this
project already hit one other zod v4 API surprise in Prompt 3
(the `{ error }` options-object form), so version-specific verification is
worth the 30 seconds.

**Status:** Resolved

---

## 10. Tautological RLS check let a participant rewrite a message's `sender_id` while marking it read

**Symptoms**
No runtime error — this was caught by code review while implementing the
Chat feature's `markMessagesRead` flow, not by a failing test or a bug
report. The `messages: participant mark read` policy (migration 007) has a
`with check (sender_id = sender_id)`.

**Root Cause**
Inside a Postgres RLS `with check` expression for an `UPDATE` policy, an
unqualified column reference resolves to the **new** row's value. Both
sides of `sender_id = sender_id` are therefore the same value being
compared to itself — the expression is a tautology, always `true`,
regardless of what `sender_id` is submitted in the update payload. In
practice this meant the "mark read" policy didn't actually constrain
`sender_id` at all: a participant using `.update()` on a message in their
conversation could, in principle, also change who it claims to be from.
This directly undermines the guarantee stated in the neighboring insert
policy's own comment ("cannot impersonate the other party").

**Resolution**
`supabase/migrations/013_fix_messages_mark_read_policy.sql` drops and
recreates the policy, comparing the submitted `sender_id` against the
row's *stored* value via a `select ... where id = messages.id` subquery —
the standard Postgres RLS idiom for "this column must not change on
update," since a bare correlated reference can't distinguish old vs. new
inside `with check`.

**How to avoid in future**
Never write `with check (col = col)` expecting it to mean "col is
unchanged" — it doesn't, on either `UPDATE` policies specifically (the
classic mistake). Use `col = (select col from table where id = table.id)`
instead, and when reviewing or writing any RLS policy that's supposed to
freeze a column on update, mentally substitute "new row" for every bare
column reference in `with check` to check whether the expression is
actually doing anything.

**Status:** Resolved and applied to the live project (migration 013,
confirmed 2026-07-11)

---

## 11. Missing UPDATE policy on `conversations` broke the "reuse an existing conversation" path

**Symptoms**
No runtime error observed directly (not yet tested live — see note below),
but reasoned out from Postgres's documented RLS behavior for
`upsert`/`ON CONFLICT DO UPDATE` while implementing `upsertConversation`'s
consumer (the Message Seller action): a **second** call to
`upsertConversation` for the same `(listing_id, buyer_id, seller_id)`
triple would be rejected under RLS.

**Root Cause**
`upsertConversation` calls `.upsert(payload, { onConflict: "listing_id,buyer_id,seller_id", ignoreDuplicates: false })`,
which Postgres executes as `INSERT ... ON CONFLICT (...) DO UPDATE`.
Postgres RLS checks the `DO UPDATE` branch against the table's **UPDATE**
policies, not its INSERT policy — this is documented Postgres behavior,
not Postgres-specific to this project. Migration 006 created an INSERT
policy and a SELECT policy for `conversations`, but no UPDATE policy at
all (its comment explicitly assumed conversations would only ever be
mutated by the security-definer `last_message_at` trigger, not by a
client-issued statement). The very first `upsertConversation` call for a
given triple succeeds (pure INSERT, no conflict), but every subsequent
call — i.e. every time a buyer reopens a chat with the same seller about
the same listing, which is the entire point of "reuse" — would hit the
conflict path and be denied by RLS with no matching UPDATE policy.

**Resolution**
`supabase/migrations/014_conversations_reuse_update_policy.sql` adds an
UPDATE policy scoped to participants (`buyer_id = auth.uid() or seller_id
= auth.uid()`), with a `with check` that only allows the update when
`listing_id`/`buyer_id`/`seller_id` are unchanged from their stored values
(via the same subquery idiom as issue #10) — i.e. exactly the no-op
re-submit the upsert's conflict path performs, without opening the door to
actually reassigning a conversation to a different listing or party.

**How to avoid in future**
Whenever a table's client-facing write path uses `.upsert()` with
`onConflict`, treat that as needing **both** an INSERT and an UPDATE
policy, even if the app "never intends" to issue a plain UPDATE — the
conflict path *is* an UPDATE as far as Postgres RLS is concerned. This is
easy to miss because everything works perfectly the first time (no
conflict yet) and only breaks on the second call, which may not surface
until real usage rather than initial testing.

**Status:** Resolved and applied to the live project (migration 014,
confirmed 2026-07-11)

---

## 12. `orders` UPDATE policy had no `with check` at all — amount/listing_id/buyer_id/seller_id were silently rewritable

**Symptoms**
No runtime error — found by code review while implementing the Orders
feature's mutation layer, cross-checking migration 008 against the client
code being written (`advanceOrderStatus` and friends).

**Root Cause**
The `orders: participants update` policy (migration 008) has a `using`
clause (`buyer_id = auth.uid() or seller_id = auth.uid()`) but **no
`with check` at all**. Meanwhile, `enforce_order_state_transition` — the
trigger meant to be "the authoritative rule" for this table per its own
comment — only fires `when (old.status is distinct from new.status)`. Put
those two facts together: an update that changes `amount` (or `listing_id`,
`buyer_id`, `seller_id`) while leaving `status` untouched never triggers
the transition check at all, and RLS has no `with check` to catch it
either. Either participant could, via a bare `.update()` call that never
goes through this app's query helpers, silently rewrite the order's price
snapshot — directly undermining the PRD's stated guarantee that amount is
an immutable snapshot ("price changes later do not affect historical order
records").

**Resolution**
`supabase/migrations/017_orders_freeze_immutable_columns.sql` replaces the
policy with one that adds a `with check` freezing `listing_id`, `buyer_id`,
`seller_id`, and `amount` to their stored values (same subquery idiom as
issues #10/#11), while leaving `status` and `updated_at` free to change —
those are exactly the columns legitimate transitions touch.

**How to avoid in future**
An UPDATE policy with a `using` clause but no `with check` is a common
pattern when the author is only thinking about *which rows* should be
editable, not *which columns*. Whenever a table has "this column should
never change after creation" columns (snapshots, foreign keys, amounts),
write an explicit `with check` for them on every UPDATE policy — don't
rely on a trigger that only fires conditionally on a different column to
cover it. Reviewing a table's full RLS policy set together (not just the
one relevant to the feature at hand) is what caught this one.

**Status:** Resolved and applied to the live project (migration 017,
confirmed 2026-07-11)

---

## 13. `reviews` UPDATE policy has the same tautological `with check` as issue #10 — found, not fixed

**Symptoms**
No runtime error — found by code review while reading migration 010 for
context on the reviews write path used by Prompt 6's "leave a review"
action. Not exercised: this prompt only calls `createReview` (insert),
never `updateReview`.

**Root Cause**
`reviews: reviewer update own` (migration 010) has
`with check (reviewer_id = auth.uid() and reviewer_id = reviewer_id and seller_id = seller_id)`.
The last two clauses are the exact same tautology as issue #10
(`messages: participant mark read`, fixed in migration 013) — inside an
UPDATE policy's `with check`, a bare column reference resolves to the
*new* row, so `reviewer_id = reviewer_id` and `seller_id = seller_id` are
always true and don't actually prevent either column from changing. A
buyer editing their own review could, in principle, also reassign it to a
different seller or claim a different reviewer.

**Resolution**
None yet. Deliberately deferred — Prompt 6's scope was the order flow and
"unlocks the review action" (insert only); no review-editing UI exists to
exercise this path yet. Documented here so it isn't lost, and flagged in
AI_HANDOFF.md's Known Assumptions.

**How to avoid in future**
Fix before building any review-editing UI, using the same subquery idiom
as issues #10/#11/#12:
```sql
with check (
  reviewer_id = auth.uid()
  and reviewer_id = (select r.reviewer_id from public.reviews r where r.id = reviews.id)
  and seller_id = (select r.seller_id from public.reviews r where r.id = reviews.id)
)
```
More generally: now that this exact tautology pattern has appeared twice
in this codebase (migrations 007 and 010, both apparently written in the
same original pass), it's worth grepping the whole `supabase/migrations/`
directory for self-comparison expressions whenever auditing RLS, rather
than waiting to trip over each one individually while building the
feature that happens to touch it.

**Status:** Open — found, not fixed, not yet needed by any built feature
