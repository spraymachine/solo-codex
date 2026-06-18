# Read Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone persona-private `Read` route for camera/upload OCR word capture, dictionary definitions, and saved vocabulary records.

**Architecture:** Keep OCR and dictionary parsing in focused library modules, store persisted records in the existing persona-local Dexie database, expose state through a small Zustand store, and render `/read` as a client-only workflow. Use direct OCR.space and dictionaryapi.dev browser calls because the app uses `output: "export"` for static hosting.

**Tech Stack:** Next.js App Router 16.2.4, React 19, TypeScript, Zustand, Dexie, Vitest, Testing Library, OCR.space, dictionaryapi.dev.

---

## File Structure

- Create `src/app/read/page.tsx`: route entry for `/read`.
- Create `src/components/read/read-page.tsx`: capture, OCR review, selected definitions, save flow.
- Create `src/components/read/read-record-list.tsx`: saved record display grouped by day.
- Create `src/lib/read/ocr-space.ts`: OCR.space response parsing and API key helper.
- Create `src/lib/read/dictionary.ts`: dictionaryapi.dev response parsing and fetch helper.
- Create `src/lib/stores/read-store.ts`: persona-private Read record state/actions.
- Modify `src/lib/types.ts`: add `ReadRecord` and `ReadSourceType`.
- Modify `src/lib/db/database.ts`: add Dexie `readRecords` table in version 9.
- Modify `src/lib/db/storage.ts`: add Read CRUD and include records in local clear.
- Modify `src/components/store-initializer.tsx`: load Read records on app boot and persona switch.
- Modify `src/components/layout/sidebar.tsx`: add desktop nav item.
- Modify `src/components/layout/bottom-nav.tsx`: add mobile nav item.
- Create tests for parser, storage, store, and page rendering.

## Tasks

### Task 1: Add Read Types And Local Persistence

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/db/database.ts`
- Modify: `src/lib/db/storage.ts`

- [x] **Step 1: Add types**

Add `ReadSourceType` and `ReadRecord`. Do not include `readRecords` in `AppSnapshot`.

- [x] **Step 2: Add Dexie table**

Add `readRecords!: EntityTable<ReadRecord, "id">;` and Dexie version 9 store definition:

```ts
readRecords: "id, createdAt, word, sourceType"
```

- [x] **Step 3: Add storage methods**

Add:

```ts
getReadRecords(options?: StorageOptions): Promise<ReadRecord[]>
createReadRecord(input): Promise<ReadRecord>
updateReadRecord(id, updates): Promise<void>
deleteReadRecord(id): Promise<void>
```

- [x] **Step 4: Include Read records in local clear**

Include `readRecords` in `clear`. Keep `exportSnapshot` and `importSnapshot` unchanged so Read does not sync through Supabase snapshots.

### Task 2: Add OCR And Dictionary Libraries

**Files:**
- Create: `src/lib/read/ocr-space.ts`
- Create: `src/lib/read/dictionary.ts`
- Test: `src/__tests__/lib/read-parsers.test.ts`

- [x] **Step 1: Write OCR parser**

Parse OCR.space `ParsedResults[].TextOverlay.Lines[].Words[]` into:

```ts
{ id, text, left, top, width, height }
```

Throw a readable error for OCR.space processing errors.

- [x] **Step 2: Write dictionary parser**

Parse dictionaryapi.dev payload and return first available `{ word, definition, partOfSpeech }`.

- [x] **Step 3: Add parser tests**

Run:

```bash
npm test -- src/__tests__/lib/read-parsers.test.ts
```

Expected: parser tests pass.

### Task 3: Add Read Store

**Files:**
- Create: `src/lib/stores/read-store.ts`
- Modify: `src/components/store-initializer.tsx`
- Test: `src/__tests__/lib/read-store.test.ts`

- [x] **Step 1: Create store**

Expose:

```ts
records
loaded
load(persona?)
createRecords(items)
updateRecord(id, updates)
deleteRecord(id)
```

- [x] **Step 2: Load on app boot and persona switch**

Import `useReadStore` into `StoreInitializer` and call `loadRead(activePersona)`.

- [x] **Step 3: Add store tests**

Verify Mani and Harti records stay separate.

Run:

```bash
npm test -- src/__tests__/lib/read-store.test.ts
```

Expected: store tests pass.

### Task 4: Build Read UI

**Files:**
- Create: `src/app/read/page.tsx`
- Create: `src/components/read/read-page.tsx`
- Create: `src/components/read/read-record-list.tsx`
- Test: `src/__tests__/components/read-page.test.tsx`

- [x] **Step 1: Add route**

`src/app/read/page.tsx` renders `ReadPage`.

- [x] **Step 2: Add capture flow**

Use:

```tsx
<input type="file" accept="image/*" capture="environment" />
```

Compress images above OCR.space free-tier size before sending them.

- [x] **Step 3: Render OCR word boxes**

Use OCR box coordinates as percentages over the preview image and toggle selected state on click.

- [x] **Step 4: Add selected word editor**

Each selected word shows editable word, part of speech, and definition fields.

- [x] **Step 5: Save selected words**

Persist selected rows to `useReadStore.createRecords`.

- [x] **Step 6: Show saved records**

Group by day, newest first.

- [x] **Step 7: Add page test**

Mock stores and render the capture/saved record surface.

Run:

```bash
npm test -- src/__tests__/components/read-page.test.tsx
```

Expected: page test passes.

### Task 5: Add Navigation

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/bottom-nav.tsx`

- [x] **Step 1: Add desktop nav item**

Add:

```ts
{ href: "/read", icon: "▣", label: "Read" }
```

- [x] **Step 2: Add mobile nav item**

Add `/read` to bottom nav while keeping labels short.

### Task 6: Verify

**Files:**
- No new files.

- [x] **Step 1: Run focused tests**

```bash
npm test -- src/__tests__/lib/read-parsers.test.ts src/__tests__/lib/read-store.test.ts src/__tests__/components/read-page.test.tsx
```

Expected: all focused tests pass.

- [x] **Step 2: Run scoped Read lint**

```bash
npx eslint src/components/read src/lib/read src/lib/stores/read-store.ts src/app/read/page.tsx src/__tests__/lib/read-parsers.test.ts src/__tests__/lib/read-store.test.ts src/__tests__/components/read-page.test.tsx
```

Expected: no Read lint errors.

- [x] **Step 3: Run build**

```bash
npm run build
```

Expected: static export build passes. This validates no unsupported POST route handler was added.

Full-suite note: `npm run lint` and `npm test` still report existing non-Read failures in `src/app/page.tsx`, `src/components/sticky/sticky-wall.tsx`, Work Supabase typing, continuation-store date expectations, Work DB name expectation, and Work page tests that expect the old Paste Plan default tab.

## Supabase Constraint

No Supabase mutation is part of this plan. Do not run Supabase CLI/MCP mutation commands. Do not add migrations for v1. `readRecords` is not carried by the existing snapshot JSON blob and no dedicated hosted DB table is created.
