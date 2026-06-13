# Read Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone "Read" section where the user photographs text, drags a highlight box over a word/phrase, OCRs that region, looks up the definition, and saves it as a searchable vocabulary record.

**Architecture:** Follows existing section conventions — a route under `src/app/read/`, components under `src/components/read/`, a zustand store, and a Dexie table reached through the per-persona `getDb()`. Captured images are transient (object URL in component state, revoked after OCR; never persisted). Cloud sync is gained for free by adding `readRecords` to the existing per-persona `AppSnapshot` (export/import), not the bespoke per-table Supabase machinery.

**Tech Stack:** Next.js 16 (app router), React 19, zustand, Dexie/IndexedDB, Supabase (snapshot sync), Tesseract.js (lazy-loaded in-browser OCR), `api.dictionaryapi.dev`, vitest + fake-indexeddb + @testing-library/react.

---

## Reference facts (verified against the codebase)

- Current max Dexie version is `this.version(8)` in `src/lib/db/database.ts`. New table goes in `this.version(9)`.
- `getDb(persona?)` returns a per-persona Dexie instance. Persona scoping is by **separate database**, so a `persona` column is not needed for filtering. We still stamp `persona` on each record for snapshot portability.
- Id/time helpers: `generateId()` and `nowISO()` from `@/lib/utils` (`generateId` wraps `crypto.randomUUID()`).
- `storage.clear()` (`src/lib/db/storage.ts`) clears every table; tests call it in `beforeEach`, so the new table MUST be added there or tests leak state.
- `AppSnapshot` (`src/lib/types.ts:204`) is the per-persona payload stored in Supabase; `exportSnapshot`/`importSnapshot` in `storage.ts` round-trip it.
- Test setup: `src/__tests__/setup.ts` imports `fake-indexeddb/auto`; run tests with `npm test`.
- Nav arrays: `src/components/layout/sidebar.tsx` (desktop, has `icon`) and `src/components/layout/bottom-nav.tsx` (mobile, no icon).
- `src/app/work/page.tsx` is the route-component pattern to mirror.

---

## File structure

**Create:**
- `src/lib/read/dictionary.ts` — definition lookup behind a provider interface.
- `src/lib/read/crop.ts` — crop a boxed region of an image to a Blob.
- `src/lib/read/ocr.ts` — thin lazy-loaded Tesseract.js wrapper.
- `src/lib/stores/read-store.ts` — zustand store for `ReadRecord`s.
- `src/app/read/page.tsx` — route.
- `src/components/read/read-page.tsx` — section shell (header, scan button, search, list).
- `src/components/read/scan-flow.tsx` — capture→highlight→OCR→define modal.
- `src/components/read/highlight-canvas.tsx` — image + draggable selection box.
- `src/components/read/read-record-form.tsx` — confirm/edit term + definition (also manual fallback).
- `src/components/read/record-card.tsx` — one saved record.
- Tests: `src/__tests__/lib/read-dictionary.test.ts`, `src/__tests__/lib/read-crop.test.ts`, `src/__tests__/lib/read-store.test.ts`.

**Modify:**
- `src/lib/types.ts` — add `ReadRecord`, `NewReadRecord`, `DefinitionResult`; extend `AppSnapshot`.
- `src/lib/db/database.ts` — add `readRecords` table + `version(9)`.
- `src/lib/db/storage.ts` — CRUD + wire into `clear`/`exportSnapshot`/`importSnapshot`.
- `src/components/layout/sidebar.tsx` — add nav item.
- `src/components/layout/bottom-nav.tsx` — add nav item.
- `package.json` — add `tesseract.js` dependency.

---

## Task 1: Types

**Files:**
- Modify: `src/lib/types.ts` (add near other record types; extend `AppSnapshot` at :204)

- [ ] **Step 1: Add the new types**

Add these exports (place alongside the other record interfaces):

