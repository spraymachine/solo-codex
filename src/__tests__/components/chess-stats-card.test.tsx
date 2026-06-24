import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChessStatsCard } from "@/components/chess/chess-stats-card";

describe("ChessStatsCard", () => {
  it("renders rating and W/L/D per format", () => {
    render(
      <ChessStatsCard
        stats={[
          { format: "rapid", rating: 407, wins: 164, losses: 167, draws: 14 },
          { format: "blitz", rating: 232, wins: 7, losses: 9, draws: 0 },
        ]}
      />
    );
    expect(screen.getByText("rapid")).toBeInTheDocument();
    expect(screen.getByText("407")).toBeInTheDocument();
    expect(screen.getByText("164W 167L 14D")).toBeInTheDocument();
    expect(screen.getByText("blitz")).toBeInTheDocument();
  });

  it("renders an empty state when stats is empty", () => {
    render(<ChessStatsCard stats={[]} />);
    expect(screen.getByText(/no rated games yet/i)).toBeInTheDocument();
  });
});
