# Books, Words rename & dashboard/header revamp — design

**Date:** 2026-06-23
**Status:** Approved design, pre-implementation

## Goal

Three connected changes to the personal OS dashboard:

1. **Add a Books feature** — a separate page tracking books across three shelves (Want to read / Reading / Read), with progress, ratings, notes, and Google Books lookup.
2. **Rename the existing "Read" feature to "Words"** — the vocabulary/OCR capture flow. URL `/read` → `/words`. Internal store/table names stay `read*` to avoid data migration.
3. **Revamp the dashboard hero + introduce a global header** — persona letter-avatars replace the two big persona cards, a global header carries the primary nav, and the hero gains an inline quick word-capture bar that ties Words to Books.

All new data is **persona-scoped and Supabase-synced**, mirroring the existing `work-store` / `read-store` local-first pattern.

---

## 1. Global header (all pages)

Replace the current `SiteHeader` (which only floats theme + logout top-right) with a full-width global header mounted in `src/app/layout.tsx`. Present on every page.

Layout, left → right:

- **Left — persona avatars.** One round letter-avatar per allowed persona (initial of `personaMeta[p].label`, tinted with `meta.accent`). Active persona gets a glowing ring (`box-shadow` double-ring). Tap → `setActivePersona`. Preserve the existing double-tap → `selectCurrentDate()` (jump to today) behavior from the old cards.
- **Center — 4 icon nav links:** Dashboard (`/`), Books (`/books`), Words (`/words`), Work (`/work`). Icon set supplied later by the user — leave a clearly-marked icon slot per item (placeholder glyphs for now). Active route highlighted via `usePathname`.
- **Right — theme toggle + logout.** Reuse the existing `SunIcon`/`MoonIcon`/`SignOutIcon` + handlers from the current `SiteHeader`.

Notes:
- The header is the **first real nav** in the app — nothing else mounts nav today.
- **Delete dead code:** `src/components/layout/sidebar.tsx`, `src/components/layout/bottom-nav.tsx`, and `nav-item.tsx`/`persona-switcher.tsx` if unreferenced after this change. Verify with grep before deleting.
- Persona avatars use `getAllowedPersonas(user?.email)` — same source the old cards used.

## 2. Dashboard hero

Replace the two big persona cards (`src/app/page.tsx`, the `#overview` section, ~lines 1161–1270) with:

- **Header row:** active persona's "why" word (`getPersonaWhy(activePersona)`, e.g. `Self-worth`) + date label (`personaDateLabel`), aligned left. (Persona switching itself now lives in the global header, not here.)
- **Quick word-capture bar** (the main hero element) — see §4.

The old `Work` + `Read` stat tiles and `PERSONA_CARD_STYLE` block are removed from the hero. Per-feature stats are no longer shown on the dashboard (nav lives in the global header as plain icons). The rest of the dashboard below the hero (Sticky wall, Daily missions, Arcs, etc.) is unchanged.

## 3. Books feature

### Route & components
- `src/app/books/page.tsx` (client route).
- `src/components/books/books-page.tsx` — shelves + add flow.
- `src/components/books/book-detail.tsx` — detail panel/modal.

### UI — stacked shelves
A search/add bar at top, then three stacked shelves, each a horizontal cover strip:
- **Reading** — each cover shows a % progress bar (`currentPage / totalPages`).
- **Want to read** — covers only.
- **Read** — covers show star rating.

**Add flow:** type title/author in the search bar → query Google Books via an internal API route → show results → pick one → autofills `title`, `authors`, `coverUrl`, `totalPages`, `googleVolumeId` → lands on a chosen shelf (default: Want to read).

**Book detail panel** (click a cover): cover, title/author, shelf switcher (want/reading/read), page progress (current/total → %), 1–5 star rating, notes/review textarea, and a **"Words from this book"** list (Words records whose `bookId` matches). Moving a book to "Reading" stamps `startedAt`; to "Read" stamps `finishedAt`.

### Data model
Add to `src/lib/types.ts`:

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
  currentPage: number;       // 0 when not started
  rating: number | null;     // 1–5, set when read
  notes: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Store
`src/lib/stores/books-store.ts` — zustand, mirroring `read-store.ts`:
- Local-first via IndexedDB (`getDb`/`storage`), persona-scoped `load(persona)` with the same active-persona guard.
- Fire-and-forget Supabase sync helper (`syncBooksToSupabase`) that never throws/blocks UI.
- Legacy-data migration to the default persona, matching the work/read precedent.
- Actions: `load`, `createBook(input)`, `updateBook(id, updates)`, `deleteBook(id)`, plus convenience `setShelf`, `setProgress`, `setRating`.

