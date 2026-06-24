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
