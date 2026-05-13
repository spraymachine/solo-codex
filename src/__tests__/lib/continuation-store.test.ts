import { beforeEach, describe, expect, it } from "vitest";
import {
  getContinuationCurrentDate,
  useContinuationStore,
} from "@/lib/stores/continuation-store";

describe("continuation store", () => {
  beforeEach(() => {
    useContinuationStore.setState({
      startDate: "2026-05-12",
      totalDays: 20,
      currentDate: "2026-05-12",
      selectedDate: "2026-05-12",
    });
  });

  it("builds the current May continuation starting on 2026-05-12", () => {
    const dates = useContinuationStore.getState().getDates();
    expect(dates[0]).toBe("2026-05-12");
    expect(dates.at(-1)).toBe("2026-05-31");
    expect(dates).toHaveLength(20);
  });

  it("selects only dates inside the continuation month", () => {
    useContinuationStore.getState().selectDate("2026-05-20");
    expect(useContinuationStore.getState().selectedDate).toBe("2026-05-20");

    useContinuationStore.getState().selectDate("2026-06-01");
    expect(useContinuationStore.getState().selectedDate).toBe("2026-05-20");
  });

  it("uses an in-range calendar day as the current continuation date", () => {
    expect(getContinuationCurrentDate("2026-05-13")).toBe("2026-05-13");
  });

  it("jumps the selected date back to the current continuation date", () => {
    useContinuationStore.getState().selectDate("2026-05-20");
    useContinuationStore.getState().selectCurrentDate();
    expect(useContinuationStore.getState().selectedDate).toBe(
      getContinuationCurrentDate(),
    );
  });
});
