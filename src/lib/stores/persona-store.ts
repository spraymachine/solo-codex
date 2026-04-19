"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Persona } from "@/lib/types";

interface PersonaState {
  activePersona: Persona;
  setActivePersona: (persona: Persona) => void;
  togglePersona: () => void;
}

export const personaMeta: Record<
  Persona,
  { label: string; accent: string; secondary: string; description: string }
> = {
  mani: {
    label: "Mani",
    accent: "#5ea2ff",
    secondary: "#b4d2ff",
    description: "Planning, structure, and high-focus systems.",
  },
  harti: {
    label: "Harti",
    accent: "#61c78c",
    secondary: "#b8ebca",
    description: "Growth, rhythm, and steady daily momentum.",
  },
};

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set) => ({
      activePersona: "mani",
      setActivePersona: (persona) => set({ activePersona: persona }),
      togglePersona: () =>
        set((state) => ({
          activePersona: state.activePersona === "mani" ? "harti" : "mani",
        })),
    }),
    { name: "solo-leveling-persona" },
  ),
);
