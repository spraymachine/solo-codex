"use client";

import { create } from "zustand";
import { storage } from "@/lib/db/storage";
import { config } from "@/lib/config";
import type { PlayerProfile, Rank, XpLogEntry } from "@/lib/types";

interface PlayerState {
  profile: PlayerProfile | null;
  xpLog: XpLogEntry[];
  loaded: boolean;
  load: () => Promise<void>;
  addXp: (amount: number, reason: string, source: string) => Promise<void>;
  saveProfile: (updates: Partial<PlayerProfile>) => Promise<void>;
}

function computeLevel(totalXp: number): number {
  let level = 1;
  let remaining = totalXp;
  let xpNeeded = config.leveling.xpPerLevel(level);

  while (remaining >= xpNeeded) {
    remaining -= xpNeeded;
    level += 1;
    xpNeeded = config.leveling.xpPerLevel(level);
  }

  return level;
}

function computeRank(level: number): Rank {
  const rankOrder: Rank[] = ["S", "A", "B", "C", "D", "E"];

  for (const rank of rankOrder) {
    if (level >= config.ranks.thresholds[rank]) {
      return rank;
    }
  }

  return "E";
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  profile: null,
  xpLog: [],
  loaded: false,

  async load() {
    const [profile, xpLog] = await Promise.all([
      storage.getProfile(),
      storage.getXpLog(),
    ]);
    set({ profile, xpLog, loaded: true });
  },

  async addXp(amount, reason, source) {
    const profile = get().profile;

    if (!profile) {
      return;
    }

    const xp = Math.max(0, profile.xp + amount);
    const level = computeLevel(xp);
    const rank = computeRank(level);
    const updated: PlayerProfile = { ...profile, xp, level, rank };

    await storage.saveProfile(updated);
    await storage.addXpEntry({ amount, reason, source });

    set({
      profile: updated,
      xpLog: await storage.getXpLog(),
    });
  },

  async saveProfile(updates) {
    const profile = get().profile;

    if (!profile) {
      return;
    }

    const updated = { ...profile, ...updates };
    await storage.saveProfile(updated);
    set({ profile: updated });
  },
}));
