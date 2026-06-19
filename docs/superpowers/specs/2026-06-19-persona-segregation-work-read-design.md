# Persona segregation for Work + Read, design

## Problem

Mani and Harti are two personas under one Supabase account (`maniha@improve.com`). Most domains (gates, missions, sticky notes, etc.) are already persona-scoped — switching persona in the UI shows a different dataset. Two domains are not:

- **Work** (courses/chapters/milestones/contacts/projects): single shared Dexie DB keyed only by `userId`, single shared Supabase table set keyed only by `user_id`. Mani and Harti currently see identical work data, and the dashboard tile / `/work` page never reload on persona switch.
- **Read** (OCR-scanned word ledger): already correctly persona-scoped locally (separate Dexie DB per persona, reloads on switch), but has **no Supabase backing at all** — local-only, lost if the browser storage is cleared.

Goal: Work gets real persona separation (local + cloud), Read gets cloud backup, both following the persona-segregation pattern already established by sticky notes / solo snapshots.

## Existing pattern (house convention)

- Local: one full Dexie database instance per persona (`getDb(persona)` → `SoloLevelingDB-mani` / `-harti`), not a shared table with a filter column.
- Cloud: shared Supabase table, `persona text not null check (persona in ('mani','harti'))` column, index on `(user_id, persona)`, RLS still scoped to `auth.uid() = user_id` only (single shared login across both personas — app-level query adds `.eq("persona", persona)`).
- Realtime: Postgres `postgres_changes` filter can only filter one column on the wire (`user_id=eq.<uuid>`); persona filtering happens by re-running the persona-scoped query on every change event, not in the subscription filter.

This design applies that same shape to Work and adds it fresh for Read.

## 1. Work — local storage (Dexie)

`src/lib/db/work-database.ts`: `getWorkDb` currently keyed by `userId` only. Change to key by `userId` **and** `persona`:

```
getWorkDb(userId?: string, persona?: Persona)
→ db name: `SoloWorkDB-${userId ?? "local"}-${persona ?? "mani"}`
```

## 2. Migration of existing combined work data → Mani

Existing local work data is currently shared. Per decision: **all existing work data is assigned to Mani**; Harti's new per-persona DB starts empty.

One-time migration on load, same shape as the existing `runLegacyLeadMigration`:

- If the new Mani-keyed work DB (`SoloWorkDB-${userId}-mani`) is empty, copy all rows (courses, chapters, milestones, contacts, projects) from the old combined DB (`SoloWorkDB-${userId}` / `SoloWorkDB-local`) into it.
- Old DB is left in place afterward (orphaned, harmless — same approach as the legacy leads migration, which never deletes the source).
- Runs once; subsequent loads see the new DB already populated and skip.

## 3. Work — Supabase schema

