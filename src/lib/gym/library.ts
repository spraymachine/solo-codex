import type { MuscleGroup } from "@/lib/types";

export interface LibraryExercise {
  id: string;
  name: string;
  muscles: MuscleGroup[];
  isBodyweight: boolean;
}

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  { id: "barbell-bench-press", name: "Barbell Bench Press", muscles: ["Chest", "Triceps"], isBodyweight: false },
  { id: "incline-db-press", name: "Incline Dumbbell Press", muscles: ["Chest", "Shoulders"], isBodyweight: false },
  { id: "cable-flyes", name: "Cable Flyes", muscles: ["Chest"], isBodyweight: false },
  { id: "push-up", name: "Push-Up", muscles: ["Chest", "Triceps"], isBodyweight: true },
  { id: "overhead-press", name: "Overhead Press", muscles: ["Shoulders", "Triceps"], isBodyweight: false },
  { id: "lateral-raise", name: "Lateral Raise", muscles: ["Shoulders"], isBodyweight: false },
  { id: "tricep-pushdown", name: "Tricep Pushdown", muscles: ["Triceps"], isBodyweight: false },
  { id: "deadlift", name: "Deadlift", muscles: ["Back", "Hamstrings", "Glutes"], isBodyweight: false },
  { id: "barbell-row", name: "Barbell Row", muscles: ["Back", "Biceps"], isBodyweight: false },
  { id: "lat-pulldown", name: "Lat Pulldown", muscles: ["Back", "Biceps"], isBodyweight: false },
  { id: "pull-up", name: "Pull-Up", muscles: ["Back", "Biceps"], isBodyweight: true },
  { id: "barbell-curl", name: "Barbell Curl", muscles: ["Biceps"], isBodyweight: false },
  { id: "hammer-curl", name: "Hammer Curl", muscles: ["Biceps"], isBodyweight: false },
  { id: "back-squat", name: "Back Squat", muscles: ["Quads", "Glutes"], isBodyweight: false },
  { id: "front-squat", name: "Front Squat", muscles: ["Quads", "Core"], isBodyweight: false },
  { id: "leg-press", name: "Leg Press", muscles: ["Quads", "Glutes"], isBodyweight: false },
  { id: "leg-extension", name: "Leg Extension", muscles: ["Quads"], isBodyweight: false },
  { id: "romanian-deadlift", name: "Romanian Deadlift", muscles: ["Hamstrings", "Glutes"], isBodyweight: false },
  { id: "leg-curl", name: "Leg Curl", muscles: ["Hamstrings"], isBodyweight: false },
  { id: "hip-thrust", name: "Hip Thrust", muscles: ["Glutes"], isBodyweight: false },
  { id: "calf-raise", name: "Calf Raise", muscles: ["Calves"], isBodyweight: false },
  { id: "plank", name: "Plank", muscles: ["Core"], isBodyweight: true },
  { id: "hanging-leg-raise", name: "Hanging Leg Raise", muscles: ["Core"], isBodyweight: true },
  { id: "cable-crunch", name: "Cable Crunch", muscles: ["Core"], isBodyweight: false },
];
