# Bugs — Yours2Cash

Issues encountered during Prompt 3 (Authentication) and Prompt 4 (Listings).
Add new entries here as issues come up in future prompts, using the same
format.

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
