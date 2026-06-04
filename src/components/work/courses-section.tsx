"use client";

import { useState } from "react";
import type {
  ChapterPriority,
  CourseChapter,
  CourseMilestone,
  CourseStatus,
  WorkCourse,
} from "@/lib/types";
import { useWorkStore } from "@/lib/stores/work-store";
import { CourseImportPanel } from "./course-import-panel";

const PRIORITY_LABEL: Record<ChapterPriority, string> = {
  high: "HIGH",
  normal: "—",
  low: "LOW",
};

const PRIORITY_COLOR: Record<ChapterPriority, string> = {
  high: "text-[var(--accent-soft)] bg-[var(--surface-soft)]",
  normal: "text-[var(--text-secondary)] bg-transparent",
  low: "text-[var(--text-secondary)] opacity-50 bg-transparent",
};

const STATUS_COLOR: Record<CourseStatus, string> = {
  active: "text-[var(--accent-soft)] bg-[var(--surface-soft)] border-[var(--accent-solid)]/30",
  completed: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  paused: "text-[var(--text-secondary)] bg-[var(--surface-highlight)] border-[var(--surface-border)]",
  planned: "text-[var(--text-secondary)] bg-[var(--surface-highlight)] border-[var(--surface-border)]",
};

const COURSE_STATUSES: CourseStatus[] = ["planned", "active", "paused", "completed"];
const CHAPTER_PRIORITIES: ChapterPriority[] = ["low", "normal", "high"];

function getCourseProgress(
  course: WorkCourse,
  chapters: CourseChapter[],
  milestones: CourseMilestone[],
) {
  const ids = new Set(chapters.filter((c) => c.courseId === course.id).map((c) => c.id));
  const all = milestones.filter((m) => ids.has(m.chapterId));
  if (!all.length) return 0;
  return Math.round((all.filter((m) => m.completed).length / all.length) * 100);
}

// ── Inline edit forms ──────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block font-[family-name:var(--font-display)] text-[0.5rem] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md px-2.5 py-1.5 text-xs outline-none"
      />
    </div>
  );
}

function FormActions({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onSave}
        className="h-7 rounded-md bg-[var(--accent-solid)] px-3 font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.1em] text-white"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="h-7 rounded-md border border-[var(--surface-border)] px-3 font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]"
      >
        Cancel
      </button>
    </div>
  );
}

