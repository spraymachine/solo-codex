export type Rank = "E" | "D" | "C" | "B" | "A" | "S";
export type Persona = "mani" | "harti" | "persona1" | "persona2";

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
  difficulty: 1 | 2 | 3;
  date: string;
  endDate: string | null;
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
  order: number;
  priorityColor: string | null;
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
  reflect: string;
}

export interface HunterRecord {
  date: string;
  entries: LogEntry[];
  reflection: Reflection | null;
  gratitude: string[];
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

export interface StickyNote {
  id: string;
  text: string;
  color: string;
  position: number;
  pinnedAt: string;
  archivedAt: string | null;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: string;
}

export type ReadSourceType = "book" | "note" | "newspaper" | "other" | (string & {});

export interface ReadRecord {
  id: string;
  word: string;
  definition: string;
  partOfSpeech: string;
  myDefinition: string;
  synonyms: string[];
  allDefinitions: Array<{ partOfSpeech: string; definition: string; example?: string }>;
  allSynonyms: string[];
  sourceType: ReadSourceType;
  bookId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BookShelf = "want" | "reading" | "read";

export interface Book {
  id: string;
  googleVolumeId: string | null;
  title: string;
  authors: string[];
  coverUrl: string | null;
  totalPages: number | null;
  shelf: BookShelf;
  currentPage: number;
  rating: number | null;
  notes: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CourseStatus = "planned" | "active" | "paused" | "completed";
export type WorkContactStatus = "lead" | "prospect" | "client" | "lost" | "archived";
export type WorkProjectStatus = "planned" | "active" | "paused" | "completed" | "archived";

export interface WorkCourse {
  id: string;
  title: string;
  url: string;
  goal: string;
  deadline: string;
  source: string;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CourseChapter {
  id: string;
  courseId: string;
  title: string;
  deadline: string;
  estimate: string;
  order: number;
}

export interface CourseMilestone {
  id: string;
  chapterId: string;
  title: string;
  deadline: string;
  estimate: string;
  link: string;
  notes: string;
  completed: boolean;
  order: number;
}

export interface WorkContact {
  id: string;
  name: string;
  status: WorkContactStatus;
  phone: string;
  phoneLabel: string;
  phone2: string;
  phone2Label: string;
  email: string;
  notes: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkProject {
  id: string;
  contactId: string;
  title: string;
  status: WorkProjectStatus;
  deadline: string;
  notes: string;
  progress: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
