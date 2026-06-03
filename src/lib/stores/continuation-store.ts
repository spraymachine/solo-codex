"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { shiftDate, todayDate } from "@/lib/utils";

const CONTINUATION_START_DATE = "2026-05-12";

function getDaysFromStart(startDate: string, today = todayDate()): number {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${today}T12:00:00`);
  const diff = Math.floor((end.getTime() - start.getTime()) / 86400000);
  return Math.max(diff + 1, 1);
}

interface ContinuationState {
  startDate: string;
  totalDays: number;
  currentDate: string;
  selectedDate: string;
  getDates: () => string[];
  selectDate: (date: string) => void;
  selectCurrentDate: () => void;
}

export function buildContinuationDates(startDate: string, totalDays: number) {
  return Array.from({ length: totalDays }, (_, index) => shiftDate(startDate, index));
}

export function getContinuationCurrentDate(today = todayDate()) {
  if (today >= CONTINUATION_START_DATE) {
    return today;
  }
  return CONTINUATION_START_DATE;
}

function normalizeContinuationState(state: ContinuationState): ContinuationState {
  const totalDays = getDaysFromStart(CONTINUATION_START_DATE);
  const dates = buildContinuationDates(CONTINUATION_START_DATE, totalDays);
  const currentDate = getContinuationCurrentDate();
  const selectedDate = dates.includes(state.selectedDate) ? state.selectedDate : currentDate;

  return {
    ...state,
    startDate: CONTINUATION_START_DATE,
    totalDays,
    currentDate,
    selectedDate,
  };
}

export const useContinuationStore = create<ContinuationState>()(
  persist(
    (set, get) => ({
      startDate: CONTINUATION_START_DATE,
      totalDays: getDaysFromStart(CONTINUATION_START_DATE),
      currentDate: getContinuationCurrentDate(),
      selectedDate: getContinuationCurrentDate(),
      getDates: () => buildContinuationDates(get().startDate, getDaysFromStart(get().startDate)),
      selectDate: (date) => {
        if (buildContinuationDates(get().startDate, getDaysFromStart(get().startDate)).includes(date)) {
          set({ selectedDate: date });
        }
      },
      selectCurrentDate: () => {
        const currentDate = getContinuationCurrentDate();
        set({ currentDate, selectedDate: currentDate });
      },
    }),
    {
      name: "solo-leveling-continuation",
      version: 1,
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== "object") {
          return persistedState as ContinuationState;
        }

        return normalizeContinuationState(persistedState as ContinuationState);
      },
    },
  ),
);
