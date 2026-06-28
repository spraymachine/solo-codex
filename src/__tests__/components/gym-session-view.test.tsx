import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { storage } from "@/lib/db/storage";
import { useGymStore } from "@/lib/stores/gym-store";
import { SessionView } from "@/components/gym/session-view";

describe("SessionView", () => {
  beforeEach(async () => {
    await storage.clear();
    useGymStore.setState({
      splitDays: [], sessions: [], customExercises: [],
      currentSessionId: null, activeExerciseId: null,
      lastRecord: null, inputError: null, loaded: true,
    });
  });

  it("renders exercises and sets a rating", async () => {
    const day = await useGymStore.getState().createSplitDay({
      name: "Chest day",
      muscles: ["Chest"],
      exercises: [{ name: "Barbell Bench Press", muscles: ["Chest"], isBodyweight: false, libraryId: "barbell-bench-press" }],
    });
    const session = await useGymStore.getState().startSession(day.id);

    render(<SessionView session={session!} />);
    expect(screen.getByText(/Barbell Bench Press/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Rate 4"));
    await waitFor(() => {
      const state = useGymStore.getState();
      expect(state.sessions.find((s) => s.id === state.currentSessionId)!.rating).toBe(4);
    });
  });
});
