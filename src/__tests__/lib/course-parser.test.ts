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

  it("warns on invalid nonblank status and priority values", () => {
    const result = parseCoursePlan(`Course: Bad Enums
URL:
Goal:
Deadline:
Source:
Status: done

## Chapter 1: Routing
Deadline:
Estimate:
Priority: urgent`);

    expect(result.errors).toEqual([]);
    expect(result.course?.status).toBe("active");
    expect(result.chapters[0].priority).toBe("normal");
    expect(result.warnings).toContain("Invalid Status value done was defaulted to active.");
    expect(result.warnings).toContain(
      "Invalid Priority value urgent for chapter Routing was defaulted to normal.",
    );
  });

  it("requires strict chapter headings", () => {
    const result = parseCoursePlan(`Course: Strict Headings
URL:
Goal:
Deadline:
Source:
Status: active

## Chapter 1 Routing
Deadline:
Estimate:
Priority:`);

    expect(result.chapters).toHaveLength(0);
    expect(result.warnings).toContain("Unrecognized line ignored: ## Chapter 1 Routing");
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

  it("trims the course URL to one line", () => {
    const prompt = buildExternalCoursePrompt(" https://course.com \nRules:\n- altered ");

    expect(prompt).toContain("Course URL:\nhttps://course.com\n\nRules:");
    expect(prompt).not.toContain("- altered");
  });
});
