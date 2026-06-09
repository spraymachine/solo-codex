"use client";

import type { CourseChapter, CourseMilestone, WorkCourse } from "@/lib/types";

function getDaysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${isoDate}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function fmtDeadline(isoDate: string) {
  if (!isoDate) return null;
  const days = getDaysUntil(isoDate);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, overdue: true };
  if (days === 0) return { label: "due today", overdue: false };
  if (days === 1) return { label: "due tmrw", overdue: false };
  return { label: `${days}d left`, overdue: false };
}

function getChapterProgress(chapterId: string, milestones: CourseMilestone[]) {
  const ms = milestones.filter((m) => m.chapterId === chapterId);
  if (ms.length === 0) return 0;
  return ms.filter((m) => m.completed).length / ms.length;
}

interface Props {
  courses: WorkCourse[];
  chapters: CourseChapter[];
  milestones: CourseMilestone[];
}

export function CourseArcCard({ courses, chapters, milestones }: Props) {
  const visible = courses.filter((c) => c.status !== "completed");

  if (visible.length === 0) return null;

  return (
    <section className="course-arc-card overflow-hidden rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 md:px-6">
        <div className="flex items-center gap-3">
          {/* Teal bracket icon */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
            <rect x="1" y="1" width="16" height="16" rx="3" stroke="#2dd4bf" strokeWidth="1.5" fill="none" />
            <path d="M6 5.5L3.5 9 6 12.5" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 5.5L14.5 9 12 12.5" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-[family-name:var(--font-display)] text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[#2dd4bf]">
            Courses
          </span>
        </div>
        <span className="font-mono text-[0.6rem] tabular-nums text-[#2dd4bf]/50">
          {visible.length} active
        </span>
      </div>

      {/* Course rows */}
      <div className="divide-y divide-[rgba(45,212,191,0.08)]">
        {visible.map((course) => {
          const courseChapters = chapters
            .filter((ch) => ch.courseId === course.id)
            .sort((a, b) => a.order - b.order);
          const total = courseChapters.length;
          const done = courseChapters.filter((ch) => getChapterProgress(ch.id, milestones) === 1).length;
          const chapterIds = new Set(courseChapters.map((ch) => ch.id));
          const courseMilestones = milestones.filter((m) => chapterIds.has(m.chapterId));
          const totalMs = courseMilestones.length;
          const doneMs = courseMilestones.filter((m) => m.completed).length;
          const pct = totalMs > 0 ? Math.round((doneMs / totalMs) * 100) : 0;
          const due = course.deadline ? fmtDeadline(course.deadline) : null;

          return (
            <div key={course.id} className="group px-5 py-4 md:px-6">
              <div className="flex items-start justify-between gap-3">
                {/* Title + URL */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-[family-name:var(--font-display)] text-sm font-semibold leading-snug text-[var(--text-primary)] tracking-[0.01em]">
                      {course.title}
                    </p>
                    {course.url && (
                      <a
                        href={course.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${course.title}`}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      >
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                          <path
                            d="M4.5 2H2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6.5M6.5 1H10m0 0v3.5M10 1 5 6"
                            stroke="#2dd4bf"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </a>
                    )}
                  </div>

                  {/* Chapter count + due pill row */}
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[0.6rem] tabular-nums text-[var(--text-secondary)]">
                      <span className="text-[#2dd4bf] font-semibold">{done}</span>
                      <span className="text-[var(--text-secondary)]/50"> / {total === 0 ? "—" : total}</span>
                      <span className="ml-1 text-[var(--text-secondary)]/40">ch</span>
                    </span>

                    {due && (
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.08em] ${
                          due.overdue
                            ? "bg-[rgba(239,68,68,0.12)] text-[#f87171]"
                            : "bg-[rgba(45,212,191,0.08)] text-[#2dd4bf]/70"
                        }`}
                      >
                        {due.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Pct badge */}
                {total > 0 && (
                  <div className="shrink-0 flex flex-col items-end gap-0.5">
                    <span className="font-mono text-[0.7rem] font-bold tabular-nums text-[#2dd4bf]">
                      {pct}%
                    </span>
                  </div>
                )}
              </div>

              {/* Segmented progress bar */}
              {total > 0 && (
                <div className="mt-3 flex gap-[6px]">
                  {courseChapters.map((ch) => {
                    const pct = getChapterProgress(ch.id, milestones);
                    const fillPct = Math.round(pct * 100);
                    return (
                      <div
                        key={ch.id}
                        title={ch.title}
                        className="h-[3px] flex-1 rounded-full transition-all duration-500"
                        style={{
                          background:
                            fillPct === 0
                              ? "rgba(45,212,191,0.12)"
                              : fillPct === 100
                                ? "#2dd4bf"
                                : `linear-gradient(to right, #2dd4bf ${fillPct}%, rgba(45,212,191,0.12) ${fillPct}%)`,
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {total === 0 && (
                <div className="mt-3 h-[3px] w-full rounded-full bg-[rgba(45,212,191,0.06)]" />
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .course-arc-card {
          border: 1px solid rgba(45, 212, 191, 0.15);
          background: linear-gradient(
            145deg,
            rgba(45, 212, 191, 0.04) 0%,
            var(--bg-panel) 50%
          );
          box-shadow: inset 0 1px 0 rgba(45, 212, 191, 0.08);
        }
        .course-arc-card > div:first-child {
          border-bottom: 1px solid rgba(45, 212, 191, 0.1);
          background: linear-gradient(
            to right,
            rgba(45, 212, 191, 0.06),
            transparent
          );
        }
      `}</style>
    </section>
  );
}
