"use client";

import { Panel } from "@/components/ui/panel";
import { RankBadge } from "@/components/ui/rank-badge";
import { XpBar } from "@/components/ui/xp-bar";
import { config } from "@/lib/config";
import { usePlayerStore } from "@/lib/stores/player-store";

export function PlayerCard() {
  const profile = usePlayerStore((state) => state.profile);

  if (!profile) {
    return null;
  }

  let spentXp = 0;
  for (let level = 1; level < profile.level; level += 1) {
    spentXp += config.leveling.xpPerLevel(level);
  }

  const levelXp = profile.xp - spentXp;
  const xpForNextLevel = config.leveling.xpPerLevel(profile.level);

  return (
    <Panel glow="violet" className="h-full">
      <div className="flex h-full flex-col justify-between gap-6">
        <div className="flex items-center gap-4">
          <RankBadge rank={profile.rank} size="lg" />
          <div className="flex-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
              player status
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              {profile.name}
            </h2>
            <p className="font-mono text-xs text-slate-400">
              Level {profile.level} • Rank {profile.rank}
            </p>
          </div>
        </div>
        <XpBar current={levelXp} max={xpForNextLevel} className="mt-1" />
      </div>
    </Panel>
  );
}
