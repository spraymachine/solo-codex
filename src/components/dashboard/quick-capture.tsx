"use client";

import { useState } from "react";
import { useBooksStore } from "@/lib/stores/books-store";
import { useReadStore } from "@/lib/stores/read-store";
import { useAuth } from "@/components/auth/auth-gate";
import { fetchDictionaryDefinition, type ReadDefinition } from "@/lib/read/dictionary";
import { RateLimitError } from "@/lib/rate-limiter";

const NO_BOOK = "__none__";

export function QuickCapture() {
  const books = useBooksStore((s) => s.books);
  const readingBooks = books.filter((b) => b.shelf === "reading");
  const createRecords = useReadStore((s) => s.createRecords);
  const { user } = useAuth();

  const [bookId, setBookId] = useState<string>(NO_BOOK); // sticky across entries
  const [word, setWord] = useState("");
  const [preview, setPreview] = useState<{ word: string; partOfSpeech: string; definition: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function capture() {
    const clean = word.trim();
    if (!clean || loading) return;
    setLoading(true);
    setError("");
    try {
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
    } finally {
      setLoading(false);
    }
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

      {error && (
        <div className="mt-3 rounded-lg border border-red-500 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

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
