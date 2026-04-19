export type Rank = "E" | "D" | "C" | "B" | "A" | "S";
export type Persona = "mani" | "harti";

export type GateStatus = "locked" | "active" | "cleared" | "failed";

export type QuestStatus = "available" | "in_progress" | "completed";

export type QuestPriority = "normal" | "urgent" | "critical";

export interface SubQuest {
  id: string;
  title: string;
  completed: boolean;
}

export interface Quest {
  id: string;
  gateId: string;
  title: string;
  description: string;
  priority: QuestPriority;
  status: QuestStatus;
  xpReward: number;
  subQuests: SubQuest[];
  timerDuration: number | null;
  createdAt: string;
  completedAt: string | null;
  order: number;
}

export interface Gate {
  id: string;
  title: string;
  rank: Rank;
  date: string;
  why: string;
  subTodos: SubQuest[];
  status: GateStatus;
  createdAt: string;
  clearedAt: string | null;
}

export interface Mission {
  id: string;
  title: string;
  rank: Rank;
  date: string;
  why: string;
  targetMetric: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  deadline: string | null;
  linkedGateIds: string[];
  createdAt: string;
  completedAt: string | null;
}

export interface InventoryItem {
  id: string;
  name: string;
  dateStarted: string;
  notes: string;
  tags: string[];
  promotedTo:
    | { type: "gate"; id: string }
    | { type: "mission"; id: string }
    | null;
}

export interface LogEntry {
  timestamp: string;
  text: string;
}

export interface Reflection {
  accomplished: string;
  blockers: string;
  mood: string;
}

export interface HunterRecord {
  date: string;
  entries: LogEntry[];
  reflection: Reflection | null;
  penaltyApplied: boolean;
}

export interface GymStatEntry {
  value: number;
  date: string;
}

export interface GymStat {
  id: string;
  name: string;
  unit: string;
  entries: GymStatEntry[];
}

export interface PlayerProfile {
  name: string;
  rank: Rank;
  level: number;
  xp: number;
  streakCount: number;
  lastLogDate: string | null;
}

export interface XpLogEntry {
  id: string;
  timestamp: string;
  amount: number;
  reason: string;
  source: string;
}

export interface AppSnapshot {
  profile: PlayerProfile;
  gates: Gate[];
  quests: Quest[];
  missions: Mission[];
  inventory: InventoryItem[];
  hunterRecords: HunterRecord[];
  gymStats: GymStat[];
  xpLog: XpLogEntry[];
}
