"use client";

import { useMemo, useState } from "react";
import type { CourseStatus } from "@/lib/types";
import {
  buildExternalCoursePrompt,
  parseCoursePlan,
  type ParseCoursePlanResult,
} from "@/lib/work/course-parser";
import { useWorkStore } from "@/lib/stores/work-store";

export function CourseImportPanel() {
  const saveParsedCourse = useWorkStore((state) => state.saveParsedCourse);
  const createCourse = useWorkStore((state) => state.createCourse);
  const [tab, setTab] = useState<"quick" | "paste">("quick");
  const [qaTitle, setQaTitle] = useState("");
  const [qaUrl, setQaUrl] = useState("");
  const [qaDeadline, setQaDeadline] = useState("");
  const [qaStatus, setQaStatus] = useState<CourseStatus>("planned");
  const [qaAdding, setQaAdding] = useState(false);
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

  async function handleQuickAdd() {
    if (!qaTitle.trim()) return;
    setQaAdding(true);
    await createCourse({ title: qaTitle.trim(), url: qaUrl.trim(), deadline: qaDeadline.trim(), status: qaStatus });
    setQaTitle("");
    setQaUrl("");
    setQaDeadline("");
    setQaStatus("planned");
    setQaAdding(false);
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
      {/* Panel header + tabs */}
      <div className="border-b border-[var(--surface-border)] px-5 py-4">
        <p className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
          Courses
        </p>
        <div className="mt-2 flex gap-1">
          {(["quick", "paste"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`h-7 rounded-md px-3 font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.1em] transition-colors ${
                tab === t
                  ? "bg-[var(--accent-solid)] text-white"
                  : "border border-[var(--surface-border)] text-[var(--text-secondary)] hover:border-[var(--accent-solid)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t === "quick" ? "Quick Add" : "Paste Plan"}
            </button>
          ))}
        </div>
      </div>

      {tab === "quick" ? (
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Title <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              value={qaTitle}
              onChange={(e) => setQaTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleQuickAdd()}
              placeholder="Course title"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              URL
            </label>
            <input
              value={qaUrl}
              onChange={(e) => setQaUrl(e.target.value)}
              placeholder="https://course.com"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Deadline
              </label>
              <input
                value={qaDeadline}
                onChange={(e) => setQaDeadline(e.target.value)}
                placeholder="YYYY-MM-DD"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Status
              </label>
              <select
                value={qaStatus}
                onChange={(e) => setQaStatus(e.target.value as CourseStatus)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              >
                {(["planned", "active", "paused", "completed"] as CourseStatus[]).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            disabled={!qaTitle.trim() || qaAdding}
            onClick={() => void handleQuickAdd()}
            className="h-9 w-full rounded-lg bg-[var(--accent-solid)] px-3 font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.12em] text-white transition-opacity disabled:opacity-40"
          >
            {qaAdding ? "Adding…" : "Add Course"}
          </button>
        </div>
      ) : (
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
      )}
    </section>
  );
}
