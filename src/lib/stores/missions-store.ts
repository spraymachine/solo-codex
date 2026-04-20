"use client";

import { create } from "zustand";
import { storage } from "@/lib/db/storage";
import type { Mission, Quest } from "@/lib/types";

type MissionInput = Omit<Mission, "id" | "createdAt" | "completedAt">;

interface MissionsState {
  missions: Mission[];
  loaded: boolean;
  load: () => Promise<void>;
  createMission: (input: MissionInput) => Promise<Mission>;
  updateMission: (id: string, updates: Partial<Mission>) => Promise<void>;
  deleteMission: (id: string) => Promise<void>;
  syncLinkedProgress: (questsByGate: Record<string, Quest[]>) => Promise<void>;
}

export const useMissionsStore = create<MissionsState>((set, get) => ({
  missions: [],
  loaded: false,

  async load() {
    set({ missions: await storage.getMissions(), loaded: true });
  },

  async createMission(input) {
    const mission = await storage.createMission(input);
    set((state) => ({ missions: [...state.missions, mission] }));
    return mission;
  },

  async updateMission(id, updates) {
    await storage.updateMission(id, updates);
    set((state) => ({
      missions: state.missions.map((mission) =>
        mission.id === id ? { ...mission, ...updates } : mission,
      ),
    }));
  },

  async deleteMission(id) {
    await storage.deleteMission(id);
    set((state) => ({
      missions: state.missions.filter((mission) => mission.id !== id),
    }));
  },

  async syncLinkedProgress(questsByGate) {
    const missions = get().missions;
    const updates = missions
      .filter((mission) => mission.linkedGateIds.length > 0 && mission.targetMetric !== "Checklist")
      .map((mission) => {
        const completedCount = mission.linkedGateIds.reduce((count, gateId) => {
          const quests = questsByGate[gateId] ?? [];
          return count + quests.filter((quest) => quest.status === "completed").length;
        }, 0);

        return {
          mission,
          currentValue: Math.min(completedCount, mission.targetValue),
        };
      })
      .filter(({ mission, currentValue }) => mission.currentValue !== currentValue);

    await Promise.all(
      updates.map(({ mission, currentValue }) =>
        storage.updateMission(mission.id, { currentValue }),
      ),
    );

    if (updates.length > 0) {
      set((state) => ({
        missions: state.missions.map((mission) => {
          const match = updates.find((item) => item.mission.id === mission.id);
          return match ? { ...mission, currentValue: match.currentValue } : mission;
        }),
      }));
    }
  },
}));
