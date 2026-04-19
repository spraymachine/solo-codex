"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Reflection } from "@/lib/types";

interface ReflectionFormProps {
  initialValue: Reflection | null;
  onSubmit: (reflection: Reflection) => void | Promise<void>;
}

export function ReflectionForm({ initialValue, onSubmit }: ReflectionFormProps) {
  const [reflect, setReflect] = useState(initialValue?.reflect ?? "");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ reflect });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={reflect}
        onChange={(event) => setReflect(event.target.value)}
        className="w-full resize-none rounded-xl border border-[var(--textarea-border)] bg-[var(--textarea-bg)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] outline-none focus:border-[var(--accent-solid)]"
        rows={5}
        placeholder="Reflect on the day…"
      />
      <Button type="submit">Save Reflection</Button>
    </form>
  );
}
