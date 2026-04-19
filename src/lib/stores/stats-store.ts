"use client";

import { create } from "zustand";
import { storage } from "@/lib/db/storage";
import type { GymStat } from "@/lib/types";
import { todayDate } from "@/lib/utils";

interface StatsState {
  gymStats: GymStat[];
  loaded: boolean;
  load: () => Promise<void>;
  createGymStat: (name: string, unit: string) => Promise<GymStat>;
  addGymEntry: (id: string, value: number, date?: string) => Promise<void>;
  updateGymStat: (id: string, updates: Partial<GymStat>) => Promise<void>;
  deleteGymStat: (id: string) => Promise<void>;
}

export const useStatsStore = create<StatsState>((set) => ({
  gymStats: [],
  loaded: false,

  async load() {
    set({ gymStats: await storage.getGymStats(), loaded: true });
  },

  async createGymStat(name, unit) {
    const stat = await storage.createGymStat({ name, unit });
    set((state) => ({ gymStats: [...state.gymStats, stat] }));
    return stat;
  },

  async addGymEntry(id, value, date = todayDate()) {
    const stat = await storage.addGymStatEntry(id, value, date);
    if (!stat) return;
    set((state) => ({
      gymStats: state.gymStats.map((item) => (item.id === id ? stat : item)),
    }));
  },

  async updateGymStat(id, updates) {
    await storage.updateGymStat(id, updates);
    set((state) => ({
      gymStats: state.gymStats.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    }));
  },

  async deleteGymStat(id) {
    await storage.deleteGymStat(id);
    set((state) => ({
      gymStats: state.gymStats.filter((item) => item.id !== id),
    }));
  },
}));
