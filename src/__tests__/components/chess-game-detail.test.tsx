import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChessGameDetail } from "@/components/chess/chess-game-detail";
import type { ChessGame } from "@/lib/chess/types";
import type { Engine, EngineEval } from "@/lib/chess/analysis";

const GAME: ChessGame = {
  url: "x",
  pgn: "1. e4 e5 2. Qh5 *",
  endTime: 0,
  timeClass: "rapid",
  white: { username: "memicysl", rating: 400, result: "" },
  black: { username: "opp", rating: 400, result: "" },
};

function fakeEngine(evals: EngineEval[]): () => Engine {
  let i = 0;
  return () => ({
    evaluateFen: vi.fn(async () => evals[i++]),
    terminate: vi.fn(),
  });
}

describe("ChessGameDetail", () => {
  it("renders the move list from the game's PGN", () => {
    render(<ChessGameDetail game={GAME} engineFactory={fakeEngine([])} />);
    expect(screen.getByText(/e4/)).toBeInTheDocument();
    expect(screen.getByText(/e5/)).toBeInTheDocument();
    expect(screen.getByText(/Qh5/)).toBeInTheDocument();
  });

  it("tags a move as blunder once analysis resolves", async () => {
    const evals: EngineEval[] = [
      { cp: 20, mate: null },
      { cp: 10, mate: null },
      { cp: 0, mate: null },
      { cp: -300, mate: null },
    ];
    render(<ChessGameDetail game={GAME} engineFactory={fakeEngine(evals)} />);
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));
    await waitFor(() => expect(screen.getByText("blunder")).toBeInTheDocument());
  });
});
