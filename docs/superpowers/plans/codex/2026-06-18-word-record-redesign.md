# Word Record Redesign + Word Detail Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Read ledger from a table to dictionary-style entries and add a `/word/[id]` detail page where users pick one definition, toggle up to 2 synonyms, and write their own definition.

**Architecture:** Extend `ReadRecord` with 4 new fields (`myDefinition`, `synonyms`, `allDefinitions`, `allSynonyms`), bump the Dexie schema to version 10 with a migration, update the dictionary parser to return all definitions/synonyms, rebuild the ledger as a list, and add a new Word route + component. The Word page reads from the Zustand store and writes back via `updateRecord` — no duplicate records are created.

**Tech Stack:** Next.js 16 (App Router, `params` is a `Promise`), Zustand, Dexie (IndexedDB), dictionaryapi.dev, Vitest + React Testing Library

---

## File Map

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add 4 fields to `ReadRecord` |
| `src/lib/read/dictionary.ts` | Extend `ReadDefinition` + parsers to return `allDefinitions`/`allSynonyms` |
| `src/lib/db/database.ts` | Add Dexie version 10 migration |
| `src/lib/db/storage.ts` | Update `createReadRecord` + `updateReadRecord` input types |
| `src/lib/stores/read-store.ts` | Update `ReadRecordInput` + `updateRecord` allowed fields |
| `src/components/read/read-record-list.tsx` | Rebuild as dictionary-entry list, remove inline edit |
| `src/components/read/read-page.tsx` | Pass new fields on save, remove `onUpdate` prop usage |
| `src/components/word/word-page.tsx` | New — Word detail component |
| `src/app/word/[id]/page.tsx` | New — thin server component, awaits params |
| `src/__tests__/lib/read-parsers.test.ts` | Add tests for `allDefinitions`/`allSynonyms` extraction |
| `src/__tests__/lib/read-store.test.ts` | Add tests for new fields |
| `src/__tests__/components/read-page.test.tsx` | Update to match new ledger (no table/columnheader) |
| `src/__tests__/components/word-page.test.tsx` | New — Word page tests |

---

## Task 1: Extend the dictionary parser

**Files:**
- Modify: `src/lib/read/dictionary.ts`
- Modify: `src/__tests__/lib/read-parsers.test.ts`

- [ ] **Step 1: Write failing tests for new parser output**

In `src/__tests__/lib/read-parsers.test.ts`, add inside the `describe("Read parsers")` block:

```ts
it("extracts all definitions and synonyms from a dictionary payload", () => {
  const payload = [
    {
      word: "ephemeral",
      meanings: [
        {
          partOfSpeech: "adjective",
          synonyms: ["fleeting", "transient"],
          definitions: [
            {
              definition: "Lasting for a very short time.",
              example: "fashions are ephemeral",
              synonyms: ["momentary"],
            },
            {
              definition: "Denoting a plant with a very short life cycle.",
              synonyms: [],
            },
          ],
        },
        {
          partOfSpeech: "noun",
          synonyms: [],
          definitions: [
            { definition: "An ephemeral plant.", synonyms: [] },
          ],
        },
      ],
    },
  ];

  const result = parseDictionaryDefinition(payload, "ephemeral");

  expect(result).not.toBeNull();
  expect(result!.word).toBe("ephemeral");
  expect(result!.definition).toBe("Lasting for a very short time.");
  expect(result!.partOfSpeech).toBe("adjective");
  expect(result!.allDefinitions).toEqual([
    { partOfSpeech: "adjective", definition: "Lasting for a very short time.", example: "fashions are ephemeral" },
    { partOfSpeech: "adjective", definition: "Denoting a plant with a very short life cycle." },
    { partOfSpeech: "noun", definition: "An ephemeral plant." },
  ]);
  // deduped: meaning-level + definition-level synonyms, no duplicates
  expect(result!.allSynonyms).toEqual(["fleeting", "transient", "momentary"]);
});

it("returns empty allDefinitions and allSynonyms when no payload match", () => {
  const result = parseDictionaryDefinition({ title: "No Definitions Found" }, "unknown");
  expect(result).toEqual({ word: "unknown", definition: "", partOfSpeech: "", allDefinitions: [], allSynonyms: [] });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/lib/read-parsers.test.ts
```

Expected: FAIL — `allDefinitions` and `allSynonyms` are not properties on the result.

- [ ] **Step 3: Update `ReadDefinition` interface and parsers**

Replace the contents of `src/lib/read/dictionary.ts`:

