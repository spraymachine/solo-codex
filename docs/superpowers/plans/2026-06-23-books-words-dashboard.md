# Books, Words rename & dashboard/header revamp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persona-scoped Books feature (3 shelves, Google Books lookup, ratings/notes/progress), rename the existing Read feature to Words (URL + labels only), and rebuild the dashboard hero + a new global header with an inline word-capture bar that links words to books.

**Architecture:** Local-first per-persona IndexedDB (Dexie) stores with fire-and-forget Supabase sync, exactly mirroring the existing `read-store`/`work-store` pattern. Google Books key stays server-side behind a Next API route. Words gain an optional `bookId` linking them to a book; the dashboard hero gets a quick-capture widget reusing the existing dictionary lookup.

**Tech Stack:** Next.js (App Router, client components), Zustand, Dexie/IndexedDB, Supabase, Vitest + Testing Library, Tailwind.

**Conventions (read before starting):**
- IDs via `generateId()` and timestamps via `nowISO()` from `@/lib/utils`.
- Stores live in `src/lib/stores/`, Supabase modules in `src/lib/supabase/`, Dexie schema in `src/lib/db/database.ts`, storage facade in `src/lib/db/storage.ts`.
- Personas: `mani | harti | persona1 | persona2`. Active persona from `usePersonaStore.getState().activePersona`.
- Run a single test: `npx vitest run src/__tests__/lib/<file>.ts -t "<name>"`. Run all: `npm test`.
- Commit after every task.

---

## Phase A — Words rename + bookId plumbing

### Task 1: Add `bookId` to ReadRecord (type, Dexie, storage, Supabase)

**Files:**
- Modify: `src/lib/types.ts` (ReadRecord interface, ~line 141)
- Modify: `src/lib/db/database.ts` (add version 11)
- Modify: `src/lib/db/storage.ts` (`createReadRecord` input + record, `updateReadRecord` allowed updates)
- Modify: `src/lib/supabase/read.ts` (`rowToReadRecord`, `sbCreateReadRecord`, `sbUpdateReadRecord`)
- Modify: `src/lib/stores/read-store.ts` (`ReadRecordInput`, `createRecords` mapping, `updateRecord` allowed keys)
- Test: `src/__tests__/lib/read-store.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/lib/read-store.test.ts` inside the `describe`:

```ts
it("stores and updates bookId on a record", async () => {
  await useReadStore.getState().createRecords([
    {
      word: "umbra",
      definition: "The fully shaded inner region of a shadow.",
      partOfSpeech: "noun",
      myDefinition: "",
      synonyms: [],
      allDefinitions: [],
      allSynonyms: [],
      sourceType: "book",
      bookId: "book-123",
    },
  ]);

  const created = useReadStore.getState().records[0];
  expect(created.bookId).toBe("book-123");

  await useReadStore.getState().updateRecord(created.id, { bookId: "book-456" });
  const updated = useReadStore.getState().records.find((r) => r.id === created.id);
  expect(updated?.bookId).toBe("book-456");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/read-store.test.ts -t "stores and updates bookId"`
Expected: FAIL — `bookId` is not an accepted input / not persisted.

- [ ] **Step 3: Add `bookId` to the ReadRecord type**

In `src/lib/types.ts`, add to `ReadRecord` (after `sourceType`):

```ts
  sourceType: ReadSourceType;
  bookId?: string | null;
  createdAt: string;
```

- [ ] **Step 4: Add Dexie version 11 (no index needed, backfill null)**

In `src/lib/db/database.ts`, after the `this.version(10)…` block (inside the constructor), append:

```ts
    this.version(11)
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
          r.bookId ??= null;
        });
      });
```

- [ ] **Step 5: Thread `bookId` through storage**

In `src/lib/db/storage.ts`, update `createReadRecord`:

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
    bookId?: string | null;
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
      bookId: input.bookId ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.readRecords.add(record);
    return record;
  },
