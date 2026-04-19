"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface XpBarProps {
  current: number;
  max: number;
  className?: string;
}

export function XpBar({ current, max, className }: XpBarProps) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1 flex items-center justify-between font-mono text-[11px] text-slate-400">
        <span>XP</span>
        <span>
          {current} / {max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full border border-[var(--surface-border)] bg-[rgba(131,105,80,0.12)]">
        <motion.div
          className="h-full rounded-full bg-[linear-gradient(90deg,color-mix(in_srgb,var(--accent-solid)_70%,white),var(--accent-solid))]"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
