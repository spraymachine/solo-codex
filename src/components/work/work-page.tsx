"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useWorkStore } from "@/lib/stores/work-store";
import { CoursesSection } from "./courses-section";
import { WorkListsSection } from "./work-lists-section";

export function WorkPage() {
  const loaded = useWorkStore((state) => state.loaded);
  const load = useWorkStore((state) => state.load);

  const unsubscribe = useWorkStore((state) => state.unsubscribe);

  useEffect(() => {
    if (!loaded) void load();
    return () => { void unsubscribe(); };
  }, [load, loaded, unsubscribe]);

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      {/* Header */}
      <header className="section-dots relative overflow-hidden border-b border-[var(--surface-border)] bg-[var(--bg-panel)]">
        <div className="relative z-10 px-5 py-10 md:px-8 md:py-14">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-soft)]"
          >
            ← Dashboard
          </Link>
          <p className="mt-4 font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.28em] text-[var(--accent-soft)]">
            System · Work Module
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl font-bold uppercase tracking-[0.04em] text-[var(--text-primary)] md:text-7xl">
            Work
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--text-secondary)]">
            Course checklists, clients, and projects — shared across personas.
          </p>
        </div>
        {/* Decorative accent line */}
        <div className="absolute bottom-0 left-0 h-[2px] w-24 bg-[var(--accent-solid)]" />
      </header>

      <CoursesSection />
      <WorkListsSection />
    </div>
  );
}
