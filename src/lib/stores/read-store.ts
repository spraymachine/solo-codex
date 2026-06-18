"use client";

import { create } from "zustand";
import { storage } from "@/lib/db/storage";
import { usePersonaStore } from "@/lib/stores/persona-store";
import type { Persona, ReadRecord, ReadSourceType } from "@/lib/types";

interface ReadRecordInput {
  word: string;
  definition: string;
  partOfSpeech: string;
  sourceType: ReadSourceType;
}

interface ReadState {
  records: ReadRecord[];
  loaded: boolean;
  load: (persona?: Persona) => Promise<void>;
  createRecords: (items: ReadRecordInput[]) => Promise<void>;
  updateRecord: (
    id: string,
    updates: Partial<Pick<ReadRecord, "word" | "definition" | "partOfSpeech" | "sourceType">>,
  ) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
}

export const useReadStore = create<ReadState>((set) => ({
  records: [],
  loaded: false,

  async load(persona) {
    if (persona && usePersonaStore.getState().activePersona !== persona) {
      return;
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
            sourceType: item.sourceType,
          }),
        ),
    );

    if (created.length === 0) return;

    set((state) => ({
      records: [...created, ...state.records].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    }));
  },

  async updateRecord(id, updates) {
    await storage.updateReadRecord(id, updates);
    set((state) => ({
      records: state.records.map((record) =>
        record.id === id
          ? {
              ...record,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : record,
      ),
    }));
  },

  async deleteRecord(id) {
    await storage.deleteReadRecord(id);
    set((state) => ({ records: state.records.filter((record) => record.id !== id) }));
  },
}));