```ts
export interface DefinitionEntry {
  partOfSpeech: string;
  definition: string;
  example?: string;
}

export interface ReadDefinition {
  word: string;
  definition: string;
  partOfSpeech: string;
  allDefinitions: DefinitionEntry[];
  allSynonyms: string[];
}

interface DictionaryDefinition {
  definition?: unknown;
  example?: unknown;
  synonyms?: unknown;
}

interface DictionaryMeaning {
  partOfSpeech?: unknown;
  definitions?: unknown;
  synonyms?: unknown;
}

interface DictionaryEntry {
  word?: unknown;
  meanings?: unknown;
}

function normalizeLookupWord(word: string) {
  return word.toLowerCase().replace(/[^a-z0-9'-]/g, "").trim();
}

function cleanWiktionaryText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/\s*\.[a-z][\w-]*\s*\{[^}]*\}/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function parseDictionaryDefinition(payload: unknown, resolvedWord: string): ReadDefinition {
  const empty: ReadDefinition = { word: resolvedWord, definition: "", partOfSpeech: "", allDefinitions: [], allSynonyms: [] };

  if (!Array.isArray(payload)) return empty;

  const allDefinitions: DefinitionEntry[] = [];
  const synSet = new Set<string>();
  let firstWord = resolvedWord;
  let firstDef = "";
  let firstPos = "";

  for (const entry of payload as DictionaryEntry[]) {
    const word = typeof entry.word === "string" && entry.word.trim() ? entry.word.trim() : resolvedWord;
    if (!firstWord || firstWord === resolvedWord) firstWord = word;

    const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];
    for (const meaning of meanings as DictionaryMeaning[]) {
      const pos = typeof meaning.partOfSpeech === "string" ? meaning.partOfSpeech.trim() : "";

      // meaning-level synonyms
      if (Array.isArray(meaning.synonyms)) {
        for (const s of meaning.synonyms as unknown[]) {
          if (typeof s === "string" && s.trim()) synSet.add(s.trim());
        }
      }

      const defs = Array.isArray(meaning.definitions) ? meaning.definitions : [];
      for (const def of defs as DictionaryDefinition[]) {
        const text = typeof def.definition === "string" ? def.definition.trim() : "";
        if (!text) continue;

        const example = typeof def.example === "string" && def.example.trim() ? def.example.trim() : undefined;
        const entry: DefinitionEntry = example ? { partOfSpeech: pos, definition: text, example } : { partOfSpeech: pos, definition: text };
        allDefinitions.push(entry);

        if (!firstDef) { firstDef = text; firstPos = pos; }

        // definition-level synonyms
        if (Array.isArray(def.synonyms)) {
          for (const s of def.synonyms as unknown[]) {
            if (typeof s === "string" && s.trim()) synSet.add(s.trim());
          }
        }
      }
    }
  }

  return {
    word: firstWord,
    definition: firstDef,
    partOfSpeech: firstPos,
    allDefinitions,
    allSynonyms: Array.from(synSet),
  };
}

export function parseWiktionaryDefinition(payload: unknown, resolvedWord: string): ReadDefinition | null {
  if (!payload || typeof payload !== "object") return null;

  for (const section of Object.values(payload as Record<string, unknown>)) {
    if (!Array.isArray(section)) continue;
    for (const entry of section as Array<{ partOfSpeech?: unknown; definitions?: unknown }>) {
      const pos = typeof entry.partOfSpeech === "string" ? entry.partOfSpeech.trim() : "";
      const defs = Array.isArray(entry.definitions) ? entry.definitions : [];
      for (const def of defs as Array<{ definition?: unknown }>) {
        const raw = typeof def.definition === "string" ? def.definition : "";
        const text = cleanWiktionaryText(raw);
        if (text) return { word: resolvedWord, definition: text, partOfSpeech: pos, allDefinitions: [], allSynonyms: [] };
      }
    }
  }

  return null;
}

export async function fetchDictionaryDefinition(word: string): Promise<ReadDefinition> {
  const normalizedWord = normalizeLookupWord(word);
  if (!normalizedWord) return { word, definition: "", partOfSpeech: "", allDefinitions: [], allSynonyms: [] };

  const primary = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`,
  );

  if (primary.ok) {
    const result = parseDictionaryDefinition(await primary.json(), normalizedWord);
    if (result.definition) return result;
  }

  try {
    const fallback = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(normalizedWord)}`,
    );
    if (fallback.ok) {
      const result = parseWiktionaryDefinition(await fallback.json(), normalizedWord);
      if (result) return result;
    }
  } catch {
    // Wiktionary unavailable
  }

  return { word: normalizedWord, definition: "", partOfSpeech: "", allDefinitions: [], allSynonyms: [] };
}
```

- [ ] **Step 4: Fix existing parser test that had arguments reversed**

The existing test `"extracts the first dictionary definition"` passes args in the wrong order (`word, payload` instead of `payload, word`). Also update `"returns an editable blank definition"` to match the new return type. Replace those two `it` blocks:

```ts
it("extracts the first dictionary definition", () => {
  const payload = [
    {
      word: "harvest",
      meanings: [
        {
          partOfSpeech: "noun",
          synonyms: [],
          definitions: [{ definition: "The process of gathering a crop.", synonyms: [] }],
        },
      ],
    },
  ];
  const result = parseDictionaryDefinition(payload, "harvest");
  expect(result.word).toBe("harvest");
  expect(result.definition).toBe("The process of gathering a crop.");
  expect(result.partOfSpeech).toBe("noun");
  expect(result.allDefinitions).toEqual([{ partOfSpeech: "noun", definition: "The process of gathering a crop." }]);
  expect(result.allSynonyms).toEqual([]);
});

it("returns an editable blank definition when dictionary has no match", () => {
  const result = parseDictionaryDefinition({ title: "No Definitions Found" }, "unknown");
  expect(result).toEqual({ word: "unknown", definition: "", partOfSpeech: "", allDefinitions: [], allSynonyms: [] });
});
```

