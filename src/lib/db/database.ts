import Dexie, { type EntityTable } from "dexie";
import type {
  Gate,
  GymStat,
  HunterRecord,
  InventoryItem,
  Lead,
  Mission,
  PlayerProfile,
  Quest,
  ReadRecord,
  StickyNote,
  XpLogEntry,
  Persona,
} from "@/lib/types";
import { usePersonaStore } from "@/lib/stores/persona-store";

class SoloLevelingDB extends Dexie {
  profile!: EntityTable<PlayerProfile & { _id: number }, "_id">;
  gates!: EntityTable<Gate, "id">;
  quests!: EntityTable<Quest, "id">;
  missions!: EntityTable<Mission, "id">;
  inventory!: EntityTable<InventoryItem, "id">;
  hunterRecords!: EntityTable<HunterRecord, "date">;
  gymStats!: EntityTable<GymStat, "id">;
  xpLog!: EntityTable<XpLogEntry, "id">;
  stickyNotes!: EntityTable<StickyNote, "id">;
  leads!: EntityTable<Lead, "id">;
  readRecords!: EntityTable<ReadRecord, "id">;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      profile: "_id",
      gates: "id, status, rank",
      quests: "id, gateId, status, order",
      missions: "id, rank",
      inventory: "id",
      hunterRecords: "date",
      gymStats: "id",
      xpLog: "id, timestamp",
    });
    this.version(2)
      .stores({
        profile: "_id",
        gates: "id, status, rank, date",
        quests: "id, gateId, status, order",
        missions: "id, rank, date",
        inventory: "id",
        hunterRecords: "date",
        gymStats: "id",
        xpLog: "id, timestamp",
      })
      .upgrade(async (tx) => {
        await tx.table("gates").toCollection().modify((gate: Partial<Gate>) => {
          gate.date ??= "2026-04-20";
          gate.why ??= "";
        });
        await tx.table("missions").toCollection().modify((mission: Partial<Mission>) => {
          mission.date ??= "2026-04-20";
          mission.why ??= "";
        });
      });
    this.version(3)
      .stores({
        profile: "_id",
        gates: "id, status, rank, date",
        quests: "id, gateId, status, order",
        missions: "id, rank, date",
        inventory: "id",
        hunterRecords: "date",
        gymStats: "id",
        xpLog: "id, timestamp",
      })
      .upgrade(async (tx) => {
        await tx.table("gates").toCollection().modify((gate: Partial<Gate>) => {
          gate.subTodos ??= [];
        });
      });
    this.version(4)
      .stores({
        profile: "_id",
        gates: "id, status, rank, date",
        quests: "id, gateId, status, order",
        missions: "id, rank, date",
        inventory: "id",
        hunterRecords: "date",
        gymStats: "id",
        xpLog: "id, timestamp",
      })
      .upgrade(async (tx) => {
        await tx.table("gates").toCollection().modify((gate: Partial<Gate>) => {
          gate.endDate ??= null;
        });
      });
    this.version(5).stores({
      profile: "_id",
      gates: "id, status, rank, date",
      quests: "id, gateId, status, order",
      missions: "id, rank, date",
      inventory: "id",
      hunterRecords: "date",
      gymStats: "id",
      xpLog: "id, timestamp",
      stickyNotes: "id, pinnedAt",
    });
    this.version(6).stores({
      profile: "_id",
      gates: "id, status, rank, date",
      quests: "id, gateId, status, order",
      missions: "id, rank, date",
      inventory: "id",
      hunterRecords: "date",
      gymStats: "id",
      xpLog: "id, timestamp",
      stickyNotes: "id, pinnedAt",
      leads: "id, createdAt",
    });
    this.version(7)
      .stores({
        profile: "_id",
        gates: "id, status, rank, date",
        quests: "id, gateId, status, order",
        missions: "id, rank, date, order",
        inventory: "id",
        hunterRecords: "date",
        gymStats: "id",
        xpLog: "id, timestamp",
        stickyNotes: "id, pinnedAt",
        leads: "id, createdAt",
      })
      .upgrade(async (tx) => {
        const byDate = new Map<string, Mission[]>();
        const missions = await tx.table("missions").toCollection().toArray();
        missions.sort((a: Mission, b: Mission) => a.createdAt.localeCompare(b.createdAt));
        for (const mission of missions as Mission[]) {
          const list = byDate.get(mission.date) ?? [];
          list.push(mission);
          byDate.set(mission.date, list);
        }
        for (const list of byDate.values()) {
          for (let i = 0; i < list.length; i += 1) {
            await tx.table("missions").update(list[i].id, { order: i });
          }
        }
      });
    this.version(8)
      .stores({
        profile: "_id",
        gates: "id, status, rank, date",
        quests: "id, gateId, status, order",
        missions: "id, rank, date, order",
        inventory: "id",
        hunterRecords: "date",
        gymStats: "id",
        xpLog: "id, timestamp",
        stickyNotes: "id, pinnedAt",
        leads: "id, createdAt",
      })
      .upgrade(async (tx) => {
        await tx.table("missions").toCollection().modify((mission: Partial<Mission>) => {
          mission.priorityColor ??= null;
        });
      });
    this.version(9).stores({
      profile: "_id",
      gates: "id, status, rank, date",
      quests: "id, gateId, status, order",
      missions: "id, rank, date, order",
      inventory: "id",
      hunterRecords: "date",
      gymStats: "id",
      xpLog: "id, timestamp",
      stickyNotes: "id, pinnedAt",
      leads: "id, createdAt",
      readRecords: "id, createdAt, word, sourceType",
    });
  }
}

const dbCache = new Map<Persona, SoloLevelingDB>();

export function getDatabaseName(persona: Persona) {
  return `SoloLevelingDB-${persona}`;
}

export function getDb(persona = usePersonaStore.getState().activePersona) {
  const cached = dbCache.get(persona);
  if (cached) {
    return cached;
  }

  const next = new SoloLevelingDB(getDatabaseName(persona));
  dbCache.set(persona, next);
  return next;
}
