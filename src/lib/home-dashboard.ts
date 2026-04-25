import type { Persona } from "@/lib/types";

export function getPersonaWhy(persona: Persona) {
  if (persona === "mani") {
    return "Self-worth";
  }

  if (persona === "harti") {
    return "Consistency";
  }

  return "Pro-active";
}

export function isMissionComplete(input: {
  currentValue: number;
  targetValue: number;
}) {
  return input.currentValue >= input.targetValue;
}

export function getCompletionRatio(completed: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return completed / total;
}

export function getStatusSnapshot(input: {
  totalTodos: number;
  completedTodos: number;
  completedGoals: number;
  totalGoals: number;
  hasJournalEntry: boolean;
  streakCount: number;
}) {
  return {
    streakCount: input.streakCount,
    todayCompletionLabel: `${input.completedTodos} / ${input.totalTodos}`,
    goalsCompletionLabel: `${input.completedGoals} / ${input.totalGoals}`,
    journalLabel: input.hasJournalEntry ? "Logged" : "Open",
    dayCompletionRatio: Number(
      getCompletionRatio(input.completedTodos, input.totalTodos).toFixed(2),
    ),
  };
}
