"use client";

import { useGymStore } from "@/lib/stores/gym-store";
import type { WorkoutSession } from "@/lib/types";

function Stars({ rating, onRate }: { rating: number | null; onRate: (n: number) => void }) {
  return (
    <div className="flex gap-1" aria-label="Workout rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Rate ${n}`}
          onClick={() => onRate(n)}
          className={n <= (rating ?? 0) ? "text-amber-400" : "text-[var(--text-secondary)]"}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function SessionView({ session }: { session: WorkoutSession }) {
  const activeExerciseId = useGymStore((s) => s.activeExerciseId);
  const setActiveExercise = useGymStore((s) => s.setActiveExercise);
  const setRating = useGymStore((s) => s.setRating);
  const deleteSet = useGymStore((s) => s.deleteSet);

  const exercises = session.exercises.slice().sort((a, b) => a.order - b.order);

  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{session.name}</p>
          <p className="text-xs text-[var(--text-secondary)]">{session.muscles.join(" · ")}</p>
        </div>
        <Stars rating={session.rating} onRate={(n) => void setRating(n)} />
      </div>
      <ul className="flex flex-col gap-2">
        {exercises.map((ex) => {
          const active = ex.id === activeExerciseId;
          return (
            <li
              key={ex.id}
              className={`rounded-lg border p-2 ${active ? "border-[var(--accent-solid)]" : "border-[var(--surface-border)]"}`}
            >
              <button type="button" onClick={() => setActiveExercise(ex.id)} className="text-left text-sm font-medium text-[var(--text-primary)]">
                {active ? "▸ " : ""}{ex.name}
              </button>
              {ex.sets.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)]">pending</p>
              ) : (
                <ul className="mt-1 flex flex-wrap gap-2">
                  {ex.sets.map((set) => (
                    <li key={set.setNumber} className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                      <span>#{set.setNumber} {set.weightKg === null ? "BW" : `${set.weightKg}kg`} × {set.reps}</span>
                      <button type="button" aria-label={`Delete set ${set.setNumber}`} onClick={() => void deleteSet(ex.id, set.setNumber)} className="text-red-400">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
