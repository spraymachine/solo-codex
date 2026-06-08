"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-gate";
import { Modal } from "@/components/ui/modal";
import {
  getPersonaWhy,
  getStatusSnapshot,
  isMissionComplete,
} from "@/lib/home-dashboard";
import { formatShortDayDate, shiftDate, todayDate } from "@/lib/utils";
import { getAllowedPersonas } from "@/lib/persona-access";
import { useContinuationStore } from "@/lib/stores/continuation-store";
import { useGatesStore } from "@/lib/stores/gates-store";
import { personaMeta, usePersonaStore } from "@/lib/stores/persona-store";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useRecordsStore } from "@/lib/stores/records-store";
import { useMissionsStore } from "@/lib/stores/missions-store";
import { StickyWall } from "@/components/sticky/sticky-wall";
import { useWorkStore } from "@/lib/stores/work-store";
import type { Gate, Persona, Reflection, SubQuest } from "@/lib/types";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const GOAL_RANK_ORDER: Record<Gate["rank"], number> = {
  S: 0,
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
};

const PERSONA_CARD_STYLE: Record<
  Persona,
  { activeBorder: string; activeShadow: string; heroBackground: string }
> = {
  mani: {
    activeBorder: "border-[#3b82f6]",
    activeShadow: "shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_18px_44px_rgba(59,130,246,0.1)]",
    heroBackground: "bg-[linear-gradient(135deg,rgba(59,130,246,0.12),transparent_60%)]",
  },
  harti: {
    activeBorder: "border-[#22c55e]",
    activeShadow: "shadow-[0_0_0_1px_rgba(34,197,94,0.35),0_18px_44px_rgba(34,197,94,0.1)]",
    heroBackground: "bg-[linear-gradient(135deg,rgba(34,197,94,0.12),transparent_60%)]",
  },
  hunter: {
    activeBorder: "border-[#f97316]",
    activeShadow: "shadow-[0_0_0_1px_rgba(249,115,22,0.35),0_18px_44px_rgba(249,115,22,0.1)]",
    heroBackground: "bg-[linear-gradient(135deg,rgba(249,115,22,0.12),transparent_60%)]",
  },
  rahul: {
    activeBorder: "border-[#a855f7]",
    activeShadow: "shadow-[0_0_0_1px_rgba(168,85,247,0.35),0_18px_44px_rgba(168,85,247,0.1)]",
    heroBackground: "bg-[linear-gradient(135deg,rgba(168,85,247,0.12),transparent_60%)]",
  },
};

function SectionShell({
  eyebrow,
  title,
  children,
  className = "",
  glowFrom = "top left",
}: {
  eyebrow: string;
  title?: string;
  description: string;
  children: ReactNode;
  className?: string;
  glowFrom?: string;
}) {
  return (
    <section
      className={`section-dots overflow-hidden rounded-xl border border-[var(--surface-border)] ${className}`}
      style={{
        background: `radial-gradient(ellipse at ${glowFrom}, color-mix(in srgb, var(--accent-solid) 9%, var(--bg-panel)) 0%, var(--bg-panel) 55%)`,
      }}
    >
      <div
        className="border-b border-[var(--surface-border)] px-5 py-4 md:px-6"
        style={{
          background: `color-mix(in srgb, var(--accent-solid) 5%, var(--bg-panel-strong))`,
        }}
      >
        <p className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.16em] text-[var(--accent-solid)]">
          {eyebrow}
        </p>
        {title ? (
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold tracking-[0.02em] text-[var(--text-primary)] md:text-2xl">
            {title}
          </h2>
        ) : null}
      </div>
      <div className="px-5 py-5 md:px-6 md:py-6">{children}</div>
    </section>
  );
}

function ActionButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg bg-[var(--accent-solid)] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:opacity-85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors duration-200 hover:border-[var(--accent-solid)]/40 hover:text-[var(--text-primary)] active:scale-[0.98] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function normalizeInlineEntry(value: string) {
  return value.replace(/\s*\n+\s*/g, " ").trim();
}

function ResponsiveEntryField({
  value,
  onChange,
  onSubmit,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
}) {
  return (
    <>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={2}
        className="min-h-[64px] w-full resize-none rounded-2xl border border-[var(--textarea-border)] bg-[var(--textarea-bg)] px-6 py-3 text-sm leading-6 text-[var(--text-primary)] shadow-none placeholder:text-[var(--text-secondary)] outline-none transition-all duration-300 focus:bg-[var(--bg-panel)] focus:border-[var(--accent-solid)] md:hidden"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            void onSubmit();
          }
        }}
        placeholder={placeholder}
        className="hidden h-12 flex-1 rounded-2xl border-0 bg-[var(--bg-secondary)] px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none ring-1 ring-transparent transition-all duration-300 focus:bg-[var(--bg-panel)] focus:ring-[var(--accent-solid)] md:block"
      />
    </>
  );
}

function formatHumanDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function getCalendarChipLabel(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  const day = parsed.getDate();
  return `${day}`;
}

function formatCalendarRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const startMonth = new Intl.DateTimeFormat("en-US", { month: "short" }).format(start);
  const endMonth = new Intl.DateTimeFormat("en-US", { month: "short" }).format(end);

  return `${startMonth} ${start.getDate()} — ${endMonth} ${end.getDate()}`;
}

function getGoalRankTone(rank: Gate["rank"]) {
  switch (rank) {
    case "S":
      return "text-[#f5c842]";
    case "A":
      return "text-[#60a5fa]";
    case "B":
      return "text-[#4ade80]";
    case "C":
      return "text-[#fb923c]";
    case "D":
      return "text-[#f87171]";
    case "E":
      return "text-[#9ca3af]";
    default:
      return "text-[var(--text-primary)]";
  }
}

function getArcRankColor(rank: Gate["rank"]) {
  switch (rank) {
    case "S": return "#e8c840";
    case "A": return "#5ea2ff";
    case "B": return "#61c78c";
    case "C": return "#c8a000";
    case "D": return "#e05c5a";
    case "E": return "#a89080";
    default:  return "#ccc";
  }
}

