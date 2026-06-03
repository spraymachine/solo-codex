"use client";

import { create } from "zustand";
import type { Persona, StickyNote } from "@/lib/types";
import { getDb } from "@/lib/db/database";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const NOTE_CAP = 3;

export const WARM_COLORS = [
  "#ffd84d", // canary yellow  — signature Post-it
  "#ff9580", // coral
  "#8fedcc", // mint
  "#80ccf0", // sky blue
  "#ffb3c6", // pink
  "#fff2a8", // pale lemon
] as const;

export const CALM_COLORS = [
  "#b8d4aa", // sage green
  "#a8becc", // slate blue
  "#c8bfb0", // warm stone
  "#9ac4bc", // eucalyptus
  "#d4b88c", // ochre
  "#e0dbd2", // linen
] as const;

export function getNoteColors(persona: Persona): readonly string[] {
  return persona === "mani" ? WARM_COLORS : CALM_COLORS;
}

// ─── Supabase helpers ──────────────────────────────────────────────────────────

type StickyNoteRow = {
  id: string;
  text: string;
  color: string;
  position: number;
  pinned_at: string;
  archived_at: string | null;
};

function rowToNote(row: StickyNoteRow): StickyNote {
  return {
    id: row.id,
    text: row.text,
    color: row.color,
    position: row.position,
    pinnedAt: row.pinned_at,
    archivedAt: row.archived_at ?? null,
  };
}

async function getAuthUser() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

async function pullFromSupabase(persona: Persona): Promise<StickyNote[] | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !isSupabaseConfigured()) return null;
  try {
    const user = await getAuthUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("sticky_notes")
      .select("id,text,color,position,pinned_at,archived_at")
      .eq("user_id", user.id)
      .eq("persona", persona);
    if (error) return null;
    return (data as StickyNoteRow[]).map(rowToNote);
  } catch {
    return null;
  }
}

async function pushToSupabase(persona: Persona) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !isSupabaseConfigured()) return;
  try {
    const user = await getAuthUser();
    if (!user) return;
    const all = await getDb(persona).stickyNotes.toArray();
    if (all.length === 0) {
      await supabase
        .from("sticky_notes")
        .delete()
        .eq("user_id", user.id)
        .eq("persona", persona);
      return;
    }
    await supabase.from("sticky_notes").upsert(
      all.map((n) => ({
        id: n.id,
        user_id: user.id,
        persona,
        text: n.text,
        color: n.color,
        position: n.position,
        pinned_at: n.pinnedAt,
        archived_at: n.archivedAt ?? null,
      })),
      { onConflict: "id" },
    );
    // Remove stale rows deleted locally
    const ids = all.map((n) => n.id).join(",");
    await supabase
      .from("sticky_notes")
      .delete()
      .eq("user_id", user.id)
      .eq("persona", persona)
      .not("id", "in", `(${ids})`);
  } catch (err) {
    console.error("[StickyNotes] Supabase push failed:", err);
  }
}

// ─── Dexie helpers ─────────────────────────────────────────────────────────────

async function readActive(persona: Persona): Promise<StickyNote[]> {
  const all = await getDb(persona).stickyNotes.filter((n) => n.archivedAt === null).toArray();
  return all.sort((a, b) => a.position - b.position);
}

async function readArchived(persona: Persona): Promise<StickyNote[]> {
  const all = await getDb(persona).stickyNotes.filter((n) => n.archivedAt !== null).toArray();
  return all.sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
}

async function syncDexieFromCloud(persona: Persona, notes: StickyNote[]) {
  const db = getDb(persona);
  await db.transaction("rw", db.stickyNotes, async () => {
    await db.stickyNotes.clear();
    if (notes.length > 0) await db.stickyNotes.bulkAdd(notes);
  });
}

// ─── Store ─────────────────────────────────────────────────────────────────────

interface StickyNotesState {
  ownNotes: StickyNote[];
  ownArchived: StickyNote[];
  archiveDrawerOpen: boolean;
  _activePersona: Persona | null;

