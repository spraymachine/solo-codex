import Dexie, { type EntityTable } from "dexie";
import type {
  CourseChapter,
  CourseMilestone,
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

export function getWorkDatabaseName(userId?: string) {
  return userId ? `SoloWorkDB-${userId}` : "SoloWorkDB-local";
}

export function getWorkDb(userId?: string) {
  const name = getWorkDatabaseName(userId);
  if (!workDbCache.has(name)) {
    workDbCache.set(name, new SoloWorkDB(name));
  }
  return workDbCache.get(name)!;
}

export async function resetWorkDbForTests() {
  for (const [name, db] of workDbCache) {
    await db.delete();
    db.close();
    workDbCache.delete(name);
  }
  // Also nuke any lingering unnamed instance
  const db = new SoloWorkDB(getWorkDatabaseName());
  await db.delete();
  db.close();
}
