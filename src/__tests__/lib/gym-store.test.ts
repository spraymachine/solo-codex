import { beforeEach, describe, expect, it } from "vitest";
import { storage } from "@/lib/db/storage";
import { useGymStore } from "@/lib/stores/gym-store";

function resetStore() {
  useGymStore.setState({
    splitDays: [],
    sessions: [],
    customExercises: [],
    currentSessionId: null,
    activeExerciseId: null,
    lastRecord: null,
    inputError: null,
    loaded: false,
  });
}

describe("gym store — splits", () => {
  beforeEach(async () => {
    await storage.clear();
    resetStore();
  });

  it("creates a split day with ordered exercises", async () => {
    await useGymStore.getState().createSplitDay({
      name: "Chest day",
      muscles: ["Chest", "Triceps"],
      exercises: [
        { name: "Barbell Bench Press", muscles: ["Chest", "Triceps"], isBodyweight: false, libraryId: "barbell-bench-press" },
        { name: "Push-Up", muscles: ["Chest"], isBodyweight: true, libraryId: "push-up" },
      ],
    });
    const days = useGymStore.getState().splitDays;
    expect(days).toHaveLength(1);
    expect(days[0].name).toBe("Chest day");
    expect(days[0].exercises.map((e) => e.order)).toEqual([0, 1]);
    expect(days[0].exercises[0].id).toBeTruthy();
  });

  it("deletes a split day", async () => {
    const day = await useGymStore.getState().createSplitDay({ name: "Leg day", muscles: ["Quads"], exercises: [] });
    await useGymStore.getState().deleteSplitDay(day.id);
    expect(useGymStore.getState().splitDays).toHaveLength(0);
  });
});
