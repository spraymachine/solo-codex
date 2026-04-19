"use client";

import { personaMeta, usePersonaStore } from "@/lib/stores/persona-store";
import type { Persona } from "@/lib/types";

export function PersonaSwitcher() {
  const activePersona = usePersonaStore((state) => state.activePersona);
  const setActivePersona = usePersonaStore((state) => state.setActivePersona);

  return (
    <div className="inline-flex rounded-full border border-[var(--surface-border)] bg-[var(--bg-panel)] p-1">
      {(Object.keys(personaMeta) as Persona[]).map((persona) => {
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
