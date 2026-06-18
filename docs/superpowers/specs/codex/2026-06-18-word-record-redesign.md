# Word Record Redesign + Word Detail Page

Date: 2026-06-18

## Summary

Two connected changes to the Read feature:

1. **Ledger redesign** — replace the horizontal-scroll table with dictionary-entry style rows. Adds `myDefinition` and `synonyms` display.
2. **Word detail page** — new route `/word/[id]` where the user can pick one definition from all API results, toggle up to 2 synonyms (API or custom), and write their own definition. Changes save back to the existing `ReadRecord`.

## Decisions

- Max 2 synonyms per word. Enforced in the Word page UI and in `createRecords` / `updateRecord` input.
- `allDefinitions` and `allSynonyms` are cached in the record at save time. The Word page does not re-fetch from dictionaryapi.dev.
- `myDefinition` is optional. If blank, nothing renders in that slot in the ledger.
- `synonyms` is optional. If empty, the synonym row does not render in the ledger.
- Delete button in the ledger is always visible (not gated on hover).
- `/word/[id]` is a standalone Next.js page, not a modal.

## Data Model

Add four fields to `ReadRecord` in `src/lib/types.ts`:

```ts
export interface ReadRecord {
  id: string;
  word: string;
  partOfSpeech: string;
  definition: string;           // selected definition text
  myDefinition: string;         // user's own take; shown above definition in ledger
  synonyms: string[];           // max 2; mix of API picks and custom entries
  allDefinitions: Array<{       // cached from dictionaryapi.dev at first save
    partOfSpeech: string;
    definition: string;
    example?: string;
  }>;
  allSynonyms: string[];        // cached API synonyms; shown as toggles on Word page
  sourceType: ReadSourceType;
  createdAt: string;
  updatedAt: string;
}
```

Default values for existing records (Dexie migration): `myDefinition: ""`, `synonyms: []`, `allDefinitions: []`, `allSynonyms: []`.

## Dictionary Parser Changes

`fetchDictionaryDefinition` in `src/lib/read/dictionary.ts` currently returns only the first definition. Extend it to also return `allDefinitions` and `allSynonyms`:

```ts
interface DictionaryResult {
  word: string;
  definition: string;
  partOfSpeech: string;
  allDefinitions: Array<{ partOfSpeech: string; definition: string; example?: string }>;
  allSynonyms: string[];
}
```

`allDefinitions` = all definition entries across all meanings in the first API response object.
`allSynonyms` = all synonyms across all meanings, deduplicated.

## Ledger Layout (Dictionary Entry Style)

Replace `ReadRecordList` table with a list of dictionary entries grouped by day.

Per entry:

```
ephemeral  adj.                                          📖 book · 2:14pm  [×]
"things that don't last long, like a vibe"
Lasting for a very short time; transitory.
fleeting · transient
```

- **Row 1**: word as `<Link href="/word/[id]">` (bold), POS (italic muted), source badge + time right-aligned, delete button (always visible)
- **Row 2**: `myDefinition` in accent italic — omitted if blank
- **Row 3**: `definition` in muted text
- **Row 4**: `synonyms` as small chips — omitted if empty

Inline editing is removed. All edits go through the Word detail page.

## Word Detail Page

Route: `src/app/word/[id]/page.tsx`

Sections in order:

### Header
- Back link → `/read`
- Word (large bold) + POS
- Source type badge

### My Definition
- Accent-styled `<textarea>`
- Placeholder: "Write your own take on this word…"
- Displayed above the actual definition in the ledger

### Definition — pick one
- Radio card list rendered from `record.allDefinitions`
- Currently selected `record.definition` is pre-selected on load
- Selecting a card updates local state; saved on Save
- If `allDefinitions` is empty (word saved before this feature), show the stored `definition` as the only non-interactive option with a note: "Re-open this word from the Read page to load all definitions"

### Synonyms
- Toggle chips from `record.allSynonyms`
- Custom text input: type a word + Enter or press "+ Add"
- Max 2 selected total (API + custom combined)
- At limit: unselected chips fade and are unclickable; input disabled
- Counter badge: `0 / 2`, `1 / 2`, `2 / 2` — turns accent color at limit
- Custom chips shown with dashed border + × to remove

### Save
- Writes `myDefinition`, `definition` (selected), `synonyms`, back to the record via `updateRecord`
- `allDefinitions` and `allSynonyms` are not re-written on save (they are set once at capture time)
- ⌘↵ keyboard shortcut
- On success: navigate back to `/read`

## Persistence

`allDefinitions` and `allSynonyms` are set when a record is first created (via OCR word tap or text search). They are never overwritten by the Word page save. Dexie schema version bumps by 1 to add the new fields with default values via a migration.

## Navigation

- Word text in each ledger entry is `<Link href={`/word/${record.id}`}>` — styled as a plain text link, no underline, inherits word font weight
- No change to bottom nav or sidebar

## Error Handling

- Word page: if `record.id` not found in store → redirect to `/read`
- Word page: if `allDefinitions` empty → show existing definition as read-only with note
- Save with no definition selected: keep existing `definition` unchanged

## Tests

- `ReadRecord` stores and loads all four new fields correctly
- Dexie migration populates defaults for existing records without data loss
- `fetchDictionaryDefinition` returns `allDefinitions` and `allSynonyms` from API response
- Word page saves `myDefinition`, `synonyms`, `definition` back to existing record — no duplicate created
- Max 2 synonyms: adding a 3rd via custom input is blocked
- Ledger omits `myDefinition` row when blank, omits synonym row when empty
- Delete button present in DOM without hover interaction

## Scope Exclusions

- No re-fetch of definitions on the Word page
- No synonym search / auto-suggest beyond what dictionaryapi.dev returns
- No inline editing in the ledger (removed)
- No image or OCR changes
- No Supabase schema changes
