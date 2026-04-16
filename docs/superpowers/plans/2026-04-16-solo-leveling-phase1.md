# Solo Leveling System — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core app shell, data layer, Dashboard, and Gates system — a working foundation that all other features plug into.

**Architecture:** Next.js App Router with a dark Solo Leveling-themed UI. All data stored in IndexedDB via Dexie.js, accessed through a storage abstraction layer. Zustand manages runtime state and syncs with Dexie. Tailwind for styling, Framer Motion for animations.

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, Framer Motion, Dexie.js, Zustand, Vitest + React Testing Library

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx              — Root layout: fonts, providers, sidebar/bottom nav
│   ├── page.tsx                — Dashboard page
│   ├── gates/
│   │   ├── page.tsx            — Gates list page
│   │   └── [id]/
│   │       └── page.tsx        — Single gate detail (quest list)
│   └── globals.css             — Tailwind base + custom glow utilities
│
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx         — Desktop side rail navigation
│   │   ├── bottom-nav.tsx      — Mobile bottom tab bar
│   │   └── nav-item.tsx        — Shared nav item (icon + label + active state)
│   ├── dashboard/
│   │   ├── player-card.tsx     — Name, rank, level, XP bar
│   │   ├── today-status.tsx    — Streak, log status, active gate count
│   │   └── active-quests.tsx   — Top in-progress quests across gates
│   ├── gates/
│   │   ├── gate-card.tsx       — Gate summary card (rank badge, progress, status)
│   │   ├── gate-form.tsx       — Create/edit gate modal
│   │   ├── quest-item.tsx      — Single quest row with sub-quests
│   │   ├── quest-form.tsx      — Create/edit quest modal
│   │   └── sub-quest-item.tsx  — Checkbox item inside a quest
│   └── ui/
│       ├── panel.tsx           — Reusable glowing panel container
│       ├── rank-badge.tsx      — E/D/C/B/A/S colored badge
│       ├── xp-bar.tsx          — Animated XP progress bar
│       ├── modal.tsx           — Dark themed modal overlay
│       └── button.tsx          — Styled button variants
│
├── lib/
│   ├── db/
│   │   ├── database.ts         — Dexie database definition + schema
│   │   ├── storage.ts          — Storage abstraction layer (read/write interface)
│   │   └── seed.ts             — Optional seed data for development
│   ├── stores/
│   │   ├── player-store.ts     — Zustand store for player profile + XP
│   │   └── gates-store.ts      — Zustand store for gates + quests
│   ├── types.ts                — All TypeScript interfaces
│   ├── config.ts               — Configurable values (XP amounts, rank thresholds)
│   └── utils.ts                — ID generation, date helpers
│
└── __tests__/
    ├── lib/
    │   ├── storage.test.ts     — Storage abstraction tests
    │   ├── player-store.test.ts— Player store logic tests
    │   └── gates-store.test.ts — Gates store logic tests
    └── components/
        ├── panel.test.tsx      — Panel component render tests
        ├── rank-badge.test.tsx — Rank badge render tests
        └── gate-card.test.tsx  — Gate card render tests
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/mani/Desktop/solo-leveling
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

- [ ] **Step 2: Install dependencies**

```bash
npm install dexie dexie-react-hooks zustand framer-motion recharts
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Create `src/__tests__/setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add test script to package.json**

Add to `scripts` in `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Replace globals.css with Solo Leveling theme base**

Replace `src/app/globals.css`:

```css
@import "tailwindcss";

:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-panel: rgba(18, 18, 26, 0.8);
  --border-glow: rgba(59, 130, 246, 0.3);
  --blue-accent: #3b82f6;
  --violet-accent: #8b5cf6;
  --amber-accent: #f59e0b;
  --red-accent: #ef4444;
  --emerald-accent: #10b981;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-sans);
}

/* Glow utilities */
.glow-blue {
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.15), inset 0 0 12px rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.glow-violet {
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.15), inset 0 0 12px rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.25);
}

.glow-emerald {
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.15), inset 0 0 12px rgba(16, 185, 129, 0.05);
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.glow-red {
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.15), inset 0 0 12px rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.glow-amber {
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.15), inset 0 0 12px rgba(245, 158, 11, 0.05);
  border: 1px solid rgba(245, 158, 11, 0.25);
}
```

- [ ] **Step 6: Update root layout with fonts**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Solo Leveling System",
  description: "Personal productivity system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Replace default page with placeholder**

Replace `src/app/page.tsx`:

```tsx
export default function Dashboard() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="font-mono text-2xl text-blue-400">
        SYSTEM INITIALIZING...
      </h1>
    </main>
  );
}
```

- [ ] **Step 8: Verify build and dev server**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Solo Leveling theme base"
```

---

### Task 2: TypeScript Types & Config

**Files:**
- Create: `src/lib/types.ts`, `src/lib/config.ts`, `src/lib/utils.ts`

- [ ] **Step 1: Define all TypeScript interfaces**

Create `src/lib/types.ts`:

```typescript
export type Rank = "E" | "D" | "C" | "B" | "A" | "S";

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
  status: GateStatus;
  createdAt: string;
  clearedAt: string | null;
}

export interface Mission {
  id: string;
  title: string;
  rank: Rank;
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
  promotedTo: { type: "gate"; id: string } | { type: "mission"; id: string } | null;
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

export interface GymStat {
  id: string;
  name: string;
  unit: string;
  entries: { value: number; date: string }[];
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
```

- [ ] **Step 2: Create configurable values**

Create `src/lib/config.ts`:

```typescript
export const config = {
  xp: {
    questReward: { normal: 10, urgent: 25, critical: 50 },
    gateBonus: { E: 20, D: 40, C: 80, B: 150, A: 300, S: 500 },
    dailyLog: 15,
    streakMultiplier: 2,
    missionComplete: 100,
    missedDayPenalty: -50,
  },
  leveling: {
    xpPerLevel: (level: number) => level * 100,
  },
  ranks: {
    thresholds: { E: 1, D: 6, C: 16, B: 31, A: 51, S: 76 } as Record<string, number>,
  },
  reminders: {
    defaultTime: "21:00",
  },
};
```

- [ ] **Step 3: Create utility helpers**

Create `src/lib/utils.ts`:

```typescript
export function generateId(): string {
  return crypto.randomUUID();
}

export function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function nowISO(): string {
  return new Date().toISOString();
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/config.ts src/lib/utils.ts
git commit -m "feat: add TypeScript types, config, and utilities"
```

