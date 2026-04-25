"use client";

import { useAuth } from "@/components/auth/auth-gate";
import { getAllowedPersonas } from "@/lib/persona-access";
import { personaMeta, usePersonaStore } from "@/lib/stores/persona-store";

export function PersonaSwitcher() {
  const { user } = useAuth();
  const activePersona = usePersonaStore((state) => state.activePersona);
  const setActivePersona = usePersonaStore((state) => state.setActivePersona);
  const allowedPersonas = getAllowedPersonas(user?.email);

  return (
    <div className="inline-flex rounded-full border border-[var(--surface-border)] bg-[var(--bg-panel)] p-1">
      {allowedPersonas.map((persona) => {
        const active = persona === activePersona;
        return (
          <button
            key={persona}
            type="button"
            onClick={() => setActivePersona(persona)}
            className={`rounded-full px-3 py-2 text-xs font-medium transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${active ? "bg-[color:color-mix(in_srgb,var(--accent-solid)_16%,white)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
          >
            {personaMeta[persona].label}
          </button>
        );
      })}
    </div>
  );
}
