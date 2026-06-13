import { beforeEach, describe, expect, it } from "vitest";
import { storage } from "@/lib/db/storage";
import { useGatesStore } from "@/lib/stores/gates-store";
import { useInventoryStore } from "@/lib/stores/inventory-store";
import { useMissionsStore } from "@/lib/stores/missions-store";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useRecordsStore } from "@/lib/stores/records-store";
import { useStatsStore } from "@/lib/stores/stats-store";
import type {
  Gate,
  GymStat,
  HunterRecord,
  InventoryItem,
  Mission,
  PlayerProfile,
  Quest,
} from "@/lib/types";

const loadedProfile: PlayerProfile = {
  name: "Visible Hunter",
  rank: "D",
  level: 4,
  xp: 300,
  streakCount: 2,
  lastLogDate: "2026-06-10",
};

const visibleGate: Gate = {
  id: "visible-gate",
  title: "Visible Gate",
  rank: "C",
  difficulty: 1,
  date: "2026-06-12",
  endDate: null,
  why: "",
  subTodos: [],
  status: "active",
  createdAt: "2026-06-12T00:00:00.000Z",
  clearedAt: null,
};

const visibleQuest: Quest = {
  id: "visible-quest",
  gateId: visibleGate.id,
  title: "Visible Quest",
  description: "",
  priority: "normal",
  status: "available",
  xpReward: 10,
  subQuests: [],
  timerDuration: null,
  createdAt: "2026-06-12T00:00:00.000Z",
  completedAt: null,
  order: 0,
};

const visibleMission: Mission = {
  id: "visible-mission",
  title: "Visible Mission",
  rank: "B",
  date: "2026-06-12",
  why: "",
  targetMetric: "Sessions",
  currentValue: 1,
  targetValue: 10,
  unit: "sessions",
  deadline: null,
  linkedGateIds: [],
  order: 0,
  priorityColor: null,
  createdAt: "2026-06-12T00:00:00.000Z",
  completedAt: null,
};

const visibleItem: InventoryItem = {
  id: "visible-item",
  name: "Visible Item",
  dateStarted: "2026-06-12T00:00:00.000Z",
  notes: "",
  tags: [],
  promotedTo: null,
};

const visibleRecord: HunterRecord = {
  date: "2026-06-12",
  entries: [{ timestamp: "2026-06-12T00:00:00.000Z", text: "Visible entry" }],
  reflection: null,
  gratitude: [],
  penaltyApplied: false,
};

const visibleStat: GymStat = {
  id: "visible-stat",
  name: "Visible Stat",
  unit: "kg",
  entries: [{ value: 10, date: "2026-06-12" }],
};

describe("store refresh stability", () => {
  beforeEach(async () => {
    await storage.clear();
    usePlayerStore.setState({ profile: null, xpLog: [], loaded: false });
    useGatesStore.setState({ gates: [], quests: {}, loaded: false });
    useMissionsStore.setState({ missions: [], loaded: false });
    useInventoryStore.setState({ items: [], loaded: false });
    useRecordsStore.setState({ records: [], loaded: false, latestPenaltyDate: null });
    useStatsStore.setState({ gymStats: [], loaded: false });
  });

  it("keeps visible dashboard state while a refresh is in flight", async () => {
    await storage.saveProfile({
      name: "Reloaded Hunter",
      rank: "C",
      level: 5,
      xp: 400,
      streakCount: 3,
      lastLogDate: "2026-06-11",
    });
    await storage.createGate({ title: "Reloaded Gate", rank: "B" });
    await storage.createMission({
      title: "Reloaded Mission",
      rank: "A",
      targetMetric: "Sessions",
      currentValue: 2,
      targetValue: 12,
      unit: "sessions",
      deadline: null,
      linkedGateIds: [],
    });
    await storage.createInventoryItem({ name: "Reloaded Item", notes: "", tags: [] });
    await storage.addHunterEntry("2026-06-11", "Reloaded entry");
    await storage.createGymStat({ name: "Reloaded Stat", unit: "kg" });

    usePlayerStore.setState({ profile: loadedProfile, xpLog: [], loaded: true });
    useGatesStore.setState({
      gates: [visibleGate],
      quests: { [visibleGate.id]: [visibleQuest] },
      loaded: true,
    });
    useMissionsStore.setState({ missions: [visibleMission], loaded: true });
    useInventoryStore.setState({ items: [visibleItem], loaded: true });
    useRecordsStore.setState({
      records: [visibleRecord],
      loaded: true,
      latestPenaltyDate: null,
    });
    useStatsStore.setState({ gymStats: [visibleStat], loaded: true });

    const refreshes = [
      usePlayerStore.getState().load(),
      useGatesStore.getState().load(),
      useMissionsStore.getState().load(),
      useInventoryStore.getState().load(),
      useRecordsStore.getState().load(),
      useStatsStore.getState().load(),
    ];

    expect(usePlayerStore.getState().profile?.name).toBe("Visible Hunter");
    expect(usePlayerStore.getState().loaded).toBe(true);
    expect(useGatesStore.getState().gates).toHaveLength(1);
    expect(useGatesStore.getState().quests[visibleGate.id]).toHaveLength(1);
    expect(useGatesStore.getState().loaded).toBe(true);
    expect(useMissionsStore.getState().missions).toHaveLength(1);
    expect(useMissionsStore.getState().loaded).toBe(true);
    expect(useInventoryStore.getState().items).toHaveLength(1);
    expect(useInventoryStore.getState().loaded).toBe(true);
    expect(useRecordsStore.getState().records).toHaveLength(1);
    expect(useRecordsStore.getState().loaded).toBe(true);
    expect(useStatsStore.getState().gymStats).toHaveLength(1);
    expect(useStatsStore.getState().loaded).toBe(true);

    await Promise.all(refreshes);

    expect(usePlayerStore.getState().profile?.name).toBe("Reloaded Hunter");
    expect(useGatesStore.getState().gates[0]?.title).toBe("Reloaded Gate");
    expect(useMissionsStore.getState().missions[0]?.title).toBe("Reloaded Mission");
    expect(useInventoryStore.getState().items[0]?.name).toBe("Reloaded Item");
    expect(useRecordsStore.getState().records[0]?.entries[0]?.text).toBe("Reloaded entry");
    expect(useStatsStore.getState().gymStats[0]?.name).toBe("Reloaded Stat");
  });
});
