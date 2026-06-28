import { getDb } from "./database";
import type {
  AppSnapshot,
  Book,
  BookShelf,
  Gate,
  GymStat,
  HunterRecord,
  InventoryItem,
  Mission,
  Persona,
  PlayerProfile,
  Quest,
  QuestPriority,
  ReadRecord,
  ReadSourceType,
  Reflection,
  Rank,
  XpLogEntry,
  WorkoutSplitDay,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutTemplateExercise,
  WorkoutExercise,
  MuscleGroup,
} from "@/lib/types";
import { generateId, nowISO, todayDate } from "@/lib/utils";

type StorageOptions = {
  persona?: Persona;
};

const DEFAULT_PROFILE: PlayerProfile = {
  name: "Hunter",
  rank: "E",
  level: 1,
  xp: 0,
  streakCount: 0,
  lastLogDate: null,
};

export const storage = {
  async getProfile(options?: StorageOptions): Promise<PlayerProfile> {
    const db = getDb(options?.persona);
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

  async getGates(options?: StorageOptions): Promise<Gate[]> {
    const db = getDb(options?.persona);
    return db.gates.toArray();
  },

  async getGatesByDate(date: string, options?: StorageOptions): Promise<Gate[]> {
    const db = getDb(options?.persona);
    return db.gates.where("date").equals(date).toArray();
  },

  async getGate(id: string): Promise<Gate | undefined> {
    const db = getDb();
    return db.gates.get(id);
  },

  async createGate(input: {
    title: string;
    rank: Rank;
    difficulty?: 1 | 2 | 3;
    date?: string;
    endDate?: string;
    why?: string;
  }): Promise<Gate> {
    const db = getDb();
    const gate: Gate = {
      id: generateId(),
      title: input.title,
      rank: input.rank,
      difficulty: input.difficulty ?? 1,
      date: input.date ?? todayDate(),
      endDate: input.endDate ?? null,
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

  async getQuestsByGate(gateId: string, options?: StorageOptions): Promise<Quest[]> {
    const db = getDb(options?.persona);
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

  async getXpLog(options?: StorageOptions): Promise<XpLogEntry[]> {
    const db = getDb(options?.persona);
    return db.xpLog.orderBy("timestamp").toArray();
  },

  async getMissions(options?: StorageOptions): Promise<Mission[]> {
    const db = getDb(options?.persona);
    return db.missions.toArray();
  },

  async getMissionsByDate(date: string, options?: StorageOptions): Promise<Mission[]> {
    const db = getDb(options?.persona);
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
    const date = input.date ?? todayDate();
    const dayMissions = await db.missions.where("date").equals(date).toArray();
    const nextOrder = dayMissions.reduce((max, m) => Math.max(max, m.order ?? 0), -1) + 1;
    const mission: Mission = {
      id: generateId(),
      title: input.title,
      rank: input.rank,
      date,
      why: input.why ?? "",
      targetMetric: input.targetMetric,
      currentValue: input.currentValue,
      targetValue: input.targetValue,
      unit: input.unit,
      deadline: input.deadline,
      linkedGateIds: input.linkedGateIds,
      order: nextOrder,
      priorityColor: null,
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

  async getInventoryItems(options?: StorageOptions): Promise<InventoryItem[]> {
    const db = getDb(options?.persona);
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

  async getHunterRecords(options?: StorageOptions): Promise<HunterRecord[]> {
    const db = getDb(options?.persona);
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
      gratitude: existing?.gratitude ?? [],
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
      gratitude: existing?.gratitude ?? [],
      penaltyApplied: existing?.penaltyApplied ?? false,
    };

    await db.hunterRecords.put(next);
    return next;
  },

  async addGratitudeItem(date: string, text: string): Promise<HunterRecord> {
    const db = getDb();
    const existing = await db.hunterRecords.get(date);
    const next: HunterRecord = {
      date,
      entries: existing?.entries ?? [],
      reflection: existing?.reflection ?? null,
      gratitude: [...(existing?.gratitude ?? []), text],
      penaltyApplied: existing?.penaltyApplied ?? false,
    };

    await db.hunterRecords.put(next);
    return next;
  },

  async getReadRecords(options?: StorageOptions): Promise<ReadRecord[]> {
    const db = getDb(options?.persona);
    return db.readRecords.orderBy("createdAt").reverse().toArray();
  },

  async createReadRecord(input: {
    word: string;
    definition: string;
    partOfSpeech: string;
    myDefinition: string;
    synonyms: string[];
    allDefinitions: Array<{ partOfSpeech: string; definition: string; example?: string; source?: string }>;
    allSynonyms: string[];
    sourceType: ReadSourceType;
    bookId?: string | null;
  }): Promise<ReadRecord> {
    const db = getDb();
    const timestamp = nowISO();
    const record: ReadRecord = {
      id: generateId(),
      word: input.word.trim(),
      definition: input.definition.trim(),
      partOfSpeech: input.partOfSpeech.trim(),
      myDefinition: input.myDefinition,
      synonyms: input.synonyms.slice(0, 2),
      allDefinitions: input.allDefinitions,
      allSynonyms: input.allSynonyms,
      sourceType: input.sourceType,
      bookId: input.bookId ?? null,
      favorite: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.readRecords.add(record);
    return record;
  },

  async updateReadRecord(
    id: string,
    updates: Partial<Pick<ReadRecord, "word" | "definition" | "partOfSpeech" | "sourceType" | "myDefinition" | "synonyms" | "bookId" | "allDefinitions" | "allSynonyms" | "favorite">>,
  ): Promise<void> {
    const db = getDb();
    if (updates.synonyms) updates.synonyms = updates.synonyms.slice(0, 2);
    await db.readRecords.update(id, {
      ...updates,
      updatedAt: nowISO(),
    });
  },

  async deleteReadRecord(id: string): Promise<void> {
    const db = getDb();
    await db.readRecords.delete(id);
  },

  async getBooks(options?: StorageOptions): Promise<Book[]> {
    const db = getDb(options?.persona);
    return db.books.orderBy("createdAt").reverse().toArray();
  },

  async createBook(input: {
    googleVolumeId: string | null;
    title: string;
    authors: string[];
    coverUrl: string | null;
    totalPages: number | null;
    shelf: BookShelf;
  }): Promise<Book> {
    const db = getDb();
    const timestamp = nowISO();
    const book: Book = {
      id: generateId(),
      googleVolumeId: input.googleVolumeId,
      title: input.title.trim(),
      authors: input.authors,
      coverUrl: input.coverUrl,
      totalPages: input.totalPages,
      shelf: input.shelf,
      currentPage: 0,
      rating: null,
      notes: "",
      startedAt: input.shelf === "reading" ? timestamp : null,
      finishedAt: input.shelf === "read" ? timestamp : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.books.add(book);
    return book;
  },

  async updateBook(
    id: string,
    updates: Partial<Pick<Book, "shelf" | "currentPage" | "rating" | "notes" | "startedAt" | "finishedAt">>,
  ): Promise<void> {
    const db = getDb();
    await db.books.update(id, { ...updates, updatedAt: nowISO() });
  },

  async deleteBook(id: string): Promise<void> {
    const db = getDb();
    await db.books.delete(id);
  },

  async markPenaltyApplied(date: string): Promise<HunterRecord> {
    const db = getDb();
    const existing = await db.hunterRecords.get(date);
    const next: HunterRecord = {
      date,
      entries: existing?.entries ?? [],
      reflection: existing?.reflection ?? null,
      gratitude: existing?.gratitude ?? [],
      penaltyApplied: true,
    };

    await db.hunterRecords.put(next);
    return next;
  },

  async getGymStats(options?: StorageOptions): Promise<GymStat[]> {
    const db = getDb(options?.persona);
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

  async getSplitDays(options?: StorageOptions): Promise<WorkoutSplitDay[]> {
    const db = getDb(options?.persona);
    return db.workoutSplitDays.orderBy("order").toArray();
  },

  async createSplitDay(input: {
    name: string;
    muscles: MuscleGroup[];
    exercises: WorkoutTemplateExercise[];
  }): Promise<WorkoutSplitDay> {
    const db = getDb();
    const count = await db.workoutSplitDays.count();
    const timestamp = nowISO();
    const day: WorkoutSplitDay = {
      id: generateId(),
      name: input.name.trim(),
      muscles: input.muscles,
      exercises: input.exercises,
      order: count,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.workoutSplitDays.add(day);
    return day;
  },

  async updateSplitDay(
    id: string,
    updates: Partial<Pick<WorkoutSplitDay, "name" | "muscles" | "exercises" | "order">>,
  ): Promise<void> {
    const db = getDb();
    await db.workoutSplitDays.update(id, { ...updates, updatedAt: nowISO() });
  },

  async deleteSplitDay(id: string): Promise<void> {
    const db = getDb();
    await db.workoutSplitDays.delete(id);
  },

  async getSessions(options?: StorageOptions): Promise<WorkoutSession[]> {
    const db = getDb(options?.persona);
    return db.workoutSessions.orderBy("createdAt").reverse().toArray();
  },

  async createSession(input: {
    date: string;
    splitDayId: string | null;
    name: string;
    muscles: MuscleGroup[];
    exercises: WorkoutSessionExercise[];
  }): Promise<WorkoutSession> {
    const db = getDb();
    const timestamp = nowISO();
    const session: WorkoutSession = {
      id: generateId(),
      date: input.date,
      splitDayId: input.splitDayId,
      name: input.name,
      muscles: input.muscles,
      rating: null,
      exercises: input.exercises,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.workoutSessions.add(session);
    return session;
  },

  async updateSession(
    id: string,
    updates: Partial<Pick<WorkoutSession, "rating" | "exercises">>,
  ): Promise<void> {
    const db = getDb();
    await db.workoutSessions.update(id, { ...updates, updatedAt: nowISO() });
  },

  async deleteSession(id: string): Promise<void> {
    const db = getDb();
    await db.workoutSessions.delete(id);
  },

  async getCustomExercises(options?: StorageOptions): Promise<WorkoutExercise[]> {
    const db = getDb(options?.persona);
    return db.workoutExercises.toArray();
  },

  async upsertCustomExercise(input: {
    name: string;
    muscles: MuscleGroup[];
    isBodyweight: boolean;
  }): Promise<WorkoutExercise> {
    const db = getDb();
    const name = input.name.trim();
    const existing = await db.workoutExercises
      .filter((e) => e.name.toLowerCase() === name.toLowerCase())
      .first();
    if (existing) return existing;
    const exercise: WorkoutExercise = {
      id: generateId(),
      name,
      muscles: input.muscles,
      isBodyweight: input.isBodyweight,
    };
    await db.workoutExercises.add(exercise);
    return exercise;
  },

  async clear(): Promise<void> {
    const db = getDb();
    await Promise.all([
      db.profile.clear(),
      db.gates.clear(),
      db.quests.clear(),
      db.missions.clear(),
      db.inventory.clear(),
      db.readRecords.clear(),
      db.books.clear(),
      db.hunterRecords.clear(),
      db.gymStats.clear(),
      db.xpLog.clear(),
      db.workoutSplitDays.clear(),
      db.workoutSessions.clear(),
      db.workoutExercises.clear(),
    ]);
  },

  async exportSnapshot(options?: StorageOptions): Promise<AppSnapshot> {
    const db = getDb(options?.persona);
    const [profile, gates, quests, missions, inventory, hunterRecords, gymStats, xpLog] =
      await Promise.all([
        this.getProfile(options),
        this.getGates(options),
        db.quests.toArray(),
        this.getMissions(options),
        this.getInventoryItems(options),
        this.getHunterRecords(options),
        this.getGymStats(options),
        this.getXpLog(options),
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

  async importSnapshot(snapshot: AppSnapshot, options?: StorageOptions): Promise<void> {
    const db = getDb(options?.persona);
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
