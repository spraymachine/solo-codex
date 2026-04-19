"use client";

import { create } from "zustand";
import { storage } from "@/lib/db/storage";
import type { Gate, Quest, QuestPriority, Rank } from "@/lib/types";

interface GatesState {
  gates: Gate[];
  quests: Record<string, Quest[]>;
  loaded: boolean;
  load: () => Promise<void>;
  createGate: (title: string, rank: Rank, options?: { date?: string; why?: string }) => Promise<Gate>;
  updateGate: (id: string, updates: Partial<Gate>) => Promise<void>;
  deleteGate: (id: string) => Promise<void>;
  createQuest: (
    gateId: string,
    input: {
      title: string;
      description: string;
      priority: QuestPriority;
      xpReward: number;
    },
  ) => Promise<Quest>;
  updateQuest: (id: string, updates: Partial<Quest>) => Promise<void>;
  deleteQuest: (id: string, gateId: string) => Promise<void>;
  reorderQuests: (gateId: string, orderedQuestIds: string[]) => Promise<void>;
  getGateProgress: (gateId: string) => number;
}

export const useGatesStore = create<GatesState>((set, get) => ({
  gates: [],
  quests: {},
  loaded: false,

  async load() {
    const gates = await storage.getGates();
    const quests: Record<string, Quest[]> = {};

    for (const gate of gates) {
      quests[gate.id] = await storage.getQuestsByGate(gate.id);
    }

    set({ gates, quests, loaded: true });
  },

  async createGate(title, rank, options) {
    const gate = await storage.createGate({ title, rank, ...options });
    set((state) => ({
      gates: [...state.gates, gate],
      quests: { ...state.quests, [gate.id]: [] },
    }));
    return gate;
  },

  async updateGate(id, updates) {
    await storage.updateGate(id, updates);
    set((state) => ({
      gates: state.gates.map((gate) =>
        gate.id === id ? { ...gate, ...updates } : gate,
      ),
    }));
  },

  async deleteGate(id) {
    await storage.deleteGate(id);
    set((state) => {
      const nextQuests = { ...state.quests };
      delete nextQuests[id];
      return {
        gates: state.gates.filter((gate) => gate.id !== id),
        quests: nextQuests,
      };
    });
  },

  async createQuest(gateId, input) {
    const quest = await storage.createQuest({ gateId, ...input });
    set((state) => ({
      quests: {
        ...state.quests,
        [gateId]: [...(state.quests[gateId] ?? []), quest],
      },
    }));
    return quest;
  },

  async updateQuest(id, updates) {
    const questsByGate = get().quests;
    let gateId = "";

    for (const [currentGateId, quests] of Object.entries(questsByGate)) {
      if (quests.some((quest) => quest.id === id)) {
        gateId = currentGateId;
        break;
      }
    }

    if (!gateId) {
      return;
    }

    await storage.updateQuest(id, updates);
    set((state) => ({
      quests: {
        ...state.quests,
        [gateId]: (state.quests[gateId] ?? []).map((quest) =>
          quest.id === id ? { ...quest, ...updates } : quest,
        ),
      },
    }));
  },

  async deleteQuest(id, gateId) {
    await storage.deleteQuest(id);
    set((state) => ({
      quests: {
        ...state.quests,
        [gateId]: (state.quests[gateId] ?? []).filter((quest) => quest.id !== id),
      },
    }));
  },

  async reorderQuests(gateId, orderedQuestIds) {
    await storage.reorderQuests(gateId, orderedQuestIds);
    set((state) => ({
      quests: {
        ...state.quests,
        [gateId]: orderedQuestIds
          .map((id) => state.quests[gateId]?.find((quest) => quest.id === id))
          .filter((quest): quest is Quest => Boolean(quest))
          .map((quest, index) => ({ ...quest, order: index })),
      },
    }));
  },

  getGateProgress(gateId) {
    const quests = get().quests[gateId] ?? [];

    if (quests.length === 0) {
      return 0;
    }

    const completed = quests.filter((quest) => quest.status === "completed").length;
    return Math.round((completed / quests.length) * 100);
  },
}));
