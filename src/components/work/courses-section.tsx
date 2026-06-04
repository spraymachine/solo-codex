"use client";

import type { CourseChapter, CourseMilestone, WorkCourse } from "@/lib/types";
import { useWorkStore } from "@/lib/stores/work-store";
import { CourseImportPanel } from "./course-import-panel";

function getCourseProgress(
  course: WorkCourse,
  chapters: CourseChapter[],
  milestones: CourseMilestone[],
) {
  const chapterIds = new Set(
    chapters.filter((chapter) => chapter.courseId === course.id).map((chapter) => chapter.id),
  );
  const courseMilestones = milestones.filter((milestone) => chapterIds.has(milestone.chapterId));
  if (courseMilestones.length === 0) return 0;
  const done = courseMilestones.filter((milestone) => milestone.completed).length;
  return Math.round((done / courseMilestones.length) * 100);
}

export function CoursesSection() {
  const courses = useWorkStore((state) => state.courses);
  const chapters = useWorkStore((state) => state.chapters);
  const milestones = useWorkStore((state) => state.milestones);
  const toggleMilestone = useWorkStore((state) => state.toggleMilestone);

  return (
    <section className="border-b border-[#EAEAEA] px-5 py-8 md:px-8">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-[#787774]">
            01 · Courses
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1f1b17] md:text-4xl">
            Courses
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#787774]">
            Full-width course progress and strict external-AI import.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className="rounded-xl border border-[#EAEAEA] bg-white p-5">
          {courses.length === 0 ? (
            <div className="grid min-h-[260px] place-items-center rounded-lg border border-dashed border-[#EAEAEA] bg-[#F9F9F8] p-6 text-center">
              <div>
                <p className="text-base font-semibold text-[#1f1b17]">No courses yet</p>
                <p className="mt-2 text-sm text-[#787774]">
                  Paste a strict course plan to create your first checklist.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {courses.map((course) => {
                const courseChapters = chapters
                  .filter((chapter) => chapter.courseId === course.id)
                  .sort((a, b) => a.order - b.order);
                const progress = getCourseProgress(course, chapters, milestones);
                return (
                  <article
                    key={course.id}
                    className="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#1f1b17]">
                          {course.title}
                        </h2>
                        <p className="mt-1 text-sm text-[#787774]">{course.goal}</p>
                        {course.url ? (
                          <a
                            href={course.url}
                            className="mt-2 inline-block text-sm font-semibold text-[#1F6C9F]"
                          >
                            Open course
                          </a>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-[#EDF3EC] px-2 py-1 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[#346538]">
                        {course.status}
                      </span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded bg-[#EAEAEA]">
                      <div className="h-full bg-[#2F3437]" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-4 space-y-4">
                      {courseChapters.map((chapter) => {
                        const chapterMilestones = milestones
                          .filter((milestone) => milestone.chapterId === chapter.id)
                          .sort((a, b) => a.order - b.order);
                        return (
                          <div key={chapter.id} className="border-t border-[#EAEAEA] pt-4">
                            <p className="text-sm font-semibold text-[#1f1b17]">{chapter.title}</p>
                            <div className="mt-2 space-y-2">
                              {chapterMilestones.map((milestone) => (
                                <label
                                  key={milestone.id}
                                  className="grid grid-cols-[18px_minmax(0,1fr)_auto] gap-2 text-sm text-[#1f1b17]"
                                >
                                  <input
                                    type="checkbox"
                                    checked={milestone.completed}
                                    onChange={(event) =>
                                      void toggleMilestone(milestone.id, event.target.checked)
                                    }
                                  />
                                  <span>
                                    {milestone.title}
                                    <span className="block text-xs text-[#787774]">
                                      {milestone.deadline} · {milestone.estimate} ·{" "}
                                      {milestone.notes}
                                    </span>
                                  </span>
                                  {milestone.link ? (
                                    <a
                                      href={milestone.link}
                                      className="text-xs font-semibold text-[#1F6C9F]"
                                    >
                                      Open
                                    </a>
                                  ) : null}
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
        <CourseImportPanel />
      </div>
    </section>
  );
}
