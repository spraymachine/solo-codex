"use client";

import { create } from "zustand";
import { getDb } from "@/lib/db/database";
import { storage } from "@/lib/db/storage";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { parseSetInput } from "@/lib/gym/parse";
import {
  fetchSplitDays,
  fetchSessions,
  fetchCustomExercises,
  getGymUserId,
  sbUpsertSplitDay,
  sbDeleteSplitDay,
  sbUpsertSession,
  sbDeleteSession,
  sbUpsertCustomExercise,
} from "@/lib/supabase/gym";
import type {
  MuscleGroup,
  Persona,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSet,
  WorkoutSplitDay,
} from "@/lib/types";
import { generateId, nowISO, todayDate } from "@/lib/utils";

interface TemplateExerciseInput {
  name: string;
  muscles: MuscleGroup[];
  isBodyweight: boolean;
  libraryId: string | null;
}

interface LastRecord {
  exerciseName: string;
  setNumber: number;
  weightKg: number | null;
  reps: number;
}

interface GymState {
  splitDays: WorkoutSplitDay[];
  sessions: WorkoutSession[];
  customExercises: WorkoutExercise[];
  currentSessionId: string | null;
  activeExerciseId: string | null;
  lastRecord: LastRecord | null;
  inputError: string | null;
  loaded: boolean;
  load: (persona?: Persona) => Promise<void>;
  createSplitDay: (input: { name: string; muscles: MuscleGroup[]; exercises: TemplateExerciseInput[] }) => Promise<WorkoutSplitDay>;
  updateSplitDay: (id: string, updates: Partial<Pick<WorkoutSplitDay, "name" | "muscles" | "exercises" | "order">>) => Promise<void>;
  deleteSplitDay: (id: string) => Promise<void>;
  startSession: (splitDayId: string) => Promise<WorkoutSession | null>;
  setRating: (rating: number) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setActiveExercise: (exerciseId: string) => void;
  logSet: (raw: string) => Promise<void>;
  editSet: (exerciseId: string, setNumber: number, updates: { weightKg?: number | null; reps?: number }) => Promise<void>;
  deleteSet: (exerciseId: string, setNumber: number) => Promise<void>;
}

async function sync(fn: (userId: string) => Promise<void>) {
  try {
    const userId = await getGymUserId();
    if (!userId) return;
    await fn(userId);
  } catch (err) {
    console.error("gym sync failed", err);
  }
}

function toTemplateExercises(inputs: TemplateExerciseInput[]) {
  return inputs.map((e, i) => ({
    id: generateId(),
    name: e.name.trim(),
    muscles: e.muscles,
    isBodyweight: e.isBodyweight,
    libraryId: e.libraryId,
    order: i,
  }));
}

