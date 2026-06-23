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
