# Work Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate courses-first Work route with shared Work storage, strict external-AI course import parsing, migrated leads/clients, and client-attached projects.

**Architecture:** Add a shared `SoloWorkDB` Dexie database that is not persona-scoped. Keep personal development data in the existing persona-local databases. Build the feature in focused units: Work types/database, parser/prompt, Work store, Work route UI, navigation/home migration, and final verification.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Dexie, Zustand, Vitest, Testing Library.

---

## Implementation Notes

Before touching route code, read the local Next.js 16 docs required by `AGENTS.md`:

- `node_modules/next/dist/docs/01-app/index.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`

Relevant facts from those docs:

- `app/<segment>/page.tsx` creates a public route.
- Pages are Server Components by default, but can be marked with `"use client"` when they need client state, browser APIs, or event handlers.

## File Structure

Create or modify these files:

- Modify `src/lib/types.ts`: add Work entity types and status unions.
- Create `src/lib/db/work-database.ts`: shared non-persona Dexie database for Work data.
- Create `src/lib/work/course-parser.ts`: strict parser and external chatbot prompt builder.
- Create `src/lib/stores/work-store.ts`: Zustand actions over `SoloWorkDB`.
- Create `src/components/work/work-page.tsx`: route-level Work UI composition.
- Create `src/components/work/course-import-panel.tsx`: prompt copy, paste area, parse preview, save.
- Create `src/components/work/courses-section.tsx`: full-width course progress/checklist surface.
- Create `src/components/work/work-lists-section.tsx`: clients/leads and projects list surfaces.
- Create `src/app/work/page.tsx`: public `/work` route.
- Modify `src/components/layout/sidebar.tsx`: add Work nav item.
- Modify `src/components/layout/bottom-nav.tsx`: change old `/#work` to `/work`.
- Modify `src/app/page.tsx`: remove `LeadsSection` import and render.
- Modify `src/components/store-initializer.tsx`: stop loading the old persona-scoped leads store.
- Test `src/__tests__/lib/work-database.test.ts`.
- Test `src/__tests__/lib/course-parser.test.ts`.
- Test `src/__tests__/lib/work-store.test.ts`.
- Test `src/__tests__/components/work-page.test.tsx`.
- Test `src/__tests__/components/work-navigation.test.tsx`.

Do not add Work to Supabase/cloud sync in v1.

---

### Task 1: Add Work Types And Shared Work Database

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/db/work-database.ts`
- Test: `src/__tests__/lib/work-database.test.ts`

- [ ] **Step 1: Write the failing database test**

Create `src/__tests__/lib/work-database.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { getWorkDatabaseName, getWorkDb, resetWorkDbForTests } from "@/lib/db/work-database";
import type { WorkContact } from "@/lib/types";

