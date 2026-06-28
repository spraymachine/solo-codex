# Gym — workout planner & logger

Date: 2026-06-28
Status: Approved (design)

## Goal

A `/gym` page to plan workout splits and log training sessions with near-zero
friction. Plan a reusable split (which muscles + which exercises per day), then
log actual performance through a single smart input that parses terse number
strings into sets. One input, minimal scrolling.

## Naming note

The codebase already has an unrelated `GymStat` type/table (a leveling stat
tracker). To avoid collision, all new types use a `Workout*` prefix. The
user-facing page and route remain "Gym" / `/gym`.

## Core model: plan then log

- You build **split day templates** once (e.g. Chest day, Leg day, Pull day),
  each carrying a fixed-list set of muscles and an ordered list of exercises.
- When you train, you start a **dated session from a template**. The session
  takes a snapshot of the template (name, muscles, exercise list) so later edits
  to the template never rewrite past history.
- You log actual sets into the session via the smart input.
- The whole session carries a 1–5 star rating, always visible/editable.

## Data model

All records are persona-scoped (`personaId`) and follow the existing local-first
pattern: Dexie is the source of truth, Supabase sync is fire-and-forget
(mirrors `src/lib/stores/read-store.ts` + `src/lib/supabase/read.ts`).

### `WorkoutSplitDay` (template)
- `id`, `personaId`
- `name` — e.g. "Chest day"
- `muscles: MuscleGroup[]` — from the fixed list
- `exercises: WorkoutTemplateExercise[]` — ordered
- `order` — for arranging the split list
- `createdAt`, `updatedAt`

### `WorkoutTemplateExercise`
- `id`
- `name` — e.g. "Barbell Bench Press"
- `muscles: MuscleGroup[]` — inherited from library entry, or chosen for custom
- `isBodyweight: boolean`
- `libraryId?: string | null` — links to library entry if picked from one
- `order`

### `WorkoutSession` (dated)
- `id`, `personaId`
- `date` — ISO date string (multiple sessions per date allowed)
- `splitDayId` — origin template (reference only; data is snapshotted below)
- `name`, `muscles: MuscleGroup[]` — snapshot from template at start
- `rating: number | null` — 1–5
- `exercises: WorkoutSessionExercise[]` — snapshot copy, ordered
- `createdAt`, `updatedAt`

### `WorkoutSessionExercise`
- `id`
- `name`, `muscles: MuscleGroup[]`, `isBodyweight`, `order`
- `sets: WorkoutSet[]`

### `WorkoutSet`
- `setNumber: number`
- `weightKg: number | null` — null for bodyweight
- `reps: number`
- `loggedAt: string`

### `WorkoutExercise` (custom library entry)
- `id`, `personaId`
- `name`, `muscles: MuscleGroup[]`, `isBodyweight`
- Bundled library exercises live in code (`lib/gym/library.ts`); user-created
  freetext names get persisted here so autocomplete suggests them next time.

### `MuscleGroup` (fixed list)
`Chest, Back, Quads, Hamstrings, Shoulders, Biceps, Triceps, Core, Glutes, Calves`

## Smart input parser

Pure function in `src/lib/gym/parse.ts`, unit-tested independently of UI.

Input: a raw string. Separators: commas or spaces (`"1,40,15"` or `"1 40 15"`).

- **3 numbers** → `setNumber, weightKg, reps`.
- **2 numbers**, active exercise `isBodyweight` → `setNumber, reps` (weight null).
- **2 numbers**, active exercise weighted → rejected as incomplete; UI shows a
  hint (weighted exercises require all 3 numbers). Parser stays strict so
  ambiguity never silently logs bad data. (The active exercise's `isBodyweight`
  flag is passed into the parser so it can apply this rule.)
- Non-numeric / empty / malformed → parser returns an error result; UI shows a
  hint, logs nothing.

Parser returns a structured result `{ ok, setNumber, weightKg, reps, error? }`.
It does NOT decide which exercise — that's the store's targeting logic.

### Sequential targeting (in the store, not the parser)

The session maintains an **active exercise pointer** (default: first exercise).

- A parsed set normally logs to the active exercise.
- **Advance rule** (user's chosen mechanic): if `setNumber === 1` AND the active
  exercise already has ≥1 logged set, the pointer advances to the next exercise
  first, then logs set 1 there. Forward-only.
- First set of a fresh exercise (0 sets) logs in place — no advance.

### Escape hatches
- Tap any session exercise → force it active (override pointer).
- Tap a logged set → edit or delete it.

## Page layout (`/gym`)

Zone order is fixed (matches the approved mockup):

1. **Smart input** — sticky near top. Shows the active target as a hint
   ("→ logging: Barbell Bench Press").
2. **Last record card** — large echo of the most recently parsed set
   ("Bench Press · set 1 · 40kg × 15") for instant confirmation.
3. **The workouts** — state-swapping zone:
   - No session started today → **day picker** (the split templates as chips).
   - Session started → **today's session**: 1–5 stars (always visible), then the
     ordered exercise list with logged sets; active exercise highlighted, others
     show "pending".
4. **Previous records** — past dated sessions, newest first
   (date · day name · rating).

A separate **manage splits** view (modal or sub-route) handles
creating/editing/reordering split day templates: name, muscle chips
(fixed list), and exercises (library pick or freetext + autocomplete,
drag/reorder, mark bodyweight).

## Files

New:
- `src/lib/gym/parse.ts` — smart input parser (pure)
- `src/lib/gym/library.ts` — bundled exercises (name + muscles + isBodyweight) and `MuscleGroup` constant
- `src/lib/stores/gym-store.ts` — Zustand store: load, CRUD splits, start/finish session, log/edit/delete set, active pointer + advance logic, rating
- `src/lib/supabase/gym.ts` — fire-and-forget sync (mirror `read.ts`)
- `src/app/gym/page.tsx` — route entry
- `src/components/gym/gym-page.tsx` — client root
- `src/components/gym/smart-input.tsx`
- `src/components/gym/last-record-card.tsx`
- `src/components/gym/session-view.tsx` — stars + exercise/set list
- `src/components/gym/day-picker.tsx`
- `src/components/gym/split-editor.tsx` — manage splits
- `src/components/gym/history-list.tsx`

Modified:
- `src/lib/types.ts` — add `Workout*` types + `MuscleGroup`
- `src/lib/db/database.ts` — new Dexie version (14) adding tables `workoutSplitDays`, `workoutSessions`, `workoutExercises`
- `src/components/layout/site-header.tsx` — add "Gym" nav link

Tests:
- `src/__tests__/lib/gym-parse.test.ts` — parser cases (3-num, 2-num bodyweight, malformed, separators)
- `src/__tests__/lib/gym-store.test.ts` — targeting/advance logic, set CRUD, session lifecycle
- `src/__tests__/components/` — smart-input, session-view, day-picker key behaviors

## Decisions baked in
- Multiple sessions per date allowed.
- Sessions snapshot template data at start (history immutable to later edits).
- Local-first; Supabase never blocks UI; local is source of truth.
- Strict parser: ambiguous input logs nothing, shows a hint.
