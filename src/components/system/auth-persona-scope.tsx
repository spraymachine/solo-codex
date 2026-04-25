"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-gate";
import { getAllowedPersonas } from "@/lib/persona-access";
import { usePersonaStore } from "@/lib/stores/persona-store";

export function AuthPersonaScope() {
  const { user } = useAuth();
  const activePersona = usePersonaStore((state) => state.activePersona);
  const setActivePersona = usePersonaStore((state) => state.setActivePersona);

  useEffect(() => {
    const allowedPersonas = getAllowedPersonas(user?.email);

    if (!allowedPersonas.includes(activePersona)) {
      setActivePersona(allowedPersonas[0]);
    }
  }, [activePersona, setActivePersona, user?.email]);

  return null;
}
