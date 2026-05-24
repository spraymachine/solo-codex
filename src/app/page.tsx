"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-gate";
import { Modal } from "@/components/ui/modal";
import {
  getPersonaWhy,
  getStatusSnapshot,
  isMissionComplete,
} from "@/lib/home-dashboard";
import { formatShortDayDate, shiftDate, todayDate } from "@/lib/utils";
import { getAllowedPersonas } from "@/lib/persona-access";
import { buildCampaignDates, useCampaignStore } from "@/lib/stores/campaign-store";
import { buildContinuationDates, useContinuationStore } from "@/lib/stores/continuation-store";
import { useGatesStore } from "@/lib/stores/gates-store";
import { personaMeta, usePersonaStore } from "@/lib/stores/persona-store";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useRecordsStore } from "@/lib/stores/records-store";
import { useMissionsStore } from "@/lib/stores/missions-store";
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
    activeBorder: "border-[#8dbdff]",
    activeShadow: "shadow-[0_18px_44px_rgba(94,162,255,0.18)]",
    heroBackground:
      "bg-[linear-gradient(135deg,rgba(94,162,255,0.3),rgba(255,253,250,0.92)_40%,rgba(180,210,255,0.28))]",
  },
  harti: {
    activeBorder: "border-[#9ed8b4]",
    activeShadow: "shadow-[0_18px_44px_rgba(97,199,140,0.18)]",
    heroBackground:
      "bg-[linear-gradient(135deg,rgba(97,199,140,0.3),rgba(255,253,250,0.92)_40%,rgba(184,235,202,0.28))]",
  },
};