```ts
export interface ReadRecord {
  id: string;
  persona: Persona;
  term: string;
  partOfSpeech?: string;
  definition: string;
  phonetic?: string;
  example?: string;
  tags: string[];
  createdAt: string; // ISO
}

export type NewReadRecord = Pick<
  ReadRecord,
  "term" | "definition" | "partOfSpeech" | "phonetic" | "example"
> & { tags?: string[] };

export interface DefinitionResult {
  term: string;
  partOfSpeech?: string;
  definition: string;
  phonetic?: string;
  example?: string;
}
```

- [ ] **Step 2: Extend `AppSnapshot`**

In the `AppSnapshot` interface add the field:

```ts
  readRecords: ReadRecord[];
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS for this file (other files referencing `AppSnapshot` will error until Task 3 — that is expected; do not "fix" them here).

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(read): add ReadRecord types and snapshot field"
```

---

## Task 2: Dexie table (version 9)

**Files:**
- Modify: `src/lib/db/database.ts`

- [ ] **Step 1: Declare the table field on the class**

In `class SoloLevelingDB`, add alongside the other `EntityTable` fields:

```ts
  readRecords!: EntityTable<ReadRecord, "id">;
```

Add `ReadRecord` to the type import block at the top of the file.

- [ ] **Step 2: Add `version(9)`**

Immediately after the existing `this.version(8)...` block, add:

```ts
    this.version(9).stores({
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
      readRecords: "id, persona, createdAt",
    });
```

No `.upgrade()` needed — new empty table.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/database.ts
git commit -m "feat(read): add readRecords Dexie table (v9)"
```

---

## Task 3: Storage CRUD + snapshot wiring

**Files:**
- Modify: `src/lib/db/storage.ts`
- Test: `src/__tests__/lib/storage.test.ts` (add a `describe`) — optional but recommended; the store test in Task 6 also exercises this layer.

- [ ] **Step 1: Add CRUD methods**

Add `ReadRecord`, `NewReadRecord` to the type import block. Add these methods to the `storage` object (mirror the leads/gymStats style):

```ts
  async getReadRecords(options?: StorageOptions): Promise<ReadRecord[]> {
    const db = getDb(options?.persona);
    return db.readRecords.orderBy("createdAt").reverse().toArray();
  },

  async addReadRecord(
    input: NewReadRecord,
    options?: StorageOptions,
  ): Promise<ReadRecord> {
    const db = getDb(options?.persona);
    const persona = options?.persona ?? usePersonaStore.getState().activePersona;
    const record: ReadRecord = {
      id: generateId(),
      persona,
      term: input.term,
      definition: input.definition,
      partOfSpeech: input.partOfSpeech,
      phonetic: input.phonetic,
      example: input.example,
      tags: input.tags ?? [],
      createdAt: nowISO(),
    };
    await db.readRecords.add(record);
    return record;
  },

  async updateReadRecord(
    id: string,
    updates: Partial<ReadRecord>,
    options?: StorageOptions,
  ): Promise<void> {
    const db = getDb(options?.persona);
    await db.readRecords.update(id, updates);
  },

  async deleteReadRecord(id: string, options?: StorageOptions): Promise<void> {
    const db = getDb(options?.persona);
    await db.readRecords.delete(id);
  },
```

Add `import { usePersonaStore } from "@/lib/stores/persona-store";` if not already imported in this file (check the existing imports first — `database.ts` imports it; confirm `storage.ts` does too, add if missing).

- [ ] **Step 2: Wire into `clear()`**

In `storage.clear()`, add to the `Promise.all([...])` list:

```ts
      db.readRecords.clear(),
```

- [ ] **Step 3: Wire into `exportSnapshot`**

In `exportSnapshot`, add `this.getReadRecords(options)` to the `Promise.all`, destructure `readRecords`, and include `readRecords` in the returned object. The destructure becomes:

```ts
    const [
      profile, gates, quests, missions, inventory,
      hunterRecords, gymStats, xpLog, readRecords,
    ] = await Promise.all([
      this.getProfile(options),
      this.getGates(options),
      db.quests.toArray(),
      this.getMissions(options),
      this.getInventoryItems(options),
      this.getHunterRecords(options),
      this.getGymStats(options),
      this.getXpLog(options),
      this.getReadRecords(options),
    ]);
