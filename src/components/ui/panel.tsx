import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GlowVariant = "blue" | "violet" | "emerald" | "red" | "amber";

interface PanelProps {
  children: ReactNode;
  glow?: GlowVariant;
  className?: string;
}

export function Panel({ children, glow = "blue", className }: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-[2.2rem] border border-[var(--surface-border)] bg-[var(--bg-secondary)] p-1.5 shadow-[0_20px_42px_rgba(122,92,65,0.06)]",
        `glow-${glow}`,
        className,
      )}
    >
      <div className="rounded-[calc(2.2rem-0.375rem)] border border-[var(--surface-highlight)] bg-[var(--bg-panel-strong)] px-5 py-5 md:px-6 md:py-6">
        {children}
      </div>
    </div>
  );
}
