"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface QuickLogFormProps {
  onSubmit: (text: string) => void | Promise<void>;
}

export function QuickLogForm({ onSubmit }: QuickLogFormProps) {
  const [text, setText] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) return;
    await onSubmit(text.trim());
    setText("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="flex-1 rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
        placeholder="Log something you did today..."
      />
      <Button type="submit">Log</Button>
    </form>
  );
}
