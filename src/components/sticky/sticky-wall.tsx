"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { Persona, StickyNote } from "@/lib/types";
import { useStickyNotesStore, NOTE_CAP } from "@/lib/stores/sticky-notes-store";
import { StickyNoteCard } from "./sticky-note";
import { StickyComposer } from "./sticky-composer";
import { StickyArchiveDrawer } from "./sticky-archive-drawer";

interface StickyWallProps {
  activePersona: Persona;
}

export function StickyWall({ activePersona }: StickyWallProps) {
  const load = useStickyNotesStore((s) => s.load);
  const ownNotes = useStickyNotesStore((s) => s.ownNotes);
  const ownArchived = useStickyNotesStore((s) => s.ownArchived);
  const archiveDrawerOpen = useStickyNotesStore((s) => s.archiveDrawerOpen);
  const addNote = useStickyNotesStore((s) => s.addNote);
  const deleteNote = useStickyNotesStore((s) => s.deleteNote);
  const reorderNotes = useStickyNotesStore((s) => s.reorderNotes);
  const restoreNote = useStickyNotesStore((s) => s.restoreNote);
  const hardDeleteArchived = useStickyNotesStore((s) => s.hardDeleteArchived);
  const setArchiveDrawerOpen = useStickyNotesStore((s) => s.setArchiveDrawerOpen);

  const [localOrder, setLocalOrder] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    void load(activePersona);
  }, [activePersona, load]);

  useEffect(() => {
    setLocalOrder(ownNotes.map((n) => n.id));
  }, [ownNotes]);

  const atCap = ownNotes.length >= NOTE_CAP;

  const displayedNotes: StickyNote[] = localOrder
    .map((id) => ownNotes.find((n) => n.id === id))
    .filter((n): n is StickyNote => Boolean(n));

  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDragOver(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const from = localOrder.indexOf(draggedId);
    const to = localOrder.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const next = [...localOrder];
    next.splice(from, 1);
    next.splice(to, 0, draggedId);
    setLocalOrder(next);
  }

  function handleDrop() {
    if (draggedId) void reorderNotes(localOrder);
    setDraggedId(null);
  }

  return (
    <>
      <section
        className="section-dots overflow-hidden rounded-xl border border-[var(--surface-border)]"
        style={{
          background: `radial-gradient(ellipse at top right, color-mix(in srgb, var(--accent-solid) 7%, var(--bg-panel)) 0%, var(--bg-panel) 60%)`,
        }}
      >
        <div
          className="border-b border-[var(--surface-border)] px-5 py-4 md:px-6"
          style={{ background: `color-mix(in srgb, var(--accent-solid) 5%, var(--bg-panel-strong))` }}
        >
          <p className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.16em] text-[var(--accent-solid)]">
            P.
          </p>
        </div>

        <div className="px-5 py-5 md:px-6 md:py-6">
          {atCap && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded border border-dashed border-[var(--surface-border)] px-4 py-2.5">
              <p className="text-xs italic text-[var(--text-secondary)]">
                adding a {NOTE_CAP + 1}th will archive the oldest
              </p>
              {ownArchived.length > 0 && (
                <button
                  type="button"
                  onClick={() => setArchiveDrawerOpen(true)}
                  className="shrink-0 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[var(--accent-solid)] hover:opacity-75"
                >
                  archive →
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {displayedNotes.map((note) => (
                <StickyNoteCard
                  key={note.id}
                  note={note}
                  isOwn
                  onDelete={(id) => void deleteNote(id)}
                  draggable
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              ))}
              <StickyComposer
                key="__composer__"
                persona={activePersona}
                atCap={atCap}
                onAdd={addNote}
              />
            </AnimatePresence>
          </div>

          {ownArchived.length > 0 && !atCap && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setArchiveDrawerOpen(true)}
                className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                view archive ({ownArchived.length}) →
              </button>
            </div>
          )}
        </div>
      </section>

      <StickyArchiveDrawer
        open={archiveDrawerOpen}
        notes={ownArchived}
        persona={activePersona}
        canRestore={ownNotes.length < NOTE_CAP}
        onClose={() => setArchiveDrawerOpen(false)}
        onRestore={restoreNote}
        onHardDelete={hardDeleteArchived}
      />
    </>
  );
}
