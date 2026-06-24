"use client";

import { useEffect, useState } from "react";
import { DEFAULT_CHESS_USERNAME, fetchChessArchives, fetchChessGamesForMonth, fetchChessStats } from "@/lib/chess/api";
import type { ChessArchiveMonth, ChessFormatStats, ChessGame } from "@/lib/chess/types";
import { ChessStatsCard } from "./chess-stats-card";
import { ChessArchiveBrowser } from "./chess-archive-browser";
import { ChessGameList } from "./chess-game-list";

export function ChessPage() {
  const [stats, setStats] = useState<ChessFormatStats[]>([]);
  const [archives, setArchives] = useState<ChessArchiveMonth[]>([]);
  const [selected, setSelected] = useState<{ year: number; month: number } | null>(null);
  const [games, setGames] = useState<ChessGame[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statsRes, archivesRes] = await Promise.all([
          fetchChessStats(DEFAULT_CHESS_USERNAME),
          fetchChessArchives(DEFAULT_CHESS_USERNAME),
        ]);
        if (cancelled) return;
        setStats(statsRes);
        setArchives(archivesRes);
        const latest = archivesRes[archivesRes.length - 1];
        if (latest) setSelected({ year: latest.year, month: latest.month });
      } catch {
        if (!cancelled) setError(`No chess.com profile found for ${DEFAULT_CHESS_USERNAME}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchChessGamesForMonth(DEFAULT_CHESS_USERNAME, selected.year, selected.month);
        if (!cancelled) setGames(res);
      } catch {
        if (!cancelled) setError("Couldn't load games for that month.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  if (error) {
    return <p className="p-6 text-sm text-red-400">{error}</p>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Chess — {DEFAULT_CHESS_USERNAME}</h1>
      <ChessStatsCard stats={stats} />
      {selected && archives.length > 0 && <ChessArchiveBrowser months={archives} selected={selected} onSelect={setSelected} />}
      <ChessGameList games={games} username={DEFAULT_CHESS_USERNAME} />
    </div>
  );
}
