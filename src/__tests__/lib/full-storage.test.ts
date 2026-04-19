import { beforeEach, describe, expect, it } from "vitest";
import { storage } from "@/lib/db/storage";

describe("full storage", () => {
  beforeEach(async () => {
    await storage.clear();
  });

  it("creates and updates missions", async () => {
    const mission = await storage.createMission({
      title: "Bench 100kg",
      rank: "B",
      targetMetric: "Weight",
      currentValue: 40,
      targetValue: 100,
      unit: "kg",
      deadline: null,
      linkedGateIds: [],
    });

    await storage.updateMission(mission.id, { currentValue: 60 });
    const missions = await storage.getMissions();

    expect(missions).toHaveLength(1);
    expect(missions[0]?.currentValue).toBe(60);
  });

  it("creates inventory items and tracks promotion metadata", async () => {
    const item = await storage.createInventoryItem({
      name: "Read strength book",
      notes: "Start with chapter 1",
      tags: ["fitness"],
    });

    await storage.updateInventoryItem(item.id, {
      promotedTo: { type: "mission", id: "mission-1" },
    });

    const items = await storage.getInventoryItems();
    expect(items[0]?.promotedTo).toEqual({ type: "mission", id: "mission-1" });
  });

  it("adds hunter record entries and reflections", async () => {
    await storage.addHunterEntry("2026-04-16", "Finished deep work block");
    await storage.saveHunterReflection("2026-04-16", {
      accomplished: "Shipped a feature",
      blockers: "None",
      mood: "Focused",
    });

    const record = await storage.getHunterRecord("2026-04-16");
    expect(record?.entries).toHaveLength(1);
    expect(record?.reflection?.mood).toBe("Focused");
  });

  it("creates penalty records only once per day", async () => {
    await storage.markPenaltyApplied("2026-04-15");
    await storage.markPenaltyApplied("2026-04-15");

    const record = await storage.getHunterRecord("2026-04-15");
    expect(record?.penaltyApplied).toBe(true);
    expect(record?.entries).toHaveLength(0);
  });

  it("creates gym stats and appends entries", async () => {
    const stat = await storage.createGymStat({ name: "Bench", unit: "kg" });
    await storage.addGymStatEntry(stat.id, 80, "2026-04-16");
    await storage.addGymStatEntry(stat.id, 85, "2026-04-17");

    const stats = await storage.getGymStats();
    expect(stats).toHaveLength(1);
    expect(stats[0]?.entries).toHaveLength(2);
    expect(stats[0]?.entries.at(-1)?.value).toBe(85);
  });
});
