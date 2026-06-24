import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChessArchiveBrowser } from "@/components/chess/chess-archive-browser";
import type { ChessArchiveMonth } from "@/lib/chess/types";

const MONTHS: ChessArchiveMonth[] = [
  { year: 2026, month: 5, url: "x" },
  { year: 2026, month: 6, url: "y" },
];

describe("ChessArchiveBrowser", () => {
  it("renders one option per archive month, most recent first", () => {
    render(<ChessArchiveBrowser months={MONTHS} selected={{ year: 2026, month: 6 }} onSelect={vi.fn()} />);
    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["2026-06", "2026-05"]);
  });

  it("calls onSelect with the chosen year/month", () => {
    const onSelect = vi.fn();
    render(<ChessArchiveBrowser months={MONTHS} selected={{ year: 2026, month: 6 }} onSelect={onSelect} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "2026-05" } });
    expect(onSelect).toHaveBeenCalledWith({ year: 2026, month: 5 });
  });
});
