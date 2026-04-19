"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { shiftDate } from "@/lib/utils";

const DEFAULT_START_DATE = "2026-04-20";
const DEFAULT_TOTAL_DAYS = 22;

interface CampaignState {
  startDate: string;
  totalDays: number;
  currentDate: string;
  selectedDate: string;
  getDates: () => string[];
  isEditableDate: (date: string) => boolean;
  selectDate: (date: string) => void;
  advanceDay: () => void;
  extendCampaign: (days?: number) => void;
}

export function buildCampaignDates(startDate: string, totalDays: number) {
  return Array.from({ length: totalDays }, (_, index) => shiftDate(startDate, index));
}

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set, get) => ({
      startDate: DEFAULT_START_DATE,
      totalDays: DEFAULT_TOTAL_DAYS,
      currentDate: DEFAULT_START_DATE,
      selectedDate: DEFAULT_START_DATE,
      getDates: () => buildCampaignDates(get().startDate, get().totalDays),
      isEditableDate: (date) => date === get().currentDate,
      selectDate: (date) => {
        if (buildCampaignDates(get().startDate, get().totalDays).includes(date)) {
          set({ selectedDate: date });
        }
      },
      advanceDay: () => {
        const state = get();
        const dates = buildCampaignDates(state.startDate, state.totalDays);
        const currentIndex = dates.indexOf(state.currentDate);
        const nextDate = dates[currentIndex + 1];
        if (nextDate) {
          set({ currentDate: nextDate, selectedDate: nextDate });
        }
      },
      extendCampaign: () => {
        set(() => ({ totalDays: DEFAULT_TOTAL_DAYS }));
      },
    }),
    {
      name: "solo-leveling-campaign",
      version: 3,
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== "object") {
          return persistedState as CampaignState;
        }

        const state = persistedState as CampaignState;
        if (state.startDate === DEFAULT_START_DATE && state.totalDays !== DEFAULT_TOTAL_DAYS) {
          return { ...state, totalDays: DEFAULT_TOTAL_DAYS };
        }

        return state;
      },
    },
  ),
);
