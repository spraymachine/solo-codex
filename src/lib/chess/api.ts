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
