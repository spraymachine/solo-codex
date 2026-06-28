# Gym Workout Logger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/gym` page to plan reusable workout split-day templates and log dated training sessions through a single smart input that parses terse `set,weight,reps` strings.

**Architecture:** Local-first. Dexie is source of truth (one DB per persona via `getDb(persona)` — persona is NOT a stored field), Supabase sync is fire-and-forget (mirrors `read-store.ts` + `supabase/read.ts`). A pure parser turns input strings into sets; the Zustand store owns exercise-targeting/advance logic; React components render the four-zone page.

**Tech Stack:** Next 16 / React 19, Zustand, Dexie, Tailwind v4, Vitest + Testing Library.

**Deviation from spec:** spec listed `personaId` on records — the existing codebase scopes persona by separate database, not a field, so stored types omit it. Supabase rows still carry a `persona` column.

**Note on Next:** per `AGENTS.md`, route files are thin client wrappers (see `src/app/books/page.tsx`). No new Next APIs are used.

---

## File structure

New:
- `src/lib/gym/library.ts` — `EXERCISE_LIBRARY` constant (id, name, muscles, isBodyweight)
- `src/lib/gym/parse.ts` — `parseSetInput` pure parser
- `src/lib/stores/gym-store.ts` — Zustand store (splits, sessions, custom exercises, active pointer, logging)
- `src/lib/supabase/gym.ts` — fire-and-forget sync helpers
- `src/app/gym/page.tsx` — route entry
- `src/components/gym/gym-page.tsx` — client root, four zones
- `src/components/gym/smart-input.tsx`
- `src/components/gym/last-record-card.tsx`
- `src/components/gym/day-picker.tsx`
- `src/components/gym/session-view.tsx` — stars + exercise/set list
- `src/components/gym/split-editor.tsx` — manage split templates
- `src/components/gym/history-list.tsx`
- Tests: `src/__tests__/lib/gym-parse.test.ts`, `src/__tests__/lib/gym-store.test.ts`, `src/__tests__/components/gym-smart-input.test.tsx`, `src/__tests__/components/gym-session-view.test.tsx`

Modified:
- `src/lib/types.ts` — add `MUSCLE_GROUPS`, `MuscleGroup`, `WorkoutSet`, `WorkoutSessionExercise`, `WorkoutSession`, `WorkoutTemplateExercise`, `WorkoutSplitDay`, `WorkoutExercise`
- `src/lib/db/database.ts` — Dexie version 14 + three tables
- `src/lib/db/storage.ts` — CRUD methods + extend `clear()`
- `src/components/store-initializer.tsx` — load gym store on persona change
- `src/components/layout/site-header.tsx` — add Gym nav item

---

## Task 1: Types and muscle constant

**Files:**
- Modify: `src/lib/types.ts` (append at end)

- [ ] **Step 1: Add the types**

Append to `src/lib/types.ts`:

```ts
export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Quads",
  "Hamstrings",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Core",
  "Glutes",
  "Calves",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export interface WorkoutSet {
  setNumber: number;
  weightKg: number | null;
  reps: number;
  loggedAt: string;
}

export interface WorkoutSessionExercise {
  id: string;
  name: string;
  muscles: MuscleGroup[];
  isBodyweight: boolean;
  order: number;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  date: string;
  splitDayId: string | null;
  name: string;
  muscles: MuscleGroup[];
  rating: number | null;
  exercises: WorkoutSessionExercise[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutTemplateExercise {
  id: string;
  name: string;
  muscles: MuscleGroup[];
  isBodyweight: boolean;
  libraryId: string | null;
  order: number;
}

export interface WorkoutSplitDay {
  id: string;
  name: string;
  muscles: MuscleGroup[];
  exercises: WorkoutTemplateExercise[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  muscles: MuscleGroup[];
  isBodyweight: boolean;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(gym): add workout types and muscle group constant"
```

---

## Task 2: Bundled exercise library

**Files:**
- Create: `src/lib/gym/library.ts`

- [ ] **Step 1: Write the library**

```ts
import type { MuscleGroup } from "@/lib/types";

export interface LibraryExercise {
  id: string;
  name: string;
  muscles: MuscleGroup[];
  isBodyweight: boolean;
}

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  { id: "barbell-bench-press", name: "Barbell Bench Press", muscles: ["Chest", "Triceps"], isBodyweight: false },
  { id: "incline-db-press", name: "Incline Dumbbell Press", muscles: ["Chest", "Shoulders"], isBodyweight: false },
  { id: "cable-flyes", name: "Cable Flyes", muscles: ["Chest"], isBodyweight: false },
  { id: "push-up", name: "Push-Up", muscles: ["Chest", "Triceps"], isBodyweight: true },
  { id: "overhead-press", name: "Overhead Press", muscles: ["Shoulders", "Triceps"], isBodyweight: false },
  { id: "lateral-raise", name: "Lateral Raise", muscles: ["Shoulders"], isBodyweight: false },
  { id: "tricep-pushdown", name: "Tricep Pushdown", muscles: ["Triceps"], isBodyweight: false },
  { id: "deadlift", name: "Deadlift", muscles: ["Back", "Hamstrings", "Glutes"], isBodyweight: false },
  { id: "barbell-row", name: "Barbell Row", muscles: ["Back", "Biceps"], isBodyweight: false },
  { id: "lat-pulldown", name: "Lat Pulldown", muscles: ["Back", "Biceps"], isBodyweight: false },
  { id: "pull-up", name: "Pull-Up", muscles: ["Back", "Biceps"], isBodyweight: true },
  { id: "barbell-curl", name: "Barbell Curl", muscles: ["Biceps"], isBodyweight: false },
  { id: "hammer-curl", name: "Hammer Curl", muscles: ["Biceps"], isBodyweight: false },
  { id: "back-squat", name: "Back Squat", muscles: ["Quads", "Glutes"], isBodyweight: false },
  { id: "front-squat", name: "Front Squat", muscles: ["Quads", "Core"], isBodyweight: false },
  { id: "leg-press", name: "Leg Press", muscles: ["Quads", "Glutes"], isBodyweight: false },
  { id: "leg-extension", name: "Leg Extension", muscles: ["Quads"], isBodyweight: false },
  { id: "romanian-deadlift", name: "Romanian Deadlift", muscles: ["Hamstrings", "Glutes"], isBodyweight: false },
  { id: "leg-curl", name: "Leg Curl", muscles: ["Hamstrings"], isBodyweight: false },
  { id: "hip-thrust", name: "Hip Thrust", muscles: ["Glutes"], isBodyweight: false },
  { id: "calf-raise", name: "Calf Raise", muscles: ["Calves"], isBodyweight: false },
  { id: "plank", name: "Plank", muscles: ["Core"], isBodyweight: true },
  { id: "hanging-leg-raise", name: "Hanging Leg Raise", muscles: ["Core"], isBodyweight: true },
  { id: "cable-crunch", name: "Cable Crunch", muscles: ["Core"], isBodyweight: false },
];
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gym/library.ts
git commit -m "feat(gym): add bundled exercise library"
```

---

## Task 3: Smart input parser