export const useGymStore = create<GymState>((set, get) => ({
  splitDays: [],
  sessions: [],
  customExercises: [],
  currentSessionId: null,
  activeExerciseId: null,
  lastRecord: null,
  inputError: null,
  loaded: false,

  async load(persona) {
    if (persona && usePersonaStore.getState().activePersona !== persona) return;

    if (persona) {
      try {
        const userId = await getGymUserId();
        if (userId) {
          const [cloudDays, cloudSessions, cloudExercises] = await Promise.all([
            fetchSplitDays(userId, persona),
            fetchSessions(userId, persona),
            fetchCustomExercises(userId, persona),
          ]);
          if (cloudDays && cloudSessions && cloudExercises) {
            const db = getDb(persona);
            await db.transaction("rw", [db.workoutSplitDays, db.workoutSessions, db.workoutExercises], async () => {
              await db.workoutSplitDays.clear();
              await db.workoutSessions.clear();
              await db.workoutExercises.clear();
              if (cloudDays.length) await db.workoutSplitDays.bulkAdd(cloudDays);
              if (cloudSessions.length) await db.workoutSessions.bulkAdd(cloudSessions);
              if (cloudExercises.length) await db.workoutExercises.bulkAdd(cloudExercises);
            });
            if (usePersonaStore.getState().activePersona !== persona) return;
            set({ splitDays: cloudDays, sessions: cloudSessions, customExercises: cloudExercises, loaded: true });
            return;
          }
        }
      } catch {
        // fall through to local
      }
    }

    const [splitDays, sessions, customExercises] = await Promise.all([
      storage.getSplitDays({ persona }),
      storage.getSessions({ persona }),
      storage.getCustomExercises({ persona }),
    ]);
    if (persona && usePersonaStore.getState().activePersona !== persona) return;
    set({ splitDays, sessions, customExercises, loaded: true });
  },

  async createSplitDay(input) {
    const day = await storage.createSplitDay({
      name: input.name,
      muscles: input.muscles,
      exercises: toTemplateExercises(input.exercises),
    });
    set((s) => ({ splitDays: [...s.splitDays, day].sort((a, b) => a.order - b.order) }));

    const persona = usePersonaStore.getState().activePersona;
    void sync((uid) => sbUpsertSplitDay(uid, persona, day));

    void Promise.all(
      input.exercises
        .filter((e) => e.libraryId === null && e.name.trim())
        .map(async (e) => {
          const custom = await storage.upsertCustomExercise({ name: e.name, muscles: e.muscles, isBodyweight: e.isBodyweight });
          set((s) => (s.customExercises.some((c) => c.id === custom.id) ? s : { customExercises: [...s.customExercises, custom] }));
          void sync((uid) => sbUpsertCustomExercise(uid, persona, custom));
        }),
    );

    return day;
  },

  async updateSplitDay(id, updates) {
    await storage.updateSplitDay(id, updates);
    const updatedAt = nowISO();
    set((s) => ({ splitDays: s.splitDays.map((d) => (d.id === id ? { ...d, ...updates, updatedAt } : d)).sort((a, b) => a.order - b.order) }));
    const persona = usePersonaStore.getState().activePersona;
    const day = get().splitDays.find((d) => d.id === id);
    if (day) void sync((uid) => sbUpsertSplitDay(uid, persona, day));
  },

  async deleteSplitDay(id) {
    await storage.deleteSplitDay(id);
    set((s) => ({ splitDays: s.splitDays.filter((d) => d.id !== id) }));
    const persona = usePersonaStore.getState().activePersona;
    void sync((uid) => sbDeleteSplitDay(uid, persona, id));
  },

  async startSession(splitDayId) {
    const day = get().splitDays.find((d) => d.id === splitDayId);
    if (!day) return null;
    const exercises: WorkoutSessionExercise[] = day.exercises
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((e) => ({
        id: generateId(),
        name: e.name,
        muscles: e.muscles,
        isBodyweight: e.isBodyweight,
        order: e.order,
        sets: [],
      }));
    const session = await storage.createSession({
      date: todayDate(),
      splitDayId: day.id,
      name: day.name,
      muscles: day.muscles,
      exercises,
    });
    set((s) => ({
      sessions: [session, ...s.sessions],
      currentSessionId: session.id,
      activeExerciseId: session.exercises[0]?.id ?? null,
      lastRecord: null,
      inputError: null,
    }));
    const persona = usePersonaStore.getState().activePersona;
    void sync((uid) => sbUpsertSession(uid, persona, session));
    return session;
  },

  async logSet(raw) {
    const state = get();
    const session = state.sessions.find((s) => s.id === state.currentSessionId);
    if (!session) {
      set({ inputError: "Start a session first" });
      return;
    }
    const sorted = session.exercises.slice().sort((a, b) => a.order - b.order);
    let activeIndex = sorted.findIndex((e) => e.id === state.activeExerciseId);
    if (activeIndex === -1) activeIndex = 0;
    const active = sorted[activeIndex];
    if (!active) {
      set({ inputError: "No exercises in this session" });
      return;
    }

    // Advance rule needs the candidate set number before full validation, since
    // the target exercise (not the currently active one) determines whether 2 or
    // 3 numbers are expected (bodyweight vs weighted).
    const leadingToken = raw.trim().split(/[\s,]+/)[0];
    const candidateSetNumber = Number(leadingToken);
    let targetIndex = activeIndex;
    if (candidateSetNumber === 1 && active.sets.length > 0 && activeIndex < sorted.length - 1) {
      targetIndex = activeIndex + 1;
    }
    const target = sorted[targetIndex];

    const parsed = parseSetInput(raw, target.isBodyweight);
    if (!parsed.ok) {
      set({ inputError: parsed.error });
      return;
    }

    const newSet: WorkoutSet = {
      setNumber: parsed.value.setNumber,
      weightKg: parsed.value.weightKg,
      reps: parsed.value.reps,
      loggedAt: nowISO(),
    };

    const updatedExercises = session.exercises.map((e) =>
      e.id === target.id ? { ...e, sets: [...e.sets, newSet] } : e,
    );

    await storage.updateSession(session.id, { exercises: updatedExercises });
    const updatedAt = nowISO();
    const updatedSession = { ...session, exercises: updatedExercises, updatedAt };
    set((s) => ({
      sessions: s.sessions.map((x) => (x.id === session.id ? updatedSession : x)),
      activeExerciseId: target.id,
      lastRecord: { exerciseName: target.name, setNumber: newSet.setNumber, weightKg: newSet.weightKg, reps: newSet.reps },
      inputError: null,
    }));
    const persona = usePersonaStore.getState().activePersona;
    void sync((uid) => sbUpsertSession(uid, persona, updatedSession));
  },

  async setRating(rating) {
    const state = get();
    const session = state.sessions.find((s) => s.id === state.currentSessionId);
    if (!session) return;
    await storage.updateSession(session.id, { rating });
    const updatedSession = { ...session, rating, updatedAt: nowISO() };
    set((s) => ({ sessions: s.sessions.map((x) => (x.id === session.id ? updatedSession : x)) }));
    const persona = usePersonaStore.getState().activePersona;
    void sync((uid) => sbUpsertSession(uid, persona, updatedSession));
  },

  async deleteSession(id) {
    await storage.deleteSession(id);
    set((s) => ({
      sessions: s.sessions.filter((x) => x.id !== id),
      currentSessionId: s.currentSessionId === id ? null : s.currentSessionId,
      activeExerciseId: s.currentSessionId === id ? null : s.activeExerciseId,
    }));
    const persona = usePersonaStore.getState().activePersona;
    void sync((uid) => sbDeleteSession(uid, persona, id));
  },

  setActiveExercise(exerciseId) {
    set({ activeExerciseId: exerciseId, inputError: null });
  },

  async editSet(exerciseId, setNumber, updates) {
    const state = get();
    const session = state.sessions.find((s) => s.id === state.currentSessionId);
    if (!session) return;
    const updatedExercises = session.exercises.map((e) =>
      e.id === exerciseId
        ? { ...e, sets: e.sets.map((set) => (set.setNumber === setNumber ? { ...set, ...updates } : set)) }
        : e,
    );
    await storage.updateSession(session.id, { exercises: updatedExercises });
    const updatedSession = { ...session, exercises: updatedExercises, updatedAt: nowISO() };
    set((s) => ({ sessions: s.sessions.map((x) => (x.id === session.id ? updatedSession : x)) }));
    const persona = usePersonaStore.getState().activePersona;
    void sync((uid) => sbUpsertSession(uid, persona, updatedSession));
  },

  async deleteSet(exerciseId, setNumber) {
    const state = get();
    const session = state.sessions.find((s) => s.id === state.currentSessionId);
    if (!session) return;
    const updatedExercises = session.exercises.map((e) =>
      e.id === exerciseId ? { ...e, sets: e.sets.filter((set) => set.setNumber !== setNumber) } : e,
    );
    await storage.updateSession(session.id, { exercises: updatedExercises });
    const updatedSession = { ...session, exercises: updatedExercises, updatedAt: nowISO() };
    set((s) => ({ sessions: s.sessions.map((x) => (x.id === session.id ? updatedSession : x)) }));
    const persona = usePersonaStore.getState().activePersona;
    void sync((uid) => sbUpsertSession(uid, persona, updatedSession));
  },
}));
