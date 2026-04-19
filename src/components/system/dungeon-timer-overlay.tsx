"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useTimerStore } from "@/lib/stores/timer-store";

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function DungeonTimerOverlay() {
  const active = useTimerStore((state) => state.active);
  const questTitle = useTimerStore((state) => state.questTitle);
  const endTime = useTimerStore((state) => state.endTime);
  const stopTimer = useTimerStore((state) => state.stopTimer);
  const completeTimer = useTimerStore((state) => state.completeTimer);
  const startTimer = useTimerStore((state) => state.startTimer);
  const [remaining, setRemaining] = useState(0);
  const [quickTimerOpen, setQuickTimerOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState("Free Training");
  const [minutes, setMinutes] = useState(25);

  useEffect(() => {
    if (!active || !endTime) return;
    const update = () => setRemaining(Math.max(0, endTime - Date.now()));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [active, endTime]);

  const expired = active && remaining <= 0;
  const label = useMemo(() => formatRemaining(remaining), [remaining]);

  return (
    <>
      {active ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(242,233,221,0.72)] backdrop-blur-sm">
          <div className="glow-blue mx-4 w-full max-w-lg rounded-3xl bg-[var(--bg-secondary)] p-8 text-center">
            <p className="font-mono text-xs tracking-[0.35em] text-[var(--accent-soft)]">DUNGEON TIMER</p>
            <h2 className="mt-4 text-2xl text-[var(--text-primary)]">{questTitle || "Manual Focus Session"}</h2>
            <p className="mt-4 font-mono text-6xl text-[var(--accent-soft)]">{label}</p>
            <p className="mt-2 text-sm text-slate-400">
              {expired ? "Dungeon clear window reached." : "Stay inside the gate until the timer ends."}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="ghost" onClick={stopTimer}>
                Give Up
              </Button>
              <Button onClick={() => void completeTimer()}>
                {expired ? "Claim Clear" : "Complete Early"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setQuickTimerOpen(true)}
        className="fixed bottom-24 right-4 z-40 rounded-full border border-[color:color-mix(in_srgb,var(--accent-solid)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--accent-solid)_18%,transparent)] px-4 py-3 font-mono text-xs tracking-[0.25em] text-[var(--accent-soft)] shadow-[0_0_25px_color-mix(in_srgb,var(--accent-solid)_20%,transparent)] md:bottom-6"
      >
        TIMER
      </button>

      <Modal open={quickTimerOpen} onClose={() => setQuickTimerOpen(false)} title="START TIMER">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            startTimer({
              questTitle: manualTitle.trim() || "Manual Focus Session",
              durationMinutes: minutes,
              manualMode: true,
            });
            setQuickTimerOpen(false);
          }}
        >
          <input
            value={manualTitle}
            onChange={(event) => setManualTitle(event.target.value)}
            className="w-full rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
            placeholder="Session name"
          />
          <input
            type="number"
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value) || 25)}
            className="w-full rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
            placeholder="Minutes"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setQuickTimerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Start</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
