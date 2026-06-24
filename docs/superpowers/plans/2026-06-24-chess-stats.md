# Chess Stats Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/chess` page that pulls chess.com stats and game history for `memicysl` via the public chess.com Published Data API, displayed via direct client-side fetch (no server route, no rate-limiter), mirroring the existing `books` feature's structure.

**Architecture:** `src/lib/chess/` holds types, parse functions (pure, unit-tested), and fetch wrappers. `src/components/chess/` holds presentational components composed in a single `chess-page.tsx`. `src/app/chess/page.tsx` is a thin client wrapper, same as `src/app/books/page.tsx`. Engine analysis (Stockfish) is explicitly out of scope — see spec `docs/superpowers/specs/2026-06-24-chess-stats-design.md`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 (CSS vars per existing convention), Vitest + Testing Library.

---

## File Structure

```
src/lib/chess/
  types.ts    — ChessFormatStats, ChessGame, ChessArchiveMonth
  parse.ts    — parseChessStats, parseChessArchives, parseChessGames, deriveResult
  api.ts      — fetchChessStats, fetchChessArchives, fetchChessGamesForMonth, DEFAULT_CHESS_USERNAME

src/components/chess/
  chess-stats-card.tsx     — ratings + W/L/D per format
  chess-game-list.tsx      — list of games for selected month, expandable row
  chess-archive-browser.tsx — month picker built from archive list
  chess-page.tsx           — composes the above, owns fetch/selection state

src/app/chess/page.tsx     — thin client route wrapper

src/__tests__/lib/chess-parse.test.ts
src/__tests__/components/chess-stats-card.test.tsx
src/__tests__/components/chess-game-list.test.tsx
src/__tests__/components/chess-archive-browser.test.tsx

src/components/layout/site-header.tsx — add nav entry (modify)
```

---

### Task 1: Chess types and parse functions

**Files:**
- Create: `src/lib/chess/types.ts`
- Create: `src/lib/chess/parse.ts`
- Test: `src/__tests__/lib/chess-parse.test.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/lib/chess/types.ts
export type ChessTimeClass = "daily" | "rapid" | "blitz" | "bullet";

export interface ChessFormatStats {
  format: ChessTimeClass;
  rating: number | null;
  wins: number;
  losses: number;
  draws: number;
}

export interface ChessPlayerSide {
  username: string;
  rating: number;
  result: string;
}

export interface ChessGame {
  url: string;
  pgn: string;
  endTime: number;
  timeClass: ChessTimeClass;
  white: ChessPlayerSide;
  black: ChessPlayerSide;
}

export interface ChessArchiveMonth {
  year: number;
  month: number;
  url: string;
}

export type ChessGameOutcome = "win" | "loss" | "draw";
```

- [ ] **Step 2: Write the failing test for `parseChessStats`**

```typescript
// src/__tests__/lib/chess-parse.test.ts
import { describe, expect, it } from "vitest";
import { parseChessStats, parseChessArchives, parseChessGames, deriveResult } from "@/lib/chess/parse";

describe("parseChessStats", () => {
  it("maps known formats with rating and record", () => {
    const payload = {
      chess_daily: { last: { rating: 400 }, record: { win: 1, loss: 0, draw: 0 } },
      chess_rapid: { last: { rating: 407 }, record: { win: 164, loss: 167, draw: 14 } },
      chess_blitz: { last: { rating: 232 }, record: { win: 7, loss: 9, draw: 0 } },
      fide: 0,
      tactics: {},
    };
    expect(parseChessStats(payload)).toEqual([
      { format: "daily", rating: 400, wins: 1, losses: 0, draws: 0 },
      { format: "rapid", rating: 407, wins: 164, losses: 167, draws: 14 },
      { format: "blitz", rating: 232, wins: 7, losses: 9, draws: 0 },
    ]);
  });

  it("skips formats the player has never played", () => {
    expect(parseChessStats({ chess_rapid: { last: { rating: 100 }, record: { win: 1, loss: 0, draw: 0 } } })).toEqual([
      { format: "rapid", rating: 100, wins: 1, losses: 0, draws: 0 },
    ]);
  });

  it("returns [] for malformed payloads", () => {
    expect(parseChessStats(null)).toEqual([]);
    expect(parseChessStats({})).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/chess-parse.test.ts`