```

and add `readRecords,` to the returned object literal.

- [ ] **Step 4: Wire into `importSnapshot`**

In `importSnapshot`: add `db.readRecords` to the transaction table list, add `db.readRecords.clear()` to the clear `Promise.all`, and add the bulk insert:

```ts
        if (snapshot.readRecords?.length)
          await db.readRecords.bulkPut(snapshot.readRecords);
```

(Use optional chaining `?.` so older snapshots without the field still import.)

- [ ] **Step 5: Add a storage test**

In `src/__tests__/lib/storage.test.ts`, add inside the top-level `describe("storage", ...)`:

```ts
  describe("read records", () => {
    it("adds and retrieves read records newest-first", async () => {
      const first = await storage.addReadRecord({ term: "salient", definition: "noticeable" });
      const second = await storage.addReadRecord({ term: "ephemeral", definition: "short-lived" });
      const records = await storage.getReadRecords();
      expect(records).toHaveLength(2);
      expect(records[0].id).toBe(second.id);
      expect(records[1].id).toBe(first.id);
      expect(records[0].tags).toEqual([]);
    });

    it("updates and deletes a read record", async () => {
      const rec = await storage.addReadRecord({ term: "x", definition: "y" });
      await storage.updateReadRecord(rec.id, { definition: "updated" });
      await storage.deleteReadRecord(rec.id);
      expect(await storage.getReadRecords()).toHaveLength(0);
    });

    it("round-trips read records through a snapshot", async () => {
      await storage.addReadRecord({ term: "salient", definition: "noticeable" });
      const snap = await storage.exportSnapshot();
      expect(snap.readRecords).toHaveLength(1);
      await storage.clear();
      await storage.importSnapshot(snap);
      expect(await storage.getReadRecords()).toHaveLength(1);
    });
  });
```

- [ ] **Step 6: Run the storage tests**

Run: `npm test -- storage`
Expected: PASS (including the new "read records" block).

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/storage.ts src/__tests__/lib/storage.test.ts
git commit -m "feat(read): storage CRUD and snapshot sync for read records"
```

---

## Task 4: Dictionary provider

**Files:**
- Create: `src/lib/read/dictionary.ts`
- Test: `src/__tests__/lib/read-dictionary.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupDefinition } from "@/lib/read/dictionary";

const samplePayload = [
  {
    word: "ephemeral",
    phonetic: "/ɪˈfɛm(ə)rəl/",
    meanings: [
      {
        partOfSpeech: "adjective",
        definitions: [
          { definition: "lasting for a very short time", example: "fashions are ephemeral" },
        ],
      },
    ],
  },
];

afterEach(() => vi.restoreAllMocks());

describe("lookupDefinition", () => {
  it("normalises the first entry of an API hit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => samplePayload,
    }));
    const result = await lookupDefinition("ephemeral");
    expect(result).toEqual({
      term: "ephemeral",
      partOfSpeech: "adjective",
      definition: "lasting for a very short time",
      phonetic: "/ɪˈfɛm(ə)rəl/",
      example: "fashions are ephemeral",
    });
  });

  it("returns null on a 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    expect(await lookupDefinition("zzzznotaword")).toBeNull();
  });

  it("returns null when fetch throws (offline)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await lookupDefinition("ephemeral")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to confirm failure**

Run: `npm test -- read-dictionary`
Expected: FAIL — cannot import `lookupDefinition`.

- [ ] **Step 3: Implement**

```ts
import type { DefinitionResult } from "@/lib/types";

export interface DefinitionProvider {
  lookup(term: string): Promise<DefinitionResult | null>;
}

const API = "https://api.dictionaryapi.dev/api/v2/entries/en";