function getArcStripeColor(rank: Gate["rank"]) {
  switch (rank) {
    case "S": return "linear-gradient(180deg,#c8a000,#e8c840)";
    case "A": return "linear-gradient(180deg,#1f6c9f,#5ea2ff)";
    case "B": return "linear-gradient(180deg,#346538,#61c78c)";
    case "C": return "linear-gradient(180deg,#956400,#c8a000)";
    case "D": return "linear-gradient(180deg,#9f2f2d,#e05c5a)";
    case "E": return "linear-gradient(180deg,#6c5b4f,#a89080)";
    default:  return "linear-gradient(180deg,#999,#ccc)";
  }
}

function getArcTimeProgress(startDate: string, endDate: string | null): { pct: number; dueLabel: string } {
  const end = endDate ? new Date(`${endDate}T12:00:00`) : new Date(new Date(`${startDate}T12:00:00`).getTime() + 21 * 86400000);
  const start = new Date(`${startDate}T12:00:00`);
  const now = new Date();
  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const pct = total <= 0 ? 0 : Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  const dueLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(end);
  return { pct, dueLabel };
}

function ArcLegend() {
  const rankColors: Record<Gate["rank"], string> = {
    S: "#e8c840",
    A: "#5ea2ff",
    E: "#a89080",
    B: "#61c78c",
    C: "#c8a000",
    D: "#e05c5a",
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] mb-2">Priority</p>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { rank: "S" as const, label: "S - Critical" },
            { rank: "A" as const, label: "A - High" },
            { rank: "E" as const, label: "E - Normal" },
          ].map(({ rank, label }) => (
            <div key={rank} className="text-[0.625rem] flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: rankColors[rank] }}
              />
              <span className="text-[var(--text-secondary)]">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] mb-2">Difficulty</p>
        <div className="space-y-1">
          {[
            { level: 1, label: "1 - Easy" },
            { level: 2, label: "2 - Medium" },
            { level: 3, label: "3 - Hard" },
          ].map(({ level, label }) => (
            <div key={level} className="text-[0.625rem] text-[var(--text-secondary)]">
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildMonthDates(year: number, month: number): string[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  });
}

function formatMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(year, month, 1)
  );
}

function ReflectionEditor({
  initialReflection,
  onSave,
}: {
  initialReflection: Reflection | null;
  onSave: (reflection: Reflection) => Promise<void>;
}) {
  const [reflect, setReflect] = useState(initialReflection?.reflect ?? "");
  const [isEditing, setIsEditing] = useState(() => !initialReflection?.reflect);

  async function handleSave() {
    const nextReflect = reflect.trim();
    if (!nextReflect) {
      return;
    }

    await onSave({ reflect: nextReflect });
    setReflect(nextReflect);
    setIsEditing(false);
  }

  if (!isEditing && initialReflection?.reflect) {
    return (
      <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-secondary)] px-5 py-5 md:px-6 md:py-6">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--surface-border)] pb-4">
          <div>
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Saved reflection
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold tracking-[0.02em] text-[var(--text-primary)]">
              Journal entry captured
            </p>
          </div>
          <GhostButton onClick={() => setIsEditing(true)} className="shrink-0">
            Edit
          </GhostButton>
        </div>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[var(--text-primary)]">
          {reflect}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <textarea
        value={reflect}
        onChange={(event) => setReflect(event.target.value)}
        placeholder="Reflect on the day…"
        className="min-h-[220px] w-full resize-none rounded-2xl border border-[var(--textarea-border)] bg-[var(--textarea-bg)] px-5 py-4 shadow-none md:px-4 md:py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none transition-all duration-300 focus:bg-[var(--bg-panel)] focus:border-[var(--accent-solid)]"
      />
      <ActionButton onClick={() => void handleSave()} className="self-start">
        Save
      </ActionButton>
    </div>
  );
}

