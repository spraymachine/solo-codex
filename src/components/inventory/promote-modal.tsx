"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { InventoryItem, Rank } from "@/lib/types";

const ranks: Rank[] = ["E", "D", "C", "B", "A", "S"];

interface PromoteModalProps {
  open: boolean;
  type: "gate" | "mission";
  item: InventoryItem | null;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    rank: Rank;
    targetMetric?: string;
    targetValue?: number;
    unit?: string;
  }) => void | Promise<void>;
}

export function PromoteModal({
  open,
  type,
  item,
  onClose,
  onSubmit,
}: PromoteModalProps) {
  const [title, setTitle] = useState("");
  const [rank, setRank] = useState<Rank>("E");
  const [targetMetric, setTargetMetric] = useState("Progress");
  const [targetValue, setTargetValue] = useState(10);
  const [unit, setUnit] = useState("pts");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim() || item?.name || "";
    if (!nextTitle) return;

    await onSubmit({
      title: nextTitle,
      rank,
      targetMetric,
      targetValue,
      unit,
    });
    setTitle("");
    setRank("E");
    setTargetMetric("Progress");
    setTargetValue(10);
    setUnit("pts");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`PROMOTE TO ${type.toUpperCase()}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
          placeholder={item?.name ?? "Title"}
        />
        <div className="flex gap-2">
          {ranks.map((itemRank) => (
            <button
              key={itemRank}
              type="button"
              onClick={() => setRank(itemRank)}
              className={
                rank === itemRank
                  ? "h-9 w-9 rounded-lg border border-[var(--accent-solid)] bg-[color:color-mix(in_srgb,var(--accent-solid)_14%,white)] font-mono text-[var(--accent-soft)]"
                  : "h-9 w-9 rounded-lg border border-[var(--surface-border)] bg-white/80 font-mono text-[var(--text-secondary)]"
              }
            >
              {itemRank}
            </button>
          ))}
        </div>
        {type === "mission" ? (
          <div className="grid grid-cols-3 gap-3">
            <input
              value={targetMetric}
              onChange={(event) => setTargetMetric(event.target.value)}
              className="rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
              placeholder="Metric"
            />
            <input
              type="number"
              value={targetValue}
              onChange={(event) => setTargetValue(Number(event.target.value) || 1)}
              className="rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
              placeholder="Target"
            />
            <input
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              className="rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
              placeholder="Unit"
            />
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Promote</Button>
        </div>
      </form>
    </Modal>
  );
}
