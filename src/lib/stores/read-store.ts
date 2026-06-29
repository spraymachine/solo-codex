"use client";

import { create } from "zustand";
import { getDb } from "@/lib/db/database";
import { storage } from "@/lib/db/storage";
import { usePersonaStore } from "@/lib/stores/persona-store";
import {
  fetchReadRecords,
  getReadUserId,
  sbCreateReadRecord,
  sbDeleteReadRecord,
  sbUpdateReadRecord,
} from "@/lib/supabase/read";
import type { Persona, ReadRecord, ReadSourceType } from "@/lib/types";

interface ReadRecordInput {
  word: string;
  definition: string;
  partOfSpeech: string;
  myDefinition: string;
  synonyms: string[];
  allDefinitions: Array<{ partOfSpeech: string; definition: string; example?: string; source?: string }>;
  allSynonyms: string[];
  sourceType: ReadSourceType;
  bookId?: string | null;
}

interface ReadState {
  records: ReadRecord[];
  loaded: boolean;
  loadedPersona: Persona | null;
  load: (persona?: Persona) => Promise<void>;
  createRecords: (items: ReadRecordInput[]) => Promise<ReadRecord[]>;
  updateRecord: (
    id: string,
    updates: Partial<Pick<ReadRecord, "word" | "definition" | "partOfSpeech" | "sourceType" | "myDefinition" | "synonyms" | "bookId" | "allDefinitions" | "allSynonyms" | "favorite">>,
  ) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
}

// Fire-and-forget Supabase sync — never throws, never blocks UI.
// Mirrors syncToSupabase in work-store.ts.
async function syncReadToSupabase(fn: (userId: string) => Promise<void>) {
  try {
    const userId = await getReadUserId();
    if (!userId) return;
    await fn(userId);
  } catch (err) {
    // local state stays source of truth, but surface the failure so it's diagnosable
    console.error("read record sync failed", err);
  }
}

export const useReadStore = create<ReadState>((set, get) => ({
  records: [],
  loaded: false,
  loadedPersona: null,

  async load(persona) {
    if (persona && usePersonaStore.getState().activePersona !== persona) {
      return;
    }

    // Switching personas: drop whatever is in state immediately so a stale
    // pendingLocal merge (below) can never carry the previous persona's
    // records into this persona's view/cache/sync.
    if (persona && get().loadedPersona !== persona) {
      set({ records: [], loaded: false });
    }

    if (persona) {
      try {
        const userId = await getReadUserId();
        if (userId) {
          const cloudRecords = await fetchReadRecords(userId, persona);
          if (cloudRecords) {
            // Keep any local-only records not yet pushed to Supabase (fire-and-forget
            // sync may still be in flight) so a fresh fetch can't wipe a just-created word.
            // Only safe when state still belongs to this persona (checked above).
            const cloudIds = new Set(cloudRecords.map((r) => r.id));
            const pendingLocal = get().loadedPersona === persona ? get().records.filter((r) => !cloudIds.has(r.id)) : [];
            const merged = [...pendingLocal, ...cloudRecords].sort((a, b) =>
              b.createdAt.localeCompare(a.createdAt),
            );

            const db = getDb(persona);
            await db.transaction("rw", db.readRecords, async () => {
              await db.readRecords.clear();
              if (merged.length > 0) await db.readRecords.bulkAdd(merged);
            });
            if (usePersonaStore.getState().activePersona !== persona) return;
            set({ records: merged, loaded: true, loadedPersona: persona });
            return;
          }
        }
      } catch {
        // fall through to local
      }
    }

    const records = await storage.getReadRecords({ persona });
    if (persona && usePersonaStore.getState().activePersona !== persona) {
      return;
    }
    set({ records, loaded: true, loadedPersona: persona ?? get().loadedPersona });
  },

  async createRecords(items) {
    const persona = usePersonaStore.getState().activePersona;
    const created = await Promise.all(
      items
        .filter((item) => item.word.trim())
        .map((item) =>
          storage.createReadRecord(
            {
              word: item.word,
              definition: item.definition,
              partOfSpeech: item.partOfSpeech,
              myDefinition: item.myDefinition,
              synonyms: item.synonyms,
              allDefinitions: item.allDefinitions,
              allSynonyms: item.allSynonyms,
              sourceType: item.sourceType,
              bookId: item.bookId ?? null,
            },
            { persona },
          ),
        ),
    );

    if (created.length === 0) return created;

    // Persona may have switched while the writes above were in flight — don't
    // splice another persona's just-created records into the current view.
    if (usePersonaStore.getState().activePersona !== persona) return created;

    set((state) => ({
      records: [...created, ...state.records].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    }));

    void syncReadToSupabase(async (uid) => {
      await Promise.all(created.map((record) => sbCreateReadRecord(uid, persona, record)));
    });

    return created;
  },

  async updateRecord(id, updates) {
    const persona = usePersonaStore.getState().activePersona;
    await storage.updateReadRecord(id, updates, { persona });
    const updatedAt = new Date().toISOString();
    if (usePersonaStore.getState().activePersona !== persona) return;
    set((state) => ({
      records: state.records.map((record) =>
        record.id === id ? { ...record, ...updates, updatedAt } : record,
      ),
    }));
    void syncReadToSupabase((uid) => sbUpdateReadRecord(uid, persona, id, { ...updates, updatedAt }));
  },

  async deleteRecord(id) {
    const persona = usePersonaStore.getState().activePersona;
    await storage.deleteReadRecord(id, { persona });
    if (usePersonaStore.getState().activePersona !== persona) return;
    set((state) => ({ records: state.records.filter((record) => record.id !== id) }));
    void syncReadToSupabase((uid) => sbDeleteReadRecord(uid, persona, id));
  },
}));
