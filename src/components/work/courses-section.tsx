"use client";

import { useState } from "react";
import type { ChapterPriority, CourseChapter, CourseMilestone, CourseStatus, WorkCourse } from "@/lib/types";
import { useWorkStore } from "@/lib/stores/work-store";
import { CourseImportPanel } from "./course-import-panel";

const PRIORITY_STYLE: Record<ChapterPriority, string> = {
  high: "bg-[#FEF0CD] text-[#956400]",
  normal: "bg-[#EAEAEA] text-[#787774]",
  low: "bg-[#F0F0F0] text-[#ADADAD]",
};

const COURSE_STATUSES: CourseStatus[] = ["planned", "active", "paused", "completed"];
const CHAPTER_PRIORITIES: ChapterPriority[] = ["low", "normal", "high"];

function getCourseProgress(
  course: WorkCourse,
  chapters: CourseChapter[],
  milestones: CourseMilestone[],
) {
  const chapterIds = new Set(chapters.filter((c) => c.courseId === course.id).map((c) => c.id));
  const all = milestones.filter((m) => chapterIds.has(m.chapterId));
  if (all.length === 0) return 0;
  return Math.round((all.filter((m) => m.completed).length / all.length) * 100);
}

// ── Inline edit forms ─────────────────────────────────────────────────────────

