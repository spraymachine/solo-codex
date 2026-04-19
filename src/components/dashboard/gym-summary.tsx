"use client";

import { Panel } from "@/components/ui/panel";
import { useStatsStore } from "@/lib/stores/stats-store";

export function GymSummary() {
  const gymStats = useStatsStore((state) => state.gymStats);

  return (
    <Panel glow="emerald">
      <h3 className="mb-4 font-mono text-xs tracking-[0.25em] text-[var(--accent-soft)]">
        GYM SUMMARY
      </h3>
      {gymStats.length === 0 ? (
        <p className="text-sm text-slate-500">No gym stats tracked yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {gymStats.slice(0, 4).map((stat) => {
            const latest = stat.entries.at(-1);
            const previous = stat.entries.at(-2);
            const trend =
              latest && previous
                ? latest.value > previous.value
                  ? "↑"
                  : latest.value < previous.value
                    ? "↓"
                    : "→"
                : "•";

            return (
              <div key={stat.id} className="rounded-xl bg-[rgba(150,119,89,0.08)] px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--text-primary)]">{stat.name}</p>
                  <span className="font-mono text-xs text-[var(--accent-soft)]">{trend}</span>
                </div>
                <p className="mt-1 font-mono text-lg text-[var(--text-primary)]">
                  {latest ? `${latest.value}${stat.unit}` : "—"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
