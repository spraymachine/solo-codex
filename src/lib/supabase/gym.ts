import { getSupabaseBrowserClient } from "./client";
import { isSupabaseConfigured } from "./config";
import type {
  Persona,
  WorkoutSplitDay,
  WorkoutSession,
  WorkoutExercise,
} from "@/lib/types";

function sb() {
  const client = getSupabaseBrowserClient();
  if (!client || !isSupabaseConfigured()) return null;
  return client;
}

export async function getGymUserId(): Promise<string | null> {
  const client = sb();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data?.user?.id ?? null;
}

function rowToSplitDay(r: any): WorkoutSplitDay {
  return {
    id: r.id,
    name: r.name,
    muscles: r.muscles ?? [],
    exercises: r.exercises ?? [],
    order: r.order ?? 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToSession(r: any): WorkoutSession {
  return {
    id: r.id,
    date: r.date,
    splitDayId: r.split_day_id ?? null,
    name: r.name,
    muscles: r.muscles ?? [],
    rating: r.rating ?? null,
    exercises: r.exercises ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToExercise(r: any): WorkoutExercise {
  return {
    id: r.id,
    name: r.name,
    muscles: r.muscles ?? [],
    isBodyweight: r.is_bodyweight ?? false,
  };
}

export async function fetchSplitDays(userId: string, persona: Persona): Promise<WorkoutSplitDay[] | null> {
  const client = sb();
  if (!client) return null;
  const { data, error } = await client
    .from("workout_split_days")
    .select("*")
    .eq("user_id", userId)
    .eq("persona", persona)
    .order("order", { ascending: true });
  if (error) return null;
  return (data ?? []).map(rowToSplitDay);
}

export async function fetchSessions(userId: string, persona: Persona): Promise<WorkoutSession[] | null> {
  const client = sb();
  if (!client) return null;
  const { data, error } = await client
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("persona", persona)
    .order("created_at", { ascending: false });
  if (error) return null;
  return (data ?? []).map(rowToSession);
}

export async function fetchCustomExercises(userId: string, persona: Persona): Promise<WorkoutExercise[] | null> {
  const client = sb();
  if (!client) return null;
  const { data, error } = await client
    .from("workout_exercises")
    .select("*")
    .eq("user_id", userId)
    .eq("persona", persona);
  if (error) return null;
  return (data ?? []).map(rowToExercise);
}

export async function sbUpsertSplitDay(userId: string, persona: Persona, day: WorkoutSplitDay) {
  const client = sb();
  if (!client) return;
  await client.from("workout_split_days").upsert({
    id: day.id,
    user_id: userId,
    persona,
    name: day.name,
    muscles: day.muscles,
    exercises: day.exercises,
    order: day.order,
    created_at: day.createdAt,
    updated_at: day.updatedAt,
  });
}

export async function sbDeleteSplitDay(userId: string, persona: Persona, id: string) {
  const client = sb();
  if (!client) return;
  await client.from("workout_split_days").delete().eq("user_id", userId).eq("persona", persona).eq("id", id);
}

export async function sbUpsertSession(userId: string, persona: Persona, session: WorkoutSession) {
  const client = sb();
  if (!client) return;
  await client.from("workout_sessions").upsert({
    id: session.id,
    user_id: userId,
    persona,
    date: session.date,
    split_day_id: session.splitDayId,
    name: session.name,
    muscles: session.muscles,
    rating: session.rating,
    exercises: session.exercises,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  });
}

export async function sbDeleteSession(userId: string, persona: Persona, id: string) {
  const client = sb();
  if (!client) return;
  await client.from("workout_sessions").delete().eq("user_id", userId).eq("persona", persona).eq("id", id);
}

export async function sbUpsertCustomExercise(userId: string, persona: Persona, exercise: WorkoutExercise) {
  const client = sb();
  if (!client) return;
  await client.from("workout_exercises").upsert({
    id: exercise.id,
    user_id: userId,
    persona,
    name: exercise.name,
    muscles: exercise.muscles,
    is_bodyweight: exercise.isBodyweight,
  });
}
