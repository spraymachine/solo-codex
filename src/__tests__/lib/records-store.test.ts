import { beforeEach, describe, expect, it } from "vitest";
import { storage } from "@/lib/db/storage";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useRecordsStore } from "@/lib/stores/records-store";
import { shiftDate, todayDate } from "@/lib/utils";

describe("records store", () => {
  beforeEach(async () => {
    await storage.clear();
    usePlayerStore.setState({ profile: null, xpLog: [], loaded: false });
    useRecordsStore.setState({ records: [], loaded: false, latestPenaltyDate: null });
    await usePlayerStore.getState().load();
  });

  it("awards daily log xp only for the first entry of the day", async () => {
    await useRecordsStore.getState().load();
    await useRecordsStore.getState().addEntry("First log");
    await useRecordsStore.getState().addEntry("Second log");

    expect(useRecordsStore.getState().records[0]?.entries).toHaveLength(2);
    expect(usePlayerStore.getState().xpLog).toHaveLength(1);
    expect(usePlayerStore.getState().profile?.streakCount).toBe(1);
  });

  it("applies missed-day penalty once and resets streak", async () => {
    const yesterday = shiftDate(todayDate(), -1);
    const twoDaysAgo = shiftDate(todayDate(), -2);

    await storage.saveProfile({
      name: "Hunter",
      rank: "D",
      level: 6,
      xp: 200,
      streakCount: 5,
      lastLogDate: twoDaysAgo,
    });

    await usePlayerStore.getState().load();
    await useRecordsStore.getState().load();
    await useRecordsStore.getState().applyPenaltyForDate(yesterday);
    await useRecordsStore.getState().applyPenaltyForDate(yesterday);

    expect(useRecordsStore.getState().latestPenaltyDate).toBe(yesterday);
    expect(usePlayerStore.getState().profile?.streakCount).toBe(0);
    expect(usePlayerStore.getState().xpLog).toHaveLength(1);
    expect(usePlayerStore.getState().xpLog[0]?.source).toBe("penalty");
  });
});
