"use client";

import { useEffect, useState } from "react";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useBooksStore } from "@/lib/stores/books-store";
import type { Book, BookShelf } from "@/lib/types";
import { AddBookBar } from "./add-book-bar";
import { BookDetail } from "./book-detail";

const SHELVES: { key: BookShelf; label: string; tagline: string; empty: string }[] = [
  { key: "reading", label: "Currently reading", tagline: "in flight", empty: "Pick something. Then actually finish it." },
  { key: "want", label: "On deck", tagline: "future selves", empty: "Nothing queued. Build the stack." },
  { key: "read", label: "Finished", tagline: "logged & rated", empty: "Crack one open." },
];

function Cover({ book, onClick, size }: { book: Book; onClick: () => void; size: "lg" | "md" }) {
  const pct = book.totalPages && book.totalPages > 0 ? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100)) : 0;
  const dims = size === "lg" ? "h-[220px] w-[148px]" : "h-[175px] w-[118px]";
  const fallbackText = size === "lg" ? "text-xs" : "text-[10px]";
  const titleClamp = size === "lg" ? "text-xs" : "text-[10.5px]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative ${size === "lg" ? "w-[148px]" : "w-[118px]"} shrink-0 cursor-pointer text-left transition-transform duration-300 hover:-translate-y-1`}
      style={{ perspective: "800px" }}
    >
      <div
        className={`relative ${dims} overflow-hidden rounded-[3px] transition-shadow duration-300`}
        style={{
          boxShadow:
            "inset 1px 0 0 rgba(255,255,255,0.06), inset -2px 0 4px rgba(0,0,0,0.45), 0 1px 1px rgba(0,0,0,0.2), 0 8px 18px -6px rgba(0,0,0,0.55)",
        }}
      >
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className={`flex h-full w-full flex-col justify-between bg-gradient-to-br from-[var(--bg-panel-strong)] to-[var(--bg-panel)] p-2 font-[var(--font-display)] ${fallbackText} font-bold uppercase leading-tight tracking-[0.04em] text-[var(--text-primary)]`}
          >
            <span className="opacity-30">§</span>
            <span className="line-clamp-6">{book.title}</span>
            <span className="text-[8px] font-normal uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              {book.authors[0] ?? ""}
            </span>
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-[6px]"
          style={{ background: "linear-gradient(to right, rgba(0,0,0,0.35), transparent)" }}
        />
        {book.shelf === "reading" && pct > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/40">
            <div className="h-full bg-[var(--accent-solid)]" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      <div className="mt-2">
        <p className={`line-clamp-2 ${titleClamp} font-medium leading-snug text-[var(--text-primary)]`}>{book.title}</p>
        {size === "lg" && book.authors[0] && (
          <p className="mt-0.5 line-clamp-1 text-[10px] text-[var(--text-secondary)]">{book.authors[0]}</p>
        )}
        {book.shelf === "reading" && book.totalPages ? (
          <p className="mt-1 font-[var(--font-mono)] text-[9px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            p. {book.currentPage} / {book.totalPages} · {pct}%
          </p>
        ) : book.shelf === "read" && book.rating ? (
          <p className="mt-1 text-[11px] tracking-[0.15em] text-[#e8c840]">
            {"★".repeat(book.rating)}
            <span className="text-[var(--surface-border)]">{"★".repeat(5 - book.rating)}</span>
          </p>
        ) : null}
      </div>
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

  const counts = {
    reading: books.filter((b) => b.shelf === "reading").length,
    want: books.filter((b) => b.shelf === "want").length,
    read: books.filter((b) => b.shelf === "read").length,
  };
  const totalPagesRead = books
    .filter((b) => b.shelf === "reading" || b.shelf === "read")
    .reduce((sum, b) => sum + (b.shelf === "read" ? (b.totalPages ?? 0) : b.currentPage), 0);

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--surface-border)] pb-5">
        <div>
          <p className="font-[var(--font-display)] text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
            Reading log
          </p>
          <h1 className="mt-1 font-[var(--font-display)] text-4xl font-bold uppercase leading-none tracking-tight text-[var(--text-primary)]">
            The shelf
          </h1>
          <p
            className="mt-1 text-lg leading-none text-[var(--text-secondary)]"
            style={{ fontFamily: "var(--font-handwriting), cursive" }}
          >
            what&apos;s on the nightstand
          </p>
        </div>

        <div className="flex items-end gap-6 font-[var(--font-mono)] text-[var(--text-primary)]">
          <Stat value={counts.reading} label="in flight" accent />
          <Stat value={counts.want} label="on deck" />
          <Stat value={counts.read} label="finished" />
          <Stat value={totalPagesRead.toLocaleString()} label="pages logged" />
        </div>
      </header>

      <AddBookBar />

      {!loaded ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : (
        SHELVES.map(({ key, label, tagline, empty }) => {
          const shelfBooks = books.filter((b) => b.shelf === key);
          const isReading = key === "reading";
          return (
            <section key={key}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="font-[var(--font-display)] text-base font-bold uppercase tracking-[0.14em] text-[var(--text-primary)]">
                  {label}
                </h2>
                <span
                  className="text-sm text-[var(--text-secondary)]"
                  style={{ fontFamily: "var(--font-handwriting), cursive" }}
                >
                  — {tagline}
                </span>
                <span className="ml-auto font-[var(--font-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  {shelfBooks.length.toString().padStart(2, "0")}
                </span>
              </div>

              {shelfBooks.length === 0 ? (
                <div className="rounded-md border border-dashed border-[var(--surface-border)] px-4 py-6">
                  <p className="text-sm text-[var(--text-secondary)]">{empty}</p>
                </div>
              ) : (
                <div
                  className="relative flex gap-5 overflow-x-auto pb-6 pt-1"
                  style={{
                    backgroundImage:
                      "linear-gradient(to bottom, transparent calc(100% - 18px), color-mix(in oklab, var(--accent-solid) 8%, transparent) calc(100% - 18px), color-mix(in oklab, var(--accent-solid) 8%, transparent) calc(100% - 16px), transparent calc(100% - 16px))",
                  }}
                >
                  {shelfBooks.map((book) => (
                    <Cover
                      key={book.id}
                      book={book}
                      size={isReading ? "lg" : "md"}
                      onClick={() => setOpenId(book.id)}
                    />
                  ))}
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

function Stat({ value, label, accent = false }: { value: number | string; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-end">
      <span className={`font-[var(--font-display)] text-3xl font-bold leading-none ${accent ? "text-[var(--accent-solid)]" : "text-[var(--text-primary)]"}`}>
        {value}
      </span>
      <span className="mt-1 text-[9px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">{label}</span>
    </div>
  );
}
