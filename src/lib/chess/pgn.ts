import { Chess } from "chess.js";
import type { ChessPly } from "@/lib/chess/types";

export function parsePgnToPlies(pgn: string): ChessPly[] {
  if (!pgn.trim()) return [];

  const chess = new Chess();
  chess.loadPgn(pgn);
  const moves = chess.history({ verbose: true });

  return moves.map((m, i) => ({
    san: m.san,
    fen: m.after,
    moveNumber: Math.floor(i / 2) + 1,
    color: m.color,
  }));
}