**Files:**
- Create: `src/lib/gym/parse.ts`
- Test: `src/__tests__/lib/gym-parse.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { parseSetInput } from "@/lib/gym/parse";

describe("parseSetInput", () => {
  it("parses three comma-separated numbers as set, weight, reps", () => {
    const r = parseSetInput("1,40,15", false);
    expect(r).toEqual({ ok: true, value: { setNumber: 1, weightKg: 40, reps: 15 } });
  });

  it("accepts spaces as separators", () => {
    const r = parseSetInput("2 42 12", false);
    expect(r).toEqual({ ok: true, value: { setNumber: 2, weightKg: 42, reps: 12 } });
  });

  it("allows decimal weight", () => {
    const r = parseSetInput("1,2.5,20", false);
    expect(r).toEqual({ ok: true, value: { setNumber: 1, weightKg: 2.5, reps: 20 } });
  });

  it("parses two numbers as set, reps for a bodyweight exercise", () => {
    const r = parseSetInput("1,15", true);
    expect(r).toEqual({ ok: true, value: { setNumber: 1, weightKg: null, reps: 15 } });
  });

  it("rejects two numbers for a weighted exercise", () => {
    const r = parseSetInput("1,15", false);
    expect(r.ok).toBe(false);
  });

  it("rejects empty input", () => {
    expect(parseSetInput("", false).ok).toBe(false);
  });

  it("rejects non-numeric tokens", () => {
    expect(parseSetInput("a,b,c", false).ok).toBe(false);
  });

  it("rejects too many numbers", () => {
    expect(parseSetInput("1,2,3,4", false).ok).toBe(false);
  });

  it("rejects zero or negative set/reps", () => {
    expect(parseSetInput("0,40,15", false).ok).toBe(false);
    expect(parseSetInput("1,40,-3", false).ok).toBe(false);
  });

  it("rejects non-integer set number or reps", () => {
    expect(parseSetInput("1.5,40,15", false).ok).toBe(false);
    expect(parseSetInput("1,40,15.5", false).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/gym-parse.test.ts`
Expected: FAIL — `parseSetInput` not exported / module not found.

- [ ] **Step 3: Write the parser**

```ts
export interface ParsedSet {
  setNumber: number;
  weightKg: number | null;
  reps: number;
}

export type ParseResult =
  | { ok: true; value: ParsedSet }
  | { ok: false; error: string };

function isPositiveInt(n: number): boolean {
  return Number.isInteger(n) && n > 0;
}

export function parseSetInput(raw: string, isBodyweight: boolean): ParseResult {
  const tokens = raw.trim().split(/[\s,]+/).filter(Boolean);

  if (tokens.length === 0) {
    return { ok: false, error: "Enter set, weight, reps (e.g. 1,40,15)" };
  }

  const nums = tokens.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) {
    return { ok: false, error: "Numbers only (e.g. 1,40,15)" };
  }

  if (tokens.length === 3) {
    const [setNumber, weightKg, reps] = nums;
    if (!isPositiveInt(setNumber)) return { ok: false, error: "Set number must be a positive whole number" };
    if (weightKg < 0) return { ok: false, error: "Weight cannot be negative" };
    if (!isPositiveInt(reps)) return { ok: false, error: "Reps must be a positive whole number" };
    return { ok: true, value: { setNumber, weightKg, reps } };
  }

  if (tokens.length === 2) {
    if (!isBodyweight) {
      return { ok: false, error: "Weighted exercise needs set, weight, reps (3 numbers)" };
    }
    const [setNumber, reps] = nums;
    if (!isPositiveInt(setNumber)) return { ok: false, error: "Set number must be a positive whole number" };
    if (!isPositiveInt(reps)) return { ok: false, error: "Reps must be a positive whole number" };
    return { ok: true, value: { setNumber, weightKg: null, reps } };
  }

  return { ok: false, error: "Enter 2 numbers (bodyweight) or 3 (set, weight, reps)" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/lib/gym-parse.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/gym/parse.ts src/__tests__/lib/gym-parse.test.ts
git commit -m "feat(gym): add smart input parser with tests"
```

---

## Task 4: Dexie schema (version 14)

**Files:**
- Modify: `src/lib/db/database.ts`

- [ ] **Step 1: Add imports**

In the `import type { ... } from "@/lib/types"` block at the top, add these three names (keep alphabetical-ish ordering with the rest):

```ts
  WorkoutSplitDay,
  WorkoutSession,
  WorkoutExercise,
```

- [ ] **Step 2: Declare the table fields**

In the `class SoloLevelingDB` body, after `books!: EntityTable<Book, "id">;` add:

```ts
  workoutSplitDays!: EntityTable<WorkoutSplitDay, "id">;
  workoutSessions!: EntityTable<WorkoutSession, "id">;
  workoutExercises!: EntityTable<WorkoutExercise, "id">;
```

- [ ] **Step 3: Add version 14**

