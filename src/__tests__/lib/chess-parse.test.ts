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
