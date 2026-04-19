"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useState } from "react";
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
import type { Reflection } from "@/lib/types";

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
            className="min-h-[100px] rounded-[0.9rem] border border-[var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm outline-none transition-colors duration-300 focus:border-[var(--accent-solid)]"
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
            className="min-h-[100px] rounded-[0.9rem] border border-[var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm outline-none transition-colors duration-300 focus:border-[var(--accent-solid)]"
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
            className="min-h-11 rounded-[0.9rem] border border-[var(--surface-border)] bg-[var(--input-bg)] px-4 text-sm outline-none transition-colors duration-300 focus:border-[var(--accent-solid)]"
          />
        </label>
        <ActionButton onClick={() => void onSave(reflection)} className="self-start">
          Save journal
        </ActionButton>
      </div>
    </div>
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
  const deleteGate = useGatesStore((state) => state.deleteGate);

  const records = useRecordsStore((state) => state.records);
  const addEntry = useRecordsStore((state) => state.addEntry);
  const saveReflection = useRecordsStore((state) => state.saveReflection);

  const profile = usePlayerStore((state) => state.profile);

  const [todoDraft, setTodoDraft] = useState("");
  const [goalDraft, setGoalDraft] = useState("");
  const [logDraft, setLogDraft] = useState("");

  const dayTodos = missions
    .filter((mission) => mission.date === selectedDate)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const campaignGoals = gates
    .filter((gate) => campaignDates.includes(gate.date))
    .sort((left, right) => left.date.localeCompare(right.date));
  const dayRecord = records.find((record) => record.date === selectedDate) ?? null;

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
    const title = todoDraft.trim();
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
    const title = goalDraft.trim();
    if (!title) {
      return;
    }

    await createGate(title, "C", {
      date: selectedDate,
      why: getPersonaWhy(activePersona),
    });
    setGoalDraft("");
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
                  className={`rounded-[1.35rem] border px-4 py-4 text-left transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99] md:px-5 md:py-5 ${accentClasses} ${glowClasses}`}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                        Persona
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                        {meta.label}
                      </p>
                    </div>
                    <span
                      className="mt-1 h-2.5 w-10 rounded-full"
                      style={{ backgroundColor: meta.accent }}
                    />
                  </div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Why: {getPersonaWhy(persona)}
                  </p>
                  <p className="mt-3 max-w-[28ch] text-sm leading-6 text-[var(--text-secondary)]">
                    {meta.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3 border-t border-[var(--surface-border)] pt-4 text-sm text-[var(--text-secondary)] md:grid-cols-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em]">Selected day</p>
              <p className="mt-2 text-base font-medium text-[var(--text-primary)]">
                {formatHumanDate(selectedDate)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em]">Current day</p>
              <p className="mt-2 text-base font-medium text-[var(--text-primary)]">
                {formatHumanDate(currentDate)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em]">Data scope</p>
              <p className="mt-2 text-base font-medium text-[var(--text-primary)]">
                Separate per person
              </p>
            </div>
          </div>
        </div>
      </section>

      <SectionShell
        eyebrow="01 Daily list"
        title="Todo list for the day"
        description="Everything here belongs to the selected date only. Add it, cross it off, or remove it without leaking into another day."
      >
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            value={todoDraft}
            onChange={(event) => setTodoDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleCreateTodo();
              }
            }}
            placeholder="Add one concrete task for this day"
            className="min-h-11 flex-1 rounded-xl border border-[var(--surface-border)] bg-[var(--input-bg)] px-4 text-sm outline-none transition-colors duration-300 focus:border-[var(--accent-solid)]"
          />
          <ActionButton onClick={() => void handleCreateTodo()} className="min-h-11 w-full md:w-auto md:px-5">
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
                  className="flex flex-col gap-4 rounded-[1rem] border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <button
                      aria-label={complete ? "Mark todo as open" : "Mark todo as complete"}
                      onClick={() => void handleToggleTodo(mission.id, !complete)}
                      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border transition-colors duration-300 ${
                        complete
                          ? "border-[#111111] bg-[#111111] text-white"
                          : "border-black/12 bg-white text-transparent"
                      }`}
                    >
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current">
                        <path d="M3.5 8.2 6.6 11l5.9-6.2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <div>
                      <p
                        className={`text-sm font-medium text-[var(--text-primary)] ${
                          complete ? "line-through opacity-55" : ""
                        }`}
                      >
                        {mission.title}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        {mission.date} · Why: {mission.why || getPersonaWhy(activePersona)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                        complete
                          ? "bg-[#edf3ec] text-[#346538]"
                          : "bg-[#fbf3db] text-[#956400]"
                      }`}
                    >
                      {complete ? "Done" : "Open"}
                    </span>
                    <GhostButton onClick={() => void deleteMission(mission.id)}>Delete</GhostButton>
                  </div>
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
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            value={goalDraft}
            onChange={(event) => setGoalDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleCreateGoal();
              }
            }}
            placeholder="Add one 3-week goal"
            className="min-h-11 flex-1 rounded-xl border border-[var(--surface-border)] bg-[var(--input-bg)] px-4 text-sm outline-none transition-colors duration-300 focus:border-[var(--accent-solid)]"
          />
          <ActionButton onClick={() => void handleCreateGoal()} className="min-h-11 w-full md:w-auto md:px-5">
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
                className="rounded-[1rem] border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                      {goal.title}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      {goal.rank} rank · {goal.date}
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
                  <GhostButton onClick={() => void deleteGate(goal.id)}>Delete</GhostButton>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="03 Reflection"
        title="Logs and journal entries"
        description="Keep the trail of the day visible. Quick logs catch the facts; the journal fields keep the day interpretable."
      >
        <div className="grid gap-6 md:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <textarea
                value={logDraft}
                onChange={(event) => setLogDraft(event.target.value)}
                placeholder="Write a quick log entry for the selected day"
                className="min-h-[120px] rounded-[1rem] border border-[var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm outline-none transition-colors duration-300 focus:border-[var(--accent-solid)]"
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
          description="A compact 21-day view for moving across the cycle."
        >
          <div className="mb-4 flex items-center justify-between border-b border-[var(--surface-border)] pb-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              20
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              May 10
            </p>
          </div>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {campaignDates.map((date) => {
              const isSelected = date === selectedDate;
              const isCurrent = date === currentDate;
              const dailyTodoCount = missions.filter((mission) => mission.date === date).length;
              const hasLog = records.some(
                (record) => record.date === date && (record.entries.length > 0 || record.reflection),
              );
              const hasActivity = dailyTodoCount > 0 || hasLog;

              return (
                <button
                  key={date}
                  onClick={() => selectDate(date)}
                  aria-label={formatHumanDate(date)}
                  className={`relative aspect-square rounded-[0.8rem] border px-1.5 py-1.5 text-center transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isSelected
                      ? "border-[var(--accent-solid)] bg-[color:color-mix(in_srgb,var(--accent-solid)_14%,var(--bg-panel))]"
                      : "border-[var(--surface-border)] bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-strong)]"
                  }`}
                >
                  <p className="pt-1 text-[11px] font-medium tracking-[-0.02em] text-[var(--text-primary)] sm:text-xs">
                    {getCalendarChipLabel(date)}
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-1.5">
                    {isCurrent ? (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)]" />
                    ) : null}
                    {hasActivity ? (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-solid)]/70" />
                    ) : null}
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
