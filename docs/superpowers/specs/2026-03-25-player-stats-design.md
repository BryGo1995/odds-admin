# Player Stats & Odds Feature — Design Spec

**Date:** 2026-03-25
**Status:** Approved

---

## Overview

Add a Players section to odds-admin that lets users browse active NBA players and view their bookmaker prop lines alongside their per-game stats history. Players are filtered to those who are currently active or have game log entries in the 2025-26 season.

---

## Goals

- Provide a searchable player list scoped to active/current-season players
- Show bookmaker prop cards (points, rebounds, assists lines) per player
- Show a filterable per-game stats log for each player across multiple seasons

---

## Architecture

### Routing

Add `react-router-dom`. Three routes:

| Path | Component |
|---|---|
| `/` | `GamesPage` (existing) |
| `/players` | `PlayersPage` |
| `/players/:id` | `PlayerDetailPage` |

The existing navbar "Games" tab and the new "Players" tab become `<Link>` components that highlight based on the active route. The previously disabled "Raw Data" tab remains disabled.

---

## Backend

### New SQLAlchemy Models (`api/models.py`)

**`Player`** — maps the `players` table:
```
player_id         INT  (PK)
full_name         TEXT
position          TEXT
team_id           INT
team_abbreviation TEXT
is_active         BOOLEAN
fetched_at        TIMESTAMPTZ
```

**`PlayerGameLog`** — maps the `player_game_logs` table:
```
id               SERIAL (PK)
player_id        INT (FK → players.player_id)
nba_game_id      TEXT
season           TEXT
game_date        DATE
matchup          TEXT
wl               TEXT
min              FLOAT
fga              INT
fta              INT
usg_pct          FLOAT
pts              INT
reb              INT
ast              INT
blk              INT
stl              INT
plus_minus       INT
fetched_at       TIMESTAMPTZ
```

---

### New Pydantic Schemas (`api/schemas.py`)

- **`PlayerListItem`**: player_id, full_name, position, team_abbreviation
- **`PlayerGameLogItem`**: all per-game stat columns (game_date, matchup, wl, min, fga, fta, usg_pct, pts, reb, ast, blk, stl, plus_minus)
- Existing `PlayerPropItem` reused for props responses

---

### New Router (`api/routers/players.py`)

Registered at `/api/players` prefix.

**`GET /api/players`**
Returns players where `is_active = true` OR have at least one `player_game_logs` row with `season = '2025-26'`. Ordered by `full_name` ASC.

**`GET /api/players/{player_id}`**
Returns a single player by player_id. Returns 404 if not found. Used by `PlayerDetailPage` to populate the header when navigating directly to the URL.

**`GET /api/players/{player_id}/props`**
Returns the most recent props per bookmaker/prop_type for the given player. Joins `player_props` via `player_props.nba_player_id = player_id`. Ordered by bookmaker, prop_type.

**`GET /api/players/{player_id}/game-logs`**
Query param: `season` (optional string, defaults to `2025-26`).
Returns all game log rows for the player in that season, ordered by `game_date DESC`.

---

## Frontend

### New Pages

**`PlayersPage`** (`web/src/pages/PlayersPage.tsx`):
- Fetches player list on mount via `fetchPlayers()`
- Text input at the top for client-side name filtering
- Player rows: name, position, team abbreviation
- Clicking a row navigates to `/players/:id`

**`PlayerDetailPage`** (`web/src/pages/PlayerDetailPage.tsx`):
- Reads `:id` from route params
- On mount, fetches props and game logs in parallel
- **Header**: player name, position, team abbreviation
- **Bookmaker prop cards** (top): one card per bookmaker showing their prop lines for the player (prop type, line, over/under price). Styled consistently with existing odds/props UI.
- **Filter bar**: season selector (2025-26, 2024-25, 2023-24) + quick-select for last 5 / last 10 / last 20 / all games + stat category selector (All, Points, Rebounds, Assists). Changing season triggers a new `fetchPlayerGameLogs(id, season)` call; last-N and stat category are client-side only.
- **Stats table**: columns — Date, Matchup, W/L, MIN, PTS, REB, AST, BLK, STL, USG%, +/-. Filtered client-side by the last-N quick select. When a stat category is selected, the corresponding column (PTS, REB, or AST) is visually highlighted.

---

### Updated Components

**`App.tsx`**: wrap with `BrowserRouter`, define routes, update navbar tabs to `<Link>` with active state.

---

### New API Client Functions (`web/src/api/client.ts`)

```typescript
fetchPlayers(): Promise<PlayerListItem[]>
fetchPlayer(playerId: number): Promise<PlayerListItem>
fetchPlayerProps(playerId: number): Promise<PlayerPropItem[]>
fetchPlayerGameLogs(playerId: number, season?: string): Promise<PlayerGameLogItem[]>
```

New TypeScript interfaces: `PlayerListItem`, `PlayerGameLogItem`. `PlayerPropItem` already exists.

---

## Data Flow

```
PlayersPage mounts
  → fetchPlayers() → render list with name filter

User clicks player → navigate to /players/:id
  → PlayerDetailPage mounts
  → parallel: fetchPlayerProps(id) + fetchPlayerGameLogs(id, '2025-26')
  → render prop cards + stats table

User changes season selector
  → fetchPlayerGameLogs(id, selectedSeason)
  → re-render stats table

User clicks last-5/10/20 filter
  → client-side slice of already-fetched game logs
  → re-render stats table (no new fetch)
```

---

## Error Handling

- Player not found (404 on detail page): show a "Player not found" message with a back link
- Props fetch returns empty: show "No props available" in the cards section
- Game logs fetch returns empty: show "No stats available for this season"

---

## Testing

Follow the existing test patterns in `tests/`:
- `test_players.py`: list endpoint (empty, active-only, current-season-only, combined), props endpoint (empty, with data), game-logs endpoint (default season, explicit season param)
- Schema validation for `PlayerListItem` and `PlayerGameLogItem` in `test_schemas.py`