### Supabase
- New migration `supabase/migrations/<ts>_create_books.sql` mirroring `read_records`: `id`, `user_id`, `persona` (same check constraint), book columns (snake_case: `google_volume_id`, `cover_url`, `total_pages`, `current_page`, `started_at`, `finished_at`), `created_at`, `updated_at`. Index on `(user_id, persona)`. RLS "users manage own books". Add to `supabase_realtime` publication.
- `src/lib/supabase/books.ts` — `getBooksUserId`, `rowToBook`, `fetchBooks`, `sbCreateBook`, `sbUpdateBook`, `sbDeleteBook`, mirroring `read.ts`.

### Google Books lookup
- **Internal API route** `src/app/api/books/search/route.ts` — server-side, reads `GOOGLE_BOOKS_API_KEY` from env (never exposed to client). Takes `?q=`, calls Google Books Volumes API, returns a trimmed list `{ volumeId, title, authors, coverUrl, totalPages }`.
- Client calls `/api/books/search?q=...` from the add bar. Handle empty results + errors gracefully.
- Document `GOOGLE_BOOKS_API_KEY` in `.env` / `.env.example`.

## 4. Words (rename of Read) + quick-capture

### Rename
- Move route `src/app/read/` → `src/app/words/` (`/read` → `/words`).
- Update all user-facing labels "Read" → "Words".
- Update internal back-links in `src/components/word/word-page.tsx` (3 occurrences of `/read` → `/words`: `router.replace`, `router.push`, and the `href`).
- **Keep** the `/word?id=` single-word detail route as-is.
- **Do NOT rename** internal identifiers: `read-store.ts`, `useReadStore`, `read_records` table, `ReadRecord`, `src/lib/supabase/read.ts`. This avoids any data migration. Only the URL and visible labels change.

### Word → Book link
- Add `bookId?: string | null` to `ReadRecord` (`src/lib/types.ts`).
- Add `book_id uuid` column to `read_records` (new migration) + map it in `rowToReadRecord` / create / update in `src/lib/supabase/read.ts`. Nullable; no backfill.
- Word detail (`word-page.tsx`) shows the source book when `bookId` is set.
- Book detail lists Words where `bookId === book.id`.

### Quick word-capture bar (dashboard hero)
A capture widget at the top of the dashboard:
- **Sticky book filter chips:** one chip per book on the **Reading** shelf, plus a **"No book"** chip. Selecting a chip is **sticky** — it persists across consecutive captures so the user can add many words from the same book. Default selection: "No book" (or last used).
- **Search input:** type a word, press **Enter** → look up the definition using the **same dictionary lookup `/read` (Words) already uses** for OCR words → a **definition box opens below** (word, part of speech, definition).
- **Save on Enter:** the word is persisted to Words records the moment the definition resolves, tagged with the currently-selected chip's `bookId` (null for "No book"), `sourceType: "book"` when a book is selected.
- **Replace behavior:** the definition box is a preview/confirmation. Focusing the search bar again or typing **clears the shown definition**; the next word typed + Enter replaces it. (Each Enter already saved its word, so clearing the preview never loses data.)

---

## Architecture & isolation

- **Books store** is independent, single-purpose, and follows the established `read-store`/`work-store` interface (load/create/update/delete + persona guard + Supabase sync). Understandable and testable on its own.
- **Header** is a self-contained component; persona-switch and nav are its only responsibilities.
- **Quick-capture** is a hero-local component that depends only on: `useReadStore` (save), `useBooksStore` (reading-shelf chips), and the existing dictionary lookup util. No new cross-cutting coupling.
- **Google Books key** stays server-side behind an API route — the only secret in play.

## Testing

- `books-store` unit tests mirroring the read/work store tests: persona isolation, legacy migration, CRUD, shelf transitions stamping `startedAt`/`finishedAt`.
- Quick-capture: word saved on Enter with correct `bookId`; sticky chip persists across captures; preview clears on refocus without losing saved records.
- Word↔book link: `bookId` round-trips through Supabase mapping; book detail filters words correctly.
- API route: returns trimmed results, handles empty query and upstream errors.

## Out of scope

- Reordering books within a shelf.
- Reading-time analytics / charts.
- Changing the persona set (stays mani/harti/persona1/persona2).
- Renaming internal `read*` identifiers or the `/word` detail route.

## Open items deferred to implementation

- Final nav icons for the 4 header items (user will supply).
- Exact mobile sizing of the header (avatars + 4 icons + controls must fit a phone width — likely icon-only, no labels on mobile).
