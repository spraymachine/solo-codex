# Read Feature Design

Date: 2026-06-13

## Summary

Add a standalone `Read` route for persona-private vocabulary capture. The user can take or upload a photo of a book, note, newspaper, or other reading source, run OCR with OCR.space, tap detected words directly on the image preview, fetch definitions from dictionaryapi.dev, edit definitions, and save selected words as private records for the active persona.

This feature is not part of `Dashboard` or `Work`. It lives beside them as a first-class route.

## Decisions

- `Read` is persona-private, scoped to the active persona database.
- OCR provider is OCR.space.
- OCR request uses `isOverlayRequired=true` so word boxes can be rendered on the image preview.
- Definition provider is dictionaryapi.dev.
- Capture supports camera and upload through `input type="file"` with `accept="image/*"` and `capture="environment"`.
- Saved records do not persist images.
- Saved records do not persist full OCR text.
- Saved records store selected words only.
- Organization features such as tags, folders, and collections are outside v1.
- No Supabase schema changes, migrations, hosted DB writes, RLS edits, Edge Function deploys, or Supabase CLI/MCP mutations are allowed in this implementation.

## Product Flow

1. User opens `/read`.
2. User presses `Camera`.
3. Browser opens device camera when available or image upload fallback.
4. App compresses the image client-side if it is larger than OCR.space free-tier limits.
5. App sends the image directly to OCR.space.
6. OCR.space returns text overlay data with word bounding boxes.
7. App renders the image preview with tappable word boxes.
8. User taps one or more boxes.
9. Tapped boxes receive a highlighter-style overlay.
10. App fetches the first English definition for each selected word from dictionaryapi.dev.
11. User edits word, part of speech, or definition if needed.
12. User saves selected words.
13. Saved records appear below, newest first and grouped by day.

## Data Model

```ts
export type ReadSourceType = "book" | "note" | "newspaper" | "other";

export interface ReadRecord {
  id: string;
  word: string;
  definition: string;
  partOfSpeech: string;
  sourceType: ReadSourceType;
  createdAt: string;
  updatedAt: string;
}
```

The current persona is already represented by separate IndexedDB databases, so `ownerPersona` is implicit in database selection.

## Persistence

`ReadRecord` rows are stored in the existing persona-local Dexie database. Add a new `readRecords` table.

This implementation intentionally does not include `readRecords` in `AppSnapshot` or CloudSync. No new Supabase tables are created, no migrations are required for v1, and Read records stay local to the persona IndexedDB database.

## OCR

Use direct browser `fetch` to OCR.space because this project is configured with `output: "export"` for static hosting, and POST route handlers are not deployable to GitHub Pages static export.

Configuration:

- `NEXT_PUBLIC_OCR_SPACE_API_KEY` optional.
- If unset, use OCR.space's demo key `helloworld`, with the provider's demo limits.
- Request endpoint: `https://api.ocr.space/parse/image`.
- Request fields: `apikey`, `file`, `language=eng`, `isOverlayRequired=true`, `detectOrientation=true`, `scale=true`, `OCREngine=2`.

## Definitions

Use dictionaryapi.dev directly from the browser:

`https://api.dictionaryapi.dev/api/v2/entries/en/<word>`

The app stores the first available definition and part of speech. If no definition is found, save is still possible with an editable blank definition.

## Error Handling

- OCR request fails: show an inline error and keep `New image` available.
- OCR returns no word boxes: show `No words found`.
- Dictionary lookup fails: keep the selected word with blank editable definition fields.
- Large image: compress client-side before OCR.
- Save with no completed selected words: no-op.

## UI

Page order:

1. Header with `Read`, active persona badge, and camera button.
2. Capture card with source selector.
3. Image review area with OCR word boxes.
4. Selected word editor.
5. Saved records grouped by day.

Visual rules:

- Selected OCR boxes use a highlighter color.
- Unsaved OCR image preview is temporary.
- Saved records are compact cards with word, part of speech, definition, source type, and time.

## Tests

Required coverage:

- OCR.space parser extracts word boxes and rejects provider errors.
- dictionaryapi.dev parser extracts first definition and handles missing definitions.
- storage creates and loads persona-private Read records.
- Read store does not leak records across persona switches.
- Read page renders the capture surface and saved records.

## Scope Exclusions

- No image persistence.
- No full OCR text persistence.
- No AI provider.
- No tags, folders, or record organization.
- No Supabase schema changes.
- No Supabase migrations applied.
- No Supabase Edge Functions.