describe("work database", () => {
  afterEach(async () => {
    await resetWorkDbForTests();
  });

  it("uses one shared database name independent of persona", () => {
    expect(getWorkDatabaseName()).toBe("SoloWorkDB");
  });

  it("stores work contacts in the shared work database", async () => {
    const db = getWorkDb();
    const contact: WorkContact = {
      id: "contact-1",
      name: "Studio Set Go",
      status: "client",
      phone: "+91 93469 07002",
      email: "founder@studio.in",
      notes: "Final quote sent.",
      source: "WhatsApp",
      nextStep: "Send final scope",
      archivedAt: null,
      createdAt: "2026-06-04T00:00:00.000Z",
      updatedAt: "2026-06-04T00:00:00.000Z",
    };

    await db.contacts.add(contact);

    const contacts = await db.contacts.toArray();
    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toBe("Studio Set Go");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- --run src/__tests__/lib/work-database.test.ts
```

Expected: FAIL because `@/lib/db/work-database` does not exist.

- [ ] **Step 3: Add Work types**

Append this block to `src/lib/types.ts` after the existing `Lead` interface:

```ts
export type CourseStatus = "planned" | "active" | "paused" | "completed";
export type ChapterPriority = "low" | "normal" | "high";
export type WorkContactStatus = "lead" | "prospect" | "client" | "lost" | "archived";
export type WorkProjectStatus = "planned" | "active" | "paused" | "completed" | "archived";

export interface WorkCourse {
  id: string;
  title: string;
  url: string;
  goal: string;
  deadline: string;
  source: string;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CourseChapter {
  id: string;
  courseId: string;
  title: string;
  deadline: string;
  estimate: string;
  priority: ChapterPriority;
  order: number;
}

export interface CourseMilestone {
  id: string;
  chapterId: string;
  title: string;
  deadline: string;
  estimate: string;
  link: string;
  notes: string;
  completed: boolean;
  order: number;
}

export interface WorkContact {
  id: string;
  name: string;
  status: WorkContactStatus;
  phone: string;
  email: string;
  notes: string;
  source: string;
  nextStep: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkProject {
  id: string;
  contactId: string;
  title: string;
  status: WorkProjectStatus;
  deadline: string;
  notes: string;
  progress: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 4: Add shared Work Dexie database**

Create `src/lib/db/work-database.ts`:

```ts
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
```

- [ ] **Step 5: Run the database test**

Run:

```bash
npm test -- --run src/__tests__/lib/work-database.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/db/work-database.ts src/__tests__/lib/work-database.test.ts
git commit -m "feat: add shared work database"
```

---

### Task 2: Build Strict Course Parser And Prompt Helper

**Files:**
- Create: `src/lib/work/course-parser.ts`
- Test: `src/__tests__/lib/course-parser.test.ts`

- [ ] **Step 1: Write failing parser tests**

Create `src/__tests__/lib/course-parser.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildExternalCoursePrompt, parseCoursePlan } from "@/lib/work/course-parser";

const VALID_INPUT = `Course: Advanced Next.js
URL: https://course.com
Goal: Ship better SaaS work
Deadline: 2026-07-30
Source: Udemy
Status: active

## Chapter 1: Routing
Deadline: 2026-06-12
Estimate: 3h
Priority: high

### Milestone: Watch routing lessons
Deadline: 2026-06-10
Estimate: 45m
Link: https://lesson.com
Notes: Focus on behavior changes.

### Milestone: Complete practice exercise
Deadline: 2026-06-12
Estimate: 90m
Link:
Notes: Save final notes after completing.`;

describe("parseCoursePlan", () => {
  it("parses course, chapter, and milestones", () => {
    const result = parseCoursePlan(VALID_INPUT);

    expect(result.errors).toEqual([]);
    expect(result.course?.title).toBe("Advanced Next.js");
    expect(result.course?.url).toBe("https://course.com");
    expect(result.chapters).toHaveLength(1);
    expect(result.chapters[0].title).toBe("Routing");
    expect(result.chapters[0].priority).toBe("high");
    expect(result.chapters[0].milestones).toHaveLength(2);
    expect(result.chapters[0].milestones[0].title).toBe("Watch routing lessons");
    expect(result.chapters[0].milestones[0].link).toBe("https://lesson.com");
  });

  it("allows blank optional fields", () => {
    const result = parseCoursePlan(`Course: Docs
URL:
Goal:
Deadline:
Source:
Status: active

## Chapter 1: Start
Deadline:
Estimate:
Priority:

### Milestone: Read intro
Deadline:
Estimate:
Link:
Notes:`);

    expect(result.errors).toEqual([]);
    expect(result.course?.url).toBe("");
    expect(result.chapters[0].priority).toBe("normal");
    expect(result.chapters[0].milestones[0].notes).toBe("");
  });

  it("reports missing course", () => {
    const result = parseCoursePlan(`## Chapter 1: Routing`);
    expect(result.errors).toContain("Missing required Course: field.");
    expect(result.errors).toContain("Chapter appears before a Course: field.");
  });

  it("reports milestone before chapter", () => {
    const result = parseCoursePlan(`Course: Advanced Next.js
### Milestone: Watch lesson
Deadline:
Estimate:
Link:
Notes:`);

    expect(result.errors).toContain("Milestone appears before a chapter heading.");
  });

  it("warns and skips unsupported milestone fields", () => {
    const result = parseCoursePlan(`Course: Advanced Next.js
URL:
Goal:
Deadline:
Source:
Status: active

## Chapter 1: Routing
Deadline:
Estimate:
Priority:

### Milestone: Watch lesson
Deadline:
Estimate:
Type: watch
Link:
Notes:`);

    expect(result.errors).toEqual([]);
    expect(result.warnings).toContain("Unsupported milestone field Type was ignored.");
  });

  it("warns on invalid URLs", () => {
    const result = parseCoursePlan(`Course: Bad Links
URL: notaurl
Goal:
Deadline:
Source:
Status: active

## Chapter 1: Links
Deadline:
Estimate:
Priority:

### Milestone: Open lesson
Deadline:
Estimate:
Link: also-bad
Notes:`);

    expect(result.warnings).toContain("URL is not a valid URL.");
    expect(result.warnings).toContain("Milestone link for Open lesson is not a valid URL.");
  });
});

describe("buildExternalCoursePrompt", () => {
  it("includes the course URL and strict format", () => {
    const prompt = buildExternalCoursePrompt("https://course.com");

    expect(prompt).toContain("Course URL:");
    expect(prompt).toContain("https://course.com");
    expect(prompt).toContain("Return only the structured course plan.");
    expect(prompt).toContain("### Milestone: <milestone title>");
  });
});
```

- [ ] **Step 2: Run the parser tests to verify they fail**

Run:

```bash
npm test -- --run src/__tests__/lib/course-parser.test.ts
```

Expected: FAIL because `@/lib/work/course-parser` does not exist.

- [ ] **Step 3: Add parser implementation**

Create `src/lib/work/course-parser.ts`:

```ts
import type { ChapterPriority, CourseStatus } from "@/lib/types";

export interface ParsedCourseMilestone {
  title: string;
  deadline: string;
  estimate: string;
  link: string;
  notes: string;
}

export interface ParsedCourseChapter {
  title: string;
  deadline: string;
  estimate: string;
  priority: ChapterPriority;
  milestones: ParsedCourseMilestone[];
}

export interface ParsedCourse {
  title: string;
  url: string;
  goal: string;
  deadline: string;
  source: string;
  status: CourseStatus;
}

export interface ParseCoursePlanResult {
  course: ParsedCourse | null;
  chapters: ParsedCourseChapter[];
  errors: string[];
  warnings: string[];
}

const COURSE_FIELDS = new Set(["Course", "URL", "Goal", "Deadline", "Source", "Status"]);
const CHAPTER_FIELDS = new Set(["Deadline", "Estimate", "Priority"]);
const MILESTONE_FIELDS = new Set(["Deadline", "Estimate", "Link", "Notes"]);

function splitField(line: string) {
  const index = line.indexOf(":");
  if (index === -1) {
    return null;
  }
  return {
    key: line.slice(0, index).trim(),
    value: line.slice(index + 1).trim(),
  };
}

function normalizeStatus(value: string): CourseStatus {
  if (value === "planned" || value === "active" || value === "paused" || value === "completed") {
    return value;
  }
  return "active";
}

function normalizePriority(value: string): ChapterPriority {
  if (value === "low" || value === "normal" || value === "high") {
    return value;
  }
  return "normal";
}

function isValidUrl(value: string) {
  if (!value) {
    return true;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseCoursePlan(input: string): ParseCoursePlanResult {
  const result: ParseCoursePlanResult = {
    course: null,
    chapters: [],
    errors: [],
    warnings: [],
  };
  const courseDraft = {
    title: "",
    url: "",
    goal: "",
    deadline: "",
    source: "",
    status: "active" as CourseStatus,
  };

  let currentChapter: ParsedCourseChapter | null = null;
  let currentMilestone: ParsedCourseMilestone | null = null;

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (line.startsWith("### Milestone:")) {
      if (!currentChapter) {
        result.errors.push("Milestone appears before a chapter heading.");
        currentMilestone = null;
        continue;
      }
      currentMilestone = {
        title: line.replace(/^### Milestone:\s*/, "").trim(),
        deadline: "",
        estimate: "",
        link: "",
        notes: "",
      };
      currentChapter.milestones.push(currentMilestone);
      continue;
    }

    if (line.startsWith("## Chapter")) {
      if (!courseDraft.title) {
        result.errors.push("Chapter appears before a Course: field.");
      }
      const title = line.replace(/^## Chapter\s*\d*:\s*/, "").trim();
      currentChapter = {
        title,
        deadline: "",
        estimate: "",
        priority: "normal",
        milestones: [],
      };
      currentMilestone = null;
      result.chapters.push(currentChapter);
      continue;
    }

    const field = splitField(line);
    if (!field) {
      result.warnings.push(`Unrecognized line ignored: ${line}`);
      continue;
    }

    if (currentMilestone) {
      if (!MILESTONE_FIELDS.has(field.key)) {
        result.warnings.push(`Unsupported milestone field ${field.key} was ignored.`);
        continue;
      }
      if (field.key === "Deadline") currentMilestone.deadline = field.value;
      if (field.key === "Estimate") currentMilestone.estimate = field.value;
      if (field.key === "Link") currentMilestone.link = field.value;
      if (field.key === "Notes") currentMilestone.notes = field.value;
      continue;
    }

    if (currentChapter) {
      if (!CHAPTER_FIELDS.has(field.key)) {
        result.warnings.push(`Unsupported chapter field ${field.key} was ignored.`);
        continue;
      }
      if (field.key === "Deadline") currentChapter.deadline = field.value;
      if (field.key === "Estimate") currentChapter.estimate = field.value;
      if (field.key === "Priority") currentChapter.priority = normalizePriority(field.value);
      continue;
    }

    if (!COURSE_FIELDS.has(field.key)) {
      result.warnings.push(`Unsupported course field ${field.key} was ignored.`);
      continue;
    }
    if (field.key === "Course") courseDraft.title = field.value;
    if (field.key === "URL") courseDraft.url = field.value;
    if (field.key === "Goal") courseDraft.goal = field.value;
    if (field.key === "Deadline") courseDraft.deadline = field.value;
    if (field.key === "Source") courseDraft.source = field.value;
    if (field.key === "Status") courseDraft.status = normalizeStatus(field.value);
  }

  if (!courseDraft.title) {
    result.errors.unshift("Missing required Course: field.");
  } else {
    result.course = courseDraft;
  }

  if (!isValidUrl(courseDraft.url)) {
    result.warnings.push("URL is not a valid URL.");
  }

  for (const chapter of result.chapters) {
    for (const milestone of chapter.milestones) {
      if (!isValidUrl(milestone.link)) {
        result.warnings.push(`Milestone link for ${milestone.title} is not a valid URL.`);
      }
    }
  }

  return result;
}

export function buildExternalCoursePrompt(courseUrl = "<PASTE_COURSE_URL_HERE>") {
  return `Read this course page and convert it into the exact format below.

Course URL:
${courseUrl}

Rules:
- Return only the structured course plan.
- Do not add explanations.
- Use the exact field names shown.
- Use ISO dates as YYYY-MM-DD when dates are known.
- If a deadline is unknown, leave it blank after the colon.
- Break the course into chapters.
- Break each chapter into milestones.
- Each milestone may only include Deadline, Estimate, Link, and Notes.

Format:
Course:
URL:
Goal:
Deadline:
Source:
Status: active

## Chapter 1: <chapter title>
Deadline:
Estimate:
Priority:

### Milestone: <milestone title>
Deadline:
Estimate:
Link:
Notes:`;
}
```

- [ ] **Step 4: Run parser tests**

Run:

```bash
npm test -- --run src/__tests__/lib/course-parser.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/work/course-parser.ts src/__tests__/lib/course-parser.test.ts
git commit -m "feat: add course import parser"
```

---

### Task 3: Add Work Store And Lead Migration

**Files:**
- Create: `src/lib/stores/work-store.ts`
- Test: `src/__tests__/lib/work-store.test.ts`

- [ ] **Step 1: Write failing store tests**

Create `src/__tests__/lib/work-store.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/database";
import { resetWorkDbForTests } from "@/lib/db/work-database";
import { useWorkStore } from "@/lib/stores/work-store";

describe("work store", () => {
  beforeEach(async () => {
    await resetWorkDbForTests();
    await getDb("mani").leads.clear();
    await getDb("harti").leads.clear();
    useWorkStore.setState({
      contacts: [],
      projects: [],
      courses: [],
      chapters: [],
      milestones: [],
      loaded: false,
    });
  });

  afterEach(async () => {
    await resetWorkDbForTests();
    await getDb("mani").leads.clear();
    await getDb("harti").leads.clear();
  });

  it("creates and archives contacts", async () => {
    const contact = await useWorkStore.getState().createContact({
      name: "Studio Set Go",
      status: "client",
      phone: "+91 93469 07002",
      email: "founder@studio.in",
      notes: "Final quote sent.",
      source: "WhatsApp",
      nextStep: "Send final scope",
    });

    expect(useWorkStore.getState().contacts).toHaveLength(1);
    expect(contact.status).toBe("client");

    await useWorkStore.getState().archiveContact(contact.id);
    expect(useWorkStore.getState().contacts[0].archivedAt).not.toBeNull();
  });

  it("rejects project creation without contactId", async () => {
    await expect(
      useWorkStore.getState().createProject({
        contactId: "",
        title: "Lite booking system",
        status: "active",
        deadline: "2026-06-18",
        notes: "Launch scope",
        progress: 62,
      }),
    ).rejects.toThrow("Project requires a client or lead.");
  });

  it("creates projects attached to contacts", async () => {
    const contact = await useWorkStore.getState().createContact({
      name: "Studio Set Go",
      status: "client",
      phone: "",
      email: "",
      notes: "",
      source: "",
      nextStep: "",
    });

    const project = await useWorkStore.getState().createProject({
      contactId: contact.id,
      title: "Lite booking system",
      status: "active",
      deadline: "2026-06-18",
      notes: "Launch scope",
      progress: 62,
    });

    expect(project.contactId).toBe(contact.id);
    expect(useWorkStore.getState().projects).toHaveLength(1);
  });

  it("saves parsed courses with chapters and milestones", async () => {
    await useWorkStore.getState().saveParsedCourse({
      course: {
        title: "Advanced Next.js",
        url: "https://course.com",
        goal: "Ship better SaaS work",
        deadline: "2026-07-30",
        source: "Udemy",
        status: "active",
      },
      chapters: [
        {
          title: "Routing",
          deadline: "2026-06-12",
          estimate: "3h",
          priority: "high",
          milestones: [
            {
              title: "Watch routing lessons",
              deadline: "2026-06-10",
              estimate: "45m",
              link: "https://lesson.com",
              notes: "Focus on behavior changes.",
            },
          ],
        },
      ],
      errors: [],
      warnings: [],
    });

    expect(useWorkStore.getState().courses).toHaveLength(1);
    expect(useWorkStore.getState().chapters).toHaveLength(1);
    expect(useWorkStore.getState().milestones).toHaveLength(1);
  });

  it("migrates old persona leads into shared contacts once when contacts are empty", async () => {
    await getDb("mani").leads.add({
      id: "lead-1",
      name: "Apex Fitness",
      phone: "",
      email: "apex@example.com",
      notes: "WhatsApp inquiry",
      createdAt: "2026-06-04T00:00:00.000Z",
    });

    await useWorkStore.getState().load();

    expect(useWorkStore.getState().contacts).toHaveLength(1);
    expect(useWorkStore.getState().contacts[0].name).toBe("Apex Fitness");
    expect(useWorkStore.getState().contacts[0].source).toBe("Migrated lead");

    await useWorkStore.getState().load();
    expect(useWorkStore.getState().contacts).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run store tests to verify they fail**

Run:

```bash
npm test -- --run src/__tests__/lib/work-store.test.ts
```

Expected: FAIL because `@/lib/stores/work-store` does not exist.

- [ ] **Step 3: Add Work store implementation**

Create `src/lib/stores/work-store.ts`:

```ts
"use client";

import { create } from "zustand";
import { getDb } from "@/lib/db/database";
import { getWorkDb } from "@/lib/db/work-database";
import type { ParseCoursePlanResult } from "@/lib/work/course-parser";
import type {
  WorkContact,
  WorkContactStatus,
  WorkCourse,
  WorkProject,
  WorkProjectStatus,
  CourseChapter,
  CourseMilestone,
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
}

function sortByCreatedDesc<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function migrateLegacyLeadsIfEmpty() {
  const workDb = getWorkDb();
  const existingContactCount = await workDb.contacts.count();
  if (existingContactCount > 0) {
    return;
  }

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
      name: lead.name,
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
    await workDb.contacts.bulkAdd(contacts);
  }
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
    await getWorkDb().contacts.update(id, { archivedAt, status: "archived", updatedAt: archivedAt });
    set((state) => ({
      contacts: state.contacts.map((contact) =>
        contact.id === id ? { ...contact, archivedAt, status: "archived", updatedAt: archivedAt } : contact,
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
    await getWorkDb().projects.update(id, { archivedAt, status: "archived", updatedAt: archivedAt });
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id ? { ...project, archivedAt, status: "archived", updatedAt: archivedAt } : project,
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
      if (chapters.length > 0) await db.chapters.bulkAdd(chapters);
      if (milestones.length > 0) await db.milestones.bulkAdd(milestones);
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
      milestones: state.milestones.map((milestone) =>
        milestone.id === id ? { ...milestone, completed } : milestone,
      ),
    }));
  },
}));
```

- [ ] **Step 4: Run store tests**

Run:

```bash
npm test -- --run src/__tests__/lib/work-store.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/work-store.ts src/__tests__/lib/work-store.test.ts
git commit -m "feat: add work store"
```

---

### Task 4: Build Courses-First Work UI

**Files:**
- Create: `src/components/work/course-import-panel.tsx`
- Create: `src/components/work/courses-section.tsx`
- Create: `src/components/work/work-lists-section.tsx`
- Create: `src/components/work/work-page.tsx`
- Create: `src/app/work/page.tsx`
- Test: `src/__tests__/components/work-page.test.tsx`

- [ ] **Step 1: Write failing Work page tests**

Create `src/__tests__/components/work-page.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkPage } from "@/components/work/work-page";
import { resetWorkDbForTests } from "@/lib/db/work-database";
import { useWorkStore } from "@/lib/stores/work-store";

Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe("WorkPage", () => {
  beforeEach(async () => {
    await resetWorkDbForTests();
    useWorkStore.setState({
      contacts: [],
      projects: [],
      courses: [],
      chapters: [],
      milestones: [],
      loaded: false,
    });
    vi.clearAllMocks();
  });

  it("renders courses before clients and projects", async () => {
    render(<WorkPage />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Courses" })).toBeInTheDocument());

    const text = document.body.textContent ?? "";
    expect(text.indexOf("Courses")).toBeLessThan(text.indexOf("Clients / Leads"));
    expect(text.indexOf("Clients / Leads")).toBeLessThan(text.indexOf("Projects"));
  });

  it("copies the external AI prompt", async () => {
    render(<WorkPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Copy AI prompt" }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("Return only the structured course plan."));
  });

  it("parses and previews a course plan before saving", async () => {
    render(<WorkPage />);

    fireEvent.change(await screen.findByLabelText("Course plan text"), {
      target: {
        value: `Course: Advanced Next.js
URL: https://course.com
Goal: Ship better SaaS work
Deadline: 2026-07-30
Source: Udemy
Status: active

## Chapter 1: Routing
Deadline: 2026-06-12
Estimate: 3h
Priority: high

### Milestone: Watch routing lessons
Deadline: 2026-06-10
Estimate: 45m
Link: https://lesson.com
Notes: Focus on behavior changes.`,
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview course" }));

    expect(await screen.findByText("Advanced Next.js")).toBeInTheDocument();
    expect(screen.getByText("Watch routing lessons")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save course" }));

    await waitFor(() => expect(useWorkStore.getState().courses).toHaveLength(1));
  });
});
```

- [ ] **Step 2: Run Work page tests to verify they fail**

Run:

```bash
npm test -- --run src/__tests__/components/work-page.test.tsx
```

Expected: FAIL because the Work components do not exist.

- [ ] **Step 3: Add course import panel**

Create `src/components/work/course-import-panel.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { buildExternalCoursePrompt, parseCoursePlan, type ParseCoursePlanResult } from "@/lib/work/course-parser";
import { useWorkStore } from "@/lib/stores/work-store";

export function CourseImportPanel() {
  const saveParsedCourse = useWorkStore((state) => state.saveParsedCourse);
  const [courseUrl, setCourseUrl] = useState("");
  const [draft, setDraft] = useState("");
  const [parsed, setParsed] = useState<ParseCoursePlanResult | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy AI prompt");
  const [saving, setSaving] = useState(false);
  const prompt = useMemo(() => buildExternalCoursePrompt(courseUrl || undefined), [courseUrl]);

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy AI prompt"), 1200);
  }

  function previewCourse() {
    setParsed(parseCoursePlan(draft));
  }

  async function saveCourse() {
    if (!parsed || parsed.errors.length > 0) return;
    setSaving(true);
    await saveParsedCourse(parsed);
    setDraft("");
    setParsed(null);
    setSaving(false);
  }

  return (
    <section className="rounded-xl border border-[#EAEAEA] bg-white p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-[#787774]">Strict import</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#1f1b17]">Paste course plan</h2>
        </div>
        <button type="button" onClick={() => void copyPrompt()} className="h-9 rounded-md bg-[#111111] px-3 text-xs font-semibold text-white">
          {copyLabel}
        </button>
      </div>

      <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#787774]">
        Course URL for prompt
        <input
          value={courseUrl}
          onChange={(event) => setCourseUrl(event.target.value)}
          className="h-10 rounded-lg border border-[#EAEAEA] bg-[#F7F6F3] px-3 text-sm normal-case tracking-normal text-[#1f1b17] outline-none"
          placeholder="https://course.com"
        />
      </label>

      <label className="mt-4 grid gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#787774]">
        Course plan text
        <textarea
          aria-label="Course plan text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={10}
          className="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3 font-mono text-xs normal-case leading-6 tracking-normal text-[#1f1b17] outline-none"
          placeholder="Course:&#10;URL:&#10;Goal:&#10;Deadline:&#10;Source:&#10;Status: active"
        />
      </label>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={previewCourse} className="h-9 rounded-md border border-[#EAEAEA] bg-white px-3 text-xs font-semibold text-[#1f1b17]">
          Preview course
        </button>
        <button
          type="button"
          disabled={!parsed || parsed.errors.length > 0 || saving}
          onClick={() => void saveCourse()}
          className="h-9 rounded-md bg-[#111111] px-3 text-xs font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Saving" : "Save course"}
        </button>
      </div>

      {parsed ? (
        <div className="mt-5 rounded-lg border border-[#EAEAEA] bg-[#F7F6F3] p-4">
          {parsed.errors.length > 0 ? (
            <div className="space-y-1 text-sm text-[#9F2F2D]">
              {parsed.errors.map((error) => <p key={error}>{error}</p>)}
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-[#1f1b17]">{parsed.course?.title}</p>
              <div className="mt-3 space-y-3">
                {parsed.chapters.map((chapter) => (
                  <div key={chapter.title} className="border-t border-[#EAEAEA] pt-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#787774]">{chapter.title}</p>
                    <div className="mt-2 space-y-1">
                      {chapter.milestones.map((milestone) => (
                        <p key={milestone.title} className="text-sm text-[#1f1b17]">{milestone.title}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {parsed.warnings.length > 0 ? (
                <div className="mt-3 space-y-1 text-xs text-[#956400]">
                  {parsed.warnings.map((warning) => <p key={warning}>{warning}</p>)}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 4: Add courses section**

Create `src/components/work/courses-section.tsx`:

```tsx
"use client";

import type { CourseChapter, CourseMilestone, WorkCourse } from "@/lib/types";
import { CourseImportPanel } from "./course-import-panel";
import { useWorkStore } from "@/lib/stores/work-store";

function getCourseProgress(course: WorkCourse, chapters: CourseChapter[], milestones: CourseMilestone[]) {
  const chapterIds = new Set(chapters.filter((chapter) => chapter.courseId === course.id).map((chapter) => chapter.id));
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
          <p className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-[#787774]">01 · Courses</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1f1b17] md:text-4xl">Courses</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#787774]">Full-width course progress and strict external-AI import.</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className="rounded-xl border border-[#EAEAEA] bg-white p-5">
          {courses.length === 0 ? (
            <div className="grid min-h-[260px] place-items-center rounded-lg border border-dashed border-[#EAEAEA] bg-[#F9F9F8] p-6 text-center">
              <div>
                <p className="text-base font-semibold text-[#1f1b17]">No courses yet</p>
                <p className="mt-2 text-sm text-[#787774]">Paste a strict course plan to create your first checklist.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {courses.map((course) => {
                const courseChapters = chapters.filter((chapter) => chapter.courseId === course.id).sort((a, b) => a.order - b.order);
                const progress = getCourseProgress(course, chapters, milestones);
                return (
                  <article key={course.id} className="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#1f1b17]">{course.title}</h2>
                        <p className="mt-1 text-sm text-[#787774]">{course.goal}</p>
                        {course.url ? <a href={course.url} className="mt-2 inline-block text-sm font-semibold text-[#1F6C9F]">Open course</a> : null}
                      </div>
                      <span className="rounded-full bg-[#EDF3EC] px-2 py-1 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[#346538]">{course.status}</span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded bg-[#EAEAEA]">
                      <div className="h-full bg-[#2F3437]" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-4 space-y-4">
                      {courseChapters.map((chapter) => {
                        const chapterMilestones = milestones.filter((milestone) => milestone.chapterId === chapter.id).sort((a, b) => a.order - b.order);
                        return (
                          <div key={chapter.id} className="border-t border-[#EAEAEA] pt-4">
                            <p className="text-sm font-semibold text-[#1f1b17]">{chapter.title}</p>
                            <div className="mt-2 space-y-2">
                              {chapterMilestones.map((milestone) => (
                                <label key={milestone.id} className="grid grid-cols-[18px_minmax(0,1fr)_auto] gap-2 text-sm text-[#1f1b17]">
                                  <input type="checkbox" checked={milestone.completed} onChange={(event) => void toggleMilestone(milestone.id, event.target.checked)} />
                                  <span>
                                    {milestone.title}
                                    <span className="block text-xs text-[#787774]">{milestone.deadline} · {milestone.estimate} · {milestone.notes}</span>
                                  </span>
                                  {milestone.link ? <a href={milestone.link} className="text-xs font-semibold text-[#1F6C9F]">Open</a> : null}
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
```

- [ ] **Step 5: Add clients/projects list section**

Create `src/components/work/work-lists-section.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useWorkStore } from "@/lib/stores/work-store";
import type { WorkContactStatus, WorkProjectStatus } from "@/lib/types";

export function WorkListsSection() {
  const contacts = useWorkStore((state) => state.contacts).filter((contact) => !contact.archivedAt);
  const projects = useWorkStore((state) => state.projects).filter((project) => !project.archivedAt);
  const createContact = useWorkStore((state) => state.createContact);
  const createProject = useWorkStore((state) => state.createProject);
  const [contactName, setContactName] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const contactById = useMemo(() => new Map(contacts.map((contact) => [contact.id, contact])), [contacts]);

  async function addContact() {
    if (!contactName.trim()) return;
    await createContact({
      name: contactName.trim(),
      status: "lead" as WorkContactStatus,
      phone: "",
      email: "",
      notes: "",
      source: "",
      nextStep: "",
    });
    setContactName("");
  }

  async function addProject() {
    if (!projectTitle.trim() || !selectedContactId) return;
    await createProject({
      contactId: selectedContactId,
      title: projectTitle.trim(),
      status: "planned" as WorkProjectStatus,
      deadline: "",
      notes: "",
      progress: 0,
    });
    setProjectTitle("");
  }

  return (
    <section className="px-5 py-8 md:px-8">
      <div className="mb-5">
        <p className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-[#787774]">02 · Freelance work</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#1f1b17]">Clients / Leads and Projects</h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-[#EAEAEA] bg-white">
          <div className="border-b border-[#EAEAEA] p-5">
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#1f1b17]">Clients / Leads</h3>
            <div className="mt-3 flex gap-2">
              <input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="New lead name" className="h-10 flex-1 rounded-lg border border-[#EAEAEA] bg-[#F7F6F3] px-3 text-sm outline-none" />
              <button type="button" onClick={() => void addContact()} className="h-10 rounded-md bg-[#111111] px-3 text-xs font-semibold text-white">New client</button>
            </div>
          </div>
          <div className="divide-y divide-[#EAEAEA] px-5">
            {contacts.length === 0 ? <p className="py-6 text-sm text-[#787774]">No clients or leads yet.</p> : contacts.map((contact) => (
              <article key={contact.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-4">
                <div>
                  <p className="font-semibold text-[#1f1b17]">{contact.name}</p>
                  <p className="mt-1 text-sm text-[#787774]">{contact.email || contact.phone || "No contact details yet"}</p>
                  {contact.nextStep ? <p className="mt-1 text-xs text-[#956400]">Next: {contact.nextStep}</p> : null}
                </div>
                <span className="h-fit rounded-full bg-[#EDF3EC] px-2 py-1 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[#346538]">{contact.status}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[#EAEAEA] bg-white">
          <div className="border-b border-[#EAEAEA] p-5">
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#1f1b17]">Projects</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
              <input value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} placeholder="New project title" className="h-10 rounded-lg border border-[#EAEAEA] bg-[#F7F6F3] px-3 text-sm outline-none" />
              <select value={selectedContactId} onChange={(event) => setSelectedContactId(event.target.value)} className="h-10 rounded-lg border border-[#EAEAEA] bg-[#F7F6F3] px-3 text-sm outline-none">
                <option value="">Select client</option>
                {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
              </select>
              <button type="button" disabled={!selectedContactId} onClick={() => void addProject()} className="h-10 rounded-md bg-[#111111] px-3 text-xs font-semibold text-white disabled:opacity-40">New project</button>
            </div>
          </div>
          <div className="divide-y divide-[#EAEAEA] px-5">
            {projects.length === 0 ? <p className="py-6 text-sm text-[#787774]">No projects yet.</p> : projects.map((project) => (
              <article key={project.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-4">
                <div>
                  <p className="font-semibold text-[#1f1b17]">{project.title}</p>
                  <p className="mt-1 text-sm text-[#787774]">Attached to {contactById.get(project.contactId)?.name ?? "Unknown contact"}</p>
                  {project.deadline ? <p className="mt-1 text-xs text-[#956400]">Deadline: {project.deadline}</p> : null}
                </div>
                <span className="h-fit rounded-full bg-[#E1F3FE] px-2 py-1 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[#1F6C9F]">{project.status}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Add Work page composition and route**

Create `src/components/work/work-page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { CoursesSection } from "./courses-section";
import { WorkListsSection } from "./work-lists-section";
import { useWorkStore } from "@/lib/stores/work-store";

export function WorkPage() {
  const loaded = useWorkStore((state) => state.loaded);
  const load = useWorkStore((state) => state.load);

  useEffect(() => {
    if (!loaded) {
      void load();
    }
  }, [load, loaded]);

  return (
    <main className="min-h-screen bg-[#F7F6F3] pb-24 text-[#1f1b17] md:pl-16 lg:pl-56">
      <header className="border-b border-[#EAEAEA] bg-white px-5 py-8 md:px-8">
        <p className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-[#787774]">Work · Mani-owned · Harti can edit</p>
        <h1 className="mt-2 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-[#1f1b17] md:text-5xl">Courses first. Freelance work underneath.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#787774]">A shared Work view for external course checklists, leads, clients, and client-attached projects.</p>
      </header>
      <CoursesSection />
      <WorkListsSection />
    </main>
  );
}
```

Create `src/app/work/page.tsx`:

```tsx
import { WorkPage } from "@/components/work/work-page";

export default function WorkRoutePage() {
  return <WorkPage />;
}
```

- [ ] **Step 7: Run Work page tests**

Run:

```bash
npm test -- --run src/__tests__/components/work-navigation.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/work src/app/work/page.tsx src/__tests__/components/work-page.test.tsx
git commit -m "feat: add courses-first work route"
```

---

### Task 5: Move Navigation To `/work` And Remove Dashboard Leads

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/bottom-nav.tsx`
- Modify: `src/components/store-initializer.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/__tests__/components/work-navigation.test.tsx`

- [ ] **Step 1: Add navigation/home regression tests**

Create `src/__tests__/components/work-navigation.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/work",
}));

describe("Work navigation", () => {
  it("links mobile Work navigation to /work", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: "Work" })).toHaveAttribute("href", "/work");
  });

  it("links desktop Work navigation to /work", () => {
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "Work" })).toHaveAttribute("href", "/work");
  });
});
```

- [ ] **Step 2: Run navigation tests to verify they fail**

Run:

```bash
npm test -- --run src/__tests__/components/work-navigation.test.tsx
```

Expected: FAIL because sidebar has no Work route item and bottom nav still points to `/#work`.

- [ ] **Step 3: Update desktop sidebar**

Modify `src/components/layout/sidebar.tsx` so `navItems` becomes:

```ts
const navItems = [
  { href: "/", icon: "⬡", label: "Dashboard" },
  { href: "/work", icon: "▦", label: "Work" },
  { href: "/gates", icon: "◈", label: "Gates" },
  { href: "/missions", icon: "◎", label: "Missions" },
  { href: "/inventory", icon: "▤", label: "Inventory" },
  { href: "/records", icon: "☰", label: "Hunter's Record" },
  { href: "/status", icon: "⬢", label: "Player Status" },
];
```

- [ ] **Step 4: Update bottom nav**

Modify `src/components/layout/bottom-nav.tsx` so `navItems` becomes:

```ts
const navItems = [
  { href: "/#overview", label: "Home" },
  { href: "/work", label: "Work" },
  { href: "/#missions", label: "Goals" },
  { href: "/#records", label: "Record" },
  { href: "/#status", label: "Status" },
];
```

Also change the class condition inside the link map to:

```tsx
pathname === item.href || (item.href === "/#overview" && pathname === "/")
```

The complete `className` expression should become:

```tsx
className={`rounded-full px-3 py-2 text-xs transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
  pathname === item.href || (item.href === "/#overview" && pathname === "/")
    ? "bg-[color:color-mix(in_srgb,var(--accent-solid)_16%,white)] text-[var(--text-primary)]"
    : "text-[var(--text-secondary)]"
}`}
```

- [ ] **Step 5: Stop loading old leads store**

Modify `src/components/store-initializer.tsx`:

Remove:

```ts
import { useLeadsStore } from "@/lib/stores/leads-store";
```

Remove these state selectors:

```ts
const leadsLoaded = useLeadsStore((state) => state.loaded);
const loadLeads = useLeadsStore((state) => state.load);
```

Remove this initial-load block:

```ts
if (!leadsLoaded) {
  void loadLeads();
}
```

Remove `leadsLoaded` and `loadLeads` from the first effect dependency list.

Remove `loadLeads(activePersona),` from the persona rehydrate `Promise.all`.

Remove `loadLeads` from the second effect dependency list.

- [ ] **Step 6: Remove dashboard leads block**

Modify `src/app/page.tsx`:

Remove:

```ts
import { LeadsSection } from "@/components/leads/leads-section";
```

Remove the render near the bottom:

```tsx
<LeadsSection />
```

- [ ] **Step 7: Run navigation tests**

Run:

```bash
npm test -- --run src/__tests__/components/work-navigation.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/sidebar.tsx src/components/layout/bottom-nav.tsx src/components/store-initializer.tsx src/app/page.tsx src/__tests__/components/work-navigation.test.tsx
git commit -m "feat: move work navigation to route"
```

---

### Task 6: Final Verification

**Files:**
- Verify all changed files.
- No new files expected unless fixes are needed.

- [ ] **Step 1: Run targeted Work tests**

Run:

```bash
npm test -- --run src/__tests__/lib/work-database.test.ts src/__tests__/lib/course-parser.test.ts src/__tests__/lib/work-store.test.ts src/__tests__/components/work-page.test.tsx src/__tests__/components/work-navigation.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test -- --run
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS with no new errors.

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Start dev server**

Run:

```bash
npm run dev
```

Expected: Next dev server starts and prints a local URL, usually `http://localhost:3000`.

- [ ] **Step 6: Browser verify**

Open `/work` in the in-app browser or regular browser and verify:

- Courses section is first and full-width.
- `Copy AI prompt` copies strict prompt text.
- Pasting valid course text shows preview before save.
- Saving creates course, chapter, and milestone rows.
- Milestone `Open` links render when `Link` exists.
- Clients / Leads list appears below Courses.
- Projects list appears below or beside Clients / Leads.
- New project button is disabled until a client is selected.
- Home dashboard no longer shows the old leads block.

- [ ] **Step 7: Stop dev server**

Stop the `npm run dev` process with `Ctrl-C`.

- [ ] **Step 8: Commit final fixes if any**

If verification required fixes:

```bash
git add <fixed-files>
git commit -m "fix: polish work feature verification"
```

If no fixes were needed, do not create an empty commit.
