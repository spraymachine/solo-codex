"use client";

import { useGymStore } from "@/lib/stores/gym-store";

export function DayPicker({ onManage }: { onManage: () => void }) {
  const splitDays = useGymStore((s) => s.splitDays);
  const startSession = useGymStore((s) => s.startSession);

  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">The workouts</p>
        <button type="button" onClick={onManage} className="text-xs text-[var(--accent-solid)]">Manage splits</button>
      </div>
      {splitDays.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No split days yet. Create one to start.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {splitDays.map((day) => (
            <button
              key={day.id}
              type="button"
              onClick={() => void startSession(day.id)}
              className="rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel-strong)] px-3 py-2 text-sm text-[var(--text-primary)] hover:border-[var(--accent-solid)]"
            >
              {day.name}
              <span className="ml-2 text-xs text-[var(--text-secondary)]">{day.muscles.join(" · ")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
