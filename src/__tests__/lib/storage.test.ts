import { beforeEach, describe, expect, it } from "vitest";
import { storage } from "@/lib/db/storage";

describe("storage", () => {
  beforeEach(async () => {
    await storage.clear();
  });

  describe("player profile", () => {
    it("returns default profile when none exists", async () => {
      const profile = await storage.getProfile();
      expect(profile.name).toBe("Hunter");
      expect(profile.rank).toBe("E");
      expect(profile.level).toBe(1);
      expect(profile.xp).toBe(0);
    });

    it("saves and retrieves profile", async () => {
      await storage.saveProfile({
        name: "Jin-Woo",
        rank: "B",
        level: 31,
        xp: 5000,
        streakCount: 10,
        lastLogDate: "2026-04-16",
      });
      const profile = await storage.getProfile();
      expect(profile.name).toBe("Jin-Woo");
      expect(profile.rank).toBe("B");
    });
  });

  describe("gates", () => {
    it("creates and retrieves a gate", async () => {
      const gate = await storage.createGate({ title: "Learn React", rank: "C" });
      expect(gate.id).toBeDefined();
      expect(gate.status).toBe("active");

      const gates = await storage.getGates();
      expect(gates).toHaveLength(1);
      expect(gates[0].title).toBe("Learn React");
    });

    it("updates a gate", async () => {
      const gate = await storage.createGate({ title: "Learn React", rank: "C" });
      await storage.updateGate(gate.id, { status: "cleared" });
      const updated = await storage.getGate(gate.id);
      expect(updated?.status).toBe("cleared");
    });

    it("deletes a gate and its quests", async () => {
      const gate = await storage.createGate({ title: "Learn React", rank: "C" });
      await storage.createQuest({
        gateId: gate.id,
        title: "Read docs",
        description: "",
        priority: "normal",
        xpReward: 10,
      });
      await storage.deleteGate(gate.id);
      const gates = await storage.getGates();
      expect(gates).toHaveLength(0);
      const quests = await storage.getQuestsByGate(gate.id);
      expect(quests).toHaveLength(0);
    });
  });

  describe("quests", () => {
    it("creates a quest inside a gate", async () => {
      const gate = await storage.createGate({ title: "Study", rank: "D" });
      const quest = await storage.createQuest({
        gateId: gate.id,
        title: "Chapter 1",
        description: "Read chapter 1",
        priority: "normal",
        xpReward: 10,
      });
      expect(quest.id).toBeDefined();
      expect(quest.status).toBe("available");

      const quests = await storage.getQuestsByGate(gate.id);
      expect(quests).toHaveLength(1);
    });

    it("updates quest status", async () => {
      const gate = await storage.createGate({ title: "Study", rank: "D" });
      const quest = await storage.createQuest({
        gateId: gate.id,
        title: "Chapter 1",
        description: "",
        priority: "normal",
        xpReward: 10,
      });
      await storage.updateQuest(quest.id, { status: "completed" });
      const updated = await storage.getQuest(quest.id);
      expect(updated?.status).toBe("completed");
    });
  });

  describe("xp log", () => {
    it("logs xp entries", async () => {
      await storage.addXpEntry({ amount: 50, reason: "Completed quest", source: "quest" });
      await storage.addXpEntry({ amount: -50, reason: "Missed day", source: "penalty" });
      const log = await storage.getXpLog();
      expect(log).toHaveLength(2);
      expect(log[0].amount).toBe(50);
    });
  });
});
