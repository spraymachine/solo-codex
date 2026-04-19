"use client";

import { Panel } from "@/components/ui/panel";
import { RankBadge } from "@/components/ui/rank-badge";
import { useGatesStore } from "@/lib/stores/gates-store";

export function ActiveQuests() {
  const gates = useGatesStore((state) => state.gates);
  const quests = useGatesStore((state) => state.quests);

  const activeQuests = Object.entries(quests)
    .flatMap(([gateId, questList]) =>
      questList
        .filter((quest) => quest.status === "in_progress")
        .map((quest) => {
          const gate = gates.find((item) => item.id === gateId);
          return {
            ...quest,
            gateName: gate?.title ?? "Unknown Gate",
            gateRank: gate?.rank ?? "E",
          };
        }),
    )
    .slice(0, 5);

  return (
    <Panel glow="blue">
      <h3 className="mb-4 font-mono text-xs tracking-[0.25em] text-[var(--accent-soft)]">
        ACTIVE QUESTS
      </h3>
      {activeQuests.length === 0 ? (
        <p className="text-sm text-slate-500">
          No active quests. Enter a gate to begin.
        </p>
      ) : (
        <div className="space-y-2">
          {activeQuests.map((quest) => (
            <div
              key={quest.id}
              className="flex items-center gap-3 rounded-xl bg-[rgba(150,119,89,0.08)] px-3 py-2"
            >
              <RankBadge rank={quest.gateRank} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[var(--text-primary)]">{quest.title}</p>
                <p className="text-xs text-[var(--text-secondary)]">{quest.gateName}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
