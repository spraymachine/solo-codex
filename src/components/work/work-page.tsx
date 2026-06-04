"use client";

import { useEffect } from "react";
import { useWorkStore } from "@/lib/stores/work-store";
import { CoursesSection } from "./courses-section";
import { WorkListsSection } from "./work-lists-section";

export function WorkPage() {
  const loaded = useWorkStore((state) => state.loaded);
  const load = useWorkStore((state) => state.load);

  useEffect(() => {
    if (!loaded) {
      void load();
    }
  }, [load, loaded]);

  return (
    <main className="min-h-screen bg-[#F7F6F3] pb-24 text-[#1f1b17] md:pl-16 lg:pl-56">
      <header className="border-b border-[#EAEAEA] bg-white px-5 py-8 md:px-8">
        <p className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-[#787774]">
          Work · Mani-owned · Harti can edit
        </p>
        <h1 className="mt-2 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-[#1f1b17] md:text-5xl">
          Courses first. Freelance work underneath.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#787774]">
          A shared Work view for external course checklists, leads, clients, and client-attached
          projects.
        </p>
      </header>
      <CoursesSection />
      <WorkListsSection />
    </main>
  );
}
