"use client";

import { useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/components/auth/auth-gate";
import { storage } from "@/lib/db/storage";
import { canAccessPersona } from "@/lib/persona-access";
import { useGatesStore } from "@/lib/stores/gates-store";
import { useInventoryStore } from "@/lib/stores/inventory-store";
import { useMissionsStore } from "@/lib/stores/missions-store";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useRecordsStore } from "@/lib/stores/records-store";
import { useStatsStore } from "@/lib/stores/stats-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { AppSnapshot, Gate, HunterRecord, Mission, Persona, Rank } from "@/lib/types";
import { todayDate } from "@/lib/utils";

// ─── Row types for individual Supabase tables ─────────────────────────────────

type GoalRow = {
  id: string;
  title: string | null;
  rank: Rank | null;
  date: string | null;
  why: string | null;
  end_date: string | null;
  sub_todos: Gate["subTodos"] | null;
  status: Gate["status"] | null;
  cleared_at: string | null;
  created_at: string | null;
};

type TodoRow = {
  id: string;
  title: string | null;
  rank: Rank | null;
  date: string | null;
  why: string | null;
  target_metric: string | null;
  current_value: number | null;
  target_value: number | null;
  unit: string | null;
  deadline: string | null;
  linked_gate_ids: string[] | null;
  completed_at: string | null;
  created_at: string | null;
};

type LogRow = { date: string; text: string | null; timestamp: string };
type ReflectionRow = { date: string; reflect: string | null };
type GratitudeRow = { date: string; items: string[] | null };

function isRank(v: unknown): v is Rank {
  return v === "E" || v === "D" || v === "C" || v === "B" || v === "A" || v === "S";
}

function isGateStatus(v: unknown): v is Gate["status"] {
  return v === "locked" || v === "active" || v === "cleared" || v === "failed";
}

