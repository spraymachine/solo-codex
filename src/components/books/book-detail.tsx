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
  const books = useBooksStore((s) => s.books);
  const records = useReadStore((s) => s.records);
  const live = books.find((b) => b.id === book?.id) ?? book;
  const words = records.filter((r) => r.bookId === book?.id);

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