- [ ] **Step 5: Run all parser tests and verify they pass**

```bash
npx vitest run src/__tests__/lib/read-parsers.test.ts
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/read/dictionary.ts src/__tests__/lib/read-parsers.test.ts
git commit -m "feat: extend dictionary parser to return allDefinitions and allSynonyms"
```

---

## Task 2: Extend `ReadRecord` type + Dexie migration

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/db/database.ts`
- Modify: `src/lib/db/storage.ts`

- [ ] **Step 1: Add 4 fields to `ReadRecord` in `src/lib/types.ts`**

Find the `ReadRecord` interface (currently at line 141) and replace it:

```ts
export interface ReadRecord {
  id: string;
  word: string;
  definition: string;
  partOfSpeech: string;
  myDefinition: string;
  synonyms: string[];
  allDefinitions: Array<{ partOfSpeech: string; definition: string; example?: string }>;
  allSynonyms: string[];
  sourceType: ReadSourceType;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Add Dexie version 10 migration in `src/lib/db/database.ts`**

After the closing `});` of `.version(9)`, append:

```ts
    this.version(10)
      .stores({
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
      })
      .upgrade(async (tx) => {
        await tx.table("readRecords").toCollection().modify((r: Partial<ReadRecord>) => {
          r.myDefinition ??= "";
          r.synonyms ??= [];
          r.allDefinitions ??= [];
          r.allSynonyms ??= [];
        });
      });
```

Also add `ReadRecord` to the import at the top of `database.ts` if it isn't already there (it already is — check line 12).

- [ ] **Step 3: Update `createReadRecord` in `src/lib/db/storage.ts`**

Replace the `createReadRecord` input type and body:

```ts
async createReadRecord(input: {
  word: string;
  definition: string;
  partOfSpeech: string;
  myDefinition: string;
  synonyms: string[];
  allDefinitions: Array<{ partOfSpeech: string; definition: string; example?: string }>;
  allSynonyms: string[];
  sourceType: ReadSourceType;
}): Promise<ReadRecord> {
  const db = getDb();
  const timestamp = nowISO();
  const record: ReadRecord = {
    id: generateId(),
    word: input.word.trim(),
    definition: input.definition.trim(),
    partOfSpeech: input.partOfSpeech.trim(),
    myDefinition: input.myDefinition,
    synonyms: input.synonyms.slice(0, 2),
    allDefinitions: input.allDefinitions,
    allSynonyms: input.allSynonyms,
    sourceType: input.sourceType,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.readRecords.add(record);
  return record;
},
```

- [ ] **Step 4: Update `updateReadRecord` in `src/lib/db/storage.ts`**

Replace the `updateReadRecord` method:

```ts
async updateReadRecord(
  id: string,
  updates: Partial<Pick<ReadRecord, "word" | "definition" | "partOfSpeech" | "sourceType" | "myDefinition" | "synonyms">>,
): Promise<void> {
  const db = getDb();
  if (updates.synonyms) updates.synonyms = updates.synonyms.slice(0, 2);
  await db.readRecords.update(id, {
    ...updates,
    updatedAt: nowISO(),
  });
},
```

- [ ] **Step 5: Check TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `ReadRecord`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/db/database.ts src/lib/db/storage.ts
git commit -m "feat: extend ReadRecord with myDefinition, synonyms, allDefinitions, allSynonyms + Dexie v10 migration"
```

---

## Task 3: Update read store

**Files:**
- Modify: `src/lib/stores/read-store.ts`
- Modify: `src/__tests__/lib/read-store.test.ts`

- [ ] **Step 1: Write failing test for new fields**

Add to `src/__tests__/lib/read-store.test.ts` inside `describe("read store")`:

```ts
it("stores and loads myDefinition, synonyms, allDefinitions, allSynonyms", async () => {
  await useReadStore.getState().createRecords([
    {
      word: "ephemeral",
      definition: "Lasting for a very short time.",
      partOfSpeech: "adjective",
      myDefinition: "things that don't last long, like a vibe",
      synonyms: ["fleeting", "transient"],
      allDefinitions: [
        { partOfSpeech: "adjective", definition: "Lasting for a very short time.", example: "fashions are ephemeral" },
      ],
      allSynonyms: ["fleeting", "transient", "momentary"],
      sourceType: "book",
    },
  ]);

  const record = useReadStore.getState().records[0];
  expect(record.myDefinition).toBe("things that don't last long, like a vibe");
  expect(record.synonyms).toEqual(["fleeting", "transient"]);
  expect(record.allDefinitions).toEqual([
    { partOfSpeech: "adjective", definition: "Lasting for a very short time.", example: "fashions are ephemeral" },
  ]);
  expect(record.allSynonyms).toEqual(["fleeting", "transient", "momentary"]);
});

it("enforces max 2 synonyms on create", async () => {
  await useReadStore.getState().createRecords([
    {
      word: "verbose",
      definition: "Using more words than needed.",
      partOfSpeech: "adjective",
      myDefinition: "",
      synonyms: ["wordy", "long-winded", "prolix"],
      allDefinitions: [],
      allSynonyms: [],
      sourceType: "book",
    },
  ]);

  expect(useReadStore.getState().records[0].synonyms).toHaveLength(2);
});

it("updates myDefinition and synonyms via updateRecord", async () => {
  await useReadStore.getState().createRecords([
    {
      word: "lucid",
      definition: "Expressed clearly.",
      partOfSpeech: "adjective",
      myDefinition: "",
      synonyms: [],
      allDefinitions: [],
      allSynonyms: [],
      sourceType: "book",
    },
  ]);

  const id = useReadStore.getState().records[0].id;
  await useReadStore.getState().updateRecord(id, {
    myDefinition: "super clear",
    synonyms: ["clear", "coherent"],
  });

  const updated = useReadStore.getState().records.find((r) => r.id === id);
  expect(updated?.myDefinition).toBe("super clear");
  expect(updated?.synonyms).toEqual(["clear", "coherent"]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/lib/read-store.test.ts
```

Expected: FAIL — `ReadRecordInput` missing the new fields.

- [ ] **Step 3: Update `ReadRecordInput` and store methods in `src/lib/stores/read-store.ts`**

Replace the file content:

```ts
"use client";

import { create } from "zustand";
import { storage } from "@/lib/db/storage";
import { usePersonaStore } from "@/lib/stores/persona-store";
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

export const useReadStore = create<ReadState>((set) => ({
  records: [],
  loaded: false,

  async load(persona) {
    if (persona && usePersonaStore.getState().activePersona !== persona) {
      return;
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
  },

  async updateRecord(id, updates) {
    await storage.updateReadRecord(id, updates);
    set((state) => ({
      records: state.records.map((record) =>
        record.id === id
          ? { ...record, ...updates, updatedAt: new Date().toISOString() }
          : record,
      ),
    }));
  },

  async deleteRecord(id) {
    await storage.deleteReadRecord(id);
    set((state) => ({ records: state.records.filter((record) => record.id !== id) }));
  },
}));
```

- [ ] **Step 4: Run store tests**

```bash
npx vitest run src/__tests__/lib/read-store.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/read-store.ts src/__tests__/lib/read-store.test.ts
git commit -m "feat: update read store to handle new ReadRecord fields"
```

---

## Task 4: Update ReadPage to pass new fields on save

**Files:**
- Modify: `src/components/read/read-page.tsx`

The two save paths (`saveSelectedWords` from OCR and `handleTextSearch`) must now pass the new fields. The `onUpdate` prop passed to `ReadRecordList` is also removed since inline editing is gone.

- [ ] **Step 1: Update `SelectedWord` interface**

In `read-page.tsx`, find the `interface SelectedWord` block and add three fields:

```ts
interface SelectedWord {
  boxId: string;
  word: string;
  definition: string;
  partOfSpeech: string;
  myDefinition: string;
  synonyms: string[];
  allDefinitions: Array<{ partOfSpeech: string; definition: string; example?: string }>;
  allSynonyms: string[];
  loading: boolean;
}
```

- [ ] **Step 2: Update `selectWord` to store new fields from dictionary result**

Find `selectWord` and update the two `setSelectedWords` calls within it:

```ts
async function selectWord(box: OcrWordBox) {
  if (selectedBoxIds.has(box.id)) {
    setSelectedWords((items) => items.filter((item) => item.boxId !== box.id));
    return;
  }
  const cleanWord = cleanReadWord(box.text);
  if (!cleanWord) return;
  setSelectedWords((items) => [
    ...items,
    { boxId: box.id, word: cleanWord, definition: "", partOfSpeech: "", myDefinition: "", synonyms: [], allDefinitions: [], allSynonyms: [], loading: true },
  ]);
  const result = await fetchDictionaryDefinition(cleanWord);
  setSelectedWords((items) =>
    items.map((item) =>
      item.boxId === box.id
        ? {
            ...item,
            word: result.word || cleanWord,
            definition: result.definition,
            partOfSpeech: result.partOfSpeech,
            allDefinitions: result.allDefinitions,
            allSynonyms: result.allSynonyms,
            loading: false,
          }
        : item,
    ),
  );
}
```

- [ ] **Step 3: Update `saveSelectedWords` to pass new fields**

```ts
const saveSelectedWords = useCallback(async () => {
  const readyWords = selectedWords.filter((w) => w.word.trim() && !w.loading);
  if (readyWords.length === 0) return;
  setSaving(true);
  try {
    await createRecords(
      readyWords.map((w) => ({
        word: w.word,
        definition: w.definition,
        partOfSpeech: w.partOfSpeech,
        myDefinition: w.myDefinition,
        synonyms: w.synonyms,
        allDefinitions: w.allDefinitions,
        allSynonyms: w.allSynonyms,
        sourceType,
      })),
    );
    setSelectedWords([]);
    showFlash(`${readyWords.length} word${readyWords.length === 1 ? "" : "s"} saved`);
  } finally {
    setSaving(false);
  }
}, [selectedWords, sourceType, createRecords]);
```

- [ ] **Step 4: Update `handleTextSearch` to pass new fields**

```ts
async function handleTextSearch() {
  const word = textInput.trim();
  if (!word || searching) return;

  const existing = records.find((r) => r.word.toLowerCase() === word.toLowerCase());
  if (existing) {
    showFlash(`"${existing.word}" already in ledger`);
    setTextInput("");
    return;
  }

  setSearching(true);
  setTextInput("");
  const result = await fetchDictionaryDefinition(word);
  await createRecords([{
    word: result.word || word,
    definition: result.definition,
    partOfSpeech: result.partOfSpeech,
    myDefinition: "",
    synonyms: [],
    allDefinitions: result.allDefinitions,
    allSynonyms: result.allSynonyms,
    sourceType,
  }]);
  showFlash(result.definition ? `"${result.word || word}" saved` : `"${result.word || word}" saved — no definition`);
  setSearching(false);
}
```

- [ ] **Step 5: Remove `updateRecord` and `onUpdate` from ReadPage**

In `ReadPage`:

1. Remove the line `const updateRecord = useReadStore((state) => state.updateRecord);`
2. In `<ReadRecordList>`, remove the `onUpdate` prop: change to `<ReadRecordList records={filteredRecords} onDelete={(id) => void deleteRecord(id)} />`

- [ ] **Step 6: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/read/read-page.tsx
git commit -m "feat: pass allDefinitions and allSynonyms through on word save"
```

---

## Task 5: Rebuild ReadRecordList as dictionary entries

**Files:**
- Modify: `src/components/read/read-record-list.tsx`
- Modify: `src/__tests__/components/read-page.test.tsx`

- [ ] **Step 1: Update the read-page test to match new ledger structure**

The existing test checks for `getByRole("columnheader", { name: "Word" })` which will no longer exist. Update `src/__tests__/components/read-page.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ReadPage } from "@/components/read/read-page";
import { getDb } from "@/lib/db/database";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useReadStore } from "@/lib/stores/read-store";

describe("ReadPage", () => {
  beforeEach(async () => {
    await getDb("mani").readRecords.clear();
    usePersonaStore.setState({ activePersona: "mani" });
    useReadStore.setState({ records: [], loaded: false });
  });

  it("renders capture controls and empty record state", async () => {
    render(<ReadPage />);

    expect(screen.getByRole("heading", { name: "Read" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Look up a word and save it directly")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("No saved words")).toBeInTheDocument());
  });

  it("renders saved word with delete button always visible", async () => {
    await getDb("mani").readRecords.add({
      id: "read-1",
      word: "cadence",
      definition: "A rhythm or sequence of sounds.",
      partOfSpeech: "noun",
      myDefinition: "",
      synonyms: [],
      allDefinitions: [],
      allSynonyms: [],
      sourceType: "book",
      createdAt: "2026-06-13T10:00:00.000Z",
      updatedAt: "2026-06-13T10:00:00.000Z",
    });

    render(<ReadPage />);

    await waitFor(() => expect(screen.getByText("cadence")).toBeInTheDocument());
    expect(screen.getByText("A rhythm or sequence of sounds.")).toBeInTheDocument();
    // delete button always visible — not gated on hover
    expect(screen.getByRole("button", { name: "Delete cadence" })).toBeInTheDocument();
    // no table
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders myDefinition above actual definition when set", async () => {
    await getDb("mani").readRecords.add({
      id: "read-2",
      word: "ephemeral",
      definition: "Lasting for a very short time.",
      partOfSpeech: "adjective",
      myDefinition: "things that don't last long, like a vibe",
      synonyms: ["fleeting", "transient"],
      allDefinitions: [],
      allSynonyms: [],
      sourceType: "book",
      createdAt: "2026-06-13T10:00:00.000Z",
      updatedAt: "2026-06-13T10:00:00.000Z",
    });

    render(<ReadPage />);

    await waitFor(() => expect(screen.getByText("ephemeral")).toBeInTheDocument());
    expect(screen.getByText("things that don't last long, like a vibe")).toBeInTheDocument();
    expect(screen.getByText("fleeting")).toBeInTheDocument();
    expect(screen.getByText("transient")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/components/read-page.test.tsx
```

Expected: FAIL — table still exists, new assertions not met.

- [ ] **Step 3: Replace `read-record-list.tsx` with dictionary-entry layout**

Replace the entire file content:

```tsx
"use client";

import Link from "next/link";
import type { ReadRecord } from "@/lib/types";

interface ReadRecordListProps {
  records: ReadRecord[];
  onDelete: (id: string) => void;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date(value));
}

function groupRecords(records: ReadRecord[]) {
  const groups = new Map<string, ReadRecord[]>();
  for (const record of records) {
    const key = record.createdAt.slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return Array.from(groups.entries());
}

function RecordEntry({ record, onDelete }: { record: ReadRecord; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--surface-border)] px-5 py-4 last:border-b-0">
      <div className="min-w-0 flex-1">
        {/* Line 1: word + pos + source + time */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Link
            href={`/word/${record.id}`}
            className="font-[family-name:var(--font-display)] text-base font-bold tracking-tight text-[var(--text-primary)] hover:text-[var(--accent-soft)] transition-colors"
          >
            {record.word}
          </Link>
          {record.partOfSpeech && (
            <span className="font-mono text-[0.65rem] italic text-[var(--text-secondary)]">
              {record.partOfSpeech}
            </span>
          )}
          <span className="ml-auto font-mono text-[0.6rem] tabular-nums text-[var(--text-secondary)]">
            {record.sourceType} · {formatTime(record.createdAt)}
          </span>
        </div>

        {/* Line 2: my definition (if set) */}
        {record.myDefinition && (
          <p className="mt-1 text-xs italic text-[var(--accent-soft)] leading-5">
            "{record.myDefinition}"
          </p>
        )}

        {/* Line 3: actual definition */}
        {record.definition && (
          <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">
            {record.definition}
          </p>
        )}

        {/* Line 4: synonyms (if any) */}
        {record.synonyms.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {record.synonyms.map((syn) => (
              <span
                key={syn}
                className="rounded-full border border-[var(--surface-border)] px-2 py-0.5 font-mono text-[0.6rem] text-[var(--text-secondary)]"
              >
                {syn}
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDelete(record.id)}
        aria-label={`Delete ${record.word}`}
        className="mt-0.5 shrink-0 text-base leading-none text-[var(--text-secondary)] transition-colors hover:text-red-400"
      >
        ×
      </button>
    </div>
  );
}

export function ReadRecordList({ records, onDelete }: ReadRecordListProps) {
  if (records.length === 0) {
    return (
      <div className="grid min-h-[180px] place-items-center rounded-xl border border-dashed border-[var(--surface-border)] bg-[var(--bg-panel)] p-6 text-center">
        <div>
          <p className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            No saved words
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-secondary)] opacity-60">
            Look up a word or scan a page above to start your ledger.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groupRecords(records).map(([date, items]) => (
        <div
          key={date}
          className="overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--surface-border)] bg-[var(--bg-panel-strong)] px-5 py-3">
            <p className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.16em] text-[var(--accent-soft)]">
              {formatDate(items[0].createdAt)}
            </p>
            <span className="font-mono text-[0.625rem] tabular-nums text-[var(--text-secondary)]">
              {items.length}
            </span>
          </div>

          <div>
            {items.map((record) => (
              <RecordEntry key={record.id} record={record} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/__tests__/components/read-page.test.tsx
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/read/read-record-list.tsx src/__tests__/components/read-page.test.tsx
git commit -m "feat: rebuild ReadRecordList as dictionary-entry layout"
```

---

## Task 6: Create Word detail page

**Files:**
- Create: `src/components/word/word-page.tsx`
- Create: `src/app/word/[id]/page.tsx`
- Create: `src/__tests__/components/word-page.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/components/word-page.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WordPage } from "@/components/word/word-page";
import { getDb } from "@/lib/db/database";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useReadStore } from "@/lib/stores/read-store";

const MOCK_RECORD = {
  id: "word-1",
  word: "ephemeral",
  definition: "Lasting for a very short time.",
  partOfSpeech: "adjective",
  myDefinition: "",
  synonyms: [],
  allDefinitions: [
    { partOfSpeech: "adjective", definition: "Lasting for a very short time.", example: "fashions are ephemeral" },
    { partOfSpeech: "noun", definition: "An ephemeral plant." },
  ],
  allSynonyms: ["fleeting", "transient", "momentary"],
  sourceType: "book" as const,
  createdAt: "2026-06-18T10:00:00.000Z",
  updatedAt: "2026-06-18T10:00:00.000Z",
};

describe("WordPage", () => {
  beforeEach(async () => {
    await getDb("mani").readRecords.clear();
    usePersonaStore.setState({ activePersona: "mani" });
    useReadStore.setState({ records: [], loaded: false });
  });

  it("renders word, all definitions, and all synonyms", async () => {
    await getDb("mani").readRecords.add(MOCK_RECORD);
    render(<WordPage id="word-1" />);

    await waitFor(() => expect(screen.getByText("ephemeral")).toBeInTheDocument());
    expect(screen.getByText("Lasting for a very short time.")).toBeInTheDocument();
    expect(screen.getByText("An ephemeral plant.")).toBeInTheDocument();
    expect(screen.getByText("fleeting")).toBeInTheDocument();
    expect(screen.getByText("transient")).toBeInTheDocument();
    expect(screen.getByText("momentary")).toBeInTheDocument();
  });

  it("pre-selects the current definition", async () => {
    await getDb("mani").readRecords.add(MOCK_RECORD);
    render(<WordPage id="word-1" />);

    await waitFor(() => expect(screen.getByText("Lasting for a very short time.")).toBeInTheDocument());
    const firstDef = screen.getByText("Lasting for a very short time.").closest("[data-selected]");
    expect(firstDef).toHaveAttribute("data-selected", "true");
  });

  it("blocks adding a 3rd synonym when 2 are already selected", async () => {
    await getDb("mani").readRecords.add({
      ...MOCK_RECORD,
      synonyms: ["fleeting", "transient"],
    });
    render(<WordPage id="word-1" />);

    await waitFor(() => expect(screen.getByText("fleeting")).toBeInTheDocument());

    const input = screen.getByPlaceholderText("Add your own…");
    expect(input).toBeDisabled();
  });

  it("saves updated myDefinition and synonyms back to the record", async () => {
    await getDb("mani").readRecords.add(MOCK_RECORD);
    useReadStore.setState({ records: [MOCK_RECORD], loaded: true });
    render(<WordPage id="word-1" />);

    await waitFor(() => expect(screen.getByPlaceholderText("Write your own take on this word…")).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("Write your own take on this word…"), "things that don't last");
    await userEvent.click(screen.getByText("fleeting"));

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      const saved = await getDb("mani").readRecords.get("word-1");
      expect(saved?.myDefinition).toBe("things that don't last");
      expect(saved?.synonyms).toContain("fleeting");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/components/word-page.test.tsx
```

Expected: FAIL — `WordPage` component does not exist.

- [ ] **Step 3: Create `src/components/word/word-page.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useReadStore } from "@/lib/stores/read-store";
import type { ReadRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_SYNONYMS = 2;

export function WordPage({ id }: { id: string }) {
  const router = useRouter();
  const activePersona = usePersonaStore((state) => state.activePersona);
  const records = useReadStore((state) => state.records);
  const loadRecords = useReadStore((state) => state.load);
  const updateRecord = useReadStore((state) => state.updateRecord);

  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [myDefinition, setMyDefinition] = useState("");
  const [selectedDefinition, setSelectedDefinition] = useState("");
  const [selectedSynonyms, setSelectedSynonyms] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const customInputRef = useRef<HTMLInputElement>(null);

  const record: ReadRecord | undefined = useMemo(
    () => records.find((r) => r.id === id),
    [records, id],
  );

  useEffect(() => {
    void loadRecords(activePersona).then(() => setReady(true));
  }, [activePersona, loadRecords]);

  useEffect(() => {
    if (!record) return;
    setMyDefinition(record.myDefinition);
    setSelectedDefinition(record.definition);
    setSelectedSynonyms(record.synonyms);
  }, [record]);

  useEffect(() => {
    if (ready && !record) router.replace("/read");
  }, [ready, record, router]);

  const atLimit = selectedSynonyms.length >= MAX_SYNONYMS;

  function toggleSynonym(syn: string) {
    setSelectedSynonyms((prev) => {
      if (prev.includes(syn)) return prev.filter((s) => s !== syn);
      if (prev.length >= MAX_SYNONYMS) return prev;
      return [...prev, syn];
    });
  }

  function addCustomSynonym() {
    const val = customInput.trim();
    if (!val || atLimit) return;
    setSelectedSynonyms((prev) => {
      if (prev.includes(val) || prev.length >= MAX_SYNONYMS) return prev;
      return [...prev, val];
    });
    setCustomInput("");
    customInputRef.current?.focus();
  }

  const handleSave = useCallback(async () => {
    if (!record) return;
    setSaving(true);
    try {
      await updateRecord(record.id, {
        myDefinition,
        definition: selectedDefinition,
        synonyms: selectedSynonyms,
      });
      router.push("/read");
    } finally {
      setSaving(false);
    }
  }, [record, myDefinition, selectedDefinition, selectedSynonyms, updateRecord, router]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  if (!ready || !record) return null;

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      {/* Header */}
      <header className="section-dots relative overflow-hidden border-b border-[var(--surface-border)] bg-[var(--bg-panel)]">
        <div className="relative z-10 px-5 py-5 md:px-8 md:py-6">
          <div className="flex items-center justify-between">
            <Link
              href="/read"
              className="inline-flex items-center gap-1.5 font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-soft)]"
            >
              ← Read
            </Link>
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              {record.sourceType}
            </span>
          </div>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-[0.04em] text-[var(--text-primary)] md:text-5xl">
            {record.word}
          </h1>
          {record.partOfSpeech && (
            <p className="mt-1 font-mono text-xs italic text-[var(--text-secondary)]">
              {record.partOfSpeech}
            </p>
          )}
        </div>
        <div className="absolute bottom-0 left-0 h-[2px] w-24 bg-[var(--accent-solid)]" />
      </header>

      <div className="mx-auto max-w-2xl px-5 py-8 md:px-8 space-y-8">

        {/* My Definition */}
        <section>
          <p className="mb-2 font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.2em] text-[var(--accent-soft)]">
            My Definition
          </p>
          <textarea
            value={myDefinition}
            onChange={(e) => setMyDefinition(e.target.value)}
            placeholder="Write your own take on this word…"
            rows={3}
            className="w-full resize-none rounded-xl border border-[color-mix(in_srgb,var(--accent-solid)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent-solid)_6%,var(--bg-panel))] px-4 py-3 text-sm italic leading-6 text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-solid)] placeholder:text-[var(--text-secondary)] placeholder:opacity-60"
          />
          <p className="mt-1.5 text-[0.65rem] text-[var(--text-secondary)] opacity-60">
            Displayed above the actual definition in your ledger.
          </p>
        </section>

        {/* Definition picker */}
        <section>
          <p className="mb-2 font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.2em] text-[var(--accent-soft)]">
            Definition — pick one
          </p>
          {record.allDefinitions.length === 0 ? (
            <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-3">
              <p className="text-sm text-[var(--text-primary)]">{record.definition || "No definition saved."}</p>
              <p className="mt-2 text-[0.65rem] text-[var(--text-secondary)] opacity-60">
                Re-save this word from the Read page to load all available definitions.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {record.allDefinitions.map((def, i) => {
                const isSelected = selectedDefinition === def.definition;
                return (
                  <button
                    key={i}
                    type="button"
                    data-selected={isSelected}
                    onClick={() => setSelectedDefinition(def.definition)}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-left transition-all duration-150",
                      isSelected
                        ? "border-[var(--accent-solid)] bg-[color-mix(in_srgb,var(--accent-solid)_10%,var(--bg-panel))]"
                        : "border-[var(--surface-border)] bg-[var(--bg-panel)] hover:border-[var(--accent-solid)]/40",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 rounded-full border-[1.5px] transition-all",
                          isSelected
                            ? "border-[var(--accent-solid)] bg-[var(--accent-solid)] shadow-[inset_0_0_0_3px_var(--accent-solid),inset_0_0_0_5px_white]"
                            : "border-[var(--surface-border)] bg-[var(--bg-panel)]",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="mb-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--text-secondary)] italic">
                          {def.partOfSpeech}
                        </p>
                        <p className="text-sm leading-5 text-[var(--text-primary)]">{def.definition}</p>
                        {def.example && (
                          <p className="mt-1 text-xs italic text-[var(--text-secondary)]">"{def.example}"</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Synonym picker */}
        <section>
          <div className="mb-2 flex items-baseline gap-2">
            <p className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.2em] text-[var(--accent-soft)]">
              Synonyms
            </p>
            <span className={cn(
              "font-mono text-[0.625rem] tabular-nums",
              atLimit ? "text-[var(--accent-soft)]" : "text-[var(--text-secondary)]",
            )}>
              {selectedSynonyms.length} / {MAX_SYNONYMS}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {record.allSynonyms.map((syn) => {
              const on = selectedSynonyms.includes(syn);
              const locked = !on && atLimit;
              return (
                <button
                  key={syn}
                  type="button"
                  disabled={locked}
                  onClick={() => toggleSynonym(syn)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-all duration-150",
                    on
                      ? "border-[var(--accent-solid)] bg-[color-mix(in_srgb,var(--accent-solid)_15%,var(--bg-panel))] font-semibold text-[var(--text-primary)]"
                      : "border-[var(--surface-border)] bg-[var(--bg-panel)] text-[var(--text-secondary)]",
                    locked && "cursor-not-allowed opacity-30",
                  )}
                >
                  {syn}
                </button>
              );
            })}
            {/* Custom synonyms added by user (not in allSynonyms) */}
            {selectedSynonyms
              .filter((s) => !record.allSynonyms.includes(s))
              .map((syn) => (
                <button
                  key={syn}
                  type="button"
                  onClick={() => toggleSynonym(syn)}
                  className="rounded-full border border-dashed border-[var(--accent-solid)] bg-[color-mix(in_srgb,var(--accent-solid)_15%,var(--bg-panel))] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]"
                >
                  {syn} ×
                </button>
              ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              ref={customInputRef}
              type="text"
              value={customInput}
              disabled={atLimit}
              placeholder="Add your own…"
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSynonym(); } }}
              className="flex-1 rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-solid)] disabled:cursor-not-allowed disabled:opacity-35 placeholder:text-[var(--text-secondary)]"
            />
            <button
              type="button"
              disabled={atLimit || !customInput.trim()}
              onClick={addCustomSynonym}
              className="rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-solid)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              + Add
            </button>
          </div>
        </section>

      </div>

      {/* Footer */}
      <div className="sticky bottom-0 border-t border-[var(--surface-border)] bg-[var(--bg-panel)] px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <span className="hidden font-mono text-[0.625rem] text-[var(--text-secondary)] sm:inline">⌘↵ to save</span>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="ml-auto inline-flex items-center rounded-lg bg-[var(--accent-solid)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-85 active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/app/word/[id]/page.tsx`**

```tsx
import { WordPage } from "@/components/word/word-page";

export default async function WordRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WordPage id={id} />;
}
```

- [ ] **Step 5: Run Word page tests**

```bash
npx vitest run src/__tests__/components/word-page.test.tsx
```

Expected: all PASS.

- [ ] **Step 6: Run all tests to check for regressions**

```bash
npx vitest run
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/word/word-page.tsx src/app/word/[id]/page.tsx src/__tests__/components/word-page.test.tsx
git commit -m "feat: add Word detail page with definition picker and synonym selector"
```

---

## Task 7: TypeScript + full test run

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 2: Full test suite**

```bash
npx vitest run
```

Expected: all PASS.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: resolve remaining type errors from word record redesign"
```
