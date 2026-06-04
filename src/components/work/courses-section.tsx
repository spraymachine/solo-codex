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
  const chapterIds = new Set(
    chapters.filter((c) => c.courseId === course.id).map((c) => c.id),
  );
  const all = milestones.filter((m) => chapterIds.has(m.chapterId));
  if (all.length === 0) return 0;
  return Math.round((all.filter((m) => m.completed).length / all.length) * 100);
}

function MetaChip({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-[#F0F0EE] px-2 py-0.5 font-mono text-[0.625rem] tabular-nums text-[#787774]">
      {label}
    </span>
  );
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
        <div className="space-y-4">
          {courses.length === 0 ? (
            <div className="grid min-h-[220px] place-items-center rounded-xl border border-dashed border-[#EAEAEA] bg-[#F9F9F8] p-6 text-center">
              <div>
                <p className="text-base font-semibold text-[#1f1b17]">No courses yet</p>
                <p className="mt-1.5 text-sm text-[#787774]">
                  Paste a strict course plan on the right to import your first checklist.
                </p>
              </div>
            </div>
          ) : (
            courses.map((course) => {
              const courseChapters = chapters
                .filter((c) => c.courseId === course.id)
                .sort((a, b) => a.order - b.order);
              const progress = getCourseProgress(course, chapters, milestones);
              const totalMs = milestones.filter((m) =>
                courseChapters.some((c) => c.id === m.chapterId),
              ).length;
              const doneMs = milestones.filter(
                (m) => courseChapters.some((c) => c.id === m.chapterId) && m.completed,
              ).length;

              return (
                <article
                  key={course.id}
                  className="overflow-hidden rounded-xl border border-[#EAEAEA] bg-white"
                >
                  {/* Course header */}
                  <div className="border-b border-[#EAEAEA] px-5 py-4">
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

                    {/* Course meta row */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {course.deadline ? <MetaChip label={`due ${course.deadline}`} /> : null}
                      {course.source ? <MetaChip label={course.source} /> : null}
                      {course.url ? (
                        <a
                          href={course.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-[#1F6C9F] underline-offset-2 hover:underline"
                        >
                          Open course ↗
                        </a>
                      ) : null}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-mono text-[0.625rem] tabular-nums text-[#787774]">
                          {doneMs}/{totalMs} milestones
                        </span>
                        <span className="font-mono text-[0.625rem] tabular-nums text-[#787774]">
                          {progress}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#EAEAEA]">
                        <div
                          className="h-full rounded-full bg-[#2F3437] transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Chapters */}
                  <div className="divide-y divide-[#EAEAEA]">
                    {courseChapters.map((chapter) => {
                      const chapterMilestones = milestones
                        .filter((m) => m.chapterId === chapter.id)
                        .sort((a, b) => a.order - b.order);
                      const chapterDone = chapterMilestones.filter((m) => m.completed).length;

                      return (
                        <div key={chapter.id} className="px-5 py-4">
                          {/* Chapter header */}
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="mr-1 text-sm font-semibold text-[#1f1b17]">
                              {chapter.title}
                            </p>
                            {chapter.priority !== "normal" ? (
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.06em] ${PRIORITY_STYLE[chapter.priority]}`}
                              >
                                {chapter.priority}
                              </span>
                            ) : null}
                            {chapter.deadline ? (
                              <MetaChip label={`due ${chapter.deadline}`} />
                            ) : null}
                            {chapter.estimate ? (
                              <MetaChip label={chapter.estimate} />
                            ) : null}
                            <span className="ml-auto font-mono text-[0.625rem] tabular-nums text-[#ADADAD]">
                              {chapterDone}/{chapterMilestones.length}
                            </span>
                          </div>

                          {/* Milestones */}
                          {chapterMilestones.length > 0 ? (
                            <div className="mt-3 space-y-2.5">
                              {chapterMilestones.map((milestone) => (
                                <div
                                  key={milestone.id}
                                  className="flex items-start gap-2.5"
                                >
                                  <input
                                    type="checkbox"
                                    checked={milestone.completed}
                                    onChange={(e) =>
                                      void toggleMilestone(milestone.id, e.target.checked)
                                    }
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#2F3437]"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={`text-sm leading-snug ${milestone.completed ? "text-[#ADADAD] line-through" : "text-[#1f1b17]"}`}
                                    >
                                      {milestone.title}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                      {milestone.deadline ? (
                                        <MetaChip label={`due ${milestone.deadline}`} />
                                      ) : null}
                                      {milestone.estimate ? (
                                        <MetaChip label={milestone.estimate} />
                                      ) : null}
                                      {milestone.notes ? (
                                        <span className="text-[0.625rem] text-[#ADADAD]">
                                          {milestone.notes}
                                        </span>
                                      ) : null}
                                      {milestone.link ? (
                                        <a
                                          href={milestone.link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[0.625rem] font-semibold text-[#1F6C9F] underline-offset-2 hover:underline"
                                        >
                                          Open ↗
                                        </a>
                                      ) : null}
                                    </div>
                                  </div>
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
