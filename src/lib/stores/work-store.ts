"use client";

import { create } from "zustand";
import { getDb } from "@/lib/db/database";
import { getWorkDb } from "@/lib/db/work-database";
import type { ParseCoursePlanResult } from "@/lib/work/course-parser";
import type {
  CourseChapter,
  CourseMilestone,
  WorkContact,
  WorkContactStatus,
  WorkCourse,
  WorkProject,
  WorkProjectStatus,
} from "@/lib/types";
import { generateId, nowISO } from "@/lib/utils";

type ContactInput = {
  name: string;
  status: WorkContactStatus;
  phone: string;
  email: string;
  notes: string;
  source: string;
  nextStep: string;
};

type ProjectInput = {
  contactId: string;
  title: string;
  status: WorkProjectStatus;
  deadline: string;
  notes: string;
  progress: number;
};

interface WorkState {
  contacts: WorkContact[];
  projects: WorkProject[];
  courses: WorkCourse[];
  chapters: CourseChapter[];
  milestones: CourseMilestone[];
  loaded: boolean;
  load: () => Promise<void>;
  createContact: (input: ContactInput) => Promise<WorkContact>;
  updateContact: (id: string, updates: Partial<ContactInput>) => Promise<void>;
  archiveContact: (id: string) => Promise<void>;
  createProject: (input: ProjectInput) => Promise<WorkProject>;
  updateProject: (id: string, updates: Partial<ProjectInput>) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
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
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    contacts.push({
      id: generateId(),
      name: lead.name.trim(),
      status: "lead",
      phone: lead.phone,
      email: lead.email,
      notes: lead.notes,
      source: "Migrated lead",
      nextStep: "",
      archivedAt: null,
      createdAt: lead.createdAt,
      updatedAt: now,
    });
  }

  if (contacts.length > 0) {
    await workDb.transaction("rw", workDb.contacts, async () => {
      const existingContactCount = await workDb.contacts.count();
      if (existingContactCount > 0) {
        return;
      }
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

export const useWorkStore = create<WorkState>((set, get) => ({
  contacts: [],
  projects: [],
  courses: [],
  chapters: [],
  milestones: [],
  loaded: false,

  async load() {
    await migrateLegacyLeadsIfEmpty();
    const db = getWorkDb();
    const [contacts, projects, courses, chapters, milestones] = await Promise.all([
      db.contacts.toArray(),
      db.projects.toArray(),
      db.courses.toArray(),
      db.chapters.toArray(),
      db.milestones.toArray(),
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
    const contact: WorkContact = {
      id: generateId(),
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      ...input,
    };

    await getWorkDb().contacts.add(contact);
    set((state) => ({ contacts: [contact, ...state.contacts] }));
    return contact;
  },

  async updateContact(id, updates) {
    const next = { ...updates, updatedAt: nowISO() };
    await getWorkDb().contacts.update(id, next);
    set((state) => ({
      contacts: state.contacts.map((contact) =>
        contact.id === id ? { ...contact, ...next } : contact,
      ),
    }));
  },

  async archiveContact(id) {
    const archivedAt = nowISO();
    const next = { archivedAt, status: "archived" as const, updatedAt: archivedAt };
    await getWorkDb().contacts.update(id, next);
    set((state) => ({
      contacts: state.contacts.map((contact) =>
        contact.id === id ? { ...contact, ...next } : contact,
      ),
    }));
  },

  async createProject(input) {
    if (!input.contactId) {
      throw new Error("Project requires a client or lead.");
    }
    const contact = get().contacts.find((item) => item.id === input.contactId);
    if (!contact) {
      throw new Error("Project requires an existing client or lead.");
    }

    const now = nowISO();
    const project: WorkProject = {
      id: generateId(),
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      ...input,
    };

    await getWorkDb().projects.add(project);
    set((state) => ({ projects: [project, ...state.projects] }));
    return project;
  },

  async updateProject(id, updates) {
    if (updates.contactId !== undefined) {
      if (!updates.contactId) {
        throw new Error("Project requires a client or lead.");
      }
      const contact = get().contacts.find((item) => item.id === updates.contactId);
      if (!contact) {
        throw new Error("Project requires an existing client or lead.");
      }
    }

    const next = { ...updates, updatedAt: nowISO() };
    await getWorkDb().projects.update(id, next);
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id ? { ...project, ...next } : project,
      ),
    }));
  },

  async archiveProject(id) {
    const archivedAt = nowISO();
    const next = { archivedAt, status: "archived" as const, updatedAt: archivedAt };
    await getWorkDb().projects.update(id, next);
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id ? { ...project, ...next } : project,
      ),
    }));
  },

  async saveParsedCourse(parsed) {
    if (!parsed.course || parsed.errors.length > 0) {
      throw new Error("Cannot save a course with parser errors.");
    }

    const db = getWorkDb();
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

    parsed.chapters.forEach((chapter, chapterIndex) => {
      const chapterRow: CourseChapter = {
        id: generateId(),
        courseId: course.id,
        title: chapter.title,
        deadline: chapter.deadline,
        estimate: chapter.estimate,
        priority: chapter.priority,
        order: chapterIndex,
      };
      chapters.push(chapterRow);

      chapter.milestones.forEach((milestone, milestoneIndex) => {
        milestones.push({
          id: generateId(),
          chapterId: chapterRow.id,
          title: milestone.title,
          deadline: milestone.deadline,
          estimate: milestone.estimate,
          link: milestone.link,
          notes: milestone.notes,
          completed: false,
          order: milestoneIndex,
        });
      });
    });

    await db.transaction("rw", [db.courses, db.chapters, db.milestones], async () => {
      await db.courses.add(course);
      if (chapters.length > 0) {
        await db.chapters.bulkAdd(chapters);
      }
      if (milestones.length > 0) {
        await db.milestones.bulkAdd(milestones);
      }
    });

    set((state) => ({
      courses: [course, ...state.courses],
      chapters: [...state.chapters, ...chapters],
      milestones: [...state.milestones, ...milestones],
    }));

    return course;
  },

  async toggleMilestone(id, completed) {
    await getWorkDb().milestones.update(id, { completed });
    set((state) => ({
      milestones: state.milestones.map((m) => (m.id === id ? { ...m, completed } : m)),
    }));
  },

  async updateMilestone(id, updates) {
    await getWorkDb().milestones.update(id, updates);
    set((state) => ({
      milestones: state.milestones.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  },

  async deleteMilestone(id) {
    await getWorkDb().milestones.delete(id);
    set((state) => ({ milestones: state.milestones.filter((m) => m.id !== id) }));
  },

  async updateChapter(id, updates) {
    await getWorkDb().chapters.update(id, updates);
    set((state) => ({
      chapters: state.chapters.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  },

  async deleteChapter(id) {
    const db = getWorkDb();
    const milestoneIds = (await db.milestones.where("chapterId").equals(id).toArray()).map((m) => m.id);
    await db.transaction("rw", [db.chapters, db.milestones], async () => {
      await db.milestones.bulkDelete(milestoneIds);
      await db.chapters.delete(id);
    });
    set((state) => ({
      chapters: state.chapters.filter((c) => c.id !== id),
      milestones: state.milestones.filter((m) => m.chapterId !== id),
    }));
  },

  async updateCourse(id, updates) {
    await getWorkDb().courses.update(id, { ...updates, updatedAt: nowISO() });
    set((state) => ({
      courses: state.courses.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: nowISO() } : c)),
    }));
  },

  async deleteCourse(id) {
    const db = getWorkDb();
    const chapterIds = (await db.chapters.where("courseId").equals(id).toArray()).map((c) => c.id);
    const milestoneIds = (
      await Promise.all(chapterIds.map((cid) => db.milestones.where("chapterId").equals(cid).toArray()))
    ).flat().map((m) => m.id);
    await db.transaction("rw", [db.courses, db.chapters, db.milestones], async () => {
      await db.milestones.bulkDelete(milestoneIds);
      await db.chapters.bulkDelete(chapterIds);
      await db.courses.delete(id);
    });
    set((state) => ({
      courses: state.courses.filter((c) => c.id !== id),
      chapters: state.chapters.filter((c) => !chapterIds.includes(c.id)),
      milestones: state.milestones.filter((m) => !milestoneIds.includes(m.id)),
    }));
  },
}));
