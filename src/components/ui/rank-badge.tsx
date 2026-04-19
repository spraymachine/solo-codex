import type { Rank } from "@/lib/types";
import { cn } from "@/lib/utils";

const rankColors: Record<Rank, string> = {
  E: "border-[var(--surface-border)] text-[var(--text-secondary)]",
  D: "border-[var(--surface-border)] text-[var(--accent-soft)]",
  C: "border-[var(--surface-border)] text-[var(--accent-soft)]",
  B: "border-[var(--surface-border)] text-[var(--accent-soft)]",
  A: "border-[var(--surface-border)] text-[var(--accent-soft)]",
  S: "border-red-300/40 text-red-600",
};

const sizeClasses = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-lg",
} as const;

interface RankBadgeProps {
  rank: Rank;
  size?: keyof typeof sizeClasses;
}

export function RankBadge({ rank, size = "md" }: RankBadgeProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl border bg-white/76 font-mono font-bold shadow-[0_10px_24px_rgba(122,92,65,0.08)]",
        rankColors[rank],
        sizeClasses[size],
      )}
    >
      {rank}
    </div>
  );
}
