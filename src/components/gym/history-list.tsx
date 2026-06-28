"use client";

import { useGymStore } from "@/lib/stores/gym-store";

export function HistoryList() {
  const sessions = useGymStore((s) => s.sessions);
  const currentSessionId = useGymStore((s) => s.currentSessionId);
  const deleteSession = useGymStore((s) => s.deleteSession);
  const past = sessions.filter((s) => s.id !== currentSessionId);

  if (past.length === 0) return null;
  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] p-4">
      <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">Previous records</p>
      <ul className="flex flex-col gap-1">
        {past.map((s) => (
          <li key={s.id} className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
            <span>{s.date} · {s.name} · {"★".repeat(s.rating ?? 0)}{"☆".repeat(5 - (s.rating ?? 0))}</span>
            <button type="button" aria-label="Delete session" onClick={() => void deleteSession(s.id)} className="text-red-400">×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
