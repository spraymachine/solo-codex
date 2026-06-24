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
