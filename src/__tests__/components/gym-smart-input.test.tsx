import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { storage } from "@/lib/db/storage";
import { useGymStore } from "@/lib/stores/gym-store";
import { SmartInput } from "@/components/gym/smart-input";

describe("SmartInput", () => {
  beforeEach(async () => {
    await storage.clear();
    useGymStore.setState({
      splitDays: [], sessions: [], customExercises: [],
      currentSessionId: null, activeExerciseId: null,
      lastRecord: null, inputError: null, loaded: true,
    });
  });

  it("logs a set and clears the field", async () => {
    const day = await useGymStore.getState().createSplitDay({
      name: "Chest day",
      muscles: ["Chest"],
      exercises: [{ name: "Barbell Bench Press", muscles: ["Chest"], isBodyweight: false, libraryId: "barbell-bench-press" }],
    });
    await useGymStore.getState().startSession(day.id);

    render(<SmartInput />);
    const input = screen.getByLabelText("Smart set input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1,40,15" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      const state = useGymStore.getState();
      const session = state.sessions.find((s) => s.id === state.currentSessionId)!;
      expect(session.exercises[0].sets).toHaveLength(1);
    });
    expect(input.value).toBe("");
  });

  it("shows an error on malformed input", async () => {
    const day = await useGymStore.getState().createSplitDay({
      name: "Chest day",
      muscles: ["Chest"],
      exercises: [{ name: "Barbell Bench Press", muscles: ["Chest"], isBodyweight: false, libraryId: "barbell-bench-press" }],
    });
    await useGymStore.getState().startSession(day.id);

    render(<SmartInput />);
    const input = screen.getByLabelText("Smart set input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1,40" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => expect(useGymStore.getState().inputError).toBeTruthy());
  });
});
