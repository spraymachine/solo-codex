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
