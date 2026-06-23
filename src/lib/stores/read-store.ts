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
  allDefinitions: Array<{ partOfSpeech: string; definition: string; example?: string }>;
  allSynonyms: string[];
  sourceType: ReadSourceType;
  bookId?: string | null;
}

interface ReadState {
  records: ReadRecord[];
  loaded: boolean;
  load: (persona?: Persona) => Promise<void>;
  createRecords: (items: ReadRecordInput[]) => Promise<void>;
  updateRecord: (
    id: string,
    updates: Partial<Pick<ReadRecord, "word" | "definition" | "partOfSpeech" | "sourceType" | "myDefinition" | "synonyms" | "bookId">>,
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
  } catch {
    // swallow — local state is source of truth
  }
}

export const useReadStore = create<ReadState>((set) => ({
  records: [],
  loaded: false,

  async load(persona) {
    if (persona && usePersonaStore.getState().activePersona !== persona) {
      return;
    }

    if (persona) {
      try {
        const userId = await getReadUserId();
        if (userId) {
          const cloudRecords = await fetchReadRecords(userId, persona);
          if (cloudRecords) {
            const db = getDb(persona);
            await db.transaction("rw", db.readRecords, async () => {
              await db.readRecords.clear();
              if (cloudRecords.length > 0) await db.readRecords.bulkAdd(cloudRecords);
            });
            if (usePersonaStore.getState().activePersona !== persona) return;
            set({ records: cloudRecords, loaded: true });
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
    set({ records, loaded: true });
  },

  async createRecords(items) {
    const created = await Promise.all(
      items
        .filter((item) => item.word.trim())
        .map((item) =>
          storage.createReadRecord({
            word: item.word,
            definition: item.definition,
            partOfSpeech: item.partOfSpeech,
            myDefinition: item.myDefinition,
            synonyms: item.synonyms,
            allDefinitions: item.allDefinitions,
            allSynonyms: item.allSynonyms,
            sourceType: item.sourceType,
            bookId: item.bookId ?? null,
          }),
        ),
    );

    if (created.length === 0) return;

    set((state) => ({
      records: [...created, ...state.records].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    }));

    const persona = usePersonaStore.getState().activePersona;
    void syncReadToSupabase(async (uid) => {
      await Promise.all(created.map((record) => sbCreateReadRecord(uid, persona, record)));
    });
  },

  async updateRecord(id, updates) {
    await storage.updateReadRecord(id, updates);
    const updatedAt = new Date().toISOString();
    set((state) => ({
      records: state.records.map((record) =>
        record.id === id ? { ...record, ...updates, updatedAt } : record,
      ),
    }));
    const persona = usePersonaStore.getState().activePersona;
    void syncReadToSupabase((uid) => sbUpdateReadRecord(uid, persona, id, { ...updates, updatedAt }));
  },

  async deleteRecord(id) {
    await storage.deleteReadRecord(id);
    set((state) => ({ records: state.records.filter((record) => record.id !== id) }));
    const persona = usePersonaStore.getState().activePersona;
    void syncReadToSupabase((uid) => sbDeleteReadRecord(uid, persona, id));
  },
}));
