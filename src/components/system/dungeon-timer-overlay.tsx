"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useTimerStore } from "@/lib/stores/timer-store";

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
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
      {/* ── Active timer: compact bottom bar ─────────────────────────────── */}
      {active ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--surface-border)] bg-[var(--bg-panel-strong)] backdrop-blur-sm">
          <div className="mx-auto flex max-w-[1480px] items-center gap-4 px-4 py-3 md:px-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--accent-soft)] shrink-0">
              {expired ? "Clear" : "Timer"}
            </p>
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
              {questTitle || "Manual Focus Session"}
            </p>
            <p className="font-mono text-lg font-semibold tabular-nums text-[var(--accent-soft)] shrink-0">
              {label}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" onClick={stopTimer} className="h-8 px-3 text-xs">
                Give up
              </Button>
              <Button onClick={() => void completeTimer()} className="h-8 px-3 text-xs">
                {expired ? "Claim" : "Done"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Inactive: floating button bottom-right ──────────────────────── */
        <button
          type="button"
          onClick={() => setQuickTimerOpen(true)}
          className="fixed bottom-6 right-4 z-40 rounded-full border border-[color:color-mix(in_srgb,var(--accent-solid)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--accent-solid)_18%,transparent)] px-4 py-2.5 font-mono text-[10px] tracking-[0.25em] text-[var(--accent-soft)] shadow-[0_0_25px_color-mix(in_srgb,var(--accent-solid)_20%,transparent)] md:right-6"
        >
          TIMER
        </button>
      )}

      {/* ── Quick-start modal ─────────────────────────────────────────────── */}
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
            <Button variant="ghost" type="button" onClick={() => setQuickTimerOpen(false)}>Cancel</Button>
            <Button type="submit">Start</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