export const freeDictionaryProvider: DefinitionProvider = {
  async lookup(term) {
    const cleaned = term.trim();
    if (!cleaned) return null;
    try {
      const res = await fetch(`${API}/${encodeURIComponent(cleaned)}`);
      if (!res.ok) return null;
      const data = await res.json();
      const entry = Array.isArray(data) ? data[0] : null;
      const meaning = entry?.meanings?.[0];
      const sense = meaning?.definitions?.[0];
      if (!entry || !sense?.definition) return null;
      return {
        term: entry.word ?? cleaned,
        partOfSpeech: meaning.partOfSpeech,
        definition: sense.definition,
        phonetic: entry.phonetic,
        example: sense.example,
      };
    } catch {
      return null;
    }
  },
};

export function lookupDefinition(term: string): Promise<DefinitionResult | null> {
  return freeDictionaryProvider.lookup(term);
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- read-dictionary`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/read/dictionary.ts src/__tests__/lib/read-dictionary.test.ts
git commit -m "feat(read): free dictionary provider behind interface"
```

---

## Task 5: Image crop helper

**Files:**
- Create: `src/lib/read/crop.ts`
- Test: `src/__tests__/lib/read-crop.test.ts`

Note: jsdom lacks a real canvas. `crop.ts` must accept a `CanvasRenderingContext2D`-producing factory so the test can inject a stub, and so production passes a real canvas. Keep the geometry pure and testable.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { computeCropRect } from "@/lib/read/crop";

describe("computeCropRect", () => {
  it("clamps a selection to image bounds and normalises direction", () => {
    const rect = computeCropRect(
      { x: 90, y: 10, w: -40, h: 30 }, // drawn right-to-left
      { width: 100, height: 100 },
    );
    expect(rect).toEqual({ x: 50, y: 10, w: 40, h: 30 });
  });

  it("clamps overflow past the right/bottom edges", () => {
    const rect = computeCropRect(
      { x: 80, y: 80, w: 50, h: 50 },
      { width: 100, height: 100 },
    );
    expect(rect).toEqual({ x: 80, y: 80, w: 20, h: 20 });
  });

  it("returns null for a zero-area selection", () => {
    expect(computeCropRect({ x: 10, y: 10, w: 0, h: 5 }, { width: 100, height: 100 })).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to confirm failure**

Run: `npm test -- read-crop`
Expected: FAIL — cannot import `computeCropRect`.

- [ ] **Step 3: Implement**

```ts
export interface Selection { x: number; y: number; w: number; h: number; }
export interface Size { width: number; height: number; }
export interface CropRect { x: number; y: number; w: number; h: number; }

export function computeCropRect(sel: Selection, size: Size): CropRect | null {
  let x = sel.w < 0 ? sel.x + sel.w : sel.x;
  let y = sel.h < 0 ? sel.y + sel.h : sel.y;
  let w = Math.abs(sel.w);
  let h = Math.abs(sel.h);
  x = Math.max(0, Math.min(x, size.width));
  y = Math.max(0, Math.min(y, size.height));
  w = Math.min(w, size.width - x);
  h = Math.min(h, size.height - y);
  if (w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

export async function cropToBlob(
  image: CanvasImageSource,
  rect: CropRect,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = rect.w;
  canvas.height = rect.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png");
  });
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- read-crop`
Expected: PASS (3 tests). `cropToBlob` is exercised manually in Task 11, not unit-tested (no canvas in jsdom).

- [ ] **Step 5: Commit**

```bash
git add src/lib/read/crop.ts src/__tests__/lib/read-crop.test.ts
git commit -m "feat(read): image crop geometry helper"
```

---

## Task 6: Read store

**Files:**
- Create: `src/lib/stores/read-store.ts`
- Test: `src/__tests__/lib/read-store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { useReadStore } from "@/lib/stores/read-store";
import { storage } from "@/lib/db/storage";

describe("read store", () => {
  beforeEach(async () => {
    await storage.clear();
    useReadStore.setState({ records: [], loaded: false });
  });

  it("adds a record and prepends it to state", async () => {
    await useReadStore.getState().addRecord({ term: "salient", definition: "noticeable" });
    const { records, loaded } = useReadStore.getState();
    expect(records).toHaveLength(1);
    expect(records[0].term).toBe("salient");
    expect(loaded).toBe(false); // add does not flip loaded
  });

  it("loads persisted records newest-first", async () => {
    await storage.addReadRecord({ term: "a", definition: "1" });
    await storage.addReadRecord({ term: "b", definition: "2" });
    await useReadStore.getState().load();
    const { records, loaded } = useReadStore.getState();
    expect(loaded).toBe(true);
    expect(records.map((r) => r.term)).toEqual(["b", "a"]);
  });

  it("updates and deletes records in state and storage", async () => {
    await useReadStore.getState().addRecord({ term: "x", definition: "y" });
    const id = useReadStore.getState().records[0].id;
    await useReadStore.getState().updateRecord(id, { definition: "updated" });
    expect(useReadStore.getState().records[0].definition).toBe("updated");
    await useReadStore.getState().deleteRecord(id);
    expect(useReadStore.getState().records).toHaveLength(0);
    expect(await storage.getReadRecords()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run it to confirm failure**

Run: `npm test -- read-store`
Expected: FAIL — cannot import `useReadStore`.

- [ ] **Step 3: Implement**

```ts
"use client";

import { create } from "zustand";
import { storage } from "@/lib/db/storage";
import type { NewReadRecord, Persona, ReadRecord } from "@/lib/types";

interface ReadState {
  records: ReadRecord[];
  loaded: boolean;
  load: (persona?: Persona) => Promise<void>;
  addRecord: (input: NewReadRecord) => Promise<void>;
  updateRecord: (id: string, patch: Partial<ReadRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
}

export const useReadStore = create<ReadState>((set) => ({
  records: [],
  loaded: false,

  async load(persona) {
    const records = await storage.getReadRecords({ persona });
    set({ records, loaded: true });
  },

  async addRecord(input) {
    const record = await storage.addReadRecord(input);
    set((state) => ({ records: [record, ...state.records] }));
  },

  async updateRecord(id, patch) {
    await storage.updateReadRecord(id, patch);
    set((state) => ({
      records: state.records.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  },

  async deleteRecord(id) {
    await storage.deleteReadRecord(id);
    set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
  },
}));
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- read-store`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/read-store.ts src/__tests__/lib/read-store.test.ts
git commit -m "feat(read): zustand store for read records"
```

---

## Task 7: OCR wrapper + dependency

**Files:**
- Modify: `package.json`
- Create: `src/lib/read/ocr.ts`

- [ ] **Step 1: Add the dependency**

Run: `npm install tesseract.js`
Expected: `tesseract.js` appears under `dependencies` in `package.json`; lockfile updates.

- [ ] **Step 2: Implement the wrapper (lazy import)**

```ts
export async function recognizeText(image: Blob): Promise<string> {
  const { recognize } = await import("tesseract.js");
  const { data } = await recognize(image, "eng");
  return data.text.replace(/\s+/g, " ").trim();
}
```

The dynamic `import("tesseract.js")` keeps the ~2-4MB engine out of the initial bundle; it downloads on first scan only.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (No unit test — Tesseract is integration-heavy; it is mocked at the component boundary and exercised manually in Task 11.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/read/ocr.ts
git commit -m "feat(read): lazy-loaded Tesseract.js OCR wrapper"
```

---

## Task 8: Record card + record form

**Files:**
- Create: `src/components/read/record-card.tsx`
- Create: `src/components/read/read-record-form.tsx`

- [ ] **Step 1: Implement `record-card.tsx`**

```tsx
"use client";

import type { ReadRecord } from "@/lib/types";

interface RecordCardProps {
  record: ReadRecord;
  onDelete: (id: string) => void;
}

export function RecordCard({ record, onDelete }: RecordCardProps) {
  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-secondary)]/60 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{record.term}</h3>
        <div className="flex items-center gap-2">
          {record.partOfSpeech ? (
            <span className="text-xs italic text-[var(--text-secondary)]">{record.partOfSpeech}</span>
          ) : null}
          <button
            type="button"
            onClick={() => onDelete(record.id)}
            aria-label={`Delete ${record.term}`}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            ✕
          </button>
        </div>
      </div>
      {record.phonetic ? (
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{record.phonetic}</p>
      ) : null}
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{record.definition}</p>
      {record.example ? (
        <p className="mt-2 text-xs italic text-[var(--text-secondary)]">“{record.example}”</p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Implement `read-record-form.tsx`**

This confirms/edits the prefilled term + definition and is also the manual-entry fallback. Save is disabled until both `term` and `definition` are non-empty.

```tsx
"use client";

import { useState } from "react";
import type { DefinitionResult, NewReadRecord } from "@/lib/types";

interface ReadRecordFormProps {
  initial: Partial<DefinitionResult>;
  notice?: string | null;
  onSave: (input: NewReadRecord) => void;
  onCancel: () => void;
}

export function ReadRecordForm({ initial, notice, onSave, onCancel }: ReadRecordFormProps) {
  const [term, setTerm] = useState(initial.term ?? "");
  const [definition, setDefinition] = useState(initial.definition ?? "");
  const canSave = term.trim().length > 0 && definition.trim().length > 0;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSave) return;
        onSave({
          term: term.trim(),
          definition: definition.trim(),
          partOfSpeech: initial.partOfSpeech,
          phonetic: initial.phonetic,
          example: initial.example,
        });
      }}
    >
      {notice ? <p className="text-xs text-[var(--text-secondary)]">{notice}</p> : null}
      <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
        Term
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
          autoFocus
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
        Definition
        <textarea
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          rows={3}
          className="rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
        />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-[var(--text-secondary)]">
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSave}
          className="rounded-lg bg-[var(--accent-solid)] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/read/record-card.tsx src/components/read/read-record-form.tsx
git commit -m "feat(read): record card and definition form"
```

---

## Task 9: Highlight canvas + scan flow

**Files:**
- Create: `src/components/read/highlight-canvas.tsx`
- Create: `src/components/read/scan-flow.tsx`

- [ ] **Step 1: Implement `highlight-canvas.tsx`**

Renders the image and lets the user drag one selection box (pointer events). Reports the box in natural-image-pixel coordinates via `onSelect`. Uses `computeCropRect` to normalise.

```tsx
"use client";

import { useRef, useState } from "react";
import { computeCropRect, type CropRect, type Selection } from "@/lib/read/crop";

interface HighlightCanvasProps {
  src: string;
  onSelect: (rect: CropRect, image: HTMLImageElement) => void;
}

export function HighlightCanvas({ src, onSelect }: HighlightCanvasProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [drag, setDrag] = useState<Selection | null>(null);

  function toImageCoords(clientX: number, clientY: number) {
    const img = imgRef.current!;
    const box = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / box.width;
    const scaleY = img.naturalHeight / box.height;
    return { x: (clientX - box.left) * scaleX, y: (clientY - box.top) * scaleY };
  }

  return (
    <div className="relative touch-none select-none">
      <img
        ref={imgRef}
        src={src}
        alt="Captured page"
        className="w-full rounded-lg"
        draggable={false}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          const p = toImageCoords(e.clientX, e.clientY);
          setDrag({ x: p.x, y: p.y, w: 0, h: 0 });
        }}
        onPointerMove={(e) => {
          if (!drag) return;
          const p = toImageCoords(e.clientX, e.clientY);
          setDrag({ ...drag, w: p.x - drag.x, h: p.y - drag.y });
        }}
        onPointerUp={() => {
          if (!drag || !imgRef.current) return;
          const rect = computeCropRect(drag, {
            width: imgRef.current.naturalWidth,
            height: imgRef.current.naturalHeight,
          });
          setDrag(null);
          if (rect) onSelect(rect, imgRef.current);
        }}
      />
      {drag ? <SelectionOverlay drag={drag} img={imgRef.current} /> : null}
    </div>
  );
}

function SelectionOverlay({ drag, img }: { drag: Selection; img: HTMLImageElement | null }) {
  if (!img) return null;
  const box = img.getBoundingClientRect();
  const scaleX = box.width / img.naturalWidth;
  const scaleY = box.height / img.naturalHeight;
  const left = (drag.w < 0 ? drag.x + drag.w : drag.x) * scaleX;
  const top = (drag.h < 0 ? drag.y + drag.h : drag.y) * scaleY;
  return (
    <div
      className="pointer-events-none absolute border-2 border-[var(--accent-solid)] bg-[var(--accent-solid)]/15"
      style={{ left, top, width: Math.abs(drag.w) * scaleX, height: Math.abs(drag.h) * scaleY }}
    />
  );
}
```

- [ ] **Step 2: Implement `scan-flow.tsx`**

Drives the steps; holds the transient object URL in local state and revokes it on close. Orchestrates crop → OCR → dictionary → form.

```tsx
"use client";

import { useEffect, useState } from "react";
import { cropToBlob, type CropRect } from "@/lib/read/crop";
import { lookupDefinition } from "@/lib/read/dictionary";
import { recognizeText } from "@/lib/read/ocr";
import type { DefinitionResult, NewReadRecord } from "@/lib/types";
import { HighlightCanvas } from "./highlight-canvas";
import { ReadRecordForm } from "./read-record-form";

type Stage = "capture" | "highlight" | "working" | "form";

interface ScanFlowProps {
  onSave: (input: NewReadRecord) => Promise<void>;
  onClose: () => void;
}

export function ScanFlow({ onSave, onClose }: ScanFlowProps) {
  const [stage, setStage] = useState<Stage>("capture");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [initial, setInitial] = useState<Partial<DefinitionResult>>({});
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  async function handleSelect(rect: CropRect, image: HTMLImageElement) {
    setStage("working");
    setNotice(null);
    try {
      const blob = await cropToBlob(image, rect);
      const text = await recognizeText(blob);
      if (!text) {
        setInitial({});
        setNotice("Couldn’t read that — type the word and its meaning.");
        setStage("form");
        return;
      }
      const result = await lookupDefinition(text);
      if (result) {
        setInitial(result);
      } else {
        setInitial({ term: text });
        setNotice("No definition found — add your own.");
      }
      setStage("form");
    } catch {
      setInitial({});
      setNotice("Something went wrong reading the image — enter the word manually.");
      setStage("form");
    }
  }

  return (
    <div className="flex min-h-[400px] items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-primary)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Scan a word</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[var(--text-secondary)]">✕</button>
        </div>

        {stage === "capture" ? (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--surface-border)] p-8 text-center text-sm text-[var(--text-secondary)]">
            <span className="text-2xl">📷</span>
            Take a photo or choose an image
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImageUrl(URL.createObjectURL(file));
                setStage("highlight");
              }}
            />
          </label>
        ) : null}

        {stage === "highlight" && imageUrl ? (
          <>
            <p className="mb-2 text-xs text-[var(--text-secondary)]">Drag a box over the word.</p>
            <HighlightCanvas src={imageUrl} onSelect={handleSelect} />
          </>
        ) : null}

        {stage === "working" ? (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">Reading…</p>
        ) : null}

        {stage === "form" ? (
          <ReadRecordForm
            initial={initial}
            notice={notice}
            onCancel={onClose}
            onSave={async (input) => {
              await onSave(input);
              onClose();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/read/highlight-canvas.tsx src/components/read/scan-flow.tsx
git commit -m "feat(read): highlight canvas and scan flow"
```

---

## Task 10: Read page, route, and nav

**Files:**
- Create: `src/components/read/read-page.tsx`
- Create: `src/app/read/page.tsx`
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/bottom-nav.tsx`

- [ ] **Step 1: Implement `read-page.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useReadStore } from "@/lib/stores/read-store";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { RecordCard } from "./record-card";
import { ScanFlow } from "./scan-flow";

export function ReadPage() {
  const { records, loaded, load, addRecord, deleteRecord } = useReadStore();
  const activePersona = usePersonaStore((s) => s.activePersona);
  const [scanning, setScanning] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    load(activePersona);
  }, [load, activePersona]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) => r.term.toLowerCase().includes(q) || r.definition.toLowerCase().includes(q),
    );
  }, [records, query]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 pb-28 md:pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Read</h1>
        <span className="text-sm text-[var(--text-secondary)]">{records.length} words</span>
      </div>

      <button
        type="button"
        onClick={() => setScanning(true)}
        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-solid)] px-4 py-3 text-sm font-medium text-white"
      >
        📷 Scan a word
      </button>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search words"
        className="rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
      />

      {loaded && filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--text-secondary)]">
          {records.length === 0 ? "No words yet. Scan one to start." : "No matches."}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {filtered.map((record) => (
          <RecordCard key={record.id} record={record} onDelete={deleteRecord} />
        ))}
      </div>

      {scanning ? (
        <ScanFlow onClose={() => setScanning(false)} onSave={(input) => addRecord(input)} />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Implement the route**

`src/app/read/page.tsx`:

```tsx
import { ReadPage } from "@/components/read/read-page";

export default function ReadRoutePage() {
  return <ReadPage />;
}
```

- [ ] **Step 3: Add nav items**

In `src/components/layout/sidebar.tsx`, add to `navItems` (after the `records` entry):

```ts
  { href: "/read", icon: "◫", label: "Read" },
```

In `src/components/layout/bottom-nav.tsx`, add to `navItems`:

```ts
  { href: "/read", label: "Read" },
```

- [ ] **Step 4: Typecheck + lint + full test run**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: PASS across the board.

- [ ] **Step 5: Commit**

```bash
git add src/components/read/read-page.tsx src/app/read/page.tsx src/components/layout/sidebar.tsx src/components/layout/bottom-nav.tsx
git commit -m "feat(read): read page, route, and navigation"
```

---

## Task 11: Manual verification

**Files:** none (manual).

- [ ] **Step 1: Run the dev server**

Run: `npm run dev`
Open the app, switch to a persona, click the "Read" nav item. Expected: empty Read section with a "Scan a word" button.

- [ ] **Step 2: Full happy path**

Click "Scan a word" → take/choose a photo of clear printed text → drag a box over one word. Expected: "Reading…", then the form prefilled with the term + a dictionary definition. Save. Expected: record appears in the list; "N words" count increments.

- [ ] **Step 3: OCR-miss / dictionary-miss fallbacks**

Box an unreadable or made-up word. Expected: form opens with the notice text and an editable term/definition; you can type a definition and save.

- [ ] **Step 4: Persistence + persona scoping**

Reload the page — records persist. Switch persona — the list changes to that persona's records (separate database).

- [ ] **Step 5: Search + delete**

Type in the search box — list filters by term/definition. Delete a record via the ✕ — it disappears and stays gone after reload.

- [ ] **Step 6: Confirm no image leaks**

In DevTools → Application → IndexedDB, confirm `readRecords` rows contain only text fields (no blobs), and no orphan object URLs remain (the flow revokes them on close).

---

## Self-review notes

- **Spec coverage:** route+nav (T10), data model (T1), persistence (T2/T3), cloud sync via snapshot (T3), store (T6), crop/OCR/dictionary lib (T4/T5/T7), components incl. manual fallback (T8/T9), error handling paths (T9 `handleSelect`), testing (T3/T4/T5/T6 + manual T11). No image persistence anywhere. Tags field present, no organise UI (deferred, per spec).
- **Deviation from spec:** spec said "syncs like every other store"; implemented as snapshot-level sync (export/import) rather than the bespoke per-table Supabase sync used only by gates/records. This is the cheap, correct path and matches how non-gates/records data is stored. Flagged to user.
- **Type consistency:** `NewReadRecord`, `ReadRecord`, `DefinitionResult`, `CropRect`, `Selection`, `computeCropRect`, `cropToBlob`, `recognizeText`, `lookupDefinition`, `useReadStore` names are used identically across all tasks.
- **Pinned for later:** AI definition fallback (interface ready via `DefinitionProvider`); OCR engine alternatives; organise/tag UI.
