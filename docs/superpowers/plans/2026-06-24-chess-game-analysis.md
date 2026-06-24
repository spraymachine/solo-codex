# Chess Game Detail + Stockfish Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/chess` game rows clickable (board + move list), with a per-game "Analyze" button that runs Stockfish (nmrugg/stockfish.js, npm package `stockfish`) in a Web Worker and tags each move blunder/mistake/inaccuracy/good.

**Architecture:** `chess.js` parses PGN into a per-ply list of `{ san, fen, moveNumber, color }`. `react-chessboard` renders the board at the selected ply. A small UCI-over-`postMessage` client (`analysis.ts`) talks to the Stockfish worker, evaluating each ply's FEN; a pure `classifyMove` function turns consecutive evals into a quality tag. `ChessGameList` rows toggle an inline `ChessGameDetail`.

**Tech Stack:** `stockfish@18.0.8` (lite single-threaded WASM build, no special CORS headers needed), `chess.js@1.4.0`, `react-chessboard@5.10.0`, Vitest + Testing Library.

---

## File Structure

```
public/stockfish/
  stockfish-18-lite-single.js   — copied from node_modules/stockfish/bin (Task 1)
  stockfish-18-lite-single.wasm

src/lib/chess/
  types.ts      — add ChessPly (modify)
  pgn.ts        — parsePgnToPlies(pgn) -> ChessPly[] (new)
  analysis.ts   — EngineEval, Engine, createStockfishEngine(), classifyMove() (new)

src/components/chess/
  chess-game-detail.tsx   — board + move list + Analyze button (new)
  chess-game-list.tsx     — rows become clickable, toggle ChessGameDetail (modify)

src/__tests__/lib/chess-pgn.test.ts        (new)
src/__tests__/lib/chess-analysis.test.ts   (new)
src/__tests__/components/chess-game-detail.test.tsx   (new)
src/__tests__/components/chess-game-list.test.tsx     (modify)
```

---

### Task 1: Install dependencies and stage the Stockfish engine binary

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `public/stockfish/stockfish-18-lite-single.js`, `public/stockfish/stockfish-18-lite-single.wasm`

- [ ] **Step 1: Install the three new dependencies**

Run: `npm install stockfish@18.0.8 chess.js@1.4.0 react-chessboard@5.10.0`
Expected: `package.json` dependencies gain `stockfish`, `chess.js`, `react-chessboard`; install exits 0.

- [ ] **Step 2: Copy the lite single-threaded engine into `public/`**

The npm `stockfish` package ships prebuilt engine binaries in `node_modules/stockfish/bin/`. The lite single-threaded build (`stockfish-18-lite-single.js` + `.wasm`) is the one to use — no CORS/cross-origin-isolation headers required, ~7MB, per the package README's own recommendation for browser use without complicated setup.

Run:
```bash
mkdir -p public/stockfish
cp node_modules/stockfish/bin/stockfish-18-lite-single.js public/stockfish/
cp node_modules/stockfish/bin/stockfish-18-lite-single.wasm public/stockfish/
```
Expected: both files present in `public/stockfish/`.

- [ ] **Step 3: Verify the engine loads as a Worker in the browser**

This can't be checked headlessly from this shell (it's a browser Worker API). Defer the actual browser check to Task 6's manual smoke test — for now just confirm the files exist and are non-empty:

Run: `ls -la public/stockfish/`
Expected: both files listed with non-zero size (the `.js` file is several hundred KB, the `.wasm` is a few MB).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json public/stockfish/
git commit -m "feat: add stockfish, chess.js, react-chessboard dependencies"
```

---

### Task 2: PGN parsing into per-ply move list

**Files:**
- Modify: `src/lib/chess/types.ts`
- Create: `src/lib/chess/pgn.ts`
- Test: `src/__tests__/lib/chess-pgn.test.ts`

- [ ] **Step 1: Add the `ChessPly` type**

Add to `src/lib/chess/types.ts` (append at end of file):

```typescript
export interface ChessPly {
  san: string;
  fen: string;
  moveNumber: number;
  color: "w" | "b";
}
```

- [ ] **Step 2: Write the failing test**

```typescript
// src/__tests__/lib/chess-pgn.test.ts
import { describe, expect, it } from "vitest";
import { parsePgnToPlies } from "@/lib/chess/pgn";

