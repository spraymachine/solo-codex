import Dexie, { type EntityTable } from "dexie";
import type {
  CourseChapter,
  CourseMilestone,
  Persona,
  WorkContact,
  WorkCourse,
  WorkProject,
} from "@/lib/types";

class SoloWorkDB extends Dexie {
  courses!: EntityTable<WorkCourse, "id">;
  chapters!: EntityTable<CourseChapter, "id">;
  milestones!: EntityTable<CourseMilestone, "id">;
  contacts!: EntityTable<WorkContact, "id">;
  projects!: EntityTable<WorkProject, "id">;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      courses: "id, status, deadline, createdAt",
      chapters: "id, courseId, order, deadline",
      milestones: "id, chapterId, completed, order, deadline",
      contacts: "id, status, name, archivedAt, createdAt",
      projects: "id, contactId, status, deadline, archivedAt, createdAt",
    });
  }
}

const workDbCache = new Map<string, SoloWorkDB>();

function openWorkDb(name: string) {
  if (!workDbCache.has(name)) {
    workDbCache.set(name, new SoloWorkDB(name));
  }
  return workDbCache.get(name)!;
}

export function getWorkDatabaseName(userId?: string, persona: Persona = "mani") {
  return `SoloWorkDB-${userId ?? "local"}-${persona}`;
}

export function getWorkDb(userId?: string, persona: Persona = "mani") {
  return openWorkDb(getWorkDatabaseName(userId, persona));
}

// Pre-persona-segregation database name. Used only by the one-time
// migration in work-store.ts that copies existing combined data to Mani.
export function getLegacyWorkDatabaseName(userId?: string) {
  return userId ? `SoloWorkDB-${userId}` : "SoloWorkDB-local";
}

export function getLegacyWorkDb(userId?: string) {
  return openWorkDb(getLegacyWorkDatabaseName(userId));
}

export async function resetWorkDbForTests() {
  for (const [name, db] of workDbCache) {
    await db.delete();
    db.close();
    workDbCache.delete(name);
  }
}