```

And widen `updateReadRecord`'s `updates` type to include `bookId`:

```ts
  async updateReadRecord(
    id: string,
    updates: Partial<Pick<ReadRecord, "word" | "definition" | "partOfSpeech" | "sourceType" | "myDefinition" | "synonyms" | "bookId">>,
  ): Promise<void> {
```

(Leave the existing body — it spreads `updates` into the Dexie `update` call.)

- [ ] **Step 6: Thread `bookId` through the store**

In `src/lib/stores/read-store.ts`:

Add `bookId` to `ReadRecordInput`:

```ts
interface ReadRecordInput {
  word: string;
  definition: string;
  partOfSpeech: string;
  myDefinition: string;
  synonyms: string[];
  allDefinitions: Array<{ partOfSpeech: string; definition: string; example?: string }>;
  allSynonyms: string[];
  sourceType: ReadSourceType;
  bookId?: string | null;
}
```

Widen the `updateRecord` signature in `ReadState`:

```ts
  updateRecord: (
    id: string,
    updates: Partial<Pick<ReadRecord, "word" | "definition" | "partOfSpeech" | "sourceType" | "myDefinition" | "synonyms" | "bookId">>,
  ) => Promise<void>;
```

In `createRecords`, pass `bookId` into the storage call:

```ts
          storage.createReadRecord({
            word: item.word,
            definition: item.definition,
            partOfSpeech: item.partOfSpeech,
            myDefinition: item.myDefinition,
            synonyms: item.synonyms,
            allDefinitions: item.allDefinitions,
            allSynonyms: item.allSynonyms,
            sourceType: item.sourceType,
            bookId: item.bookId ?? null,
          }),
```

- [ ] **Step 7: Thread `bookId` through Supabase mapping**

In `src/lib/supabase/read.ts`:

`rowToReadRecord` — add: `bookId: r.book_id ?? null,` (after `sourceType`).

`sbCreateReadRecord` — add to the upsert object: `book_id: record.bookId ?? null,` (after `source_type`).

`sbUpdateReadRecord` — add to the update object: `book_id: updates.bookId ?? null,` (after `source_type`). Note: this writes `book_id` only when the caller includes `bookId`; since `updates` is `Partial`, guard by spreading conditionally is unnecessary here because the column is nullable and existing update calls don't pass `bookId` (sending `null` for an unchanged field would clobber it). **To avoid clobbering, only set `book_id` when present:** replace the single `.update({...})` with:

```ts
export async function sbUpdateReadRecord(
  userId: string,
  persona: Persona,
  id: string,
  updates: Partial<ReadRecord>,
) {
  const client = sb();
  if (!client) return;
  const patch: Record<string, unknown> = {
    word: updates.word,
    definition: updates.definition,
    part_of_speech: updates.partOfSpeech,
    my_definition: updates.myDefinition,
    synonyms: updates.synonyms,
    source_type: updates.sourceType,
    updated_at: updates.updatedAt,
  };
  if ("bookId" in updates) patch.book_id = updates.bookId ?? null;
  await client.from("read_records").update(patch).eq("user_id", userId).eq("persona", persona).eq("id", id);
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/lib/read-store.test.ts`
Expected: PASS (all read-store tests).

- [ ] **Step 9: Add the Supabase migration for `book_id`**

Create `supabase/migrations/20260623000000_read_records_add_book_id.sql`:

```sql
alter table public.read_records
  add column if not exists book_id uuid;
```

(Applied to the remote DB later via the Supabase MCP `apply_migration`, with user permission — do NOT auto-apply.)

- [ ] **Step 10: Commit**

```bash
git add src/lib/types.ts src/lib/db/database.ts src/lib/db/storage.ts src/lib/supabase/read.ts src/lib/stores/read-store.ts src/__tests__/lib/read-store.test.ts supabase/migrations/20260623000000_read_records_add_book_id.sql
git commit -m "feat: add optional bookId to read records"
```

---

### Task 2: Rename `/read` route → `/words` (URL + labels only)

**Files:**
- Rename: `src/app/read/` → `src/app/words/` (directory move)
- Modify: `src/components/word/word-page.tsx` (3 `/read` references)
- Modify: any UI label "Read" that refers to this feature (none in nav yet — sidebar/bottom-nav are dead and removed in Task 8; the dashboard tile is rewritten in Task 11). Grep to confirm.
- Test: `src/__tests__/components/read-page.test.tsx` (should still pass — it imports the component, not the route)

- [ ] **Step 1: Move the route directory**

```bash
git mv src/app/read src/app/words
```

Confirm `src/app/words/page.tsx` still imports `ReadPage` from `@/components/read/read-page` (component path is unchanged — only the route moved).

- [ ] **Step 2: Update back-links in word-page.tsx**

In `src/components/word/word-page.tsx`, change all three `/read` to `/words`:
- `if (ready && !record) router.replace("/words");`
- `router.push("/words");`
- the `href="/words"` on the back link.

- [ ] **Step 3: Grep for stragglers**

Run: `grep -rn '"/read"\|href="/read"\|/read#' src/`
Expected: no remaining references (the `/word?id=` detail route is unrelated and stays). Fix any found.

- [ ] **Step 4: Run component tests + typecheck**

Run: `npx vitest run src/__tests__/components/read-page.test.tsx`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: rename /read route to /words"
```

---

## Phase B — Books data layer

### Task 3: Add `Book` and `BookShelf` types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add the types**

Append to `src/lib/types.ts`:

```ts
export type BookShelf = "want" | "reading" | "read";

export interface Book {
  id: string;
  googleVolumeId: string | null;
  title: string;
  authors: string[];
  coverUrl: string | null;
  totalPages: number | null;
  shelf: BookShelf;
  currentPage: number;
  rating: number | null;
  notes: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add Book and BookShelf types"
```

---

### Task 4: Dexie `books` table + storage methods

**Files:**
- Modify: `src/lib/db/database.ts` (import `Book`, add table field, version 12)
- Modify: `src/lib/db/storage.ts` (import `Book`, add `getBooks`/`createBook`/`updateBook`/`deleteBook`; add `db.books.clear()` to the reset list ~line 484)
- Test: `src/__tests__/lib/storage.test.ts` (or a new `books-storage.test.ts`)

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/lib/books-storage.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/database";
import { storage } from "@/lib/db/storage";
import { usePersonaStore } from "@/lib/stores/persona-store";

describe("books storage", () => {
  beforeEach(async () => {
    await getDb("mani").books.clear();
    usePersonaStore.setState({ activePersona: "mani" });
  });

  it("creates and reads a book with defaults", async () => {
    const book = await storage.createBook({
      googleVolumeId: "vol-1",
      title: "Deep Work",
      authors: ["Cal Newport"],
      coverUrl: "http://x/cover.jpg",
      totalPages: 296,
      shelf: "want",
    });

    expect(book.id).toBeTruthy();
    expect(book.currentPage).toBe(0);
    expect(book.rating).toBeNull();
    expect(book.notes).toBe("");
    expect(book.startedAt).toBeNull();

    const all = await storage.getBooks();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe("Deep Work");
  });

  it("updates and deletes a book", async () => {
    const book = await storage.createBook({
      googleVolumeId: null, title: "Dune", authors: ["Frank Herbert"],
      coverUrl: null, totalPages: 412, shelf: "reading",
    });
    await storage.updateBook(book.id, { currentPage: 100, shelf: "reading" });
    expect((await storage.getBooks())[0].currentPage).toBe(100);

    await storage.deleteBook(book.id);
    expect(await storage.getBooks()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/books-storage.test.ts`
Expected: FAIL — `db.books` undefined / `storage.createBook` not a function.

- [ ] **Step 3: Add the Dexie table + version 12**

In `src/lib/db/database.ts`:

Add `Book` to the type import list.

Add the table field to the class (after `readRecords!`):

```ts
  books!: EntityTable<Book, "id">;
```

Append version 12 after version 11:

```ts
    this.version(12).stores({
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
    });
```

- [ ] **Step 4: Add storage methods**

In `src/lib/db/storage.ts`, add `Book` and `BookShelf` to the type import, and add these methods to the `storage` object (place near the read-record methods):

```ts
  async getBooks(options?: StorageOptions): Promise<Book[]> {
    const db = getDb(options?.persona);
    return db.books.orderBy("createdAt").reverse().toArray();
  },

  async createBook(input: {
    googleVolumeId: string | null;
    title: string;
    authors: string[];
    coverUrl: string | null;
    totalPages: number | null;
    shelf: BookShelf;
  }): Promise<Book> {
    const db = getDb();
    const timestamp = nowISO();
    const book: Book = {
      id: generateId(),
      googleVolumeId: input.googleVolumeId,
      title: input.title.trim(),
      authors: input.authors,
      coverUrl: input.coverUrl,
      totalPages: input.totalPages,
      shelf: input.shelf,
      currentPage: 0,
      rating: null,
      notes: "",
      startedAt: input.shelf === "reading" ? timestamp : null,
      finishedAt: input.shelf === "read" ? timestamp : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.books.add(book);
    return book;
  },

  async updateBook(
    id: string,
    updates: Partial<Pick<Book, "shelf" | "currentPage" | "rating" | "notes" | "startedAt" | "finishedAt">>,
  ): Promise<void> {
    const db = getDb();
    await db.books.update(id, { ...updates, updatedAt: nowISO() });
  },

  async deleteBook(id: string): Promise<void> {
    const db = getDb();
    await db.books.delete(id);
  },
```

Also add `db.books.clear(),` to the array inside the existing reset/clear-all method (the one near line 484 that lists `db.readRecords.clear()`).

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/__tests__/lib/books-storage.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/database.ts src/lib/db/storage.ts src/__tests__/lib/books-storage.test.ts
git commit -m "feat: add books table and storage methods"
```

---

### Task 5: Supabase `books` module + migration

**Files:**
- Create: `src/lib/supabase/books.ts`
- Create: `supabase/migrations/20260623000001_create_books.sql`

- [ ] **Step 1: Create the Supabase module**

Create `src/lib/supabase/books.ts` (mirrors `read.ts`):

```ts
import { getSupabaseBrowserClient } from "./client";
import { isSupabaseConfigured } from "./config";
import type { Book, Persona } from "@/lib/types";

function sb() {
  const client = getSupabaseBrowserClient();
  if (!client || !isSupabaseConfigured()) return null;
  return client;
}

export async function getBooksUserId(): Promise<string | null> {
  const client = sb();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data?.user?.id ?? null;
}

export function rowToBook(r: any): Book {
  return {
    id: r.id,
    googleVolumeId: r.google_volume_id ?? null,
    title: r.title,
    authors: r.authors ?? [],
    coverUrl: r.cover_url ?? null,
    totalPages: r.total_pages ?? null,
    shelf: r.shelf,
    currentPage: r.current_page ?? 0,
    rating: r.rating ?? null,
    notes: r.notes ?? "",
    startedAt: r.started_at ?? null,
    finishedAt: r.finished_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function fetchBooks(userId: string, persona: Persona): Promise<Book[] | null> {
  const client = sb();
  if (!client) return null;
  const { data, error } = await client
    .from("books")
    .select("*")
    .eq("user_id", userId)
    .eq("persona", persona)
    .order("created_at", { ascending: false });
  if (error) return null;
  return (data ?? []).map(rowToBook);
}

export async function sbCreateBook(userId: string, persona: Persona, book: Book) {
  const client = sb();
  if (!client) return;
  await client.from("books").upsert({
    id: book.id,
    user_id: userId,
    persona,
    google_volume_id: book.googleVolumeId,
    title: book.title,
    authors: book.authors,
    cover_url: book.coverUrl,
    total_pages: book.totalPages,
    shelf: book.shelf,
    current_page: book.currentPage,
    rating: book.rating,
    notes: book.notes,
    started_at: book.startedAt,
    finished_at: book.finishedAt,
    created_at: book.createdAt,
    updated_at: book.updatedAt,
  });
}

export async function sbUpdateBook(
  userId: string,
  persona: Persona,
  id: string,
  updates: Partial<Book>,
) {
  const client = sb();
  if (!client) return;
  const patch: Record<string, unknown> = { updated_at: updates.updatedAt };
  if ("shelf" in updates) patch.shelf = updates.shelf;
  if ("currentPage" in updates) patch.current_page = updates.currentPage;
  if ("rating" in updates) patch.rating = updates.rating;
  if ("notes" in updates) patch.notes = updates.notes;
  if ("startedAt" in updates) patch.started_at = updates.startedAt;
  if ("finishedAt" in updates) patch.finished_at = updates.finishedAt;
  await client.from("books").update(patch).eq("user_id", userId).eq("persona", persona).eq("id", id);
}

export async function sbDeleteBook(userId: string, persona: Persona, id: string) {
  const client = sb();
  if (!client) return;
  await client.from("books").delete().eq("user_id", userId).eq("persona", persona).eq("id", id);
}
```

- [ ] **Step 2: Create the migration**

Create `supabase/migrations/20260623000001_create_books.sql` (mirrors `read_records`):

```sql
create table if not exists public.books (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  persona text not null check (persona in ('mani', 'harti', 'persona1', 'persona2')),
  google_volume_id text,
  title text not null,
  authors jsonb not null default '[]'::jsonb,
  cover_url text,
  total_pages integer,
  shelf text not null check (shelf in ('want','reading','read')),
  current_page integer not null default 0,
  rating integer check (rating between 1 and 5),
  notes text not null default '',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists books_user_persona_idx on books (user_id, persona);

alter table public.books enable row level security;

create policy "Users manage own books"
  on public.books
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter publication supabase_realtime add table books;
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/books.ts supabase/migrations/20260623000001_create_books.sql
git commit -m "feat: add books Supabase module and migration"
```

---

### Task 6: `books-store` (Zustand) + tests

**Files:**
- Create: `src/lib/stores/books-store.ts`
- Test: `src/__tests__/lib/books-store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/lib/books-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/database";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useBooksStore } from "@/lib/stores/books-store";

describe("books store", () => {
  beforeEach(async () => {
    await Promise.all([getDb("mani").books.clear(), getDb("harti").books.clear()]);
    usePersonaStore.setState({ activePersona: "mani" });
    useBooksStore.setState({ books: [], loaded: false });
  });

  it("creates a book for the active persona only", async () => {
    await useBooksStore.getState().createBook({
      googleVolumeId: "v1", title: "Deep Work", authors: ["Cal Newport"],
      coverUrl: null, totalPages: 296, shelf: "want",
    });
    expect(useBooksStore.getState().books).toHaveLength(1);
    expect(await getDb("mani").books.count()).toBe(1);
    expect(await getDb("harti").books.count()).toBe(0);
  });

  it("does not leak books across personas", async () => {
    await useBooksStore.getState().createBook({
      googleVolumeId: null, title: "Dune", authors: ["Frank Herbert"],
      coverUrl: null, totalPages: 412, shelf: "reading",
    });
    usePersonaStore.setState({ activePersona: "harti" });
    useBooksStore.setState({ books: [], loaded: false });
    await useBooksStore.getState().load("harti");
    expect(useBooksStore.getState().books).toEqual([]);
  });

  it("setShelf to read stamps finishedAt and keeps rating editable", async () => {
    await useBooksStore.getState().createBook({
      googleVolumeId: null, title: "1984", authors: ["Orwell"],
      coverUrl: null, totalPages: 328, shelf: "reading",
    });
    const id = useBooksStore.getState().books[0].id;
    await useBooksStore.getState().setShelf(id, "read");
    const book = useBooksStore.getState().books.find((b) => b.id === id);
    expect(book?.shelf).toBe("read");
    expect(book?.finishedAt).toBeTruthy();
    await useBooksStore.getState().setRating(id, 4);
    expect(useBooksStore.getState().books.find((b) => b.id === id)?.rating).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/books-store.test.ts`
Expected: FAIL — `useBooksStore` module not found.

- [ ] **Step 3: Implement the store**

Create `src/lib/stores/books-store.ts` (mirrors `read-store.ts`):

```ts
"use client";

import { create } from "zustand";
import { getDb } from "@/lib/db/database";
import { storage } from "@/lib/db/storage";
import { usePersonaStore } from "@/lib/stores/persona-store";
import {
  fetchBooks,
  getBooksUserId,
  sbCreateBook,
  sbDeleteBook,
  sbUpdateBook,
} from "@/lib/supabase/books";
import { nowISO } from "@/lib/utils";
import type { Book, BookShelf, Persona } from "@/lib/types";

interface BookInput {
  googleVolumeId: string | null;
  title: string;
  authors: string[];
  coverUrl: string | null;
  totalPages: number | null;
  shelf: BookShelf;
}

type BookUpdates = Partial<Pick<Book, "shelf" | "currentPage" | "rating" | "notes" | "startedAt" | "finishedAt">>;

interface BooksState {
  books: Book[];
  loaded: boolean;
  load: (persona?: Persona) => Promise<void>;
  createBook: (input: BookInput) => Promise<void>;
  updateBook: (id: string, updates: BookUpdates) => Promise<void>;
  setShelf: (id: string, shelf: BookShelf) => Promise<void>;
  setProgress: (id: string, currentPage: number) => Promise<void>;
  setRating: (id: string, rating: number | null) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
}

async function syncBooksToSupabase(fn: (userId: string) => Promise<void>) {
  try {
    const userId = await getBooksUserId();
    if (!userId) return;
    await fn(userId);
  } catch {
    // swallow — local state is source of truth
  }
}

export const useBooksStore = create<BooksState>((set, get) => ({
  books: [],
  loaded: false,

  async load(persona) {
    if (persona && usePersonaStore.getState().activePersona !== persona) return;

    if (persona) {
      try {
        const userId = await getBooksUserId();
        if (userId) {
          const cloud = await fetchBooks(userId, persona);
          if (cloud) {
            const db = getDb(persona);
            await db.transaction("rw", db.books, async () => {
              await db.books.clear();
              if (cloud.length > 0) await db.books.bulkAdd(cloud);
            });
            if (usePersonaStore.getState().activePersona !== persona) return;
            set({ books: cloud, loaded: true });
            return;
          }
        }
      } catch {
        // fall through to local
      }
    }

    const books = await storage.getBooks({ persona });
    if (persona && usePersonaStore.getState().activePersona !== persona) return;
    set({ books, loaded: true });
  },

  async createBook(input) {
    if (!input.title.trim()) return;
    const book = await storage.createBook(input);
    set((state) => ({
      books: [book, ...state.books].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }));
    const persona = usePersonaStore.getState().activePersona;
    void syncBooksToSupabase((uid) => sbCreateBook(uid, persona, book));
  },

  async updateBook(id, updates) {
    await storage.updateBook(id, updates);
    const updatedAt = nowISO();
    set((state) => ({
      books: state.books.map((b) => (b.id === id ? { ...b, ...updates, updatedAt } : b)),
    }));
    const persona = usePersonaStore.getState().activePersona;
    void syncBooksToSupabase((uid) => sbUpdateBook(uid, persona, id, { ...updates, updatedAt }));
  },

  async setShelf(id, shelf) {
    const book = get().books.find((b) => b.id === id);
    const updates: BookUpdates = { shelf };
    if (shelf === "reading" && !book?.startedAt) updates.startedAt = nowISO();
    if (shelf === "read" && !book?.finishedAt) updates.finishedAt = nowISO();
    await get().updateBook(id, updates);
  },

  async setProgress(id, currentPage) {
    await get().updateBook(id, { currentPage: Math.max(0, currentPage) });
  },

  async setRating(id, rating) {
    await get().updateBook(id, { rating });
  },

  async deleteBook(id) {
    await storage.deleteBook(id);
    set((state) => ({ books: state.books.filter((b) => b.id !== id) }));
    const persona = usePersonaStore.getState().activePersona;
    void syncBooksToSupabase((uid) => sbDeleteBook(uid, persona, id));
  },
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/lib/books-store.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/books-store.ts src/__tests__/lib/books-store.test.ts
git commit -m "feat: add persona-scoped books store"
```

---

### Task 7: Google Books search API route

**Files:**
- Create: `src/app/api/books/search/route.ts`
- Create: `src/lib/books/types.ts` (shared `BookSearchResult` type)
- Modify: `.env.example` (document `GOOGLE_BOOKS_API_KEY`)
- Test: `src/__tests__/lib/books-search-parse.test.ts` (pure parser test)

- [ ] **Step 1: Write the failing parser test**

Create `src/__tests__/lib/books-search-parse.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseGoogleBooks } from "@/app/api/books/search/parse";

describe("parseGoogleBooks", () => {
  it("maps volumes to trimmed results", () => {
    const payload = {
      items: [
        {
          id: "vol-1",
          volumeInfo: {
            title: "Deep Work",
            authors: ["Cal Newport"],
            pageCount: 296,
            imageLinks: { thumbnail: "http://books/img?zoom=1" },
          },
        },
        { id: "vol-2", volumeInfo: { title: "No Author Book" } },
      ],
    };
    const out = parseGoogleBooks(payload);
    expect(out).toEqual([
      { volumeId: "vol-1", title: "Deep Work", authors: ["Cal Newport"], coverUrl: "https://books/img?zoom=1", totalPages: 296 },
      { volumeId: "vol-2", title: "No Author Book", authors: [], coverUrl: null, totalPages: null },
    ]);
  });

  it("returns [] for malformed payloads", () => {
    expect(parseGoogleBooks(null)).toEqual([]);
    expect(parseGoogleBooks({})).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/books-search-parse.test.ts`
Expected: FAIL — parse module not found.

- [ ] **Step 3: Create the shared type**

Create `src/lib/books/types.ts`:

```ts
export interface BookSearchResult {
  volumeId: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  totalPages: number | null;
}
```

- [ ] **Step 4: Create the parser**

Create `src/app/api/books/search/parse.ts`:

```ts
import type { BookSearchResult } from "@/lib/books/types";

export function parseGoogleBooks(payload: unknown): BookSearchResult[] {
  if (!payload || typeof payload !== "object") return [];
  const items = (payload as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];

  return items.map((raw) => {
    const item = raw as { id?: unknown; volumeInfo?: Record<string, unknown> };
    const info = item.volumeInfo ?? {};
    const thumb = (info.imageLinks as { thumbnail?: unknown } | undefined)?.thumbnail;
    const coverUrl = typeof thumb === "string" ? thumb.replace(/^http:/, "https:") : null;
    return {
      volumeId: typeof item.id === "string" ? item.id : "",
      title: typeof info.title === "string" ? info.title : "Untitled",
      authors: Array.isArray(info.authors) ? (info.authors as unknown[]).filter((a): a is string => typeof a === "string") : [],
      coverUrl,
      totalPages: typeof info.pageCount === "number" ? info.pageCount : null,
    };
  }).filter((r) => r.volumeId);
}
```

- [ ] **Step 5: Run parser test to verify it passes**

Run: `npx vitest run src/__tests__/lib/books-search-parse.test.ts`
Expected: PASS.

- [ ] **Step 6: Create the API route**

Create `src/app/api/books/search/route.ts`:

```ts
import { NextResponse } from "next/server";
import { parseGoogleBooks } from "./parse";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });

  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", "10");
  if (key) url.searchParams.set("key", key);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return NextResponse.json({ results: [] }, { status: 200 });
    const results = parseGoogleBooks(await res.json());
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}
```

- [ ] **Step 7: Document the env var**

Add to `.env.example` (create if missing):

```
# Server-side key for Google Books volume search (Books feature). Optional but recommended to avoid rate limits.
GOOGLE_BOOKS_API_KEY=
```

- [ ] **Step 8: Typecheck + commit**

Run: `npx tsc --noEmit` → no errors.

```bash
git add src/app/api/books/search/route.ts src/app/api/books/search/parse.ts src/lib/books/types.ts src/__tests__/lib/books-search-parse.test.ts .env.example
git commit -m "feat: add Google Books search API route"
```

---

## Phase C — UI

### Task 8: New global header (avatars + nav + theme/logout); delete dead nav

**Files:**
- Rewrite: `src/components/layout/site-header.tsx`
- Delete: `src/components/layout/sidebar.tsx`, `src/components/layout/bottom-nav.tsx`, `src/components/layout/nav-item.tsx` (verify each is unreferenced first)
- Verify mount: `src/app/layout.tsx` already renders `<SiteHeader />` — no change needed.
- Test: `src/__tests__/components/site-header.test.tsx`

- [ ] **Step 1: Confirm dead files are unreferenced**

Run: `grep -rn "sidebar\|bottom-nav\|nav-item\|BottomNav\|Sidebar\|NavItem\|PersonaSwitcher\|persona-switcher" src/app src/components | grep -v "site-header"`
Expected: only the definitions themselves (no imports/usages elsewhere). If `persona-switcher.tsx` is unreferenced, delete it too. Record what you find.

- [ ] **Step 2: Write the failing test**

Create `src/__tests__/components/site-header.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SiteHeader } from "@/components/layout/site-header";
import { usePersonaStore } from "@/lib/stores/persona-store";

vi.mock("@/components/auth/auth-gate", () => ({
  useAuth: () => ({ user: { email: "maniha@improve.com" }, signOut: vi.fn() }),
}));

describe("SiteHeader", () => {
  it("renders nav links and persona avatars and switches persona", () => {
    usePersonaStore.setState({ activePersona: "mani" });
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /books/i })).toHaveAttribute("href", "/books");
    expect(screen.getByRole("link", { name: /words/i })).toHaveAttribute("href", "/words");
    expect(screen.getByRole("link", { name: /work/i })).toHaveAttribute("href", "/work");

    const hartiBtn = screen.getByRole("button", { name: /switch to harti/i });
    fireEvent.click(hartiBtn);
    expect(usePersonaStore.getState().activePersona).toBe("harti");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/__tests__/components/site-header.test.tsx`
Expected: FAIL — links/avatars not present in current header.

- [ ] **Step 4: Rewrite the header**

Replace `src/components/layout/site-header.tsx` with (keep the three SVG icon components from the original — `SunIcon`, `MoonIcon`, `SignOutIcon`):

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-gate";
import { getAllowedPersonas } from "@/lib/persona-access";
import { personaMeta, usePersonaStore } from "@/lib/stores/persona-store";
import { useThemeStore } from "@/lib/stores/theme-store";

// --- keep SunIcon, MoonIcon, SignOutIcon exactly as in the previous version ---

const NAV = [
  { href: "/", label: "Dashboard", glyph: "⬡" },
  { href: "/books", label: "Books", glyph: "▥" },
  { href: "/words", label: "Words", glyph: "▣" },
  { href: "/work", label: "Work", glyph: "▦" },
];

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const activePersona = usePersonaStore((s) => s.activePersona);
  const setActivePersona = usePersonaStore((s) => s.setActivePersona);
  const allowed = getAllowedPersonas(user?.email);

  return (
    <header className="sticky top-0 z-40 mb-6 flex items-center justify-between gap-3 border-b border-[var(--surface-border)] bg-[var(--bg-secondary)]/85 px-4 py-2.5 backdrop-blur-xl md:px-6">
      {/* Left: persona avatars */}
      <div className="flex items-center gap-2">
        {allowed.map((persona) => {
          const meta = personaMeta[persona];
          const active = persona === activePersona;
          return (
            <button
              key={persona}
              type="button"
              aria-label={`Switch to ${meta.label}`}
              onClick={() => setActivePersona(persona)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300"
              style={{
                color: meta.accent,
                background: active ? `color-mix(in srgb, ${meta.accent} 18%, transparent)` : "transparent",
                boxShadow: active ? `0 0 0 2px var(--bg-secondary), 0 0 0 3px ${meta.accent}` : "none",
              }}
            >
              {meta.label.charAt(0)}
            </button>
          );
        })}
      </div>

      {/* Center: nav */}
      <nav className="flex items-center gap-1">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 ${
                active ? "bg-[var(--bg-panel-strong)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span aria-hidden className="text-base leading-none">{item.glyph}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right: theme + logout */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--surface-border)] bg-[var(--bg-panel)] text-[var(--text-secondary)] transition-all duration-300 hover:border-[var(--accent-solid)] hover:text-[var(--text-primary)]"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
        {user ? (
          <button
            type="button"
            onClick={() => void signOut()}
            title="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--surface-border)] bg-[var(--bg-panel)] text-[var(--text-secondary)] transition-all duration-300 hover:border-[var(--accent-solid)] hover:text-[var(--text-primary)]"
          >
            <SignOutIcon />
          </button>
        ) : null}
      </div>
    </header>
  );
}
```

Note: the old header was `position: fixed` floating top-right; the new one is a normal sticky bar. In `src/app/layout.tsx` the `<main>` has `pt-8 md:pt-12` — since the header is no longer fixed/floating, reduce to `pt-0` (the header provides its own spacing with `mb-6`). Make that one-line change in `layout.tsx`.

Icons are placeholders (`glyph`); the user will supply final icons later.

- [ ] **Step 5: Delete dead nav files**

```bash
git rm src/components/layout/sidebar.tsx src/components/layout/bottom-nav.tsx src/components/layout/nav-item.tsx
```

(Only those confirmed unreferenced in Step 1. If `persona-switcher.tsx` was unreferenced, `git rm` it too.)

- [ ] **Step 6: Run tests + typecheck**

Run: `npx vitest run src/__tests__/components/site-header.test.tsx` → PASS.
Run: `npx tsc --noEmit` → no errors (fixes any imports of the deleted files).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: global header with persona avatars and primary nav"
```

---

### Task 9: Books page — shelves + add flow

**Files:**
- Create: `src/app/books/page.tsx`
- Create: `src/components/books/books-page.tsx`
- Create: `src/components/books/add-book-bar.tsx`
- Modify: `src/components/store-initializer.tsx` (load books store on persona change — see Step 5)
- Test: `src/__tests__/components/books-page.test.tsx`

- [ ] **Step 1: Create the route**

Create `src/app/books/page.tsx`:

```tsx
"use client";

import { BooksPage } from "@/components/books/books-page";

export default function BooksRoute() {
  return <BooksPage />;
}
```

- [ ] **Step 2: Create the add-book bar**

Create `src/components/books/add-book-bar.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useBooksStore } from "@/lib/stores/books-store";
import type { BookSearchResult } from "@/lib/books/types";
import type { BookShelf } from "@/lib/types";

export function AddBookBar() {
  const createBook = useBooksStore((s) => s.createBook);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { results: BookSearchResult[] };
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function add(result: BookSearchResult, shelf: BookShelf) {
    await createBook({
      googleVolumeId: result.volumeId,
      title: result.title,
      authors: result.authors,
      coverUrl: result.coverUrl,
      totalPages: result.totalPages,
      shelf,
    });
    setResults((prev) => prev.filter((r) => r.volumeId !== result.volumeId));
  }

  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-secondary)] p-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void search(); }}
          placeholder="Search title or author…"
          className="flex-1 rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
        />
        <button
          type="button"
          onClick={() => void search()}
          className="rounded-lg bg-[var(--accent-solid)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={loading || !query.trim()}
        >
          {loading ? "…" : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="mt-3 space-y-2">
          {results.map((r) => (
            <div key={r.volumeId} className="flex items-center gap-3 rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel)] p-2">
              {r.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.coverUrl} alt="" className="h-14 w-10 rounded object-cover" />
              ) : (
                <div className="h-14 w-10 rounded bg-[var(--bg-secondary)]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">{r.title}</p>
                <p className="truncate text-xs text-[var(--text-secondary)]">{r.authors.join(", ") || "Unknown author"}</p>
              </div>
              <div className="flex gap-1">
                {(["want", "reading", "read"] as BookShelf[]).map((shelf) => (
                  <button
                    key={shelf}
                    type="button"
                    onClick={() => void add(r, shelf)}
                    className="rounded-md border border-[var(--surface-border)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {shelf === "want" ? "Want" : shelf === "reading" ? "Reading" : "Read"}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create the books page (shelves)**

Create `src/components/books/books-page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useBooksStore } from "@/lib/stores/books-store";
import type { Book, BookShelf } from "@/lib/types";
import { AddBookBar } from "./add-book-bar";
import { BookDetail } from "./book-detail";

const SHELVES: { key: BookShelf; label: string }[] = [
  { key: "reading", label: "Reading" },
  { key: "want", label: "Want to read" },
  { key: "read", label: "Read" },
];

function Cover({ book, onClick }: { book: Book; onClick: () => void }) {
  const pct = book.totalPages && book.totalPages > 0 ? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100)) : 0;
  return (
    <button type="button" onClick={onClick} className="w-[78px] shrink-0 text-left">
      {book.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={book.coverUrl} alt="" className="h-[112px] w-[78px] rounded-md object-cover" />
      ) : (
        <div className="flex h-[112px] w-[78px] items-end rounded-md bg-[var(--bg-panel-strong)] p-1.5 text-[9px] font-semibold text-[var(--text-secondary)]">{book.title}</div>
      )}
      <p className="mt-1 line-clamp-2 text-[10px] text-[var(--text-secondary)]">{book.title}</p>
      {book.shelf === "reading" && (
        <div className="mt-1 h-[3px] rounded bg-[var(--surface-border)]"><div className="h-full rounded bg-[var(--accent-solid)]" style={{ width: `${pct}%` }} /></div>
      )}
      {book.shelf === "read" && book.rating ? (
        <p className="mt-1 text-[10px] text-[#e8c840]">{"★".repeat(book.rating)}{"☆".repeat(5 - book.rating)}</p>
      ) : null}
    </button>
  );
}

export function BooksPage() {
  const activePersona = usePersonaStore((s) => s.activePersona);
  const loaded = useBooksStore((s) => s.loaded);
  const load = useBooksStore((s) => s.load);
  const books = useBooksStore((s) => s.books);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => { void load(activePersona); }, [activePersona, load]);

  const openBook = books.find((b) => b.id === openId) ?? null;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <AddBookBar />
      {!loaded ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : (
        SHELVES.map(({ key, label }) => {
          const shelfBooks = books.filter((b) => b.shelf === key);
          return (
            <section key={key}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">{label}</p>
              {shelfBooks.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] opacity-60">Nothing here yet.</p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {shelfBooks.map((book) => <Cover key={book.id} book={book} onClick={() => setOpenId(book.id)} />)}
                </div>
              )}
            </section>
          );
        })
      )}
      <BookDetail book={openBook} onClose={() => setOpenId(null)} />
    </div>
  );
}
```

(`BookDetail` is built in Task 10. To keep this task compiling, create a minimal stub now — see Step 4 — then replace it in Task 10.)

- [ ] **Step 4: Create a minimal BookDetail stub (replaced in Task 10)**

Create `src/components/books/book-detail.tsx`:

```tsx
"use client";

import type { Book } from "@/lib/types";

export function BookDetail({ book, onClose }: { book: Book | null; onClose: () => void }) {
  if (!book) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="rounded-xl bg-[var(--bg-panel)] p-6" onClick={(e) => e.stopPropagation()}>
        <p className="text-lg font-bold text-[var(--text-primary)]">{book.title}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Ensure the books store loads with persona**

Open `src/components/store-initializer.tsx`. It coordinates per-persona store loads. Add a `useBooksStore` load alongside the existing read/work loads, following the exact pattern already in that file (find where `useReadStore`'s `load` is called on persona change and mirror it for `useBooksStore`). If the file does not load read-store explicitly, skip — the Books page's own `useEffect` already calls `load(activePersona)`. Verify by reading the file before editing.

- [ ] **Step 6: Write a render test**

Create `src/__tests__/components/books-page.test.tsx`:

```tsx
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { getDb } from "@/lib/db/database";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useBooksStore } from "@/lib/stores/books-store";
import { BooksPage } from "@/components/books/books-page";

describe("BooksPage", () => {
  beforeEach(async () => {
    await getDb("mani").books.clear();
    usePersonaStore.setState({ activePersona: "mani" });
    useBooksStore.setState({ books: [], loaded: false });
  });

  it("renders shelf headings and a created book", async () => {
    await useBooksStore.getState().createBook({
      googleVolumeId: null, title: "Dune", authors: ["Frank Herbert"],
      coverUrl: null, totalPages: 412, shelf: "reading",
    });
    render(<BooksPage />);
    expect(await screen.findByText("Reading")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("Dune").length).toBeGreaterThan(0));
  });
});
```

- [ ] **Step 7: Run test + typecheck**

Run: `npx vitest run src/__tests__/components/books-page.test.tsx` → PASS.
Run: `npx tsc --noEmit` → no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: books page with shelves and Google Books add flow"
```

---

### Task 10: Book detail panel (shelf / progress / rating / notes / words-from-book)

**Files:**
- Rewrite: `src/components/books/book-detail.tsx`
- Test: `src/__tests__/components/book-detail.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/components/book-detail.test.tsx`:

```tsx
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getDb } from "@/lib/db/database";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useBooksStore } from "@/lib/stores/books-store";
import { useReadStore } from "@/lib/stores/read-store";
import { BookDetail } from "@/components/books/book-detail";

describe("BookDetail", () => {
  beforeEach(async () => {
    await Promise.all([getDb("mani").books.clear(), getDb("mani").readRecords.clear()]);
    usePersonaStore.setState({ activePersona: "mani" });
    useBooksStore.setState({ books: [], loaded: true });
    useReadStore.setState({ records: [], loaded: true });
  });

  it("moves a book to Read and sets a rating", async () => {
    await useBooksStore.getState().createBook({
      googleVolumeId: null, title: "1984", authors: ["Orwell"], coverUrl: null, totalPages: 328, shelf: "reading",
    });
    const book = useBooksStore.getState().books[0];

    render(<BookDetail book={book} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /^read$/i }));
    await waitFor(() => expect(useBooksStore.getState().books[0].shelf).toBe("read"));

    fireEvent.click(screen.getByRole("button", { name: /rate 4/i }));
    await waitFor(() => expect(useBooksStore.getState().books[0].rating).toBe(4));
  });

  it("lists words tagged to this book", async () => {
    await useBooksStore.getState().createBook({
      googleVolumeId: null, title: "Dune", authors: ["Herbert"], coverUrl: null, totalPages: 412, shelf: "reading",
    });
    const book = useBooksStore.getState().books[0];
    await useReadStore.getState().createRecords([
      { word: "fremen", definition: "desert people", partOfSpeech: "noun", myDefinition: "", synonyms: [], allDefinitions: [], allSynonyms: [], sourceType: "book", bookId: book.id },
    ]);
    render(<BookDetail book={book} onClose={() => {}} />);
    expect(screen.getByText("fremen")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/components/book-detail.test.tsx`
Expected: FAIL — stub renders only the title.

- [ ] **Step 3: Implement the detail panel**

Replace `src/components/books/book-detail.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useBooksStore } from "@/lib/stores/books-store";
import { useReadStore } from "@/lib/stores/read-store";
import type { Book, BookShelf } from "@/lib/types";

const SHELVES: BookShelf[] = ["want", "reading", "read"];
const SHELF_LABEL: Record<BookShelf, string> = { want: "Want", reading: "Reading", read: "Read" };

export function BookDetail({ book, onClose }: { book: Book | null; onClose: () => void }) {
  const setShelf = useBooksStore((s) => s.setShelf);
  const setProgress = useBooksStore((s) => s.setProgress);
  const setRating = useBooksStore((s) => s.setRating);
  const updateBook = useBooksStore((s) => s.updateBook);
  const deleteBook = useBooksStore((s) => s.deleteBook);
  const live = useBooksStore((s) => s.books.find((b) => b.id === book?.id)) ?? book;
  const words = useReadStore((s) => s.records.filter((r) => r.bookId === book?.id));

  const [notes, setNotes] = useState(live?.notes ?? "");
  useEffect(() => { setNotes(live?.notes ?? ""); }, [live?.id]);

  if (!book || !live) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--surface-border)] bg-[var(--bg-panel)] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-4">
          {live.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={live.coverUrl} alt="" className="h-[120px] w-[84px] rounded-md object-cover" />
          ) : (
            <div className="h-[120px] w-[84px] rounded-md bg-[var(--bg-panel-strong)]" />
          )}
          <div className="min-w-0">
            <p className="text-lg font-bold text-[var(--text-primary)]">{live.title}</p>
            <p className="text-sm text-[var(--text-secondary)]">{live.authors.join(", ") || "Unknown author"}</p>
          </div>
        </div>

        {/* Shelf switch */}
        <div className="mt-4 flex gap-2">
          {SHELVES.map((shelf) => (
            <button
              key={shelf}
              type="button"
              onClick={() => void setShelf(live.id, shelf)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold ${live.shelf === shelf ? "border-[var(--accent-solid)] bg-[var(--bg-panel-strong)] text-[var(--text-primary)]" : "border-[var(--surface-border)] text-[var(--text-secondary)]"}`}
            >
              {SHELF_LABEL[shelf]}
            </button>
          ))}
        </div>

        {/* Progress */}
        <div className="mt-4">
          <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Progress</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={live.totalPages ?? undefined}
              value={live.currentPage}
              onChange={(e) => void setProgress(live.id, Number(e.target.value))}
              className="w-20 rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel-strong)] px-2 py-1 text-sm text-[var(--text-primary)]"
            />
            <span className="text-sm text-[var(--text-secondary)]">/ {live.totalPages ?? "?"} pages</span>
          </div>
        </div>

        {/* Rating */}
        <div className="mt-4">
          <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Rating</label>
          <div className="mt-1 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`Rate ${n}`} onClick={() => void setRating(live.id, n)} className="text-xl text-[#e8c840]">
                {live.rating && live.rating >= n ? "★" : "☆"}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4">
          <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => void updateBook(live.id, { notes })}
            rows={3}
            className="mt-1 w-full resize-none rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel-strong)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
          />
        </div>

        {/* Words from this book */}
        <div className="mt-4">
          <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Words from this book</label>
          {words.length === 0 ? (
            <p className="mt-1 text-xs text-[var(--text-secondary)] opacity-60">No words tagged yet.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {words.map((w) => (
                <li key={w.id} className="text-sm text-[var(--text-primary)]">{w.word}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 flex justify-between">
          <button type="button" onClick={() => { void deleteBook(live.id); onClose(); }} className="text-xs text-[var(--text-secondary)] hover:text-red-400">Delete</button>
          <button type="button" onClick={onClose} className="rounded-lg bg-[var(--accent-solid)] px-4 py-1.5 text-sm font-semibold text-white">Done</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/components/book-detail.test.tsx` → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: book detail with shelf, progress, rating, notes, linked words"
```

---

### Task 11: Dashboard hero rewrite + quick word-capture

**Files:**
- Create: `src/components/dashboard/quick-capture.tsx`
- Modify: `src/app/page.tsx` (replace the `#overview` section ~lines 1161–1270; remove `PERSONA_CARD_STYLE` ~lines 38–62 and its usages; remove the now-unused `Read`/`Work` tile markup and any now-unused imports like `Link` if unused, `getPersonaWhy` stays)
- Test: `src/__tests__/components/quick-capture.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/components/quick-capture.test.tsx`:

```tsx
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getDb } from "@/lib/db/database";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useBooksStore } from "@/lib/stores/books-store";
import { useReadStore } from "@/lib/stores/read-store";
import { QuickCapture } from "@/components/dashboard/quick-capture";

vi.mock("@/lib/read/dictionary", () => ({
  fetchDictionaryDefinition: vi.fn(async (word: string) => ({
    word, definition: "a test definition", partOfSpeech: "noun", allDefinitions: [], allSynonyms: [],
  })),
}));

describe("QuickCapture", () => {
  beforeEach(async () => {
    await Promise.all([getDb("mani").books.clear(), getDb("mani").readRecords.clear()]);
    usePersonaStore.setState({ activePersona: "mani" });
    useBooksStore.setState({ books: [], loaded: true });
    useReadStore.setState({ records: [], loaded: true });
  });

  it("saves a word tagged to the selected reading book on Enter", async () => {
    await useBooksStore.getState().createBook({
      googleVolumeId: null, title: "Meta", authors: ["X"], coverUrl: null, totalPages: 100, shelf: "reading",
    });
    const bookId = useBooksStore.getState().books[0].id;

    render(<QuickCapture />);
    fireEvent.click(screen.getByRole("button", { name: "Meta" }));

    const input = screen.getByPlaceholderText(/quick word/i);
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      const records = useReadStore.getState().records;
      expect(records).toHaveLength(1);
      expect(records[0].word).toBe("hello");
      expect(records[0].bookId).toBe(bookId);
    });
    expect(await screen.findByText("a test definition")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/components/quick-capture.test.tsx`
Expected: FAIL — `QuickCapture` not found.

- [ ] **Step 3: Implement QuickCapture**

Create `src/components/dashboard/quick-capture.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useBooksStore } from "@/lib/stores/books-store";
import { useReadStore } from "@/lib/stores/read-store";
import { fetchDictionaryDefinition } from "@/lib/read/dictionary";

const NO_BOOK = "__none__";

export function QuickCapture() {
  const readingBooks = useBooksStore((s) => s.books.filter((b) => b.shelf === "reading"));
  const createRecords = useReadStore((s) => s.createRecords);

  const [bookId, setBookId] = useState<string>(NO_BOOK); // sticky across entries
  const [word, setWord] = useState("");
  const [preview, setPreview] = useState<{ word: string; partOfSpeech: string; definition: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function capture() {
    const clean = word.trim();
    if (!clean || loading) return;
    setLoading(true);
    const result = await fetchDictionaryDefinition(clean);
    const tagged = bookId !== NO_BOOK ? bookId : null;
    await createRecords([
      {
        word: result.word || clean,
        definition: result.definition,
        partOfSpeech: result.partOfSpeech,
        myDefinition: "",
        synonyms: result.allSynonyms.slice(0, 2),
        allDefinitions: result.allDefinitions,
        allSynonyms: result.allSynonyms,
        sourceType: tagged ? "book" : "other",
        bookId: tagged,
      },
    ]);
    setPreview({ word: result.word || clean, partOfSpeech: result.partOfSpeech, definition: result.definition });
    setWord("");
    setLoading(false);
  }

  function clearPreview() {
    if (preview) setPreview(null);
  }

  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-secondary)] p-4">
      <div className="mb-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setBookId(NO_BOOK)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${bookId === NO_BOOK ? "border-[var(--accent-solid)] bg-[var(--bg-panel-strong)] text-[var(--text-primary)]" : "border-[var(--surface-border)] text-[var(--text-secondary)]"}`}
        >
          No book
        </button>
        {readingBooks.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBookId(b.id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${bookId === b.id ? "border-[var(--accent-solid)] bg-[var(--bg-panel-strong)] text-[var(--text-primary)]" : "border-[var(--surface-border)] text-[var(--text-secondary)]"}`}
          >
            {b.title}
          </button>
        ))}
      </div>

      <input
        value={word}
        onFocus={clearPreview}
        onChange={(e) => { setWord(e.target.value); clearPreview(); }}
        onKeyDown={(e) => { if (e.key === "Enter") void capture(); }}
        placeholder="Quick word capture — type and press Enter"
        className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
      />

      {preview && (
        <div className="mt-3 rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel)] p-3">
          <p className="text-base font-bold text-[var(--text-primary)]">{preview.word}</p>
          {preview.partOfSpeech ? <p className="text-xs italic text-[var(--text-secondary)]">{preview.partOfSpeech}</p> : null}
          <p className="mt-1 text-sm text-[var(--text-primary)]">{preview.definition || "No definition found — saved anyway."}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/components/quick-capture.test.tsx` → PASS.

- [ ] **Step 5: Rewrite the dashboard hero**

In `src/app/page.tsx`:

1. Add import: `import { QuickCapture } from "@/components/dashboard/quick-capture";` and `import { useBooksStore } from "@/lib/stores/books-store";`.
2. Add a books load effect alongside the work load effect (so reading-shelf chips are populated):

```tsx
  const booksLoad = useBooksStore((state) => state.load);
  useEffect(() => { void booksLoad(activePersona); }, [activePersona, booksLoad]);
```

3. Replace the entire `#overview` `<section>…</section>` block (the persona cards + Work/Read tiles, ~lines 1161–1270) with:

```tsx
      <section id="overview" className="dashboard-anchor space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="font-[family-name:var(--font-display)] text-3xl font-bold leading-none text-[var(--text-primary)] md:text-4xl">
              {getPersonaWhy(activePersona)}
            </p>
            <p className="mt-1 font-mono text-xs tabular-nums text-[var(--text-secondary)]">{personaDateLabel}</p>
          </div>
        </div>
        <QuickCapture />
      </section>
```

4. Delete the `PERSONA_CARD_STYLE` constant (~lines 38–62) and confirm no remaining references (`grep PERSONA_CARD_STYLE src/app/page.tsx`).
5. Remove now-unused imports if the typecheck flags them (e.g. `Link` if no longer used elsewhere in the file — verify with `grep "<Link" src/app/page.tsx`; `readRecords`/`workLoaded` derived values used only by the removed tiles can stay or be cleaned — let `tsc`/eslint guide you).

- [ ] **Step 6: Run full test suite + typecheck**

Run: `npm test` → all pass.
Run: `npx tsc --noEmit` → no errors.

- [ ] **Step 7: Manual smoke test**

Run: `npm run dev`, open the app:
- Header shows persona avatars (switch works), 4 nav icons, theme + logout.
- Dashboard hero shows the why-word + quick-capture; selecting a Reading book chip stays selected across entries; Enter saves a word and shows the definition; refocusing the input clears the definition.
- `/books`: search adds a book to a shelf; clicking a cover opens detail; shelf/rating/notes/progress persist; words tagged via quick-capture appear under the book.
- `/words` loads (renamed route); the `/word?id=` detail still works and its back link goes to `/words`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: dashboard hero with quick word-capture; drop persona cards"
```

---

## Post-implementation (requires user permission)

- Apply the two Supabase migrations to the remote project (via Supabase MCP `apply_migration` or `supabase db push`): `20260623000000_read_records_add_book_id` and `20260623000001_create_books`. **Do not apply without asking** (per project rule: no deploy/remote changes without permission).
- Set `GOOGLE_BOOKS_API_KEY` in the deployment environment.

---

## Self-review notes (coverage check)

- Spec §1 global header → Task 8. §2 hero → Task 11. §3 Books (route/components/UI/model/store/Supabase/lookup) → Tasks 3–7, 9, 10. §4 Words rename → Task 2; Word↔book link → Task 1 (bookId) + Task 10 (book→words) + Task 11 (capture tags). Persona-scoping/sync → Tasks 4–6. Testing → tests in each task. Dead-code deletion → Task 8.
- Type names consistent across tasks: `Book`, `BookShelf`, `BookSearchResult`, `useBooksStore`, `setShelf/setProgress/setRating`, `parseGoogleBooks`, `bookId`.
- No placeholders: all code blocks complete; icon glyphs are intentional interim values (final icons deferred per spec open item).
