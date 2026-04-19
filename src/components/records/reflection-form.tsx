"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Reflection } from "@/lib/types";

interface ReflectionFormProps {
  initialValue: Reflection | null;
  onSubmit: (reflection: Reflection) => void | Promise<void>;
}

export function ReflectionForm({ initialValue, onSubmit }: ReflectionFormProps) {
  const [accomplished, setAccomplished] = useState(initialValue?.accomplished ?? "");
  const [blockers, setBlockers] = useState(initialValue?.blockers ?? "");
  const [mood, setMood] = useState(initialValue?.mood ?? "");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ accomplished, blockers, mood });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={accomplished}
        onChange={(event) => setAccomplished(event.target.value)}
        className="w-full resize-none rounded-xl border border-[var(--textarea-border)] bg-[var(--textarea-bg)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] outline-none focus:border-[var(--accent-solid)]"
        rows={2}
        placeholder="What got accomplished?"
      />
      <textarea
        value={blockers}
        onChange={(event) => setBlockers(event.target.value)}
        className="w-full resize-none rounded-xl border border-[var(--textarea-border)] bg-[var(--textarea-bg)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] outline-none focus:border-[var(--accent-solid)]"
        rows={2}
        placeholder="Any blockers?"
      />
      <input
        value={mood}
        onChange={(event) => setMood(event.target.value)}
        className="w-full rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
        placeholder="Mood"
      />
      <Button type="submit">Save Reflection</Button>
    </form>
  );
}
