"use client";

import { Panel } from "@/components/ui/panel";
import { useGatesStore } from "@/lib/stores/gates-store";
import { usePlayerStore } from "@/lib/stores/player-store";
import { todayDate } from "@/lib/utils";

export function TodayStatus() {
  const profile = usePlayerStore((state) => state.profile);
  const gates = useGatesStore((state) => state.gates);

  if (!profile) {
    return null;
  }

  const activeGates = gates.filter((gate) => gate.status === "active").length;
  const loggedToday = profile.lastLogDate === todayDate();

  return (
    <Panel glow="blue">
      <h3 className="mb-4 font-mono text-xs tracking-[0.25em] text-[var(--accent-soft)]">
        TODAY&apos;S STATUS
      </h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="font-mono text-2xl text-[var(--text-primary)]">{profile.streakCount}</p>
          <p className="text-xs text-slate-400">Streak</p>
        </div>
        <div>
          <p className="font-mono text-2xl text-[var(--text-primary)]">{activeGates}</p>
          <p className="text-xs text-slate-400">Active Gates</p>
        </div>
        <div>
          <p className="font-mono text-2xl text-[var(--text-primary)]">{loggedToday ? "✓" : "—"}</p>
          <p className="text-xs text-slate-400">Logged</p>
        </div>
      </div>
    </Panel>
  );
}
