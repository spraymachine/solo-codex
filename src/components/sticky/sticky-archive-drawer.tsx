"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { StickyNote, Persona } from "@/lib/types";
import { NOTE_CAP } from "@/lib/stores/sticky-notes-store";

function formatArchiveDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

interface StickyArchiveDrawerProps {
  open: boolean;
  notes: StickyNote[];
  persona: Persona;
  canRestore: boolean;
  onClose: () => void;
  onRestore: (id: string) => Promise<void>;
  onHardDelete: (id: string) => Promise<void>;
}

export function StickyArchiveDrawer({
  open,
  notes,
  persona,
  canRestore,
  onClose,
  onRestore,
  onHardDelete,
}: StickyArchiveDrawerProps) {
  const isWarm = persona === "mani";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50"
          />

          <motion.div
            key="drawer"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 36, mass: 0.9 }}
            className="fixed bottom-0 left-0 right-0 z-50 overflow-hidden border border-[var(--surface-border)] bg-[var(--bg-panel)]"
            style={{
              maxHeight: "68vh",
              borderBottomWidth: 0,
              borderRadius: "12px 12px 0 0",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--surface-border)] px-5 py-4">
              <div>
                <p className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.16em] text-[var(--accent-solid)]">
                  Archive
                </p>
                <p className="mt-0.5 font-mono text-[10px] tabular-nums text-[var(--text-secondary)]">
                  {notes.length} filed note{notes.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            {/* List */}
            <div
              className="overflow-y-auto px-5 py-4"
              style={{ maxHeight: "calc(68vh - 68px)" }}
            >
              {notes.length === 0 ? (
                <p className="py-10 text-center text-sm italic text-[var(--text-secondary)]">
                  Nothing archived yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {!canRestore && (
                    <p className="mb-3 font-mono text-[9px] italic text-[var(--text-secondary)]">
                      Wall at cap ({NOTE_CAP}). Delete a note first to restore.
                    </p>
                  )}
                  <AnimatePresence>
                    {notes.map((note) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        className="flex items-start gap-3 border border-[var(--surface-border)] bg-[var(--bg-secondary)] p-3"
                      >
                        {/* Color marker */}
                        <div
                          className="mt-1 h-2.5 w-2.5 shrink-0"
                          style={{ backgroundColor: note.color }}
                        />

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm leading-snug text-[var(--text-primary)] ${
                              isWarm
                                ? "font-[family-name:var(--font-display)] text-base font-semibold"
                                : "font-[family-name:var(--font-sans)]"
                            }`}
                          >
                            {note.text}
                          </p>
                          <p className="mt-1 font-mono text-[9px] tabular-nums text-[var(--text-secondary)]">
                            filed {note.archivedAt ? formatArchiveDate(note.archivedAt) : ""}
                          </p>
                        </div>

                        <div className="flex shrink-0 gap-1.5">
                          <button
                            type="button"
                            disabled={!canRestore}
                            onClick={() => void onRestore(note.id)}
                            className="border border-[var(--surface-border)] bg-[var(--bg-panel)] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-solid)]/40 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => void onHardDelete(note.id)}
                            className="border border-[var(--surface-border)] bg-[var(--bg-panel)] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)] transition-colors hover:border-red-500/30 hover:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
