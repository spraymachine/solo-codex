import type { Persona } from "@/lib/types";

const DEFAULT_PERSONAS: Persona[] = ["mani", "harti"];

export function getAllowedPersonas(email?: string | null): Persona[] {
  void email;
  return DEFAULT_PERSONAS;
}

export function canAccessPersona(persona: Persona, email?: string | null) {
  return getAllowedPersonas(email).includes(persona);
}
