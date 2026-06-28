"use client";

import { useState } from "react";
import { useGymStore } from "@/lib/stores/gym-store";
import { EXERCISE_LIBRARY } from "@/lib/gym/library";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/types";

interface DraftExercise {
  name: string;
  muscles: MuscleGroup[];
  isBodyweight: boolean;
  libraryId: string | null;
}

export function SplitEditor({ onClose }: { onClose: () => void }) {
  const createSplitDay = useGymStore((s) => s.createSplitDay);
  const customExercises = useGymStore((s) => s.customExercises);
  const [name, setName] = useState("");
  const [muscles, setMuscles] = useState<MuscleGroup[]>([]);
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [exName, setExName] = useState("");

  const suggestions = [...EXERCISE_LIBRARY, ...customExercises];

  function toggleMuscle(m: MuscleGroup) {
    setMuscles((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  }

  function addExercise() {
    const trimmed = exName.trim();
    if (!trimmed) return;
    const libraryMatch = EXERCISE_LIBRARY.find((e) => e.name.toLowerCase() === trimmed.toLowerCase());
    const match = libraryMatch ?? suggestions.find((e) => e.name.toLowerCase() === trimmed.toLowerCase());
    setExercises((cur) => [
      ...cur,
      match
        ? { name: match.name, muscles: match.muscles, isBodyweight: match.isBodyweight, libraryId: libraryMatch ? libraryMatch.id : null }
        : { name: trimmed, muscles: [], isBodyweight: false, libraryId: null },
    ]);
    setExName("");
  }

  async function save() {
    if (!name.trim()) return;
    await createSplitDay({ name, muscles, exercises });
    onClose();
  }

  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--text-primary)]">New split day</p>
        <button type="button" onClick={onClose} className="text-xs text-[var(--text-secondary)]">Close</button>
      </div>
      <input
        aria-label="Day name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Chest day"
        className="mb-3 w-full rounded-lg border border-[var(--surface-border)] bg-transparent p-2 text-sm text-[var(--text-primary)]"
      />
      <div className="mb-3 flex flex-wrap gap-1">
        {MUSCLE_GROUPS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => toggleMuscle(m)}
            className={`rounded-full px-2 py-1 text-xs ${muscles.includes(m) ? "bg-[var(--accent-solid)] text-black" : "border border-[var(--surface-border)] text-[var(--text-secondary)]"}`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="mb-2 flex gap-2">
        <input
          aria-label="Exercise name"
          value={exName}
          onChange={(e) => setExName(e.target.value)}
          list="gym-exercise-suggestions"
          placeholder="Barbell Bench Press"
          className="flex-1 rounded-lg border border-[var(--surface-border)] bg-transparent p-2 text-sm text-[var(--text-primary)]"
        />
        <datalist id="gym-exercise-suggestions">
          {suggestions.map((e) => (
            <option key={e.name} value={e.name} />
          ))}
        </datalist>
        <button type="button" onClick={addExercise} className="rounded-lg border border-[var(--surface-border)] px-3 text-sm text-[var(--text-primary)]">Add</button>
      </div>
      <ul className="mb-3 flex flex-col gap-1">
        {exercises.map((e, i) => (
          <li key={`${e.name}-${i}`} className="text-sm text-[var(--text-secondary)]">{i + 1}. {e.name}{e.isBodyweight ? " (BW)" : ""}</li>
        ))}
      </ul>
      <button type="button" onClick={() => void save()} className="rounded-lg bg-[var(--accent-solid)] px-4 py-2 text-sm font-semibold text-black">Save split day</button>
    </div>
  );
}
