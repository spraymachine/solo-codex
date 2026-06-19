# Persona Segregation for Work + Read Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Work and Read feature data fully segregated by persona (Mani vs Harti), in both local Dexie storage and Supabase, matching the pattern every other domain (gates, missions, sticky notes) already uses.

**Architecture:** Work's Dexie DB becomes keyed by persona (like every other domain) instead of just user id, with a one-time migration moving existing combined local data to Mani. Work's Supabase tables get a `persona` column, bundled with a pending never-applied phone2 schema fix for `work_contacts`. Read gets a brand-new Supabase table + sync layer it never had, following the same incremental per-record CRUD pattern Work already uses for its cloud sync.

**Tech Stack:** Next.js, Zustand, Dexie, Supabase (Postgres + Realtime), Vitest.

**Reference spec:** `docs/superpowers/specs/2026-06-19-persona-segregation-work-read-design.md`

**Live project:** Supabase project id `kwbswiifqqwbeexkdyes` (env `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`). No `supabase/config.toml` / CLI link exists — schema changes are applied via the connected Supabase MCP tools (`mcp__d8d11bea-dacb-4b78-8525-8b7f22f4b459__apply_migration`, `__get_advisors`, `__list_tables`), not `supabase db push`.

---

### Task 1: Stop Vitest from picking up stale worktree tests

**Problem:** `.worktrees/work-feature` is a leftover git worktree (branch `codex/work-feature`, no commits ahead of `main`) containing its own `src/__tests__/**`. `vitest.config.ts`'s `exclude` list doesn't skip it, so every `vitest run` at the repo root double-runs (and sometimes fails on) stale copies of test files with old field names. This pollutes every test run for the rest of this plan with unrelated noise.

**Files:**
- Modify: `vitest.config.ts:11`

- [ ] **Step 1: Add the exclude entry**

In `vitest.config.ts`, change:

```ts
      exclude: ["**/node_modules/**", "**/.claude/**"],
```

to:

```ts
      exclude: ["**/node_modules/**", "**/.claude/**", "**/.worktrees/**"],
```

- [ ] **Step 2: Run the full suite and record the true baseline**

Run: `npx vitest run`

Expected: `Test Files 3 failed | 23 passed (26)`, `Tests 5 failed | 111 passed (116)`. The 3 failing files are pre-existing and **unrelated to this plan** — leave them alone:
- `src/__tests__/components/work-page.test.tsx` ("parses and previews a course plan before saving" — unrelated `fireEvent`/label timing issue)
- `src/__tests__/lib/continuation-store.test.ts` (2 tests — hardcoded against an old "current date", now stale since the real current date moved past May 2026)
- `src/__tests__/lib/work-database.test.ts` ("uses one shared database name independent of persona" — this one gets fixed naturally by Task 4 below, since its premise is exactly the bug this plan fixes)

If you see *more* than these 3 files failing, stop and investigate before continuing — something else is broken.

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "test: exclude .worktrees from vitest discovery"
```

---

### Task 2: Write the Supabase migration files

**Files:**
- Create: `supabase/migrations/20260619000000_add_persona_to_work_tables.sql`
- Create: `supabase/migrations/20260619000001_create_read_records.sql`

- [ ] **Step 1: Write the work-tables persona migration**

Create `supabase/migrations/20260619000000_add_persona_to_work_tables.sql`:

```sql
-- Bundled fix: work_contacts schema drift. The 20260605 migration file
-- (phone2 columns) was written but never applied to the live project —
-- the app has been sending phone_label/phone2/phone2_label on every
-- contact create/update against columns that don't exist, silently
-- failing inside the fire-and-forget Supabase sync wrapper.
alter table work_contacts
  add column if not exists phone_label text not null default '',
  add column if not exists phone2      text not null default '',
  add column if not exists phone2_label text not null default '';

alter table work_contacts
  drop column if exists source,
  drop column if exists next_step;

-- Persona column. Check constraint matches the live 4-value convention
-- already used by every other persona-scoped table (sticky_notes,
-- solo_snapshots, solo_todos, ...) via the untracked allow_persona1_persona2
-- migration — not the 2-value text the older repo migration files show.
alter table work_courses add column if not exists persona text not null default 'mani' check (persona in ('mani','harti','persona1','persona2'));
alter table work_chapters add column if not exists persona text not null default 'mani' check (persona in ('mani','harti','persona1','persona2'));
alter table work_milestones add column if not exists persona text not null default 'mani' check (persona in ('mani','harti','persona1','persona2'));
alter table work_contacts add column if not exists persona text not null default 'mani' check (persona in ('mani','harti','persona1','persona2'));
alter table work_projects add column if not exists persona text not null default 'mani' check (persona in ('mani','harti','persona1','persona2'));

create index if not exists work_courses_user_persona_idx on work_courses (user_id, persona);
create index if not exists work_chapters_user_persona_idx on work_chapters (user_id, persona);
create index if not exists work_milestones_user_persona_idx on work_milestones (user_id, persona);
create index if not exists work_contacts_user_persona_idx on work_contacts (user_id, persona);
create index if not exists work_projects_user_persona_idx on work_projects (user_id, persona);
```

- [ ] **Step 2: Write the read_records creation migration**

Create `supabase/migrations/20260619000001_create_read_records.sql`:

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

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260619000000_add_persona_to_work_tables.sql supabase/migrations/20260619000001_create_read_records.sql
git commit -m "feat: add persona-segregation migrations for work tables and read_records"
```

---

### Task 3: Apply the migrations to the live Supabase project

**This task alters a live production database with real rows** (at design time: 3 `work_courses`, 14 `work_chapters`, 126 `work_milestones`, 7 `work_contacts`, 3 `work_projects`). The column drops (`source`, `next_step`) are one-way. **Stop and get explicit user confirmation before running Step 1** — do not treat this as a routine automated step even inside an otherwise-automated plan execution.

**Tool:** `mcp__d8d11bea-dacb-4b78-8525-8b7f22f4b459__apply_migration` (project_id `kwbswiifqqwbeexkdyes`)

- [ ] **Step 1: Confirm with the user, then apply migration 1**

Call `apply_migration` with `project_id: "kwbswiifqqwbeexkdyes"`, `name: "add_persona_to_work_tables"`, `query`: the full contents of `supabase/migrations/20260619000000_add_persona_to_work_tables.sql`.

- [ ] **Step 2: Apply migration 2**

Call `apply_migration` with `project_id: "kwbswiifqqwbeexkdyes"`, `name: "create_read_records"`, `query`: the full contents of `supabase/migrations/20260619000001_create_read_records.sql`.

- [ ] **Step 3: Verify schema**

Call `mcp__d8d11bea-dacb-4b78-8525-8b7f22f4b459__list_tables` with `project_id: "kwbswiifqqwbeexkdyes"`, `schemas: ["public"]`, `verbose: true`.

Expected: `work_courses`/`work_chapters`/`work_milestones`/`work_contacts`/`work_projects` each have a `persona` column with the 4-value check constraint; `work_contacts` has `phone_label`/`phone2`/`phone2_label` and no longer has `source`/`next_step`; `read_records` exists with the columns from Task 2 Step 2 and RLS enabled.

- [ ] **Step 4: Check advisors**

Call `mcp__d8d11bea-dacb-4b78-8525-8b7f22f4b459__get_advisors` with `project_id: "kwbswiifqqwbeexkdyes"`, `type: "security"`, then again with `type: "performance"`.

Expected: no new advisories introduced by `read_records` or the new `persona` columns (RLS is enabled and uses the optimized `(select auth.uid())` form, so this should be clean). If an advisory does show up, fix it before moving on — don't defer a flagged security issue to a later task.

---

### Task 4: Persona-key the Work Dexie database

**Files:**
- Modify: `src/lib/db/work-database.ts`

- [ ] **Step 1: Rewrite the file**

Replace the full contents of `src/lib/db/work-database.ts` with:

```ts
import Dexie, { type EntityTable } from "dexie";
import type {
  CourseChapter,
  CourseMilestone,
  Persona,
  WorkContact,
  WorkCourse,
  WorkProject,
} from "@/lib/types";

class SoloWorkDB extends Dexie {
  courses!: EntityTable<WorkCourse, "id">;
  chapters!: EntityTable<CourseChapter, "id">;
  milestones!: EntityTable<CourseMilestone, "id">;
  contacts!: EntityTable<WorkContact, "id">;
  projects!: EntityTable<WorkProject, "id">;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      courses: "id, status, deadline, createdAt",
      chapters: "id, courseId, order, deadline",
      milestones: "id, chapterId, completed, order, deadline",
      contacts: "id, status, name, archivedAt, createdAt",
      projects: "id, contactId, status, deadline, archivedAt, createdAt",
    });
  }
}

const workDbCache = new Map<string, SoloWorkDB>();

function openWorkDb(name: string) {
  if (!workDbCache.has(name)) {
    workDbCache.set(name, new SoloWorkDB(name));
  }
  return workDbCache.get(name)!;
}

export function getWorkDatabaseName(userId?: string, persona: Persona = "mani") {
  return `SoloWorkDB-${userId ?? "local"}-${persona}`;
}

export function getWorkDb(userId?: string, persona: Persona = "mani") {
  return openWorkDb(getWorkDatabaseName(userId, persona));
}

// Pre-persona-segregation database name. Used only by the one-time
// migration in work-store.ts that copies existing combined data to Mani.
export function getLegacyWorkDatabaseName(userId?: string) {
  return userId ? `SoloWorkDB-${userId}` : "SoloWorkDB-local";
}

export function getLegacyWorkDb(userId?: string) {
  return openWorkDb(getLegacyWorkDatabaseName(userId));
}

export async function resetWorkDbForTests() {
  for (const [name, db] of workDbCache) {
    await db.delete();
    db.close();
    workDbCache.delete(name);
  }
}
```

