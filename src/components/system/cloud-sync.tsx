"use client";

import { useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/components/auth/auth-gate";
import { storage } from "@/lib/db/storage";
import { useGatesStore } from "@/lib/stores/gates-store";
import { useInventoryStore } from "@/lib/stores/inventory-store";
import { useMissionsStore } from "@/lib/stores/missions-store";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useRecordsStore } from "@/lib/stores/records-store";
import { useStatsStore } from "@/lib/stores/stats-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { AppSnapshot } from "@/lib/types";

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
          accomplished: record.reflection!.accomplished,
          blockers: record.reflection!.blockers,
          mood: record.reflection!.mood,
        }));

      if (reflections.length > 0) {
        await supabase
          .from("solo_reflections")
          .upsert(reflections, { onConflict: "user_id,persona,date" });
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
  persona: string,
): Promise<boolean> {
  const state = await storage.exportSnapshot();

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

  const loadAll = usePlayerStore((state) => state.load);
  const loadGates = useGatesStore((state) => state.load);
  const loadMissions = useMissionsStore((state) => state.load);
  const loadInventory = useInventoryStore((state) => state.load);
  const loadRecords = useRecordsStore((state) => state.load);
  const loadStats = useStatsStore((state) => state.load);

  // ── Load from Supabase on mount / persona switch ───────────────────────────
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!enabled || !user || !supabase || !isSupabaseConfigured()) {
      initialized.current = true;
      return;
    }

    loadingRef.current = true;

    void (async () => {
      try {
        const { data, error } = await supabase
          .from("solo_snapshots")
          .select("state")
          .eq("user_id", user.id)
          .eq("persona", activePersona)
          .maybeSingle();

        if (error) {
          console.error("[CloudSync] load failed:", error.message);
        } else if (data?.state) {
          await storage.importSnapshot(data.state);
          await Promise.all([
            loadAll(),
            loadGates(),
            loadMissions(),
            loadInventory(),
            loadRecords(),
            loadStats(),
          ]);
        }
      } finally {
        initialized.current = true;
        loadingRef.current = false;
      }
    })();
  }, [activePersona, enabled, loadAll, loadGates, loadInventory, loadMissions, loadRecords, loadStats, user]);

  // ── Save on state change (debounced 700ms) ────────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (
      !initialized.current ||
      loadingRef.current ||
      !enabled ||
      !user ||
      !supabase ||
      !profile
    ) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      if (!navigator.onLine) {
        markPending(activePersona);
        console.log("[CloudSync] offline — queued sync for", activePersona);
        return;
      }

      const ok = await syncNow(supabase, user.id, activePersona);
      if (ok) {
        clearPending(activePersona);
      } else {
        markPending(activePersona);
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [activePersona, enabled, gates, gymStats, inventory, missions, profile, quests, records, user, xpLog]);

  // ── Flush pending queue when back online ─────────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!enabled || !user || !supabase) return;

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
  }, [activePersona, enabled, user]);

  return null;
}
