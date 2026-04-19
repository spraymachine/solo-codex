"use client";

import { create } from "zustand";
import { config } from "@/lib/config";
import { storage } from "@/lib/db/storage";
import { usePlayerStore } from "@/lib/stores/player-store";
import type { HunterRecord, Reflection } from "@/lib/types";
import { shiftDate, todayDate } from "@/lib/utils";

interface RecordsState {
  records: HunterRecord[];
  loaded: boolean;
  latestPenaltyDate: string | null;
  load: () => Promise<void>;
  addEntry: (text: string, date?: string) => Promise<void>;
  saveReflection: (reflection: Reflection, date?: string) => Promise<void>;
  applyPenaltyForDate: (date: string) => Promise<void>;
}

export const useRecordsStore = create<RecordsState>((set) => ({
  records: [],
  loaded: false,
  latestPenaltyDate: null,

  async load() {
    const records = await storage.getHunterRecords();
    const latestPenaltyDate =
      records.find((record) => record.penaltyApplied)?.date ?? null;
    set({ records, latestPenaltyDate, loaded: true });
  },

  async addEntry(text, date = todayDate()) {
    const current = await storage.getHunterRecord(date);
    await storage.addHunterEntry(date, text);
    const nextRecord = await storage.getHunterRecord(date);
    const playerStore = usePlayerStore.getState();
    const profile = playerStore.profile;

    if (!current && profile) {
      const previousDate = profile.lastLogDate;
      const streakCount =
        previousDate === shiftDate(date, -1) ? profile.streakCount + 1 : 1;

      await playerStore.saveProfile({
        lastLogDate: date,
        streakCount,
      });
      await playerStore.addXp(config.xp.dailyLog, "Daily log completed", "record");
    }

    set((state) => ({
      records: nextRecord
        ? [nextRecord, ...state.records.filter((record) => record.date !== date)]
        : state.records,
    }));
  },

  async saveReflection(reflection, date = todayDate()) {
    const record = await storage.saveHunterReflection(date, reflection);
    set((state) => ({
      records: [record, ...state.records.filter((item) => item.date !== date)],
    }));
  },

  async applyPenaltyForDate(date) {
    const playerStore = usePlayerStore.getState();
    const profile = playerStore.profile;

    if (!profile) {
      return;
    }
    const lastLogDate = profile.lastLogDate;
    const record = await storage.getHunterRecord(date);

    if (
      lastLogDate === date ||
      record?.penaltyApplied ||
      (record?.entries.length ?? 0) > 0
    ) {
      return;
    }

    await storage.markPenaltyApplied(date);
    await playerStore.saveProfile({ streakCount: 0 });
    await playerStore.addXp(
      config.xp.missedDayPenalty,
      `Penalty applied for missed record on ${date}`,
      "penalty",
    );

    const records = await storage.getHunterRecords();
    set({ records, latestPenaltyDate: date });
  },
}));