function CourseEditForm({
  course,
  onSave,
  onCancel,
}: {
  course: WorkCourse;
  onSave: (updates: Partial<WorkCourse>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(course.title);
  const [goal, setGoal] = useState(course.goal);
  const [deadline, setDeadline] = useState(course.deadline);
  const [source, setSource] = useState(course.source);
  const [url, setUrl] = useState(course.url);
  const [status, setStatus] = useState<CourseStatus>(course.status);

  return (
    <div className="space-y-2 p-4">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-[#EAEAEA] bg-[#F7F6F3] px-3 py-2 text-sm text-[#1f1b17] outline-none" />
      <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Goal" className="w-full rounded-lg border border-[#EAEAEA] bg-[#F7F6F3] px-3 py-2 text-sm text-[#1f1b17] outline-none" />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" className="w-full rounded-lg border border-[#EAEAEA] bg-[#F7F6F3] px-3 py-2 text-sm text-[#1f1b17] outline-none" />
      <div className="flex gap-2">
        <input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="Deadline YYYY-MM-DD" className="flex-1 rounded-lg border border-[#EAEAEA] bg-[#F7F6F3] px-3 py-2 text-sm text-[#1f1b17] outline-none" />
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source" className="flex-1 rounded-lg border border-[#EAEAEA] bg-[#F7F6F3] px-3 py-2 text-sm text-[#1f1b17] outline-none" />
        <select value={status} onChange={(e) => setStatus(e.target.value as CourseStatus)} className="rounded-lg border border-[#EAEAEA] bg-[#F7F6F3] px-3 py-2 text-sm text-[#1f1b17] outline-none">
          {COURSE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => onSave({ title, goal, deadline, source, url, status })} className="h-8 rounded-md bg-[#111111] px-3 text-xs font-semibold text-white">Save</button>
        <button type="button" onClick={onCancel} className="h-8 rounded-md border border-[#EAEAEA] px-3 text-xs text-[#787774]">Cancel</button>
      </div>
    </div>
  );
}

function ChapterEditForm({
  chapter,
  onSave,
  onCancel,
}: {
  chapter: CourseChapter;
  onSave: (updates: Partial<CourseChapter>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(chapter.title);
  const [deadline, setDeadline] = useState(chapter.deadline);
  const [estimate, setEstimate] = useState(chapter.estimate);
  const [priority, setPriority] = useState<ChapterPriority>(chapter.priority);

  return (
    <div className="flex flex-wrap items-center gap-2 bg-[#F0EFE9] px-5 py-2.5">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chapter title" className="rounded border border-[#EAEAEA] bg-white px-2 py-1 text-xs text-[#1f1b17] outline-none" />
      <input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="YYYY-MM-DD" className="w-28 rounded border border-[#EAEAEA] bg-white px-2 py-1 text-xs text-[#1f1b17] outline-none" />
      <input value={estimate} onChange={(e) => setEstimate(e.target.value)} placeholder="e.g. 3h" className="w-16 rounded border border-[#EAEAEA] bg-white px-2 py-1 text-xs text-[#1f1b17] outline-none" />
      <select value={priority} onChange={(e) => setPriority(e.target.value as ChapterPriority)} className="rounded border border-[#EAEAEA] bg-white px-2 py-1 text-xs text-[#1f1b17] outline-none">
        {CHAPTER_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <button type="button" onClick={() => onSave({ title, deadline, estimate, priority })} className="h-6 rounded bg-[#111111] px-2 text-[0.625rem] font-semibold text-white">Save</button>
      <button type="button" onClick={onCancel} className="h-6 rounded border border-[#EAEAEA] bg-white px-2 text-[0.625rem] text-[#787774]">Cancel</button>
    </div>
  );
}

function MilestoneEditForm({
  milestone,
  onSave,
  onCancel,
}: {
  milestone: CourseMilestone;
  onSave: (updates: Partial<CourseMilestone>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(milestone.title);
  const [deadline, setDeadline] = useState(milestone.deadline);
  const [estimate, setEstimate] = useState(milestone.estimate);
  const [link, setLink] = useState(milestone.link);
  const [notes, setNotes] = useState(milestone.notes);

  return (
    <div className="space-y-2 bg-[#FAFAF9] px-5 py-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Milestone title" className="w-full rounded border border-[#EAEAEA] bg-white px-2 py-1.5 text-sm text-[#1f1b17] outline-none" />
      <div className="flex flex-wrap gap-2">
        <input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="Deadline YYYY-MM-DD" className="w-36 rounded border border-[#EAEAEA] bg-white px-2 py-1.5 text-xs text-[#1f1b17] outline-none" />
        <input value={estimate} onChange={(e) => setEstimate(e.target.value)} placeholder="Estimate e.g. 1h" className="w-24 rounded border border-[#EAEAEA] bg-white px-2 py-1.5 text-xs text-[#1f1b17] outline-none" />
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link URL" className="flex-1 rounded border border-[#EAEAEA] bg-white px-2 py-1.5 text-xs text-[#1f1b17] outline-none" />
      </div>
      <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="w-full rounded border border-[#EAEAEA] bg-white px-2 py-1.5 text-xs text-[#1f1b17] outline-none" />
      <div className="flex gap-2">
        <button type="button" onClick={() => onSave({ title, deadline, estimate, link, notes })} className="h-7 rounded bg-[#111111] px-3 text-xs font-semibold text-white">Save</button>
        <button type="button" onClick={onCancel} className="h-7 rounded border border-[#EAEAEA] px-3 text-xs text-[#787774]">Cancel</button>
      </div>
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

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
    <section className="border-b border-[#EAEAEA] px-5 py-8 md:px-8">
      <div className="mb-6">
        <p className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-[#787774]">
          01 · Courses
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1f1b17] md:text-4xl">
          Courses
        </h1>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
        <div className="space-y-5">
          {courses.length === 0 ? (
            <div className="grid min-h-[200px] place-items-center rounded-xl border border-dashed border-[#EAEAEA] bg-[#F9F9F8] p-6 text-center">
              <div>
                <p className="text-base font-semibold text-[#1f1b17]">No courses yet</p>
                <p className="mt-1.5 text-sm text-[#787774]">Paste a course plan on the right to import your first checklist.</p>
              </div>
            </div>
          ) : (
            courses.map((course) => {
              const courseChapters = chapters.filter((c) => c.courseId === course.id).sort((a, b) => a.order - b.order);
              const progress = getCourseProgress(course, chapters, milestones);
              const allMs = milestones.filter((m) => courseChapters.some((c) => c.id === m.chapterId));
              const doneMs = allMs.filter((m) => m.completed).length;

              return (
                <article key={course.id} className="overflow-hidden rounded-xl border border-[#EAEAEA] bg-white">

                  {/* Course header */}
                  {editingCourse === course.id ? (
                    <CourseEditForm
                      course={course}
                      onSave={async (updates) => { await updateCourse(course.id, updates); setEditingCourse(null); }}
                      onCancel={() => setEditingCourse(null)}
                    />
                  ) : (
                    <div className="border-b border-[#EAEAEA] bg-[#FAFAF9] px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold leading-snug tracking-[-0.025em] text-[#1f1b17]">{course.title}</h2>
                          {course.goal ? <p className="mt-0.5 text-sm text-[#787774]">{course.goal}</p> : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className={`rounded-full px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-[0.08em] ${course.status === "active" ? "bg-[#EDF3EC] text-[#346538]" : course.status === "completed" ? "bg-[#E1F3FE] text-[#1F6C9F]" : "bg-[#EAEAEA] text-[#787774]"}`}>
                            {course.status}
                          </span>
                          <button type="button" onClick={() => setEditingCourse(course.id)} title="Edit course" className="rounded p-1 text-xs text-[#ADADAD] hover:bg-[#EAEAEA] hover:text-[#1f1b17]">✎</button>
                          <button type="button" onClick={() => { if (window.confirm(`Delete "${course.title}" and all its chapters and milestones?`)) void deleteCourse(course.id); }} title="Delete course" className="rounded p-1 text-xs text-[#ADADAD] hover:bg-[#FEE2E2] hover:text-[#9F2F2D]">✕</button>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#787774]">
                        {course.deadline ? <span>Due <strong className="font-semibold text-[#1f1b17]">{course.deadline}</strong></span> : null}
                        {course.source ? <span>{course.source}</span> : null}
                        {course.url ? <a href={course.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1F6C9F] underline-offset-2 hover:underline">Open course ↗</a> : null}
                      </div>

                      <div className="mt-3">
                        <div className="mb-1.5 flex items-center justify-between font-mono text-[0.625rem] tabular-nums text-[#787774]">
                          <span>{doneMs} of {allMs.length} milestones done</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#EAEAEA]">
                          <div className="h-full rounded-full bg-[#2F3437] transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chapters */}
                  <div className="divide-y divide-[#EAEAEA]">
                    {courseChapters.map((chapter) => {
                      const ms = milestones.filter((m) => m.chapterId === chapter.id).sort((a, b) => a.order - b.order);
                      const chapterDone = ms.filter((m) => m.completed).length;
                      const allDone = ms.length > 0 && chapterDone === ms.length;

                      return (
                        <div key={chapter.id}>
                          {/* Chapter row */}
                          {editingChapter === chapter.id ? (
                            <ChapterEditForm
                              chapter={chapter}
                              onSave={async (updates) => { await updateChapter(chapter.id, updates); setEditingChapter(null); }}
                              onCancel={() => setEditingChapter(null)}
                            />
                          ) : (
                            <div className="group flex flex-wrap items-center gap-2 bg-[#F7F6F3] px-5 py-2.5">
                              <p className={`text-xs font-bold uppercase tracking-[0.06em] ${allDone ? "text-[#ADADAD]" : "text-[#1f1b17]"}`}>{chapter.title}</p>
                              {chapter.priority !== "normal" ? <span className={`rounded px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.06em] ${PRIORITY_STYLE[chapter.priority]}`}>{chapter.priority}</span> : null}
                              {chapter.deadline ? <span className="text-[0.625rem] text-[#787774]">due <strong className="font-semibold">{chapter.deadline}</strong></span> : null}
                              {chapter.estimate ? <span className="rounded bg-[#EAEAEA] px-1.5 py-0.5 font-mono text-[0.625rem] text-[#787774]">{chapter.estimate}</span> : null}
                              <span className="ml-auto font-mono text-[0.625rem] tabular-nums text-[#ADADAD]">{chapterDone}/{ms.length}</span>
                              <button type="button" onClick={() => setEditingChapter(chapter.id)} title="Edit chapter" className="rounded p-0.5 text-[0.625rem] text-[#ADADAD] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[#EAEAEA] hover:text-[#1f1b17]">✎</button>
                              <button type="button" onClick={() => { if (window.confirm(`Delete chapter "${chapter.title}" and all its milestones?`)) void deleteChapter(chapter.id); }} title="Delete chapter" className="rounded p-0.5 text-[0.625rem] text-[#ADADAD] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[#FEE2E2] hover:text-[#9F2F2D]">✕</button>
                            </div>
                          )}

                          {/* Milestone rows */}
                          {ms.length > 0 ? (
                            <div className="divide-y divide-[#F3F3F1]">
                              {ms.map((milestone) => (
                                <div key={milestone.id}>
                                  {editingMilestone === milestone.id ? (
                                    <MilestoneEditForm
                                      milestone={milestone}
                                      onSave={async (updates) => { await updateMilestone(milestone.id, updates); setEditingMilestone(null); }}
                                      onCancel={() => setEditingMilestone(null)}
                                    />
                                  ) : (
                                    <div className={`group flex items-start gap-3 px-5 py-3.5 ${milestone.completed ? "bg-[#FAFAF9]" : "bg-white"}`}>
                                      <input
                                        type="checkbox"
                                        checked={milestone.completed}
                                        onChange={(e) => void toggleMilestone(milestone.id, e.target.checked)}
                                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#2F3437]"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-medium leading-snug ${milestone.completed ? "text-[#ADADAD] line-through decoration-[#ADADAD]" : "text-[#1f1b17]"}`}>
                                          {milestone.title}
                                        </p>
                                        {(milestone.deadline || milestone.estimate || milestone.notes || milestone.link) ? (
                                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                                            {milestone.deadline ? <span className="text-xs text-[#787774]">Due <strong className="font-semibold text-[#1f1b17]">{milestone.deadline}</strong></span> : null}
                                            {milestone.estimate ? <span className="rounded bg-[#EAEAEA] px-1.5 py-0.5 font-mono text-[0.625rem] text-[#787774]">{milestone.estimate}</span> : null}
                                            {milestone.notes ? <span className="text-xs text-[#ADADAD]">{milestone.notes}</span> : null}
                                            {milestone.link ? <a href={milestone.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs font-semibold text-[#1F6C9F] underline-offset-2 hover:underline">Open ↗</a> : null}
                                          </div>
                                        ) : null}
                                      </div>
                                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button type="button" onClick={() => setEditingMilestone(milestone.id)} title="Edit milestone" className="rounded p-1 text-xs text-[#ADADAD] hover:bg-[#EAEAEA] hover:text-[#1f1b17]">✎</button>
                                        <button type="button" onClick={() => void deleteMilestone(milestone.id)} title="Delete milestone" className="rounded p-1 text-xs text-[#ADADAD] hover:bg-[#FEE2E2] hover:text-[#9F2F2D]">✕</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Import panel */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          <CourseImportPanel />
        </div>
      </div>
    </section>
  );
}
