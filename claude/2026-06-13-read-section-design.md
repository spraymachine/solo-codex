# Read Section — Design Spec

Date: 2026-06-13
Status: Approved for planning

## Summary

A new standalone section, **Read**, sitting alongside Dashboard, Work, Gates, etc. The
user taps a camera button, photographs a book / note / newspaper, drags a highlight box
over a word or phrase, and the app extracts that text (OCR), looks up its definition, and
saves it as a record. The growing list of defined words below is a personal vocabulary
glossary. Records can be searched now and organised (tags) later.

Captured images are **transient** — they exist only during capture → highlight → OCR,
then are discarded. Nothing about an image is persisted.

## Decisions (locked)

| Decision | Choice | Notes |
|----------|--------|-------|
| Highlight flow | Draw box → OCR that region | Fallback: if OCR can't read it, user types the term manually |
| Definition source | Free dictionary API (`api.dictionaryapi.dev`) | Behind an interface; AI fallback to revisit later |
| OCR engine | Tesseract.js, in-browser | Free, offline, local-first. Alternatives pinned for later discussion |
| Capture method | Native camera + gallery (file input, `capture="environment"`) | No in-app live camera |
| Record unit | One word/phrase per record | Vocab glossary |
| Image storage | None | Image discarded after text extraction |
| Organise (tags/sort) | Data model ready now, UI later | `tags[]` field present from v1 |

## Pinned for later discussion

- Definition source alternatives / AI fallback (phrases, proper nouns, foreign words, context).
- OCR engine alternatives to Tesseract.js (accuracy on small/handwritten text).
- Organise UI: tagging, sorting, filtering, grouping the records.

## Architecture

Follows existing section conventions: a route in `src/app/<name>/`, a component tree in
`src/components/<name>/`, a zustand store in `src/lib/stores/`, persistence through the
Dexie `storage` layer, and cloud sync via the existing Supabase sync.

### Route & navigation
- `src/app/read/page.tsx` → renders `<ReadPage />` (mirrors `src/app/work/page.tsx`).
- Add nav item to `src/components/layout/sidebar.tsx`: `{ href: "/read", icon: "◫", label: "Read" }`.
- Add nav item to `src/components/layout/bottom-nav.tsx`: `{ href: "/read", label: "Read" }`.

### Data model — `src/lib/types.ts`

```ts
export interface ReadRecord {
  id: string;
  persona: Persona;
  term: string;            // the word or phrase
  partOfSpeech?: string;
  definition: string;      // primary meaning
  phonetic?: string;       // e.g. /ɪˈfɛm(ə)rəl/
  example?: string;        // dictionary's own example sentence, if any
  tags: string[];          // empty in v1; powers "organise" later
  createdAt: string;       // ISO timestamp
}
```

No image fields. No source-page reference.

### Persistence — `src/lib/db/database.ts` + `src/lib/db/storage.ts`
- Add Dexie table via a new `version(N)` bump: `readRecords: "id, persona, createdAt"`.
  No `.upgrade()` migration needed — new empty table.
- `storage.ts` methods (persona-scoped, matching existing patterns):
  - `getReadRecords({ persona }): Promise<ReadRecord[]>` — sorted newest first.
  - `addReadRecord(record: ReadRecord): Promise<void>`
  - `updateReadRecord(id, patch): Promise<void>`
  - `deleteReadRecord(id): Promise<void>`

### Cloud sync — `src/components/system/cloud-sync.tsx`
- Register `readRecords` in the sync set so it pushes/pulls like the other tables.
  (Follow whatever per-table registration the existing stores use; mirror `hunterRecords`.)

### Store — `src/lib/stores/read-store.ts`
Zustand, persona-scoped, shaped like `records-store.ts`:

```ts
interface ReadState {
  records: ReadRecord[];
  loaded: boolean;
  load: (persona?: Persona) => Promise<void>;
  addRecord: (input: NewReadRecord) => Promise<void>;
  updateRecord: (id: string, patch: Partial<ReadRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
}
```
- `load` guards against persona switches mid-flight (same pattern as `records-store.ts`).
- No XP tie-in. Saving a word grants nothing — it is a glossary, not a scored action.