Immediately after the `this.version(13)...` block (after its `.upgrade(...)` closes, before the constructor's closing brace), add:

```ts
    this.version(14).stores({
      profile: "_id",
      gates: "id, status, rank, date",
      quests: "id, gateId, status, order",
      missions: "id, rank, date, order",
      inventory: "id",
      hunterRecords: "date",
      gymStats: "id",
      xpLog: "id, timestamp",
      stickyNotes: "id, pinnedAt",
      leads: "id, createdAt",
      readRecords: "id, createdAt, word, sourceType",
      books: "id, createdAt, shelf",
      workoutSplitDays: "id, order, createdAt",
      workoutSessions: "id, date, createdAt",
      workoutExercises: "id, name",
    });
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/database.ts
git commit -m "feat(gym): add dexie v14 tables for workouts"
```

---

## Task 5: Storage CRUD methods

**Files:**
- Modify: `src/lib/db/storage.ts`

- [ ] **Step 1: Add type imports**

In the `import type { ... } from "@/lib/types"` block, add:

```ts
  WorkoutSplitDay,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutTemplateExercise,
  WorkoutExercise,
  MuscleGroup,
```

- [ ] **Step 2: Add methods to the `storage` object**

Insert before `async clear()`:

```ts
  async getSplitDays(options?: StorageOptions): Promise<WorkoutSplitDay[]> {
    const db = getDb(options?.persona);
    return db.workoutSplitDays.orderBy("order").toArray();
  },

  async createSplitDay(input: {
    name: string;
    muscles: MuscleGroup[];
    exercises: WorkoutTemplateExercise[];
  }): Promise<WorkoutSplitDay> {
    const db = getDb();
    const count = await db.workoutSplitDays.count();
    const timestamp = nowISO();
    const day: WorkoutSplitDay = {
      id: generateId(),
      name: input.name.trim(),
      muscles: input.muscles,
      exercises: input.exercises,
      order: count,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.workoutSplitDays.add(day);
    return day;
  },

  async updateSplitDay(
    id: string,
    updates: Partial<Pick<WorkoutSplitDay, "name" | "muscles" | "exercises" | "order">>,
  ): Promise<void> {
    const db = getDb();
    await db.workoutSplitDays.update(id, { ...updates, updatedAt: nowISO() });
  },

  async deleteSplitDay(id: string): Promise<void> {
    const db = getDb();
    await db.workoutSplitDays.delete(id);
  },

  async getSessions(options?: StorageOptions): Promise<WorkoutSession[]> {
    const db = getDb(options?.persona);
    return db.workoutSessions.orderBy("createdAt").reverse().toArray();
  },

  async createSession(input: {
    date: string;
    splitDayId: string | null;
    name: string;
    muscles: MuscleGroup[];
    exercises: WorkoutSessionExercise[];
  }): Promise<WorkoutSession> {
    const db = getDb();
    const timestamp = nowISO();
    const session: WorkoutSession = {
      id: generateId(),
      date: input.date,
      splitDayId: input.splitDayId,
      name: input.name,
      muscles: input.muscles,
      rating: null,
      exercises: input.exercises,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.workoutSessions.add(session);
    return session;
  },

  async updateSession(
    id: string,
    updates: Partial<Pick<WorkoutSession, "rating" | "exercises">>,
  ): Promise<void> {
    const db = getDb();
    await db.workoutSessions.update(id, { ...updates, updatedAt: nowISO() });
  },

  async deleteSession(id: string): Promise<void> {
    const db = getDb();
    await db.workoutSessions.delete(id);
  },

  async getCustomExercises(options?: StorageOptions): Promise<WorkoutExercise[]> {
    const db = getDb(options?.persona);
    return db.workoutExercises.toArray();
  },

  async upsertCustomExercise(input: {
    name: string;
    muscles: MuscleGroup[];
    isBodyweight: boolean;
  }): Promise<WorkoutExercise> {
    const db = getDb();
    const name = input.name.trim();
    const existing = await db.workoutExercises
      .filter((e) => e.name.toLowerCase() === name.toLowerCase())
      .first();
    if (existing) return existing;
    const exercise: WorkoutExercise = {
      id: generateId(),
      name,
      muscles: input.muscles,
      isBodyweight: input.isBodyweight,
    };
    await db.workoutExercises.add(exercise);
    return exercise;
  },
```

- [ ] **Step 3: Extend `clear()`**

In `async clear()`, add these three to the `Promise.all([...])` array:

```ts
      db.workoutSplitDays.clear(),
      db.workoutSessions.clear(),
      db.workoutExercises.clear(),
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/storage.ts
git commit -m "feat(gym): add workout storage CRUD methods"
```

---

## Task 6: Supabase sync helpers

**Files:**
- Create: `src/lib/supabase/gym.ts`

These mirror `src/lib/supabase/read.ts`: a guarded client, a user-id getter, and fetch/upsert/delete per entity. Nested arrays go in jsonb columns. No dedicated test (matches the codebase — supabase helpers are exercised through the store).

- [ ] **Step 1: Write the helpers**

```ts
import { getSupabaseBrowserClient } from "./client";
import { isSupabaseConfigured } from "./config";
import type {
  Persona,
  WorkoutSplitDay,
  WorkoutSession,
  WorkoutExercise,
} from "@/lib/types";

function sb() {
  const client = getSupabaseBrowserClient();
  if (!client || !isSupabaseConfigured()) return null;
  return client;
}

export async function getGymUserId(): Promise<string | null> {
  const client = sb();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data?.user?.id ?? null;
}

function rowToSplitDay(r: any): WorkoutSplitDay {
  return {
    id: r.id,
    name: r.name,
    muscles: r.muscles ?? [],
    exercises: r.exercises ?? [],
    order: r.order ?? 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToSession(r: any): WorkoutSession {
  return {
    id: r.id,
    date: r.date,
    splitDayId: r.split_day_id ?? null,
    name: r.name,
    muscles: r.muscles ?? [],
    rating: r.rating ?? null,
    exercises: r.exercises ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToExercise(r: any): WorkoutExercise {
  return {
    id: r.id,
    name: r.name,
    muscles: r.muscles ?? [],
    isBodyweight: r.is_bodyweight ?? false,
  };
}

export async function fetchSplitDays(userId: string, persona: Persona): Promise<WorkoutSplitDay[] | null> {
  const client = sb();
  if (!client) return null;
  const { data, error } = await client
    .from("workout_split_days")
    .select("*")
    .eq("user_id", userId)
    .eq("persona", persona)
    .order("order", { ascending: true });
  if (error) return null;
  return (data ?? []).map(rowToSplitDay);
}

export async function fetchSessions(userId: string, persona: Persona): Promise<WorkoutSession[] | null> {
  const client = sb();
  if (!client) return null;
  const { data, error } = await client
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("persona", persona)
    .order("created_at", { ascending: false });
  if (error) return null;
  return (data ?? []).map(rowToSession);
}

export async function fetchCustomExercises(userId: string, persona: Persona): Promise<WorkoutExercise[] | null> {
  const client = sb();
  if (!client) return null;
  const { data, error } = await client
    .from("workout_exercises")
    .select("*")
    .eq("user_id", userId)
    .eq("persona", persona);
  if (error) return null;
  return (data ?? []).map(rowToExercise);
}

export async function sbUpsertSplitDay(userId: string, persona: Persona, day: WorkoutSplitDay) {
  const client = sb();
  if (!client) return;
  await client.from("workout_split_days").upsert({
    id: day.id,
    user_id: userId,
    persona,
    name: day.name,
    muscles: day.muscles,
    exercises: day.exercises,
    order: day.order,
    created_at: day.createdAt,
    updated_at: day.updatedAt,
  });
}

export async function sbDeleteSplitDay(userId: string, persona: Persona, id: string) {
  const client = sb();
  if (!client) return;
  await client.from("workout_split_days").delete().eq("user_id", userId).eq("persona", persona).eq("id", id);
}

export async function sbUpsertSession(userId: string, persona: Persona, session: WorkoutSession) {
  const client = sb();
  if (!client) return;
  await client.from("workout_sessions").upsert({
    id: session.id,
    user_id: userId,
    persona,
    date: session.date,
    split_day_id: session.splitDayId,
    name: session.name,
    muscles: session.muscles,
    rating: session.rating,
    exercises: session.exercises,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  });
}

export async function sbDeleteSession(userId: string, persona: Persona, id: string) {
  const client = sb();
  if (!client) return;
  await client.from("workout_sessions").delete().eq("user_id", userId).eq("persona", persona).eq("id", id);
}

export async function sbUpsertCustomExercise(userId: string, persona: Persona, exercise: WorkoutExercise) {
  const client = sb();
  if (!client) return;
  await client.from("workout_exercises").upsert({
    id: exercise.id,
    user_id: userId,
    persona,
    name: exercise.name,
    muscles: exercise.muscles,
    is_bodyweight: exercise.isBodyweight,
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/gym.ts
git commit -m "feat(gym): add supabase sync helpers"
```

> **Note for implementer:** the Supabase tables (`workout_split_days`, `workout_sessions`, `workout_exercises`) must be created in the project with columns matching the upsert payloads (jsonb for `muscles`/`exercises`). Sync is fire-and-forget — the app works fully on local Dexie if the tables don't exist yet. Do NOT apply migrations without the user's go-ahead (see memory: no deploy/host changes without permission).

---

## Task 7: Gym store — load + split CRUD

**Files:**
- Create: `src/lib/stores/gym-store.ts`
- Test: `src/__tests__/lib/gym-store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { storage } from "@/lib/db/storage";
import { useGymStore } from "@/lib/stores/gym-store";

function resetStore() {
  useGymStore.setState({
    splitDays: [],
    sessions: [],
    customExercises: [],
    currentSessionId: null,
    activeExerciseId: null,
    lastRecord: null,
    inputError: null,
    loaded: false,
  });
}

describe("gym store — splits", () => {
  beforeEach(async () => {
    await storage.clear();
    resetStore();
  });

  it("creates a split day with ordered exercises", async () => {
    await useGymStore.getState().createSplitDay({
      name: "Chest day",
      muscles: ["Chest", "Triceps"],
      exercises: [
        { name: "Barbell Bench Press", muscles: ["Chest", "Triceps"], isBodyweight: false, libraryId: "barbell-bench-press" },
        { name: "Push-Up", muscles: ["Chest"], isBodyweight: true, libraryId: "push-up" },
      ],
    });
    const days = useGymStore.getState().splitDays;
    expect(days).toHaveLength(1);
    expect(days[0].name).toBe("Chest day");
    expect(days[0].exercises.map((e) => e.order)).toEqual([0, 1]);
    expect(days[0].exercises[0].id).toBeTruthy();
  });

  it("deletes a split day", async () => {
    const day = await useGymStore.getState().createSplitDay({ name: "Leg day", muscles: ["Quads"], exercises: [] });
    await useGymStore.getState().deleteSplitDay(day.id);
    expect(useGymStore.getState().splitDays).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/gym-store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the store (load + splits)**

```ts
"use client";

import { create } from "zustand";
import { getDb } from "@/lib/db/database";
import { storage } from "@/lib/db/storage";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { parseSetInput } from "@/lib/gym/parse";
import {
  fetchSplitDays,
  fetchSessions,
  fetchCustomExercises,
  getGymUserId,
  sbUpsertSplitDay,
  sbDeleteSplitDay,
  sbUpsertSession,
  sbDeleteSession,
  sbUpsertCustomExercise,
} from "@/lib/supabase/gym";
import type {
  MuscleGroup,
  Persona,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSet,
  WorkoutSplitDay,
  WorkoutTemplateExercise,
} from "@/lib/types";
import { generateId, nowISO, todayDate } from "@/lib/utils";

interface TemplateExerciseInput {
  name: string;
  muscles: MuscleGroup[];
  isBodyweight: boolean;
  libraryId: string | null;
}

interface LastRecord {
  exerciseName: string;
  setNumber: number;
  weightKg: number | null;
  reps: number;
}

interface GymState {
  splitDays: WorkoutSplitDay[];
  sessions: WorkoutSession[];
  customExercises: WorkoutExercise[];
  currentSessionId: string | null;
  activeExerciseId: string | null;
  lastRecord: LastRecord | null;
  inputError: string | null;
  loaded: boolean;
  load: (persona?: Persona) => Promise<void>;
  createSplitDay: (input: { name: string; muscles: MuscleGroup[]; exercises: TemplateExerciseInput[] }) => Promise<WorkoutSplitDay>;
  updateSplitDay: (id: string, updates: Partial<Pick<WorkoutSplitDay, "name" | "muscles" | "exercises" | "order">>) => Promise<void>;
  deleteSplitDay: (id: string) => Promise<void>;
  startSession: (splitDayId: string) => Promise<WorkoutSession | null>;
  setRating: (rating: number) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setActiveExercise: (exerciseId: string) => void;
  logSet: (raw: string) => Promise<void>;
  editSet: (exerciseId: string, setNumber: number, updates: { weightKg?: number | null; reps?: number }) => Promise<void>;
  deleteSet: (exerciseId: string, setNumber: number) => Promise<void>;
}

async function sync(fn: (userId: string) => Promise<void>) {
  try {
    const userId = await getGymUserId();
    if (!userId) return;
    await fn(userId);
  } catch (err) {
    console.error("gym sync failed", err);
  }
}

function toTemplateExercises(inputs: TemplateExerciseInput[]): WorkoutTemplateExercise[] {
  return inputs.map((e, i) => ({
    id: generateId(),
    name: e.name.trim(),
    muscles: e.muscles,
    isBodyweight: e.isBodyweight,
    libraryId: e.libraryId,
    order: i,
  }));
}

export const useGymStore = create<GymState>((set, get) => ({
  splitDays: [],
  sessions: [],
  customExercises: [],
  currentSessionId: null,
  activeExerciseId: null,
  lastRecord: null,
  inputError: null,
  loaded: false,

  async load(persona) {
    if (persona && usePersonaStore.getState().activePersona !== persona) return;

    if (persona) {
      try {
        const userId = await getGymUserId();
        if (userId) {
          const [cloudDays, cloudSessions, cloudExercises] = await Promise.all([
            fetchSplitDays(userId, persona),
            fetchSessions(userId, persona),
            fetchCustomExercises(userId, persona),
          ]);
          if (cloudDays && cloudSessions && cloudExercises) {
            const db = getDb(persona);
            await db.transaction("rw", [db.workoutSplitDays, db.workoutSessions, db.workoutExercises], async () => {
              await db.workoutSplitDays.clear();
              await db.workoutSessions.clear();
              await db.workoutExercises.clear();
              if (cloudDays.length) await db.workoutSplitDays.bulkAdd(cloudDays);
              if (cloudSessions.length) await db.workoutSessions.bulkAdd(cloudSessions);
              if (cloudExercises.length) await db.workoutExercises.bulkAdd(cloudExercises);
            });
            if (usePersonaStore.getState().activePersona !== persona) return;
            set({ splitDays: cloudDays, sessions: cloudSessions, customExercises: cloudExercises, loaded: true });
            return;
          }
        }
      } catch {
        // fall through to local
      }
    }

    const [splitDays, sessions, customExercises] = await Promise.all([
      storage.getSplitDays({ persona }),
      storage.getSessions({ persona }),
      storage.getCustomExercises({ persona }),
    ]);
    if (persona && usePersonaStore.getState().activePersona !== persona) return;
    set({ splitDays, sessions, customExercises, loaded: true });
  },

  async createSplitDay(input) {
    const day = await storage.createSplitDay({
      name: input.name,
      muscles: input.muscles,
      exercises: toTemplateExercises(input.exercises),
    });
    set((s) => ({ splitDays: [...s.splitDays, day].sort((a, b) => a.order - b.order) }));

    const persona = usePersonaStore.getState().activePersona;
    void sync((uid) => sbUpsertSplitDay(uid, persona, day));

    void Promise.all(
      input.exercises
        .filter((e) => e.libraryId === null && e.name.trim())
        .map(async (e) => {
          const custom = await storage.upsertCustomExercise({ name: e.name, muscles: e.muscles, isBodyweight: e.isBodyweight });
          set((s) => (s.customExercises.some((c) => c.id === custom.id) ? s : { customExercises: [...s.customExercises, custom] }));
          void sync((uid) => sbUpsertCustomExercise(uid, persona, custom));
        }),
    );

    return day;
  },

  async updateSplitDay(id, updates) {
    await storage.updateSplitDay(id, updates);
    const updatedAt = nowISO();
    set((s) => ({ splitDays: s.splitDays.map((d) => (d.id === id ? { ...d, ...updates, updatedAt } : d)).sort((a, b) => a.order - b.order) }));
    const persona = usePersonaStore.getState().activePersona;
    const day = get().splitDays.find((d) => d.id === id);
    if (day) void sync((uid) => sbUpsertSplitDay(uid, persona, day));
  },

  async deleteSplitDay(id) {
    await storage.deleteSplitDay(id);
    set((s) => ({ splitDays: s.splitDays.filter((d) => d.id !== id) }));
    const persona = usePersonaStore.getState().activePersona;
    void sync((uid) => sbDeleteSplitDay(uid, persona, id));
  },

  async startSession(splitDayId) {
    return null;
  },
  async setRating(rating) {},
  async deleteSession(id) {},
  setActiveExercise(exerciseId) {},
  async logSet(raw) {},
  async editSet(exerciseId, setNumber, updates) {},
  async deleteSet(exerciseId, setNumber) {},
}));
```

> The session/logging methods are stubs here; Task 8 fills them in (TDD). Stubs keep the file compiling so the split tests pass now.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/lib/gym-store.test.ts`
Expected: PASS (split tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/gym-store.ts src/__tests__/lib/gym-store.test.ts
git commit -m "feat(gym): add gym store with split CRUD"
```

---

## Task 8: Gym store — session lifecycle + logging/advance

**Files:**
- Modify: `src/lib/stores/gym-store.ts`
- Modify: `src/__tests__/lib/gym-store.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/__tests__/lib/gym-store.test.ts`:

```ts
describe("gym store — sessions and logging", () => {
  beforeEach(async () => {
    await storage.clear();
    resetStore();
  });

  async function seedChestDay() {
    return useGymStore.getState().createSplitDay({
      name: "Chest day",
      muscles: ["Chest", "Triceps"],
      exercises: [
        { name: "Barbell Bench Press", muscles: ["Chest"], isBodyweight: false, libraryId: "barbell-bench-press" },
        { name: "Push-Up", muscles: ["Chest"], isBodyweight: true, libraryId: "push-up" },
      ],
    });
  }

  it("starts a session snapshotting the template and sets active to first exercise", async () => {
    const day = await seedChestDay();
    const session = await useGymStore.getState().startSession(day.id);
    expect(session).not.toBeNull();
    const state = useGymStore.getState();
    expect(state.currentSessionId).toBe(session!.id);
    expect(session!.name).toBe("Chest day");
    expect(session!.exercises).toHaveLength(2);
    expect(state.activeExerciseId).toBe(session!.exercises[0].id);
  });

  it("logs a set to the active exercise and records lastRecord", async () => {
    const day = await seedChestDay();
    await useGymStore.getState().startSession(day.id);
    await useGymStore.getState().logSet("1,40,15");
    const session = useGymStore.getState().sessions.find((s) => s.id === useGymStore.getState().currentSessionId)!;
    expect(session.exercises[0].sets).toEqual([
      expect.objectContaining({ setNumber: 1, weightKg: 40, reps: 15 }),
    ]);
    expect(useGymStore.getState().lastRecord).toEqual(
      expect.objectContaining({ exerciseName: "Barbell Bench Press", setNumber: 1, weightKg: 40, reps: 15 }),
    );
  });

  it("advances to the next exercise when set number resets to 1", async () => {
    const day = await seedChestDay();
    const session = await useGymStore.getState().startSession(day.id);
    await useGymStore.getState().logSet("1,40,15");
    await useGymStore.getState().logSet("2,42,12");
    await useGymStore.getState().logSet("1,15"); // bodyweight push-up, set resets -> advance
    const state = useGymStore.getState();
    expect(state.activeExerciseId).toBe(session!.exercises[1].id);
    const fresh = state.sessions.find((s) => s.id === state.currentSessionId)!;
    expect(fresh.exercises[0].sets).toHaveLength(2);
    expect(fresh.exercises[1].sets).toEqual([
      expect.objectContaining({ setNumber: 1, weightKg: null, reps: 15 }),
    ]);
  });

  it("sets inputError on malformed input and logs nothing", async () => {
    const day = await seedChestDay();
    await useGymStore.getState().startSession(day.id);
    await useGymStore.getState().logSet("nonsense");
    const state = useGymStore.getState();
    expect(state.inputError).toBeTruthy();
    const session = state.sessions.find((s) => s.id === state.currentSessionId)!;
    expect(session.exercises[0].sets).toHaveLength(0);
  });

  it("sets the session rating", async () => {
    const day = await seedChestDay();
    await useGymStore.getState().startSession(day.id);
    await useGymStore.getState().setRating(4);
    const state = useGymStore.getState();
    expect(state.sessions.find((s) => s.id === state.currentSessionId)!.rating).toBe(4);
  });

  it("deletes a logged set", async () => {
    const day = await seedChestDay();
    await useGymStore.getState().startSession(day.id);
    await useGymStore.getState().logSet("1,40,15");
    const exId = useGymStore.getState().activeExerciseId!;
    await useGymStore.getState().deleteSet(exId, 1);
    const state = useGymStore.getState();
    expect(state.sessions.find((s) => s.id === state.currentSessionId)!.exercises[0].sets).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/__tests__/lib/gym-store.test.ts`
Expected: FAIL — stubs return null / do nothing.

- [ ] **Step 3: Replace the stub methods**

Replace the stub block (`startSession` through `deleteSet`) in `gym-store.ts` with:

```ts
  async startSession(splitDayId) {
    const day = get().splitDays.find((d) => d.id === splitDayId);
    if (!day) return null;
    const exercises: WorkoutSessionExercise[] = day.exercises
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((e) => ({
        id: generateId(),
        name: e.name,
        muscles: e.muscles,
        isBodyweight: e.isBodyweight,
        order: e.order,
        sets: [],
      }));
    const session = await storage.createSession({
      date: todayDate(),
      splitDayId: day.id,
      name: day.name,
      muscles: day.muscles,
      exercises,
    });
    set((s) => ({
      sessions: [session, ...s.sessions],
      currentSessionId: session.id,
      activeExerciseId: session.exercises[0]?.id ?? null,
      lastRecord: null,
      inputError: null,
    }));
    const persona = usePersonaStore.getState().activePersona;
    void sync((uid) => sbUpsertSession(uid, persona, session));
    return session;
  },

  async logSet(raw) {
    const state = get();
    const session = state.sessions.find((s) => s.id === state.currentSessionId);
    if (!session) {
      set({ inputError: "Start a session first" });
      return;
    }
    const sorted = session.exercises.slice().sort((a, b) => a.order - b.order);
    let activeIndex = sorted.findIndex((e) => e.id === state.activeExerciseId);
    if (activeIndex === -1) activeIndex = 0;
    const active = sorted[activeIndex];
    if (!active) {
      set({ inputError: "No exercises in this session" });
      return;
    }

    const parsed = parseSetInput(raw, active.isBodyweight);
    if (!parsed.ok) {
      set({ inputError: parsed.error });
      return;
    }

    // Advance rule: set number resets to 1 AND active already has sets -> move to next exercise.
    let targetIndex = activeIndex;
    if (parsed.value.setNumber === 1 && active.sets.length > 0 && activeIndex < sorted.length - 1) {
      targetIndex = activeIndex + 1;
    }
    const target = sorted[targetIndex];

    const newSet: WorkoutSet = {
      setNumber: parsed.value.setNumber,
      weightKg: parsed.value.weightKg,
      reps: parsed.value.reps,
      loggedAt: nowISO(),
    };

    const updatedExercises = session.exercises.map((e) =>
      e.id === target.id ? { ...e, sets: [...e.sets, newSet] } : e,
    );

    await storage.updateSession(session.id, { exercises: updatedExercises });
    const updatedAt = nowISO();
    const updatedSession = { ...session, exercises: updatedExercises, updatedAt };
    set((s) => ({
      sessions: s.sessions.map((x) => (x.id === session.id ? updatedSession : x)),
      activeExerciseId: target.id,
      lastRecord: { exerciseName: target.name, setNumber: newSet.setNumber, weightKg: newSet.weightKg, reps: newSet.reps },
      inputError: null,
    }));
    const persona = usePersonaStore.getState().activePersona;
    void sync((uid) => sbUpsertSession(uid, persona, updatedSession));
  },

  async setRating(rating) {
    const state = get();
    const session = state.sessions.find((s) => s.id === state.currentSessionId);
    if (!session) return;
    await storage.updateSession(session.id, { rating });
    const updatedSession = { ...session, rating, updatedAt: nowISO() };
    set((s) => ({ sessions: s.sessions.map((x) => (x.id === session.id ? updatedSession : x)) }));
    const persona = usePersonaStore.getState().activePersona;
    void sync((uid) => sbUpsertSession(uid, persona, updatedSession));
  },

  async deleteSession(id) {
    await storage.deleteSession(id);
    set((s) => ({
      sessions: s.sessions.filter((x) => x.id !== id),
      currentSessionId: s.currentSessionId === id ? null : s.currentSessionId,
      activeExerciseId: s.currentSessionId === id ? null : s.activeExerciseId,
    }));
    const persona = usePersonaStore.getState().activePersona;
    void sync((uid) => sbDeleteSession(uid, persona, id));
  },

  setActiveExercise(exerciseId) {
    set({ activeExerciseId: exerciseId, inputError: null });
  },

  async editSet(exerciseId, setNumber, updates) {
    const state = get();
    const session = state.sessions.find((s) => s.id === state.currentSessionId);
    if (!session) return;
    const updatedExercises = session.exercises.map((e) =>
      e.id === exerciseId
        ? { ...e, sets: e.sets.map((set) => (set.setNumber === setNumber ? { ...set, ...updates } : set)) }
        : e,
    );
    await storage.updateSession(session.id, { exercises: updatedExercises });
    const updatedSession = { ...session, exercises: updatedExercises, updatedAt: nowISO() };
    set((s) => ({ sessions: s.sessions.map((x) => (x.id === session.id ? updatedSession : x)) }));
    const persona = usePersonaStore.getState().activePersona;
    void sync((uid) => sbUpsertSession(uid, persona, updatedSession));
  },

  async deleteSet(exerciseId, setNumber) {
    const state = get();
    const session = state.sessions.find((s) => s.id === state.currentSessionId);
    if (!session) return;
    const updatedExercises = session.exercises.map((e) =>
      e.id === exerciseId ? { ...e, sets: e.sets.filter((set) => set.setNumber !== setNumber) } : e,
    );
    await storage.updateSession(session.id, { exercises: updatedExercises });
    const updatedSession = { ...session, exercises: updatedExercises, updatedAt: nowISO() };
    set((s) => ({ sessions: s.sessions.map((x) => (x.id === session.id ? updatedSession : x)) }));
    const persona = usePersonaStore.getState().activePersona;
    void sync((uid) => sbUpsertSession(uid, persona, updatedSession));
  },
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/__tests__/lib/gym-store.test.ts`
Expected: PASS (all split + session tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/gym-store.ts src/__tests__/lib/gym-store.test.ts
git commit -m "feat(gym): session lifecycle, logging, advance rule, set edit/delete"
```

---

## Task 9: Route, store-initializer wiring, nav link

**Files:**
- Create: `src/app/gym/page.tsx`
- Modify: `src/components/store-initializer.tsx`
- Modify: `src/components/layout/site-header.tsx`

- [ ] **Step 1: Create the route**

`src/app/gym/page.tsx`:

```tsx
"use client";

import { GymPage } from "@/components/gym/gym-page";

export default function GymRoute() {
  return <GymPage />;
}
```

- [ ] **Step 2: Wire store-initializer**

In `src/components/store-initializer.tsx`:

Add import:
```ts
import { useGymStore } from "@/lib/stores/gym-store";
```

Add selectors (next to the other `*Loaded` / `load*` consts):
```ts
  const gymLoaded = useGymStore((state) => state.loaded);
  const loadGym = useGymStore((state) => state.load);
```

In the first `useEffect` (the `if (!xLoaded)` block), add:
```ts
    if (!gymLoaded) {
      void loadGym();
    }
```
and add `gymLoaded`, `loadGym` to that effect's dependency array.

In the persona `useEffect`'s `Promise.all([...])`, add `loadGym(activePersona),` and add `loadGym` to that effect's dependency array.

- [ ] **Step 3: Add nav item**

In `src/components/layout/site-header.tsx`, add to the `NAV` array:
```ts
  { href: "/gym", label: "Gym", glyph: "▤" },
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: FAIL only on the missing `@/components/gym/gym-page` import (created in Task 10). That's expected — continue to Task 10 before re-checking. Do NOT commit yet.

> If you prefer green-between-tasks, create a one-line placeholder `gym-page.tsx` now: `export function GymPage() { return null; }` and replace it in Task 10.

---

## Task 10: Components

**Files:**
- Create: `src/components/gym/gym-page.tsx`
- Create: `src/components/gym/smart-input.tsx`
- Create: `src/components/gym/last-record-card.tsx`
- Create: `src/components/gym/day-picker.tsx`
- Create: `src/components/gym/session-view.tsx`
- Create: `src/components/gym/split-editor.tsx`
- Create: `src/components/gym/history-list.tsx`

Tailwind classes mirror existing pages (CSS vars like `var(--bg-panel)`, `var(--text-secondary)`, `var(--surface-border)`, `var(--accent-solid)`). All are client components.

- [ ] **Step 1: smart-input.tsx**

```tsx
"use client";

import { useState } from "react";
import { useGymStore } from "@/lib/stores/gym-store";

export function SmartInput() {
  const [value, setValue] = useState("");
  const logSet = useGymStore((s) => s.logSet);
  const inputError = useGymStore((s) => s.inputError);
  const currentSessionId = useGymStore((s) => s.currentSessionId);
  const sessions = useGymStore((s) => s.sessions);
  const activeExerciseId = useGymStore((s) => s.activeExerciseId);

  const session = sessions.find((s) => s.id === currentSessionId) ?? null;
  const active = session?.exercises.find((e) => e.id === activeExerciseId) ?? null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    const before = useGymStore.getState().inputError;
    await logSet(value);
    if (!useGymStore.getState().inputError || useGymStore.getState().inputError === before) {
      // clear only when the log succeeded (no fresh error)
    }
    if (!useGymStore.getState().inputError) setValue("");
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] p-3">
      <input
        aria-label="Smart set input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={active ? `1,40,15  →  ${active.name}` : "Start a session below"}
        disabled={!session}
        className="w-full bg-transparent font-mono text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
      />
      {active ? (
        <p className="mt-1 text-xs text-[var(--text-secondary)]">→ logging: {active.name}{active.isBodyweight ? " (bodyweight: set,reps)" : ""}</p>
      ) : null}
      {inputError ? <p className="mt-1 text-xs text-red-400">{inputError}</p> : null}
    </form>
  );
}
```

- [ ] **Step 2: last-record-card.tsx**

```tsx
"use client";

import { useGymStore } from "@/lib/stores/gym-store";

export function LastRecordCard() {
  const lastRecord = useGymStore((s) => s.lastRecord);
  if (!lastRecord) return null;
  const weight = lastRecord.weightKg === null ? "BW" : `${lastRecord.weightKg}kg`;
  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel-strong)] p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">Last record</p>
      <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
        {lastRecord.exerciseName} · set {lastRecord.setNumber} · {weight} × {lastRecord.reps}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: day-picker.tsx**

```tsx
"use client";

import { useGymStore } from "@/lib/stores/gym-store";

export function DayPicker({ onManage }: { onManage: () => void }) {
  const splitDays = useGymStore((s) => s.splitDays);
  const startSession = useGymStore((s) => s.startSession);

  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">The workouts</p>
        <button type="button" onClick={onManage} className="text-xs text-[var(--accent-solid)]">Manage splits</button>
      </div>
      {splitDays.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No split days yet. Create one to start.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {splitDays.map((day) => (
            <button
              key={day.id}
              type="button"
              onClick={() => void startSession(day.id)}
              className="rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel-strong)] px-3 py-2 text-sm text-[var(--text-primary)] hover:border-[var(--accent-solid)]"
            >
              {day.name}
              <span className="ml-2 text-xs text-[var(--text-secondary)]">{day.muscles.join(" · ")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: session-view.tsx**

```tsx
"use client";

import { useGymStore } from "@/lib/stores/gym-store";
import type { WorkoutSession } from "@/lib/types";

function Stars({ rating, onRate }: { rating: number | null; onRate: (n: number) => void }) {
  return (
    <div className="flex gap-1" aria-label="Workout rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Rate ${n}`}
          onClick={() => onRate(n)}
          className={n <= (rating ?? 0) ? "text-amber-400" : "text-[var(--text-secondary)]"}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function SessionView({ session }: { session: WorkoutSession }) {
  const activeExerciseId = useGymStore((s) => s.activeExerciseId);
  const setActiveExercise = useGymStore((s) => s.setActiveExercise);
  const setRating = useGymStore((s) => s.setRating);
  const deleteSet = useGymStore((s) => s.deleteSet);

  const exercises = session.exercises.slice().sort((a, b) => a.order - b.order);

  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{session.name}</p>
          <p className="text-xs text-[var(--text-secondary)]">{session.muscles.join(" · ")}</p>
        </div>
        <Stars rating={session.rating} onRate={(n) => void setRating(n)} />
      </div>
      <ul className="flex flex-col gap-2">
        {exercises.map((ex) => {
          const active = ex.id === activeExerciseId;
          return (
            <li
              key={ex.id}
              className={`rounded-lg border p-2 ${active ? "border-[var(--accent-solid)]" : "border-[var(--surface-border)]"}`}
            >
              <button type="button" onClick={() => setActiveExercise(ex.id)} className="text-left text-sm font-medium text-[var(--text-primary)]">
                {active ? "▸ " : ""}{ex.name}
              </button>
              {ex.sets.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)]">pending</p>
              ) : (
                <ul className="mt-1 flex flex-wrap gap-2">
                  {ex.sets.map((set) => (
                    <li key={set.setNumber} className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                      <span>#{set.setNumber} {set.weightKg === null ? "BW" : `${set.weightKg}kg`} × {set.reps}</span>
                      <button type="button" aria-label={`Delete set ${set.setNumber}`} onClick={() => void deleteSet(ex.id, set.setNumber)} className="text-red-400">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: history-list.tsx**

```tsx
"use client";

import { useGymStore } from "@/lib/stores/gym-store";

export function HistoryList() {
  const sessions = useGymStore((s) => s.sessions);
  const currentSessionId = useGymStore((s) => s.currentSessionId);
  const deleteSession = useGymStore((s) => s.deleteSession);
  const past = sessions.filter((s) => s.id !== currentSessionId);

  if (past.length === 0) return null;
  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] p-4">
      <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">Previous records</p>
      <ul className="flex flex-col gap-1">
        {past.map((s) => (
          <li key={s.id} className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
            <span>{s.date} · {s.name} · {"★".repeat(s.rating ?? 0)}{"☆".repeat(5 - (s.rating ?? 0))}</span>
            <button type="button" aria-label="Delete session" onClick={() => void deleteSession(s.id)} className="text-red-400">×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 6: split-editor.tsx**

```tsx
"use client";

import { useState } from "react";
import { useGymStore } from "@/lib/stores/gym-store";
import { EXERCISE_LIBRARY } from "@/lib/gym/library";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/types";

interface DraftExercise {
  name: string;
  muscles: MuscleGroup[];
  isBodyweight: boolean;
  libraryId: string | null;
}

export function SplitEditor({ onClose }: { onClose: () => void }) {
  const createSplitDay = useGymStore((s) => s.createSplitDay);
  const customExercises = useGymStore((s) => s.customExercises);
  const [name, setName] = useState("");
  const [muscles, setMuscles] = useState<MuscleGroup[]>([]);
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [exName, setExName] = useState("");

  const suggestions = [...EXERCISE_LIBRARY, ...customExercises];

  function toggleMuscle(m: MuscleGroup) {
    setMuscles((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  }

  function addExercise() {
    const trimmed = exName.trim();
    if (!trimmed) return;
    const match = suggestions.find((e) => e.name.toLowerCase() === trimmed.toLowerCase());
    setExercises((cur) => [
      ...cur,
      match
        ? { name: match.name, muscles: match.muscles, isBodyweight: match.isBodyweight, libraryId: "id" in match && EXERCISE_LIBRARY.some((l) => l.id === (match as { id: string }).id) ? (match as { id: string }).id : null }
        : { name: trimmed, muscles: [], isBodyweight: false, libraryId: null },
    ]);
    setExName("");
  }

  async function save() {
    if (!name.trim()) return;
    await createSplitDay({ name, muscles, exercises });
    onClose();
  }

  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--text-primary)]">New split day</p>
        <button type="button" onClick={onClose} className="text-xs text-[var(--text-secondary)]">Close</button>
      </div>
      <input
        aria-label="Day name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Chest day"
        className="mb-3 w-full rounded-lg border border-[var(--surface-border)] bg-transparent p-2 text-sm text-[var(--text-primary)]"
      />
      <div className="mb-3 flex flex-wrap gap-1">
        {MUSCLE_GROUPS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => toggleMuscle(m)}
            className={`rounded-full px-2 py-1 text-xs ${muscles.includes(m) ? "bg-[var(--accent-solid)] text-black" : "border border-[var(--surface-border)] text-[var(--text-secondary)]"}`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="mb-2 flex gap-2">
        <input
          aria-label="Exercise name"
          value={exName}
          onChange={(e) => setExName(e.target.value)}
          list="gym-exercise-suggestions"
          placeholder="Barbell Bench Press"
          className="flex-1 rounded-lg border border-[var(--surface-border)] bg-transparent p-2 text-sm text-[var(--text-primary)]"
        />
        <datalist id="gym-exercise-suggestions">
          {suggestions.map((e) => (
            <option key={e.name} value={e.name} />
          ))}
        </datalist>
        <button type="button" onClick={addExercise} className="rounded-lg border border-[var(--surface-border)] px-3 text-sm text-[var(--text-primary)]">Add</button>
      </div>
      <ul className="mb-3 flex flex-col gap-1">
        {exercises.map((e, i) => (
          <li key={`${e.name}-${i}`} className="text-sm text-[var(--text-secondary)]">{i + 1}. {e.name}{e.isBodyweight ? " (BW)" : ""}</li>
        ))}
      </ul>
      <button type="button" onClick={() => void save()} className="rounded-lg bg-[var(--accent-solid)] px-4 py-2 text-sm font-semibold text-black">Save split day</button>
    </div>
  );
}
```

- [ ] **Step 7: gym-page.tsx**

```tsx
"use client";

import { useState } from "react";
import { useGymStore } from "@/lib/stores/gym-store";
import { SmartInput } from "./smart-input";
import { LastRecordCard } from "./last-record-card";
import { DayPicker } from "./day-picker";
import { SessionView } from "./session-view";
import { SplitEditor } from "./split-editor";
import { HistoryList } from "./history-list";

export function GymPage() {
  const sessions = useGymStore((s) => s.sessions);
  const currentSessionId = useGymStore((s) => s.currentSessionId);
  const [editing, setEditing] = useState(false);
  const session = sessions.find((s) => s.id === currentSessionId) ?? null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-12">
      <SmartInput />
      <LastRecordCard />
      {editing ? (
        <SplitEditor onClose={() => setEditing(false)} />
      ) : session ? (
        <SessionView session={session} />
      ) : (
        <DayPicker onManage={() => setEditing(true)} />
      )}
      <HistoryList />
    </div>
  );
}
```

- [ ] **Step 8: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/components/gym src/app/gym`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/app/gym src/components/gym src/components/store-initializer.tsx src/components/layout/site-header.tsx
git commit -m "feat(gym): page, components, route, nav, store wiring"
```

---

## Task 11: Component tests

**Files:**
- Create: `src/__tests__/components/gym-smart-input.test.tsx`
- Create: `src/__tests__/components/gym-session-view.test.tsx`

- [ ] **Step 1: Write smart-input test**

```tsx
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { storage } from "@/lib/db/storage";
import { useGymStore } from "@/lib/stores/gym-store";
import { SmartInput } from "@/components/gym/smart-input";

describe("SmartInput", () => {
  beforeEach(async () => {
    await storage.clear();
    useGymStore.setState({
      splitDays: [], sessions: [], customExercises: [],
      currentSessionId: null, activeExerciseId: null,
      lastRecord: null, inputError: null, loaded: true,
    });
  });

  it("logs a set and clears the field", async () => {
    const day = await useGymStore.getState().createSplitDay({
      name: "Chest day",
      muscles: ["Chest"],
      exercises: [{ name: "Barbell Bench Press", muscles: ["Chest"], isBodyweight: false, libraryId: "barbell-bench-press" }],
    });
    await useGymStore.getState().startSession(day.id);

    render(<SmartInput />);
    const input = screen.getByLabelText("Smart set input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1,40,15" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      const state = useGymStore.getState();
      const session = state.sessions.find((s) => s.id === state.currentSessionId)!;
      expect(session.exercises[0].sets).toHaveLength(1);
    });
    expect(input.value).toBe("");
  });

  it("shows an error on malformed input", async () => {
    const day = await useGymStore.getState().createSplitDay({
      name: "Chest day",
      muscles: ["Chest"],
      exercises: [{ name: "Barbell Bench Press", muscles: ["Chest"], isBodyweight: false, libraryId: "barbell-bench-press" }],
    });
    await useGymStore.getState().startSession(day.id);

    render(<SmartInput />);
    const input = screen.getByLabelText("Smart set input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1,40" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => expect(useGymStore.getState().inputError).toBeTruthy());
  });
});
```

- [ ] **Step 2: Write session-view test**

```tsx
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { storage } from "@/lib/db/storage";
import { useGymStore } from "@/lib/stores/gym-store";
import { SessionView } from "@/components/gym/session-view";

describe("SessionView", () => {
  beforeEach(async () => {
    await storage.clear();
    useGymStore.setState({
      splitDays: [], sessions: [], customExercises: [],
      currentSessionId: null, activeExerciseId: null,
      lastRecord: null, inputError: null, loaded: true,
    });
  });

  it("renders exercises and sets a rating", async () => {
    const day = await useGymStore.getState().createSplitDay({
      name: "Chest day",
      muscles: ["Chest"],
      exercises: [{ name: "Barbell Bench Press", muscles: ["Chest"], isBodyweight: false, libraryId: "barbell-bench-press" }],
    });
    const session = await useGymStore.getState().startSession(day.id);

    render(<SessionView session={session!} />);
    expect(screen.getByText(/Barbell Bench Press/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Rate 4"));
    await waitFor(() => {
      const state = useGymStore.getState();
      expect(state.sessions.find((s) => s.id === state.currentSessionId)!.rating).toBe(4);
    });
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/__tests__/components/gym-smart-input.test.tsx src/__tests__/components/gym-session-view.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/components/gym-smart-input.test.tsx src/__tests__/components/gym-session-view.test.tsx
git commit -m "test(gym): smart-input and session-view component tests"
```

---

## Task 12: Full verification

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: PASS (all suites, including pre-existing).

- [ ] **Step 2: Typecheck + lint + build**

Run: `npx tsc --noEmit && npx eslint && npm run build`
Expected: PASS.

- [ ] **Step 3: Manual smoke (optional, via the run skill)**

Start dev, open `/gym`: create a split day, start it, type `1,40,15` then `2,42,12` then `1,12` (advance), set stars, delete a set, check Previous records after starting a second session.

- [ ] **Step 4: Final commit (if any uncommitted changes remain)**

```bash
git add -A
git commit -m "chore(gym): final verification pass"
```

---

## Self-review notes

- **Spec coverage:** plan/log split (Task 7–8), reusable split + dated sessions w/ snapshot (Task 8 `startSession`), single sequential smart input w/ set-reset advance (Task 8 `logSet`), always-visible stars (Task 10 session-view), fixed-list muscles (Task 10 split-editor), library + freetext autocomplete w/ custom persistence (Task 5 `upsertCustomExercise`, Task 7 createSplitDay, Task 10 split-editor `datalist`), four-zone layout (Task 10 gym-page), multiple sessions per date (no uniqueness constraint), local-first + fire-and-forget sync (Task 6–8). All covered.
- **Type consistency:** `parseSetInput(raw, isBodyweight)`, `ParseResult`, store methods, and component props use identical names across tasks.
- **Bodyweight 2-number path** is exercised end-to-end (parser test + advance test + library `Push-Up`).
