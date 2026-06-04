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

  constructor() {
    super(getWorkDatabaseName());
    this.version(1).stores({
      courses: "id, status, deadline, createdAt",
      chapters: "id, courseId, order, deadline",
      milestones: "id, chapterId, completed, order, deadline",
      contacts: "id, status, name, archivedAt, createdAt",
      projects: "id, contactId, status, deadline, archivedAt, createdAt",
    });
  }
}

let workDb: SoloWorkDB | null = null;

export function getWorkDatabaseName() {
  return "SoloWorkDB";
}

export function getWorkDb() {
  workDb ??= new SoloWorkDB();
  return workDb;
}

export async function resetWorkDbForTests() {
  if (workDb) {
    await workDb.delete();
    workDb.close();
    workDb = null;
    return;
  }

  const db = new SoloWorkDB();
  await db.delete();
  db.close();
}