**Live-schema findings (checked via Supabase MCP against project `kwbswiifqqwbeexkdyes` directly, not just the repo's migration files):**

- The repo's migration files are not 1:1 with what's actually applied — several live migrations (e.g. `allow_persona1_persona2`) have no corresponding file in `supabase/migrations/`. Live persona check constraints across every other persona-scoped table (`sticky_notes`, `solo_snapshots`, `solo_todos`, etc.) are `check (persona in ('mani','harti','persona1','persona2'))`, not the 2-value form the repo's older migration files show. New work/read persona columns must match the live 4-value convention.
- Live RLS policies use the perf-optimized `(select auth.uid()) = user_id` form (wrapped subselect), not the bare `auth.uid() = user_id` text in the repo files. New policies must match.
- `work_contacts` live is missing `phone_label`/`phone2`/`phone2_label` (which the app already sends on every contact create/update) and still has dead `source`/`next_step` columns. `supabase/migrations/20260605_work_contacts_add_phone2.sql` exists in the repo for this but was **never applied** — meaning contact sync to Supabase has been silently failing (unknown-column error, swallowed by the fire-and-forget sync wrapper) since that file was written. Per decision, this fix is bundled into the same migration as the persona column so contact sync actually starts working again as part of this change.

New migration, e.g. `supabase/migrations/20260619_add_persona_to_work_tables.sql`:

```sql
-- Bundled fix: work_contacts schema drift (never-applied 20260605 migration)
alter table work_contacts
  add column if not exists phone_label text not null default '',
  add column if not exists phone2      text not null default '',
  add column if not exists phone2_label text not null default '';

alter table work_contacts
  drop column if exists source,
  drop column if exists next_step;

-- Persona column, matching live 4-value convention
alter table work_courses add column persona text not null default 'mani' check (persona in ('mani','harti','persona1','persona2'));
alter table work_chapters add column persona text not null default 'mani' check (persona in ('mani','harti','persona1','persona2'));
alter table work_milestones add column persona text not null default 'mani' check (persona in ('mani','harti','persona1','persona2'));
alter table work_contacts add column persona text not null default 'mani' check (persona in ('mani','harti','persona1','persona2'));
alter table work_projects add column persona text not null default 'mani' check (persona in ('mani','harti','persona1','persona2'));

create index if not exists work_courses_user_persona_idx on work_courses (user_id, persona);
create index if not exists work_chapters_user_persona_idx on work_chapters (user_id, persona);
create index if not exists work_milestones_user_persona_idx on work_milestones (user_id, persona);
create index if not exists work_contacts_user_persona_idx on work_contacts (user_id, persona);
create index if not exists work_projects_user_persona_idx on work_projects (user_id, persona);
```

`default 'mani'` backfills existing rows automatically — same outcome as the Dexie-side migration (real live row counts at design time: 3 courses, 14 chapters, 126 milestones, 7 contacts, 3 projects — all become Mani's). RLS policies are unchanged (still scoped to `user_id`); persona filtering is app-side, consistent with the sticky_notes precedent.

This migration alters a live table with real rows. Applying it (via the connected Supabase MCP `apply_migration` tool — this project has no `supabase/config.toml` / CLI link, schema changes are applied ad hoc through that tool or the dashboard) is a one-way, hard-to-fully-reverse action against production and must be confirmed with the user immediately before running, not bundled silently into an automated task sequence.

## 4. Work — store + sync code

`src/lib/supabase/work.ts`:
- `fetchAllWork(userId, persona)` — every `select` gains `.eq("persona", persona)`.
- Every `sbCreate*` includes `persona` in the inserted row.
- Every `sbUpdate*` / `sbDelete*` gains `.eq("persona", persona)` alongside the existing `.eq("user_id", userId)`.

`src/lib/stores/work-store.ts`:
- Track `_persona: Persona | null` in state alongside `_userId`.
- `load(persona)` replaces `load()`. Local Dexie fallback uses `getWorkDb(undefined, persona)`. Remote path uses `getWorkDb(userId, persona)`.
- Every mutation (`createContact`, `updateProject`, etc.) passes `_persona` through to both the Dexie call and the `syncToSupabase` call.
- Realtime channel name becomes `work:${userId}:${persona}`; Postgres filter stays `user_id=eq.${userId}` (can't filter on persona at the wire); the change handler re-runs `refreshFromRemote(userId, persona, set)`, which re-applies the persona filter.
- Guard re-entrancy the way `sticky-notes-store.ts` does: skip reload if `_persona === persona && _realtimeChannel` already set.

`src/components/work/work-page.tsx`: reads `activePersona` from `usePersonaStore`, calls `load(activePersona)`, depends on `activePersona` in the effect so switching persona while on `/work` reloads.

## 5. Read — new Supabase backing

Currently nonexistent. New migration, e.g. `supabase/migrations/20260619_create_read_records.sql`:

```sql
create table if not exists public.read_records (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  persona text not null check (persona in ('mani', 'harti', 'persona1', 'persona2')),
  word text not null,
  definition text not null default '',
  part_of_speech text not null default '',
  my_definition text not null default '',
  synonyms jsonb not null default '[]'::jsonb,
  all_definitions jsonb not null default '[]'::jsonb,
  all_synonyms jsonb not null default '[]'::jsonb,
  source_type text not null check (source_type in ('book','note','newspaper','other')),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists read_records_user_persona_idx on read_records (user_id, persona);

alter table public.read_records enable row level security;

create policy "Users manage own read records"
  on public.read_records
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter publication supabase_realtime add table read_records;
```

Persona check matches the live 4-value convention (see §3); RLS uses the live perf-optimized `(select auth.uid())` form, not the bare form the older repo migration files show.

New `src/lib/supabase/read.ts`, mirroring `src/lib/supabase/work.ts`'s shape:
- `getReadUserId()` (same shape as `getWorkUserId`)
- `fetchReadRecords(userId, persona)`
- `sbCreateReadRecord(userId, persona, record)`
- `sbUpdateReadRecord(userId, persona, id, updates)`
- `sbDeleteReadRecord(userId, persona, id)`

Incremental per-record sync (not bulk snapshot) — the read ledger can grow to hundreds of OCR-scanned words, unlike sticky notes' 3-note cap, so a full-table rewrite on every mutation would be wasteful.

## 6. Read — store changes

`src/lib/stores/read-store.ts` gains the same "try Supabase first, fall back to local Dexie" shape `work-store.load()` already has:

- `load(persona)`: if authenticated, fetch from Supabase, write-through into the persona-keyed Dexie DB as a local cache, set state from the fetched rows. On failure or no auth, fall back to local Dexie only (today's behavior, unchanged).
- `createRecords` / `updateRecord` / `deleteRecord`: keep writing to local Dexie first (so the UI stays responsive offline), then fire-and-forget push to Supabase via the new `read.ts` helpers — exact same "local is source of truth, cloud sync never blocks UI" pattern `work-store.ts` uses (`syncToSupabase` helper).
- No realtime subscription for Read in this pass — Work and sticky-notes have it because they're edited from multiple surfaces; Read is single-surface (the `/read` page) and a page reload already re-pulls from Supabase. Can be added later if needed.

## 7. Dashboard + StoreInitializer

`src/app/page.tsx`'s Work/Read tiles already read reactively from `useWorkStore`/`useReadStore` — once both stores are persona-scoped and reload on persona switch, the tile counts (`activeCourses.length`, `readRecords.length`, etc.) fix themselves with no tile-level code change.

`src/components/store-initializer.tsx`: add `loadWork(activePersona)` into the existing persona-switch `useEffect` (the one that already calls `loadRead(activePersona)`, `loadGates(activePersona)`, etc.), so Work reloads on every persona switch app-wide, not just when `/work` happens to mount.

## 8. Tests

- `work-store.test.ts`: update for persona-keyed DB (`resetWorkDbForTests` needs to clear all persona-keyed DBs); add a test for the Mani-migration path (old combined DB → new Mani-keyed DB, Harti stays empty); add a cross-persona isolation test mirroring `read-store.test.ts`'s "does not leak records across personas".
- New `src/lib/supabase/read.ts` gets unit coverage for row mapping, mirroring how `work.ts` isn't directly unit-tested today but `work-store.test.ts` exercises it indirectly — Read sync gets the same indirect coverage via `read-store.test.ts` once Supabase calls are mockable (Supabase client already returns `null` when unconfigured in tests, same as Work).

## Out of scope

- No realtime sync for Read (see §6).
- No UI changes — the Work/Read dashboard tiles, `/work`, `/read` pages keep their current layout, only their data source becomes persona-correct.
- No changes to any other domain (gates, missions, inventory, etc.) — already persona-scoped.
