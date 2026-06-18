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
        <div className="relative z-10 px-5 py-5 md:px-8 md:py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-soft)]"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-[0.04em] text-[var(--text-primary)] md:text-5xl">
            Work
          </h1>
        </div>
        {/* Decorative accent line */}
        <div className="absolute bottom-0 left-0 h-[2px] w-24 bg-[var(--accent-solid)]" />
      </header>

      <CoursesSection />
      <WorkListsSection />
    </div>
  );
}
