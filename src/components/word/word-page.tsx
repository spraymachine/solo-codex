"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useReadStore } from "@/lib/stores/read-store";
import type { ReadRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_SYNONYMS = 2;

export function WordPage({ id }: { id: string }) {
  const router = useRouter();
  const activePersona = usePersonaStore((state) => state.activePersona);
  const records = useReadStore((state) => state.records);
  const loadRecords = useReadStore((state) => state.load);
  const updateRecord = useReadStore((state) => state.updateRecord);

  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [myDefinition, setMyDefinition] = useState("");
  const [selectedDefinition, setSelectedDefinition] = useState("");
  const [selectedSynonyms, setSelectedSynonyms] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const customInputRef = useRef<HTMLInputElement>(null);

  const record: ReadRecord | undefined = useMemo(
    () => records.find((r) => r.id === id),
    [records, id],
  );

  useEffect(() => {
    void loadRecords(activePersona).then(() => setReady(true));
  }, [activePersona, loadRecords]);

  useEffect(() => {
    if (!record) return;
    setMyDefinition(record.myDefinition);
    setSelectedDefinition(record.definition);
    setSelectedSynonyms(record.synonyms);
  }, [record]);

  useEffect(() => {
    if (ready && !record) router.replace("/read");
  }, [ready, record, router]);

  const atLimit = selectedSynonyms.length >= MAX_SYNONYMS;

  function toggleSynonym(syn: string) {
    setSelectedSynonyms((prev) => {
      if (prev.includes(syn)) return prev.filter((s) => s !== syn);
      if (prev.length >= MAX_SYNONYMS) return prev;
      return [...prev, syn];
    });
  }

  function addCustomSynonym() {
    const val = customInput.trim();
    if (!val || atLimit) return;
    setSelectedSynonyms((prev) => {
      if (prev.includes(val) || prev.length >= MAX_SYNONYMS) return prev;
      return [...prev, val];
    });
    setCustomInput("");
    customInputRef.current?.focus();
  }

  const handleSave = useCallback(async () => {
    if (!record) return;
    setSaving(true);
    try {
      await updateRecord(record.id, {
        myDefinition,
        definition: selectedDefinition,
        synonyms: selectedSynonyms,
      });
      router.push("/read");
    } finally {
      setSaving(false);
    }
  }, [record, myDefinition, selectedDefinition, selectedSynonyms, updateRecord, router]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  if (!ready || !record) return null;

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      {/* Header */}
      <header className="section-dots relative overflow-hidden border-b border-[var(--surface-border)] bg-[var(--bg-panel)]">
        <div className="relative z-10 px-5 py-5 md:px-8 md:py-6">
          <div className="flex items-center justify-between">
            <Link
              href="/read"
              className="inline-flex items-center gap-1.5 font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-soft)]"
            >
              ← Read
            </Link>
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              {record.sourceType}
            </span>
          </div>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-[0.04em] text-[var(--text-primary)] md:text-5xl">
            {record.word}
          </h1>
          {record.partOfSpeech && (
            <p className="mt-1 font-mono text-xs italic text-[var(--text-secondary)]">
              {record.partOfSpeech}
            </p>
          )}
        </div>
        <div className="absolute bottom-0 left-0 h-[2px] w-24 bg-[var(--accent-solid)]" />
      </header>

      <div className="mx-auto max-w-2xl space-y-8 px-5 py-8 md:px-8">

        {/* My Definition */}
        <section>
          <p className="mb-2 font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.2em] text-[var(--accent-soft)]">
            My Definition
          </p>
          <textarea
            value={myDefinition}
            onChange={(e) => setMyDefinition(e.target.value)}
            placeholder="Write your own take on this word…"
            rows={3}
            className="w-full resize-none rounded-xl border border-[color-mix(in_srgb,var(--accent-solid)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent-solid)_6%,var(--bg-panel))] px-4 py-3 text-sm italic leading-6 text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] placeholder:opacity-60 focus:border-[var(--accent-solid)]"
          />
          <p className="mt-1.5 text-[0.65rem] text-[var(--text-secondary)] opacity-60">
            Displayed above the actual definition in your ledger.
          </p>
        </section>

        {/* Definition picker */}
        <section>
          <p className="mb-2 font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.2em] text-[var(--accent-soft)]">
            Definition — pick one
          </p>
          {record.allDefinitions.length === 0 ? (
            <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-3">
              <p className="text-sm text-[var(--text-primary)]">{record.definition || "No definition saved."}</p>
              <p className="mt-2 text-[0.65rem] text-[var(--text-secondary)] opacity-60">
                Re-save this word from the Read page to load all available definitions.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {record.allDefinitions.map((def, i) => {
                const isSelected = selectedDefinition === def.definition;
                return (
                  <button
                    key={i}
                    type="button"
                    data-selected={isSelected}
                    onClick={() => setSelectedDefinition(def.definition)}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-left transition-all duration-150",
                      isSelected
                        ? "border-[var(--accent-solid)] bg-[color-mix(in_srgb,var(--accent-solid)_10%,var(--bg-panel))]"
                        : "border-[var(--surface-border)] bg-[var(--bg-panel)] hover:border-[var(--accent-solid)]/40",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 rounded-full border-[1.5px] transition-all",
                          isSelected
                            ? "border-[var(--accent-solid)] bg-[var(--accent-solid)] shadow-[inset_0_0_0_3px_var(--accent-solid),inset_0_0_0_5px_white]"
                            : "border-[var(--surface-border)] bg-[var(--bg-panel)]",
                        )}
                      />
                      <div className="min-w-0">
                        {def.partOfSpeech && (
                          <p className="mb-1 font-mono text-[0.6rem] italic uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                            {def.partOfSpeech}
                          </p>
                        )}
                        <p className="text-sm leading-5 text-[var(--text-primary)]">{def.definition}</p>
                        {def.example && (
                          <p className="mt-1 text-xs italic text-[var(--text-secondary)]">"{def.example}"</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Synonym picker */}
        <section>
          <div className="mb-2 flex items-baseline gap-2">
            <p className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.2em] text-[var(--accent-soft)]">
              Synonyms
            </p>
            <span
              className={cn(
                "font-mono text-[0.625rem] tabular-nums",
                atLimit ? "text-[var(--accent-soft)]" : "text-[var(--text-secondary)]",
              )}
            >
              {selectedSynonyms.length} / {MAX_SYNONYMS}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {record.allSynonyms.map((syn) => {
              const on = selectedSynonyms.includes(syn);
              const locked = !on && atLimit;
              return (
                <button
                  key={syn}
                  type="button"
                  disabled={locked}
                  onClick={() => toggleSynonym(syn)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-all duration-150",
                    on
                      ? "border-[var(--accent-solid)] bg-[color-mix(in_srgb,var(--accent-solid)_15%,var(--bg-panel))] font-semibold text-[var(--text-primary)]"
                      : "border-[var(--surface-border)] bg-[var(--bg-panel)] text-[var(--text-secondary)]",
                    locked && "cursor-not-allowed opacity-30",
                  )}
                >
                  {syn}
                </button>
              );
            })}
            {selectedSynonyms
              .filter((s) => !record.allSynonyms.includes(s))
              .map((syn) => (
                <button
                  key={syn}
                  type="button"
                  onClick={() => toggleSynonym(syn)}
                  className="rounded-full border border-dashed border-[var(--accent-solid)] bg-[color-mix(in_srgb,var(--accent-solid)_15%,var(--bg-panel))] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]"
                >
                  {syn} ×
                </button>
              ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              ref={customInputRef}
              type="text"
              value={customInput}
              disabled={atLimit}
              placeholder="Add your own…"
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addCustomSynonym(); }
              }}
              className="flex-1 rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-solid)] disabled:cursor-not-allowed disabled:opacity-35"
            />
            <button
              type="button"
              disabled={atLimit || !customInput.trim()}
              onClick={addCustomSynonym}
              className="rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-solid)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              + Add
            </button>
          </div>
        </section>

      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 border-t border-[var(--surface-border)] bg-[var(--bg-panel)] px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <span className="hidden font-mono text-[0.625rem] text-[var(--text-secondary)] sm:inline">
            ⌘↵ to save
          </span>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="ml-auto inline-flex items-center rounded-lg bg-[var(--accent-solid)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-85 active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
