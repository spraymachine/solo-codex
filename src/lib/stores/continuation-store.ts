"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { shiftDate, todayDate } from "@/lib/utils";

const CONTINUATION_START_DATE = "2026-05-12";
const CONTINUATION_TOTAL_DAYS = 20;

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
  const dates = buildContinuationDates(CONTINUATION_START_DATE, CONTINUATION_TOTAL_DAYS);
  if (dates.includes(today)) {
    return today;
  }

  return CONTINUATION_START_DATE;
}

function normalizeContinuationState(state: ContinuationState): ContinuationState {
  const dates = buildContinuationDates(CONTINUATION_START_DATE, CONTINUATION_TOTAL_DAYS);
  const currentDate = getContinuationCurrentDate();
  const selectedDate = dates.includes(state.selectedDate) ? state.selectedDate : CONTINUATION_START_DATE;

  return {
    ...state,
    startDate: CONTINUATION_START_DATE,
    totalDays: CONTINUATION_TOTAL_DAYS,
    currentDate,
    selectedDate,
  };
}

export const useContinuationStore = create<ContinuationState>()(
  persist(
    (set, get) => ({
      startDate: CONTINUATION_START_DATE,
      totalDays: CONTINUATION_TOTAL_DAYS,
      currentDate: getContinuationCurrentDate(),
      selectedDate: getContinuationCurrentDate(),
      getDates: () => buildContinuationDates(get().startDate, get().totalDays),
      selectDate: (date) => {
        if (buildContinuationDates(get().startDate, get().totalDays).includes(date)) {
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