---

### Task 3: Database & Storage Abstraction Layer

**Files:**
- Create: `src/lib/db/database.ts`, `src/lib/db/storage.ts`
- Test: `src/__tests__/lib/storage.test.ts`

- [ ] **Step 1: Write storage abstraction tests**

Create `src/__tests__/lib/storage.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { storage } from "@/lib/db/storage";

// Dexie uses fake-indexeddb in jsdom automatically via vitest

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
      await storage.saveProfile({ name: "Jin-Woo", rank: "B", level: 31, xp: 5000, streakCount: 10, lastLogDate: "2026-04-16" });
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
      await storage.createQuest({ gateId: gate.id, title: "Read docs", description: "", priority: "normal", xpReward: 10 });
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
      const quest = await storage.createQuest({ gateId: gate.id, title: "Chapter 1", description: "Read chapter 1", priority: "normal", xpReward: 10 });
      expect(quest.id).toBeDefined();
      expect(quest.status).toBe("available");

      const quests = await storage.getQuestsByGate(gate.id);
      expect(quests).toHaveLength(1);
    });

    it("updates quest status", async () => {
      const gate = await storage.createGate({ title: "Study", rank: "D" });
      const quest = await storage.createQuest({ gateId: gate.id, title: "Chapter 1", description: "", priority: "normal", xpReward: 10 });
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
```

- [ ] **Step 2: Install fake-indexeddb for tests**

```bash
npm install -D fake-indexeddb
```

Update `src/__tests__/setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — modules not found.

- [ ] **Step 4: Create Dexie database definition**

Create `src/lib/db/database.ts`:

```typescript
import Dexie, { type EntityTable } from "dexie";
import type { Gate, Quest, Mission, InventoryItem, HunterRecord, GymStat, PlayerProfile, XpLogEntry } from "@/lib/types";

class SoloLevelingDB extends Dexie {
  profile!: EntityTable<PlayerProfile & { _id: number }, "_id">;
  gates!: EntityTable<Gate, "id">;
  quests!: EntityTable<Quest, "id">;
  missions!: EntityTable<Mission, "id">;
  inventory!: EntityTable<InventoryItem, "id">;
  hunterRecords!: EntityTable<HunterRecord, "date">;
  gymStats!: EntityTable<GymStat, "id">;
  xpLog!: EntityTable<XpLogEntry, "id">;

  constructor() {
    super("SoloLevelingDB");
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
  }
}

export const db = new SoloLevelingDB();
```

- [ ] **Step 5: Create storage abstraction layer**

Create `src/lib/db/storage.ts`:

```typescript
import { db } from "./database";
import type {
  Gate, Quest, Mission, InventoryItem, HunterRecord,
  GymStat, PlayerProfile, XpLogEntry, Rank, QuestPriority,
} from "@/lib/types";
import { generateId, nowISO } from "@/lib/utils";

const DEFAULT_PROFILE: PlayerProfile = {
  name: "Hunter",
  rank: "E",
  level: 1,
  xp: 0,
  streakCount: 0,
  lastLogDate: null,
};

