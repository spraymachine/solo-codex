import { beforeEach, describe, expect, it } from "vitest";
import { storage } from "@/lib/db/storage";
import { useGatesStore } from "@/lib/stores/gates-store";

describe("gates store", () => {
  beforeEach(async () => {
    await storage.clear();
    useGatesStore.setState({ gates: [], quests: {}, loaded: false });
  });

  it("creates a gate", async () => {
    await useGatesStore.getState().createGate("Learn TypeScript", "C");
    const { gates } = useGatesStore.getState();
    expect(gates).toHaveLength(1);
    expect(gates[0].title).toBe("Learn TypeScript");
    expect(gates[0].rank).toBe("C");
  });

  it("creates a quest inside a gate", async () => {
    await useGatesStore.getState().createGate("Study", "D");
    const gateId = useGatesStore.getState().gates[0].id;
    await useGatesStore.getState().createQuest(gateId, {
      title: "Chapter 1",
      description: "Read it",
      priority: "normal",
      xpReward: 10,
    });
    const quests = useGatesStore.getState().quests[gateId];
    expect(quests).toHaveLength(1);
    expect(quests[0].title).toBe("Chapter 1");
  });

  it("loads gates and quests from storage", async () => {
    const gate = await storage.createGate({ title: "Pre-existing", rank: "B" });
    await storage.createQuest({
      gateId: gate.id,
      title: "Task 1",
      description: "",
      priority: "normal",
      xpReward: 10,
    });

    await useGatesStore.getState().load();
    expect(useGatesStore.getState().gates).toHaveLength(1);
    expect(useGatesStore.getState().quests[gate.id]).toHaveLength(1);
  });

  it("computes gate progress from quests", async () => {
    await useGatesStore.getState().createGate("Test", "E");
    const gateId = useGatesStore.getState().gates[0].id;
    await useGatesStore.getState().createQuest(gateId, {
      title: "Q1",
      description: "",
      priority: "normal",
      xpReward: 10,
    });
    await useGatesStore.getState().createQuest(gateId, {
      title: "Q2",
      description: "",
      priority: "normal",
      xpReward: 10,
    });

    const questId = useGatesStore.getState().quests[gateId][0].id;
    await useGatesStore.getState().updateQuest(questId, { status: "completed" });

    const progress = useGatesStore.getState().getGateProgress(gateId);
    expect(progress).toBe(50);
  });
});
