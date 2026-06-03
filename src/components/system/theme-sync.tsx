"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/lib/stores/theme-store";
import { personaMeta, usePersonaStore } from "@/lib/stores/persona-store";

export function ThemeSync() {
  const activePersona = usePersonaStore((state) => state.activePersona);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.persona = activePersona;
    root.dataset.theme = theme;
    root.style.setProperty("--accent-solid", personaMeta[activePersona].accent);
    root.style.setProperty("--accent-soft", personaMeta[activePersona].secondary);
    root.style.colorScheme = theme;
  }, [activePersona, theme]);

  return null;
}
