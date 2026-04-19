"use client";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { RankBadge } from "@/components/ui/rank-badge";
import type { Mission } from "@/lib/types";

interface MissionCardProps {
  mission: Mission;
  onAdjustProgress: (id: string, nextValue: number) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  readOnly?: boolean;
}

export function MissionCard({
  mission,
  onAdjustProgress,
  onDelete,
  readOnly = false,
}: MissionCardProps) {
  const progress = Math.min(
    100,
    Math.round((mission.currentValue / Math.max(mission.targetValue, 1)) * 100),
  );

  return (
    <Panel glow="violet">
      <div className="flex items-start gap-3">
        <RankBadge rank={mission.rank} />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)]">{mission.title}</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {mission.targetMetric} • {mission.linkedGateIds.length} linked gates
              </p>
              {mission.why ? (
                <p className="mt-2 text-xs text-[var(--text-secondary)]">{mission.why}</p>
              ) : null}
            </div>
            {mission.deadline ? (
              <span className="font-mono text-xs text-[var(--text-secondary)]">{mission.deadline}</span>
            ) : null}
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(131,105,80,0.12)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,color-mix(in_srgb,var(--accent-solid)_70%,white),var(--accent-solid))]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <p className="font-mono text-xs text-slate-400">
              {mission.currentValue} / {mission.targetValue} {mission.unit}
            </p>
            <p className="font-mono text-xs text-[var(--accent-soft)]">{progress}%</p>
          </div>

          {!readOnly ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                className="px-2 py-1 text-xs"
                onClick={() => onAdjustProgress(mission.id, Math.max(0, mission.currentValue - 1))}
              >
                -1
              </Button>
              <Button
                variant="secondary"
                className="px-2 py-1 text-xs"
                onClick={() =>
                  onAdjustProgress(
                    mission.id,
                    Math.min(mission.targetValue, mission.currentValue + 1),
                  )
                }
              >
                +1
              </Button>
              <Button
                variant="danger"
                className="px-2 py-1 text-xs"
                onClick={() => onDelete(mission.id)}
              >
                Delete
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
