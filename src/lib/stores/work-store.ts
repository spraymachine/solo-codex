"use client";

import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getDb } from "@/lib/db/database";
import { getLegacyWorkDb, getWorkDb } from "@/lib/db/work-database";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ParseCoursePlanResult } from "@/lib/work/course-parser";
import type {
  CourseChapter,
  CourseMilestone,
  CourseStatus,
  Persona,
  WorkContact,
  WorkContactStatus,
  WorkCourse,
  WorkProject,
  WorkProjectStatus,
} from "@/lib/types";
import { generateId, nowISO } from "@/lib/utils";
import {
  fetchAllWork,
  getWorkUserId,
  sbCreateChapter,
  sbCreateContact,
  sbCreateCourse,
  sbCreateMilestone,
  sbCreateProject,
  sbDeleteChapter,
  sbDeleteCourse,
  sbDeleteMilestone,
  sbUpdateChapter,
  sbUpdateContact,
  sbUpdateCourse,
  sbUpdateMilestone,
  sbUpdateProject,
} from "@/lib/supabase/work";

type ContactInput = {
  name: string;
  status: WorkContactStatus;
  phone: string;
  phoneLabel: string;
  phone2: string;
  phone2Label: string;
  email: string;
  notes: string;
};

type ProjectInput = {
  contactId: string;
  title: string;
  status: WorkProjectStatus;
  deadline: string;
  notes: string;
  progress: number;
};

type CourseInput = {
  title: string;
  url: string;
  deadline: string;
  status: CourseStatus;
};

