"use client";

import { useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { parsePgnToPlies } from "@/lib/chess/pgn";
import { classifyMove, createStockfishEngine, type Engine, type EngineEval, type MoveQuality } from "@/lib/chess/analysis";
import type { ChessGame } from "@/lib/chess/types";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const QUALITY_CLASS: Record<MoveQuality, string> = {
  blunder: "text-red-400",
  mistake: "text-orange-400",
  inaccuracy: "text-yellow-400",
  good: "text-[var(--text-primary)]",
};

export function ChessGameDetail({
  game,
  engineFactory = createStockfishEngine,
}: {
  game: ChessGame;
  engineFactory?: () => Engine;
}) {
  const plies = useMemo(() => parsePgnToPlies(game.pgn), [game.pgn]);
  const [index, setIndex] = useState(plies.length - 1);
  const [evals, setEvals] = useState<EngineEval[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const fen = index >= 0 ? plies[index].fen : STARTING_FEN;

  async function analyze() {
    setAnalyzing(true);
    const engine = engineFactory();
    const fens = [STARTING_FEN, ...plies.map((p) => p.fen)];
    const results: EngineEval[] = [];
    for (const f of fens) {
      results.push(await engine.evaluateFen(f, 12));
    }
    engine.terminate();
    setEvals(results);
    setAnalyzing(false);
  }

  return (
    <div className="space-y-3 border-t border-[var(--surface-border)] p-3">
      <div className="mx-auto max-w-[320px]">
        <Chessboard options={{ position: fen }} />
      </div>
      <div className="flex items-center justify-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(-1, i - 1))}
          className="rounded border border-[var(--surface-border)] px-2 py-1"
        >
          prev
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(plies.length - 1, i + 1))}
          className="rounded border border-[var(--surface-border)] px-2 py-1"
        >
          next
        </button>
        <button
          type="button"
          onClick={analyze}
          disabled={analyzing}
          className="rounded border border-[var(--accent-solid)] px-2 py-1 text-[var(--accent-solid)]"
        >
          {analyzing ? "Analyzing…" : "Analyze"}
        </button>
      </div>
      <ol className="grid grid-cols-2 gap-1 text-xs">
        {plies.map((p, i) => {
          const quality = evals ? classifyMove(evals[i], evals[i + 1], p.color) : null;
          return (
            <li key={`${p.moveNumber}-${p.color}`} className={quality ? QUALITY_CLASS[quality] : "text-[var(--text-primary)]"}>
              {p.color === "w" ? `${p.moveNumber}. ` : ""}
              {p.san}
              {quality && <span className="ml-1">{quality}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
