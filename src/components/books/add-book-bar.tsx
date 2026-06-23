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