### Components — `src/components/read/`
- `read-page.tsx` — header with saved-word count, "Scan a word" button, search input,
  and the records list. Loads the store on mount for the active persona.
- `scan-flow.tsx` — the modal/sheet that drives the 4 capture steps. **Holds the captured
  image in local component state only** (object URL / blob), never in a store or Dexie.
  Revokes the object URL on unmount.
- `highlight-canvas.tsx` — renders the captured image; one draggable selection box via
  pointer events; outputs the box rectangle in image-pixel coordinates.
- `read-record-form.tsx` — confirm/edit the extracted term + fetched definition before
  saving. Doubles as the manual-entry fallback when OCR yields nothing usable.
- `record-card.tsx` — one saved word (term, part of speech, definition); edit / delete.

### Lib (pure, unit-testable) — `src/lib/read/`
- `crop.ts` — `cropToBlob(image, rect): Promise<Blob>`. Draws the boxed region to an
  offscreen canvas and exports a blob. Pure given an image source.
- `ocr.ts` — `recognize(imageBlob): Promise<string>`. Wraps Tesseract.js. **Lazy-loads**
  the engine (dynamic import) so the wasm/model only downloads on first scan, not on
  section load. Returns trimmed text; caller decides if it's usable.
- `dictionary.ts` — `lookup(term): Promise<DefinitionResult | null>` behind a
  `DefinitionProvider` interface. v1 implementation calls
  `https://api.dictionaryapi.dev/api/v2/entries/en/<term>` and normalises the first
  entry into `{ term, partOfSpeech, definition, phonetic, example }`. Returns `null` on
  404 / no entry. The interface is the seam for a future AI provider.

## Data flow (capture → record)

1. User taps **Scan a word** → hidden `<input type="file" accept="image/*" capture="environment">` fires.
2. Selected/captured image → object URL → `scan-flow` local state → `highlight-canvas`.
3. User drags one box. On confirm, `crop.ts` produces a blob of just that region.
4. `ocr.ts` recognises text from the crop → candidate `term`.
5. `dictionary.ts` looks up the term:
   - **Hit** → prefill `read-record-form` with term + definition.
   - **Miss / OCR empty** → form opens with the (possibly empty) term editable; user
     fixes the term and/or types a definition manually.
6. User confirms → `read-store.addRecord(...)` → persisted via `storage` → synced.
7. `scan-flow` closes; object URL revoked; **image gone**. New record appears in the list.

## Error handling

- **No camera / permission denied** — file input simply yields nothing; flow is a no-op.
  No crash; user can retry or pick from gallery.
- **OCR fails or returns garbage/empty** — fall through to manual entry in
  `read-record-form` (term field editable, definition typeable). Never blocks saving.
- **Dictionary API down / offline / 404** — `lookup` returns `null`; form opens with an
  empty definition for manual entry. Show a quiet inline note ("no definition found —
  add your own"), not an error toast.
- **Tesseract lazy-load fails** — surface a retry; allow manual entry without OCR.
- **Empty term on save** — disable the save button until `term` is non-empty.
- **Persona switch mid-scan** — `addRecord` stamps the persona active at save time; store
  `load` guards already drop stale loads.

## Testing

Unit (vitest, the existing runner; `fake-indexeddb` already available):
- `crop.ts` — given a known image + rect, exports a blob of expected dimensions.
- `dictionary.ts` — mock `fetch`; assert normalisation of a real API payload, and `null`
  on 404 / empty array.
- `read-store.ts` — `addRecord` persists and updates state; persona scoping; delete;
  update; mid-flight persona-switch guard (mirror existing `records-store` tests).
- `storage.ts` — `readRecords` CRUD round-trips against `fake-indexeddb`; persona filter.

OCR (`ocr.ts`) is integration-heavy (wasm); keep it thin and mock it at the `scan-flow`
boundary rather than unit-testing Tesseract itself.

Component tests (`@testing-library/react`) optional for v1; cover `read-page` rendering a
list and the search filter if time allows.

## Out of scope (v1)

- Saving / revisiting source images.
- AI definition provider (interface ready; implementation later).
- Tag/organise UI (field ready; UI later).
- In-app live camera.
- Multi-word phrase-aware lookup beyond what the dictionary API returns per term.