export const storage = {
  // --- Profile ---
  async getProfile(): Promise<PlayerProfile> {
    const row = await db.profile.get(1);
    return row ? { name: row.name, rank: row.rank, level: row.level, xp: row.xp, streakCount: row.streakCount, lastLogDate: row.lastLogDate } : { ...DEFAULT_PROFILE };
  },

  async saveProfile(profile: PlayerProfile): Promise<void> {
    await db.profile.put({ ...profile, _id: 1 });
  },

  // --- Gates ---
  async getGates(): Promise<Gate[]> {
    return db.gates.toArray();
  },

  async getGate(id: string): Promise<Gate | undefined> {
    return db.gates.get(id);
  },

  async createGate(input: { title: string; rank: Rank }): Promise<Gate> {
    const gate: Gate = {
      id: generateId(),
      title: input.title,
      rank: input.rank,
      status: "active",
      createdAt: nowISO(),
      clearedAt: null,
    };
    await db.gates.add(gate);
    return gate;
  },

  async updateGate(id: string, updates: Partial<Gate>): Promise<void> {
    await db.gates.update(id, updates);
  },

  async deleteGate(id: string): Promise<void> {
    await db.transaction("rw", [db.gates, db.quests], async () => {
      await db.quests.where("gateId").equals(id).delete();
      await db.gates.delete(id);
    });
  },

  // --- Quests ---
  async getQuestsByGate(gateId: string): Promise<Quest[]> {
    return db.quests.where("gateId").equals(gateId).sortBy("order");
  },

  async getQuest(id: string): Promise<Quest | undefined> {
    return db.quests.get(id);
  },

  async getActiveQuests(): Promise<Quest[]> {
    return db.quests.where("status").equals("in_progress").toArray();
  },

  async createQuest(input: {
    gateId: string;
    title: string;
    description: string;
    priority: QuestPriority;
    xpReward: number;
  }): Promise<Quest> {
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
    await db.quests.update(id, updates);
  },

  async deleteQuest(id: string): Promise<void> {
    await db.quests.delete(id);
  },

  // --- XP Log ---
  async addXpEntry(input: { amount: number; reason: string; source: string }): Promise<void> {
    const entry: XpLogEntry = {
      id: generateId(),
      timestamp: nowISO(),
      amount: input.amount,
      reason: input.reason,
      source: input.source,
    };
    await db.xpLog.add(entry);
  },

  async getXpLog(): Promise<XpLogEntry[]> {
    return db.xpLog.orderBy("timestamp").toArray();
  },

  // --- Clear (for testing) ---
  async clear(): Promise<void> {
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
};
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test
```

Expected: All storage tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/ src/__tests__/lib/storage.test.ts src/__tests__/setup.ts
git commit -m "feat: add Dexie database and storage abstraction layer with tests"
```

---

### Task 4: Zustand Stores — Player & Gates

**Files:**
- Create: `src/lib/stores/player-store.ts`, `src/lib/stores/gates-store.ts`
- Test: `src/__tests__/lib/player-store.test.ts`, `src/__tests__/lib/gates-store.test.ts`

- [ ] **Step 1: Write player store tests**

Create `src/__tests__/lib/player-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { usePlayerStore } from "@/lib/stores/player-store";
import { storage } from "@/lib/db/storage";

describe("player store", () => {
  beforeEach(async () => {
    await storage.clear();
    usePlayerStore.setState({ profile: null, xpLog: [], loaded: false });
  });

  it("loads default profile", async () => {
    await usePlayerStore.getState().load();
    const { profile } = usePlayerStore.getState();
    expect(profile?.name).toBe("Hunter");
    expect(profile?.level).toBe(1);
  });

  it("adds xp and persists", async () => {
    await usePlayerStore.getState().load();
    await usePlayerStore.getState().addXp(50, "Test reward", "test");
    const { profile } = usePlayerStore.getState();
    expect(profile?.xp).toBe(50);

    // Verify persistence
    const stored = await storage.getProfile();
    expect(stored.xp).toBe(50);
  });

  it("levels up when xp threshold crossed", async () => {
    await usePlayerStore.getState().load();
    // Level 1 requires 100 XP to reach level 2
    await usePlayerStore.getState().addXp(150, "Big reward", "test");
    const { profile } = usePlayerStore.getState();
    expect(profile!.level).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Write gates store tests**

Create `src/__tests__/lib/gates-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useGatesStore } from "@/lib/stores/gates-store";
import { storage } from "@/lib/db/storage";

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
    await useGatesStore.getState().createQuest(gateId, { title: "Chapter 1", description: "Read it", priority: "normal", xpReward: 10 });
    const quests = useGatesStore.getState().quests[gateId];
    expect(quests).toHaveLength(1);
    expect(quests[0].title).toBe("Chapter 1");
  });

  it("loads gates and quests from storage", async () => {
    const gate = await storage.createGate({ title: "Pre-existing", rank: "B" });
    await storage.createQuest({ gateId: gate.id, title: "Task 1", description: "", priority: "normal", xpReward: 10 });

    await useGatesStore.getState().load();
    expect(useGatesStore.getState().gates).toHaveLength(1);
    expect(useGatesStore.getState().quests[gate.id]).toHaveLength(1);
  });

  it("computes gate progress from quests", async () => {
    await useGatesStore.getState().createGate("Test", "E");
    const gateId = useGatesStore.getState().gates[0].id;
    await useGatesStore.getState().createQuest(gateId, { title: "Q1", description: "", priority: "normal", xpReward: 10 });
    await useGatesStore.getState().createQuest(gateId, { title: "Q2", description: "", priority: "normal", xpReward: 10 });

    const questId = useGatesStore.getState().quests[gateId][0].id;
    await useGatesStore.getState().updateQuest(questId, { status: "completed" });

    const progress = useGatesStore.getState().getGateProgress(gateId);
    expect(progress).toBe(50);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — stores not found.

- [ ] **Step 4: Implement player store**

Create `src/lib/stores/player-store.ts`:

```typescript
import { create } from "zustand";
import type { PlayerProfile, XpLogEntry, Rank } from "@/lib/types";
import { storage } from "@/lib/db/storage";
import { config } from "@/lib/config";

interface PlayerState {
  profile: PlayerProfile | null;
  xpLog: XpLogEntry[];
  loaded: boolean;
  load: () => Promise<void>;
  addXp: (amount: number, reason: string, source: string) => Promise<void>;
  saveProfile: (updates: Partial<PlayerProfile>) => Promise<void>;
}

function computeLevel(totalXp: number): number {
  let level = 1;
  let xpNeeded = config.leveling.xpPerLevel(level);
  let remaining = totalXp;
  while (remaining >= xpNeeded) {
    remaining -= xpNeeded;
    level++;
    xpNeeded = config.leveling.xpPerLevel(level);
  }
  return level;
}

function computeRank(level: number): Rank {
  const { thresholds } = config.ranks;
  const ranks: Rank[] = ["S", "A", "B", "C", "D", "E"];
  for (const rank of ranks) {
    if (level >= thresholds[rank]) return rank;
  }
  return "E";
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  profile: null,
  xpLog: [],
  loaded: false,

  async load() {
    const profile = await storage.getProfile();
    const xpLog = await storage.getXpLog();
    set({ profile, xpLog, loaded: true });
  },

  async addXp(amount, reason, source) {
    const { profile } = get();
    if (!profile) return;

    const newXp = Math.max(0, profile.xp + amount);
    const newLevel = computeLevel(newXp);
    const newRank = computeRank(newLevel);
    const updated = { ...profile, xp: newXp, level: newLevel, rank: newRank };

    await storage.saveProfile(updated);
    await storage.addXpEntry({ amount, reason, source });
    const xpLog = await storage.getXpLog();
    set({ profile: updated, xpLog });
  },

  async saveProfile(updates) {
    const { profile } = get();
    if (!profile) return;
    const updated = { ...profile, ...updates };
    await storage.saveProfile(updated);
    set({ profile: updated });
  },
}));
```

- [ ] **Step 5: Implement gates store**

Create `src/lib/stores/gates-store.ts`:

```typescript
import { create } from "zustand";
import type { Gate, Quest, Rank, QuestPriority } from "@/lib/types";
import { storage } from "@/lib/db/storage";

interface GatesState {
  gates: Gate[];
  quests: Record<string, Quest[]>;
  loaded: boolean;
  load: () => Promise<void>;
  createGate: (title: string, rank: Rank) => Promise<Gate>;
  updateGate: (id: string, updates: Partial<Gate>) => Promise<void>;
  deleteGate: (id: string) => Promise<void>;
  createQuest: (gateId: string, input: { title: string; description: string; priority: QuestPriority; xpReward: number }) => Promise<Quest>;
  updateQuest: (id: string, updates: Partial<Quest>) => Promise<void>;
  deleteQuest: (id: string, gateId: string) => Promise<void>;
  getGateProgress: (gateId: string) => number;
}

export const useGatesStore = create<GatesState>((set, get) => ({
  gates: [],
  quests: {},
  loaded: false,

  async load() {
    const gates = await storage.getGates();
    const quests: Record<string, Quest[]> = {};
    for (const gate of gates) {
      quests[gate.id] = await storage.getQuestsByGate(gate.id);
    }
    set({ gates, quests, loaded: true });
  },

  async createGate(title, rank) {
    const gate = await storage.createGate({ title, rank });
    set((s) => ({ gates: [...s.gates, gate], quests: { ...s.quests, [gate.id]: [] } }));
    return gate;
  },

  async updateGate(id, updates) {
    await storage.updateGate(id, updates);
    set((s) => ({ gates: s.gates.map((g) => (g.id === id ? { ...g, ...updates } : g)) }));
  },

  async deleteGate(id) {
    await storage.deleteGate(id);
    set((s) => {
      const { [id]: _, ...restQuests } = s.quests;
      return { gates: s.gates.filter((g) => g.id !== id), quests: restQuests };
    });
  },

  async createQuest(gateId, input) {
    const quest = await storage.createQuest({ gateId, ...input });
    set((s) => ({ quests: { ...s.quests, [gateId]: [...(s.quests[gateId] || []), quest] } }));
    return quest;
  },

  async updateQuest(id, updates) {
    // Find which gate this quest belongs to
    const { quests } = get();
    let gateId = "";
    for (const [gId, qs] of Object.entries(quests)) {
      if (qs.some((q) => q.id === id)) {
        gateId = gId;
        break;
      }
    }
    await storage.updateQuest(id, updates);
    set((s) => ({
      quests: {
        ...s.quests,
        [gateId]: (s.quests[gateId] || []).map((q) => (q.id === id ? { ...q, ...updates } : q)),
      },
    }));
  },

  async deleteQuest(id, gateId) {
    await storage.deleteQuest(id);
    set((s) => ({
      quests: { ...s.quests, [gateId]: (s.quests[gateId] || []).filter((q) => q.id !== id) },
    }));
  },

  getGateProgress(gateId) {
    const qs = get().quests[gateId] || [];
    if (qs.length === 0) return 0;
    const completed = qs.filter((q) => q.status === "completed").length;
    return Math.round((completed / qs.length) * 100);
  },
}));
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/stores/ src/__tests__/lib/player-store.test.ts src/__tests__/lib/gates-store.test.ts
git commit -m "feat: add Zustand stores for player and gates with tests"
```

---

### Task 5: UI Foundation — Panel, RankBadge, XpBar, Button, Modal

**Files:**
- Create: `src/components/ui/panel.tsx`, `src/components/ui/rank-badge.tsx`, `src/components/ui/xp-bar.tsx`, `src/components/ui/button.tsx`, `src/components/ui/modal.tsx`
- Test: `src/__tests__/components/panel.test.tsx`, `src/__tests__/components/rank-badge.test.tsx`

- [ ] **Step 1: Write panel and rank badge tests**

Create `src/__tests__/components/panel.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Panel } from "@/components/ui/panel";

describe("Panel", () => {
  it("renders children", () => {
    render(<Panel>Hello System</Panel>);
    expect(screen.getByText("Hello System")).toBeInTheDocument();
  });

  it("applies glow variant class", () => {
    const { container } = render(<Panel glow="blue">Content</Panel>);
    expect(container.firstChild).toHaveClass("glow-blue");
  });
});
```

Create `src/__tests__/components/rank-badge.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RankBadge } from "@/components/ui/rank-badge";

describe("RankBadge", () => {
  it("renders the rank letter", () => {
    render(<RankBadge rank="S" />);
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("renders all valid ranks", () => {
    const ranks = ["E", "D", "C", "B", "A", "S"] as const;
    for (const rank of ranks) {
      const { unmount } = render(<RankBadge rank={rank} />);
      expect(screen.getByText(rank)).toBeInTheDocument();
      unmount();
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — components not found.

- [ ] **Step 3: Implement Panel component**

Create `src/components/ui/panel.tsx`:

```tsx
import { type ReactNode } from "react";

type GlowVariant = "blue" | "violet" | "emerald" | "red" | "amber";

interface PanelProps {
  children: ReactNode;
  glow?: GlowVariant;
  className?: string;
}

export function Panel({ children, glow = "blue", className = "" }: PanelProps) {
  return (
    <div
      className={`rounded-lg bg-[var(--bg-panel)] backdrop-blur-sm p-4 glow-${glow} ${className}`}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Implement RankBadge component**

Create `src/components/ui/rank-badge.tsx`:

```tsx
import type { Rank } from "@/lib/types";

const rankColors: Record<Rank, string> = {
  E: "text-gray-400 border-gray-500/30",
  D: "text-green-400 border-green-500/30",
  C: "text-blue-400 border-blue-500/30",
  B: "text-purple-400 border-purple-500/30",
  A: "text-amber-400 border-amber-500/30",
  S: "text-red-400 border-red-500/30",
};

interface RankBadgeProps {
  rank: Rank;
  size?: "sm" | "md" | "lg";
}

export function RankBadge({ rank, size = "md" }: RankBadgeProps) {
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-12 h-12 text-lg",
  };

  return (
    <div
      className={`${sizeClasses[size]} ${rankColors[rank]} flex items-center justify-center rounded border bg-black/50 font-mono font-bold`}
    >
      {rank}
    </div>
  );
}
```

- [ ] **Step 5: Implement XpBar component**

Create `src/components/ui/xp-bar.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";

interface XpBarProps {
  current: number;
  max: number;
  className?: string;
}

export function XpBar({ current, max, className = "" }: XpBarProps) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between font-mono text-xs text-slate-400 mb-1">
        <span>XP</span>
        <span>{current} / {max}</span>
      </div>
      <div className="h-2 rounded-full bg-black/50 overflow-hidden border border-violet-500/20">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Implement Button component**

Create `src/components/ui/button.tsx`:

```tsx
import { type ButtonHTMLAttributes, type ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children: ReactNode;
}

const variants = {
  primary: "bg-blue-600 hover:bg-blue-500 text-white border-blue-400/30",
  secondary: "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10",
  danger: "bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-400/30",
  ghost: "bg-transparent hover:bg-white/5 text-slate-400 border-transparent",
};

export function Button({ variant = "primary", children, className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 7: Implement Modal component**

Create `src/components/ui/modal.tsx`:

```tsx
"use client";

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="glow-blue w-full max-w-md rounded-lg bg-[var(--bg-secondary)] p-6">
              <h2 className="mb-4 font-mono text-lg text-blue-400">{title}</h2>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/ src/__tests__/components/
git commit -m "feat: add UI foundation components — Panel, RankBadge, XpBar, Button, Modal"
```

---

### Task 6: Layout — Sidebar & Bottom Nav

**Files:**
- Create: `src/components/layout/sidebar.tsx`, `src/components/layout/bottom-nav.tsx`, `src/components/layout/nav-item.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create NavItem component**

Create `src/components/layout/nav-item.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

interface NavItemProps {
  href: string;
  icon: ReactNode;
  label: string;
}

export function NavItem({ href, icon, label }: NavItemProps) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-blue-500/10 text-blue-400"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}
```

- [ ] **Step 2: Create Sidebar component**

Create `src/components/layout/sidebar.tsx`:

```tsx
"use client";

import { NavItem } from "./nav-item";

const navItems = [
  { href: "/", icon: "⬡", label: "Dashboard" },
  { href: "/gates", icon: "◈", label: "Gates" },
  { href: "/missions", icon: "◎", label: "Missions" },
  { href: "/inventory", icon: "▤", label: "Inventory" },
  { href: "/records", icon: "☰", label: "Hunter's Record" },
  { href: "/status", icon: "⬢", label: "Player Status" },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-16 lg:w-56 flex-col border-r border-white/5 bg-[var(--bg-secondary)] p-3 gap-1 z-30">
      <div className="mb-6 px-3 py-4">
        <h1 className="font-mono text-xs lg:text-sm text-blue-400 tracking-widest">
          <span className="hidden lg:inline">SYSTEM</span>
          <span className="lg:hidden">SYS</span>
        </h1>
      </div>
      {navItems.map((item) => (
        <NavItem key={item.href} {...item} />
      ))}
    </aside>
  );
}
```

- [ ] **Step 3: Create BottomNav component**

Create `src/components/layout/bottom-nav.tsx`:

```tsx
"use client";

import { NavItem } from "./nav-item";

const navItems = [
  { href: "/", icon: "⬡", label: "Home" },
  { href: "/gates", icon: "◈", label: "Gates" },
  { href: "/missions", icon: "◎", label: "Missions" },
  { href: "/inventory", icon: "▤", label: "Inventory" },
  { href: "/records", icon: "☰", label: "Record" },
  { href: "/status", icon: "⬢", label: "Status" },
];

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-white/5 bg-[var(--bg-secondary)] px-2 py-1">
      {navItems.map((item) => (
        <NavItem key={item.href} {...item} />
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Update root layout to include navigation**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Solo Leveling System",
  description: "Personal productivity system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <Sidebar />
        <main className="min-h-screen pb-20 md:pb-0 md:pl-16 lg:pl-56">
          <div className="mx-auto max-w-5xl p-4 md:p-6">
            {children}
          </div>
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/ src/app/layout.tsx
git commit -m "feat: add sidebar and bottom nav layout with responsive navigation"
```

---

### Task 7: Dashboard Page

**Files:**
- Create: `src/components/dashboard/player-card.tsx`, `src/components/dashboard/today-status.tsx`, `src/components/dashboard/active-quests.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create PlayerCard component**

Create `src/components/dashboard/player-card.tsx`:

```tsx
"use client";

import { usePlayerStore } from "@/lib/stores/player-store";
import { Panel } from "@/components/ui/panel";
import { RankBadge } from "@/components/ui/rank-badge";
import { XpBar } from "@/components/ui/xp-bar";
import { config } from "@/lib/config";

export function PlayerCard() {
  const profile = usePlayerStore((s) => s.profile);
  if (!profile) return null;

  const xpForNextLevel = config.leveling.xpPerLevel(profile.level);
  // Calculate XP within current level
  let xpSpent = 0;
  for (let i = 1; i < profile.level; i++) {
    xpSpent += config.leveling.xpPerLevel(i);
  }
  const currentLevelXp = profile.xp - xpSpent;

  return (
    <Panel glow="violet" className="flex items-center gap-4">
      <RankBadge rank={profile.rank} size="lg" />
      <div className="flex-1">
        <h2 className="font-mono text-lg text-slate-100">{profile.name}</h2>
        <p className="font-mono text-xs text-slate-400">
          Level {profile.level} — Rank {profile.rank}
        </p>
        <XpBar current={currentLevelXp} max={xpForNextLevel} className="mt-2" />
      </div>
    </Panel>
  );
}
```

- [ ] **Step 2: Create TodayStatus component**

Create `src/components/dashboard/today-status.tsx`:

```tsx
"use client";

import { usePlayerStore } from "@/lib/stores/player-store";
import { useGatesStore } from "@/lib/stores/gates-store";
import { Panel } from "@/components/ui/panel";

export function TodayStatus() {
  const profile = usePlayerStore((s) => s.profile);
  const gates = useGatesStore((s) => s.gates);

  if (!profile) return null;

  const activeGates = gates.filter((g) => g.status === "active").length;

  return (
    <Panel glow="blue">
      <h3 className="font-mono text-xs text-blue-400 mb-3 tracking-wider">TODAY&apos;S STATUS</h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="font-mono text-2xl text-slate-100">{profile.streakCount}</p>
          <p className="text-xs text-slate-400">Streak</p>
        </div>
        <div>
          <p className="font-mono text-2xl text-slate-100">{activeGates}</p>
          <p className="text-xs text-slate-400">Active Gates</p>
        </div>
        <div>
          <p className="font-mono text-2xl text-slate-100">
            {profile.lastLogDate === new Date().toISOString().split("T")[0] ? "✓" : "—"}
          </p>
          <p className="text-xs text-slate-400">Logged</p>
        </div>
      </div>
    </Panel>
  );
}
```

- [ ] **Step 3: Create ActiveQuests component**

Create `src/components/dashboard/active-quests.tsx`:

```tsx
"use client";

import { useGatesStore } from "@/lib/stores/gates-store";
import { Panel } from "@/components/ui/panel";
import { RankBadge } from "@/components/ui/rank-badge";

export function ActiveQuests() {
  const gates = useGatesStore((s) => s.gates);
  const quests = useGatesStore((s) => s.quests);

  const activeQuests = Object.entries(quests)
    .flatMap(([gateId, qs]) =>
      qs
        .filter((q) => q.status === "in_progress")
        .map((q) => {
          const gate = gates.find((g) => g.id === gateId);
          return { ...q, gateName: gate?.title ?? "Unknown", gateRank: gate?.rank ?? "E" as const };
        })
    )
    .slice(0, 5);

  return (
    <Panel glow="blue">
      <h3 className="font-mono text-xs text-blue-400 mb-3 tracking-wider">ACTIVE QUESTS</h3>
      {activeQuests.length === 0 ? (
        <p className="text-sm text-slate-500">No active quests. Enter a gate to begin.</p>
      ) : (
        <div className="space-y-2">
          {activeQuests.map((q) => (
            <div key={q.id} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
              <RankBadge rank={q.gateRank} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">{q.title}</p>
                <p className="text-xs text-slate-500">{q.gateName}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
```

- [ ] **Step 4: Create store initializer**

We need a component that loads stores from IndexedDB on mount. Create `src/components/store-initializer.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useGatesStore } from "@/lib/stores/gates-store";

export function StoreInitializer() {
  const playerLoaded = usePlayerStore((s) => s.loaded);
  const gatesLoaded = useGatesStore((s) => s.loaded);
  const loadPlayer = usePlayerStore((s) => s.load);
  const loadGates = useGatesStore((s) => s.load);

  useEffect(() => {
    if (!playerLoaded) loadPlayer();
    if (!gatesLoaded) loadGates();
  }, [playerLoaded, gatesLoaded, loadPlayer, loadGates]);

  return null;
}
```

- [ ] **Step 5: Add StoreInitializer to layout**

In `src/app/layout.tsx`, add the import and component:

Add import at the top:
```tsx
import { StoreInitializer } from "@/components/store-initializer";
```

Add `<StoreInitializer />` right after `<Sidebar />` inside the body.

- [ ] **Step 6: Wire up Dashboard page**

Replace `src/app/page.tsx`:

```tsx
"use client";

import { PlayerCard } from "@/components/dashboard/player-card";
import { TodayStatus } from "@/components/dashboard/today-status";
import { ActiveQuests } from "@/components/dashboard/active-quests";

export default function Dashboard() {
  return (
    <div className="space-y-4">
      <h1 className="font-mono text-xs text-slate-500 tracking-widest mb-6">
        SYSTEM DASHBOARD
      </h1>
      <PlayerCard />
      <div className="grid gap-4 md:grid-cols-2">
        <TodayStatus />
        <ActiveQuests />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard/ src/components/store-initializer.tsx src/app/page.tsx src/app/layout.tsx
git commit -m "feat: add Dashboard page with player card, today status, and active quests"
```

---

### Task 8: Gates List Page

**Files:**
- Create: `src/components/gates/gate-card.tsx`, `src/components/gates/gate-form.tsx`, `src/app/gates/page.tsx`
- Test: `src/__tests__/components/gate-card.test.tsx`

- [ ] **Step 1: Write gate card test**

Create `src/__tests__/components/gate-card.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GateCard } from "@/components/gates/gate-card";

describe("GateCard", () => {
  const gate = {
    id: "1",
    title: "Learn TypeScript",
    rank: "C" as const,
    status: "active" as const,
    createdAt: "2026-04-16T00:00:00Z",
    clearedAt: null,
  };

  it("renders gate title and rank", () => {
    render(<GateCard gate={gate} progress={45} questCount={4} />);
    expect(screen.getByText("Learn TypeScript")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("shows progress percentage", () => {
    render(<GateCard gate={gate} progress={45} questCount={4} />);
    expect(screen.getByText("45%")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — GateCard not found.

- [ ] **Step 3: Implement GateCard component**

Create `src/components/gates/gate-card.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { RankBadge } from "@/components/ui/rank-badge";
import type { Gate } from "@/lib/types";

const statusLabels: Record<string, string> = {
  locked: "LOCKED",
  active: "ACTIVE",
  cleared: "CLEARED",
  failed: "FAILED",
};

const statusColors: Record<string, string> = {
  locked: "text-slate-500",
  active: "text-blue-400",
  cleared: "text-emerald-400",
  failed: "text-red-400",
};

interface GateCardProps {
  gate: Gate;
  progress: number;
  questCount: number;
}

export function GateCard({ gate, progress, questCount }: GateCardProps) {
  const glow = gate.status === "cleared" ? "emerald" : gate.status === "failed" ? "red" : "blue";

  return (
    <Link href={`/gates/${gate.id}`}>
      <Panel glow={glow} className="hover:bg-white/5 transition-colors cursor-pointer">
        <div className="flex items-start gap-3">
          <RankBadge rank={gate.rank} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-100 truncate">{gate.title}</h3>
              <span className={`font-mono text-xs ${statusColors[gate.status]}`}>
                {statusLabels[gate.status]}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{questCount} quests</p>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 rounded-full bg-black/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="font-mono text-xs text-slate-500 mt-1 text-right">{progress}%</p>
          </div>
        </div>
      </Panel>
    </Link>
  );
}
```

- [ ] **Step 4: Implement GateForm component**

Create `src/components/gates/gate-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { Rank } from "@/lib/types";

const ranks: Rank[] = ["E", "D", "C", "B", "A", "S"];

interface GateFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (title: string, rank: Rank) => void;
}

export function GateForm({ open, onClose, onSubmit }: GateFormProps) {
  const [title, setTitle] = useState("");
  const [rank, setRank] = useState<Rank>("E");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), rank);
    setTitle("");
    setRank("E");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="NEW GATE">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Gate Name</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500/50"
            placeholder="Enter gate name..."
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Rank</label>
          <div className="flex gap-2">
            {ranks.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRank(r)}
                className={`font-mono text-sm w-10 h-10 rounded border transition-colors ${
                  rank === r
                    ? "border-blue-500 bg-blue-500/20 text-blue-400"
                    : "border-white/10 bg-black/30 text-slate-500 hover:text-slate-300"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit">Open Gate</Button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 5: Create Gates list page**

Create `src/app/gates/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useGatesStore } from "@/lib/stores/gates-store";
import { GateCard } from "@/components/gates/gate-card";
import { GateForm } from "@/components/gates/gate-form";
import { Button } from "@/components/ui/button";

export default function GatesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const gates = useGatesStore((s) => s.gates);
  const quests = useGatesStore((s) => s.quests);
  const createGate = useGatesStore((s) => s.createGate);
  const getGateProgress = useGatesStore((s) => s.getGateProgress);

  const sortedGates = [...gates].sort((a, b) => {
    const statusOrder = { active: 0, locked: 1, cleared: 2, failed: 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-xs text-slate-500 tracking-widest">GATES</h1>
        <Button onClick={() => setFormOpen(true)}>+ New Gate</Button>
      </div>

      {sortedGates.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-mono text-slate-500">No gates detected.</p>
          <p className="text-sm text-slate-600 mt-1">Open a gate to begin your journey.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sortedGates.map((gate) => (
            <GateCard
              key={gate.id}
              gate={gate}
              progress={getGateProgress(gate.id)}
              questCount={(quests[gate.id] || []).length}
            />
          ))}
        </div>
      )}

      <GateForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(title, rank) => createGate(title, rank)}
      />
    </div>
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 7: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/components/gates/gate-card.tsx src/components/gates/gate-form.tsx src/app/gates/ src/__tests__/components/gate-card.test.tsx
git commit -m "feat: add Gates list page with gate cards and create gate form"
```

---

### Task 9: Gate Detail Page — Quest List with Sub-Quests

**Files:**
- Create: `src/components/gates/quest-item.tsx`, `src/components/gates/quest-form.tsx`, `src/components/gates/sub-quest-item.tsx`, `src/app/gates/[id]/page.tsx`

- [ ] **Step 1: Implement SubQuestItem component**

Create `src/components/gates/sub-quest-item.tsx`:

```tsx
"use client";

import type { SubQuest } from "@/lib/types";

interface SubQuestItemProps {
  subQuest: SubQuest;
  onToggle: (id: string) => void;
}

export function SubQuestItem({ subQuest, onToggle }: SubQuestItemProps) {
  return (
    <label className="flex items-center gap-2 py-1 px-2 rounded hover:bg-white/5 cursor-pointer group">
      <input
        type="checkbox"
        checked={subQuest.completed}
        onChange={() => onToggle(subQuest.id)}
        className="accent-blue-500"
      />
      <span className={`text-xs ${subQuest.completed ? "text-slate-500 line-through" : "text-slate-300"}`}>
        {subQuest.title}
      </span>
    </label>
  );
}
```

- [ ] **Step 2: Implement QuestItem component**

Create `src/components/gates/quest-item.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SubQuestItem } from "./sub-quest-item";
import { Button } from "@/components/ui/button";
import type { Quest, SubQuest } from "@/lib/types";
import { generateId } from "@/lib/utils";

const priorityColors: Record<string, string> = {
  normal: "border-l-slate-500",
  urgent: "border-l-amber-500",
  critical: "border-l-red-500",
};

const statusActions: Record<string, { label: string; next: string }> = {
  available: { label: "Start", next: "in_progress" },
  in_progress: { label: "Complete", next: "completed" },
};

interface QuestItemProps {
  quest: Quest;
  onUpdateStatus: (id: string, status: string) => void;
  onUpdateSubQuests: (id: string, subQuests: SubQuest[]) => void;
  onDelete: (id: string) => void;
  onStartTimer?: (quest: Quest) => void;
}

export function QuestItem({ quest, onUpdateStatus, onUpdateSubQuests, onDelete, onStartTimer }: QuestItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [newSubQuest, setNewSubQuest] = useState("");
  const isCompleted = quest.status === "completed";

  function toggleSubQuest(subQuestId: string) {
    const updated = quest.subQuests.map((sq) =>
      sq.id === subQuestId ? { ...sq, completed: !sq.completed } : sq
    );
    onUpdateSubQuests(quest.id, updated);
  }

  function addSubQuest(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubQuest.trim()) return;
    const sub: SubQuest = { id: generateId(), title: newSubQuest.trim(), completed: false };
    onUpdateSubQuests(quest.id, [...quest.subQuests, sub]);
    setNewSubQuest("");
  }

  return (
    <div
      className={`border-l-2 ${priorityColors[quest.priority]} rounded-lg bg-white/[0.02] ${
        isCompleted ? "opacity-50" : ""
      }`}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${isCompleted ? "line-through text-slate-500" : "text-slate-200"}`}>
            {quest.title}
          </p>
          {quest.description && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{quest.description}</p>
          )}
        </div>
        <span className="font-mono text-xs text-violet-400">+{quest.xpReward} XP</span>
        {!isCompleted && statusActions[quest.status] && (
          <Button
            variant="secondary"
            className="text-xs px-2 py-1"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateStatus(quest.id, statusActions[quest.status].next);
            }}
          >
            {statusActions[quest.status].label}
          </Button>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              {/* Sub-quests */}
              {quest.subQuests.length > 0 && (
                <div className="space-y-0.5">
                  {quest.subQuests.map((sq) => (
                    <SubQuestItem key={sq.id} subQuest={sq} onToggle={toggleSubQuest} />
                  ))}
                </div>
              )}

              {/* Add sub-quest */}
              {!isCompleted && (
                <form onSubmit={addSubQuest} className="flex gap-2">
                  <input
                    type="text"
                    value={newSubQuest}
                    onChange={(e) => setNewSubQuest(e.target.value)}
                    className="flex-1 rounded border border-white/10 bg-black/30 px-2 py-1 text-xs text-slate-300 outline-none focus:border-blue-500/50"
                    placeholder="Add sub-quest..."
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button variant="ghost" type="submit" className="text-xs px-2 py-1">+</Button>
                </form>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {quest.timerDuration && onStartTimer && !isCompleted && (
                  <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => onStartTimer(quest)}>
                    Timer ({quest.timerDuration}m)
                  </Button>
                )}
                <Button variant="danger" className="text-xs px-2 py-1" onClick={() => onDelete(quest.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 3: Implement QuestForm component**

Create `src/components/gates/quest-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { QuestPriority } from "@/lib/types";

const priorities: { value: QuestPriority; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "urgent", label: "Urgent" },
  { value: "critical", label: "Critical" },
];

interface QuestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { title: string; description: string; priority: QuestPriority; xpReward: number; timerDuration: number | null }) => void;
}

export function QuestForm({ open, onClose, onSubmit }: QuestFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<QuestPriority>("normal");
  const [xpReward, setXpReward] = useState(10);
  const [timerMinutes, setTimerMinutes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      xpReward,
      timerDuration: timerMinutes ? parseInt(timerMinutes, 10) : null,
    });
    setTitle("");
    setDescription("");
    setPriority("normal");
    setXpReward(10);
    setTimerMinutes("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="NEW QUEST">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Quest Name</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500/50"
            placeholder="Enter quest name..."
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500/50 resize-none"
            rows={2}
            placeholder="Optional description..."
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Priority</label>
            <div className="flex gap-2">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                    priority === p.value
                      ? "border-blue-500 bg-blue-500/20 text-blue-400"
                      : "border-white/10 bg-black/30 text-slate-500"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">XP</label>
            <input
              type="number"
              value={xpReward}
              onChange={(e) => setXpReward(parseInt(e.target.value, 10) || 0)}
              className="w-20 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500/50 font-mono"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Timer (minutes, optional)</label>
          <input
            type="number"
            value={timerMinutes}
            onChange={(e) => setTimerMinutes(e.target.value)}
            className="w-24 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500/50 font-mono"
            placeholder="—"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit">Accept Quest</Button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 4: Create Gate detail page**

Create `src/app/gates/[id]/page.tsx`:

```tsx
"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useGatesStore } from "@/lib/stores/gates-store";
import { usePlayerStore } from "@/lib/stores/player-store";
import { QuestItem } from "@/components/gates/quest-item";
import { QuestForm } from "@/components/gates/quest-form";
import { RankBadge } from "@/components/ui/rank-badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { config } from "@/lib/config";
import type { SubQuest, QuestStatus } from "@/lib/types";

export default function GateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [questFormOpen, setQuestFormOpen] = useState(false);

  const gate = useGatesStore((s) => s.gates.find((g) => g.id === id));
  const quests = useGatesStore((s) => s.quests[id] || []);
  const getGateProgress = useGatesStore((s) => s.getGateProgress);
  const createQuest = useGatesStore((s) => s.createQuest);
  const updateQuest = useGatesStore((s) => s.updateQuest);
  const deleteQuest = useGatesStore((s) => s.deleteQuest);
  const updateGate = useGatesStore((s) => s.updateGate);
  const addXp = usePlayerStore((s) => s.addXp);

  if (!gate) {
    return (
      <div className="text-center py-20">
        <p className="font-mono text-slate-500">Gate not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/gates")}>
          Return to Gates
        </Button>
      </div>
    );
  }

  const progress = getGateProgress(id);
  const activeQuests = quests.filter((q) => q.status !== "completed");
  const completedQuests = quests.filter((q) => q.status === "completed");

  async function handleStatusChange(questId: string, status: string) {
    await updateQuest(questId, { status: status as QuestStatus });
    if (status === "completed") {
      const quest = quests.find((q) => q.id === questId);
      if (quest) {
        await addXp(quest.xpReward, `Completed quest: ${quest.title}`, "quest");
      }
    }
  }

  async function handleSubQuestUpdate(questId: string, subQuests: SubQuest[]) {
    await updateQuest(questId, { subQuests });
  }

  async function handleClearGate() {
    await updateGate(id, { status: "cleared", clearedAt: new Date().toISOString() });
    const bonus = config.xp.gateBonus[gate.rank];
    await addXp(bonus, `Gate cleared: ${gate.title}`, "gate");
  }

  return (
    <div className="space-y-4">
      {/* Gate header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/gates")} className="text-xs">
          ← Gates
        </Button>
        <RankBadge rank={gate.rank} size="lg" />
        <div className="flex-1">
          <h1 className="font-mono text-lg text-slate-100">{gate.title}</h1>
          <div className="mt-1 h-1.5 rounded-full bg-black/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="font-mono text-xs text-slate-500 mt-1">{progress}% complete</p>
        </div>
        {gate.status === "active" && progress === 100 && (
          <Button onClick={handleClearGate}>Clear Gate</Button>
        )}
      </div>

      {/* Add quest button */}
      {gate.status === "active" && (
        <Button variant="secondary" onClick={() => setQuestFormOpen(true)}>
          + New Quest
        </Button>
      )}

      {/* Active quests */}
      {activeQuests.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-mono text-xs text-blue-400 tracking-wider">ACTIVE QUESTS</h3>
          {activeQuests.map((quest) => (
            <QuestItem
              key={quest.id}
              quest={quest}
              onUpdateStatus={handleStatusChange}
              onUpdateSubQuests={handleSubQuestUpdate}
              onDelete={(qId) => deleteQuest(qId, id)}
            />
          ))}
        </div>
      )}

      {/* Completed quests */}
      {completedQuests.length > 0 && (
        <Panel glow="emerald" className="mt-6">
          <h3 className="font-mono text-xs text-emerald-400 tracking-wider mb-2">CLEARED</h3>
          <div className="space-y-1">
            {completedQuests.map((quest) => (
              <QuestItem
                key={quest.id}
                quest={quest}
                onUpdateStatus={handleStatusChange}
                onUpdateSubQuests={handleSubQuestUpdate}
                onDelete={(qId) => deleteQuest(qId, id)}
              />
            ))}
          </div>
        </Panel>
      )}

      {/* Empty state */}
      {quests.length === 0 && (
        <div className="text-center py-12">
          <p className="font-mono text-slate-500">No quests in this gate.</p>
          <p className="text-sm text-slate-600 mt-1">Add quests to begin.</p>
        </div>
      )}

      <QuestForm
        open={questFormOpen}
        onClose={() => setQuestFormOpen(false)}
        onSubmit={async (input) => {
          await createQuest(id, {
            title: input.title,
            description: input.description,
            priority: input.priority,
            xpReward: input.xpReward,
          });
          // If timer was set, update the quest with timerDuration
          if (input.timerDuration) {
            const qs = useGatesStore.getState().quests[id];
            const lastQuest = qs[qs.length - 1];
            await updateQuest(lastQuest.id, { timerDuration: input.timerDuration });
          }
        }}
      />
    </div>
  );
}
```

- [ ] **Step 5: Run tests and verify build**

```bash
npm test && npm run build
```

Expected: All tests PASS, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/gates/ src/app/gates/
git commit -m "feat: add Gate detail page with quest list, sub-quests, and XP rewards"
```

---

### Task 10: End-to-End Smoke Test

**Files:** None new — just verification.

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Start dev server and manually verify**

```bash
npm run dev
```

Open `http://localhost:3000` and verify:
- Dashboard shows with "Hunter" player card, level 1, rank E
- Navigation works (sidebar on desktop, bottom nav on mobile — resize browser to check)
- Gates page shows empty state, "New Gate" button opens form
- Creating a gate works, card appears with rank badge
- Clicking a gate shows detail page
- Adding quests works, starting/completing quests works
- XP updates on the dashboard after completing a quest

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address smoke test issues"
```

(Skip this step if no fixes were needed.)

---

## Phase 1 Complete

After this phase, you have:
- A working Next.js app with the Solo Leveling dark theme
- Full data layer (Dexie + storage abstraction + Zustand stores)
- Responsive navigation (sidebar + bottom nav)
- Dashboard with player card, status, and active quests
- Gates system with full CRUD, quests, sub-quests, and XP rewards
- Configurable XP/leveling system

**Next phases** (separate plans):
- Phase 2: Missions + Inventory (with promote-to-gate/mission flow)
- Phase 3: Hunter's Record (daily log + penalty system + calendar view)
- Phase 4: Dungeon Timer (global overlay + quest-scoped countdowns)
- Phase 5: Player Status (gym stats + charts + XP history)
- Phase 6: Notifications & Reminders
- Phase 7: Supabase sync layer
