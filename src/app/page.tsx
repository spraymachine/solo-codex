"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import {
  getPersonaWhy,
  getStatusSnapshot,
  isMissionComplete,
} from "@/lib/home-dashboard";
import { buildCampaignDates, useCampaignStore } from "@/lib/stores/campaign-store";
import { useGatesStore } from "@/lib/stores/gates-store";
import { personaMeta, usePersonaStore } from "@/lib/stores/persona-store";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useRecordsStore } from "@/lib/stores/records-store";
import { useMissionsStore } from "@/lib/stores/missions-store";
import type { Gate, Reflection, SubQuest } from "@/lib/types";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function SectionShell({
  eyebrow,
  title,
  description,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[1.5rem] border border-[var(--surface-border)] bg-[var(--bg-secondary)] p-2 ${className}`}
    >
      <div className="rounded-[1.1rem] border border-[var(--surface-highlight)] bg-[var(--bg-panel-strong)] px-4 py-5 md:px-6 md:py-6">
        <div className="mb-6 space-y-2 border-b border-[var(--surface-border)] pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
            {eyebrow}
          </p>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] md:text-2xl">
              {title}
            </h2>
          </div>
        </div>
        {children}
      </div>
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
      className={`inline-flex items-center justify-center rounded-md border border-[var(--surface-border)] bg-[var(--text-primary)] px-4 py-2 text-sm font-medium text-[var(--bg-panel)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
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
      className={`inline-flex items-center justify-center rounded-md border border-[var(--surface-border)] bg-[var(--bg-panel)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--bg-panel-strong)] active:scale-[0.98] ${className}`}
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
        className="min-h-[64px] w-full resize-none rounded-2xl border border-[var(--textarea-border)] bg-[var(--textarea-bg)] px-6 py-3 text-sm leading-6 text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] placeholder:text-[var(--text-secondary)] outline-none transition-all duration-300 focus:bg-[var(--bg-panel)] focus:border-[var(--accent-solid)] md:hidden"
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

function ReflectionEditor({
  initialReflection,
  onSave,
}: {
  initialReflection: Reflection | null;
  onSave: (reflection: Reflection) => Promise<void>;
}) {
  const [reflection, setReflection] = useState({
    accomplished: initialReflection?.accomplished ?? "",
    blockers: initialReflection?.blockers ?? "",
    mood: initialReflection?.mood ?? "",
  });

  return (
    <div className="rounded-[1rem] border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-4 md:px-5">
      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
            Accomplished
          </span>
          <textarea
            value={reflection.accomplished}
            onChange={(event) =>
              setReflection((current) => ({
                ...current,
                accomplished: event.target.value,
              }))
            }
            className="min-h-[100px] w-full resize-none rounded-2xl border border-[var(--textarea-border)] bg-[var(--textarea-bg)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] md:px-4 md:py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none transition-all duration-300 focus:bg-[var(--bg-panel)] focus:border-[var(--accent-solid)]"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
            Blockers
          </span>
          <textarea
            value={reflection.blockers}
            onChange={(event) =>
              setReflection((current) => ({
                ...current,
                blockers: event.target.value,
              }))
            }
            className="min-h-[100px] w-full resize-none rounded-2xl border border-[var(--textarea-border)] bg-[var(--textarea-bg)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] md:px-4 md:py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none transition-all duration-300 focus:bg-[var(--bg-panel)] focus:border-[var(--accent-solid)]"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
            Mood
          </span>
          <input
            value={reflection.mood}
            onChange={(event) =>
              setReflection((current) => ({
                ...current,
                mood: event.target.value,
              }))
            }
            className="h-12 w-full rounded-2xl border-0 bg-[var(--bg-secondary)] px-5 md:px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none ring-1 ring-transparent transition-all duration-300 focus:bg-[var(--bg-panel)] focus:ring-[var(--accent-solid)]"
          />
        </label>
        <ActionButton onClick={() => void onSave(reflection)} className="self-start">
          Save journal
        </ActionButton>
      </div>
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

  const ranks = ["S", "A", "B", "C", "D", "E"] as const;

  return (
    <Modal open={Boolean(goal)} onClose={onClose} title="GOAL PLANNER">
      <div className="space-y-5">
        <div className="grid gap-2">
          <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Main task
          </label>
          <input
            value={goal.title}
            onChange={(event) => void onUpdateGoal(goal.id, { title: event.target.value })}
            className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-3 text-base font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
            placeholder="Power BI certificate"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Rank
          </label>
          <div className="grid grid-cols-6 gap-2">
            {ranks.map((rank) => {
              const active = goal.rank === rank;
              return (
                <button
                  key={rank}
                  type="button"
                  onClick={() => void onUpdateGoal(goal.id, { rank })}
                  className={`h-11 border text-sm font-semibold transition-colors duration-300 ${
                    active
                      ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-panel)]"
                      : "border-[var(--surface-border)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {rank}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
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
              <div className="border border-dashed border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-4 text-sm text-[var(--text-secondary)]">
                No steps yet. Add the parts of this goal that you want to send into daily todos.
              </div>
            ) : (
              goal.subTodos.map((subTodo) => {
                const alreadyPushed = !canPushSubTodo(subTodo);

                return (
                  <div
                    key={subTodo.id}
                    className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border border-[var(--surface-border)] bg-[var(--bg-panel)] px-3 py-3 sm:px-4"
                  >
                    <button
                      type="button"
                      aria-label={subTodo.completed ? "Mark sub-todo open" : "Mark sub-todo complete"}
                      onClick={() => void onToggleSubTodo(goal.id, subTodo.id)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                        subTodo.completed
                          ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-panel)]"
                          : "border-black/12 bg-white text-transparent"
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

export default function HomePage() {
  const activePersona = usePersonaStore((state) => state.activePersona);
  const setActivePersona = usePersonaStore((state) => state.setActivePersona);
  const selectedDate = useCampaignStore((state) => state.selectedDate);
  const currentDate = useCampaignStore((state) => state.currentDate);
  const startDate = useCampaignStore((state) => state.startDate);
  const totalDays = useCampaignStore((state) => state.totalDays);
  const selectDate = useCampaignStore((state) => state.selectDate);
  const campaignDates = buildCampaignDates(startDate, totalDays);

  const missions = useMissionsStore((state) => state.missions);
  const createMission = useMissionsStore((state) => state.createMission);
  const updateMission = useMissionsStore((state) => state.updateMission);
  const deleteMission = useMissionsStore((state) => state.deleteMission);

  const gates = useGatesStore((state) => state.gates);
  const createGate = useGatesStore((state) => state.createGate);
  const updateGate = useGatesStore((state) => state.updateGate);
  const deleteGate = useGatesStore((state) => state.deleteGate);

  const records = useRecordsStore((state) => state.records);
  const addEntry = useRecordsStore((state) => state.addEntry);
  const saveReflection = useRecordsStore((state) => state.saveReflection);

  const profile = usePlayerStore((state) => state.profile);

  const [todoDraft, setTodoDraft] = useState("");
  const [goalDraft, setGoalDraft] = useState("");
  const [logDraft, setLogDraft] = useState("");
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);

  const dayTodos = missions
    .filter((mission) => mission.date === selectedDate)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const campaignGoals = gates
    .filter((gate) => campaignDates.includes(gate.date))
    .sort((left, right) => left.date.localeCompare(right.date));
  const activeGoal = campaignGoals.find((goal) => goal.id === activeGoalId) ?? null;
  const dayRecord = records.find((record) => record.date === selectedDate) ?? null;
  const rangeStartDate = campaignDates[0];
  const rangeEndDate = campaignDates.at(-1) ?? campaignDates[0];
  const trailingCalendarSlots = (7 - (campaignDates.length % 7)) % 7;
  const calendarDates = [...campaignDates, ...Array.from({ length: trailingCalendarSlots }, () => null)];

  const completedTodos = dayTodos.filter((mission) => isMissionComplete(mission)).length;
  const completedGoals = campaignGoals.filter((goal) => goal.status === "cleared").length;
  const status = getStatusSnapshot({
    totalTodos: dayTodos.length,
    completedTodos,
    completedGoals,
    totalGoals: campaignGoals.length,
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

  async function handleCreateGoal() {
    const title = normalizeInlineEntry(goalDraft);
    if (!title) {
      return;
    }

    const gate = await createGate(title, "C", {
      date: selectedDate,
      why: getPersonaWhy(activePersona),
    });
    setGoalDraft("");
    setActiveGoalId(gate.id);
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

  async function handleSaveLog() {
    const text = logDraft.trim();
    if (!text) {
      return;
    }

    await addEntry(text, selectedDate);
    setLogDraft("");
  }

  async function handleSaveReflection(nextReflection: Reflection) {
    await saveReflection(nextReflection, selectedDate);
  }

  return (
    <div className="mx-auto max-w-[1220px] space-y-8 pb-8 md:space-y-10">
      <section
        className={`rounded-[2rem] border border-[var(--surface-border)] p-2 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          activePersona === "mani"
            ? "bg-[linear-gradient(135deg,rgba(94,162,255,0.3),rgba(255,253,250,0.92)_40%,rgba(180,210,255,0.28))]"
            : "bg-[linear-gradient(135deg,rgba(97,199,140,0.3),rgba(255,253,250,0.92)_40%,rgba(184,235,202,0.28))]"
        }`}
      >
        <div className="rounded-[1.6rem] border border-[var(--surface-highlight)] bg-[var(--bg-panel-strong)] px-4 py-5 md:px-6 md:py-6">
          <div className="grid gap-3 md:grid-cols-2">
            {(["mani", "harti"] as const).map((persona) => {
              const meta = personaMeta[persona];
              const isActive = activePersona === persona;
              const accentClasses =
                persona === "mani"
                  ? isActive
                    ? "border-[#8dbdff] bg-[color:color-mix(in_srgb,var(--accent-solid)_16%,var(--bg-panel))]"
                    : "border-[var(--surface-border)] bg-[var(--bg-panel)]"
                  : isActive
                    ? "border-[#9ed8b4] bg-[color:color-mix(in_srgb,var(--accent-solid)_16%,var(--bg-panel))]"
                    : "border-[var(--surface-border)] bg-[var(--bg-panel)]";
              const glowClasses =
                persona === "mani"
                  ? isActive
                    ? "shadow-[0_18px_44px_rgba(94,162,255,0.18)]"
                    : "shadow-[0_10px_24px_rgba(0,0,0,0.03)]"
                  : isActive
                    ? "shadow-[0_18px_44px_rgba(97,199,140,0.18)]"
                    : "shadow-[0_10px_24px_rgba(0,0,0,0.03)]";

              return (
                <button
                  type="button"
                  key={persona}
                  onClick={() => setActivePersona(persona)}
                  className={`rounded-[1.35rem] border px-4 py-5 text-left transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99] md:px-6 md:py-6 ${accentClasses} ${glowClasses}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                      {meta.label}
                    </p>
                    <span
                      className="h-2 w-6 rounded-full"
                      style={{ backgroundColor: meta.accent }}
                    />
                  </div>
                  <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] md:text-5xl">
                    {getPersonaWhy(persona)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <SectionShell
        eyebrow="01 Daily list"
        title="Todo list for the day"
        description="Everything here belongs to the selected date only. Add it, cross it off, or remove it without leaking into another day."
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
            <div className="rounded-[1rem] border border-dashed border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-6 text-sm text-[var(--text-secondary)]">
              No todo is planned for {formatHumanDate(selectedDate)} yet.
            </div>
          ) : (
            dayTodos.map((mission) => {
              const complete = isMissionComplete(mission);

              return (
                <div
                  key={mission.id}
                  className="flex items-center gap-3 rounded-[1rem] border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-3"
                >
                  <button
                    type="button"
                    aria-label={complete ? "Mark todo as open" : "Mark todo as complete"}
                    onClick={() => void handleToggleTodo(mission.id, !complete)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                        complete ? "border-[#111111] bg-[#111111] text-white" : "border-black/12 bg-white text-transparent"
                      }`}
                    >
                    </span>
                    <p
                      className={`min-w-0 text-sm font-medium text-[var(--text-primary)] transition-opacity duration-300 ${
                        complete ? "line-through opacity-45" : ""
                      }`}
                    >
                      {mission.title}
                    </p>
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
        eyebrow="02 Three-week arc"
        title="Goals to achieve across these three weeks"
        description="This section stays broader than the daily checklist. Use it for the meaningful outcomes you want to move toward across the full campaign window."
      >
        <div className="flex flex-col gap-4 md:flex-row md:gap-3">
          <ResponsiveEntryField
            value={goalDraft}
            onChange={setGoalDraft}
            onSubmit={() => void handleCreateGoal()}
            placeholder="Add one 3-week goal to plan"
          />
          <ActionButton onClick={() => void handleCreateGoal()} className="h-13 w-full md:h-11 md:w-auto md:px-5">
            Add goal
          </ActionButton>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {campaignGoals.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-6 text-sm text-[var(--text-secondary)] md:col-span-2">
              No 3-week goals yet. Add the outcomes that should still matter by the end of this cycle.
            </div>
          ) : (
            campaignGoals.map((goal) => (
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
                className="cursor-pointer rounded-[1rem] border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-4 transition-colors duration-300 hover:bg-[var(--bg-panel-strong)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                      {goal.title}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      {goal.rank} rank · {goal.date}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                      {goal.subTodos.length} step{goal.subTodos.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                      goal.status === "cleared"
                        ? "bg-[#edf3ec] text-[#346538]"
                        : "bg-[#e1f3fe] text-[#1f6c9f]"
                    }`}
                  >
                    {goal.status === "cleared" ? "Cleared" : "Active"}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                  Why: {goal.why || getPersonaWhy(activePersona)}
                </p>
                <div className="mt-4 flex justify-end">
                  <GhostButton
                    onClick={(event) => {
                      event.stopPropagation();
                      void deleteGate(goal.id);
                    }}
                  >
                    Delete
                  </GhostButton>
                </div>
              </div>
            ))
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

      <SectionShell
        eyebrow="03 Reflection"
        title="Logs and journal entries"
        description="Keep the trail of the day visible. Quick logs catch the facts; the journal fields keep the day interpretable."
      >
        <div className="grid gap-6 md:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <textarea
                value={logDraft}
                onChange={(event) => setLogDraft(event.target.value)}
                placeholder="Write a quick log entry for the selected day"
                className="min-h-[120px] w-full resize-none rounded-2xl border border-[var(--textarea-border)] bg-[var(--textarea-bg)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] md:px-4 md:py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none transition-all duration-300 focus:bg-[var(--bg-panel)] focus:border-[var(--accent-solid)]"
              />
              <ActionButton onClick={() => void handleSaveLog()} className="self-start">
                Save log
              </ActionButton>
            </div>

            <div className="rounded-[1rem] border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                Saved logs
              </p>
              <div className="mt-4 space-y-3">
                {dayRecord?.entries.length ? (
                  dayRecord.entries
                    .slice()
                    .reverse()
                    .map((entry) => (
                      <div key={entry.timestamp} className="border-l border-black/8 pl-3">
                        <p className="text-sm leading-6 text-[var(--text-primary)]">{entry.text}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                          {entry.timestamp.slice(11, 16)}
                        </p>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">
                    No logs for this date yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          <ReflectionEditor
            key={`${selectedDate}-${dayRecord?.reflection?.accomplished ?? ""}-${dayRecord?.reflection?.blockers ?? ""}-${dayRecord?.reflection?.mood ?? ""}`}
            initialReflection={dayRecord?.reflection ?? null}
            onSave={handleSaveReflection}
          />
        </div>
      </SectionShell>

      <div className="grid gap-8 md:grid-cols-[1.15fr_0.85fr]">
        <SectionShell
          eyebrow="04 Calendar"
          title="Calendar"
          description="A sharp cycle grid for moving across the full campaign."
        >
          <div className="mb-4 flex items-end justify-between border-b border-[var(--surface-border)] pb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Cycle view
              </p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-[var(--text-primary)] md:text-xl">
                {formatCalendarRange(rangeStartDate, rangeEndDate)}
              </p>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              {campaignDates.length} days
            </p>
          </div>
          <div className="grid grid-cols-7 border-l border-t border-[var(--surface-border)] bg-[var(--bg-panel)]">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="border-r border-b border-[var(--surface-border)] px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] md:px-2 md:py-3"
              >
                <span className="hidden md:inline">{label}</span>
                <span className="md:hidden">{label.slice(0, 1)}</span>
              </div>
            ))}
            {calendarDates.map((date, index) => {
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
                    ? "bg-[#956400]"
                    : "";

              return (
                <button
                  key={date}
                  onClick={() => selectDate(date)}
                  aria-label={formatHumanDate(date)}
                  className={`group relative aspect-square border-r border-b border-[var(--surface-border)] px-1.5 py-1.5 text-left transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:px-2 md:py-2 ${
                    isSelected
                      ? "bg-[color:color-mix(in_srgb,var(--bg-panel)_86%,white)]"
                      : "bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-strong)]"
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
          eyebrow="05 Mini status"
          title="Status"
          description="A small readout for rhythm, consistency, and how much of this cycle is actually moving."
        >
          <div className="grid gap-3">
            <div className="rounded-[1rem] border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Active why
              </p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                {getPersonaWhy(activePersona)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[1rem] border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  Streak
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  {status.streakCount}
                </p>
              </div>
              <div className="rounded-[1rem] border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  Journal
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  {status.journalLabel}
                </p>
              </div>
            </div>
            <div className="rounded-[1rem] border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                    Today
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    {status.todayCompletionLabel}
                  </p>
                </div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  completed
                </p>
              </div>
              <div className="mt-4 h-2 rounded-full bg-[var(--surface-soft)]">
                <div
                  className="h-full rounded-full bg-[var(--accent-solid)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ width: `${Math.max(status.dayCompletionRatio * 100, 6)}%` }}
                />
              </div>
            </div>
            <div className="rounded-[1rem] border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Three-week progress
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                {status.goalsCompletionLabel}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Goals cleared out of the current campaign window.
              </p>
            </div>
          </div>
        </SectionShell>
      </div>
    </div>
  );
}