interface WorkState {
  contacts: WorkContact[];
  projects: WorkProject[];
  courses: WorkCourse[];
  chapters: CourseChapter[];
  milestones: CourseMilestone[];
  loaded: boolean;
  _userId: string | null;
  _persona: Persona | null;
  _realtimeChannel: RealtimeChannel | null;
  load: (persona: Persona) => Promise<void>;
  unsubscribe: () => Promise<void>;
  createContact: (input: ContactInput) => Promise<WorkContact>;
  updateContact: (id: string, updates: Partial<ContactInput>) => Promise<void>;
  archiveContact: (id: string) => Promise<void>;
  createProject: (input: ProjectInput) => Promise<WorkProject>;
  updateProject: (id: string, updates: Partial<ProjectInput>) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  createCourse: (input: CourseInput) => Promise<WorkCourse>;
  createChapter: (courseId: string, title: string) => Promise<CourseChapter>;
  createMilestone: (chapterId: string, title: string) => Promise<CourseMilestone>;
  saveParsedCourse: (parsed: ParseCoursePlanResult) => Promise<WorkCourse>;
  toggleMilestone: (id: string, completed: boolean) => Promise<void>;
  updateMilestone: (id: string, updates: Partial<Omit<CourseMilestone, "id" | "chapterId" | "order">>) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;
  updateChapter: (id: string, updates: Partial<Omit<CourseChapter, "id" | "courseId" | "order">>) => Promise<void>;
  deleteChapter: (id: string) => Promise<void>;
  updateCourse: (id: string, updates: Partial<Omit<WorkCourse, "id" | "createdAt">>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
}

function sortByCreatedDesc<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

let migrationPromise: Promise<void> | null = null;

async function runLegacyLeadMigration() {
  const workDb = getWorkDb();
  const legacyLeads = [
    ...(await getDb("mani").leads.toArray()),
    ...(await getDb("harti").leads.toArray()),
  ];
  const seen = new Set<string>();
  const now = nowISO();
  const contacts: WorkContact[] = [];

  for (const lead of legacyLeads) {
    const key = `${lead.name.trim().toLowerCase()}|${lead.email.trim().toLowerCase()}|${lead.phone.trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    contacts.push({
      id: generateId(),
      name: lead.name.trim(),
      status: "lead",
      phone: lead.phone,
      phoneLabel: "",
      phone2: "",
      phone2Label: "",
      email: lead.email,
      notes: lead.notes,
      archivedAt: null,
      createdAt: lead.createdAt,
      updatedAt: now,
    });
  }

  if (contacts.length > 0) {
    await workDb.transaction("rw", workDb.contacts, async () => {
      const existingContactCount = await workDb.contacts.count();
      if (existingContactCount > 0) return;
      await workDb.contacts.bulkAdd(contacts);
    });
  }
}

async function migrateLegacyLeadsIfEmpty() {
  migrationPromise ??= runLegacyLeadMigration().finally(() => {
    migrationPromise = null;
  });
  await migrationPromise;
}

// One-time local migration: before this change, Work had a single Dexie
// database shared by both personas. Existing combined data is assigned to
// Mani (see docs/superpowers/specs/2026-06-19-persona-segregation-work-read-design.md).
// Harti's persona-keyed database starts empty. This only matters for the
// unauthenticated/offline fallback path — authenticated users get the
// equivalent backfill for free from the Supabase `persona` column default.
let workMigrationPromise: Promise<void> | null = null;

async function runLegacyWorkMigration(userId: string | undefined) {
  const maniDb = getWorkDb(userId, "mani");
  const existingCount =
    (await maniDb.courses.count()) +
    (await maniDb.contacts.count()) +
    (await maniDb.projects.count());
  if (existingCount > 0) return;

  const legacyDb = getLegacyWorkDb(userId);
  const [courses, chapters, milestones, contacts, projects] = await Promise.all([
    legacyDb.courses.toArray(),
    legacyDb.chapters.toArray(),
    legacyDb.milestones.toArray(),
    legacyDb.contacts.toArray(),
    legacyDb.projects.toArray(),
  ]);
  if (courses.length + chapters.length + milestones.length + contacts.length + projects.length === 0) {
    return;
  }

  await maniDb.transaction(
    "rw",
    [maniDb.courses, maniDb.chapters, maniDb.milestones, maniDb.contacts, maniDb.projects],
    async () => {
      if (courses.length) await maniDb.courses.bulkAdd(courses);
      if (chapters.length) await maniDb.chapters.bulkAdd(chapters);
      if (milestones.length) await maniDb.milestones.bulkAdd(milestones);
      if (contacts.length) await maniDb.contacts.bulkAdd(contacts);
      if (projects.length) await maniDb.projects.bulkAdd(projects);
    },
  );
}

async function migrateLegacyWorkDbIfEmpty(userId: string | undefined) {
  workMigrationPromise ??= runLegacyWorkMigration(userId).finally(() => {
    workMigrationPromise = null;
  });
  await workMigrationPromise;
}

// Fire-and-forget Supabase sync — never throws, never blocks UI
async function syncToSupabase(fn: (userId: string) => Promise<void>) {
  try {
    const userId = await getWorkUserId();
    if (!userId) return;
    await fn(userId);
  } catch {
    // swallow — local state is source of truth
  }
}

async function refreshFromRemote(
  userId: string,
  persona: Persona,
  set: (partial: Partial<WorkState>) => void,
) {
  const remote = await fetchAllWork(userId, persona);
  if (!remote) return;
  const db = getWorkDb(userId, persona);
  await db.transaction("rw", [db.courses, db.chapters, db.milestones, db.contacts, db.projects], async () => {
    await Promise.all([
      db.courses.bulkPut(remote.courses),
      db.chapters.bulkPut(remote.chapters),
      db.milestones.bulkPut(remote.milestones),
      db.contacts.bulkPut(remote.contacts),
      db.projects.bulkPut(remote.projects),
    ]);
  });
  set({
    courses: remote.courses,
    chapters: remote.chapters,
    milestones: remote.milestones,
    contacts: sortByCreatedDesc(remote.contacts),
    projects: sortByCreatedDesc(remote.projects),
  });
}

export const useWorkStore = create<WorkState>((set, get) => {
  const db = () => getWorkDb(get()._userId ?? undefined, get()._persona ?? "mani");
  return ({
  contacts: [],
  projects: [],
  courses: [],
  chapters: [],
  milestones: [],
  loaded: false,
  _userId: null,
  _persona: null,
  _realtimeChannel: null,

  async unsubscribe() {
    const { _realtimeChannel } = get();
    if (_realtimeChannel) {
      const client = getSupabaseBrowserClient();
      set({ _realtimeChannel: null });
      if (client) await client.removeChannel(_realtimeChannel);
    }
  },

  async load(persona) {
    const personaChanged = get()._persona !== persona;
    set({ _persona: persona });
    if (personaChanged) {
      // Drop the previous persona's data immediately — otherwise it stays on
      // screen under the new persona until the async refetch below resolves.
      set({ contacts: [], projects: [], courses: [], chapters: [], milestones: [], loaded: false });
      await get().unsubscribe();
    }

    // Try Supabase first — if authenticated, use as source of truth
    try {
      const userId = await getWorkUserId();
      if (userId) {
        set({ _userId: userId });
        await refreshFromRemote(userId, persona, set);
        set({ loaded: true });

        // Subscribe to realtime updates across all 5 tables
        const client = getSupabaseBrowserClient();
        if (client && isSupabaseConfigured() && !get()._realtimeChannel) {
          const tables = ["work_courses", "work_chapters", "work_milestones", "work_contacts", "work_projects"];
          let channel = client.channel(`work:${userId}:${persona}`);
          for (const table of tables) {
            channel = channel.on(
              "postgres_changes" as any,
              { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
              () => { void refreshFromRemote(userId, persona, set); },
            );
          }
          channel.subscribe();
          set({ _realtimeChannel: channel });
        }
        return;
      }
    } catch {
      // fall through to local
    }

    // Fallback: local Dexie (unauthenticated / offline only)
    if (persona === "mani") {
      await migrateLegacyWorkDbIfEmpty(get()._userId ?? undefined);
      await migrateLegacyLeadsIfEmpty();
    }
    const localDb = getWorkDb(get()._userId ?? undefined, persona);
    const [contacts, projects, courses, chapters, milestones] = await Promise.all([
      localDb.contacts.toArray(),
      localDb.projects.toArray(),
      localDb.courses.toArray(),
      localDb.chapters.toArray(),
      localDb.milestones.toArray(),
    ]);
    set({
      contacts: sortByCreatedDesc(contacts),
      projects: sortByCreatedDesc(projects),
      courses: sortByCreatedDesc(courses),
      chapters,
      milestones,
      loaded: true,
    });
  },

  async createContact(input) {
    const now = nowISO();
    const contact: WorkContact = { id: generateId(), archivedAt: null, createdAt: now, updatedAt: now, ...input };
    await db().contacts.add(contact);
    set((state) => ({ contacts: [contact, ...state.contacts] }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbCreateContact(uid, persona, contact));
    return contact;
  },

  async updateContact(id, updates) {
    const next = { ...updates, updatedAt: nowISO() };
    await db().contacts.update(id, next);
    set((state) => ({ contacts: state.contacts.map((c) => (c.id === id ? { ...c, ...next } : c)) }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbUpdateContact(uid, persona, id, next));
  },

  async archiveContact(id) {
    const archivedAt = nowISO();
    const next = { archivedAt, status: "archived" as const, updatedAt: archivedAt };
    await db().contacts.update(id, next);
    set((state) => ({ contacts: state.contacts.map((c) => (c.id === id ? { ...c, ...next } : c)) }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbUpdateContact(uid, persona, id, next));
  },

  async createProject(input) {
    if (!input.contactId) throw new Error("Project requires a client or lead.");
    const contact = get().contacts.find((c) => c.id === input.contactId);
    if (!contact) throw new Error("Project requires an existing client or lead.");
    const now = nowISO();
    const project: WorkProject = { id: generateId(), archivedAt: null, createdAt: now, updatedAt: now, ...input };
    await db().projects.add(project);
    set((state) => ({ projects: [project, ...state.projects] }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbCreateProject(uid, persona, project));
    return project;
  },

  async updateProject(id, updates) {
    if (updates.contactId !== undefined) {
      if (!updates.contactId) throw new Error("Project requires a client or lead.");
      const contact = get().contacts.find((c) => c.id === updates.contactId);
      if (!contact) throw new Error("Project requires an existing client or lead.");
    }
    const next = { ...updates, updatedAt: nowISO() };
    await db().projects.update(id, next);
    set((state) => ({ projects: state.projects.map((p) => (p.id === id ? { ...p, ...next } : p)) }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbUpdateProject(uid, persona, id, next));
  },

  async archiveProject(id) {
    const archivedAt = nowISO();
    const next = { archivedAt, status: "archived" as const, updatedAt: archivedAt };
    await db().projects.update(id, next);
    set((state) => ({ projects: state.projects.map((p) => (p.id === id ? { ...p, ...next } : p)) }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbUpdateProject(uid, persona, id, next));
  },

  async saveParsedCourse(parsed) {
    if (!parsed.course || parsed.errors.length > 0) throw new Error("Cannot save a course with parser errors.");
    const now = nowISO();
    const course: WorkCourse = {
      id: generateId(),
      title: parsed.course.title,
      url: parsed.course.url,
      goal: parsed.course.goal,
      deadline: parsed.course.deadline,
      source: parsed.course.source,
      status: parsed.course.status,
      createdAt: now,
      updatedAt: now,
    };
    const chapters: CourseChapter[] = [];
    const milestones: CourseMilestone[] = [];

    parsed.chapters.forEach((chapter, ci) => {
      const chapterRow: CourseChapter = {
        id: generateId(),
        courseId: course.id,
        title: chapter.title,
        deadline: chapter.deadline,
        estimate: chapter.estimate,
        order: ci,
      };
      chapters.push(chapterRow);
      chapter.milestones.forEach((milestone, mi) => {
        milestones.push({
          id: generateId(),
          chapterId: chapterRow.id,
          title: milestone.title,
          deadline: milestone.deadline,
          estimate: milestone.estimate,
          link: milestone.link,
          notes: milestone.notes,
          completed: false,
          order: mi,
        });
      });
    });

    await db().transaction("rw", [db().courses, db().chapters, db().milestones], async () => {
      await db().courses.add(course);
      if (chapters.length > 0) await db().chapters.bulkAdd(chapters);
      if (milestones.length > 0) await db().milestones.bulkAdd(milestones);
    });

    set((state) => ({
      courses: [course, ...state.courses],
      chapters: [...state.chapters, ...chapters],
      milestones: [...state.milestones, ...milestones],
    }));

    const persona = get()._persona ?? "mani";
    void syncToSupabase(async (uid) => {
      await sbCreateCourse(uid, persona, course);
      await Promise.all(chapters.map((ch) => sbCreateChapter(uid, persona, ch)));
      await Promise.all(milestones.map((m) => sbCreateMilestone(uid, persona, m)));
    });

    return course;
  },

  async createCourse(input) {
    const now = nowISO();
    const course: WorkCourse = {
      id: generateId(),
      title: input.title,
      url: input.url,
      goal: "",
      deadline: input.deadline,
      source: "",
      status: input.status,
      createdAt: now,
      updatedAt: now,
    };
    await db().courses.add(course);
    set((state) => ({ courses: [course, ...state.courses] }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbCreateCourse(uid, persona, course));
    return course;
  },

  async createChapter(courseId, title) {
    const existing = get().chapters.filter((c) => c.courseId === courseId);
    const chapter: CourseChapter = {
      id: generateId(),
      courseId,
      title,
      deadline: "",
      estimate: "",
      order: existing.length,
    };
    await db().chapters.add(chapter);
    set((state) => ({ chapters: [...state.chapters, chapter] }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbCreateChapter(uid, persona, chapter));
    return chapter;
  },

  async createMilestone(chapterId, title) {
    const existing = get().milestones.filter((m) => m.chapterId === chapterId);
    const milestone: CourseMilestone = {
      id: generateId(),
      chapterId,
      title,
      deadline: "",
      estimate: "",
      link: "",
      notes: "",
      completed: false,
      order: existing.length,
    };
    await db().milestones.add(milestone);
    set((state) => ({ milestones: [...state.milestones, milestone] }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbCreateMilestone(uid, persona, milestone));
    return milestone;
  },

  async toggleMilestone(id, completed) {
    await db().milestones.update(id, { completed });
    set((state) => ({ milestones: state.milestones.map((m) => (m.id === id ? { ...m, completed } : m)) }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbUpdateMilestone(uid, persona, id, { completed }));
  },

  async updateMilestone(id, updates) {
    await db().milestones.update(id, updates);
    set((state) => ({ milestones: state.milestones.map((m) => (m.id === id ? { ...m, ...updates } : m)) }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbUpdateMilestone(uid, persona, id, updates));
  },

  async deleteMilestone(id) {
    await db().milestones.delete(id);
    set((state) => ({ milestones: state.milestones.filter((m) => m.id !== id) }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbDeleteMilestone(uid, persona, id));
  },

  async updateChapter(id, updates) {
    await db().chapters.update(id, updates);
    set((state) => ({ chapters: state.chapters.map((c) => (c.id === id ? { ...c, ...updates } : c)) }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbUpdateChapter(uid, persona, id, updates));
  },

  async deleteChapter(id) {
    const milestoneIds = (await db().milestones.where("chapterId").equals(id).toArray()).map((m) => m.id);
    await db().transaction("rw", [db().chapters, db().milestones], async () => {
      await db().milestones.bulkDelete(milestoneIds);
      await db().chapters.delete(id);
    });
    set((state) => ({
      chapters: state.chapters.filter((c) => c.id !== id),
      milestones: state.milestones.filter((m) => m.chapterId !== id),
    }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase(async (uid) => {
      await Promise.all(milestoneIds.map((mid) => sbDeleteMilestone(uid, persona, mid)));
      await sbDeleteChapter(uid, persona, id);
    });
  },

  async updateCourse(id, updates) {
    const updatedAt = nowISO();
    await db().courses.update(id, { ...updates, updatedAt });
    set((state) => ({ courses: state.courses.map((c) => (c.id === id ? { ...c, ...updates, updatedAt } : c)) }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbUpdateCourse(uid, persona, id, { ...updates, updatedAt }));
  },

  async deleteCourse(id) {
    const chapterIds = (await db().chapters.where("courseId").equals(id).toArray()).map((c) => c.id);
    const milestoneIds = (
      await Promise.all(chapterIds.map((cid) => db().milestones.where("chapterId").equals(cid).toArray()))
    ).flat().map((m) => m.id);

    await db().transaction("rw", [db().courses, db().chapters, db().milestones], async () => {
      await db().milestones.bulkDelete(milestoneIds);
      await db().chapters.bulkDelete(chapterIds);
      await db().courses.delete(id);
    });
    set((state) => ({
      courses: state.courses.filter((c) => c.id !== id),
      chapters: state.chapters.filter((c) => !chapterIds.includes(c.id)),
      milestones: state.milestones.filter((m) => !milestoneIds.includes(m.id)),
    }));
    const persona = get()._persona ?? "mani";
    void syncToSupabase((uid) => sbDeleteCourse(uid, persona, id));
  },
});
});
