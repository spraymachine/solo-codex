"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { Rank } from "@/lib/types";

const ranks: Rank[] = ["E", "D", "C", "B", "A", "S"];

interface GateFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { title: string; rank: Rank; why: string }) => void | Promise<void>;
}

export function GateForm({ open, onClose, onSubmit }: GateFormProps) {
  const [title, setTitle] = useState("");
  const [rank, setRank] = useState<Rank>("E");
  const [why, setWhy] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    await onSubmit({ title: title.trim(), rank, why: why.trim() });
    setTitle("");
    setRank("E");
    setWhy("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="NEW GATE">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs text-[var(--text-secondary)]">Gate Name</label>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-solid)]"
            placeholder="Enter gate name..."
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--text-secondary)]">Rank</label>
          <div className="flex gap-2">
            {ranks.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRank(item)}
                className={
                  rank === item
                    ? "h-10 w-10 rounded-xl border border-[var(--accent-solid)] bg-[color:color-mix(in_srgb,var(--accent-solid)_14%,white)] font-mono text-sm text-[var(--accent-soft)]"
                    : "h-10 w-10 rounded-xl border border-[var(--surface-border)] bg-white/80 font-mono text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                }
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--text-secondary)]">Why</label>
          <textarea
            value={why}
            onChange={(event) => setWhy(event.target.value)}
            className="w-full resize-none rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-solid)]"
            rows={3}
            placeholder="Why does this day’s challenge matter?"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Open Gate</Button>
        </div>
      </form>
    </Modal>
  );
}
