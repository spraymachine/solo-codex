"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { generateId } from "@/lib/utils";
import type { Quest, QuestStatus, SubQuest } from "@/lib/types";
import { SubQuestItem } from "./sub-quest-item";

const priorityColors: Record<Quest["priority"], string> = {
  normal: "border-[rgba(131,105,80,0.18)] bg-[rgba(150,119,89,0.06)]",
  urgent: "border-amber-300/40 bg-amber-50",
  critical: "border-red-300/40 bg-red-50",
};

const statusActions: Partial<
  Record<QuestStatus, { label: string; next: QuestStatus }>
> = {
  available: { label: "Start", next: "in_progress" },
  in_progress: { label: "Complete", next: "completed" },
};

interface QuestItemProps {
  quest: Quest;
  onUpdateStatus: (id: string, status: QuestStatus) => void | Promise<void>;
  onUpdateSubQuests: (id: string, subQuests: SubQuest[]) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onStartTimer?: (quest: Quest) => void;
  readOnly?: boolean;
}

export function QuestItem({
  quest,
  onUpdateStatus,
  onUpdateSubQuests,
  onDelete,
  onStartTimer,
  readOnly = false,
}: QuestItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [newSubQuest, setNewSubQuest] = useState("");
  const isCompleted = quest.status === "completed";

  async function toggleSubQuest(subQuestId: string) {
    const updated = quest.subQuests.map((subQuest) =>
      subQuest.id === subQuestId
        ? { ...subQuest, completed: !subQuest.completed }
        : subQuest,
    );
    await onUpdateSubQuests(quest.id, updated);
  }

  async function addSubQuest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newSubQuest.trim()) {
      return;
    }

    await onUpdateSubQuests(quest.id, [
      ...quest.subQuests,
      { id: generateId(), title: newSubQuest.trim(), completed: false },
    ]);
    setNewSubQuest("");
  }

  return (
    <div
      className={`rounded-xl border ${priorityColors[quest.priority]} ${isCompleted ? "opacity-60" : ""}`}
    >
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-white/65"
        onClick={() => setExpanded((value) => !value)}
      >
        <div className="min-w-0 flex-1">
          <p
            className={
              isCompleted
                ? "text-sm text-slate-500 line-through"
                : "text-sm text-[var(--text-primary)]"
            }
          >
            {quest.title}
          </p>
          {quest.description ? (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {quest.description}
            </p>
          ) : null}
        </div>
        <span className="font-mono text-xs text-[var(--accent-soft)]">+{quest.xpReward} XP</span>
        {!readOnly && !isCompleted && statusActions[quest.status] ? (
          <Button
            variant="secondary"
            className="px-2 py-1 text-xs"
            onClick={(event) => {
              event.stopPropagation();
              void onUpdateStatus(quest.id, statusActions[quest.status]!.next);
            }}
          >
            {statusActions[quest.status]!.label}
          </Button>
        ) : null}
      </div>

      <AnimatePresence>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 px-4 pb-3">
              {quest.subQuests.length > 0 ? (
                <div className="space-y-0.5">
                  {quest.subQuests.map((subQuest) => (
                    <SubQuestItem
                      key={subQuest.id}
                      subQuest={subQuest}
                      onToggle={(id) => {
                        void toggleSubQuest(id);
                      }}
                    />
                  ))}
                </div>
              ) : null}

              {!readOnly && !isCompleted ? (
                <form onSubmit={addSubQuest} className="flex gap-2">
                  <input
                    type="text"
                    value={newSubQuest}
                    onChange={(event) => setNewSubQuest(event.target.value)}
                    className="flex-1 rounded-lg border border-[var(--surface-border)] bg-white/80 px-2 py-1 text-xs text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-solid)]"
                    placeholder="Add sub-quest..."
                    onClick={(event) => event.stopPropagation()}
                  />
                  <Button variant="ghost" type="submit" className="px-2 py-1 text-xs">
                    +
                  </Button>
                </form>
              ) : null}

              <div className="flex gap-2 pt-1">
                {quest.timerDuration && onStartTimer && !isCompleted && !readOnly ? (
                  <Button
                    variant="secondary"
                    className="px-2 py-1 text-xs"
                    onClick={() => onStartTimer(quest)}
                  >
                    Timer ({quest.timerDuration}m)
                  </Button>
                ) : null}
                {!readOnly ? (
                  <Button
                    variant="danger"
                    className="px-2 py-1 text-xs"
                    onClick={() => {
                      void onDelete(quest.id);
                    }}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
