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
export function StoreInitializer() {
  const activePersona = usePersonaStore((state) => state.activePersona);
  const playerLoaded = usePlayerStore((state) => state.loaded);
  const gatesLoaded = useGatesStore((state) => state.loaded);
  const missionsLoaded = useMissionsStore((state) => state.loaded);
  const inventoryLoaded = useInventoryStore((state) => state.loaded);
  const readLoaded = useReadStore((state) => state.loaded);
  const booksLoaded = useBooksStore((state) => state.loaded);
  const recordsLoaded = useRecordsStore((state) => state.loaded);
  const statsLoaded = useStatsStore((state) => state.loaded);
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
  const syncLinkedProgress = useMissionsStore((state) => state.syncLinkedProgress);

  useEffect(() => {
    if (!playerLoaded) {
      void loadPlayer();
    }

    if (!gatesLoaded) {
      void loadGates();
    }

    if (!missionsLoaded) {
      void loadMissions();
    }

    if (!inventoryLoaded) {
      void loadInventory();
    }

    if (!readLoaded) {
      void loadRead();
    }

    if (!booksLoaded) {
      void loadBooks();
    }

    if (!recordsLoaded) {
      void loadRecords();
    }

    if (!statsLoaded) {
      void loadStats();
    }
  }, [
    gatesLoaded,
    inventoryLoaded,
    loadGates,
    loadInventory,
    loadMissions,
    loadPlayer,
    loadRead,
    loadBooks,
    loadRecords,
    loadStats,
    missionsLoaded,
    playerLoaded,
    readLoaded,
    booksLoaded,
    recordsLoaded,
    statsLoaded,
  ]);

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
  ]);

  useEffect(() => {
    if (gatesLoaded && missionsLoaded) {
      void syncLinkedProgress(quests);
    }
  }, [gatesLoaded, missionsLoaded, quests, syncLinkedProgress]);

  return null;
}
