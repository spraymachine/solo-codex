"use client";
import { Panel } from "@/components/ui/panel";
import { RankBadge } from "@/components/ui/rank-badge";
import type { Gate } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusLabels: Record<Gate["status"], string> = {
  locked: "LOCKED",
  active: "ACTIVE",
  cleared: "CLEARED",
  failed: "FAILED",
};

const statusColors: Record<Gate["status"], string> = {
  locked: "text-[var(--text-secondary)]",
  active: "text-[var(--accent-soft)]",
  cleared: "text-emerald-600",
  failed: "text-red-600",
};

interface GateCardProps {
  gate: Gate;
  progress: number;
  questCount: number;
  href?: string;
  onSelect?: (id: string) => void;
  selected?: boolean;
}

export function GateCard({
  gate,
  progress,
  questCount,
  href,
  onSelect,
  selected = false,
}: GateCardProps) {
  const glow =
    gate.status === "cleared"
      ? "emerald"
      : gate.status === "failed"
        ? "red"
        : "blue";

  const card = (
    <button type="button" onClick={() => onSelect?.(gate.id)} className="w-full text-left">
      <Panel
        glow={glow}
        className={cn(
          "cursor-pointer transition-colors hover:bg-white/70",
          selected ? "ring-1 ring-[var(--accent-solid)]" : "",
        )}
      >
        <div className="flex items-start gap-3">
          <RankBadge rank={gate.rank} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="truncate text-sm font-medium text-[var(--text-primary)]">
                {gate.title}
              </h3>
              <span className={cn("font-mono text-xs", statusColors[gate.status])}>
                {statusLabels[gate.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{questCount} quests</p>
            {gate.why ? (
              <p className="mt-2 line-clamp-2 text-xs text-[var(--text-secondary)]">{gate.why}</p>
            ) : null}
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(131,105,80,0.12)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,color-mix(in_srgb,var(--accent-solid)_70%,white),var(--accent-solid))] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-right font-mono text-xs text-[var(--text-secondary)]">
              {progress}%
            </p>
          </div>
        </div>
      </Panel>
    </button>
  );

  if (href) {
    return <a href={href}>{card}</a>;
  }

  return card;
}
