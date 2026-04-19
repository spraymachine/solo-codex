"use client";

import { Panel } from "@/components/ui/panel";
import { usePlayerStore } from "@/lib/stores/player-store";

export function XpHistoryPanel() {
  const xpLog = usePlayerStore((state) => state.xpLog);

  return (
    <Panel glow="blue">
      <h3 className="mb-3 font-mono text-xs tracking-[0.25em] text-[var(--accent-soft)]">XP HISTORY</h3>
      {xpLog.length === 0 ? (
        <p className="text-sm text-slate-500">No XP events yet.</p>
      ) : (
        <div className="space-y-2">
          {xpLog
            .slice()
            .reverse()
            .slice(0, 12)
            .map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-xl bg-[rgba(150,119,89,0.08)] px-3 py-2"
              >
                <div>
                  <p className="text-sm text-[var(--text-primary)]">{entry.reason}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{entry.timestamp}</p>
                </div>
                <span
                  className={`font-mono text-sm ${entry.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {entry.amount >= 0 ? `+${entry.amount}` : entry.amount}
                </span>
              </div>
            ))}
        </div>
      )}
    </Panel>
  );
}
