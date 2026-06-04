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
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy AI prompt"), 1200);
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

  return (
    <section className="rounded-xl border border-[#EAEAEA] bg-white p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-[#787774]">
            Strict import
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#1f1b17]">
            Paste course plan
          </h2>
        </div>
        <button
          type="button"
          onClick={() => void copyPrompt()}
          className="h-9 rounded-md bg-[#111111] px-3 text-xs font-semibold text-white"
        >
          {copyLabel}
        </button>
      </div>

      <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#787774]">
        Course URL for prompt
        <input
          value={courseUrl}
          onChange={(event) => setCourseUrl(event.target.value)}
          className="h-10 rounded-lg border border-[#EAEAEA] bg-[#F7F6F3] px-3 text-sm normal-case tracking-normal text-[#1f1b17] outline-none"
          placeholder="https://course.com"
        />
      </label>

      <label className="mt-4 grid gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#787774]">
        Course plan text
        <textarea
          aria-label="Course plan text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={10}
          className="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3 font-mono text-xs normal-case leading-6 tracking-normal text-[#1f1b17] outline-none"
          placeholder={"Course:\nURL:\nGoal:\nDeadline:\nSource:\nStatus: active"}
        />
      </label>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={previewCourse}
          className="h-9 rounded-md border border-[#EAEAEA] bg-white px-3 text-xs font-semibold text-[#1f1b17]"
        >
          Preview course
        </button>
        <button
          type="button"
          disabled={!parsed || parsed.errors.length > 0 || saving}
          onClick={() => void saveCourse()}
          className="h-9 rounded-md bg-[#111111] px-3 text-xs font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Saving" : "Save course"}
        </button>
      </div>

      {parsed ? (
        <div className="mt-5 rounded-lg border border-[#EAEAEA] bg-[#F7F6F3] p-4">
          {parsed.errors.length > 0 ? (
            <div className="space-y-1 text-sm text-[#9F2F2D]">
              {parsed.errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-[#1f1b17]">{parsed.course?.title}</p>
              <div className="mt-3 space-y-3">
                {parsed.chapters.map((chapter) => (
                  <div key={chapter.title} className="border-t border-[#EAEAEA] pt-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#787774]">
                      {chapter.title}
                    </p>
                    <div className="mt-2 space-y-1">
                      {chapter.milestones.map((milestone) => (
                        <p key={milestone.title} className="text-sm text-[#1f1b17]">
                          {milestone.title}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {parsed.warnings.length > 0 ? (
                <div className="mt-3 space-y-1 text-xs text-[#956400]">
                  {parsed.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