function fromGoalRow(row: GoalRow): Gate {
  return {
    id: row.id,
    title: row.title ?? "Untitled goal",
    rank: isRank(row.rank) ? row.rank : "E",
    date: row.date ?? todayDate(),
    endDate: row.end_date ?? null,
    why: row.why ?? "",
    subTodos: row.sub_todos ?? [],
    status: isGateStatus(row.status) ? row.status : "active",
    clearedAt: row.cleared_at,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function fromTodoRow(row: TodoRow): Mission {
  return {
    id: row.id,
    title: row.title ?? "Untitled todo",
    rank: isRank(row.rank) ? row.rank : "E",
    date: row.date ?? todayDate(),
    why: row.why ?? "",
    targetMetric: row.target_metric ?? "Checklist",
    currentValue: row.current_value ?? 0,
    targetValue: row.target_value ?? 1,
    unit: row.unit ?? "item",
    deadline: row.deadline,
    linkedGateIds: row.linked_gate_ids ?? [],
    completedAt: row.completed_at,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function getOrCreateRecord(map: Map<string, HunterRecord>, date: string): HunterRecord {
  let record = map.get(date);
  if (!record) {
    record = { date, entries: [], reflection: null, gratitude: [], penaltyApplied: false };
    map.set(date, record);
  }
  return record;
}

/**
 * Merge individual-table rows into a base snapshot.
 * Individual tables are authoritative for entries/reflection/gratitude —
 * the snapshot blob is only used for penaltyApplied and structural data
 * (gates, missions, profile, xpLog).
 */
export function mergeTableRowsIntoSnapshot(
  snapshot: AppSnapshot,
  rows: {
    goals?: GoalRow[];
    todos?: TodoRow[];
    logs?: LogRow[];
    reflections?: ReflectionRow[];
    gratitude?: GratitudeRow[];
  },
): AppSnapshot {
  // Gates: index from snapshot, overwrite from individual table rows
  const gatesById = new Map(snapshot.gates.map((g) => [g.id, g]));
  for (const row of rows.goals ?? []) {
    gatesById.set(row.id, fromGoalRow(row));
  }

  // Missions: same
  const missionsById = new Map(snapshot.missions.map((m) => [m.id, m]));
  for (const row of rows.todos ?? []) {
    missionsById.set(row.id, fromTodoRow(row));
  }

  // Records: start with EMPTY entries/reflection/gratitude (individual tables are authority).
  // Only preserve penaltyApplied from snapshot so we don't lose that state.
  const recordsByDate = new Map<string, HunterRecord>(
    snapshot.hunterRecords.map((r) => [
      r.date,
      { date: r.date, entries: [], reflection: null, gratitude: [], penaltyApplied: r.penaltyApplied },
    ]),
  );

  for (const row of rows.logs ?? []) {
    const record = getOrCreateRecord(recordsByDate, row.date);
    if (!record.entries.some((e) => e.timestamp === row.timestamp)) {
      record.entries.push({ timestamp: row.timestamp, text: row.text ?? "" });
    }
  }

  for (const row of rows.reflections ?? []) {
    getOrCreateRecord(recordsByDate, row.date).reflection = { reflect: row.reflect ?? "" };
  }

  for (const row of rows.gratitude ?? []) {
    getOrCreateRecord(recordsByDate, row.date).gratitude = row.items ?? [];
  }

  return {
    ...snapshot,
    gates: Array.from(gatesById.values()),
    missions: Array.from(missionsById.values()),
    hunterRecords: Array.from(recordsByDate.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
  };
}

async function selectCloudTable<T>(
  supabase: SupabaseClient,
  table: string,
  userId: string,
  persona: Persona,
  columns = "*",
): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("user_id", userId)
    .eq("persona", persona);

  if (error) {
    console.error(`[CloudSync] ${table} fetch failed:`, error.message);
    return [];
  }
  return (data ?? []) as T[];
}

async function loadCloudState(
  supabase: SupabaseClient,
  userId: string,
  persona: Persona,
  baseSnapshot: AppSnapshot,
): Promise<AppSnapshot> {
  const [goals, todos, logs, reflections, gratitude] = await Promise.all([
    selectCloudTable<GoalRow>(supabase, "solo_goals", userId, persona),
    selectCloudTable<TodoRow>(supabase, "solo_todos", userId, persona),
    selectCloudTable<LogRow>(supabase, "solo_logs", userId, persona, "date,text,timestamp"),
    selectCloudTable<ReflectionRow>(supabase, "solo_reflections", userId, persona, "date,reflect"),
    selectCloudTable<GratitudeRow>(supabase, "solo_gratitude", userId, persona, "date,items"),
  ]);

  return mergeTableRowsIntoSnapshot(baseSnapshot, { goals, todos, logs, reflections, gratitude });
}

// ─── Offline queue helpers ────────────────────────────────────────────────────

function pendingKey(persona: string) {
  return `solo_pending_sync_${persona}`;
}

function markPending(persona: string) {
  try {
    localStorage.setItem(pendingKey(persona), "1");
  } catch {
    // localStorage unavailable in some envs
  }
}

function clearPending(persona: string) {
  try {
    localStorage.removeItem(pendingKey(persona));
  } catch {
    // ignore
  }
}

function hasPending(persona: string) {
  try {
    return localStorage.getItem(pendingKey(persona)) === "1";
  } catch {
    return false;
  }
}

// ─── Individual table sync ────────────────────────────────────────────────────

async function pushToTables(
  supabase: SupabaseClient,
  userId: string,
  persona: string,
  state: AppSnapshot,
) {
  const results = await Promise.allSettled([

    // ── Todos (missions) ──────────────────────────────────────────────────────
    (async () => {
      if (state.missions.length === 0) {
        await supabase
          .from("solo_todos")
          .delete()
          .eq("user_id", userId)
          .eq("persona", persona);
        return;
      }

      await supabase.from("solo_todos").upsert(
        state.missions.map((m) => ({
          id: m.id,
          user_id: userId,
          persona,
          title: m.title,
          rank: m.rank,
          date: m.date,
          why: m.why,
          target_metric: m.targetMetric,
          current_value: m.currentValue,
          target_value: m.targetValue,
          unit: m.unit,
          deadline: m.deadline,
          linked_gate_ids: m.linkedGateIds,
          completed_at: m.completedAt,
          created_at: m.createdAt,
        })),
        { onConflict: "id" },
      );

      // Remove stale rows deleted locally
      const ids = state.missions.map((m) => m.id).join(",");
      await supabase
        .from("solo_todos")
        .delete()
        .eq("user_id", userId)
        .eq("persona", persona)
        .not("id", "in", `(${ids})`);
    })(),

    // ── Goals (gates) ─────────────────────────────────────────────────────────
    (async () => {
      if (state.gates.length === 0) {
        await supabase
          .from("solo_goals")
          .delete()
          .eq("user_id", userId)
          .eq("persona", persona);
        return;
      }

      await supabase.from("solo_goals").upsert(
        state.gates.map((g) => ({
          id: g.id,
          user_id: userId,
          persona,
          title: g.title,
          rank: g.rank,
          date: g.date,
          why: g.why,
          end_date: g.endDate ?? null,
          sub_todos: g.subTodos,
          status: g.status,
          cleared_at: g.clearedAt,
          created_at: g.createdAt,
        })),
        { onConflict: "id" },
      );

      const ids = state.gates.map((g) => g.id).join(",");
      await supabase
        .from("solo_goals")
        .delete()
        .eq("user_id", userId)
        .eq("persona", persona)
        .not("id", "in", `(${ids})`);
    })(),

    // ── Logs (append-only, never delete individual entries) ───────────────────
    (async () => {
      const logs = state.hunterRecords.flatMap((record) =>
        record.entries.map((entry) => ({
          user_id: userId,
          persona,
          date: record.date,
          text: entry.text,
          timestamp: entry.timestamp,
        })),
      );

      if (logs.length > 0) {
        await supabase
          .from("solo_logs")
          .upsert(logs, { onConflict: "user_id,persona,date,timestamp" });
      }
    })(),

    // ── Reflections ───────────────────────────────────────────────────────────
    (async () => {
      const reflections = state.hunterRecords
        .filter((record) => record.reflection)
        .map((record) => ({
          user_id: userId,
          persona,
          date: record.date,
          reflect: record.reflection!.reflect,
          updated_at: new Date().toISOString(),
        }));

      if (reflections.length > 0) {
        await supabase
          .from("solo_reflections")
          .upsert(reflections, { onConflict: "user_id,persona,date" });
      }
    })(),

    // ── Gratitude ─────────────────────────────────────────────────────────────
    (async () => {
      const gratitudeRows = state.hunterRecords
        .filter((record) => record.gratitude?.length)
        .map((record) => ({
          user_id: userId,
          persona,
          date: record.date,
          items: record.gratitude,
          updated_at: new Date().toISOString(),
        }));

      if (gratitudeRows.length > 0) {
        await supabase
          .from("solo_gratitude")
          .upsert(gratitudeRows, { onConflict: "user_id,persona,date" });
      }
    })(),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[CloudSync] table sync partial failure:", result.reason);
    }
  }
}

// ─── Main sync function ───────────────────────────────────────────────────────

async function syncNow(
  supabase: SupabaseClient,
  userId: string,
  persona: Persona,
): Promise<boolean> {
  const state = await storage.exportSnapshot({ persona });

  const { error } = await supabase.from("solo_snapshots").upsert(
    {
      user_id: userId,
      persona,
      state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,persona" },
  );

  if (error) {
    console.error("[CloudSync] snapshot save failed:", error.message);
    return false;
  }

  await pushToTables(supabase, userId, persona, state);
  return true;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CloudSync() {
  const { user, enabled } = useAuth();
  const activePersona = usePersonaStore((state) => state.activePersona);
  const profile = usePlayerStore((state) => state.profile);
  const gates = useGatesStore((state) => state.gates);
  const quests = useGatesStore((state) => state.quests);
  const missions = useMissionsStore((state) => state.missions);
  const inventory = useInventoryStore((state) => state.items);
  const records = useRecordsStore((state) => state.records);
  const gymStats = useStatsStore((state) => state.gymStats);
  const xpLog = usePlayerStore((state) => state.xpLog);
  const initialized = useRef(false);
  const loadingRef = useRef(false);
  const savingRef = useRef(false);
  const loadTokenRef = useRef(0);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAll = usePlayerStore((state) => state.load);
  const loadGates = useGatesStore((state) => state.load);
  const loadMissions = useMissionsStore((state) => state.load);
  const loadInventory = useInventoryStore((state) => state.load);
  const loadRecords = useRecordsStore((state) => state.load);
  const loadStats = useStatsStore((state) => state.load);
  const personaAllowed = canAccessPersona(activePersona, user?.email);

  // ── Load from Supabase on mount / persona switch ───────────────────────────
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Reset these so the save effect won't fire during load
    const loadToken = loadTokenRef.current + 1;
    loadTokenRef.current = loadToken;
    initialized.current = false;
    loadingRef.current = false;

    if (!enabled || !user || !supabase || !isSupabaseConfigured() || !personaAllowed) {
      initialized.current = true;
      return;
    }

    // Capture persona at effect start — guards against stale closures
    const persona = activePersona;

    async function loadSnapshot() {
      if (!supabase || !user) return;
      loadingRef.current = true;
      try {
        const { data, error } = await supabase
          .from("solo_snapshots")
          .select("state")
          .eq("user_id", user.id)
          .eq("persona", persona)
          .maybeSingle();

        if (error) {
          console.error("[CloudSync] load failed:", error.message);
        } else {
          // Use individual tables as the source of truth, merging on top of the snapshot
          const localState = await storage.exportSnapshot({ persona });
          const baseState = (data?.state ?? localState) as AppSnapshot;
          const incomingState = await loadCloudState(supabase, user.id, persona, baseState);

          const hasData =
            incomingState.gates.length > 0 ||
            incomingState.missions.length > 0 ||
            incomingState.hunterRecords.length > 0 ||
            Boolean(data?.state);

          if (hasData) {
            // Guard: abort if persona switched while we were loading
            if (usePersonaStore.getState().activePersona !== persona) return;

            await storage.importSnapshot(incomingState, { persona });

            // Guard again before reloading stores
            if (usePersonaStore.getState().activePersona !== persona) return;

            await Promise.all([
              loadAll(persona),
              loadGates(persona),
              loadMissions(persona),
              loadInventory(persona),
              loadRecords(persona),
              loadStats(persona),
            ]);
          }
        }
      } finally {
        // Only finalize if this load token is still current
        if (loadTokenRef.current === loadToken) {
          initialized.current = true;
          loadingRef.current = false;
        }
      }
    }

    void loadSnapshot();

    // ── Realtime: re-import whenever another device saves a snapshot ─────────
    const channel = supabase
      .channel(`snapshots:${user.id}:${activePersona}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "solo_snapshots",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const incomingPersona = (payload.new as { persona?: string }).persona;
          if (incomingPersona !== activePersona) return;
          // Skip if this device just saved — the realtime bounce would overwrite
          // local state that hasn't been persisted to Supabase yet (700ms debounce)
          if (savingRef.current) {
            console.log("[CloudSync] realtime snapshot skipped — own save in flight");
            return;
          }
          console.log("[CloudSync] realtime snapshot received — syncing");
          void loadSnapshot();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activePersona, enabled, loadAll, loadGates, loadInventory, loadMissions, loadRecords, loadStats, personaAllowed, user]);

  // ── Save on state change (debounced 700ms) ────────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (
      !initialized.current ||
      loadingRef.current ||
      !enabled ||
      !user ||
      !personaAllowed ||
      !supabase ||
      !profile
    ) {
      return;
    }

    savingRef.current = true;
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);

    const timeout = window.setTimeout(async () => {
      if (!navigator.onLine) {
        savingRef.current = false;
        markPending(activePersona);
        console.log("[CloudSync] offline — queued sync for", activePersona);
        return;
      }

      const ok = await syncNow(supabase, user.id, activePersona);
      // Keep savingRef true for 2s after save to absorb the realtime bounce
      saveDebounceRef.current = setTimeout(() => {
        savingRef.current = false;
      }, 2000);
      if (ok) {
        clearPending(activePersona);
      } else {
        markPending(activePersona);
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [activePersona, enabled, gates, gymStats, inventory, missions, personaAllowed, profile, quests, records, user, xpLog]);

  // ── Flush pending queue when back online ─────────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!enabled || !user || !supabase || !personaAllowed) return;

    const flush = async () => {
      if (!navigator.onLine) return;
      if (!initialized.current || loadingRef.current) return;
      if (!hasPending(activePersona)) return;

      console.log("[CloudSync] back online — flushing pending sync for", activePersona);
      const ok = await syncNow(supabase, user.id, activePersona);
      if (ok) {
        clearPending(activePersona);
        console.log("[CloudSync] pending sync flushed for", activePersona);
      }
    };

    // Flush on coming back online
    window.addEventListener("online", flush);

    // Also flush on mount (handles: app opened while offline, came back online before this ran)
    void flush();

    return () => window.removeEventListener("online", flush);
  }, [activePersona, enabled, personaAllowed, user]);

  return null;
}