Expected: FAIL — `Cannot find module '@/lib/chess/parse'` (file doesn't exist yet)

- [ ] **Step 4: Implement `parseChessStats`**

```typescript
// src/lib/chess/parse.ts
import type { ChessArchiveMonth, ChessFormatStats, ChessGame, ChessGameOutcome, ChessTimeClass } from "@/lib/chess/types";

const FORMAT_KEYS: { key: string; format: ChessTimeClass }[] = [
  { key: "chess_daily", format: "daily" },
  { key: "chess_rapid", format: "rapid" },
  { key: "chess_blitz", format: "blitz" },
  { key: "chess_bullet", format: "bullet" },
];

export function parseChessStats(payload: unknown): ChessFormatStats[] {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as Record<string, unknown>;

  return FORMAT_KEYS.flatMap(({ key, format }) => {
    const entry = data[key];
    if (!entry || typeof entry !== "object") return [];
    const last = (entry as Record<string, unknown>).last as Record<string, unknown> | undefined;
    const record = (entry as Record<string, unknown>).record as Record<string, unknown> | undefined;
    if (!record) return [];

    return [
      {
        format,
        rating: typeof last?.rating === "number" ? last.rating : null,
        wins: typeof record.win === "number" ? record.win : 0,
        losses: typeof record.loss === "number" ? record.loss : 0,
        draws: typeof record.draw === "number" ? record.draw : 0,
      },
    ];
  });
}
```

- [ ] **Step 5: Run test to verify `parseChessStats` passes**

Run: `npx vitest run src/__tests__/lib/chess-parse.test.ts`
Expected: 3 passing in the `parseChessStats` describe block, remaining suites still failing (functions not defined yet)

- [ ] **Step 6: Add the failing tests for `parseChessArchives`**

Add to `src/__tests__/lib/chess-parse.test.ts`:

```typescript
describe("parseChessArchives", () => {
  it("extracts year/month from archive URLs, oldest first preserved as given", () => {
    const payload = {
      archives: [
        "https://api.chess.com/pub/player/memicysl/games/2022/08",
        "https://api.chess.com/pub/player/memicysl/games/2026/06",
      ],
    };
    expect(parseChessArchives(payload)).toEqual([
      { year: 2022, month: 8, url: "https://api.chess.com/pub/player/memicysl/games/2022/08" },
      { year: 2026, month: 6, url: "https://api.chess.com/pub/player/memicysl/games/2026/06" },
    ]);
  });

  it("returns [] for malformed payloads", () => {
    expect(parseChessArchives(null)).toEqual([]);
    expect(parseChessArchives({ archives: "not-an-array" })).toEqual([]);
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/chess-parse.test.ts`
Expected: FAIL — `parseChessArchives is not a function`

- [ ] **Step 8: Implement `parseChessArchives`**

```typescript
// add to src/lib/chess/parse.ts
export function parseChessArchives(payload: unknown): ChessArchiveMonth[] {
  if (!payload || typeof payload !== "object") return [];
  const archives = (payload as Record<string, unknown>).archives;
  if (!Array.isArray(archives)) return [];

  return archives
    .filter((url): url is string => typeof url === "string")
    .map((url) => {
      const match = url.match(/\/games\/(\d{4})\/(\d{2})$/);
      if (!match) return null;
      return { year: Number(match[1]), month: Number(match[2]), url };
    })
    .filter((entry): entry is ChessArchiveMonth => entry !== null);
}
```

- [ ] **Step 9: Run test to verify `parseChessArchives` passes**

Run: `npx vitest run src/__tests__/lib/chess-parse.test.ts`
Expected: `parseChessStats` and `parseChessArchives` suites pass

- [ ] **Step 10: Add the failing tests for `parseChessGames` and `deriveResult`**

Add to `src/__tests__/lib/chess-parse.test.ts`:

```typescript
describe("parseChessGames", () => {
  it("maps games to our shape", () => {
    const payload = {
      games: [
        {
          url: "https://www.chess.com/game/live/169564389352",
          pgn: "[Event \"Live Chess\"]\n\n1. e4 e5 0-1\n",
          end_time: 1780336914,
          time_class: "rapid",
          white: { username: "memicysl", rating: 293, result: "resigned" },
          black: { username: "Kitzyyan", rating: 296, result: "win" },
        },
      ],
    };
    expect(parseChessGames(payload)).toEqual([
      {
        url: "https://www.chess.com/game/live/169564389352",
        pgn: "[Event \"Live Chess\"]\n\n1. e4 e5 0-1\n",
        endTime: 1780336914,
        timeClass: "rapid",
        white: { username: "memicysl", rating: 293, result: "resigned" },
        black: { username: "Kitzyyan", rating: 296, result: "win" },
      },
    ]);
  });

  it("returns [] for malformed payloads", () => {
    expect(parseChessGames(null)).toEqual([]);
    expect(parseChessGames({ games: "nope" })).toEqual([]);
  });
});

describe("deriveResult", () => {
  const game = {
    url: "x",
    pgn: "x",
    endTime: 0,
    timeClass: "rapid" as const,
    white: { username: "memicysl", rating: 293, result: "resigned" },
    black: { username: "Kitzyyan", rating: 296, result: "win" },
  };

  it("returns loss when our side's result is not win", () => {
    expect(deriveResult(game, "memicysl")).toBe("loss");
  });

  it("returns win when our side's result is win", () => {
    const flipped = { ...game, white: { ...game.white, result: "win" }, black: { ...game.black, result: "resigned" } };
    expect(deriveResult(flipped, "memicysl")).toBe("win");
  });

  it("returns draw for drawn results", () => {
    const drawn = { ...game, white: { ...game.white, result: "agreed" }, black: { ...game.black, result: "agreed" } };
    expect(deriveResult(drawn, "memicysl")).toBe("draw");
  });
});
```

- [ ] **Step 11: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/chess-parse.test.ts`
Expected: FAIL — `parseChessGames is not a function`

- [ ] **Step 12: Implement `parseChessGames` and `deriveResult`**

```typescript
// add to src/lib/chess/parse.ts
const DRAW_RESULTS = new Set(["agreed", "repetition", "stalemate", "insufficient", "50move", "timevsinsufficient"]);

export function parseChessGames(payload: unknown): ChessGame[] {
  if (!payload || typeof payload !== "object") return [];
  const games = (payload as Record<string, unknown>).games;
  if (!Array.isArray(games)) return [];

  return games
    .map((raw) => {
      const g = raw as Record<string, unknown>;
      const white = g.white as Record<string, unknown> | undefined;
      const black = g.black as Record<string, unknown> | undefined;
      if (!white || !black || typeof g.url !== "string" || typeof g.pgn !== "string") return null;

      return {
        url: g.url,
        pgn: g.pgn,
        endTime: typeof g.end_time === "number" ? g.end_time : 0,
        timeClass: (typeof g.time_class === "string" ? g.time_class : "rapid") as ChessGame["timeClass"],
        white: {
          username: typeof white.username === "string" ? white.username : "",
          rating: typeof white.rating === "number" ? white.rating : 0,
          result: typeof white.result === "string" ? white.result : "",
        },
        black: {
          username: typeof black.username === "string" ? black.username : "",
          rating: typeof black.rating === "number" ? black.rating : 0,
          result: typeof black.result === "string" ? black.result : "",
        },
      };
    })
    .filter((g): g is ChessGame => g !== null);
}

export function deriveResult(game: ChessGame, username: string): ChessGameOutcome {
  const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
  const ourResult = isWhite ? game.white.result : game.black.result;
  if (ourResult === "win") return "win";
  if (DRAW_RESULTS.has(ourResult)) return "draw";
  return "loss";
}
```

- [ ] **Step 13: Run full test file to verify everything passes**

Run: `npx vitest run src/__tests__/lib/chess-parse.test.ts`
Expected: all suites pass

- [ ] **Step 14: Commit**

```bash
git add src/lib/chess/types.ts src/lib/chess/parse.ts src/__tests__/lib/chess-parse.test.ts
git commit -m "feat: add chess.com data types and parsers"
```

---

### Task 2: Chess API fetch wrappers

**Files:**
- Create: `src/lib/chess/api.ts`

No new test file — these are thin fetch wrappers around the already-tested parse functions, calling the real chess.com endpoints confirmed CORS-open (`access-control-allow-origin: *`) in the design spec. Matches `src/lib/books/search.ts`, which also has no dedicated test file.

- [ ] **Step 1: Implement the fetch wrappers**

```typescript
// src/lib/chess/api.ts
import { parseChessArchives, parseChessGames, parseChessStats } from "@/lib/chess/parse";
import type { ChessArchiveMonth, ChessFormatStats, ChessGame } from "@/lib/chess/types";

export const DEFAULT_CHESS_USERNAME = "memicysl";

const BASE_URL = "https://api.chess.com/pub/player";

export async function fetchChessStats(username: string): Promise<ChessFormatStats[]> {
  const res = await fetch(`${BASE_URL}/${username}/stats`);
  if (!res.ok) return [];
  return parseChessStats(await res.json());
}

export async function fetchChessArchives(username: string): Promise<ChessArchiveMonth[]> {
  const res = await fetch(`${BASE_URL}/${username}/games/archives`);
  if (!res.ok) return [];
  return parseChessArchives(await res.json());
}

export async function fetchChessGamesForMonth(username: string, year: number, month: number): Promise<ChessGame[]> {
  const paddedMonth = String(month).padStart(2, "0");
  const res = await fetch(`${BASE_URL}/${username}/games/${year}/${paddedMonth}`);
  if (!res.ok) return [];
  return parseChessGames(await res.json());
}
```

- [ ] **Step 2: Sanity check against the live API**

Run: `npx tsx -e "import('./src/lib/chess/api.ts').then(async (m) => { console.log(await m.fetchChessStats('memicysl')); })"`

(If `tsx` isn't installed, instead temporarily call these functions from a scratch test and run via vitest, then delete the scratch test — do not commit a live-network test.)

Expected: an array of `ChessFormatStats` objects with real ratings for `memicysl` (e.g. `rapid` rating around 400s) — confirms the live endpoint and parser work end-to-end.

- [ ] **Step 3: Commit**

```bash
git add src/lib/chess/api.ts
git commit -m "feat: add chess.com fetch wrappers"
```

---

### Task 3: ChessStatsCard component

**Files:**
- Create: `src/components/chess/chess-stats-card.tsx`
- Test: `src/__tests__/components/chess-stats-card.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/components/chess-stats-card.test.tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/components/chess-stats-card.test.tsx`
Expected: FAIL — `Cannot find module '@/components/chess/chess-stats-card'`

- [ ] **Step 3: Implement the component**

```tsx
// src/components/chess/chess-stats-card.tsx
"use client";

import type { ChessFormatStats } from "@/lib/chess/types";

export function ChessStatsCard({ stats }: { stats: ChessFormatStats[] }) {
  if (stats.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel)] p-4 text-sm text-[var(--text-secondary)]">
        No rated games yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.format} className="rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel)] p-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">{s.format}</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{s.rating ?? "—"}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {s.wins}W {s.losses}L {s.draws}D
          </p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/components/chess-stats-card.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/chess/chess-stats-card.tsx src/__tests__/components/chess-stats-card.test.tsx
