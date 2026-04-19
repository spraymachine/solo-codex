import { getDb } from "./database";
import type {
  AppSnapshot,
  Gate,
  GymStat,
  HunterRecord,
  InventoryItem,
  Mission,
  PlayerProfile,
  Quest,
  QuestPriority,
  Reflection,
  Rank,
  XpLogEntry,
} from "@/lib/types";
import { generateId, nowISO, todayDate } from "@/lib/utils";

const DEFAULT_PROFILE: PlayerProfile = {
  name: "Hunter",
  rank: "E",
  level: 1,
  xp: 0,
  streakCount: 0,
  lastLogDate: null,
};

export const storage = {
  async getProfile(): Promise<PlayerProfile> {
    const db = getDb();
    const row = await db.profile.get(1);

    if (!row) {
      return { ...DEFAULT_PROFILE };
    }

    const profile: PlayerProfile = {
      name: row.name,
      rank: row.rank,
      level: row.level,
      xp: row.xp,
      streakCount: row.streakCount,
      lastLogDate: row.lastLogDate,
    };
    return profile;
  },

  async saveProfile(profile: PlayerProfile): Promise<void> {
    const db = getDb();
    await db.profile.put({ ...profile, _id: 1 });
  },

  async getGates(): Promise<Gate[]> {
    const db = getDb();
    return db.gates.toArray();
  },

  async getGatesByDate(date: string): Promise<Gate[]> {
    const db = getDb();
    return db.gates.where("date").equals(date).toArray();
  },

  async getGate(id: string): Promise<Gate | undefined> {
    const db = getDb();
    return db.gates.get(id);
  },

  async createGate(input: {
    title: string;
    rank: Rank;
    date?: string;
    why?: string;
  }): Promise<Gate> {
    const db = getDb();
    const gate: Gate = {
      id: generateId(),
      title: input.title,
      rank: input.rank,
      date: input.date ?? todayDate(),
      why: input.why ?? "",
      subTodos: [],
      status: "active",
      createdAt: nowISO(),
      clearedAt: null,
    };

    await db.gates.add(gate);
    return gate;
  },

  async updateGate(id: string, updates: Partial<Gate>): Promise<void> {
    const db = getDb();
    await db.gates.update(id, updates);
  },

  async deleteGate(id: string): Promise<void> {
    const db = getDb();
    await db.transaction("rw", [db.gates, db.quests], async () => {
      await db.quests.where("gateId").equals(id).delete();
      await db.gates.delete(id);
    });
  },

  async getQuestsByGate(gateId: string): Promise<Quest[]> {
    const db = getDb();
    return db.quests.where("gateId").equals(gateId).sortBy("order");
  },

  async getQuest(id: string): Promise<Quest | undefined> {
    const db = getDb();
    return db.quests.get(id);
  },

  async getActiveQuests(): Promise<Quest[]> {
    const db = getDb();
    return db.quests.where("status").equals("in_progress").toArray();
  },

  async createQuest(input: {
    gateId: string;
    title: string;
    description: string;
    priority: QuestPriority;
    xpReward: number;
  }): Promise<Quest> {
    const db = getDb();
    const count = await db.quests.where("gateId").equals(input.gateId).count();
    const quest: Quest = {
      id: generateId(),
      gateId: input.gateId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: "available",
      xpReward: input.xpReward,
      subQuests: [],
      timerDuration: null,
      createdAt: nowISO(),
      completedAt: null,
      order: count,
    };

    await db.quests.add(quest);
    return quest;
  },

  async updateQuest(id: string, updates: Partial<Quest>): Promise<void> {
    const db = getDb();
    await db.quests.update(id, updates);
  },

  async deleteQuest(id: string): Promise<void> {
    const db = getDb();
    await db.quests.delete(id);
  },

  async reorderQuests(gateId: string, orderedQuestIds: string[]): Promise<void> {
    const db = getDb();
    await db.transaction("rw", db.quests, async () => {
      await Promise.all(
        orderedQuestIds.map((questId, index) =>
          db.quests.where("id").equals(questId).modify({ gateId, order: index }),
        ),
      );
    });
  },

  async addXpEntry(input: {
    amount: number;
    reason: string;
    source: string;
  }): Promise<void> {
    const db = getDb();
    const offset = await db.xpLog.count();
    const entry: XpLogEntry = {
      id: generateId(),
      timestamp: new Date(Date.now() + offset).toISOString(),
      amount: input.amount,
      reason: input.reason,
      source: input.source,
    };

    await db.xpLog.add(entry);
  },

  async getXpLog(): Promise<XpLogEntry[]> {
    const db = getDb();
    return db.xpLog.orderBy("timestamp").toArray();
  },

  async getMissions(): Promise<Mission[]> {
    const db = getDb();
    return db.missions.toArray();
  },

  async getMissionsByDate(date: string): Promise<Mission[]> {
    const db = getDb();
    return db.missions.where("date").equals(date).toArray();
  },

  async createMission(input: {
    title: string;
    rank: Rank;
    date?: string;
    why?: string;
    targetMetric: string;
    currentValue: number;
    targetValue: number;
    unit: string;
    deadline: string | null;
    linkedGateIds: string[];
  }): Promise<Mission> {
    const db = getDb();
    const mission: Mission = {
      id: generateId(),
      title: input.title,
      rank: input.rank,
      date: input.date ?? todayDate(),
      why: input.why ?? "",
      targetMetric: input.targetMetric,
      currentValue: input.currentValue,
      targetValue: input.targetValue,
      unit: input.unit,
      deadline: input.deadline,
      linkedGateIds: input.linkedGateIds,
      createdAt: nowISO(),
      completedAt: null,
    };

    await db.missions.add(mission);
    return mission;
  },

  async updateMission(id: string, updates: Partial<Mission>): Promise<void> {
    const db = getDb();
    await db.missions.update(id, updates);
  },

  async deleteMission(id: string): Promise<void> {
    const db = getDb();
    await db.missions.delete(id);
  },

  async getInventoryItems(): Promise<InventoryItem[]> {
    const db = getDb();
    return db.inventory.toArray();
  },

  async createInventoryItem(input: {
    name: string;
    notes: string;
    tags: string[];
  }): Promise<InventoryItem> {
    const db = getDb();
    const item: InventoryItem = {
      id: generateId(),
      name: input.name,
      dateStarted: nowISO(),
      notes: input.notes,
      tags: input.tags,
      promotedTo: null,
    };

    await db.inventory.add(item);
    return item;
  },

  async updateInventoryItem(
    id: string,
    updates: Partial<InventoryItem>,
  ): Promise<void> {
    const db = getDb();
    await db.inventory.update(id, updates);
  },

  async deleteInventoryItem(id: string): Promise<void> {
    const db = getDb();
    await db.inventory.delete(id);
  },

  async getHunterRecords(): Promise<HunterRecord[]> {
    const db = getDb();
    return db.hunterRecords.orderBy("date").reverse().toArray();
  },

  async getHunterRecord(date: string): Promise<HunterRecord | undefined> {
    const db = getDb();
    return db.hunterRecords.get(date);
  },

  async addHunterEntry(date: string, text: string): Promise<HunterRecord> {
    const db = getDb();
    const existing = await db.hunterRecords.get(date);
    const next: HunterRecord = {
      date,
      entries: [
        ...(existing?.entries ?? []),
        { timestamp: nowISO(), text },
      ],
      reflection: existing?.reflection ?? null,
      penaltyApplied: existing?.penaltyApplied ?? false,
    };

    await db.hunterRecords.put(next);
    return next;
  },

  async saveHunterReflection(
    date: string,
    reflection: Reflection,
  ): Promise<HunterRecord> {
    const db = getDb();
    const existing = await db.hunterRecords.get(date);
    const next: HunterRecord = {
      date,
      entries: existing?.entries ?? [],
      reflection,
      penaltyApplied: existing?.penaltyApplied ?? false,
    };

    await db.hunterRecords.put(next);
    return next;
  },

  async markPenaltyApplied(date: string): Promise<HunterRecord> {
    const db = getDb();
    const existing = await db.hunterRecords.get(date);
    const next: HunterRecord = {
      date,
      entries: existing?.entries ?? [],
      reflection: existing?.reflection ?? null,
      penaltyApplied: true,
    };

    await db.hunterRecords.put(next);
    return next;
  },

  async getGymStats(): Promise<GymStat[]> {
    const db = getDb();
    return db.gymStats.toArray();
  },

  async createGymStat(input: {
    name: string;
    unit: string;
  }): Promise<GymStat> {
    const db = getDb();
    const stat: GymStat = {
      id: generateId(),
      name: input.name,
      unit: input.unit,
      entries: [],
    };

    await db.gymStats.add(stat);
    return stat;
  },

  async updateGymStat(id: string, updates: Partial<GymStat>): Promise<void> {
    const db = getDb();
    await db.gymStats.update(id, updates);
  },

  async addGymStatEntry(
    id: string,
    value: number,
    date: string,
  ): Promise<GymStat | undefined> {
    const db = getDb();
    const stat = await db.gymStats.get(id);

    if (!stat) {
      return undefined;
    }

    const next: GymStat = {
      ...stat,
      entries: [...stat.entries, { value, date }],
    };

    await db.gymStats.put(next);
    return next;
  },

  async deleteGymStat(id: string): Promise<void> {
    const db = getDb();
    await db.gymStats.delete(id);
  },

  async clear(): Promise<void> {
    const db = getDb();
    await Promise.all([
      db.profile.clear(),
      db.gates.clear(),
      db.quests.clear(),
      db.missions.clear(),
      db.inventory.clear(),
      db.hunterRecords.clear(),
      db.gymStats.clear(),
      db.xpLog.clear(),
    ]);
  },

  async exportSnapshot(): Promise<AppSnapshot> {
    const db = getDb();
    const [profile, gates, quests, missions, inventory, hunterRecords, gymStats, xpLog] =
      await Promise.all([
        this.getProfile(),
        this.getGates(),
        db.quests.toArray(),
        this.getMissions(),
        this.getInventoryItems(),
        this.getHunterRecords(),
        this.getGymStats(),
        this.getXpLog(),
      ]);

    return {
      profile,
      gates,
      quests,
      missions,
      inventory,
      hunterRecords,
      gymStats,
      xpLog,
    };
  },

  async importSnapshot(snapshot: AppSnapshot): Promise<void> {
    const db = getDb();
    await db.transaction(
      "rw",
      [
        db.profile,
        db.gates,
        db.quests,
        db.missions,
        db.inventory,
        db.hunterRecords,
        db.gymStats,
        db.xpLog,
      ],
      async () => {
        await this.clear();
        await db.profile.put({ ...snapshot.profile, _id: 1 });
        if (snapshot.gates.length) await db.gates.bulkPut(snapshot.gates);
        if (snapshot.quests.length) await db.quests.bulkPut(snapshot.quests);
        if (snapshot.missions.length) await db.missions.bulkPut(snapshot.missions);
        if (snapshot.inventory.length) await db.inventory.bulkPut(snapshot.inventory);
        if (snapshot.hunterRecords.length)
          await db.hunterRecords.bulkPut(snapshot.hunterRecords);
        if (snapshot.gymStats.length) await db.gymStats.bulkPut(snapshot.gymStats);
        if (snapshot.xpLog.length) await db.xpLog.bulkPut(snapshot.xpLog);
      },
    );
  },
};
