# Chess Game Detail + Stockfish Analysis — Design

Extends `docs/superpowers/specs/2026-06-24-chess-stats-design.md`. That spec deferred engine analysis to "phase 2" — this is phase 2, brought forward at user request.

## Problem

Current `/chess` page game rows are static text (opponent/format/result) with no interaction. Need: click a game to see the board and move list, plus an on-demand Stockfish eval.

## New dependencies

- `stockfish` (npm package for github.com/nmrugg/stockfish.js, v18.0.8) — WASM chess engine, runs in a Web Worker.
- `chess.js` (v1.4.0) — PGN parsing, move list + FEN-per-ply generation. MIT licensed, no UI.
- `react-chessboard` (v5.10.0) — renders a board from a FEN string.

## Architecture

```
src/lib/chess/
  pgn.ts                — parsePgnToPlies(pgn): wraps chess.js, returns [{ san, fen, moveNumber, color }]
  stockfish-worker.ts   — Worker entry point; loads `stockfish`, exposes a UCI request/response protocol via postMessage
  analysis.ts           — main-thread client: spawns the worker (new Worker(new URL("./stockfish-worker.ts", import.meta.url))),
                           analyzePlies(plies, depth) -> evals per ply, classifyMove(evalDeltaCp) -> "blunder" | "mistake" | "inaccuracy" | "good"

src/components/chess/
  chess-game-detail.tsx — board (react-chessboard) at the selected ply, move list with prev/next, "Analyze" button,
                           eval annotations once analysis completes, loading state while the worker is busy

src/components/chess/chess-game-list.tsx (modify) — row becomes a button; clicking toggles an expanded ChessGameDetail
  beneath that row (one expanded row at a time)
```

## Interaction flow

1. Click a game row → `ChessGameList` parses that game's PGN via `parsePgnToPlies`, renders `ChessGameDetail` inline below the row.
2. `ChessGameDetail` shows the board at the final position by default, a move list (SAN), and prev/next/jump-to-move controls that update the board FEN.
3. Clicking "Analyze" lazily creates the Stockfish worker (first call only; reused for subsequent analyze clicks within the same detail view), sends each ply's FEN, depth 12, collects centipawn/mate eval per ply.
4. Once analysis returns, annotate each move in the list with its eval and a quality tag (blunder/mistake/inaccuracy/good) based on eval swing between consecutive plies.
5. Worker terminates when the detail view collapses (row clicked again) or the game selection changes.

## Eval classification

Eval swing computed from the mover's perspective (positive = good for the side that just moved):
- drop > 200cp (or eval flips from winning to losing) → "blunder"
- drop 100–200cp → "mistake"
- drop 50–100cp → "inaccuracy"
- otherwise → "good"

## Worker bundling

Use the standard `new Worker(new URL("./stockfish-worker.ts", import.meta.url))` pattern (Turbopack supports `new URL(..., import.meta.url)` for static/worker assets — this is the same mechanism Webpack 5 uses, not Next-specific config). Verified empirically during implementation: if Turbopack rejects this pattern, fall back to serving the stockfish worker/wasm files from `public/stockfish/` and constructing `new Worker("/stockfish/stockfish-worker.js")` instead — decided in Task 1 of the implementation plan based on what actually compiles, not guessed in advance.

## Out of scope

- No auto-analyze-all-games (per-game button only, confirmed with user).
- No move annotations beyond the four-tier quality tag (no engine PV lines shown in UI, though the worker protocol can return them later).

## Testing

- Unit tests for `pgn.ts` (`parsePgnToPlies`) against a known PGN, asserting move count, SAN, and FEN at a couple of plies.
- Unit tests for `classifyMove` in `analysis.ts` (pure function, no engine needed) across the four buckets.
- Component test for `ChessGameDetail` covering: renders board + move list from plies, "Analyze" button triggers the analysis call (mocked), eval tags render once analysis resolves.
- No automated test spins up the real Stockfish worker (slow, non-deterministic timing) — that path is verified manually in the browser during implementation.