function SectionShell({
  eyebrow,
  title,
  children,
  className = "",
}: {
  eyebrow: string;
  title?: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[1.5rem] border border-[var(--surface-border)] bg-[var(--bg-secondary)] p-2 ${className}`}
    >
      <div className="rounded-[1.1rem] border border-[var(--surface-highlight)] bg-[var(--bg-panel-strong)] px-4 py-5 md:px-6 md:py-6">
        <div className={`${title ? "mb-6 space-y-2" : "mb-6"} border-b border-[var(--surface-border)] pb-5`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
            {eyebrow}
          </p>
          {title ? (
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] md:text-2xl">
                {title}
              </h2>
            </div>
          ) : null}
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

function formatTime(isoTimestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(isoTimestamp));
}

function useLiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);
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
      return "text-[#7a4a00]";
    case "A":
      return "text-[#1f6c9f]";
    case "B":
      return "text-[#346538]";
    case "C":
      return "text-[#956400]";
    case "D":
      return "text-[#9f2f2d]";
    case "E":
      return "text-[#6c5b4f]";
    default:
      return "text-[var(--text-primary)]";
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
  const pct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  const dueLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(end);
  return { pct, dueLabel };
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
      <div className="rounded-[1.3rem] border border-[var(--surface-border)] bg-[var(--bg-panel)] px-5 py-5 md:px-6 md:py-6">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--surface-border)] pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
              Saved reflection
            </p>
            <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
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
        className="min-h-[220px] w-full resize-none rounded-2xl border border-[var(--textarea-border)] bg-[var(--textarea-bg)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] md:px-4 md:py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none transition-all duration-300 focus:bg-[var(--bg-panel)] focus:border-[var(--accent-solid)]"
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

function CreateArcModal({
  open,
  today,
  onClose,
  onCreate,
}: {
  open: boolean;
  today: string;
  onClose: () => void;
  onCreate: (title: string, rank: Gate["rank"], startDate: string, endDate: string) => Promise<void>;
}) {
  const ranks = ["S", "A", "B", "C", "D", "E"] as const;
  const [title, setTitle] = useState("");
  const [rank, setRank] = useState<Gate["rank"]>("A");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(shiftDate(today, 21));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!title.trim() || !startDate || !endDate || endDate <= startDate) return;
    setSubmitting(true);
    await onCreate(title.trim(), rank, startDate, endDate);
    setTitle("");
    setRank("A");
    setStartDate(today);
    setEndDate(shiftDate(today, 21));
    setSubmitting(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="CREATE ARC">
      <div className="space-y-5">
        <div className="grid gap-2">
          <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Arc name</label>
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
          <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Rank</label>
          <div className="grid grid-cols-6 gap-2">
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
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Start date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]" />
          </div>
          <div className="grid gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">End date</label>
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

export default function HomePage() {
  const { user } = useAuth();
  const activePersona = usePersonaStore((state) => state.activePersona);
  const setActivePersona = usePersonaStore((state) => state.setActivePersona);
  const allowedPersonas = getAllowedPersonas(user?.email);
  const selectedDate = useContinuationStore((state) => state.selectedDate);
  const currentDate = useContinuationStore((state) => state.currentDate);
  const continuationStartDate = useContinuationStore((state) => state.startDate);
  const continuationTotalDays = useContinuationStore((state) => state.totalDays);
  const selectDate = useContinuationStore((state) => state.selectDate);
  const selectCurrentDate = useContinuationStore((state) => state.selectCurrentDate);
  const campaignStartDate = useCampaignStore((state) => state.startDate);
  const campaignTotalDays = useCampaignStore((state) => state.totalDays);
  const campaignDates = buildCampaignDates(campaignStartDate, campaignTotalDays);
  const continuationDates = buildContinuationDates(continuationStartDate, continuationTotalDays);

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
  const addGratitude = useRecordsStore((state) => state.addGratitude);

  const profile = usePlayerStore((state) => state.profile);

  const [todoDraft, setTodoDraft] = useState("");
  const [gratitudeDraft, setGratitudeDraft] = useState("");
  const [quickLogDraft, setQuickLogDraft] = useState("");
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [showCreateArc, setShowCreateArc] = useState(false);
  const currentTime = useLiveClock();

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
  const rangeStartDate = continuationDates[0];
  const rangeEndDate = continuationDates.at(-1) ?? continuationDates[0];
  const leadingCalendarSlots =
    (new Date(`${rangeStartDate}T12:00:00`).getDay() + 6) % 7;
  const trailingCalendarSlots = (7 - ((leadingCalendarSlots + continuationDates.length) % 7)) % 7;
  const calendarDates = [
    ...Array.from({ length: leadingCalendarSlots }, () => null),
    ...continuationDates,
    ...Array.from({ length: trailingCalendarSlots }, () => null),
  ];
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

  async function handleQuickLog() {
    const text = quickLogDraft.trim();
    if (!text) return;
    await addEntry(text, selectedDate);
    setQuickLogDraft("");
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

  if (!allowedPersonas.includes(activePersona)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
          loading page...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1220px] space-y-8 pb-8 md:space-y-10">
      <section
        className={`rounded-[2rem] border border-[var(--surface-border)] p-2 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${PERSONA_CARD_STYLE[activePersona].heroBackground}`}
      >
        <div className="rounded-[1.6rem] border border-[var(--surface-highlight)] bg-[var(--bg-panel-strong)] px-4 py-5 md:px-6 md:py-6">
          <div className="grid gap-3 md:grid-cols-2">
            {allowedPersonas.map((persona) => {
              const meta = personaMeta[persona];
              const isActive = activePersona === persona;
              const accentClasses = isActive
                ? `${PERSONA_CARD_STYLE[persona].activeBorder} bg-[color:color-mix(in_srgb,var(--accent-solid)_16%,var(--bg-panel))]`
                : "border-[var(--surface-border)] bg-[var(--bg-panel)]";
              const glowClasses = isActive
                ? PERSONA_CARD_STYLE[persona].activeShadow
                : "shadow-[0_10px_24px_rgba(0,0,0,0.03)]";

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
                  <p className="mt-2 text-right text-base font-semibold tracking-[-0.02em] text-black md:text-lg">
                    {personaDateLabel}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Quick log ──────────────────────────────────────────────────────── */}
      <section className="rounded-[1.5rem] border border-[var(--surface-border)] bg-[var(--bg-secondary)] p-2">
        <div className="rounded-[1.1rem] border border-[var(--surface-highlight)] bg-[var(--bg-panel-strong)] px-4 py-4 md:px-6 md:py-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
              Quick log
            </p>
            <p className="font-mono text-[10px] tabular-nums text-[var(--text-secondary)]">
              {currentTime}
            </p>
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:gap-3">
            <ResponsiveEntryField
              value={quickLogDraft}
              onChange={setQuickLogDraft}
              onSubmit={() => void handleQuickLog()}
              placeholder={`What's happening right now...`}
            />
            <ActionButton onClick={() => void handleQuickLog()} className="h-13 w-full md:h-11 md:w-auto md:px-5">
              Log
            </ActionButton>
          </div>
          {dayRecord && dayRecord.entries.length > 0 && (
            <div className="mt-4 max-h-[220px] space-y-2 overflow-y-auto border-t border-[var(--surface-border)] pt-4 pr-1 md:max-h-none md:overflow-visible">
              {dayRecord.entries
                .slice()
                .reverse()
                .slice(0, 4)
                .map((entry) => (
                  <div key={entry.timestamp} className="flex items-start gap-3">
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--text-secondary)]">
                      {formatTime(entry.timestamp)}
                    </span>
                    <p className="min-w-0 break-words text-sm leading-6 text-[var(--text-primary)]">
                      {entry.text}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      <SectionShell
        eyebrow="01 Daily list"
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
        eyebrow="02 Arcs"
        description="Each arc is a goal with a time window and trackable steps."
      >
        <div className="flex items-center justify-between mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
            {arcGoals.length} arc{arcGoals.length !== 1 ? "s" : ""}
          </p>
          <ActionButton onClick={() => setShowCreateArc(true)}>
            New arc
          </ActionButton>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {arcGoals.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-6 text-sm text-[var(--text-secondary)] md:col-span-2">
              No arcs yet. Create one to start tracking.
            </div>
          ) : (
            arcGoals.map((goal) => {
              const { pct: timePct, dueLabel } = getArcTimeProgress(goal.date, goal.endDate ?? null);
              const completedSteps = goal.subTodos.filter(s => s.completed).length;
              const totalSteps = goal.subTodos.length;
              const stepsPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
              const remaining = totalSteps - completedSteps;
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
                  className="relative cursor-pointer overflow-hidden rounded-[1rem] border border-[var(--surface-border)] bg-[var(--bg-panel)] transition-colors duration-300 hover:bg-[var(--bg-panel-strong)] flex"
                >
                  {/* Rank stripe */}
                  <div
                    className="w-[5px] shrink-0"
                    style={{ background: getArcStripeColor(goal.rank) }}
                  />

                  <div className="flex-1 px-4 py-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] md:text-2xl">
                        {goal.title}
                      </p>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                        goal.status === "cleared" ? "bg-[#edf3ec] text-[#346538]" : "bg-[#e1f3fe] text-[#1f6c9f]"
                      }`}>
                        {goal.status === "cleared" ? "Cleared" : "Active"}
                      </span>
                    </div>

                    {/* Date + rank label */}
                    <p className="text-[10px] text-[var(--text-secondary)] mb-3 tracking-[0.04em]">
                      {formatCalendarRange(goal.date, goal.endDate ?? shiftDate(goal.date, 21))} · {goal.rank} Rank
                    </p>

                    {/* Stat tiles */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Time tile */}
                      <div className="rounded-[0.625rem] bg-[var(--bg-secondary)] px-3 py-2.5">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] mb-1.5">Time elapsed</p>
                        <p className="text-lg font-semibold tracking-[-0.04em] text-[var(--text-primary)] mb-1.5">{timePct}%</p>
                        <div className="h-1 rounded-full bg-[var(--surface-soft)] overflow-hidden">
                          <div className="h-full rounded-full bg-[var(--text-primary)] transition-all duration-500" style={{ width: `${Math.max(timePct, 2)}%` }} />
                        </div>
                        <p className="text-[9px] text-[var(--text-secondary)] mt-1.5">Due {dueLabel}</p>
                      </div>
                      {/* Steps tile */}
                      <div className="rounded-[0.625rem] bg-[#f0f6ff] px-3 py-2.5">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#5ea2ff] mb-1.5">Steps done</p>
                        <p className="text-lg font-semibold tracking-[-0.04em] text-[var(--text-primary)] mb-1.5">
                          {totalSteps === 0 ? "—" : `${completedSteps}/${totalSteps}`}
                        </p>
                        <div className="h-1 rounded-full bg-[#d0e6ff] overflow-hidden">
                          <div className="h-full rounded-full bg-[#5ea2ff] transition-all duration-500" style={{ width: `${Math.max(stepsPct, totalSteps > 0 ? 2 : 0)}%` }} />
                        </div>
                        <p className="text-[9px] text-[#5ea2ff] mt-1.5">
                          {totalSteps === 0 ? "No steps added" : `${remaining} remaining`}
                        </p>
                      </div>
                    </div>

                    {/* Delete button */}
                    <div className="mt-3 flex justify-end">
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
        onCreate={async (title, rank, startDate, endDate) => {
          await createGate(title, rank, {
            date: startDate,
            endDate,
            why: getPersonaWhy(activePersona),
          });
        }}
      />

      <SectionShell
        eyebrow="03 Reflection"
        description="Keep the trail of the day visible. Quick logs catch the facts; the journal fields keep the day interpretable."
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

            <div className="rounded-[1rem] border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
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
          eyebrow="04 Calendar"
          title="Calendar"
          description="A sharp current-month grid for the continuation from May 12 onward."
        >
          <div className="mb-4 flex items-end justify-between border-b border-[var(--surface-border)] pb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Continuation
              </p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-[var(--text-primary)] md:text-xl">
                {formatCalendarRange(rangeStartDate, rangeEndDate)}
              </p>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              {continuationDates.length} days
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
