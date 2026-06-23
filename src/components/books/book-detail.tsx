"use client";

import type { Book } from "@/lib/types";

export function BookDetail({ book, onClose }: { book: Book | null; onClose: () => void }) {
  if (!book) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="rounded-xl bg-[var(--bg-panel)] p-6" onClick={(e) => e.stopPropagation()}>
        <p className="text-lg font-bold text-[var(--text-primary)]">{book.title}</p>
      </div>
    </div>
  );
}
