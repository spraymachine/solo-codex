"use client";

import type { SubQuest } from "@/lib/types";

interface SubQuestItemProps {
  subQuest: SubQuest;
  onToggle: (id: string) => void;
}

export function SubQuestItem({ subQuest, onToggle }: SubQuestItemProps) {
  return (
    <label className="group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/5">
      <input
        type="checkbox"
        checked={subQuest.completed}
        onChange={() => onToggle(subQuest.id)}
        className="accent-blue-500"
      />
      <span
        className={
          subQuest.completed
            ? "text-xs text-slate-500 line-through"
            : "text-xs text-slate-300"
        }
      >
        {subQuest.title}
      </span>
    </label>
  );
}
