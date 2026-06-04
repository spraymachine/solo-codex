"use client";

import type { ChapterPriority, CourseChapter, CourseMilestone, WorkCourse } from "@/lib/types";
import { useWorkStore } from "@/lib/stores/work-store";
import { CourseImportPanel } from "./course-import-panel";

const PRIORITY_STYLE: Record<ChapterPriority, string> = {
  high: "bg-[#FEF0CD] text-[#956400]",
  normal: "bg-[#EAEAEA] text-[#787774]",
  low: "bg-[#F0F0F0] text-[#ADADAD]",
};

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

export function CoursesSection() {
  const courses = useWorkStore((s) => s.courses);
  const chapters = useWorkStore((s) => s.chapters);
  const milestones = useWorkStore((s) => s.milestones);
  const toggleMilestone = useWorkStore((s) => s.toggleMilestone);

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
        {/* Course list */}
        <div className="space-y-5">
          {courses.length === 0 ? (
            <div className="grid min-h-[200px] place-items-center rounded-xl border border-dashed border-[#EAEAEA] bg-[#F9F9F8] p-6 text-center">
              <div>
                <p className="text-base font-semibold text-[#1f1b17]">No courses yet</p>
                <p className="mt-1.5 text-sm text-[#787774]">
                  Paste a course plan on the right to import your first checklist.
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

              return (
                <article
                  key={course.id}
                  className="overflow-hidden rounded-xl border border-[#EAEAEA] bg-white"
                >
                  {/* ── Course header ── */}
                  <div className="border-b border-[#EAEAEA] bg-[#FAFAF9] px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold leading-snug tracking-[-0.025em] text-[#1f1b17]">
                          {course.title}
                        </h2>
                        {course.goal ? (
                          <p className="mt-0.5 text-sm text-[#787774]">{course.goal}</p>
                        ) : null}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-[0.08em] ${
                          course.status === "active"
                            ? "bg-[#EDF3EC] text-[#346538]"
                            : course.status === "completed"
                              ? "bg-[#E1F3FE] text-[#1F6C9F]"
                              : "bg-[#EAEAEA] text-[#787774]"
                        }`}
                      >
                        {course.status}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#787774]">
                      {course.deadline ? (
                        <span>
                          Due <strong className="font-semibold text-[#1f1b17]">{course.deadline}</strong>
                        </span>
                      ) : null}
                      {course.source ? <span>{course.source}</span> : null}
                      {course.url ? (
                        <a
                          href={course.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[#1F6C9F] underline-offset-2 hover:underline"
                        >
                          Open course ↗
                        </a>
                      ) : null}
                    </div>

                    {/* Progress */}
                    <div className="mt-3">
                      <div className="mb-1.5 flex items-center justify-between text-[0.625rem] font-mono tabular-nums text-[#787774]">
                        <span>{doneMs} of {allMs.length} milestones done</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#EAEAEA]">
                        <div
                          className="h-full rounded-full bg-[#2F3437] transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Chapters + milestones ── */}
                  <div className="divide-y divide-[#EAEAEA]">
                    {courseChapters.map((chapter) => {
                      const ms = milestones
                        .filter((m) => m.chapterId === chapter.id)
                        .sort((a, b) => a.order - b.order);
                      const chapterDone = ms.filter((m) => m.completed).length;
                      const allDone = ms.length > 0 && chapterDone === ms.length;

                      return (
                        <div key={chapter.id}>
                          {/* Chapter row */}
                          <div className="flex flex-wrap items-center gap-2 bg-[#F7F6F3] px-5 py-2.5">
                            <p
                              className={`text-xs font-bold uppercase tracking-[0.06em] ${allDone ? "text-[#ADADAD]" : "text-[#1f1b17]"}`}
                            >
                              {chapter.title}
                            </p>
                            {chapter.priority !== "normal" ? (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.06em] ${PRIORITY_STYLE[chapter.priority]}`}
                              >
                                {chapter.priority}
                              </span>
                            ) : null}
                            {chapter.deadline ? (
                              <span className="text-[0.625rem] text-[#787774]">
                                due <strong className="font-semibold">{chapter.deadline}</strong>
                              </span>
                            ) : null}
                            {chapter.estimate ? (
                              <span className="rounded bg-[#EAEAEA] px-1.5 py-0.5 font-mono text-[0.625rem] text-[#787774]">
                                {chapter.estimate}
                              </span>
                            ) : null}
                            <span className="ml-auto font-mono text-[0.625rem] tabular-nums text-[#ADADAD]">
                              {chapterDone}/{ms.length}
                            </span>
                          </div>

                          {/* Milestone rows */}
                          {ms.length > 0 ? (
                            <div className="divide-y divide-[#F3F3F1]">
                              {ms.map((milestone) => (
                                <label
                                  key={milestone.id}
                                  className={`flex cursor-pointer items-start gap-3 px-5 py-3.5 transition-colors hover:bg-[#FAFAF9] ${milestone.completed ? "bg-[#FAFAF9]" : "bg-white"}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={milestone.completed}
                                    onChange={(e) =>
                                      void toggleMilestone(milestone.id, e.target.checked)
                                    }
                                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#2F3437]"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={`text-sm font-medium leading-snug ${
                                        milestone.completed
                                          ? "text-[#ADADAD] line-through decoration-[#ADADAD]"
                                          : "text-[#1f1b17]"
                                      }`}
                                    >
                                      {milestone.title}
                                    </p>
                                    {(milestone.deadline || milestone.estimate || milestone.notes || milestone.link) ? (
                                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                                        {milestone.deadline ? (
                                          <span className="text-xs text-[#787774]">
                                            Due <strong className="font-semibold text-[#1f1b17]">{milestone.deadline}</strong>
                                          </span>
                                        ) : null}
                                        {milestone.estimate ? (
                                          <span className="rounded bg-[#EAEAEA] px-1.5 py-0.5 font-mono text-[0.625rem] text-[#787774]">
                                            {milestone.estimate}
                                          </span>
                                        ) : null}
                                        {milestone.notes ? (
                                          <span className="text-xs text-[#ADADAD]">{milestone.notes}</span>
                                        ) : null}
                                        {milestone.link ? (
                                          <a
                                            href={milestone.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-xs font-semibold text-[#1F6C9F] underline-offset-2 hover:underline"
                                          >
                                            Open ↗
                                          </a>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                </label>
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

        {/* Import panel — sticky on xl */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          <CourseImportPanel />
        </div>
      </div>
    </section>
  );
}
