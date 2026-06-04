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
