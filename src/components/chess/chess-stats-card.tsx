"use client";

import type { ChessFormatStats } from "@/lib/chess/types";

export function ChessStatsCard({ stats }: { stats: ChessFormatStats[] }) {
  if (stats.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel)] p-4 text-sm text-[var(--text-secondary)]">
        No rated games yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.format} className="rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel)] p-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">{s.format}</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{s.rating ?? "—"}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {s.wins}W {s.losses}L {s.draws}D
          </p>
        </div>
      ))}
    </div>
  );
}
