"use client";

import { useState } from "react";
import { useBooksStore } from "@/lib/stores/books-store";
import { useReadStore } from "@/lib/stores/read-store";
import { useAuth } from "@/components/auth/auth-gate";
import {
  fetchDictionaryDefinition,
  fetchFromDictionaryApi,
  fetchFromWiktionary,
  fetchFromWordnik,
  type ReadDefinition,
} from "@/lib/read/dictionary";
import { RateLimitError } from "@/lib/rate-limiter";

const NO_BOOK = "__none__";

const DEFINITION_SOURCES = [
  { label: "Wordnik", fetcher: fetchFromWordnik },
  { label: "DictionaryAPI", fetcher: fetchFromDictionaryApi },
  { label: "Wiktionary", fetcher: fetchFromWiktionary },
] as const;

export function QuickCapture() {
  const books = useBooksStore((s) => s.books);
  const readingBooks = books.filter((b) => b.shelf === "reading");
  const createRecords = useReadStore((s) => s.createRecords);
  const updateRecord = useReadStore((s) => s.updateRecord);
  const records = useReadStore((s) => s.records);
  const { user } = useAuth();

  const [bookId, setBookId] = useState<string>(NO_BOOK); // sticky across entries
  const [word, setWord] = useState("");
  const [preview, setPreview] = useState<{ id: string; word: string; partOfSpeech: string; definition: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fetchingSource, setFetchingSource] = useState<string | null>(null);

  const dialogRecord = dialogOpen && preview ? records.find((r) => r.id === preview.id) : undefined;

  async function capture() {
    const clean = word.trim();
    if (!clean || loading) return;
    setLoading(true);
    setError("");
    try {
      const existing = records.find((r) => r.word.toLowerCase() === clean.toLowerCase());
      if (existing) {
        setPreview({ id: existing.id, word: existing.word, partOfSpeech: existing.partOfSpeech, definition: existing.definition });
        setWord("");
        return;
      }

      let result: ReadDefinition;
      try {
        result = await fetchDictionaryDefinition(clean, user?.id);
      } catch (err) {
        if (err instanceof RateLimitError) {
          setError(err.message);
          return;
        }
        result = { word: clean, definition: "", partOfSpeech: "", allDefinitions: [], allSynonyms: [] };
      }
      const tagged = bookId !== NO_BOOK ? bookId : null;
      const [created] = await createRecords([
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
      setPreview(created ? { id: created.id, word: created.word, partOfSpeech: created.partOfSpeech, definition: created.definition } : null);
      setWord("");
    } finally {
      setLoading(false);
    }
  }

  function clearPreview() {
    if (preview) setPreview(null);
  }

  async function handleFetchSource(sourceLabel: string, fetcher: (word: string) => Promise<ReadDefinition | null>) {
    if (!dialogRecord || fetchingSource) return;
    setFetchingSource(sourceLabel);
    try {
      const result = await fetcher(dialogRecord.word);
      if (!result || result.allDefinitions.length === 0) return;
      const keptDefinitions = dialogRecord.allDefinitions.filter((d) => d.source !== sourceLabel);
      const allDefinitions = [...keptDefinitions, ...result.allDefinitions];
      const allSynonyms = Array.from(new Set([...dialogRecord.allSynonyms, ...result.allSynonyms]));
      await updateRecord(dialogRecord.id, { allDefinitions, allSynonyms });
    } finally {
      setFetchingSource(null);
    }
  }

  async function pickDefinition(definition: string, partOfSpeech: string) {
    if (!dialogRecord) return;
    await updateRecord(dialogRecord.id, { definition, partOfSpeech });
    setPreview({ id: dialogRecord.id, word: dialogRecord.word, partOfSpeech, definition });
    setDialogOpen(false);
  }

  async function deleteDefinition(index: number) {
    if (!dialogRecord) return;
    const removed = dialogRecord.allDefinitions[index];
    const allDefinitions = dialogRecord.allDefinitions.filter((_, i) => i !== index);
    await updateRecord(dialogRecord.id, { allDefinitions });
    if (removed && dialogRecord.definition === removed.definition) {
      const fallback = allDefinitions[0];
      await updateRecord(dialogRecord.id, { definition: fallback?.definition ?? "", partOfSpeech: fallback?.partOfSpeech ?? "" });
    }
  }

  async function clearRestDefinitions(index: number) {
    if (!dialogRecord) return;
    const kept = dialogRecord.allDefinitions[index];
    if (!kept) return;
    await updateRecord(dialogRecord.id, { allDefinitions: [kept], definition: kept.definition, partOfSpeech: kept.partOfSpeech });
    setPreview({ id: dialogRecord.id, word: dialogRecord.word, partOfSpeech: kept.partOfSpeech, definition: kept.definition });
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

      {error && (
        <div className="mt-3 rounded-lg border border-red-500 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {preview && (
        <div className="mt-3 rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel)] p-3">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="text-left text-base font-bold text-[var(--text-primary)] underline-offset-2 hover:underline"
          >
            {preview.word}
          </button>
          {preview.partOfSpeech ? <p className="text-xs italic text-[var(--text-secondary)]">{preview.partOfSpeech}</p> : null}
          <p className="mt-1 text-sm text-[var(--text-primary)]">{preview.definition || "No definition found — saved anyway."}</p>
        </div>
      )}

      {dialogOpen && dialogRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDialogOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">{dialogRecord.word}</h2>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-full border border-[var(--surface-border)] px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            <div className="mb-3 flex gap-2">
              {DEFINITION_SOURCES.map(({ label, fetcher }) => (
                <button
                  key={label}
                  type="button"
                  disabled={fetchingSource !== null}
                  onClick={() => void handleFetchSource(label, fetcher)}
                  className="rounded-full border border-[var(--surface-border)] px-3 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-solid)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {fetchingSource === label ? "Fetching…" : `Try ${label}`}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {dialogRecord.allDefinitions.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">No definitions yet — try a source above.</p>
              ) : (
                dialogRecord.allDefinitions.map((def, i) => {
                  const isSelected = dialogRecord.definition === def.definition;
                  return (
                    <div
                      key={i}
                      role="button"
                      tabIndex={0}
                      onClick={() => void pickDefinition(def.definition, def.partOfSpeech)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") void pickDefinition(def.definition, def.partOfSpeech); }}
                      className={[
                        "w-full cursor-pointer rounded-lg border px-3 py-2 text-left transition-colors",
                        isSelected
                          ? "border-[var(--accent-solid)] bg-[var(--bg-panel-strong)]"
                          : "border-[var(--surface-border)] hover:border-[var(--accent-solid)]/40",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="mb-1 text-[0.6rem] italic tracking-wider text-[var(--text-secondary)]">
                          {def.partOfSpeech?.toUpperCase()} · MEANING {i + 1}
                          {def.source && <span className="ml-1 not-italic">· {def.source}</span>}
                        </p>
                        <div className="flex shrink-0 items-center gap-1">
                          {dialogRecord.allDefinitions.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); void clearRestDefinitions(i); }}
                              className="whitespace-nowrap rounded-full border border-[var(--surface-border)] px-1.5 py-0.5 text-[0.6rem] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-solid)] hover:text-[var(--accent-solid)]"
                            >
                              Clear rest
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label="Delete this definition"
                            onClick={(e) => { e.stopPropagation(); void deleteDefinition(i); }}
                            className="rounded-full border border-[var(--surface-border)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-red-500 hover:text-red-500"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <p className="text-sm leading-5 text-[var(--text-primary)]">{def.definition}</p>
                      {def.example && (
                        <p className="mt-1 text-xs italic text-[var(--text-secondary)]">"{def.example}"</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
