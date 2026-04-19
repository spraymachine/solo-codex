"use client";

import { useEffect } from "react";
import { personaMeta, usePersonaStore } from "@/lib/stores/persona-store";
import { useSystemStore } from "@/lib/stores/system-store";

export function ThemeSync() {
  const activePersona = usePersonaStore((state) => state.activePersona);
  const themeMode = useSystemStore((state) => state.themeMode);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.persona = activePersona;
    root.dataset.theme = themeMode;
    root.style.setProperty("--accent-solid", personaMeta[activePersona].accent);
    root.style.setProperty("--accent-soft", personaMeta[activePersona].secondary);
    root.style.colorScheme = themeMode;
  }, [activePersona, themeMode]);

  return null;
}
