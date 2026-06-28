"use client";

import { useGymStore } from "@/lib/stores/gym-store";

export function LastRecordCard() {
  const lastRecord = useGymStore((s) => s.lastRecord);
  if (!lastRecord) return null;
  const weight = lastRecord.weightKg === null ? "BW" : `${lastRecord.weightKg}kg`;
  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel-strong)] p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">Last record</p>
      <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
        {lastRecord.exerciseName} · set {lastRecord.setNumber} · {weight} × {lastRecord.reps}
      </p>
    </div>
  );
}
