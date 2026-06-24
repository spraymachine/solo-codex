import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChessGameList } from "@/components/chess/chess-game-list";
import type { ChessGame } from "@/lib/chess/types";

const GAME: ChessGame = {
  url: "https://www.chess.com/game/live/169564389352",
  pgn: '[Event "Live Chess"]\n[ECO "C20"]\n\n1. e4 e5 0-1\n',
  endTime: 1780336914,
  timeClass: "rapid",
  white: { username: "memicysl", rating: 293, result: "resigned" },
  black: { username: "Kitzyyan", rating: 296, result: "win" },
};

describe("ChessGameList", () => {
  it("renders opponent, format, and result from our perspective", () => {
    render(<ChessGameList games={[GAME]} username="memicysl" />);
    expect(screen.getByText("Kitzyyan")).toBeInTheDocument();
    expect(screen.getByText("rapid")).toBeInTheDocument();
    expect(screen.getByText("loss")).toBeInTheDocument();
  });

  it("renders an empty state when there are no games", () => {
    render(<ChessGameList games={[]} username="memicysl" />);
    expect(screen.getByText(/no games this month/i)).toBeInTheDocument();
  });
});
