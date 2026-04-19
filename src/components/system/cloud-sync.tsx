"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!enabled || !user || !supabase || !isSupabaseConfigured()) {
      initialized.current = true;
      return;
    }

    loadingRef.current = true;

    void (async () => {
      try {
        const { data } = await supabase
          .from("solo_snapshots")
          .select("state")
          .eq("user_id", user.id)
          .eq("persona", activePersona)
          .maybeSingle();

        if (data?.state) {
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
  }, [
    activePersona,
    enabled,
    loadAll,
    loadGates,
    loadInventory,
    loadMissions,
    loadRecords,
    loadStats,
    user,
  ]);

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
      const state = await storage.exportSnapshot();
      await supabase.from("solo_snapshots").upsert(
        {
          user_id: user.id,
          persona: activePersona,
          state,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,persona" },
      );
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [activePersona, enabled, gates, gymStats, inventory, missions, profile, quests, records, user, xpLog]);

  return null;
}
