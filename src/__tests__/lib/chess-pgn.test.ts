import { describe, expect, it } from "vitest";
import { parsePgnToPlies } from "@/lib/chess/pgn";

describe("parsePgnToPlies", () => {
  it("parses moves into SAN, after-move FEN, move number, and color", () => {
    const plies = parsePgnToPlies("1. e4 e5 2. Nf3 *");
    expect(plies).toEqual([
      { san: "e4", fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1", moveNumber: 1, color: "w" },
      { san: "e5", fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", moveNumber: 1, color: "b" },
      { san: "Nf3", fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2", moveNumber: 2, color: "w" },
    ]);
  });

  it("returns [] for an empty PGN", () => {
    expect(parsePgnToPlies("")).toEqual([]);
  });
});
