"use client";

import { useEffect } from "react";
import { useGatesStore } from "@/lib/stores/gates-store";
import { useInventoryStore } from "@/lib/stores/inventory-store";
import { useMissionsStore } from "@/lib/stores/missions-store";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useReadStore } from "@/lib/stores/read-store";
import { useBooksStore } from "@/lib/stores/books-store";
import { useRecordsStore } from "@/lib/stores/records-store";
import { useWorkStore } from "@/lib/stores/work-store";
import { useCampaignStore } from "@/lib/stores/campaign-store";
import { useContinuationStore } from "@/lib/stores/continuation-store";
import { useStatsStore } from "@/lib/stores/stats-store";
import { useSystemStore } from "@/lib/stores/system-store";
import { useGymStore } from "@/lib/stores/gym-store";
export function StoreInitializer() {
  const activePersona = usePersonaStore((state) => state.activePersona);
  const gatesLoaded = useGatesStore((state) => state.loaded);
  const missionsLoaded = useMissionsStore((state) => state.loaded);
  const quests = useGatesStore((state) => state.quests);
  const loadPlayer = usePlayerStore((state) => state.load);
  const loadGates = useGatesStore((state) => state.load);
  const loadMissions = useMissionsStore((state) => state.load);
  const loadInventory = useInventoryStore((state) => state.load);
  const loadRead = useReadStore((state) => state.load);
  const loadBooks = useBooksStore((state) => state.load);
  const loadRecords = useRecordsStore((state) => state.load);
  const loadStats = useStatsStore((state) => state.load);
  const loadWork = useWorkStore((state) => state.load);
  const loadGym = useGymStore((state) => state.load);
  const syncLinkedProgress = useMissionsStore((state) => state.syncLinkedProgress);

  useEffect(() => {
    useCampaignStore.persist.setOptions({
      name: `solo-leveling-campaign-${activePersona}`,
    });
    useContinuationStore.persist.setOptions({
      name: `solo-leveling-continuation-${activePersona}`,
    });
    useSystemStore.persist.setOptions({
      name: `solo-leveling-system-settings-${activePersona}`,
    });

    void Promise.all([
      useCampaignStore.persist.rehydrate(),
      useContinuationStore.persist.rehydrate(),
      useSystemStore.persist.rehydrate(),
      loadPlayer(activePersona),
      loadGates(activePersona),
      loadMissions(activePersona),
      loadInventory(activePersona),
      loadRead(activePersona),
      loadBooks(activePersona),
      loadRecords(activePersona),
      loadStats(activePersona),
      loadWork(activePersona),
      loadGym(activePersona),
    ]);
  }, [
    activePersona,
    loadGates,
    loadInventory,
    loadMissions,
    loadPlayer,
    loadRead,
    loadBooks,
    loadRecords,
    loadStats,
    loadWork,
    loadGym,
  ]);

  useEffect(() => {
    if (gatesLoaded && missionsLoaded) {
      void syncLinkedProgress(quests);
    }
  }, [gatesLoaded, missionsLoaded, quests, syncLinkedProgress]);

  return null;
}
