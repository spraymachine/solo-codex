"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Persona } from "@/lib/types";

interface PersonaState {
  activePersona: Persona;
  setActivePersona: (persona: Persona) => void;
  togglePersona: () => void;
}

const DEFAULT_PERSONA: Persona = "mani";
const AVAILABLE_PERSONAS: Persona[] = ["mani", "harti"];

function isPersona(value: unknown): value is Persona {
  return typeof value === "string" && AVAILABLE_PERSONAS.includes(value as Persona);
}

export const personaMeta: Record<
  Persona,
  { label: string; accent: string; secondary: string; description: string }
> = {
  mani: {
    label: "Mani",
    accent: "#3b82f6",
    secondary: "#60a5fa",
    description: "Planning, structure, and high-focus systems.",
  },
  harti: {
    label: "Harti",
    accent: "#22c55e",
    secondary: "#86efac",
    description: "Growth, rhythm, and steady daily momentum.",
  },
  persona1: {
    label: "Persona 1",
    accent: "#f97316",
    secondary: "#fdba74",
    description: "Planning, structure, and high-focus systems.",
  },
  persona2: {
    label: "Persona 2",
    accent: "#a855f7",
    secondary: "#d8b4fe",
    description: "Growth, rhythm, and steady daily momentum.",
  },
};

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set) => ({
      activePersona: DEFAULT_PERSONA,
      setActivePersona: (persona) => set({ activePersona: persona }),
      togglePersona: () =>
        set((state) => ({
          activePersona: state.activePersona === "mani" ? "harti" : "mani",
        })),
    }),
    {
      name: "solo-leveling-persona",
      version: 1,
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== "object") {
          return persistedState as PersonaState;
        }

        const state = persistedState as PersonaState;
        return {
          ...state,
          activePersona: isPersona(state.activePersona) ? state.activePersona : DEFAULT_PERSONA,
        };
      },
    },
  ),
);