This drops the old no-arg/`undefined`-keyed naming (`SoloWorkDB-local`, `SoloWorkDB-${userId}`) in favor of always including a persona segment, and adds `getLegacyWorkDb`/`getLegacyWorkDatabaseName` so the migration in Task 7 can still reach the pre-existing combined database by its old name.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: errors in `src/lib/stores/work-store.ts` and the two work test files (they call the old signatures) — that's expected, fixed in Tasks 5–7. No errors should point at `work-database.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/work-database.ts
git commit -m "feat: key the Work Dexie database by persona"
```

---

### Task 5: Update work-database tests for persona keying

**Files:**
- Modify: `src/__tests__/lib/work-database.test.ts`

- [ ] **Step 1: Replace the file contents**

```ts
import { afterEach, describe, expect, it } from "vitest";
import { getLegacyWorkDatabaseName, getWorkDatabaseName, getWorkDb, resetWorkDbForTests } from "@/lib/db/work-database";
import type { WorkContact } from "@/lib/types";

describe("work database", () => {
  afterEach(async () => {
    await resetWorkDbForTests();
  });

  it("names the database by user and persona", () => {
    expect(getWorkDatabaseName()).toBe("SoloWorkDB-local-mani");
    expect(getWorkDatabaseName(undefined, "harti")).toBe("SoloWorkDB-local-harti");
    expect(getWorkDatabaseName("user-1", "mani")).toBe("SoloWorkDB-user-1-mani");
    expect(getWorkDatabaseName("user-1", "harti")).toBe("SoloWorkDB-user-1-harti");
  });

  it("keeps the pre-persona legacy database name stable", () => {
    expect(getLegacyWorkDatabaseName()).toBe("SoloWorkDB-local");
    expect(getLegacyWorkDatabaseName("user-1")).toBe("SoloWorkDB-user-1");
  });

  it("gives mani and harti separate physical databases", async () => {
    const maniDb = getWorkDb(undefined, "mani");
    const hartiDb = getWorkDb(undefined, "harti");
    const contact: WorkContact = {
      id: "contact-1",
      name: "Studio Set Go",
      status: "client",
      phone: "+91 93469 07002",
      email: "founder@studio.in",
      notes: "Final quote sent.",
      phoneLabel: "",
      phone2: "", phone2Label: "",
      archivedAt: null,
      createdAt: "2026-06-04T00:00:00.000Z",
      updatedAt: "2026-06-04T00:00:00.000Z",
    };

    await maniDb.contacts.add(contact);

    expect(await maniDb.contacts.toArray()).toHaveLength(1);
    expect(await hartiDb.contacts.toArray()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test file**

Run: `npx vitest run src/__tests__/lib/work-database.test.ts`

Expected: `Test Files 1 passed`, `Tests 3 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/lib/work-database.test.ts
git commit -m "test: cover persona-keyed Work database naming"
```

---

### Task 6: Thread persona through the Work Supabase sync layer

**Files:**
- Modify: `src/lib/supabase/work.ts`

- [ ] **Step 1: Add `Persona` to the type import**

Change:

```ts
import type {
  CourseChapter,
  CourseMilestone,
  WorkContact,
  WorkCourse,
  WorkProject,
} from "@/lib/types";
```

to:

```ts
import type {
  CourseChapter,
  CourseMilestone,
  Persona,
  WorkContact,
  WorkCourse,
  WorkProject,
} from "@/lib/types";
```

- [ ] **Step 2: Update `fetchAllWork`**

Replace:

```ts
export async function fetchAllWork(userId: string) {
  const client = sb();
  if (!client) return null;

  const [courses, chapters, milestones, contacts, projects] = await Promise.all([
    client.from("work_courses").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("work_chapters").select("*").eq("user_id", userId).order("order", { ascending: true }),
    client.from("work_milestones").select("*").eq("user_id", userId).order("order", { ascending: true }),
    client.from("work_contacts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("work_projects").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);
```

with:

```ts
export async function fetchAllWork(userId: string, persona: Persona) {
  const client = sb();
  if (!client) return null;

  const [courses, chapters, milestones, contacts, projects] = await Promise.all([
    client.from("work_courses").select("*").eq("user_id", userId).eq("persona", persona).order("created_at", { ascending: false }),
    client.from("work_chapters").select("*").eq("user_id", userId).eq("persona", persona).order("order", { ascending: true }),
    client.from("work_milestones").select("*").eq("user_id", userId).eq("persona", persona).order("order", { ascending: true }),
    client.from("work_contacts").select("*").eq("user_id", userId).eq("persona", persona).order("created_at", { ascending: false }),
    client.from("work_projects").select("*").eq("user_id", userId).eq("persona", persona).order("created_at", { ascending: false }),
  ]);
```

(the rest of the function body — error check and return — is unchanged)

- [ ] **Step 3: Update Courses functions**

Replace the three Courses functions:

```ts
export async function sbCreateCourse(userId: string, course: WorkCourse) {
  const client = sb();
  if (!client) return;
  await client.from("work_courses").upsert({
    id: course.id,
    user_id: userId,
    title: course.title,
    url: course.url,
    goal: course.goal,
    deadline: course.deadline,
    source: course.source,
    status: course.status,
    created_at: course.createdAt,
    updated_at: course.updatedAt,
  });
}

export async function sbUpdateCourse(userId: string, courseId: string, updates: Partial<WorkCourse>) {
  const client = sb();
  if (!client) return;
  await client.from("work_courses").update({
    title: updates.title,
    url: updates.url,
    goal: updates.goal,
    deadline: updates.deadline,
    source: updates.source,
    status: updates.status,
    updated_at: updates.updatedAt ?? nowISO(),
  }).eq("user_id", userId).eq("id", courseId);
}

export async function sbDeleteCourse(userId: string, courseId: string) {
  const client = sb();
  if (!client) return;
  await client.from("work_courses").delete().eq("user_id", userId).eq("id", courseId);
}
```

with:

```ts
export async function sbCreateCourse(userId: string, persona: Persona, course: WorkCourse) {
  const client = sb();
  if (!client) return;
  await client.from("work_courses").upsert({
    id: course.id,
    user_id: userId,
    persona,
    title: course.title,
    url: course.url,
    goal: course.goal,
    deadline: course.deadline,
    source: course.source,
    status: course.status,
    created_at: course.createdAt,
    updated_at: course.updatedAt,
  });
}

export async function sbUpdateCourse(userId: string, persona: Persona, courseId: string, updates: Partial<WorkCourse>) {
  const client = sb();
  if (!client) return;
  await client.from("work_courses").update({
    title: updates.title,
    url: updates.url,
    goal: updates.goal,
    deadline: updates.deadline,
    source: updates.source,
    status: updates.status,
    updated_at: updates.updatedAt ?? nowISO(),
  }).eq("user_id", userId).eq("persona", persona).eq("id", courseId);
}

export async function sbDeleteCourse(userId: string, persona: Persona, courseId: string) {
  const client = sb();
  if (!client) return;
  await client.from("work_courses").delete().eq("user_id", userId).eq("persona", persona).eq("id", courseId);
}
```

- [ ] **Step 4: Update Chapters functions**

Replace:

```ts
export async function sbCreateChapter(userId: string, chapter: CourseChapter) {
  const client = sb();
  if (!client) return;
  const now = nowISO();
  await client.from("work_chapters").upsert({
    id: chapter.id,
    user_id: userId,
    course_id: chapter.courseId,
    title: chapter.title,
    deadline: chapter.deadline,
    estimate: chapter.estimate,
    order: chapter.order,
    created_at: now,
    updated_at: now,
  });
}

export async function sbUpdateChapter(userId: string, chapterId: string, updates: Partial<CourseChapter>) {
  const client = sb();
  if (!client) return;
  await client.from("work_chapters").update({
    title: updates.title,
    deadline: updates.deadline,
    estimate: updates.estimate,
    updated_at: nowISO(),
  }).eq("user_id", userId).eq("id", chapterId);
}

export async function sbDeleteChapter(userId: string, chapterId: string) {
  const client = sb();
  if (!client) return;
  await client.from("work_chapters").delete().eq("user_id", userId).eq("id", chapterId);
}
```

with:

```ts
export async function sbCreateChapter(userId: string, persona: Persona, chapter: CourseChapter) {
  const client = sb();
  if (!client) return;
  const now = nowISO();
  await client.from("work_chapters").upsert({
    id: chapter.id,
    user_id: userId,
    persona,
    course_id: chapter.courseId,
    title: chapter.title,
    deadline: chapter.deadline,
    estimate: chapter.estimate,
    order: chapter.order,
    created_at: now,
    updated_at: now,
  });
}

export async function sbUpdateChapter(userId: string, persona: Persona, chapterId: string, updates: Partial<CourseChapter>) {
  const client = sb();
  if (!client) return;
  await client.from("work_chapters").update({
    title: updates.title,
    deadline: updates.deadline,
    estimate: updates.estimate,
    updated_at: nowISO(),
  }).eq("user_id", userId).eq("persona", persona).eq("id", chapterId);
}

export async function sbDeleteChapter(userId: string, persona: Persona, chapterId: string) {
  const client = sb();
  if (!client) return;
  await client.from("work_chapters").delete().eq("user_id", userId).eq("persona", persona).eq("id", chapterId);
}
```

- [ ] **Step 5: Update Milestones functions**

Replace:

```ts
export async function sbCreateMilestone(userId: string, milestone: CourseMilestone) {
  const client = sb();
  if (!client) return;
  const now = nowISO();
  await client.from("work_milestones").upsert({
    id: milestone.id,
    user_id: userId,
    chapter_id: milestone.chapterId,
    title: milestone.title,
    deadline: milestone.deadline,
    estimate: milestone.estimate,
    link: milestone.link,
    notes: milestone.notes,
    completed: milestone.completed,
    order: milestone.order,
    created_at: now,
    updated_at: now,
  });
}

export async function sbUpdateMilestone(userId: string, milestoneId: string, updates: Partial<CourseMilestone>) {
  const client = sb();
  if (!client) return;
  await client.from("work_milestones").update({
    title: updates.title,
    deadline: updates.deadline,
    estimate: updates.estimate,
    link: updates.link,
    notes: updates.notes,
    completed: updates.completed,
    updated_at: nowISO(),
  }).eq("user_id", userId).eq("id", milestoneId);
}

export async function sbDeleteMilestone(userId: string, milestoneId: string) {
  const client = sb();
  if (!client) return;
  await client.from("work_milestones").delete().eq("user_id", userId).eq("id", milestoneId);
}
```

with:

```ts
export async function sbCreateMilestone(userId: string, persona: Persona, milestone: CourseMilestone) {
  const client = sb();
  if (!client) return;
  const now = nowISO();
  await client.from("work_milestones").upsert({
    id: milestone.id,
    user_id: userId,
    persona,
    chapter_id: milestone.chapterId,
    title: milestone.title,
    deadline: milestone.deadline,
    estimate: milestone.estimate,
    link: milestone.link,
    notes: milestone.notes,
    completed: milestone.completed,
    order: milestone.order,
    created_at: now,
    updated_at: now,
  });
}

export async function sbUpdateMilestone(userId: string, persona: Persona, milestoneId: string, updates: Partial<CourseMilestone>) {
  const client = sb();
  if (!client) return;
  await client.from("work_milestones").update({
    title: updates.title,
    deadline: updates.deadline,
    estimate: updates.estimate,
    link: updates.link,
    notes: updates.notes,
    completed: updates.completed,
    updated_at: nowISO(),
  }).eq("user_id", userId).eq("persona", persona).eq("id", milestoneId);
}

export async function sbDeleteMilestone(userId: string, persona: Persona, milestoneId: string) {
  const client = sb();
  if (!client) return;
  await client.from("work_milestones").delete().eq("user_id", userId).eq("persona", persona).eq("id", milestoneId);
}
```

- [ ] **Step 6: Update Contacts functions**

Replace:

```ts
export async function sbCreateContact(userId: string, contact: WorkContact) {
  const client = sb();
  if (!client) return;
  await client.from("work_contacts").upsert({
    id: contact.id,
    user_id: userId,
    name: contact.name,
    status: contact.status,
    phone: contact.phone,
    phone_label: contact.phoneLabel,
    phone2: contact.phone2,
    phone2_label: contact.phone2Label,
    email: contact.email,
    notes: contact.notes,
    archived_at: contact.archivedAt,
    created_at: contact.createdAt,
    updated_at: contact.updatedAt,
  });
}

export async function sbUpdateContact(userId: string, contactId: string, updates: Partial<WorkContact>) {
  const client = sb();
  if (!client) return;
  await client.from("work_contacts").update({
    name: updates.name,
    status: updates.status,
    phone: updates.phone,
    phone_label: updates.phoneLabel,
    phone2: updates.phone2,
    phone2_label: updates.phone2Label,
    email: updates.email,
    notes: updates.notes,
    archived_at: updates.archivedAt,
    updated_at: updates.updatedAt ?? nowISO(),
  }).eq("user_id", userId).eq("id", contactId);
}
```

with:

```ts
export async function sbCreateContact(userId: string, persona: Persona, contact: WorkContact) {
  const client = sb();
  if (!client) return;
  await client.from("work_contacts").upsert({
    id: contact.id,
    user_id: userId,
    persona,
    name: contact.name,
    status: contact.status,
    phone: contact.phone,
    phone_label: contact.phoneLabel,
    phone2: contact.phone2,
    phone2_label: contact.phone2Label,
    email: contact.email,
    notes: contact.notes,
    archived_at: contact.archivedAt,
    created_at: contact.createdAt,
    updated_at: contact.updatedAt,
  });
}

export async function sbUpdateContact(userId: string, persona: Persona, contactId: string, updates: Partial<WorkContact>) {
  const client = sb();
  if (!client) return;
  await client.from("work_contacts").update({
    name: updates.name,
    status: updates.status,
    phone: updates.phone,
    phone_label: updates.phoneLabel,
    phone2: updates.phone2,
    phone2_label: updates.phone2Label,
    email: updates.email,
    notes: updates.notes,
    archived_at: updates.archivedAt,
    updated_at: updates.updatedAt ?? nowISO(),
  }).eq("user_id", userId).eq("persona", persona).eq("id", contactId);
}
```

- [ ] **Step 7: Update Projects functions**

Replace:

```ts
export async function sbCreateProject(userId: string, project: WorkProject) {
  const client = sb();
  if (!client) return;
  await client.from("work_projects").upsert({
    id: project.id,
    user_id: userId,
    contact_id: project.contactId,
    title: project.title,
    status: project.status,
    deadline: project.deadline,
    notes: project.notes,
    progress: project.progress,
    archived_at: project.archivedAt,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  });
}

export async function sbUpdateProject(userId: string, projectId: string, updates: Partial<WorkProject>) {
  const client = sb();
  if (!client) return;
  await client.from("work_projects").update({
    title: updates.title,
    status: updates.status,
    deadline: updates.deadline,
    notes: updates.notes,
    progress: updates.progress,
    contact_id: updates.contactId,
    archived_at: updates.archivedAt,
    updated_at: updates.updatedAt ?? nowISO(),
  }).eq("user_id", userId).eq("id", projectId);
}
```

with:

```ts
export async function sbCreateProject(userId: string, persona: Persona, project: WorkProject) {
  const client = sb();
  if (!client) return;
  await client.from("work_projects").upsert({
    id: project.id,
    user_id: userId,
    persona,
    contact_id: project.contactId,
    title: project.title,
    status: project.status,
    deadline: project.deadline,
    notes: project.notes,
    progress: project.progress,
    archived_at: project.archivedAt,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  });
}

export async function sbUpdateProject(userId: string, persona: Persona, projectId: string, updates: Partial<WorkProject>) {
  const client = sb();
  if (!client) return;
  await client.from("work_projects").update({
    title: updates.title,
    status: updates.status,
    deadline: updates.deadline,
    notes: updates.notes,
    progress: updates.progress,
    contact_id: updates.contactId,
    archived_at: updates.archivedAt,
    updated_at: updates.updatedAt ?? nowISO(),
  }).eq("user_id", userId).eq("persona", persona).eq("id", projectId);
}
```

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`

Expected: remaining errors only in `src/lib/stores/work-store.ts` (callers not yet updated — fixed in Task 7).

- [ ] **Step 9: Commit**

```bash
git add src/lib/supabase/work.ts
git commit -m "feat: thread persona through Work Supabase sync functions"
```

---

### Task 7: Make the Work store persona-aware

**Files:**
- Modify: `src/lib/stores/work-store.ts`

- [ ] **Step 1: Replace the full file contents**

```ts
"use client";

import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getDb } from "@/lib/db/database";
import { getLegacyWorkDb, getWorkDb } from "@/lib/db/work-database";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ParseCoursePlanResult } from "@/lib/work/course-parser";
import type {
  CourseChapter,
  CourseMilestone,
  CourseStatus,
  Persona,
  WorkContact,
  WorkContactStatus,
  WorkCourse,
  WorkProject,
  WorkProjectStatus,
} from "@/lib/types";
import { generateId, nowISO } from "@/lib/utils";
import {
  fetchAllWork,
  getWorkUserId,
  sbCreateChapter,
  sbCreateContact,
  sbCreateCourse,
  sbCreateMilestone,
  sbCreateProject,
  sbDeleteChapter,
  sbDeleteCourse,
  sbDeleteMilestone,
  sbUpdateChapter,
  sbUpdateContact,
  sbUpdateCourse,
  sbUpdateMilestone,
  sbUpdateProject,
} from "@/lib/supabase/work";

type ContactInput = {
  name: string;
  status: WorkContactStatus;
  phone: string;
  phoneLabel: string;
  phone2: string;
  phone2Label: string;
  email: string;
  notes: string;
};

type ProjectInput = {
  contactId: string;
  title: string;
  status: WorkProjectStatus;
  deadline: string;
  notes: string;
  progress: number;
};

type CourseInput = {
  title: string;
  url: string;
  deadline: string;
  status: CourseStatus;
};

interface WorkState {
  contacts: WorkContact[];
  projects: WorkProject[];
  courses: WorkCourse[];
  chapters: CourseChapter[];
  milestones: CourseMilestone[];
  loaded: boolean;
  _userId: string | null;
  _persona: Persona | null;
  _realtimeChannel: RealtimeChannel | null;
  load: (persona: Persona) => Promise<void>;
  unsubscribe: () => Promise<void>;
  createContact: (input: ContactInput) => Promise<WorkContact>;
  updateContact: (id: string, updates: Partial<ContactInput>) => Promise<void>;
  archiveContact: (id: string) => Promise<void>;
  createProject: (input: ProjectInput) => Promise<WorkProject>;
  updateProject: (id: string, updates: Partial<ProjectInput>) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  createCourse: (input: CourseInput) => Promise<WorkCourse>;
  createChapter: (courseId: string, title: string) => Promise<CourseChapter>;
  createMilestone: (chapterId: string, title: string) => Promise<CourseMilestone>;
  saveParsedCourse: (parsed: ParseCoursePlanResult) => Promise<WorkCourse>;
  toggleMilestone: (id: string, completed: boolean) => Promise<void>;
  updateMilestone: (id: string, updates: Partial<Omit<CourseMilestone, "id" | "chapterId" | "order">>) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;
  updateChapter: (id: string, updates: Partial<Omit<CourseChapter, "id" | "courseId" | "order">>) => Promise<void>;
  deleteChapter: (id: string) => Promise<void>;
  updateCourse: (id: string, updates: Partial<Omit<WorkCourse, "id" | "createdAt">>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
}

function sortByCreatedDesc<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

let migrationPromise: Promise<void> | null = null;

async function runLegacyLeadMigration() {
  const workDb = getWorkDb();
  const legacyLeads = [
    ...(await getDb("mani").leads.toArray()),
    ...(await getDb("harti").leads.toArray()),
  ];
  const seen = new Set<string>();
  const now = nowISO();
  const contacts: WorkContact[] = [];

  for (const lead of legacyLeads) {
    const key = `${lead.name.trim().toLowerCase()}|${lead.email.trim().toLowerCase()}|${lead.phone.trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    contacts.push({
      id: generateId(),
      name: lead.name.trim(),
      status: "lead",
      phone: lead.phone,
      phoneLabel: "",
      phone2: "",
      phone2Label: "",
      email: lead.email,
      notes: lead.notes,
      archivedAt: null,
      createdAt: lead.createdAt,
      updatedAt: now,
    });
  }

  if (contacts.length > 0) {
    await workDb.transaction("rw", workDb.contacts, async () => {
      const existingContactCount = await workDb.contacts.count();
      if (existingContactCount > 0) return;
      await workDb.contacts.bulkAdd(contacts);
    });
  }
}

async function migrateLegacyLeadsIfEmpty() {
  migrationPromise ??= runLegacyLeadMigration().finally(() => {
    migrationPromise = null;
  });
  await migrationPromise;
}

// One-time local migration: before this change, Work had a single Dexie
// database shared by both personas. Existing combined data is assigned to
// Mani (see docs/superpowers/specs/2026-06-19-persona-segregation-work-read-design.md).
// Harti's persona-keyed database starts empty. This only matters for the
// unauthenticated/offline fallback path — authenticated users get the
// equivalent backfill for free from the Supabase `persona` column default.
let workMigrationPromise: Promise<void> | null = null;

async function runLegacyWorkMigration(userId: string | undefined) {
  const maniDb = getWorkDb(userId, "mani");
  const existingCount =
    (await maniDb.courses.count()) +
    (await maniDb.contacts.count()) +
    (await maniDb.projects.count());
  if (existingCount > 0) return;

  const legacyDb = getLegacyWorkDb(userId);
  const [courses, chapters, milestones, contacts, projects] = await Promise.all([
    legacyDb.courses.toArray(),
    legacyDb.chapters.toArray(),
    legacyDb.milestones.toArray(),
    legacyDb.contacts.toArray(),
    legacyDb.projects.toArray(),
  ]);
  if (courses.length + chapters.length + milestones.length + contacts.length + projects.length === 0) {
    return;
  }

  await maniDb.transaction(
    "rw",
    [maniDb.courses, maniDb.chapters, maniDb.milestones, maniDb.contacts, maniDb.projects],
    async () => {
      if (courses.length) await maniDb.courses.bulkAdd(courses);
      if (chapters.length) await maniDb.chapters.bulkAdd(chapters);
      if (milestones.length) await maniDb.milestones.bulkAdd(milestones);
      if (contacts.length) await maniDb.contacts.bulkAdd(contacts);
      if (projects.length) await maniDb.projects.bulkAdd(projects);
    },
  );
}

async function migrateLegacyWorkDbIfEmpty(userId: string | undefined) {
  workMigrationPromise ??= runLegacyWorkMigration(userId).finally(() => {
    workMigrationPromise = null;
  });
  await workMigrationPromise;
}

// Fire-and-forget Supabase sync — never throws, never blocks UI
async function syncToSupabase(fn: (userId: string) => Promise<void>) {
  try {
    const userId = await getWorkUserId();
    if (!userId) return;
    await fn(userId);
  } catch {
    // swallow — local state is source of truth
  }
}

async function refreshFromRemote(
  userId: string,
  persona: Persona,
  set: (partial: Partial<WorkState>) => void,
) {
  const remote = await fetchAllWork(userId, persona);
  if (!remote) return;
  const db = getWorkDb(userId, persona);
  await db.transaction("rw", [db.courses, db.chapters, db.milestones, db.contacts, db.projects], async () => {
    await Promise.all([
      db.courses.bulkPut(remote.courses),
      db.chapters.bulkPut(remote.chapters),
      db.milestones.bulkPut(remote.milestones),
      db.contacts.bulkPut(remote.contacts),
      db.projects.bulkPut(remote.projects),
    ]);
  });
  set({
    courses: remote.courses,
    chapters: remote.chapters,
    milestones: remote.milestones,
    contacts: sortByCreatedDesc(remote.contacts),
    projects: sortByCreatedDesc(remote.projects),
  });
}

export const useWorkStore = create<WorkState>((set, get) => {
  const db = () => getWorkDb(get()._userId ?? undefined, get()._persona ?? "mani");
  return ({
  contacts: [],
  projects: [],
  courses: [],
  chapters: [],
  milestones: [],
  loaded: false,
  _userId: null,
  _persona: null,
  _realtimeChannel: null,

  async unsubscribe() {
    const { _realtimeChannel } = get();
    if (_realtimeChannel) {
      const client = getSupabaseBrowserClient();
      set({ _realtimeChannel: null });
      if (client) await client.removeChannel(_realtimeChannel);
    }
  },

  async load(persona) {
    const personaChanged = get()._persona !== persona;
    set({ _persona: persona });
    if (personaChanged) {
      await get().unsubscribe();
    }

    // Try Supabase first — if authenticated, use as source of truth
    try {
      const userId = await getWorkUserId();
      if (userId) {
        set({ _userId: userId });
        await refreshFromRemote(userId, persona, set);
        set({ loaded: true });

        // Subscribe to realtime updates across all 5 tables
        const client = getSupabaseBrowserClient();
        if (client && isSupabaseConfigured() && !get()._realtimeChannel) {
          const tables = ["work_courses", "work_chapters", "work_milestones", "work_contacts", "work_projects"];
          let channel = client.channel(`work:${userId}:${persona}`);
          for (const table of tables) {
            channel = channel.on(
              "postgres_changes" as any,
              { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
              () => { void refreshFromRemote(userId, persona, set); },
            );
          }
          channel.subscribe();
          set({ _realtimeChannel: channel });
        }
        return;
      }
    } catch {
      // fall through to local
    }

    // Fallback: local Dexie (unauthenticated / offline only)
    if (persona === "mani") {
      await migrateLegacyWorkDbIfEmpty(get()._userId ?? undefined);
      await migrateLegacyLeadsIfEmpty();
    }
    const localDb = getWorkDb(get()._userId ?? undefined, persona);
    const [contacts, projects, courses, chapters, milestones] = await Promise.all([
      localDb.contacts.toArray(),
      localDb.projects.toArray(),
      localDb.courses.toArray(),
      localDb.chapters.toArray(),
      localDb.milestones.toArray(),
    ]);
    set({
      contacts: sortByCreatedDesc(contacts),
      projects: sortByCreatedDesc(projects),
      courses: sortByCreatedDesc(courses),
      chapters,
      milestones,
      loaded: true,
    });
  },

  async createContact(input) {
    const now = nowISO();
    const contact: WorkContact = { id: generateId(), archivedAt: null, createdAt: now, updatedAt: now, ...input };
    await db().contacts.add(contact);
    set((state) => ({ contacts: [contact, ...state.contacts] }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbCreateContact(uid, persona, contact));
    return contact;
  },

  async updateContact(id, updates) {
    const next = { ...updates, updatedAt: nowISO() };
    await db().contacts.update(id, next);
    set((state) => ({ contacts: state.contacts.map((c) => (c.id === id ? { ...c, ...next } : c)) }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbUpdateContact(uid, persona, id, next));
  },

  async archiveContact(id) {
    const archivedAt = nowISO();
    const next = { archivedAt, status: "archived" as const, updatedAt: archivedAt };
    await db().contacts.update(id, next);
    set((state) => ({ contacts: state.contacts.map((c) => (c.id === id ? { ...c, ...next } : c)) }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbUpdateContact(uid, persona, id, next));
  },

  async createProject(input) {
    if (!input.contactId) throw new Error("Project requires a client or lead.");
    const contact = get().contacts.find((c) => c.id === input.contactId);
    if (!contact) throw new Error("Project requires an existing client or lead.");
    const now = nowISO();
    const project: WorkProject = { id: generateId(), archivedAt: null, createdAt: now, updatedAt: now, ...input };
    await db().projects.add(project);
    set((state) => ({ projects: [project, ...state.projects] }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbCreateProject(uid, persona, project));
    return project;
  },

  async updateProject(id, updates) {
    if (updates.contactId !== undefined) {
      if (!updates.contactId) throw new Error("Project requires a client or lead.");
      const contact = get().contacts.find((c) => c.id === updates.contactId);
      if (!contact) throw new Error("Project requires an existing client or lead.");
    }
    const next = { ...updates, updatedAt: nowISO() };
    await db().projects.update(id, next);
    set((state) => ({ projects: state.projects.map((p) => (p.id === id ? { ...p, ...next } : p)) }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbUpdateProject(uid, persona, id, next));
  },

  async archiveProject(id) {
    const archivedAt = nowISO();
    const next = { archivedAt, status: "archived" as const, updatedAt: archivedAt };
    await db().projects.update(id, next);
    set((state) => ({ projects: state.projects.map((p) => (p.id === id ? { ...p, ...next } : p)) }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbUpdateProject(uid, persona, id, next));
  },

  async saveParsedCourse(parsed) {
    if (!parsed.course || parsed.errors.length > 0) throw new Error("Cannot save a course with parser errors.");
    const now = nowISO();
    const course: WorkCourse = {
      id: generateId(),
      title: parsed.course.title,
      url: parsed.course.url,
      goal: parsed.course.goal,
      deadline: parsed.course.deadline,
      source: parsed.course.source,
      status: parsed.course.status,
      createdAt: now,
      updatedAt: now,
    };
    const chapters: CourseChapter[] = [];
    const milestones: CourseMilestone[] = [];

    parsed.chapters.forEach((chapter, ci) => {
      const chapterRow: CourseChapter = {
        id: generateId(),
        courseId: course.id,
        title: chapter.title,
        deadline: chapter.deadline,
        estimate: chapter.estimate,
        order: ci,
      };
      chapters.push(chapterRow);
      chapter.milestones.forEach((milestone, mi) => {
        milestones.push({
          id: generateId(),
          chapterId: chapterRow.id,
          title: milestone.title,
          deadline: milestone.deadline,
          estimate: milestone.estimate,
          link: milestone.link,
          notes: milestone.notes,
          completed: false,
          order: mi,
        });
      });
    });

    await db().transaction("rw", [db().courses, db().chapters, db().milestones], async () => {
      await db().courses.add(course);
      if (chapters.length > 0) await db().chapters.bulkAdd(chapters);
      if (milestones.length > 0) await db().milestones.bulkAdd(milestones);
    });

    set((state) => ({
      courses: [course, ...state.courses],
      chapters: [...state.chapters, ...chapters],
      milestones: [...state.milestones, ...milestones],
    }));

    const persona = get()._persona ?? "mani";
    void syncToSupabase(async (uid) => {
      await sbCreateCourse(uid, persona, course);
      await Promise.all(chapters.map((ch) => sbCreateChapter(uid, persona, ch)));
      await Promise.all(milestones.map((m) => sbCreateMilestone(uid, persona, m)));
    });

    return course;
  },

  async createCourse(input) {
    const now = nowISO();
    const course: WorkCourse = {
      id: generateId(),
      title: input.title,
      url: input.url,
      goal: "",
      deadline: input.deadline,
      source: "",
      status: input.status,
      createdAt: now,
      updatedAt: now,
    };
    await db().courses.add(course);
    set((state) => ({ courses: [course, ...state.courses] }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbCreateCourse(uid, persona, course));
    return course;
  },

  async createChapter(courseId, title) {
    const existing = get().chapters.filter((c) => c.courseId === courseId);
    const chapter: CourseChapter = {
      id: generateId(),
      courseId,
      title,
      deadline: "",
      estimate: "",
      order: existing.length,
    };
    await db().chapters.add(chapter);
    set((state) => ({ chapters: [...state.chapters, chapter] }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbCreateChapter(uid, persona, chapter));
    return chapter;
  },

  async createMilestone(chapterId, title) {
    const existing = get().milestones.filter((m) => m.chapterId === chapterId);
    const milestone: CourseMilestone = {
      id: generateId(),
      chapterId,
      title,
      deadline: "",
      estimate: "",
      link: "",
      notes: "",
      completed: false,
      order: existing.length,
    };
    await db().milestones.add(milestone);
    set((state) => ({ milestones: [...state.milestones, milestone] }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbCreateMilestone(uid, persona, milestone));
    return milestone;
  },

  async toggleMilestone(id, completed) {
    await db().milestones.update(id, { completed });
    set((state) => ({ milestones: state.milestones.map((m) => (m.id === id ? { ...m, completed } : m)) }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbUpdateMilestone(uid, persona, id, { completed }));
  },

  async updateMilestone(id, updates) {
    await db().milestones.update(id, updates);
    set((state) => ({ milestones: state.milestones.map((m) => (m.id === id ? { ...m, ...updates } : m)) }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbUpdateMilestone(uid, persona, id, updates));
  },

  async deleteMilestone(id) {
    await db().milestones.delete(id);
    set((state) => ({ milestones: state.milestones.filter((m) => m.id !== id) }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbDeleteMilestone(uid, persona, id));
  },

  async updateChapter(id, updates) {
    await db().chapters.update(id, updates);
    set((state) => ({ chapters: state.chapters.map((c) => (c.id === id ? { ...c, ...updates } : c)) }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbUpdateChapter(uid, persona, id, updates));
  },

  async deleteChapter(id) {
    const milestoneIds = (await db().milestones.where("chapterId").equals(id).toArray()).map((m) => m.id);
    await db().transaction("rw", [db().chapters, db().milestones], async () => {
      await db().milestones.bulkDelete(milestoneIds);
      await db().chapters.delete(id);
    });
    set((state) => ({
      chapters: state.chapters.filter((c) => c.id !== id),
      milestones: state.milestones.filter((m) => m.chapterId !== id),
    }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase(async (uid) => {
      await Promise.all(milestoneIds.map((mid) => sbDeleteMilestone(uid, persona, mid)));
      await sbDeleteChapter(uid, persona, id);
    });
  },

  async updateCourse(id, updates) {
    const updatedAt = nowISO();
    await db().courses.update(id, { ...updates, updatedAt });
    set((state) => ({ courses: state.courses.map((c) => (c.id === id ? { ...c, ...updates, updatedAt } : c)) }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbUpdateCourse(uid, persona, id, { ...updates, updatedAt }));
  },

  async deleteCourse(id) {
    const chapterIds = (await db().chapters.where("courseId").equals(id).toArray()).map((c) => c.id);
    const milestoneIds = (
      await Promise.all(chapterIds.map((cid) => db().milestones.where("chapterId").equals(cid).toArray()))
    ).flat().map((m) => m.id);

    await db().transaction("rw", [db().courses, db().chapters, db().milestones], async () => {
      await db().milestones.bulkDelete(milestoneIds);
      await db().chapters.bulkDelete(chapterIds);
      await db().courses.delete(id);
    });
    set((state) => ({
      courses: state.courses.filter((c) => c.id !== id),
      chapters: state.chapters.filter((c) => !chapterIds.includes(c.id)),
      milestones: state.milestones.filter((m) => !milestoneIds.includes(m.id)),
    }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbDeleteCourse(uid, persona, id));
  },
});
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: remaining errors only in `src/__tests__/lib/work-store.test.ts`, `src/__tests__/components/work-page.test.tsx` (old `load()` no-arg calls), and `src/components/work/work-page.tsx` (old `load()` no-arg call) — fixed in Tasks 8 and 9.

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/work-store.ts
git commit -m "feat: make the Work store persona-aware, with legacy-data migration to Mani"
```

---

### Task 8: Update Work store tests for persona awareness

**Files:**
- Modify: `src/__tests__/lib/work-store.test.ts`

- [ ] **Step 1: Replace the full file contents**

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/database";
import { getLegacyWorkDb, resetWorkDbForTests } from "@/lib/db/work-database";
import { useWorkStore } from "@/lib/stores/work-store";

function resetWorkStoreState() {
  useWorkStore.setState({
    contacts: [],
    projects: [],
    courses: [],
    chapters: [],
    milestones: [],
    loaded: false,
  });
}

describe("work store", () => {
  beforeEach(async () => {
    await resetWorkDbForTests();
    await getDb("mani").leads.clear();
    await getDb("harti").leads.clear();
    resetWorkStoreState();
  });

  afterEach(async () => {
    await resetWorkDbForTests();
    await getDb("mani").leads.clear();
    await getDb("harti").leads.clear();
  });

  it("creates and archives contacts", async () => {
    const contact = await useWorkStore.getState().createContact({
      name: "Studio Set Go",
      status: "client",
      phone: "+91 93469 07002",
      email: "founder@studio.in",
      notes: "Final quote sent.",
      phoneLabel: "",
      phone2: "", phone2Label: "",
    });

    expect(useWorkStore.getState().contacts).toHaveLength(1);
    expect(contact.status).toBe("client");

    await useWorkStore.getState().archiveContact(contact.id);
    expect(useWorkStore.getState().contacts[0].archivedAt).not.toBeNull();
  });

  it("rejects project creation without contactId", async () => {
    await expect(
      useWorkStore.getState().createProject({
        contactId: "",
        title: "Lite booking system",
        status: "active",
        deadline: "2026-06-18",
        notes: "Launch scope",
        progress: 62,
      }),
    ).rejects.toThrow("Project requires a client or lead.");
  });

  it("creates projects attached to contacts", async () => {
    const contact = await useWorkStore.getState().createContact({
      name: "Studio Set Go",
      status: "client",
      phone: "",
      email: "",
      notes: "",
      phoneLabel: "",
      phone2: "", phone2Label: "",
    });

    const project = await useWorkStore.getState().createProject({
      contactId: contact.id,
      title: "Lite booking system",
      status: "active",
      deadline: "2026-06-18",
      notes: "Launch scope",
      progress: 62,
    });

    expect(project.contactId).toBe(contact.id);
    expect(useWorkStore.getState().projects).toHaveLength(1);
  });

  it("rejects project contact updates to missing contacts", async () => {
    const contact = await useWorkStore.getState().createContact({
      name: "Studio Set Go",
      status: "client",
      phone: "",
      email: "",
      notes: "",
      phoneLabel: "",
      phone2: "", phone2Label: "",
    });
    const project = await useWorkStore.getState().createProject({
      contactId: contact.id,
      title: "Lite booking system",
      status: "active",
      deadline: "2026-06-18",
      notes: "Launch scope",
      progress: 62,
    });

    await expect(
      useWorkStore.getState().updateProject(project.id, { contactId: "" }),
    ).rejects.toThrow("Project requires a client or lead.");
    await expect(
      useWorkStore.getState().updateProject(project.id, { contactId: "missing-contact" }),
    ).rejects.toThrow("Project requires an existing client or lead.");
  });

  it("saves parsed courses with chapters and milestones", async () => {
    await useWorkStore.getState().saveParsedCourse({
      course: {
        title: "Advanced Next.js",
        url: "https://course.com",
        goal: "Ship better SaaS work",
        deadline: "2026-07-30",
        source: "Udemy",
        status: "active",
      },
      chapters: [
        {
          title: "Routing",
          deadline: "2026-06-12",
          estimate: "3h",
          milestones: [
            {
              title: "Watch routing lessons",
              deadline: "2026-06-10",
              estimate: "45m",
              link: "https://lesson.com",
              notes: "Focus on behavior changes.",
            },
          ],
        },
      ],
      errors: [],
      warnings: [],
    });

    expect(useWorkStore.getState().courses).toHaveLength(1);
    expect(useWorkStore.getState().chapters).toHaveLength(1);
    expect(useWorkStore.getState().milestones).toHaveLength(1);
    expect(useWorkStore.getState().milestones[0].completed).toBe(false);
  });

  it("migrates old persona leads into shared contacts once when contacts are empty", async () => {
    await getDb("mani").leads.add({
      id: "lead-1",
      name: "Apex Fitness",
      phone: "",
      email: "apex@example.com",
      notes: "WhatsApp inquiry",
      createdAt: "2026-06-04T00:00:00.000Z",
    });

    await useWorkStore.getState().load("mani");

    expect(useWorkStore.getState().contacts).toHaveLength(1);
    expect(useWorkStore.getState().contacts[0].name).toBe("Apex Fitness");
    expect(useWorkStore.getState().contacts[0].email).toBe("apex@example.com");

    await useWorkStore.getState().load("mani");
    expect(useWorkStore.getState().contacts).toHaveLength(1);
  });

  it("migrates leads from both personas and deduplicates matches", async () => {
    await getDb("mani").leads.add({
      id: "lead-1",
      name: "Apex Fitness",
      phone: "+91 90000 00000",
      email: "apex@example.com",
      notes: "First note",
      createdAt: "2026-06-04T00:00:00.000Z",
    });
    await getDb("harti").leads.add({
      id: "lead-2",
      name: " apex fitness ",
      phone: "+91 90000 00000",
      email: "APEX@example.com",
      notes: "Duplicate note",
      createdAt: "2026-06-05T00:00:00.000Z",
    });
    await getDb("harti").leads.add({
      id: "lead-3",
      name: "Studio Set Go",
      phone: "",
      email: "studio@example.com",
      notes: "Harti lead",
      createdAt: "2026-06-06T00:00:00.000Z",
    });

    await useWorkStore.getState().load("mani");

    expect(useWorkStore.getState().contacts.map((contact) => contact.name)).toEqual([
      "Studio Set Go",
      "Apex Fitness",
    ]);
  });

  it("does not duplicate migrated leads during concurrent loads", async () => {
    await getDb("mani").leads.add({
      id: "lead-1",
      name: "Apex Fitness",
      phone: "",
      email: "apex@example.com",
      notes: "WhatsApp inquiry",
      createdAt: "2026-06-04T00:00:00.000Z",
    });

    await Promise.all([useWorkStore.getState().load("mani"), useWorkStore.getState().load("mani")]);

    expect(useWorkStore.getState().contacts).toHaveLength(1);
  });

  it("migrates existing combined work data to Mani only, leaving Harti empty", async () => {
    const legacyDb = getLegacyWorkDb();
    await legacyDb.contacts.add({
      id: "legacy-contact-1",
      name: "Old Shared Client",
      status: "client",
      phone: "",
      phoneLabel: "",
      phone2: "",
      phone2Label: "",
      email: "old@example.com",
      notes: "",
      archivedAt: null,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    });

    await useWorkStore.getState().load("mani");
    expect(useWorkStore.getState().contacts.map((c) => c.name)).toEqual(["Old Shared Client"]);

    resetWorkStoreState();
    await useWorkStore.getState().load("harti");
    expect(useWorkStore.getState().contacts).toEqual([]);
  });

  it("keeps Mani and Harti work data isolated", async () => {
    await useWorkStore.getState().load("mani");
    const maniContact = await useWorkStore.getState().createContact({
      name: "Mani's Client",
      status: "client",
      phone: "", email: "", notes: "",
      phoneLabel: "", phone2: "", phone2Label: "",
    });
    expect(useWorkStore.getState().contacts).toHaveLength(1);

    resetWorkStoreState();
    await useWorkStore.getState().load("harti");
    expect(useWorkStore.getState().contacts).toHaveLength(0);

    const hartiContact = await useWorkStore.getState().createContact({
      name: "Harti's Client",
      status: "lead",
      phone: "", email: "", notes: "",
      phoneLabel: "", phone2: "", phone2Label: "",
    });
    expect(useWorkStore.getState().contacts).toHaveLength(1);
    expect(hartiContact.id).not.toBe(maniContact.id);

    resetWorkStoreState();
    await useWorkStore.getState().load("mani");
    expect(useWorkStore.getState().contacts.map((c) => c.id)).toEqual([maniContact.id]);
  });
});
```

- [ ] **Step 2: Run the test file**

Run: `npx vitest run src/__tests__/lib/work-store.test.ts`

Expected: all tests pass (10 tests).

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/lib/work-store.test.ts
git commit -m "test: cover Work persona isolation and legacy-to-Mani migration"
```

---

### Task 9: Make WorkPage reload on persona switch

**Files:**
- Modify: `src/components/work/work-page.tsx`

- [ ] **Step 1: Update the component**

Replace:

```tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useWorkStore } from "@/lib/stores/work-store";
import { CoursesSection } from "./courses-section";
import { WorkListsSection } from "./work-lists-section";

export function WorkPage() {
  const loaded = useWorkStore((state) => state.loaded);
  const load = useWorkStore((state) => state.load);

  const unsubscribe = useWorkStore((state) => state.unsubscribe);

  useEffect(() => {
    if (!loaded) void load();
    return () => { void unsubscribe(); };
  }, [load, loaded, unsubscribe]);
```

with:

```tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useWorkStore } from "@/lib/stores/work-store";
import { CoursesSection } from "./courses-section";
import { WorkListsSection } from "./work-lists-section";

export function WorkPage() {
  const activePersona = usePersonaStore((state) => state.activePersona);
  const loaded = useWorkStore((state) => state.loaded);
  const loadedPersona = useWorkStore((state) => state._persona);
  const load = useWorkStore((state) => state.load);

  const unsubscribe = useWorkStore((state) => state.unsubscribe);

  useEffect(() => {
    if (!loaded || loadedPersona !== activePersona) void load(activePersona);
    return () => { void unsubscribe(); };
  }, [activePersona, load, loaded, loadedPersona, unsubscribe]);
```

(everything below the `useEffect` block — the JSX `return` — is unchanged)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: remaining errors only in `src/__tests__/components/work-page.test.tsx` and `src/app/page.tsx` — fixed in this task's Step 3 and Task 11.

- [ ] **Step 3: Update the WorkPage test for the new effect dependency**

`src/__tests__/components/work-page.test.tsx` doesn't call `.load()` directly (it renders `<WorkPage />`, which calls it internally), so no changes are needed there — `usePersonaStore`'s default `activePersona` is `"mani"`, matching the test's implicit assumption. Run it to confirm:

Run: `npx vitest run src/__tests__/components/work-page.test.tsx`

Expected: `Tests 2 passed | 1 failed` — the 1 failure is the pre-existing "parses and previews a course plan before saving" issue flagged in Task 1, unrelated to this change. If a *different* test in this file now fails, that's a regression — stop and investigate.

- [ ] **Step 4: Commit**

```bash
git add src/components/work/work-page.tsx
git commit -m "feat: reload WorkPage data when the active persona changes"
```

---

### Task 10: Wire Work into StoreInitializer's persona-switch effect

**Files:**
- Modify: `src/components/store-initializer.tsx`

- [ ] **Step 1: Add the import and selector**

Change:

```tsx
import { useReadStore } from "@/lib/stores/read-store";
import { useRecordsStore } from "@/lib/stores/records-store";
```

to:

```tsx
import { useReadStore } from "@/lib/stores/read-store";
import { useRecordsStore } from "@/lib/stores/records-store";
import { useWorkStore } from "@/lib/stores/work-store";
```

Then add, alongside the other `loadX` selectors:

```tsx
  const loadWork = useWorkStore((state) => state.load);
```

- [ ] **Step 2: Add Work to the persona-switch effect**

`work-store.load(persona)` takes a *required* `Persona` argument (unlike the other stores' optional one) — every caller in this app always has `activePersona` in scope, so there's no "default to whatever's active" convenience needed, and a required param avoids silently loading the wrong persona's data if a caller forgets to pass one. That means Work only belongs in the persona-switch effect below, not the mount-only effect above it (which calls several stores' `load()` with no arguments at all).

Change:

```tsx
    void Promise.all([
      useCampaignStore.persist.rehydrate(),
      useContinuationStore.persist.rehydrate(),
      useSystemStore.persist.rehydrate(),
      loadPlayer(activePersona),
      loadGates(activePersona),
      loadMissions(activePersona),
      loadInventory(activePersona),
      loadRead(activePersona),
      loadRecords(activePersona),
      loadStats(activePersona),
    ]);
  }, [
    activePersona,
    loadGates,
    loadInventory,
    loadMissions,
    loadPlayer,
    loadRead,
    loadRecords,
    loadStats,
  ]);
```

to:

```tsx
    void Promise.all([
      useCampaignStore.persist.rehydrate(),
      useContinuationStore.persist.rehydrate(),
      useSystemStore.persist.rehydrate(),
      loadPlayer(activePersona),
      loadGates(activePersona),
      loadMissions(activePersona),
      loadInventory(activePersona),
      loadRead(activePersona),
      loadRecords(activePersona),
      loadStats(activePersona),
      loadWork(activePersona),
    ]);
  }, [
    activePersona,
    loadGates,
    loadInventory,
    loadMissions,
    loadPlayer,
    loadRead,
    loadRecords,
    loadStats,
    loadWork,
  ]);
```

- [ ] **Step 3: Typecheck and run the full suite**

Run: `npx tsc --noEmit && npx vitest run`

Expected: same 3 pre-existing failures as Task 1's baseline (`work-page.test.tsx`'s course-plan test, both `continuation-store.test.ts` tests) — `work-database.test.ts` is now fixed (Task 5), everything else newly added passes.

- [ ] **Step 4: Commit**

```bash
git add src/components/store-initializer.tsx
git commit -m "feat: reload Work data app-wide on persona switch"
```

---

### Task 11: Fix the dashboard's Work tile

**Files:**
- Modify: `src/app/page.tsx`

**Context:** The Read tile already works correctly — it reads `useReadStore`'s `records`, which `StoreInitializer` keeps in sync via `loadRead(activePersona)` (Task 10 added the Work equivalent). The Work tile is the one with the bug: it calls `workLoad()` with no persona and only when `!workLoaded`, so it never reloads when persona switches.

- [ ] **Step 1: Update the Work tile's load effect**

Find (around line 918-927):

```tsx
  const workLoaded = useWorkStore((state) => state.loaded);
  const workLoad = useWorkStore((state) => state.load);
  const workCourses = useWorkStore((state) => state.courses);
  const workChapters = useWorkStore((state) => state.chapters);
  const workProjects = useWorkStore((state) => state.projects);
  const workMilestones = useWorkStore((state) => state.milestones);

  useEffect(() => {
    if (!workLoaded) void workLoad();
  }, [workLoaded, workLoad]);
```

Replace with:

```tsx
  const workLoaded = useWorkStore((state) => state.loaded);
  const workLoadedPersona = useWorkStore((state) => state._persona);
  const workLoad = useWorkStore((state) => state.load);
  const workCourses = useWorkStore((state) => state.courses);
  const workChapters = useWorkStore((state) => state.chapters);
  const workProjects = useWorkStore((state) => state.projects);
  const workMilestones = useWorkStore((state) => state.milestones);

  useEffect(() => {
    if (!workLoaded || workLoadedPersona !== activePersona) void workLoad(activePersona);
  }, [activePersona, workLoaded, workLoadedPersona, workLoad]);
```

`activePersona` is already declared earlier in this component (`const activePersona = usePersonaStore((state) => state.activePersona);` around line 886) — no new selector needed for it.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors anywhere in the codebase now (this was the last caller of the old `load()`/`workLoad()` no-arg signatures).

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "fix: reload dashboard Work tile data when active persona changes"
```

---

### Task 12: Create the Read Supabase sync layer

**Files:**
- Create: `src/lib/supabase/read.ts`

- [ ] **Step 1: Write the file**

```ts
import { getSupabaseBrowserClient } from "./client";
import { isSupabaseConfigured } from "./config";
import type { Persona, ReadRecord } from "@/lib/types";

function sb() {
  const client = getSupabaseBrowserClient();
  if (!client || !isSupabaseConfigured()) return null;
  return client;
}

export async function getReadUserId(): Promise<string | null> {
  const client = sb();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data?.user?.id ?? null;
}

export function rowToReadRecord(r: any): ReadRecord {
  return {
    id: r.id,
    word: r.word,
    definition: r.definition ?? "",
    partOfSpeech: r.part_of_speech ?? "",
    myDefinition: r.my_definition ?? "",
    synonyms: r.synonyms ?? [],
    allDefinitions: r.all_definitions ?? [],
    allSynonyms: r.all_synonyms ?? [],
    sourceType: r.source_type,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function fetchReadRecords(userId: string, persona: Persona): Promise<ReadRecord[] | null> {
  const client = sb();
  if (!client) return null;
  const { data, error } = await client
    .from("read_records")
    .select("*")
    .eq("user_id", userId)
    .eq("persona", persona)
    .order("created_at", { ascending: false });
  if (error) return null;
  return (data ?? []).map(rowToReadRecord);
}

export async function sbCreateReadRecord(userId: string, persona: Persona, record: ReadRecord) {
  const client = sb();
  if (!client) return;
  await client.from("read_records").upsert({
    id: record.id,
    user_id: userId,
    persona,
    word: record.word,
    definition: record.definition,
    part_of_speech: record.partOfSpeech,
    my_definition: record.myDefinition,
    synonyms: record.synonyms,
    all_definitions: record.allDefinitions,
    all_synonyms: record.allSynonyms,
    source_type: record.sourceType,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  });
}

export async function sbUpdateReadRecord(
  userId: string,
  persona: Persona,
  id: string,
  updates: Partial<ReadRecord>,
) {
  const client = sb();
  if (!client) return;
  await client.from("read_records").update({
    word: updates.word,
    definition: updates.definition,
    part_of_speech: updates.partOfSpeech,
    my_definition: updates.myDefinition,
    synonyms: updates.synonyms,
    source_type: updates.sourceType,
    updated_at: updates.updatedAt,
  }).eq("user_id", userId).eq("persona", persona).eq("id", id);
}

export async function sbDeleteReadRecord(userId: string, persona: Persona, id: string) {
  const client = sb();
  if (!client) return;
  await client.from("read_records").delete().eq("user_id", userId).eq("persona", persona).eq("id", id);
}
```

This mirrors `src/lib/supabase/work.ts`'s shape exactly: a `sb()` guard, row mappers, and per-record `sbCreate`/`sbUpdate`/`sbDelete` functions scoped by `user_id` + `persona`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors (this file isn't imported by anything yet).

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/read.ts
git commit -m "feat: add Supabase sync functions for read_records"
```

---

### Task 13: Wire Supabase sync into the Read store

**Files:**
- Modify: `src/lib/stores/read-store.ts`

**Context:** Read has never had cloud sync. This makes it follow the same "local Dexie is the responsive source of truth, cloud sync is fire-and-forget and never blocks the UI" pattern `work-store.ts` already uses — `load()` additionally tries Supabase first and writes through into the local Dexie cache (the same write-through-cache trick `sticky-notes-store.ts`'s `refreshFromCloud` already uses), falling back to local-only on failure or no auth, exactly like Work already does.

- [ ] **Step 1: Replace the full file contents**

```ts
"use client";

import { create } from "zustand";
import { getDb } from "@/lib/db/database";
import { storage } from "@/lib/db/storage";
import { usePersonaStore } from "@/lib/stores/persona-store";
import {
  fetchReadRecords,
  getReadUserId,
  sbCreateReadRecord,
  sbDeleteReadRecord,
  sbUpdateReadRecord,
} from "@/lib/supabase/read";
import type { Persona, ReadRecord, ReadSourceType } from "@/lib/types";

interface ReadRecordInput {
  word: string;
  definition: string;
  partOfSpeech: string;
  myDefinition: string;
  synonyms: string[];
  allDefinitions: Array<{ partOfSpeech: string; definition: string; example?: string }>;
  allSynonyms: string[];
  sourceType: ReadSourceType;
}

interface ReadState {
  records: ReadRecord[];
  loaded: boolean;
  load: (persona?: Persona) => Promise<void>;
  createRecords: (items: ReadRecordInput[]) => Promise<void>;
  updateRecord: (
    id: string,
    updates: Partial<Pick<ReadRecord, "word" | "definition" | "partOfSpeech" | "sourceType" | "myDefinition" | "synonyms">>,
  ) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
}

// Fire-and-forget Supabase sync — never throws, never blocks UI.
// Mirrors syncToSupabase in work-store.ts.
async function syncReadToSupabase(fn: (userId: string) => Promise<void>) {
  try {
    const userId = await getReadUserId();
    if (!userId) return;
    await fn(userId);
  } catch {
    // swallow — local state is source of truth
  }
}

export const useReadStore = create<ReadState>((set) => ({
  records: [],
  loaded: false,

  async load(persona) {
    if (persona && usePersonaStore.getState().activePersona !== persona) {
      return;
    }

    if (persona) {
      try {
        const userId = await getReadUserId();
        if (userId) {
          const cloudRecords = await fetchReadRecords(userId, persona);
          if (cloudRecords) {
            const db = getDb(persona);
            await db.transaction("rw", db.readRecords, async () => {
              await db.readRecords.clear();
              if (cloudRecords.length > 0) await db.readRecords.bulkAdd(cloudRecords);
            });
            if (usePersonaStore.getState().activePersona !== persona) return;
            set({ records: cloudRecords, loaded: true });
            return;
          }
        }
      } catch {
        // fall through to local
      }
    }

    const records = await storage.getReadRecords({ persona });
    if (persona && usePersonaStore.getState().activePersona !== persona) {
      return;
    }
    set({ records, loaded: true });
  },

  async createRecords(items) {
    const created = await Promise.all(
      items
        .filter((item) => item.word.trim())
        .map((item) =>
          storage.createReadRecord({
            word: item.word,
            definition: item.definition,
            partOfSpeech: item.partOfSpeech,
            myDefinition: item.myDefinition,
            synonyms: item.synonyms,
            allDefinitions: item.allDefinitions,
            allSynonyms: item.allSynonyms,
            sourceType: item.sourceType,
          }),
        ),
    );

    if (created.length === 0) return;

    set((state) => ({
      records: [...created, ...state.records].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    }));

    const persona = usePersonaStore.getState().activePersona;
    void syncReadToSupabase(async (uid) => {
      await Promise.all(created.map((record) => sbCreateReadRecord(uid, persona, record)));
    });
  },

  async updateRecord(id, updates) {
    await storage.updateReadRecord(id, updates);
    const updatedAt = new Date().toISOString();
    set((state) => ({
      records: state.records.map((record) =>
        record.id === id ? { ...record, ...updates, updatedAt } : record,
      ),
    }));
    const persona = usePersonaStore.getState().activePersona;
    void syncReadToSupabase((uid) => sbUpdateReadRecord(uid, persona, id, { ...updates, updatedAt }));
  },

  async deleteRecord(id) {
    await storage.deleteReadRecord(id);
    set((state) => ({ records: state.records.filter((record) => record.id !== id) }));
    const persona = usePersonaStore.getState().activePersona;
    void syncReadToSupabase((uid) => sbDeleteReadRecord(uid, persona, id));
  },
}));
```

- [ ] **Step 2: Run the existing Read tests to confirm no regression**

Run: `npx vitest run src/__tests__/lib/read-store.test.ts`

Expected: all 6 existing tests still pass unchanged. They already call `load("mani")`/`load("harti")` explicitly and never set Supabase env vars in the test environment, so `getReadUserId()` resolves `sb()` to `null` (`isSupabaseConfigured()` is false — Vitest doesn't load `.env.local` into `process.env` the way Next.js does) and every new cloud-sync branch no-ops straight through to the same local-Dexie behavior the tests already verify. If any of these 6 fail, that means a Supabase env var *is* leaking into the test process — stop and check `vitest.config.ts` / `.env.local` before continuing, don't paper over it.

- [ ] **Step 3: Typecheck and run the full suite**

Run: `npx tsc --noEmit && npx vitest run`

Expected: zero TypeScript errors. Test results match Task 1's baseline minus the now-fixed `work-database.test.ts`: `Test Files 2 failed | 24 passed (26)`, only `work-page.test.tsx`'s pre-existing course-plan failure and `continuation-store.test.ts`'s 2 pre-existing date failures remain.

- [ ] **Step 4: Commit**

```bash
git add src/lib/stores/read-store.ts
git commit -m "feat: sync Read records to Supabase, scoped by persona"
```

---

### Task 14: Manual smoke test in the browser

Automated tests cover store/db logic; they can't confirm the actual signed-in, persona-switching UI flow end to end. Do this manually before considering the work done.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Sign in and check Work segregation**

1. Open the app, sign in as `maniha@improve.com`.
2. With persona set to **Mani**, open `/work`. Confirm the existing courses/contacts/projects (the real pre-migration data) are visible.
3. Switch to **Harti** persona (via the persona switcher on the dashboard), open `/work`. Confirm it's empty — no Mani courses/contacts leak through.
4. Create a contact and a course while on **Harti**. Switch back to **Mani**, confirm Harti's new contact/course do *not* appear, and Mani's original data is still intact.
5. Refresh the page on **Harti** (forces a fresh Supabase fetch, not just local cache). Confirm Harti's contact/course created in Step 4 are still there — this confirms the cloud round-trip and `persona` column are actually working, not just the local Dexie cache.

- [ ] **Step 3: Check Read segregation + cloud persistence**

1. On **Mani**, open `/read`, save a word (via the search box — type a word, hit Search).
2. Switch to **Harti**, open `/read`. Confirm the word from Step 1 is not visible. Save a different word.
3. Open the Supabase dashboard's table editor (or run `select word, persona from read_records` via the `execute_sql` MCP tool against project `kwbswiifqqwbeexkdyes`) and confirm both words are present with the correct `persona` value.
4. Open the app in a different browser (or a private window, sign in again), switch to **Mani**, open `/read`. Confirm Mani's word from Step 1 shows up — this is the new behavior that didn't exist before this plan (Read previously had no cloud backing at all).

- [ ] **Step 4: Check the dashboard tiles**

On the dashboard, confirm the **Work** tile's course/project counts and the **Read** tile's word count both change correctly when switching between Mani and Harti, without a page refresh.

- [ ] **Step 5: Final full-suite check**

Run: `npx tsc --noEmit && npx vitest run`

Expected: same result as Task 13 Step 3 (`Test Files 2 failed | 24 passed (26)`, only the two pre-existing, unrelated failures from Task 1's baseline).

