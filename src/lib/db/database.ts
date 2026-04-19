import Dexie, { type EntityTable } from "dexie";
import type {
  Gate,
  GymStat,
  HunterRecord,
  InventoryItem,
  Mission,
  PlayerProfile,
  Quest,
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