describe("parsePgnToPlies", () => {
  it("parses moves into SAN, after-move FEN, move number, and color", () => {
    const plies = parsePgnToPlies("1. e4 e5 2. Nf3 *");
    expect(plies).toEqual([
      { san: "e4", fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1", moveNumber: 1, color: "w" },
      { san: "e5", fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2", moveNumber: 1, color: "b" },
      { san: "Nf3", fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b kq - 1 2", moveNumber: 2, color: "w" },
    ]);
  });

  it("returns [] for an empty PGN", () => {
    expect(parsePgnToPlies("")).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/chess-pgn.test.ts`
Expected: FAIL — `Cannot find module '@/lib/chess/pgn'`

- [ ] **Step 4: Implement `parsePgnToPlies`**

```typescript
// src/lib/chess/pgn.ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/__tests__/lib/chess-pgn.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/chess/types.ts src/lib/chess/pgn.ts src/__tests__/lib/chess-pgn.test.ts
git commit -m "feat: add PGN-to-plies parsing via chess.js"
```

---

### Task 3: Move quality classification and Stockfish engine client

**Files:**
- Create: `src/lib/chess/analysis.ts`
- Test: `src/__tests__/lib/chess-analysis.test.ts`

`classifyMove` is pure and gets a real TDD test. `createStockfishEngine` talks to a browser `Worker` (not available in the Vitest/jsdom environment for a real WASM engine) — it's implemented directly and verified manually in Task 6's browser smoke test, per the design spec's testing section.

- [ ] **Step 1: Write the failing test for `classifyMove`**

```typescript
// src/__tests__/lib/chess-analysis.test.ts
import { describe, expect, it } from "vitest";
import { classifyMove } from "@/lib/chess/analysis";

describe("classifyMove", () => {
  it("returns good when eval barely changes", () => {
    expect(classifyMove({ cp: 20, mate: null }, { cp: 10, mate: null }, "w")).toBe("good");
  });

  it("returns inaccuracy for a 50-100cp drop", () => {
    expect(classifyMove({ cp: 50, mate: null }, { cp: -20, mate: null }, "w")).toBe("inaccuracy");
  });

  it("returns mistake for a 100-200cp drop", () => {
    expect(classifyMove({ cp: 50, mate: null }, { cp: -80, mate: null }, "w")).toBe("mistake");
  });

  it("returns blunder for a >200cp drop", () => {
    expect(classifyMove({ cp: 50, mate: null }, { cp: -200, mate: null }, "w")).toBe("blunder");
  });

  it("flips perspective for black", () => {
    // From white's eval perspective, +50 -> +250 is great for white, terrible for black (the mover).
    expect(classifyMove({ cp: 50, mate: null }, { cp: 250, mate: null }, "b")).toBe("blunder");
  });

  it("treats a mate score as a large eval in the mating side's favor", () => {
    expect(classifyMove({ cp: 0, mate: null }, { cp: null, mate: 3 }, "w")).toBe("good");
    expect(classifyMove({ cp: 0, mate: null }, { cp: null, mate: -3 }, "w")).toBe("blunder");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/chess-analysis.test.ts`
Expected: FAIL — `Cannot find module '@/lib/chess/analysis'`

- [ ] **Step 3: Implement `classifyMove` and the Stockfish engine client**

```typescript
// src/lib/chess/analysis.ts
export interface EngineEval {
  cp: number | null;
  mate: number | null;
}

export type MoveQuality = "blunder" | "mistake" | "inaccuracy" | "good";

export interface Engine {
  evaluateFen(fen: string, depth: number): Promise<EngineEval>;
  terminate(): void;
}

const MATE_SCORE_CP = 10000;

function toMoverPerspectiveCp(evalScore: EngineEval, color: "w" | "b"): number {
  const cp = evalScore.mate !== null ? (evalScore.mate > 0 ? MATE_SCORE_CP : -MATE_SCORE_CP) : evalScore.cp ?? 0;
  return color === "w" ? cp : -cp;
}

export function classifyMove(before: EngineEval, after: EngineEval, color: "w" | "b"): MoveQuality {
  const drop = toMoverPerspectiveCp(before, color) - toMoverPerspectiveCp(after, color);
  if (drop > 200) return "blunder";
  if (drop > 100) return "mistake";
  if (drop > 50) return "inaccuracy";
  return "good";
}

const ENGINE_PATH = "/stockfish/stockfish-18-lite-single.js";

export function createStockfishEngine(): Engine {
  const worker = new Worker(ENGINE_PATH);

  const ready = new Promise<void>((resolve) => {
    function onReady(e: MessageEvent<string>) {
      if (e.data === "readyok") {
        worker.removeEventListener("message", onReady);
        resolve();
      }
    }
    worker.addEventListener("message", onReady);
    worker.postMessage("uci");
    worker.postMessage("isready");
  });

  return {
    async evaluateFen(fen: string, depth: number): Promise<EngineEval> {
      await ready;
      return new Promise((resolve) => {
        let lastEval: EngineEval = { cp: null, mate: null };

        function onMessage(e: MessageEvent<string>) {
          const line = e.data;
          const cpMatch = line.match(/score cp (-?\d+)/);
          const mateMatch = line.match(/score mate (-?\d+)/);
          if (cpMatch) lastEval = { cp: Number(cpMatch[1]), mate: null };
          if (mateMatch) lastEval = { cp: null, mate: Number(mateMatch[1]) };
          if (line.startsWith("bestmove")) {
            worker.removeEventListener("message", onMessage);
            resolve(lastEval);
          }
        }

        worker.addEventListener("message", onMessage);
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go depth ${depth}`);
      });
    },
    terminate() {
      worker.terminate();
    },
  };
}
```

- [ ] **Step 4: Run test to verify `classifyMove` passes**

Run: `npx vitest run src/__tests__/lib/chess-analysis.test.ts`
Expected: PASS (6 tests) — `createStockfishEngine` is not exercised by this test file.

- [ ] **Step 5: Commit**

```bash
git add src/lib/chess/analysis.ts src/__tests__/lib/chess-analysis.test.ts
git commit -m "feat: add move-quality classification and Stockfish engine client"
```

---

### Task 4: ChessGameDetail component

**Files:**
- Create: `src/components/chess/chess-game-detail.tsx`
- Test: `src/__tests__/components/chess-game-detail.test.tsx`

The component takes an `engineFactory` prop (defaulting to `createStockfishEngine`) so tests can inject a fake engine instead of spinning up a real Worker.

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/components/chess-game-detail.test.tsx
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
    // before-move evals for: start, after e4, after e5, after Qh5
    const evals: EngineEval[] = [
      { cp: 20, mate: null },
      { cp: 10, mate: null },
      { cp: 0, mate: null },
      { cp: -300, mate: null }, // Qh5 is a known blunder-ish move in this contrived line
    ];
    render(<ChessGameDetail game={GAME} engineFactory={fakeEngine(evals)} />);
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));
    await waitFor(() => expect(screen.getByText("blunder")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/components/chess-game-detail.test.tsx`
Expected: FAIL — `Cannot find module '@/components/chess/chess-game-detail'`

- [ ] **Step 3: Implement the component**

```tsx
// src/components/chess/chess-game-detail.tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/components/chess-game-detail.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/chess/chess-game-detail.tsx src/__tests__/components/chess-game-detail.test.tsx
git commit -m "feat: add ChessGameDetail board, move list, and Analyze button"
```

---

### Task 5: Wire click-to-expand into ChessGameList

**Files:**
- Modify: `src/components/chess/chess-game-list.tsx`
- Modify: `src/__tests__/components/chess-game-list.test.tsx`

- [ ] **Step 1: Write the failing test for the toggle behavior**

Replace the contents of `src/__tests__/components/chess-game-list.test.tsx` with:

```typescript
// src/__tests__/components/chess-game-list.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("expands a game's detail view when its row is clicked, and collapses on a second click", () => {
    render(<ChessGameList games={[GAME]} username="memicysl" />);
    expect(screen.queryByRole("button", { name: /analyze/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /kitzyyan/i }));
    expect(screen.getByRole("button", { name: /analyze/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /kitzyyan/i }));
    expect(screen.queryByRole("button", { name: /analyze/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify the new test fails**

Run: `npx vitest run src/__tests__/components/chess-game-list.test.tsx`
Expected: FAIL on the third test — rows aren't buttons yet, no detail view to expand.

- [ ] **Step 3: Update `ChessGameList` to toggle an expanded row**

Replace the contents of `src/components/chess/chess-game-list.tsx`:

```tsx
// src/components/chess/chess-game-list.tsx
"use client";

import { useState } from "react";
import { deriveResult } from "@/lib/chess/parse";
import type { ChessGame } from "@/lib/chess/types";
import { ChessGameDetail } from "./chess-game-detail";

function opponent(game: ChessGame, username: string): string {
  const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
  return isWhite ? game.black.username : game.white.username;
}

function openingName(pgn: string): string | null {
  const match = pgn.match(/\[ECOUrl "https:\/\/www\.chess\.com\/openings\/([^"]+)"\]/);
  if (!match) return null;
  return match[1].replace(/-/g, " ");
}

export function ChessGameList({ games, username }: { games: ChessGame[]; username: string }) {
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  if (games.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">No games this month.</p>;
  }

  return (
    <ul className="divide-y divide-[var(--surface-border)]">
      {games.map((game) => {
        const result = deriveResult(game, username);
        const opening = openingName(game.pgn);
        const expanded = expandedUrl === game.url;
        return (
          <li key={game.url}>
            <button
              type="button"
              onClick={() => setExpandedUrl(expanded ? null : game.url)}
              className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm"
            >
              <span className="text-[var(--text-primary)]">{opponent(game, username)}</span>
              <span className="text-[var(--text-secondary)]">{game.timeClass}</span>
              {opening && <span className="hidden text-[var(--text-secondary)] sm:inline">{opening}</span>}
              <span
                className={
                  result === "win"
                    ? "text-[var(--accent-solid)]"
                    : result === "loss"
                      ? "text-red-400"
                      : "text-[var(--text-secondary)]"
                }
              >
                {result}
              </span>
            </button>
            {expanded && <ChessGameDetail game={game} />}
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/components/chess-game-list.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/chess/chess-game-list.tsx src/__tests__/components/chess-game-list.test.tsx
git commit -m "feat: expand game detail on row click in ChessGameList"
```

---

### Task 6: Full suite run and manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all chess-related test files pass. (Pre-existing unrelated flakiness in `books-page.test.tsx`, `read-page.test.tsx`, `work-page.test.tsx` — Dexie `DatabaseClosedError` — is a known issue predating this work; don't try to fix it here.)

- [ ] **Step 2: Manual smoke test in the browser**

Run: `npm run dev`, open `/chess` in an authenticated browser session (this app sits behind an auth gate, so it can't be checked headlessly via curl).

Click any game row in the game list:
- Expected: board renders at the final position, move list appears below it, "Analyze" button visible.

Click "prev"/"next":
- Expected: board updates to the FEN at that ply.

Click "Analyze":
- Expected: button shows "Analyzing…", then after a few seconds each move in the list gets a quality tag (blunder/mistake/inaccuracy/good) appended.
- Open the browser console: confirm no errors loading `/stockfish/stockfish-18-lite-single.js` or `.wasm` (404s here mean the engine path or copied files are wrong — re-check Task 1, Step 2).

If the worker fails to load or the UCI protocol assumptions in `analysis.ts` (Step 3 of Task 3) don't match what the engine actually emits, adjust the regexes/message handling in `createStockfishEngine` based on what you observe in the console, then re-test. This is the one piece of this plan validated by hand rather than by an automated test, per the design spec.

- [ ] **Step 3: Confirm no regressions in existing chess functionality**

On `/chess`, confirm the stats card, archive month picker, and game list still work as they did before this plan (ratings show, switching months refetches games, opponent/result/format still correct per row).
