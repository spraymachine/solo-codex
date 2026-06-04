"use client";

import { useMemo, useState } from "react";
import {
  buildExternalCoursePrompt,
  parseCoursePlan,
  type ParseCoursePlanResult,
} from "@/lib/work/course-parser";
import { useWorkStore } from "@/lib/stores/work-store";

export function CourseImportPanel() {
  const saveParsedCourse = useWorkStore((state) => state.saveParsedCourse);
  const [courseUrl, setCourseUrl] = useState("");
  const [draft, setDraft] = useState("");
  const [parsed, setParsed] = useState<ParseCoursePlanResult | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy AI prompt");
  const [saving, setSaving] = useState(false);
  const prompt = useMemo(() => buildExternalCoursePrompt(courseUrl || undefined), [courseUrl]);

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopyLabel("Copied ✓");
    window.setTimeout(() => setCopyLabel("Copy AI prompt"), 1400);
  }

  function previewCourse() {
    setParsed(parseCoursePlan(draft));
  }

  async function saveCourse() {
    if (!parsed || parsed.errors.length > 0) return;
    setSaving(true);
    await saveParsedCourse(parsed);
    setDraft("");
    setParsed(null);
    setSaving(false);
  }

  const hasErrors = parsed && parsed.errors.length > 0;
  const readyToSave = parsed && parsed.errors.length === 0 && parsed.course;

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)]">
      {/* Panel header */}
      <div className="border-b border-[var(--surface-border)] px-5 py-4">
        <p className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
          Import
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-[0.04em] text-[var(--text-primary)]">
          Paste Course Plan
        </h2>
      </div>

      <div className="space-y-4 p-5">
        {/* URL field */}
        <div>
          <label className="mb-1.5 block font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Course URL
          </label>
          <input
            value={courseUrl}
            onChange={(e) => setCourseUrl(e.target.value)}
            placeholder="https://course.com"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>

        {/* Copy prompt button */}
        <button
          type="button"
          aria-label="Copy AI prompt"
          onClick={() => void copyPrompt()}
          className="flex w-full items-center justify-between rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel-strong)] px-4 py-3 transition-colors hover:border-[var(--accent-solid)] hover:bg-[var(--surface-soft)]"
        >
          <span className="font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-primary)]" aria-hidden="true">
            {copyLabel}
          </span>
          <span className="font-mono text-[0.625rem] text-[var(--accent-soft)]" aria-hidden="true">AI → paste below</span>
        </button>

        {/* Paste area */}
        <div>
          <label className="mb-1.5 block font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Course plan text
          </label>
          <textarea
            aria-label="Course plan text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={12}
            placeholder={"Course:\nURL:\nGoal:\nDeadline:\nSource:\nStatus: active\n\n## Chapter 1: Title\n..."}
            className="w-full rounded-lg px-3 py-3 font-mono text-xs leading-6 outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={previewCourse}
            disabled={!draft.trim()}
            className="h-9 flex-1 rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel-strong)] px-3 font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-primary)] transition-colors hover:border-[var(--accent-solid)] disabled:opacity-40"
          >
            Preview
          </button>
          <button
            type="button"
            disabled={!readyToSave || saving}
            onClick={() => void saveCourse()}
            className="h-9 flex-1 rounded-lg bg-[var(--accent-solid)] px-3 font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.12em] text-white transition-opacity disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save Course"}
          </button>
        </div>

        {/* Parse result */}
        {parsed ? (
          <div className={`rounded-lg border p-4 ${hasErrors ? "border-[var(--danger)]/30 bg-[var(--danger)]/5" : "border-[var(--accent-solid)]/20 bg-[var(--surface-soft)]"}`}>
            {hasErrors ? (
              <div className="space-y-1">
                {parsed.errors.map((err) => (
                  <p key={err} className="font-mono text-xs text-[var(--danger)]">{err}</p>
                ))}
              </div>
            ) : (
              <div>
                <p className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.08em] text-[var(--accent-soft)]">
                  <span aria-hidden="true">✓ </span>{parsed.course?.title}
                </p>
                <div className="mt-2 space-y-2">
                  {parsed.chapters.map((chapter) => (
                    <div key={chapter.title}>
                      <p className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        {chapter.title}
                      </p>
                      <div className="mt-1 ml-2 space-y-0.5">
                        {chapter.milestones.map((m) => (
                          <p key={m.title} className="font-mono text-[0.625rem] text-[var(--text-secondary)]">
                            <span aria-hidden="true">· </span>{m.title}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {parsed.warnings.length > 0 && (
                  <div className="mt-3 space-y-0.5">
                    {parsed.warnings.map((w) => (
                      <p key={w} className="font-mono text-[0.625rem] text-[var(--text-secondary)] opacity-60">{w}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