function CourseEditForm({
  course,
  onSave,
  onCancel,
}: {
  course: WorkCourse;
  onSave: (u: Partial<WorkCourse>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(course.title);
  const [goal, setGoal] = useState(course.goal);
  const [deadline, setDeadline] = useState(course.deadline);
  const [source, setSource] = useState(course.source);
  const [url, setUrl] = useState(course.url);
  const [status, setStatus] = useState<CourseStatus>(course.status);

  return (
    <div className="space-y-3 border-b border-[var(--surface-border)] bg-[var(--bg-panel-strong)] p-5">
      <Field label="Title" value={title} onChange={setTitle} placeholder="Course title" />
      <Field label="Goal" value={goal} onChange={setGoal} placeholder="What you'll learn" />
      <Field label="URL" value={url} onChange={setUrl} placeholder="https://course.com" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Deadline" value={deadline} onChange={setDeadline} placeholder="YYYY-MM-DD" />
        <Field label="Source" value={source} onChange={setSource} placeholder="Udemy" />
        <div>
          <label className="mb-1 block font-[family-name:var(--font-display)] text-[0.5rem] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CourseStatus)}
            className="w-full rounded-md px-2.5 py-1.5 text-xs outline-none"
          >
            {COURSE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <FormActions onSave={() => onSave({ title, goal, deadline, source, url, status })} onCancel={onCancel} />
    </div>
  );
}

function ChapterEditForm({
  chapter,
  onSave,
  onCancel,
}: {
  chapter: CourseChapter;
  onSave: (u: Partial<CourseChapter>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(chapter.title);
  const [deadline, setDeadline] = useState(chapter.deadline);
  const [estimate, setEstimate] = useState(chapter.estimate);
  const [priority, setPriority] = useState<ChapterPriority>(chapter.priority);

  return (
    <div className="flex flex-wrap items-end gap-3 bg-[var(--bg-panel-strong)] px-5 py-3">
      <Field label="Title" value={title} onChange={setTitle} placeholder="Chapter title" className="flex-1" />
      <Field label="Deadline" value={deadline} onChange={setDeadline} placeholder="YYYY-MM-DD" className="w-32" />
      <Field label="Estimate" value={estimate} onChange={setEstimate} placeholder="3h" className="w-20" />
      <div className="w-24">
        <label className="mb-1 block font-[family-name:var(--font-display)] text-[0.5rem] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          Priority
        </label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as ChapterPriority)}
          className="w-full rounded-md px-2.5 py-1.5 text-xs outline-none"
        >
          {CHAPTER_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <FormActions onSave={() => onSave({ title, deadline, estimate, priority })} onCancel={onCancel} />
    </div>
  );
}

function MilestoneEditForm({
  milestone,
  onSave,
  onCancel,
}: {
  milestone: CourseMilestone;
  onSave: (u: Partial<CourseMilestone>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(milestone.title);
  const [deadline, setDeadline] = useState(milestone.deadline);
  const [estimate, setEstimate] = useState(milestone.estimate);
  const [link, setLink] = useState(milestone.link);
  const [notes, setNotes] = useState(milestone.notes);

  return (
    <div className="space-y-2 bg-[var(--bg-panel-strong)] px-5 py-3">
      <Field label="Title" value={title} onChange={setTitle} placeholder="Milestone title" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="Deadline" value={deadline} onChange={setDeadline} placeholder="YYYY-MM-DD" />
        <Field label="Estimate" value={estimate} onChange={setEstimate} placeholder="45m" />
        <Field label="Link" value={link} onChange={setLink} placeholder="https://…" className="sm:col-span-2" />
      </div>
      <Field label="Notes" value={notes} onChange={setNotes} placeholder="What to focus on" />
      <FormActions onSave={() => onSave({ title, deadline, estimate, link, notes })} onCancel={onCancel} />
    </div>
  );
}

// ── Main section ───────────────────────────────────────────────────────────

export function CoursesSection() {
  const courses = useWorkStore((s) => s.courses);
  const chapters = useWorkStore((s) => s.chapters);
  const milestones = useWorkStore((s) => s.milestones);
  const toggleMilestone = useWorkStore((s) => s.toggleMilestone);
  const updateMilestone = useWorkStore((s) => s.updateMilestone);
  const deleteMilestone = useWorkStore((s) => s.deleteMilestone);
  const updateChapter = useWorkStore((s) => s.updateChapter);
  const deleteChapter = useWorkStore((s) => s.deleteChapter);
  const updateCourse = useWorkStore((s) => s.updateCourse);
  const deleteCourse = useWorkStore((s) => s.deleteCourse);

  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [editingChapter, setEditingChapter] = useState<string | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null);

  return (
    <section className="border-b border-[var(--surface-border)] px-5 py-8 md:px-8">
      {/* Section header */}
      <div className="mb-7 flex items-end justify-between">
        <div>
          <p className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.28em] text-[var(--text-secondary)]">
            01 / Courses
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-[0.03em] text-[var(--text-primary)] md:text-4xl">
            Courses
          </h2>
        </div>
        <span className="font-mono text-xs tabular-nums text-[var(--text-secondary)]">
          {courses.length} total
        </span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
        {/* Course list */}
        <div className="space-y-4">
          {courses.length === 0 ? (
            <div className="grid min-h-[180px] place-items-center rounded-xl border border-dashed border-[var(--surface-border)] bg-[var(--bg-panel)] p-6 text-center">
              <div>
                <p className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                  No courses yet
                </p>
                <p className="mt-1.5 text-xs text-[var(--text-secondary)] opacity-60">
                  Paste a course plan on the right to begin.
                </p>
              </div>
            </div>
          ) : (
            courses.map((course) => {
              const courseChapters = chapters
                .filter((c) => c.courseId === course.id)
                .sort((a, b) => a.order - b.order);
              const progress = getCourseProgress(course, chapters, milestones);
              const allMs = milestones.filter((m) =>
                courseChapters.some((c) => c.id === m.chapterId),
              );
              const doneMs = allMs.filter((m) => m.completed).length;
              const isActive = course.status === "active";

              return (
                <article
                  key={course.id}
                  className={`overflow-hidden rounded-xl border bg-[var(--bg-panel)] transition-colors ${isActive ? "border-[var(--accent-solid)]/25" : "border-[var(--surface-border)]"}`}
                >
                  {/* Active accent line */}
                  {isActive && (
                    <div className="h-[2px] w-full bg-gradient-to-r from-[var(--accent-solid)] to-transparent" />
                  )}

                  {/* Course header */}
                  {editingCourse === course.id ? (
                    <CourseEditForm
                      course={course}
                      onSave={async (u) => { await updateCourse(course.id, u); setEditingCourse(null); }}
                      onCancel={() => setEditingCourse(null)}
                    />
                  ) : (
                    <div className="border-b border-[var(--surface-border)] px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-[0.03em] text-[var(--text-primary)] leading-tight">
                            {course.title}
                          </h3>
                          {course.goal && (
                            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{course.goal}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className={`rounded-full border px-2.5 py-0.5 font-[family-name:var(--font-display)] text-[0.5rem] font-bold uppercase tracking-[0.14em] ${STATUS_COLOR[course.status]}`}>
                            {course.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingCourse(course.id)}
                            className="rounded p-1 text-[0.625rem] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-border)] hover:text-[var(--text-primary)]"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete "${course.title}" and all its data?`))
                                void deleteCourse(course.id);
                            }}
                            className="rounded p-1 text-[0.625rem] text-[var(--text-secondary)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                        {course.deadline && (
                          <span className="font-mono text-xs text-[var(--text-secondary)]">
                            due <span className="text-[var(--text-primary)]">{course.deadline}</span>
                          </span>
                        )}
                        {course.source && (
                          <span className="font-[family-name:var(--font-display)] text-[0.625rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                            {course.source}
                          </span>
                        )}
                        {course.url && (
                          <a
                            href={course.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.12em] text-[var(--accent-soft)] transition-opacity hover:opacity-70"
                          >
                            Open ↗
                          </a>
                        )}
                      </div>

                      {/* Progress */}
                      <div className="mt-3">
                        <div className="mb-1.5 flex items-center justify-between font-mono text-[0.625rem] tabular-nums text-[var(--text-secondary)]">
                          <span>{doneMs}/{allMs.length} milestones</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-[var(--surface-border)]">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${progress === 100 ? "progress-complete bg-emerald-400" : "bg-[var(--accent-solid)]"}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chapters */}
                  <div>
                    {courseChapters.map((chapter, ci) => {
                      const ms = milestones
                        .filter((m) => m.chapterId === chapter.id)
                        .sort((a, b) => a.order - b.order);
                      const chapterDone = ms.filter((m) => m.completed).length;
                      const allDone = ms.length > 0 && chapterDone === ms.length;

                      return (
                        <div
                          key={chapter.id}
                          className={ci > 0 ? "border-t border-[var(--surface-border)]" : ""}
                        >
                          {/* Chapter header */}
                          {editingChapter === chapter.id ? (
                            <ChapterEditForm
                              chapter={chapter}
                              onSave={async (u) => { await updateChapter(chapter.id, u); setEditingChapter(null); }}
                              onCancel={() => setEditingChapter(null)}
                            />
                          ) : (
                            <div className="group flex flex-wrap items-center gap-2 bg-[var(--bg-panel-strong)] px-5 py-2.5">
                              <span className="font-[family-name:var(--font-display)] text-[0.5rem] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                                Ch {String(ci + 1).padStart(2, "0")}
                              </span>
                              <p className={`font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.08em] ${allDone ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]"}`}>
                                {chapter.title}
                              </p>
                              {chapter.priority !== "normal" && (
                                <span className={`rounded px-1.5 py-0.5 font-[family-name:var(--font-display)] text-[0.5rem] font-bold uppercase tracking-[0.1em] ${PRIORITY_COLOR[chapter.priority]}`}>
                                  {PRIORITY_LABEL[chapter.priority]}
                                </span>
                              )}
                              {chapter.deadline && (
                                <span className="font-mono text-[0.625rem] tabular-nums text-[var(--text-secondary)]">
                                  {chapter.deadline}
                                </span>
                              )}
                              {chapter.estimate && (
                                <span className="font-mono text-[0.625rem] tabular-nums text-[var(--text-secondary)]">
                                  {chapter.estimate}
                                </span>
                              )}
                              <span className="ml-auto font-mono text-[0.625rem] tabular-nums text-[var(--text-secondary)]">
                                {chapterDone}/{ms.length}
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingChapter(chapter.id)}
                                className="rounded p-0.5 text-[0.625rem] text-[var(--text-secondary)] opacity-0 transition-all group-hover:opacity-100 hover:text-[var(--text-primary)]"
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Delete chapter "${chapter.title}"?`))
                                    void deleteChapter(chapter.id);
                                }}
                                className="rounded p-0.5 text-[0.625rem] text-[var(--text-secondary)] opacity-0 transition-all group-hover:opacity-100 hover:text-[var(--danger)]"
                              >
                                ✕
                              </button>
                            </div>
                          )}

                          {/* Milestones */}
                          {ms.map((milestone, mi) => (
                            <div
                              key={milestone.id}
                              className={mi > 0 ? "border-t border-[var(--surface-border)]/50" : ""}
                            >
                              {editingMilestone === milestone.id ? (
                                <MilestoneEditForm
                                  milestone={milestone}
                                  onSave={async (u) => { await updateMilestone(milestone.id, u); setEditingMilestone(null); }}
                                  onCancel={() => setEditingMilestone(null)}
                                />
                              ) : (
                                <div className={`group flex items-start gap-3 px-5 py-3 transition-colors hover:bg-[var(--surface-highlight)] ${milestone.completed ? "opacity-50" : ""}`}>
                                  <input
                                    type="checkbox"
                                    checked={milestone.completed}
                                    onChange={(e) => void toggleMilestone(milestone.id, e.target.checked)}
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer"
                                    style={{ accentColor: "var(--accent-solid)" }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-sm leading-snug text-[var(--text-primary)] ${milestone.completed ? "line-through" : ""}`}>
                                      {milestone.title}
                                    </p>
                                    {(milestone.deadline || milestone.estimate || milestone.notes || milestone.link) && (
                                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                        {milestone.deadline && (
                                          <span className="font-mono text-[0.625rem] tabular-nums text-[var(--text-secondary)]">
                                            {milestone.deadline}
                                          </span>
                                        )}
                                        {milestone.estimate && (
                                          <span className="font-mono text-[0.625rem] tabular-nums text-[var(--accent-soft)]/70">
                                            {milestone.estimate}
                                          </span>
                                        )}
                                        {milestone.notes && (
                                          <span className="text-[0.625rem] text-[var(--text-secondary)] opacity-70">
                                            {milestone.notes}
                                          </span>
                                        )}
                                        {milestone.link && (
                                          <a
                                            href={milestone.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="font-[family-name:var(--font-display)] text-[0.5rem] font-bold uppercase tracking-[0.12em] text-[var(--accent-soft)] hover:opacity-70"
                                          >
                                            Open ↗
                                          </a>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                    <button
                                      type="button"
                                      onClick={() => setEditingMilestone(milestone.id)}
                                      className="rounded p-1 text-[0.625rem] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                    >
                                      ✎
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void deleteMilestone(milestone.id)}
                                      className="rounded p-1 text-[0.625rem] text-[var(--text-secondary)] hover:text-[var(--danger)]"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Import panel — sticky on xl */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          <CourseImportPanel />
        </div>
      </div>
    </section>
  );
}
