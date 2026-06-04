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
