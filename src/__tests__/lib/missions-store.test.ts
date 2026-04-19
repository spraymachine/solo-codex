import { beforeEach, describe, expect, it } from "vitest";
import { storage } from "@/lib/db/storage";
import { useMissionsStore } from "@/lib/stores/missions-store";

describe("missions store", () => {
  beforeEach(async () => {
    await storage.clear();
    useMissionsStore.setState({ missions: [], loaded: false });
  });

  it("creates missions", async () => {
    await useMissionsStore.getState().createMission({
      title: "Bench 100kg",
      rank: "B",
      targetMetric: "Weight",
      currentValue: 20,
      targetValue: 100,
      unit: "kg",
      deadline: null,
      linkedGateIds: [],
    });

    expect(useMissionsStore.getState().missions).toHaveLength(1);
  });

  it("syncs linked mission progress from completed quests", async () => {
    const gate = await storage.createGate({ title: "Strength Block", rank: "C" });
    const questA = await storage.createQuest({
      gateId: gate.id,
      title: "Workout A",
      description: "",
      priority: "normal",
      xpReward: 10,
    });
    const quest = await storage.createQuest({
      gateId: gate.id,
      title: "Workout B",
      description: "",
      priority: "normal",
      xpReward: 10,
    });
    await storage.updateQuest(quest.id, { status: "completed" });

    await useMissionsStore.getState().createMission({
      title: "Consistency",
      rank: "D",
      targetMetric: "Sessions",
      currentValue: 0,
      targetValue: 10,
      unit: "sessions",
      deadline: null,
      linkedGateIds: [gate.id],
    });

    await useMissionsStore.getState().syncLinkedProgress({
      [gate.id]: [
        (await storage.getQuest(questA.id))!,
        (await storage.getQuest(quest.id))!,
      ],
    });

    expect(useMissionsStore.getState().missions[0]?.currentValue).toBe(1);
  });
});
