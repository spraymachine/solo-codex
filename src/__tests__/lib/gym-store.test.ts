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

describe("gym store — sessions and logging", () => {
  beforeEach(async () => {
    await storage.clear();
    resetStore();
  });

  async function seedChestDay() {
    return useGymStore.getState().createSplitDay({
      name: "Chest day",
      muscles: ["Chest", "Triceps"],
      exercises: [
        { name: "Barbell Bench Press", muscles: ["Chest"], isBodyweight: false, libraryId: "barbell-bench-press" },
        { name: "Push-Up", muscles: ["Chest"], isBodyweight: true, libraryId: "push-up" },
      ],
    });
  }

  it("starts a session snapshotting the template and sets active to first exercise", async () => {
    const day = await seedChestDay();
    const session = await useGymStore.getState().startSession(day.id);
    expect(session).not.toBeNull();
    const state = useGymStore.getState();
    expect(state.currentSessionId).toBe(session!.id);
    expect(session!.name).toBe("Chest day");
    expect(session!.exercises).toHaveLength(2);
    expect(state.activeExerciseId).toBe(session!.exercises[0].id);
  });

  it("logs a set to the active exercise and records lastRecord", async () => {
    const day = await seedChestDay();
    await useGymStore.getState().startSession(day.id);
    await useGymStore.getState().logSet("1,40,15");
    const session = useGymStore.getState().sessions.find((s) => s.id === useGymStore.getState().currentSessionId)!;
    expect(session.exercises[0].sets).toEqual([
      expect.objectContaining({ setNumber: 1, weightKg: 40, reps: 15 }),
    ]);
    expect(useGymStore.getState().lastRecord).toEqual(
      expect.objectContaining({ exerciseName: "Barbell Bench Press", setNumber: 1, weightKg: 40, reps: 15 }),
    );
  });

  it("advances to the next exercise when set number resets to 1", async () => {
    const day = await seedChestDay();
    const session = await useGymStore.getState().startSession(day.id);
    await useGymStore.getState().logSet("1,40,15");
    await useGymStore.getState().logSet("2,42,12");
    await useGymStore.getState().logSet("1,15"); // bodyweight push-up, set resets -> advance
    const state = useGymStore.getState();
    expect(state.activeExerciseId).toBe(session!.exercises[1].id);
    const fresh = state.sessions.find((s) => s.id === state.currentSessionId)!;
    expect(fresh.exercises[0].sets).toHaveLength(2);
    expect(fresh.exercises[1].sets).toEqual([
      expect.objectContaining({ setNumber: 1, weightKg: null, reps: 15 }),
    ]);
  });

  it("sets inputError on malformed input and logs nothing", async () => {
    const day = await seedChestDay();
    await useGymStore.getState().startSession(day.id);
    await useGymStore.getState().logSet("nonsense");
    const state = useGymStore.getState();
    expect(state.inputError).toBeTruthy();
    const session = state.sessions.find((s) => s.id === state.currentSessionId)!;
    expect(session.exercises[0].sets).toHaveLength(0);
  });

  it("sets the session rating", async () => {
    const day = await seedChestDay();
    await useGymStore.getState().startSession(day.id);
    await useGymStore.getState().setRating(4);
    const state = useGymStore.getState();
    expect(state.sessions.find((s) => s.id === state.currentSessionId)!.rating).toBe(4);
  });

  it("deletes a logged set", async () => {
    const day = await seedChestDay();
    await useGymStore.getState().startSession(day.id);
    await useGymStore.getState().logSet("1,40,15");
    const exId = useGymStore.getState().activeExerciseId!;
    await useGymStore.getState().deleteSet(exId, 1);
    const state = useGymStore.getState();
    expect(state.sessions.find((s) => s.id === state.currentSessionId)!.exercises[0].sets).toHaveLength(0);
  });
});
