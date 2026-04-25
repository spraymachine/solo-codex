import { MOULI_EMAIL, MOULI_PERSONA } from "@/lib/personas/mouli";
import type { Persona } from "@/lib/types";

const DEFAULT_PERSONAS: Persona[] = ["mani", "harti"];

export function getAllowedPersonas(email?: string | null): Persona[] {
  if (email?.toLowerCase() === MOULI_EMAIL) {
    return [MOULI_PERSONA];
  }

  return DEFAULT_PERSONAS;
}

export function canAccessPersona(persona: Persona, email?: string | null) {
  return getAllowedPersonas(email).includes(persona);
}
