"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useReadStore } from "@/lib/stores/read-store";
import type { ReadRecord } from "@/lib/types";

const MAX_SYNONYMS = 2;

const SOURCE_ICON: Record<string, string> = {
  book: "📖",
  scan: "📷",
  search: "🔍",
};

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

  const icon = SOURCE_ICON[record.sourceType] ?? "📄";

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8 text-[var(--text-primary)]">
    <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--bg-panel)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--surface-border)] bg-[var(--bg-panel)] px-5 py-4">
        <Link
          href="/read"
          className="shrink-0 rounded-full border border-[var(--surface-border)] px-3 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-solid)] hover:text-[var(--text-primary)]"
        >
          ← Read
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-tight">{record.word}</h1>
          {record.partOfSpeech && (
            <p className="text-xs italic text-[var(--text-secondary)]">{record.partOfSpeech}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full border border-[var(--surface-border)] px-3 py-1 text-xs text-[var(--text-secondary)]">
          {icon} {record.sourceType.toUpperCase()}
        </span>
      </div>

      {/* My Definition */}
      <div className="border-b border-[var(--surface-border)] px-5 py-5">
        <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--accent-soft)]">
          My Definition
        </p>
        <textarea
          value={myDefinition}
          onChange={(e) => setMyDefinition(e.target.value)}
          placeholder="Write your own take on this word…"
          rows={3}
          className="w-full resize-none rounded-lg border border-[var(--textarea-border)] bg-[var(--textarea-bg)] px-3 py-2.5 text-sm italic leading-relaxed text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] placeholder:not-italic focus:border-[var(--accent-solid)]"
        />
      </div>

      {/* Definition picker */}
      <div className="border-b border-[var(--surface-border)] px-5 py-5">
        <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--accent-soft)]">
          Definition — Pick One
        </p>
        {record.allDefinitions.length === 0 ? (
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-3">
            <p className="text-sm">{record.definition || "No definition saved."}</p>
            <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
              Re-save this word from Read to load all definitions.
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
                  onClick={() => setSelectedDefinition(def.definition)}
                  className={[
                    "w-full rounded-lg border px-4 py-3 text-left transition-colors",
                    isSelected
                      ? "border-[var(--accent-solid)] bg-[var(--bg-panel)]"
                      : "border-[var(--surface-border)] bg-[var(--bg-panel)] hover:border-[var(--accent-solid)]/40",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-[0.6rem] italic tracking-wider text-[var(--text-secondary)]">
                        {def.partOfSpeech?.toUpperCase()} · MEANING {i + 1}
                      </p>
                      <p className="text-sm leading-5">{def.definition}</p>
                      {def.example && (
                        <p className="mt-1 text-xs italic text-[var(--text-secondary)]">
                          "{def.example}"
                        </p>
                      )}
                    </div>
                    <span
                      className={[
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                        isSelected
                          ? "border-[var(--accent-solid)] bg-[var(--accent-solid)]"
                          : "border-[var(--surface-border)]",
                      ].join(" ")}
                    >
                      {isSelected && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Synonyms */}
      <div className="border-b border-[var(--surface-border)] px-5 py-5">
        <div className="mb-3 flex items-center gap-2">
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--accent-soft)]">
            Synonyms
          </p>
          <span className={[
            "text-[0.65rem] font-semibold",
            atLimit ? "text-[var(--accent-soft)]" : "text-[var(--text-secondary)]",
          ].join(" ")}>
            {selectedSynonyms.length} / {MAX_SYNONYMS}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {record.allSynonyms.map((syn) => {
            const on = selectedSynonyms.includes(syn);
            const locked = !on && atLimit;
            return (
              <button
                key={syn}
                type="button"
                disabled={locked}
                onClick={() => toggleSynonym(syn)}
                className={[
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  on
                    ? "border-[var(--accent-solid)] font-semibold text-[var(--accent-soft)]"
                    : "border-[var(--surface-border)] text-[var(--text-secondary)]",
                  locked ? "cursor-not-allowed opacity-30" : "hover:border-[var(--accent-solid)]/50",
                ].join(" ")}
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
                className="rounded-full border border-dashed border-[var(--accent-solid)] px-3 py-1 text-sm font-semibold text-[var(--accent-soft)]"
              >
                {syn} ×
              </button>
            ))}
        </div>

        <div className="flex gap-2">
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
            className="flex-1 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-solid)] disabled:cursor-not-allowed disabled:opacity-35"
          />
          <button
            type="button"
            disabled={atLimit || !customInput.trim()}
            onClick={addCustomSynonym}
            className="rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-solid)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-35"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-4">
        <span className="hidden text-xs text-[var(--text-secondary)] sm:inline">⌘↵ to save</span>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="ml-auto rounded-lg bg-[var(--accent-solid)] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-85 active:scale-[0.98] disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
    </div>
  );
}
