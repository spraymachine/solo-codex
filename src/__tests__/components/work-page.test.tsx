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

  it("renders courses section before clients section", async () => {
    render(<WorkPage />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Courses" })).toBeInTheDocument(),
    );

    const text = document.body.textContent ?? "";
    const coursesIdx = text.indexOf("01 / Courses");
    const clientsIdx = text.indexOf("02 / Freelance");
    expect(coursesIdx).toBeGreaterThanOrEqual(0);
    expect(clientsIdx).toBeGreaterThanOrEqual(0);
    expect(coursesIdx).toBeLessThan(clientsIdx);
  });

  it("copies the external AI prompt", async () => {
    render(<WorkPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Copy AI prompt" }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("Return only the plan"),
    );
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
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(await screen.findByText("Advanced Next.js")).toBeInTheDocument();
    expect(screen.getByText("Watch routing lessons")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save Course" }));

    await waitFor(() => expect(useWorkStore.getState().courses).toHaveLength(1));
  });
});
