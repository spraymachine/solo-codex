"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { QuestPriority } from "@/lib/types";

const priorities: { value: QuestPriority; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "urgent", label: "Urgent" },
  { value: "critical", label: "Critical" },
];

interface QuestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    description: string;
    priority: QuestPriority;
    xpReward: number;
    timerDuration: number | null;
  }) => void | Promise<void>;
}

export function QuestForm({ open, onClose, onSubmit }: QuestFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<QuestPriority>("normal");
  const [xpReward, setXpReward] = useState(10);
  const [timerMinutes, setTimerMinutes] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      xpReward,
      timerDuration: timerMinutes ? Number.parseInt(timerMinutes, 10) : null,
    });

    setTitle("");
    setDescription("");
    setPriority("normal");
    setXpReward(10);
    setTimerMinutes("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="NEW QUEST">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs text-[var(--text-secondary)]">Quest Name</label>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-solid)]"
            placeholder="Enter quest name..."
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--text-secondary)]">Description</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full resize-none rounded-xl border border-[var(--textarea-border)] bg-[var(--textarea-bg)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] outline-none transition-colors focus:border-[var(--accent-solid)]"
            rows={2}
            placeholder="Optional description..."
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">Priority</label>
            <div className="flex gap-2">
              {priorities.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPriority(item.value)}
                  className={
                    priority === item.value
                      ? "rounded-lg border border-[var(--accent-solid)] bg-[color:color-mix(in_srgb,var(--accent-solid)_14%,white)] px-3 py-1.5 text-xs text-[var(--accent-soft)]"
                      : "rounded-lg border border-[var(--surface-border)] bg-white/80 px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">XP</label>
            <input
              type="number"
              value={xpReward}
              onChange={(event) =>
                setXpReward(Number.parseInt(event.target.value, 10) || 0)
              }
              className="w-20 rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-solid)]"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--text-secondary)]">
            Timer (minutes, optional)
          </label>
          <input
            type="number"
            value={timerMinutes}
            onChange={(event) => setTimerMinutes(event.target.value)}
            className="w-24 rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-solid)]"
            placeholder="—"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Accept Quest</Button>
        </div>
      </form>
    </Modal>
  );
}