function GoalPlannerModal({
  goal,
  selectedDate,
  canPushSubTodo,
  onClose,
  onUpdateGoal,
  onAddSubTodo,
  onToggleSubTodo,
  onDeleteSubTodo,
  onPushSubTodo,
}: {
  goal: Gate | null;
  selectedDate: string;
  canPushSubTodo: (subTodo: SubQuest) => boolean;
  onClose: () => void;
  onUpdateGoal: (goalId: string, updates: Partial<Gate>) => Promise<void>;
  onAddSubTodo: (goalId: string, title: string) => Promise<void>;
  onToggleSubTodo: (goalId: string, subTodoId: string) => Promise<void>;
  onDeleteSubTodo: (goalId: string, subTodoId: string) => Promise<void>;
  onPushSubTodo: (goal: Gate, subTodo: SubQuest) => Promise<void>;
}) {
  const [subTodoDraft, setSubTodoDraft] = useState("");

  if (!goal) {
    return null;
  }

  return (
    <Modal open={Boolean(goal)} onClose={onClose} title="GOAL PLANNER">
      <div className="space-y-5">
        <div className="grid gap-2">
          <label className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            Main task
          </label>
          <input
            value={goal.title}
            onChange={(event) => void onUpdateGoal(goal.id, { title: event.target.value })}
            className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-3 text-base font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
            placeholder="Power BI certificate"
          />
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Goal steps
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Add reusable steps here, then send any step into the home todos for {formatHumanDate(selectedDate)}.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={subTodoDraft}
              onChange={(event) => setSubTodoDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  const nextTitle = normalizeInlineEntry(subTodoDraft);
                  if (nextTitle) {
                    void onAddSubTodo(goal.id, nextTitle);
                    setSubTodoDraft("");
                  }
                }
              }}
              className="min-h-11 flex-1 rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
              placeholder="Add a step for this goal"
            />
            <ActionButton
              onClick={() => {
                const nextTitle = normalizeInlineEntry(subTodoDraft);
                if (nextTitle) {
                  void onAddSubTodo(goal.id, nextTitle);
                  setSubTodoDraft("");
                }
              }}
              className="h-11 w-full px-5 sm:w-auto"
            >
              Add step
            </ActionButton>
          </div>

          <div className="space-y-2">
            {goal.subTodos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--surface-border)] bg-[var(--bg-secondary)] px-4 py-4 text-sm text-[var(--text-secondary)]">
                No steps yet. Add the parts of this goal that you want to send into daily todos.
              </div>
            ) : (
              goal.subTodos.map((subTodo) => {
                const alreadyPushed = !canPushSubTodo(subTodo);

                return (
                  <div
                    key={subTodo.id}
                    className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-lg border border-[var(--surface-border)] bg-[var(--bg-secondary)] px-3 py-3 sm:px-4"
                  >
                    <button
                      type="button"
                      aria-label={subTodo.completed ? "Mark sub-todo open" : "Mark sub-todo complete"}
                      onClick={() => void onToggleSubTodo(goal.id, subTodo.id)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                        subTodo.completed
                          ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]"
                          : "border-[var(--checkbox-border)] bg-transparent text-transparent"
                      }`}
                    >
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current">
                        <path d="M3.5 8.2 6.6 11l5.9-6.2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <p
                      className={`min-w-0 flex-1 text-sm font-medium text-[var(--text-primary)] ${
                        subTodo.completed ? "line-through opacity-45" : ""
                      }`}
                    >
                      {subTodo.title}
                    </p>
                    <button
                      type="button"
                      aria-label={alreadyPushed ? "Already added to selected date" : "Add to selected date todos"}
                      disabled={alreadyPushed}
                      onClick={() => void onPushSubTodo(goal, subTodo)}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center border transition-colors duration-300 ${
                        alreadyPushed
                          ? "border-[var(--surface-border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] opacity-55"
                          : "border-[var(--surface-border)] bg-[var(--bg-panel)] text-[var(--text-primary)] hover:bg-[var(--bg-panel-strong)]"
                      }`}
                    >
                      <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current">
                        <path d="M4 10h9" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="m10 5 5 5-5 5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label="Delete sub-todo"
                      onClick={() => void onDeleteSubTodo(goal.id, subTodo.id)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center text-base leading-none text-[var(--text-secondary)] transition-colors duration-300 hover:text-[var(--text-primary)]"
                    >
                      ×
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function CreateArcModal({
  open,
  today,
  onClose,
  onCreate,
}: {
  open: boolean;
  today: string;
  onClose: () => void;
  onCreate: (title: string, rank: Gate["rank"], difficulty: Gate["difficulty"], startDate: string, endDate: string) => Promise<void>;
}) {
  const ranks = ["S", "A", "E"] as const;
  const difficulties = [1, 2, 3] as const;
  const [title, setTitle] = useState("");
  const [rank, setRank] = useState<Gate["rank"]>("A");
  const [difficulty, setDifficulty] = useState<Gate["difficulty"]>(1);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(shiftDate(today, 21));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!title.trim() || !startDate || !endDate || endDate <= startDate) return;
    setSubmitting(true);
    await onCreate(title.trim(), rank, difficulty, startDate, endDate);
    setTitle("");
    setRank("A");
    setDifficulty(1);
    setStartDate(today);
    setEndDate(shiftDate(today, 21));
    setSubmitting(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="CREATE ARC">
      <div className="space-y-5">
        <div className="grid gap-2">
          <label className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Arc name</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void handleSubmit(); }}
            className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-3 text-base font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
            placeholder="e.g. Self-Improv"
            autoFocus
          />
        </div>
        <div className="grid gap-2">
          <label className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Priority rank</label>
          <div className="grid grid-cols-3 gap-2">
            {ranks.map(r => (
              <button key={r} type="button" onClick={() => setRank(r)}
                className={`h-11 border text-sm font-semibold transition-colors duration-300 ${
                  rank === r
                    ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-panel)]"
                    : "border-[var(--surface-border)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >{r}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <label className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Difficulty</label>
          <div className="grid grid-cols-3 gap-2">
            {difficulties.map(d => (
              <button key={d} type="button" onClick={() => setDifficulty(d)}
                className={`h-11 border text-sm font-semibold transition-colors duration-300 ${
                  difficulty === d
                    ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-panel)]"
                    : "border-[var(--surface-border)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >{d}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Start date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]" />
          </div>
          <div className="grid gap-2">
            <label className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">End date</label>
            <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]" />
          </div>
        </div>
        <ActionButton onClick={() => void handleSubmit()} disabled={submitting || !title.trim() || !endDate || endDate <= startDate} className="w-full">
          {submitting ? "Creating…" : "Create arc"}
        </ActionButton>
      </div>
    </Modal>
  );
}

function EditArcModal({
  arc,
  onClose,
  onUpdate,
}: {
  arc: Gate | null;
  onClose: () => void;
  onUpdate: (arcId: string, updates: Partial<Gate>) => Promise<void>;
}) {
  const ranks = ["S", "A", "E"] as const;
  const difficulties = [1, 2, 3] as const;
  const [title, setTitle] = useState(arc?.title ?? "");
  const [rank, setRank] = useState<Gate["rank"]>(arc?.rank ?? "A");
  const [difficulty, setDifficulty] = useState<Gate["difficulty"]>(arc?.difficulty ?? 1);
  const [startDate, setStartDate] = useState(arc?.date ?? "");
  const [endDate, setEndDate] = useState(arc?.endDate ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (arc) {
      setTitle(arc.title ?? "");
      setRank(arc.rank ?? "A");
      setDifficulty(arc.difficulty ?? 1);
      setStartDate(arc.date ?? "");
      setEndDate(arc.endDate ?? "");
    }
  }, [arc?.id]);

  async function handleSubmit() {
    if (!arc || !title.trim() || !startDate || !endDate || endDate <= startDate) return;
    setSubmitting(true);
    await onUpdate(arc.id, { title: title.trim(), rank, difficulty, date: startDate, endDate });
    setSubmitting(false);
    onClose();
  }

  if (!arc) return null;

  return (
    <Modal open={Boolean(arc)} onClose={onClose} title="EDIT ARC">
      <div className="space-y-5">
        <div className="grid gap-2">
          <label className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Arc name</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void handleSubmit(); }}
            className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-3 text-base font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
            autoFocus
          />
        </div>
        <div className="grid gap-2">
          <label className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Priority rank</label>
          <div className="grid grid-cols-3 gap-2">
            {ranks.map(r => (
              <button key={r} type="button" onClick={() => setRank(r)}
                className={`h-11 border text-sm font-semibold transition-colors duration-300 ${
                  rank === r
                    ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-panel)]"
                    : "border-[var(--surface-border)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >{r}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <label className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Difficulty</label>
          <div className="grid grid-cols-3 gap-2">
            {difficulties.map(d => (
              <button key={d} type="button" onClick={() => setDifficulty(d)}
                className={`h-11 border text-sm font-semibold transition-colors duration-300 ${
                  difficulty === d
                    ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-panel)]"
                    : "border-[var(--surface-border)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >{d}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Start date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]" />
          </div>
          <div className="grid gap-2">
            <label className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">End date</label>
            <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]" />
          </div>
        </div>
        <ActionButton onClick={() => void handleSubmit()} disabled={submitting || !title.trim() || !endDate || endDate <= startDate} className="w-full">
          {submitting ? "Updating…" : "Update arc"}
        </ActionButton>
      </div>
    </Modal>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const activePersona = usePersonaStore((state) => state.activePersona);
  const setActivePersona = usePersonaStore((state) => state.setActivePersona);
  const allowedPersonas = getAllowedPersonas(user?.email);
  const selectedDate = useContinuationStore((state) => state.selectedDate);
  const currentDate = useContinuationStore((state) => state.currentDate);
  const continuationStartDate = useContinuationStore((state) => state.startDate);
  const continuationTotalDays = useContinuationStore((state) => state.totalDays);
  const selectCurrentDate = useContinuationStore((state) => state.selectCurrentDate);

  const missions = useMissionsStore((state) => state.missions);
  const createMission = useMissionsStore((state) => state.createMission);
  const updateMission = useMissionsStore((state) => state.updateMission);
  const deleteMission = useMissionsStore((state) => state.deleteMission);

  const gates = useGatesStore((state) => state.gates);
  const createGate = useGatesStore((state) => state.createGate);
  const updateGate = useGatesStore((state) => state.updateGate);
  const deleteGate = useGatesStore((state) => state.deleteGate);

  const records = useRecordsStore((state) => state.records);
  const saveReflection = useRecordsStore((state) => state.saveReflection);
  const addGratitude = useRecordsStore((state) => state.addGratitude);

  const profile = usePlayerStore((state) => state.profile);

  const workLoaded = useWorkStore((state) => state.loaded);
  const workLoad = useWorkStore((state) => state.load);
  const workCourses = useWorkStore((state) => state.courses);
  const workProjects = useWorkStore((state) => state.projects);
  const workMilestones = useWorkStore((state) => state.milestones);

  useEffect(() => {
    if (!workLoaded) void workLoad();
  }, [workLoaded, workLoad]);

  const [todoDraft, setTodoDraft] = useState("");
  const [gratitudeDraft, setGratitudeDraft] = useState("");
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [editingArcId, setEditingArcId] = useState<string | null>(null);
  const [showCreateArc, setShowCreateArc] = useState(false);
  const [viewedMonth, setViewedMonth] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const dayTodos = missions
    .filter((mission) => mission.date === selectedDate)
    .sort((left, right) => {
      const leftComplete = isMissionComplete(left);
      const rightComplete = isMissionComplete(right);

      if (leftComplete !== rightComplete) {
        return Number(leftComplete) - Number(rightComplete);
      }

      return left.createdAt.localeCompare(right.createdAt);
    });
  const arcGoals = [...gates].sort((a, b) => {
    const rankDiff = GOAL_RANK_ORDER[a.rank] - GOAL_RANK_ORDER[b.rank];
    return rankDiff !== 0 ? rankDiff : a.createdAt.localeCompare(b.createdAt);
  });
  const activeGoal = arcGoals.find((goal) => goal.id === activeGoalId) ?? null;
  const dayRecord = records.find((record) => record.date === selectedDate) ?? null;
  // Month-navigation calendar
  const monthDates = buildMonthDates(viewedMonth.year, viewedMonth.month);
  const monthLeadingSlots = (new Date(`${monthDates[0]}T12:00:00`).getDay() + 6) % 7;
  const monthTrailingSlots = (7 - ((monthLeadingSlots + monthDates.length) % 7)) % 7;
  const monthCalendarDates = [
    ...Array.from({ length: monthLeadingSlots }, () => null),
    ...monthDates,
    ...Array.from({ length: monthTrailingSlots }, () => null),
  ];
  const monthStart = monthDates[0];
  const monthEnd = monthDates[monthDates.length - 1];
  const arcsThisMonth = arcGoals.filter((goal) => {
    const arcStart = goal.date;
    const arcEnd = goal.endDate ?? shiftDate(goal.date, 21);
    return arcStart <= monthEnd && arcEnd >= monthStart;
  });

  const personaDateLabel = formatShortDayDate(new Date(`${selectedDate}T12:00:00`));

  const completedTodos = dayTodos.filter((mission) => isMissionComplete(mission)).length;
  const completedArcs = arcGoals.filter((goal) => goal.status === "cleared").length;
  const totalArcs = arcGoals.length;
  const status = getStatusSnapshot({
    totalTodos: dayTodos.length,
    completedTodos,
    completedGoals: completedArcs,
    totalGoals: totalArcs,
    hasJournalEntry: Boolean(dayRecord?.entries.length || dayRecord?.reflection),
    streakCount: profile?.streakCount ?? 0,
  });
  async function handleCreateTodo() {
    const title = normalizeInlineEntry(todoDraft);
    if (!title) {
      return;
    }

    await createMission({
      title,
      rank: "D",
      date: selectedDate,
      why: getPersonaWhy(activePersona),
      targetMetric: "Checklist",
      currentValue: 0,
      targetValue: 1,
      unit: "done",
      deadline: selectedDate,
      linkedGateIds: [],
    });
    setTodoDraft("");
  }

  async function handleToggleTodo(id: string, complete: boolean) {
    await updateMission(id, {
      currentValue: complete ? 1 : 0,
      completedAt: complete ? new Date().toISOString() : null,
    });
  }

  async function handleUpdateGoal(goalId: string, updates: Partial<Gate>) {
    await updateGate(goalId, updates);
  }

  async function handleAddGoalSubTodo(goalId: string, title: string) {
    const goal = gates.find((item) => item.id === goalId);
    if (!goal) {
      return;
    }

    const nextSubTodo: SubQuest = {
      id: crypto.randomUUID(),
      title,
      completed: false,
    };

    await updateGate(goalId, {
      subTodos: [...goal.subTodos, nextSubTodo],
    });
  }

  async function handleToggleGoalSubTodo(goalId: string, subTodoId: string) {
    const goal = gates.find((item) => item.id === goalId);
    if (!goal) {
      return;
    }

    await updateGate(goalId, {
      subTodos: goal.subTodos.map((subTodo) =>
        subTodo.id === subTodoId ? { ...subTodo, completed: !subTodo.completed } : subTodo,
      ),
    });
  }

  async function handleDeleteGoalSubTodo(goalId: string, subTodoId: string) {
    const goal = gates.find((item) => item.id === goalId);
    if (!goal) {
      return;
    }

    await updateGate(goalId, {
      subTodos: goal.subTodos.filter((subTodo) => subTodo.id !== subTodoId),
    });
  }

  function canPushGoalSubTodo(goal: Gate, subTodo: SubQuest) {
    return !missions.some(
      (mission) =>
        mission.date === selectedDate &&
        mission.title === subTodo.title &&
        mission.linkedGateIds.includes(goal.id),
    );
  }

  async function handlePushGoalSubTodo(goal: Gate, subTodo: SubQuest) {
    if (!canPushGoalSubTodo(goal, subTodo)) {
      return;
    }

    await createMission({
      title: subTodo.title,
      rank: goal.rank,
      date: selectedDate,
      why: getPersonaWhy(activePersona),
      targetMetric: "Checklist",
      currentValue: 0,
      targetValue: 1,
      unit: "done",
      deadline: selectedDate,
      linkedGateIds: [goal.id],
    });
  }

  async function handleAddGratitude() {
    const text = gratitudeDraft.trim();
    if (!text) return;
    await addGratitude(text, selectedDate);
    setGratitudeDraft("");
  }

  async function handleSaveReflection(nextReflection: Reflection) {
    await saveReflection(nextReflection, selectedDate);
  }

  const activeCourses = workCourses.filter((c) => c.status === "active");
  const activeProjects = workProjects.filter((p) => !p.archivedAt && p.status === "active");
  const totalMilestones = workMilestones.length;
  const doneMilestones = workMilestones.filter((m) => m.completed).length;
  const milestonePercent =
    totalMilestones > 0 ? Math.round((doneMilestones / totalMilestones) * 100) : 0;

  const now = new Date();

  if (!allowedPersonas.includes(activePersona)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <motion.div
            className="h-[2px] w-14 rounded-full bg-[var(--accent-solid)]"
            animate={{ scaleX: [0.2, 1, 0.2], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            style={{ originX: 0.5 }}
          />
          <p className="font-[family-name:var(--font-display)] text-[0.625rem] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            initializing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1220px] space-y-8 pb-8 md:space-y-10">
      <section
        className={`section-dots overflow-hidden rounded-2xl border transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${PERSONA_CARD_STYLE[activePersona].heroBackground} border-[var(--surface-border)]`}
        style={{
          background: `radial-gradient(ellipse at top left, color-mix(in srgb, var(--accent-solid) 14%, var(--bg-panel)) 0%, var(--bg-panel) 55%)`,
        }}
      >
        <div className="grid gap-2 p-3 md:grid-cols-2 md:p-4">
          {allowedPersonas.map((persona) => {
            const meta = personaMeta[persona];
            const isActive = activePersona === persona;
            const accentClasses = isActive
              ? `${PERSONA_CARD_STYLE[persona].activeBorder} border-2 bg-[var(--bg-panel-strong)]`
              : "border border-[var(--surface-border)] bg-[var(--bg-secondary)]";
            const glowClasses = isActive
              ? PERSONA_CARD_STYLE[persona].activeShadow
              : "";

            return (
              <button
                type="button"
                key={persona}
                onClick={(event) => {
                  setActivePersona(persona);
                  if (event.detail >= 2) {
                    selectCurrentDate();
                  }
                }}
                onDoubleClick={() => selectCurrentDate()}
                className={`rounded-xl px-5 py-5 text-left transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99] md:px-6 md:py-6 ${accentClasses} ${glowClasses}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    {meta.label}
                  </p>
                  <span
                    className="mt-0.5 h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: meta.accent }}
                  />
                </div>
                <p className="mt-4 font-[family-name:var(--font-display)] text-6xl font-bold tracking-[0.01em] text-[var(--text-primary)] leading-none md:text-7xl">
                  {getPersonaWhy(persona)}
                </p>
                <p className="mt-3 font-mono text-xs tabular-nums text-[var(--text-secondary)]">
                  {personaDateLabel}
                </p>
              </button>
            );
          })}
        </div>

        <div className="px-3 pb-3 md:px-4 md:pb-4">
          <Link
            href="/work"
            className="flex items-center justify-between rounded-xl border border-[var(--surface-border)] bg-[var(--bg-secondary)] px-5 py-4 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[var(--bg-panel-strong)] active:scale-[0.99] md:px-6 md:py-5"
          >
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Work
              </p>
              {workLoaded ? (
                <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                  <span className="font-[family-name:var(--font-display)] text-2xl font-bold leading-none text-[var(--text-primary)]">
                    {activeCourses.length}
                    <span className="ml-1.5 text-xs font-normal text-[var(--text-secondary)]">
                      active {activeCourses.length === 1 ? "course" : "courses"}
                    </span>
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-2xl font-bold leading-none text-[var(--text-primary)]">
                    {activeProjects.length}
                    <span className="ml-1.5 text-xs font-normal text-[var(--text-secondary)]">
                      active {activeProjects.length === 1 ? "project" : "projects"}
                    </span>
                  </span>
                  {totalMilestones > 0 && (
                    <span className="font-mono text-xs tabular-nums text-[var(--text-secondary)]">
                      {milestonePercent}% milestones done
                    </span>
                  )}
                </div>
              ) : (
                <p className="mt-2 font-mono text-xs text-[var(--text-secondary)]">Loading…</p>
              )}
            </div>
            <span className="ml-4 shrink-0 text-[var(--text-secondary)]">→</span>
          </Link>
        </div>
      </section>

      <StickyWall activePersona={activePersona} />

      <SectionShell
        eyebrow="Daily"
        description="Everything here belongs to the selected date only."
        glowFrom="top right"
      >
        <div className="flex flex-col gap-4 md:flex-row md:gap-3">
          <ResponsiveEntryField
            value={todoDraft}
            onChange={setTodoDraft}
            onSubmit={() => void handleCreateTodo()}
            placeholder="Add one concrete task for this day"
          />
          <ActionButton onClick={() => void handleCreateTodo()} className="h-13 w-full md:h-11 md:w-auto md:px-5">
            Add todo
          </ActionButton>
        </div>

        <div className="mt-6 space-y-3">
          {dayTodos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--surface-border)] bg-[var(--bg-secondary)] px-4 py-6">
              <p className="text-sm text-[var(--text-secondary)]">No missions for {formatHumanDate(selectedDate)}.</p>
              <p className="mt-1 text-[0.625rem] uppercase tracking-[0.14em] text-[var(--text-secondary)] opacity-50">Set one to begin</p>
            </div>
          ) : (
            dayTodos.map((mission) => {
              const complete = isMissionComplete(mission);

              return (
                <div
                  key={mission.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--surface-border)] bg-[var(--bg-secondary)] px-4 py-3"
                >
                  <button
                    type="button"
                    aria-label={complete ? "Mark todo as open" : "Mark todo as complete"}
                    onClick={() => void handleToggleTodo(mission.id, !complete)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <motion.span
                      animate={complete ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 18, duration: 0.3 }}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
                        complete ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]" : "border-[var(--checkbox-border)] bg-transparent"
                      }`}
                    >
                      <AnimatePresence>
                        {complete && (
                          <motion.svg
                            key="check"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 600, damping: 22, delay: 0.04 }}
                            viewBox="0 0 16 16"
                            className="h-3 w-3 fill-none stroke-current"
                          >
                            <path d="M3.5 8.2 6.6 11l5.9-6.2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </motion.svg>
                        )}
                      </AnimatePresence>
                    </motion.span>
                    <motion.p
                      animate={{ opacity: complete ? 0.38 : 1 }}
                      transition={{ duration: 0.25 }}
                      className={`min-w-0 text-sm font-medium text-[var(--text-primary)] ${complete ? "line-through" : ""}`}
                    >
                      {mission.title}
                    </motion.p>
                  </button>

                  <button
                    type="button"
                    aria-label="Delete todo"
                    onClick={() => void deleteMission(mission.id)}
                    className="shrink-0 text-base leading-none text-[var(--text-secondary)] transition-colors duration-300 hover:text-[var(--text-primary)] active:scale-[0.96]"
                  >
                    ×
                  </button>
                </div>
              );
            })
          )}
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Arcs"
        description="Each arc is a goal with a time window and trackable steps."
        glowFrom="bottom left"
      >
        <div className="flex items-center justify-between mb-6">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            {arcGoals.length} arc{arcGoals.length !== 1 ? "s" : ""}
          </p>
          <ActionButton onClick={() => setShowCreateArc(true)}>
            New arc
          </ActionButton>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {arcGoals.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--surface-border)] bg-[var(--bg-secondary)] px-4 py-6 md:col-span-2">
              <p className="text-sm text-[var(--text-secondary)]">No active arcs.</p>
              <p className="mt-1 text-[0.625rem] uppercase tracking-[0.14em] text-[var(--text-secondary)] opacity-50">Launch one to track a goal over time</p>
            </div>
          ) : (
            arcGoals.map((goal) => {
              const { pct: timePct, dueLabel } = getArcTimeProgress(goal.date, goal.endDate ?? null);
              const completedSteps = goal.subTodos.filter(s => s.completed).length;
              const totalSteps = goal.subTodos.length;
              const stepsPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
              const rankColor = getArcRankColor(goal.rank);
              return (
                <div
                  key={goal.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveGoalId(goal.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveGoalId(goal.id);
                    }
                  }}
                  className="relative cursor-pointer overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--bg-secondary)] transition-all duration-200 hover:bg-[var(--bg-panel-strong)]"
                  style={{ borderTop: `2px solid ${rankColor}` }}
                >
                  <div className="px-5 pt-5 pb-4">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[0.02em] text-[var(--text-primary)] leading-snug">
                        {goal.title}
                      </p>
                      <div className="flex items-center gap-1 shrink-0 -mt-0.5 -mr-1">
                        <button
                          type="button"
                          aria-label="Edit arc"
                          onClick={(event) => { event.stopPropagation(); setEditingArcId(goal.id); }}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-panel)] hover:text-[var(--text-primary)]"
                        >
                          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5Z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          aria-label="Delete arc"
                          onClick={(event) => { event.stopPropagation(); void deleteGate(goal.id); }}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-panel)] hover:text-[var(--text-primary)]"
                        >
                          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 4h10M6 4V2.5h4V4M5.5 4l.5 9h4l.5-9" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Single meta line */}
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: rankColor }} />
                        {goal.rank}
                      </span>
                      <span className="text-[var(--surface-border)] select-none">·</span>
                      <span className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">D{goal.difficulty}</span>
                      <span className="text-[var(--surface-border)] select-none">·</span>
                      <span className="text-[0.625rem] text-[var(--text-secondary)]">
                        {formatCalendarRange(goal.date, goal.endDate ?? shiftDate(goal.date, 21))}
                      </span>
                      <span className="ml-auto shrink-0">
                        <span className={`rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] ${
                          goal.status === "cleared"
                            ? "bg-[rgba(74,222,128,0.1)] text-[#4ade80]"
                            : "bg-[rgba(96,165,250,0.08)] text-[#60a5fa]"
                        }`}>
                          {goal.status === "cleared" ? "Cleared" : "Active"}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Progress rows */}
                  <div className="border-t border-[var(--surface-border)] px-5 py-4 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] tabular-nums text-[var(--text-secondary)]">
                          {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${goal.date}T12:00:00`))}
                        </span>
                        <span className="text-[11px] tabular-nums text-[var(--text-secondary)]">{dueLabel}</span>
                      </div>
                      <div className="h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: "rgba(249,115,22,0.22)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(timePct, 2)}%`, backgroundColor: "#f97316" }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">Steps</span>
                        <span className="text-[0.625rem] tabular-nums text-[var(--text-secondary)]">
                          {totalSteps === 0 ? "none added" : `${completedSteps} / ${totalSteps}`}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {totalSteps === 0 ? (
                          <div className="h-[3px] w-full rounded-full bg-[var(--surface-soft)]" />
                        ) : (
                          Array.from({ length: totalSteps }, (_, i) => (
                            <div
                              key={i}
                              className="h-[3px] flex-1 rounded-sm transition-colors duration-300"
                              style={{ backgroundColor: i < completedSteps ? "var(--accent-solid)" : "var(--step-incomplete)" }}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SectionShell>

      <GoalPlannerModal
        goal={activeGoal}
        selectedDate={selectedDate}
        canPushSubTodo={(subTodo) => (activeGoal ? canPushGoalSubTodo(activeGoal, subTodo) : false)}
        onClose={() => setActiveGoalId(null)}
        onUpdateGoal={handleUpdateGoal}
        onAddSubTodo={handleAddGoalSubTodo}
        onToggleSubTodo={handleToggleGoalSubTodo}
        onDeleteSubTodo={handleDeleteGoalSubTodo}
        onPushSubTodo={handlePushGoalSubTodo}
      />
      <CreateArcModal
        open={showCreateArc}
        today={todayDate()}
        onClose={() => setShowCreateArc(false)}
        onCreate={async (title, rank, difficulty, startDate, endDate) => {
          await createGate(title, rank, {
            date: startDate,
            endDate,
            difficulty,
            why: getPersonaWhy(activePersona),
          });
        }}
      />
      <EditArcModal
        arc={arcGoals.find((goal) => goal.id === editingArcId) ?? null}
        onClose={() => setEditingArcId(null)}
        onUpdate={handleUpdateGoal}
      />

      <SectionShell
        eyebrow="Reflection"
        description="Keep the trail of the day visible."
        glowFrom="top left"
      >
        <div className="grid gap-6 md:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <input
                value={gratitudeDraft}
                onChange={(event) => setGratitudeDraft(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleAddGratitude(); } }}
                placeholder="I'm grateful for…"
                className="h-13 md:h-12 w-full rounded-2xl border-0 bg-[var(--bg-secondary)] px-5 md:px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none ring-1 ring-transparent transition-all duration-300 focus:bg-[var(--bg-panel)] focus:ring-[var(--accent-solid)]"
              />
              <ActionButton onClick={() => void handleAddGratitude()} className="self-start">
                Add
              </ActionButton>
            </div>

            <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--bg-secondary)] px-4 py-4">
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Gratitude list
              </p>
              <div className="mt-4 space-y-2">
                {dayRecord?.gratitude?.length ? (
                  dayRecord.gratitude
                    .slice()
                    .reverse()
                    .map((item, index) => (
                      <p key={index} className="text-sm leading-6 text-[var(--text-primary)]">
                        {item}
                      </p>
                    ))
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">
                    Nothing added yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          <ReflectionEditor
            key={`${selectedDate}-${dayRecord?.reflection?.reflect ?? ""}`}
            initialReflection={dayRecord?.reflection ?? null}
            onSave={handleSaveReflection}
          />
        </div>
      </SectionShell>

      <div className="grid gap-8 md:grid-cols-[1.15fr_0.85fr]">
        <SectionShell
          eyebrow="Calendar"
          title="Calendar"
          description="Navigate months to see arcs and daily entries."
          glowFrom="bottom right"
        >
          {/* Month navigation header */}
          <div className="mb-4 flex items-center justify-between border-b border-[var(--surface-border)] pb-3">
            <button
              type="button"
              onClick={() => setViewedMonth(({ year, month }) => {
                const d = new Date(year, month - 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--surface-border)] bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-solid)]/40 hover:text-[var(--text-primary)]"
            >
              ‹
            </button>
            <p className="font-mono text-sm font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
              {formatMonthLabel(viewedMonth.year, viewedMonth.month)}
            </p>
            <button
              type="button"
              onClick={() => setViewedMonth(({ year, month }) => {
                const d = new Date(year, month + 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })}
              aria-label="Next month"
              disabled={
                viewedMonth.year > now.getFullYear() ||
                (viewedMonth.year === now.getFullYear() && viewedMonth.month >= now.getMonth())
              }
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--surface-border)] bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-solid)]/40 hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>

          {/* Arcs active this month */}
          {arcsThisMonth.length > 0 && (
            <div className="mb-4 flex flex-col gap-1.5">
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] mb-1">Arcs this month</p>
              {arcsThisMonth.map((arc) => (
                <div key={arc.id} className="flex overflow-hidden rounded-md border border-[var(--surface-border)] bg-[var(--bg-secondary)]">
                  <div className="w-[3px] shrink-0" style={{ background: getArcStripeColor(arc.rank) }} />
                  <div className="flex flex-1 items-center justify-between gap-3 px-3 py-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{arc.title}</span>
                    <span className="shrink-0 text-[9px] text-[var(--text-secondary)]">
                      {formatCalendarRange(arc.date, arc.endDate ?? shiftDate(arc.date, 21))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Calendar grid */}
          <div className="grid grid-cols-7 border-l border-t border-[var(--surface-border)] bg-[var(--bg-secondary)]">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="border-r border-b border-[var(--surface-border)] px-1 py-2 text-center text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] md:px-2 md:py-3"
              >
                <span className="hidden md:inline">{label}</span>
                <span className="md:hidden">{label.slice(0, 1)}</span>
              </div>
            ))}
            {monthCalendarDates.map((date, index) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${index}`}
                    aria-hidden="true"
                    className="aspect-square border-r border-b border-[var(--surface-border)] bg-[color:color-mix(in_srgb,var(--bg-panel)_72%,transparent)]"
                  />
                );
              }

              const isSelected = date === selectedDate;
              const isCurrent = date === currentDate;
              const isInArc = arcsThisMonth.some((arc) => {
                const arcEnd = arc.endDate ?? shiftDate(arc.date, 21);
                return date >= arc.date && date <= arcEnd;
              });
              const dailyTodoCount = missions.filter((mission) => mission.date === date).length;
              const hasLog = records.some(
                (record) => record.date === date && (record.entries.length > 0 || record.reflection),
              );
              const hasTodos = dailyTodoCount > 0;
              const cornerTone = hasTodos && hasLog
                ? "bg-[var(--text-primary)]"
                : hasLog
                  ? "bg-[var(--accent-solid)]"
                  : hasTodos
                    ? "bg-[#f59e0b]"
                    : "";

              return (
                <button
                  key={date}
                  onClick={() => useContinuationStore.setState({ selectedDate: date })}
                  aria-label={formatHumanDate(date)}
                  className={`group relative aspect-square border-r border-b border-[var(--surface-border)] px-1.5 py-1.5 text-left transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:px-2 md:py-2 ${
                    isSelected
                      ? "bg-[color:color-mix(in_oklab,var(--bg-panel)_70%,var(--accent-solid)_30%)]"
                      : isInArc
                        ? "bg-[color:color-mix(in_oklab,var(--bg-secondary)_88%,var(--accent-solid)_12%)]"
                        : "bg-[var(--bg-secondary)] hover:bg-[var(--bg-panel)]"
                  }`}
                >
                  {isSelected ? (
                    <span className="pointer-events-none absolute inset-[3px] border-2 border-[var(--text-primary)] md:inset-[5px]" />
                  ) : null}
                  {(hasTodos || hasLog) ? (
                    <span
                      className={`pointer-events-none absolute right-0 top-0 h-0 w-0 border-l-[12px] border-t-[12px] border-l-transparent ${cornerTone} md:border-l-[14px] md:border-t-[14px]`}
                    />
                  ) : null}
                  <div className="relative flex h-full flex-col justify-between">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] md:text-[10px]">
                      {WEEKDAY_LABELS[new Date(`${date}T12:00:00`).getDay() === 0 ? 6 : new Date(`${date}T12:00:00`).getDay() - 1].slice(0, 1)}
                    </p>
                    <div className="flex items-end justify-between gap-2">
                      <p className="text-base font-semibold tracking-[-0.04em] text-[var(--text-primary)] md:text-xl">
                        {getCalendarChipLabel(date)}
                      </p>
                      {isCurrent ? (
                        <span className="mb-0.5 h-[2px] w-3 bg-[var(--text-primary)] md:w-4" />
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionShell>

        <SectionShell
          eyebrow="Status"
          title="Status"
          description="Rhythm, consistency, and cycle progress."
          glowFrom="top left"
        >
          <div className="grid gap-3">
            <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--bg-secondary)] px-4 py-4">
              <p className="text-[0.625rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Active why
              </p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                {getPersonaWhy(activePersona)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--bg-secondary)] px-4 py-4">
                <p className="text-[0.625rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  Streak
                </p>
                <p
                  className={`mt-2 text-2xl font-semibold tracking-[-0.04em] transition-colors duration-500 ${
                    status.streakCount > 0 ? "text-[var(--accent-solid)]" : "text-[var(--text-secondary)]"
                  }`}
                  style={
                    status.streakCount >= 7
                      ? { textShadow: "0 0 18px color-mix(in srgb, var(--accent-solid) 60%, transparent)" }
                      : undefined
                  }
                >
                  {status.streakCount}
                </p>
                {status.streakCount >= 7 && (
                  <p className="mt-1 font-[family-name:var(--font-display)] text-[0.625rem] uppercase tracking-[0.14em] text-[var(--accent-solid)] opacity-70">
                    on fire
                  </p>
                )}
              </div>
              <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--bg-secondary)] px-4 py-4">
                <p className="text-[0.625rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  Journal
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  {status.journalLabel}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--bg-secondary)] px-4 py-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[0.625rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                    Today
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    {status.todayCompletionLabel}
                  </p>
                </div>
                <p className="text-[0.625rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  completed
                </p>
              </div>
              <div className="mt-4 h-2 rounded-full bg-[var(--surface-soft)]">
                <div
                  className={`h-full rounded-full bg-[var(--accent-solid)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${status.dayCompletionRatio >= 1 ? "progress-complete" : ""}`}
                  style={{ width: `${Math.max(status.dayCompletionRatio * 100, 6)}%` }}
                />
              </div>
            </div>
            <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--bg-secondary)] px-4 py-4">
              <p className="text-[0.625rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Arcs progress
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                {status.goalsCompletionLabel}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Arcs cleared.
              </p>
            </div>
          </div>
        </SectionShell>
      </div>

    </div>
  );
}
