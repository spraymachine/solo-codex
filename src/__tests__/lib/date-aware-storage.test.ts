import { beforeEach, describe, expect, it } from "vitest";
import { storage } from "@/lib/db/storage";

describe("date-aware storage", () => {
  beforeEach(async () => {
    await storage.clear();
  });

  it("stores gates with a campaign date and why", async () => {
    const gate = await storage.createGate({
      title: "Deep Work Sprint",
      rank: "C",
      date: "2026-04-20",
      why: "Build momentum on day one.",
    });

    expect(gate.date).toBe("2026-04-20");
    expect(gate.why).toBe("Build momentum on day one.");
  });

  it("filters gates by campaign day", async () => {
    await storage.createGate({
      title: "Day One Gate",
      rank: "D",
      date: "2026-04-20",
      why: "Start clean.",
    });
    await storage.createGate({
      title: "Day Two Gate",
      rank: "C",
      date: "2026-04-21",
      why: "Stay consistent.",
    });

    const dayOneGates = await storage.getGatesByDate("2026-04-20");
    expect(dayOneGates).toHaveLength(1);
    expect(dayOneGates[0]?.title).toBe("Day One Gate");
  });

  it("stores missions with a campaign date and why", async () => {
    const mission = await storage.createMission({
      title: "21-Day Discipline",
      rank: "B",
      targetMetric: "Sessions",
      currentValue: 0,
      targetValue: 21,
      unit: "days",
      deadline: null,
      linkedGateIds: [],
      date: "2026-04-20",
      why: "Turn consistency into identity.",
    });

    expect(mission.date).toBe("2026-04-20");
    expect(mission.why).toBe("Turn consistency into identity.");
  });
});
