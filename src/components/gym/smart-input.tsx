"use client";

import { useState } from "react";
import { useGymStore } from "@/lib/stores/gym-store";

export function SmartInput() {
  const [value, setValue] = useState("");
  const logSet = useGymStore((s) => s.logSet);
  const inputError = useGymStore((s) => s.inputError);
  const currentSessionId = useGymStore((s) => s.currentSessionId);
  const sessions = useGymStore((s) => s.sessions);
  const activeExerciseId = useGymStore((s) => s.activeExerciseId);

  const session = sessions.find((s) => s.id === currentSessionId) ?? null;
  const active = session?.exercises.find((e) => e.id === activeExerciseId) ?? null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    await logSet(value);
    if (!useGymStore.getState().inputError) setValue("");
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] p-3">
      <input
        aria-label="Smart set input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={active ? `1,40,15  →  ${active.name}` : "Start a session below"}
        disabled={!session}
        className="w-full bg-transparent font-mono text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
      />
      {active ? (
        <p className="mt-1 text-xs text-[var(--text-secondary)]">→ logging: {active.name}{active.isBodyweight ? " (bodyweight: set,reps)" : ""}</p>
      ) : null}
      {inputError ? <p className="mt-1 text-xs text-red-400">{inputError}</p> : null}
    </form>
  );
}