git commit -m "feat: add ChessStatsCard component"
```

---

### Task 4: ChessGameList component

**Files:**
- Create: `src/components/chess/chess-game-list.tsx`
- Test: `src/__tests__/components/chess-game-list.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/components/chess-game-list.test.tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/components/chess-game-list.test.tsx`
Expected: FAIL — `Cannot find module '@/components/chess/chess-game-list'`

- [ ] **Step 3: Implement the component**

```tsx
// src/components/chess/chess-game-list.tsx
"use client";

import { deriveResult } from "@/lib/chess/parse";
import type { ChessGame } from "@/lib/chess/types";

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
  if (games.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">No games this month.</p>;
  }

  return (
    <ul className="divide-y divide-[var(--surface-border)]">
      {games.map((game) => {
        const result = deriveResult(game, username);
        const opening = openingName(game.pgn);
        return (
          <li key={game.url} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="text-[var(--text-primary)]">{opponent(game, username)}</span>
            <span className="text-[var(--text-secondary)]">{game.timeClass}</span>
            {opening && <span className="hidden text-[var(--text-secondary)] sm:inline">{opening}</span>}
            <span
              className={
                result === "win" ? "text-[var(--accent-solid)]" : result === "loss" ? "text-red-400" : "text-[var(--text-secondary)]"
              }
            >
              {result}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/components/chess-game-list.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/chess/chess-game-list.tsx src/__tests__/components/chess-game-list.test.tsx
git commit -m "feat: add ChessGameList component"
```

---

### Task 5: ChessArchiveBrowser component

**Files:**
- Create: `src/components/chess/chess-archive-browser.tsx`
- Test: `src/__tests__/components/chess-archive-browser.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/components/chess-archive-browser.test.tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/components/chess-archive-browser.test.tsx`
Expected: FAIL — `Cannot find module '@/components/chess/chess-archive-browser'`

- [ ] **Step 3: Implement the component**

```tsx
// src/components/chess/chess-archive-browser.tsx
"use client";

import type { ChessArchiveMonth } from "@/lib/chess/types";

function key(m: { year: number; month: number }): string {
  return `${m.year}-${String(m.month).padStart(2, "0")}`;
}

export function ChessArchiveBrowser({
  months,
  selected,
  onSelect,
}: {
  months: ChessArchiveMonth[];
  selected: { year: number; month: number };
  onSelect: (month: { year: number; month: number }) => void;
}) {
  const sorted = [...months].sort((a, b) => key(b).localeCompare(key(a)));

  return (
    <select
      className="rounded-md border border-[var(--surface-border)] bg-[var(--bg-panel)] px-2 py-1 text-sm text-[var(--text-primary)]"
      value={key(selected)}
      onChange={(e) => {
        const [year, month] = e.target.value.split("-").map(Number);
        onSelect({ year, month });
      }}
    >
      {sorted.map((m) => (
        <option key={key(m)} value={key(m)}>
          {key(m)}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/components/chess-archive-browser.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/chess/chess-archive-browser.tsx src/__tests__/components/chess-archive-browser.test.tsx
git commit -m "feat: add ChessArchiveBrowser component"
```

---

### Task 6: ChessPage composition, route, and nav link

**Files:**
- Create: `src/components/chess/chess-page.tsx`
- Create: `src/app/chess/page.tsx`
- Modify: `src/components/layout/site-header.tsx:44-48`

No new test file for `chess-page.tsx` — it's a thin data-fetching composition (mirrors `src/components/books/books-page.tsx`, which also has its own dedicated store-backed test via `books-page.test.tsx` covering the store, not raw fetch orchestration; here there's no store, so manual smoke-test in Step 4 stands in).

- [ ] **Step 1: Implement `chess-page.tsx`**

```tsx
// src/components/chess/chess-page.tsx
"use client";

import { useEffect, useState } from "react";
import { DEFAULT_CHESS_USERNAME, fetchChessArchives, fetchChessGamesForMonth, fetchChessStats } from "@/lib/chess/api";
import type { ChessArchiveMonth, ChessFormatStats, ChessGame } from "@/lib/chess/types";
import { ChessStatsCard } from "./chess-stats-card";
import { ChessArchiveBrowser } from "./chess-archive-browser";
import { ChessGameList } from "./chess-game-list";

export function ChessPage() {
  const [stats, setStats] = useState<ChessFormatStats[]>([]);
  const [archives, setArchives] = useState<ChessArchiveMonth[]>([]);
  const [selected, setSelected] = useState<{ year: number; month: number } | null>(null);
  const [games, setGames] = useState<ChessGame[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statsRes, archivesRes] = await Promise.all([
          fetchChessStats(DEFAULT_CHESS_USERNAME),
          fetchChessArchives(DEFAULT_CHESS_USERNAME),
        ]);
        if (cancelled) return;
        setStats(statsRes);
        setArchives(archivesRes);
        const latest = archivesRes[archivesRes.length - 1];
        if (latest) setSelected({ year: latest.year, month: latest.month });
      } catch {
        if (!cancelled) setError(`No chess.com profile found for ${DEFAULT_CHESS_USERNAME}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchChessGamesForMonth(DEFAULT_CHESS_USERNAME, selected.year, selected.month);
        if (!cancelled) setGames(res);
      } catch {
        if (!cancelled) setError("Couldn't load games for that month.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  if (error) {
    return <p className="p-6 text-sm text-red-400">{error}</p>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Chess — {DEFAULT_CHESS_USERNAME}</h1>
      <ChessStatsCard stats={stats} />
      {selected && archives.length > 0 && <ChessArchiveBrowser months={archives} selected={selected} onSelect={setSelected} />}
      <ChessGameList games={games} username={DEFAULT_CHESS_USERNAME} />
    </div>
  );
}
```

- [ ] **Step 2: Implement the route**

```tsx
// src/app/chess/page.tsx
"use client";

import { ChessPage } from "@/components/chess/chess-page";

export default function ChessRoute() {
  return <ChessPage />;
}
```

- [ ] **Step 3: Add the nav link**

In `src/components/layout/site-header.tsx`, update the `NAV` array (line ~44):

```typescript
const NAV = [
  { href: "/", label: "Dashboard", glyph: "⬡" },
  { href: "/books", label: "Books", glyph: "▥" },
  { href: "/words", label: "Words", glyph: "▣" },
  { href: "/work", label: "Work", glyph: "▦" },
  { href: "/chess", label: "Chess", glyph: "♞" },
```

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`, open `http://localhost:3000/chess`.
Expected: page shows real ratings/W-L-D for `memicysl` (rapid rating in the 400s range, per the live API checked during design), a month dropdown defaulting to the latest archive month, and a game list for that month. Switching the dropdown re-fetches and re-renders the list.

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including the new chess suites

- [ ] **Step 6: Commit**

```bash
git add src/components/chess/chess-page.tsx src/app/chess/page.tsx src/components/layout/site-header.tsx
git commit -m "feat: add /chess page wiring stats, archive browser, and game list"
```

---

## Out of scope (do not implement here)

Stockfish move-by-move analysis is phase 2, per the design spec. Do not add `stockfish.wasm`, Web Workers, or an "Analyze" button in this plan.
