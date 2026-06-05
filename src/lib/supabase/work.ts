import { getSupabaseBrowserClient } from "./client";
import { isSupabaseConfigured } from "./config";
import type {
  CourseChapter,
  CourseMilestone,
  WorkContact,
  WorkCourse,
  WorkProject,
} from "@/lib/types";
import { nowISO } from "@/lib/utils";

function sb() {
  const client = getSupabaseBrowserClient();
  if (!client || !isSupabaseConfigured()) return null;
  return client;
}

export async function getWorkUserId(): Promise<string | null> {
  const client = sb();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data?.user?.id ?? null;
}

// ── Row mappers ───────────────────────────────────────────────────────────────

function rowToCourse(r: any): WorkCourse {
  return {
    id: r.id,
    title: r.title,
    url: r.url ?? "",
    goal: r.goal ?? "",
    deadline: r.deadline ?? "",
    source: r.source ?? "",
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToChapter(r: any): CourseChapter {
  return {
    id: r.id,
    courseId: r.course_id,
    title: r.title,
    deadline: r.deadline ?? "",
    estimate: r.estimate ?? "",
    order: r.order,
  };
}

function rowToMilestone(r: any): CourseMilestone {
  return {
    id: r.id,
    chapterId: r.chapter_id,
    title: r.title,
    deadline: r.deadline ?? "",
    estimate: r.estimate ?? "",
    link: r.link ?? "",
    notes: r.notes ?? "",
    completed: r.completed ?? false,
    order: r.order,
  };
}

function rowToContact(r: any): WorkContact {
  return {
    id: r.id,
    name: r.name,
    status: r.status,
    phone: r.phone ?? "",
    phoneLabel: r.phone_label ?? "",
    phone2: r.phone2 ?? "",
    phone2Label: r.phone2_label ?? "",
    email: r.email ?? "",
    notes: r.notes ?? "",
    archivedAt: r.archived_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToProject(r: any): WorkProject {
  return {
    id: r.id,
    contactId: r.contact_id,
    title: r.title,
    status: r.status,
    deadline: r.deadline ?? "",
    notes: r.notes ?? "",
    progress: r.progress ?? 0,
    archivedAt: r.archived_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchAllWork(userId: string) {
  const client = sb();
  if (!client) return null;

  const [courses, chapters, milestones, contacts, projects] = await Promise.all([
    client.from("work_courses").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("work_chapters").select("*").eq("user_id", userId).order("order", { ascending: true }),
    client.from("work_milestones").select("*").eq("user_id", userId).order("order", { ascending: true }),
    client.from("work_contacts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("work_projects").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);

  if (courses.error || chapters.error || milestones.error || contacts.error || projects.error) return null;

  return {
    courses: (courses.data ?? []).map(rowToCourse),
    chapters: (chapters.data ?? []).map(rowToChapter),
    milestones: (milestones.data ?? []).map(rowToMilestone),
    contacts: (contacts.data ?? []).map(rowToContact),
    projects: (projects.data ?? []).map(rowToProject),
  };
}

// ── Courses ───────────────────────────────────────────────────────────────────

export async function sbCreateCourse(userId: string, course: WorkCourse) {
  const client = sb();
  if (!client) return;
  await client.from("work_courses").upsert({
    id: course.id,
    user_id: userId,
    title: course.title,
    url: course.url,
    goal: course.goal,
    deadline: course.deadline,
    source: course.source,
    status: course.status,
    created_at: course.createdAt,
    updated_at: course.updatedAt,
  });
}

export async function sbUpdateCourse(userId: string, courseId: string, updates: Partial<WorkCourse>) {
  const client = sb();
  if (!client) return;
  await client.from("work_courses").update({
    title: updates.title,
    url: updates.url,
    goal: updates.goal,
    deadline: updates.deadline,
    source: updates.source,
    status: updates.status,
    updated_at: updates.updatedAt ?? nowISO(),
  }).eq("user_id", userId).eq("id", courseId);
}

export async function sbDeleteCourse(userId: string, courseId: string) {
  const client = sb();
  if (!client) return;
  await client.from("work_courses").delete().eq("user_id", userId).eq("id", courseId);
}

// ── Chapters ──────────────────────────────────────────────────────────────────

export async function sbCreateChapter(userId: string, chapter: CourseChapter) {
  const client = sb();
  if (!client) return;
  const now = nowISO();
  await client.from("work_chapters").upsert({
    id: chapter.id,
    user_id: userId,
    course_id: chapter.courseId,
    title: chapter.title,
    deadline: chapter.deadline,
    estimate: chapter.estimate,
    order: chapter.order,
    created_at: now,
    updated_at: now,
  });
}

export async function sbUpdateChapter(userId: string, chapterId: string, updates: Partial<CourseChapter>) {
  const client = sb();
  if (!client) return;
  await client.from("work_chapters").update({
    title: updates.title,
    deadline: updates.deadline,
    estimate: updates.estimate,
    updated_at: nowISO(),
  }).eq("user_id", userId).eq("id", chapterId);
}

export async function sbDeleteChapter(userId: string, chapterId: string) {
  const client = sb();
  if (!client) return;
  await client.from("work_chapters").delete().eq("user_id", userId).eq("id", chapterId);
}

// ── Milestones ────────────────────────────────────────────────────────────────

export async function sbCreateMilestone(userId: string, milestone: CourseMilestone) {
  const client = sb();
  if (!client) return;
  const now = nowISO();
  await client.from("work_milestones").upsert({
    id: milestone.id,
    user_id: userId,
    chapter_id: milestone.chapterId,
    title: milestone.title,
    deadline: milestone.deadline,
    estimate: milestone.estimate,
    link: milestone.link,
    notes: milestone.notes,
    completed: milestone.completed,
    order: milestone.order,
    created_at: now,
    updated_at: now,
  });
}

export async function sbUpdateMilestone(userId: string, milestoneId: string, updates: Partial<CourseMilestone>) {
  const client = sb();
  if (!client) return;
  await client.from("work_milestones").update({
    title: updates.title,
    deadline: updates.deadline,
    estimate: updates.estimate,
    link: updates.link,
    notes: updates.notes,
    completed: updates.completed,
    updated_at: nowISO(),
  }).eq("user_id", userId).eq("id", milestoneId);
}

export async function sbDeleteMilestone(userId: string, milestoneId: string) {
  const client = sb();
  if (!client) return;
  await client.from("work_milestones").delete().eq("user_id", userId).eq("id", milestoneId);
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export async function sbCreateContact(userId: string, contact: WorkContact) {
  const client = sb();
  if (!client) return;
  await client.from("work_contacts").upsert({
    id: contact.id,
    user_id: userId,
    name: contact.name,
    status: contact.status,
    phone: contact.phone,
    phone_label: contact.phoneLabel,
    phone2: contact.phone2,
    phone2_label: contact.phone2Label,
    email: contact.email,
    notes: contact.notes,
    archived_at: contact.archivedAt,
    created_at: contact.createdAt,
    updated_at: contact.updatedAt,
  });
}

export async function sbUpdateContact(userId: string, contactId: string, updates: Partial<WorkContact>) {
  const client = sb();
  if (!client) return;
  await client.from("work_contacts").update({
    name: updates.name,
    status: updates.status,
    phone: updates.phone,
    phone_label: updates.phoneLabel,
    phone2: updates.phone2,
    phone2_label: updates.phone2Label,
    email: updates.email,
    notes: updates.notes,
    archived_at: updates.archivedAt,
    updated_at: updates.updatedAt ?? nowISO(),
  }).eq("user_id", userId).eq("id", contactId);
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function sbCreateProject(userId: string, project: WorkProject) {
  const client = sb();
  if (!client) return;
  await client.from("work_projects").upsert({
    id: project.id,
    user_id: userId,
    contact_id: project.contactId,
    title: project.title,
    status: project.status,
    deadline: project.deadline,
    notes: project.notes,
    progress: project.progress,
    archived_at: project.archivedAt,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  });
}

export async function sbUpdateProject(userId: string, projectId: string, updates: Partial<WorkProject>) {
  const client = sb();
  if (!client) return;
  await client.from("work_projects").update({
    title: updates.title,
    status: updates.status,
    deadline: updates.deadline,
    notes: updates.notes,
    progress: updates.progress,
    contact_id: updates.contactId,
    archived_at: updates.archivedAt,
    updated_at: updates.updatedAt ?? nowISO(),
  }).eq("user_id", userId).eq("id", projectId);
}
