import type { Persona } from "@/lib/types";

const DEFAULT_PERSONAS: Persona[] = ["mani", "harti"];

const PERSONAS_BY_EMAIL: Record<string, Persona[]> = {
  "maniha@improve.com": ["mani", "harti"],
  "demo@improve.com": ["hunter", "rahul"],
};

export function getAllowedPersonas(email?: string | null): Persona[] {
  const allowed = email ? PERSONAS_BY_EMAIL[email.toLowerCase()] : undefined;
  return allowed ?? DEFAULT_PERSONAS;
}

export function canAccessPersona(persona: Persona, email?: string | null) {
  return getAllowedPersonas(email).includes(persona);
}
