"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useGatesStore } from "@/lib/stores/gates-store";
import { usePlayerStore } from "@/lib/stores/player-store";

interface TimerState {
  active: boolean;
  questId: string | null;
  questTitle: string;
  endTime: number | null;
  durationMinutes: number;
  manualMode: boolean;
  startTimer: (input: {
    questId?: string | null;
    questTitle: string;
    durationMinutes: number;
    manualMode?: boolean;
  }) => void;
  stopTimer: () => void;
  completeTimer: () => Promise<void>;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      active: false,
      questId: null,
      questTitle: "",
      endTime: null,
      durationMinutes: 0,
      manualMode: false,

      startTimer({ questId = null, questTitle, durationMinutes, manualMode = false }) {
        set({
          active: true,
          questId,
          questTitle,
          durationMinutes,
          endTime: Date.now() + durationMinutes * 60_000,
          manualMode,
        });
      },

      stopTimer() {
        set({
          active: false,
          questId: null,
          questTitle: "",
          endTime: null,
          durationMinutes: 0,
          manualMode: false,
        });
      },

      async completeTimer() {
        const { questId, stopTimer } = get();

        if (questId) {
          const gatesStore = useGatesStore.getState();
          const playerStore = usePlayerStore.getState();
          let questTitle = "";

          for (const [gateId, quests] of Object.entries(gatesStore.quests)) {
            const quest = quests.find((item) => item.id === questId);
            if (quest) {
              questTitle = quest.title;
              if (quest.status !== "completed") {
                await gatesStore.updateQuest(questId, { status: "completed" });
                await playerStore.addXp(
                  quest.xpReward,
                  `Completed quest: ${quest.title}`,
                  "quest",
                );
              }
              void gateId;
              break;
            }
          }

          if (questTitle) {
            stopTimer();
            return;
          }
        }

        stopTimer();
      },
    }),
    {
      name: "solo-leveling-timer",
      partialize: (state) => ({
        active: state.active,
        questId: state.questId,
        questTitle: state.questTitle,
        endTime: state.endTime,
        durationMinutes: state.durationMinutes,
        manualMode: state.manualMode,
      }),
    },
  ),
);
