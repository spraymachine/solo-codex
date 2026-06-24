# Chess Stats Feature — Design

## Goal

Pull chess.com stats and game history into the site, with a path to add engine analysis later. No end-to-end SaaS exists that does fetch+analyze+embed in one package, so we integrate chess.com's free Published Data API directly and defer engine analysis to a later phase.

## Data source

chess.com Published Data API — public, no auth, CORS open (`access-control-allow-origin: *`, confirmed via direct request).

Endpoints used:
- `GET https://api.chess.com/pub/player/{username}/stats` — ratings per format (blitz/rapid/bullet/daily), W/L/D record per format.
- `GET https://api.chess.com/pub/player/{username}/games/archives` — list of monthly archive URLs available for the player.
- `GET https://api.chess.com/pub/player/{username}/games/{YYYY}/{MM}` — games (PGN + metadata) for one month.

Default username: `memicysl` (hardcoded constant; not user-configurable in this phase).

## Architecture

Mirrors the existing `books` feature pattern (`src/lib/books/`, `src/app/books/page.tsx`): direct client-side fetch, no server proxy route. No rate-limiting — chess.com API has no documented rate limit for this volume of use, and this feature should not be throttled.

```
src/lib/chess/
  types.ts   — ChessStats, ChessGame, ChessArchiveMonth
  api.ts     — fetchChessStats(username), fetchChessArchives(username), fetchChessGamesForMonth(username, year, month)
  parse.ts   — parseChessStats(raw), parseChessGames(raw) — map chess.com JSON to our types

src/components/chess/
  ChessStatsCard.tsx        — ratings + W/L/D per format
  ChessGameList.tsx         — list of games for the currently selected month
  ChessArchiveBrowser.tsx   — month picker + triggers fetch for that month

src/app/chess/
  page.tsx  — composes the above; loads current month on mount
```

## UI flow

1. On mount, page fetches `stats` for `memicysl` and the current month's games.
2. `ChessStatsCard` renders ratings and win/loss/draw counts per format (blitz/rapid/bullet/daily).
3. `ChessGameList` renders the loaded month's games: opponent, result, format, date, time control.
4. `ChessArchiveBrowser` lets the user pick a different year/month from the `archives` list; picking a month triggers a fresh fetch for that month only (lazy, not all-months-upfront).
5. Clicking a game row expands a summary: opening name (parsed from PGN tags), result, accuracy if chess.com's metadata includes it for that game type.

## Error handling

- Username not found / chess.com 404 → show "no chess.com profile found for memicysl" message, no crash.
- Network failure → show inline retry affordance, don't blank the page.
- Empty archive month (no games) → show "no games this month" empty state.

## Out of scope / Phase 2

Move-by-move engine analysis is explicitly deferred:
- Run `stockfish.wasm` client-side in a Web Worker, lazily loaded only when the user clicks "Analyze" on a selected game.
- Render per-move eval as a graph alongside the board.
- No server-side Stockfish — keeps this consistent with the no-server-route approach used for data fetching.

This phase ships stats + game archive browsing only.

## Testing

- Unit tests for `parse.ts` (mirrors `src/lib/books/parse.ts` test pattern): malformed/missing fields, empty archives, empty games array.
- Component test for `ChessStatsCard` rendering with mocked stats payload.
