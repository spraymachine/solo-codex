import { describe, expect, it } from "vitest";
import {
  getCompletionRatio,
  getPersonaWhy,
  getStatusSnapshot,
  isMissionComplete,
} from "@/lib/home-dashboard";

describe("home-dashboard helpers", () => {
  it("returns the hardcoded why statements for each persona", () => {
    expect(getPersonaWhy("mani")).toBe("Self-worth");
    expect(getPersonaWhy("harti")).toBe("Consistency");
    expect(getPersonaWhy("mouli")).toBe("Pro-active");
  });

  it("derives mission completion from progress values", () => {
    expect(isMissionComplete({ currentValue: 1, targetValue: 1 })).toBe(true);
    expect(isMissionComplete({ currentValue: 0, targetValue: 1 })).toBe(false);
  });

  it("calculates completion ratio safely", () => {
    expect(getCompletionRatio(0, 0)).toBe(0);
    expect(getCompletionRatio(2, 4)).toBe(0.5);
  });

  it("builds a compact status snapshot for the selected day", () => {
    expect(
      getStatusSnapshot({
        totalTodos: 3,
        completedTodos: 2,
        completedGoals: 4,
        totalGoals: 7,
        hasJournalEntry: true,
        streakCount: 5,
      }),
    ).toEqual({
      streakCount: 5,
      todayCompletionLabel: "2 / 3",
      goalsCompletionLabel: "4 / 7",
      journalLabel: "Logged",
      dayCompletionRatio: 0.67,
    });
  });
});
