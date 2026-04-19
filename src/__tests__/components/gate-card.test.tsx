import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GateCard } from "@/components/gates/gate-card";

describe("GateCard", () => {
  const gate = {
    id: "1",
    title: "Learn TypeScript",
    rank: "C" as const,
    status: "active" as const,
    createdAt: "2026-04-16T00:00:00Z",
    clearedAt: null,
  };

  it("renders gate title and rank", () => {
    render(<GateCard gate={gate} progress={45} questCount={4} />);
    expect(screen.getByText("Learn TypeScript")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("shows progress percentage", () => {
    render(<GateCard gate={gate} progress={45} questCount={4} />);
    expect(screen.getByText("45%")).toBeInTheDocument();
  });
});