  load: (activePersona: Persona) => Promise<void>;
  addNote: (text: string, color: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  reorderNotes: (orderedIds: string[]) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  hardDeleteArchived: (id: string) => Promise<void>;
  setArchiveDrawerOpen: (open: boolean) => void;
}

export const useStickyNotesStore = create<StickyNotesState>()((set, get) => ({
  ownNotes: [],
  ownArchived: [],
  archiveDrawerOpen: false,
  _activePersona: null,

  load: async (activePersona) => {
    set({ _activePersona: activePersona });

    // Show Dexie immediately
    const [ownLocal, ownArchLocal] = await Promise.all([
      readActive(activePersona),
      readArchived(activePersona),
    ]);
    set({ ownNotes: ownLocal, ownArchived: ownArchLocal });

    // Reconcile with Supabase
    const cloud = await pullFromSupabase(activePersona);
    if (cloud !== null) {
      await syncDexieFromCloud(activePersona, cloud);
    }
    const [ownNotes, ownArchived] = await Promise.all([
      readActive(activePersona),
      readArchived(activePersona),
    ]);
    set({ ownNotes, ownArchived });
  },

  addNote: async (text, color) => {
    const { _activePersona } = get();
    if (!_activePersona) return;
    const db = getDb(_activePersona);

    await db.transaction("rw", db.stickyNotes, async () => {
      const active = await db.stickyNotes.filter((n) => n.archivedAt === null).toArray();
      if (active.length >= NOTE_CAP) {
        const oldest = active.slice().sort((a, b) => a.pinnedAt.localeCompare(b.pinnedAt))[0];
        await db.stickyNotes.update(oldest.id, { archivedAt: new Date().toISOString() });
      }
      const remaining = await db.stickyNotes.filter((n) => n.archivedAt === null).toArray();
      for (const note of remaining) {
        await db.stickyNotes.update(note.id, { position: note.position + 1 });
      }
      await db.stickyNotes.add({
        id: crypto.randomUUID(),
        text: text.trim().slice(0, 80),
        color,
        position: 0,
        pinnedAt: new Date().toISOString(),
        archivedAt: null,
      });
    });

    const [ownNotes, ownArchived] = await Promise.all([
      readActive(_activePersona),
      readArchived(_activePersona),
    ]);
    set({ ownNotes, ownArchived });
    void pushToSupabase(_activePersona);
  },

  deleteNote: async (id) => {
    const { _activePersona } = get();
    if (!_activePersona) return;
    await getDb(_activePersona).stickyNotes.delete(id);
    const [ownNotes, ownArchived] = await Promise.all([
      readActive(_activePersona),
      readArchived(_activePersona),
    ]);
    set({ ownNotes, ownArchived });
    void pushToSupabase(_activePersona);
  },

  reorderNotes: async (orderedIds) => {
    const { _activePersona } = get();
    if (!_activePersona) return;
    const db = getDb(_activePersona);
    await db.transaction("rw", db.stickyNotes, async () => {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.stickyNotes.update(orderedIds[i], { position: i });
      }
    });
    set({ ownNotes: await readActive(_activePersona) });
    void pushToSupabase(_activePersona);
  },

  restoreNote: async (id) => {
    const { _activePersona, ownNotes: currentOwn } = get();
    if (!_activePersona) return;
    if (currentOwn.length >= NOTE_CAP) return;
    const db = getDb(_activePersona);
    await db.transaction("rw", db.stickyNotes, async () => {
      const active = await db.stickyNotes.filter((n) => n.archivedAt === null).toArray();
      for (const note of active) {
        await db.stickyNotes.update(note.id, { position: note.position + 1 });
      }
      await db.stickyNotes.update(id, { archivedAt: null, position: 0 });
    });
    const [ownNotes, ownArchived] = await Promise.all([
      readActive(_activePersona),
      readArchived(_activePersona),
    ]);
    set({ ownNotes, ownArchived });
    void pushToSupabase(_activePersona);
  },

  hardDeleteArchived: async (id) => {
    const { _activePersona } = get();
    if (!_activePersona) return;
    await getDb(_activePersona).stickyNotes.delete(id);
    set({ ownArchived: await readArchived(_activePersona) });
    void pushToSupabase(_activePersona);
  },

  setArchiveDrawerOpen: (open) => set({ archiveDrawerOpen: open }),
}));
