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
