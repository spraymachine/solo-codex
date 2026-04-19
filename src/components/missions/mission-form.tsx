"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { Gate, Rank } from "@/lib/types";

const ranks: Rank[] = ["E", "D", "C", "B", "A", "S"];

interface MissionFormProps {
  open: boolean;
  onClose: () => void;
  gates: Gate[];
  onSubmit: (input: {
    title: string;
    rank: Rank;
    why: string;
    targetMetric: string;
    currentValue: number;
    targetValue: number;
    unit: string;
    deadline: string | null;
    linkedGateIds: string[];
  }) => void | Promise<void>;
  initialTitle?: string;
}

export function MissionForm({
  open,
  onClose,
  gates,
  onSubmit,
  initialTitle = "",
}: MissionFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [rank, setRank] = useState<Rank>("E");
  const [why, setWhy] = useState("");
  const [targetMetric, setTargetMetric] = useState("Progress");
  const [currentValue, setCurrentValue] = useState(0);
  const [targetValue, setTargetValue] = useState(10);
  const [unit, setUnit] = useState("pts");
  const [deadline, setDeadline] = useState("");
  const [linkedGateIds, setLinkedGateIds] = useState<string[]>([]);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;

    await onSubmit({
      title: title.trim(),
      rank,
      why: why.trim(),
      targetMetric: targetMetric.trim() || "Progress",
      currentValue,
      targetValue,
      unit: unit.trim() || "pts",
      deadline: deadline || null,
      linkedGateIds,
    });

    setTitle("");
    setRank("E");
    setWhy("");
    setTargetMetric("Progress");
    setCurrentValue(0);
    setTargetValue(10);
    setUnit("pts");
    setDeadline("");
    setLinkedGateIds([]);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="NEW MISSION">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
          placeholder="Mission title"
        />
        <div className="flex gap-2">
          {ranks.map((item) => (
            <button
              key={item}
              type="button"
              className={
                rank === item
                  ? "h-9 w-9 rounded-lg border border-[var(--accent-solid)] bg-[color:color-mix(in_srgb,var(--accent-solid)_14%,white)] font-mono text-[var(--accent-soft)]"
                  : "h-9 w-9 rounded-lg border border-[var(--surface-border)] bg-white/80 font-mono text-[var(--text-secondary)]"
              }
              onClick={() => setRank(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <textarea
          value={why}
          onChange={(event) => setWhy(event.target.value)}
          className="w-full resize-none rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
          rows={3}
          placeholder="Why does this mission matter?"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            value={targetMetric}
            onChange={(event) => setTargetMetric(event.target.value)}
            className="rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
            placeholder="Metric"
          />
          <input
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            className="rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
            placeholder="Unit"
          />
          <input
            type="number"
            value={currentValue}
            onChange={(event) => setCurrentValue(Number(event.target.value) || 0)}
            className="rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
            placeholder="Current"
          />
          <input
            type="number"
            value={targetValue}
            onChange={(event) => setTargetValue(Number(event.target.value) || 1)}
            className="rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
            placeholder="Target"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--text-secondary)]">Deadline</label>
          <input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            className="w-full rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs text-[var(--text-secondary)]">Linked Gates</label>
          <div className="flex flex-wrap gap-2">
            {gates.map((gate) => {
              const active = linkedGateIds.includes(gate.id);
              return (
                <button
                  key={gate.id}
                  type="button"
                  onClick={() =>
                    setLinkedGateIds((current) =>
                      active ? current.filter((id) => id !== gate.id) : [...current, gate.id],
                    )
                  }
                  className={
                    active
                      ? "rounded-full border border-emerald-300/40 bg-emerald-50 px-3 py-1 text-xs text-emerald-700"
                      : "rounded-full border border-[var(--surface-border)] bg-white/80 px-3 py-1 text-xs text-[var(--text-secondary)]"
                  }
                >
                  {gate.title}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Create Mission</Button>
        </div>
      </form>
    </Modal>
  );
}
