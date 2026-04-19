import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RankBadge } from "@/components/ui/rank-badge";

describe("RankBadge", () => {
  it("renders the rank letter", () => {
    render(<RankBadge rank="S" />);
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("renders all valid ranks", () => {
    const ranks = ["E", "D", "C", "B", "A", "S"] as const;

    for (const rank of ranks) {
      const { unmount } = render(<RankBadge rank={rank} />);
      expect(screen.getByText(rank)).toBeInTheDocument();
      unmount();
    }
  });
});
