import type { Rank } from "@/lib/types";

export const config = {
  xp: {
    questReward: { normal: 10, urgent: 25, critical: 50 },
    gateBonus: { E: 20, D: 40, C: 80, B: 150, A: 300, S: 500 } satisfies Record<
      Rank,
      number
    >,
    dailyLog: 15,
    streakMultiplier: 2,
    missionComplete: 100,
    missedDayPenalty: -50,
  },
  leveling: {
    xpPerLevel: (level: number) => level * 100,
  },
  ranks: {
    thresholds: { E: 1, D: 6, C: 16, B: 31, A: 51, S: 76 } as Record<Rank, number>,
  },
  reminders: {
    defaultTime: "21:00",
  },
};
