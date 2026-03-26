# Player Stats & Odds Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Players tab to odds-admin where users can browse active NBA players and view each player's bookmaker prop cards and filterable per-game stats history.

**Architecture:** New backend models (`Player`, `PlayerGameLog`) and a `players` router expose four endpoints. The frontend adds `react-router-dom` for a `/players` list page and `/players/:id` detail page with bookmaker prop cards and a season/last-N/stat-category filtered stats table.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 (async), Pydantic v2, pytest-asyncio, React 18, TypeScript, Vite, Tailwind CSS, react-router-dom v6

---

## File Map

**Backend — modified:**
- `api/models.py` — add `Player`, `PlayerGameLog` models; add `nba_player_id` column to `PlayerProp`
- `api/schemas.py` — add `PlayerListItem`, `PlayerGameLogItem`
- `api/main.py` — register players router

**Backend — new:**
- `api/routers/players.py` — 4 endpoints: list, get-one, props, game-logs

**Tests — modified:**
- `tests/test_schemas.py` — add `PlayerListItem` and `PlayerGameLogItem` tests

**Tests — new:**
- `tests/test_players.py` — router tests for all 4 endpoints

**Frontend — modified:**
- `web/package.json` — add `react-router-dom`
- `web/src/App.tsx` — `BrowserRouter`, `Routes`, navbar `Link` components
- `web/src/api/client.ts` — add `PlayerListItem`, `PlayerGameLogItem` types and 4 fetch functions

**Frontend — new:**
- `web/src/pages/PlayersPage.tsx` — searchable player list
- `web/src/pages/PlayerDetailPage.tsx` — bookmaker prop cards + filterable stats table

---

## Task 1: Add PlayerListItem and PlayerGameLogItem schemas (TDD)

**Files:**
- Modify: `tests/test_schemas.py`
- Modify: `api/schemas.py`

- [ ] **Step 1: Write failing schema tests**

Append to `tests/test_schemas.py`:

```python
from datetime import date
from api.schemas import PlayerListItem, PlayerGameLogItem


def test_player_list_item():
    item = PlayerListItem(
        player_id=2544,
        full_name="LeBron James",
        position="F",
        team_abbreviation="LAL",
    )
    assert item.player_id == 2544
    assert item.full_name == "LeBron James"
    assert item.position == "F"
    assert item.team_abbreviation == "LAL"


def test_player_list_item_nullable_fields():
    item = PlayerListItem(
        player_id=1234,
        full_name="Mystery Player",
        position=None,
        team_abbreviation=None,
    )
    assert item.position is None


def test_player_game_log_item():
    item = PlayerGameLogItem(
        game_date=date(2026, 3, 20),
        matchup="LAL vs. GSW",
        wl="W",
        min=34.5,
        fga=14,
        fta=6,
        usg_pct=0.285,
        pts=28,
        reb=8,
        ast=7,
        blk=1,
        stl=2,
        plus_minus=12,
    )
    assert item.pts == 28
    assert item.game_date == date(2026, 3, 20)
    assert item.wl == "W"


def test_player_game_log_item_nullable_stats():
    item = PlayerGameLogItem(
        game_date=date(2026, 3, 20),
        matchup=None,
        wl=None,
        min=None,
        fga=None,
        fta=None,
        usg_pct=None,
        pts=None,
        reb=None,
        ast=None,
        blk=None,
        stl=None,
        plus_minus=None,
    )
    assert item.pts is None
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
cd /home/bryang/Dev_Space/python_projects/odds-admin
pytest tests/test_schemas.py -v -k "player_list_item or player_game_log"
```

Expected: `ImportError` or `FAILED` — `PlayerListItem` and `PlayerGameLogItem` do not exist yet.

- [ ] **Step 3: Add schemas to api/schemas.py**

Add this import at the top of `api/schemas.py` (change the existing datetime import line):

```python
from datetime import datetime, timezone, date
```

Append to the end of `api/schemas.py`:

```python
class PlayerListItem(_Base):
    player_id: int
    full_name: str
    position: str | None
    team_abbreviation: str | None


class PlayerGameLogItem(_Base):
    game_date: date
    matchup: str | None
    wl: str | None
    min: float | None
    fga: int | None
    fta: int | None
    usg_pct: float | None
    pts: int | None
    reb: int | None
    ast: int | None
    blk: int | None
    stl: int | None
    plus_minus: int | None
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
pytest tests/test_schemas.py -v
```

Expected: All tests PASS (including the existing ones).

- [ ] **Step 5: Commit**

```bash
git add tests/test_schemas.py api/schemas.py
git commit -m "feat: add PlayerListItem and PlayerGameLogItem schemas"
```

---

## Task 2: Add Player and PlayerGameLog models + nba_player_id on PlayerProp

**Files:**
- Modify: `api/models.py`

- [ ] **Step 1: Update imports and add new models**

Change the top of `api/models.py` to:

```python
from decimal import Decimal
from datetime import datetime, date
from sqlalchemy import String, Integer, Numeric, Boolean, DateTime, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from api.database import Base
```

Append `Player` and `PlayerGameLog` to the end of `api/models.py`:

```python
class Player(Base):
    __tablename__ = "players"

    player_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200))
    position: Mapped[str | None] = mapped_column(String(10))
    team_id: Mapped[int | None] = mapped_column(Integer)
    team_abbreviation: Mapped[str | None] = mapped_column(String(10))
    is_active: Mapped[bool | None] = mapped_column(Boolean)
    fetched_at: Mapped[datetime] = mapped_column(DateTime)


class PlayerGameLog(Base):
    __tablename__ = "player_game_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    player_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("players.player_id")
    )
    nba_game_id: Mapped[str] = mapped_column(String(50))
    season: Mapped[str] = mapped_column(String(20))
    game_date: Mapped[date] = mapped_column(Date)
    matchup: Mapped[str | None] = mapped_column(String(50))
    wl: Mapped[str | None] = mapped_column(String(1))
    min: Mapped[float | None] = mapped_column(Numeric(6, 2))
    fga: Mapped[int | None] = mapped_column(Integer)
    fta: Mapped[int | None] = mapped_column(Integer)
    usg_pct: Mapped[float | None] = mapped_column(Numeric(6, 3))
    pts: Mapped[int | None] = mapped_column(Integer)
    reb: Mapped[int | None] = mapped_column(Integer)
    ast: Mapped[int | None] = mapped_column(Integer)
    blk: Mapped[int | None] = mapped_column(Integer)
    stl: Mapped[int | None] = mapped_column(Integer)
    plus_minus: Mapped[int | None] = mapped_column(Integer)
    fetched_at: Mapped[datetime] = mapped_column(DateTime)
```

Also add `nba_player_id` to the existing `PlayerProp` class (after the `fetched_at` line):

```python
    nba_player_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("players.player_id")
    )
```

- [ ] **Step 2: Verify existing tests still pass**

```bash
pytest tests/ -v
```

Expected: All existing tests PASS. The new models are picked up by `Base.metadata.create_all` in conftest automatically.

- [ ] **Step 3: Commit**

```bash
git add api/models.py
git commit -m "feat: add Player and PlayerGameLog models, nba_player_id on PlayerProp"
```

---

## Task 3: Write player router tests

**Files:**
- Create: `tests/test_players.py`

- [ ] **Step 1: Create tests/test_players.py**

```python
from datetime import datetime, date
from api.models import Player, PlayerProp, PlayerGameLog


# ── helpers ──────────────────────────────────────────────────────────────────

def _player(player_id: int, full_name: str, is_active: bool, **kwargs) -> Player:
    return Player(
        player_id=player_id,
        full_name=full_name,
        is_active=is_active,
        fetched_at=datetime(2026, 3, 25, 6, 0),
        **kwargs,
    )


def _game_log(player_id: int, season: str, game_date: date) -> PlayerGameLog:
    return PlayerGameLog(
        player_id=player_id,
        nba_game_id=f"nba_{player_id}_{game_date}",
        season=season,
        game_date=game_date,
        matchup="LAL vs. GSW",
        wl="W",
        min=32.0,
        pts=22,
        reb=5,
        ast=8,
        blk=1,
        stl=1,
        fga=12,
        fta=4,
        usg_pct=0.28,
        plus_minus=10,
        fetched_at=datetime(2026, 3, 25, 6, 0),
    )


def _prop(player_id: int, bookmaker: str, prop_type: str, outcome: str,
          point: float, price: float, fetched_at: datetime) -> PlayerProp:
    return PlayerProp(
        game_id="g1",
        bookmaker=bookmaker,
        player_name="Test Player",
        prop_type=prop_type,
        outcome=outcome,
        price=price,
        point=point,
        nba_player_id=player_id,
        fetched_at=fetched_at,
    )


# ── GET /api/players ──────────────────────────────────────────────────────────

async def test_list_players_empty(client):
    response = await client.get("/api/players")
    assert response.status_code == 200
    assert response.json() == []


async def test_list_players_includes_active_player(client, db):
    db.add(_player(1, "LeBron James", is_active=True, team_abbreviation="LAL", position="F"))
    await db.commit()

    response = await client.get("/api/players")
    data = response.json()
    assert len(data) == 1
    assert data[0]["full_name"] == "LeBron James"
    assert data[0]["player_id"] == 1


async def test_list_players_includes_inactive_player_with_current_season_log(client, db):
    db.add(_player(2, "Retired Star", is_active=False))
    await db.flush()
    db.add(_game_log(2, "2025-26", date(2026, 3, 1)))
    await db.commit()

    response = await client.get("/api/players")
    data = response.json()
    assert len(data) == 1
    assert data[0]["full_name"] == "Retired Star"


async def test_list_players_excludes_inactive_player_with_no_current_season_log(client, db):
    db.add(_player(3, "Old Timer", is_active=False))
    await db.flush()
    db.add(_game_log(3, "2023-24", date(2024, 3, 1)))
    await db.commit()

    response = await client.get("/api/players")
    assert response.json() == []


async def test_list_players_ordered_by_name(client, db):
    db.add(_player(10, "Zach Collins", is_active=True))
    db.add(_player(11, "Anthony Davis", is_active=True))
    await db.commit()

    response = await client.get("/api/players")
    data = response.json()
    assert data[0]["full_name"] == "Anthony Davis"
    assert data[1]["full_name"] == "Zach Collins"


# ── GET /api/players/{player_id} ──────────────────────────────────────────────

async def test_get_player_found(client, db):
    db.add(_player(5, "Stephen Curry", is_active=True, team_abbreviation="GSW", position="G"))
    await db.commit()

    response = await client.get("/api/players/5")
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Stephen Curry"
    assert data["team_abbreviation"] == "GSW"


async def test_get_player_not_found(client):
    response = await client.get("/api/players/9999")
    assert response.status_code == 404


# ── GET /api/players/{player_id}/props ───────────────────────────────────────

async def test_get_player_props_empty(client, db):
    db.add(_player(6, "Kevin Durant", is_active=True))
    await db.commit()

    response = await client.get("/api/players/6/props")
    assert response.status_code == 200
    assert response.json() == []


async def test_get_player_props_returns_data(client, db):
    db.add(_player(7, "Nikola Jokic", is_active=True))
    await db.flush()
    db.add(_prop(7, "DraftKings", "player_points", "Over", 25.5, -115,
                 datetime(2026, 3, 25, 10, 0)))
    db.add(_prop(7, "DraftKings", "player_rebounds", "Over", 11.5, -110,
                 datetime(2026, 3, 25, 10, 0)))
    await db.commit()

    response = await client.get("/api/players/7/props")
    data = response.json()
    assert len(data) == 2
    bookmakers = {r["bookmaker"] for r in data}
    assert bookmakers == {"DraftKings"}


async def test_get_player_props_returns_most_recent_per_bookmaker_prop_outcome(client, db):
    db.add(_player(8, "Giannis Antetokounmpo", is_active=True))
    await db.flush()
    # Two rows for same bookmaker/prop/outcome — only the latest fetched_at should appear
    db.add(_prop(8, "FanDuel", "player_points", "Over", 30.5, -120,
                 datetime(2026, 3, 25, 8, 0)))   # older
    db.add(_prop(8, "FanDuel", "player_points", "Over", 31.5, -115,
                 datetime(2026, 3, 25, 10, 0)))  # newer
    await db.commit()

    response = await client.get("/api/players/8/props")
    data = response.json()
    assert len(data) == 1
    assert float(data[0]["point"]) == 31.5


# ── GET /api/players/{player_id}/game-logs ───────────────────────────────────

async def test_get_player_game_logs_empty(client, db):
    db.add(_player(20, "Bench Warmer", is_active=True))
    await db.commit()

    response = await client.get("/api/players/20/game-logs")
    assert response.status_code == 200
    assert response.json() == []


async def test_get_player_game_logs_defaults_to_current_season(client, db):
    db.add(_player(21, "Current Star", is_active=True))
    await db.flush()
    db.add(_game_log(21, "2025-26", date(2026, 3, 20)))
    db.add(_game_log(21, "2024-25", date(2025, 3, 20)))
    await db.commit()

    response = await client.get("/api/players/21/game-logs")
    data = response.json()
    assert len(data) == 1
    assert data[0]["matchup"] == "LAL vs. GSW"


async def test_get_player_game_logs_explicit_season(client, db):
    db.add(_player(22, "Veteran", is_active=True))
    await db.flush()
    db.add(_game_log(22, "2025-26", date(2026, 3, 20)))
    db.add(_game_log(22, "2024-25", date(2025, 3, 20)))
    await db.commit()

    response = await client.get("/api/players/22/game-logs?season=2024-25")
    data = response.json()
    assert len(data) == 1
    assert data[0]["wl"] == "W"


async def test_get_player_game_logs_ordered_by_date_desc(client, db):
    db.add(_player(23, "Consistent", is_active=True))
    await db.flush()
    db.add(_game_log(23, "2025-26", date(2026, 3, 10)))
    db.add(_game_log(23, "2025-26", date(2026, 3, 20)))
    db.add(_game_log(23, "2025-26", date(2026, 3, 15)))
    await db.commit()

    response = await client.get("/api/players/23/game-logs")
    data = response.json()
    dates = [r["game_date"] for r in data]
    assert dates == ["2026-03-20", "2026-03-15", "2026-03-10"]
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
pytest tests/test_players.py -v
```

Expected: All tests FAIL — `404 Not Found` or `ImportError` because the router doesn't exist yet.

---

## Task 4: Create players router and register it

**Files:**
- Create: `api/routers/players.py`
- Modify: `api/main.py`

- [ ] **Step 1: Create api/routers/players.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, exists, and_, func

from api.database import get_db
from api.models import Player, PlayerGameLog, PlayerProp
from api.schemas import PlayerListItem, PlayerGameLogItem, PlayerPropItem

router = APIRouter()


@router.get("/players", response_model=list[PlayerListItem])
async def list_players(db: AsyncSession = Depends(get_db)):
    current_season_log = select(PlayerGameLog.id).where(
        and_(
            PlayerGameLog.player_id == Player.player_id,
            PlayerGameLog.season == "2025-26",
        )
    )
    result = await db.execute(
        select(Player)
        .where(or_(Player.is_active == True, exists(current_season_log)))
        .order_by(Player.full_name)
    )
    return result.scalars().all()


@router.get("/players/{player_id}", response_model=PlayerListItem)
async def get_player(player_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Player).where(Player.player_id == player_id)
    )
    player = result.scalar_one_or_none()
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.get("/players/{player_id}/props", response_model=list[PlayerPropItem])
async def get_player_props(player_id: int, db: AsyncSession = Depends(get_db)):
    subq = (
        select(
            PlayerProp.bookmaker,
            PlayerProp.prop_type,
            PlayerProp.outcome,
            func.max(PlayerProp.fetched_at).label("max_fetched_at"),
        )
        .where(PlayerProp.nba_player_id == player_id)
        .group_by(PlayerProp.bookmaker, PlayerProp.prop_type, PlayerProp.outcome)
        .subquery()
    )
    result = await db.execute(
        select(PlayerProp)
        .join(
            subq,
            and_(
                PlayerProp.bookmaker == subq.c.bookmaker,
                PlayerProp.prop_type == subq.c.prop_type,
                PlayerProp.outcome == subq.c.outcome,
                PlayerProp.fetched_at == subq.c.max_fetched_at,
            ),
        )
        .where(PlayerProp.nba_player_id == player_id)
        .order_by(PlayerProp.bookmaker, PlayerProp.prop_type, PlayerProp.outcome)
    )
    return result.scalars().all()


@router.get("/players/{player_id}/game-logs", response_model=list[PlayerGameLogItem])
async def get_player_game_logs(
    player_id: int,
    season: str = "2025-26",
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PlayerGameLog)
        .where(
            and_(
                PlayerGameLog.player_id == player_id,
                PlayerGameLog.season == season,
            )
        )
        .order_by(PlayerGameLog.game_date.desc())
    )
    return result.scalars().all()
```

- [ ] **Step 2: Register router in api/main.py**

Change `api/main.py` to:

```python
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from api.routers import games, odds, props, scores, players

app = FastAPI(title="Odds Admin")

# Routers registered first — StaticFiles mount must come last
app.include_router(games.router, prefix="/api")
app.include_router(odds.router, prefix="/api")
app.include_router(props.router, prefix="/api")
app.include_router(scores.router, prefix="/api")
app.include_router(players.router, prefix="/api")

# Serve React SPA for all non-API routes (only when static dir is present)
static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
```

- [ ] **Step 3: Run all tests and verify they pass**

```bash
pytest tests/ -v
```

Expected: All tests PASS including the new `tests/test_players.py` tests.

- [ ] **Step 4: Commit**

```bash
git add api/routers/players.py api/main.py
git commit -m "feat: add players router with list, detail, props, and game-logs endpoints"
```

---

## Task 5: Install react-router-dom

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Install the package**

```bash
cd /home/bryang/Dev_Space/python_projects/odds-admin/web
npm install react-router-dom
```

- [ ] **Step 2: Verify it was added to dependencies**

Check `web/package.json` now has `"react-router-dom"` under `"dependencies"`.

- [ ] **Step 3: Commit**

```bash
cd /home/bryang/Dev_Space/python_projects/odds-admin
git add web/package.json web/package-lock.json
git commit -m "chore: add react-router-dom"
```

---

## Task 6: Add new types and fetch functions to client.ts

**Files:**
- Modify: `web/src/api/client.ts`

- [ ] **Step 1: Replace web/src/api/client.ts with updated version**

```typescript
export interface ScoreEmbed {
  home_score: number | null;
  away_score: number | null;
  completed: boolean;
}

export interface Game {
  game_id: string;
  home_team: string | null;
  away_team: string | null;
  commence_time: string | null;
  season: string | null;
  sport: string | null;
  score: ScoreEmbed | null;
}

export interface OddsItem {
  bookmaker: string | null;
  market_type: string | null;
  outcome_name: string | null;
  price: number | null;
  point: number | null;
  last_update: string | null;
}

export interface PlayerPropItem {
  bookmaker: string | null;
  player_name: string | null;
  prop_type: string | null;
  outcome: string | null;
  price: number | null;
  point: number | null;
}

export interface ScoreItem {
  game_id: string | null;
  home_score: number | null;
  away_score: number | null;
  completed: boolean;
  last_update: string | null;
  fetched_at: string;
}

export interface PlayerListItem {
  player_id: number;
  full_name: string;
  position: string | null;
  team_abbreviation: string | null;
}

export interface PlayerGameLogItem {
  game_date: string;
  matchup: string | null;
  wl: string | null;
  min: number | null;
  fga: number | null;
  fta: number | null;
  usg_pct: number | null;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  blk: number | null;
  stl: number | null;
  plus_minus: number | null;
}

const BASE = "/api";

export async function fetchGames(): Promise<Game[]> {
  const res = await fetch(`${BASE}/games`);
  if (!res.ok) throw new Error("Failed to fetch games");
  return res.json();
}

export async function fetchOdds(gameId: string): Promise<OddsItem[]> {
  const res = await fetch(`${BASE}/games/${gameId}/odds`);
  if (!res.ok) throw new Error("Failed to fetch odds");
  return res.json();
}

export async function fetchProps(gameId: string): Promise<PlayerPropItem[]> {
  const res = await fetch(`${BASE}/games/${gameId}/props`);
  if (!res.ok) throw new Error("Failed to fetch props");
  return res.json();
}

export async function fetchScore(gameId: string): Promise<ScoreItem | null> {
  const res = await fetch(`${BASE}/games/${gameId}/scores`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch score");
  return res.json();
}

export async function fetchPlayers(): Promise<PlayerListItem[]> {
  const res = await fetch(`${BASE}/players`);
  if (!res.ok) throw new Error("Failed to fetch players");
  return res.json();
}

export async function fetchPlayer(playerId: number): Promise<PlayerListItem> {
  const res = await fetch(`${BASE}/players/${playerId}`);
  if (!res.ok) throw new Error("Player not found");
  return res.json();
}

export async function fetchPlayerProps(playerId: number): Promise<PlayerPropItem[]> {
  const res = await fetch(`${BASE}/players/${playerId}/props`);
  if (!res.ok) throw new Error("Failed to fetch player props");
  return res.json();
}

export async function fetchPlayerGameLogs(
  playerId: number,
  season = "2025-26"
): Promise<PlayerGameLogItem[]> {
  const res = await fetch(`${BASE}/players/${playerId}/game-logs?season=${season}`);
  if (!res.ok) throw new Error("Failed to fetch player game logs");
  return res.json();
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/bryang/Dev_Space/python_projects/odds-admin/web
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /home/bryang/Dev_Space/python_projects/odds-admin
git add web/src/api/client.ts
git commit -m "feat: add PlayerListItem, PlayerGameLogItem types and player fetch functions"
```

---

## Task 7: Update App.tsx with routing and Players nav link

**Files:**
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Replace web/src/App.tsx**

```tsx
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { GamesPage } from "./pages/GamesPage";
import { PlayersPage } from "./pages/PlayersPage";
import { PlayerDetailPage } from "./pages/PlayerDetailPage";
import { cn } from "@/lib/utils";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== "/" && pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={cn(
        "text-sm transition-colors pb-0.5",
        active
          ? "text-slate-100 border-b-2 border-blue-400"
          : "text-slate-500 hover:text-slate-300"
      )}
    >
      {children}
    </Link>
  );
}

function Layout() {
  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <span className="text-slate-100 font-bold text-base tracking-wide">
          Odds Admin
        </span>
        <div className="flex gap-4 text-sm">
          <NavLink to="/">Games</NavLink>
          <NavLink to="/players">Players</NavLink>
          <span className="text-slate-500 cursor-not-allowed text-sm" title="Coming soon">
            Raw Data
          </span>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<GamesPage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/players/:id" element={<PlayerDetailPage />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/bryang/Dev_Space/python_projects/odds-admin/web
npx tsc --noEmit
```

Expected: May show errors about missing `PlayersPage` and `PlayerDetailPage` — those are created in the next two tasks. If the only errors are missing module imports for those two files, proceed.

- [ ] **Step 3: Commit**

```bash
cd /home/bryang/Dev_Space/python_projects/odds-admin
git add web/src/App.tsx
git commit -m "feat: add react-router with Players nav tab and route layout"
```

---

## Task 8: Create PlayersPage

**Files:**
- Create: `web/src/pages/PlayersPage.tsx`

- [ ] **Step 1: Create web/src/pages/PlayersPage.tsx**

```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPlayers } from "@/api/client";
import type { PlayerListItem } from "@/api/client";

export function PlayersPage() {
  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlayers()
      .then(setPlayers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = players.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <p className="px-6 py-8 text-slate-500">Loading players...</p>;
  }
  if (error) {
    return <p className="px-6 py-8 text-red-400">Failed to load players: {error}</p>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <input
        type="text"
        placeholder="Search players..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
      />

      {filtered.length === 0 ? (
        <p className="text-slate-500 text-sm">No players found.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {filtered.map((player) => (
            <button
              key={player.player_id}
              onClick={() => navigate(`/players/${player.player_id}`)}
              className="flex items-center gap-4 px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-left hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-100">{player.full_name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {player.position ?? "—"} · {player.team_abbreviation ?? "—"}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/bryang/Dev_Space/python_projects/odds-admin/web
npx tsc --noEmit
```

Expected: Only remaining error (if any) is the missing `PlayerDetailPage`. Proceed.

- [ ] **Step 3: Commit**

```bash
cd /home/bryang/Dev_Space/python_projects/odds-admin
git add web/src/pages/PlayersPage.tsx
git commit -m "feat: add PlayersPage with searchable player list"
```

---

## Task 9: Create PlayerDetailPage

**Files:**
- Create: `web/src/pages/PlayerDetailPage.tsx`

- [ ] **Step 1: Create web/src/pages/PlayerDetailPage.tsx**

```tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchPlayer,
  fetchPlayerProps,
  fetchPlayerGameLogs,
} from "@/api/client";
import type {
  PlayerListItem,
  PlayerPropItem,
  PlayerGameLogItem,
} from "@/api/client";

type StatCategory = "all" | "pts" | "reb" | "ast";

const SEASONS = ["2025-26", "2024-25", "2023-24"];
const LAST_N_OPTIONS = [5, 10, 20] as const;

const STAT_CATEGORY_LABELS: Record<StatCategory, string> = {
  all: "All",
  pts: "Points",
  reb: "Rebounds",
  ast: "Assists",
};

function groupPropsByBookmaker(
  props: PlayerPropItem[]
): Map<string, PlayerPropItem[]> {
  const map = new Map<string, PlayerPropItem[]>();
  for (const p of props) {
    const bk = p.bookmaker ?? "Unknown";
    if (!map.has(bk)) map.set(bk, []);
    map.get(bk)!.push(p);
  }
  return map;
}

function formatPrice(price: number | null): string {
  if (price === null) return "—";
  return price > 0 ? `+${price}` : String(price);
}

function formatStat(val: number | null): string {
  return val !== null ? String(val) : "—";
}

function formatMin(val: number | null): string {
  if (val === null) return "—";
  return val.toFixed(1);
}

function formatUsg(val: number | null): string {
  if (val === null) return "—";
  return `${(val * 100).toFixed(1)}%`;
}

export function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playerId = Number(id);

  const [player, setPlayer] = useState<PlayerListItem | null>(null);
  const [props, setProps] = useState<PlayerPropItem[]>([]);
  const [gameLogs, setGameLogs] = useState<PlayerGameLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [season, setSeason] = useState("2025-26");
  const [lastN, setLastN] = useState<number | null>(null);
  const [statCategory, setStatCategory] = useState<StatCategory>("all");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchPlayer(playerId),
      fetchPlayerProps(playerId),
      fetchPlayerGameLogs(playerId, season),
    ])
      .then(([playerData, propsData, logsData]) => {
        setPlayer(playerData);
        setProps(propsData);
        setGameLogs(logsData);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [playerId]);

  // Re-fetch game logs when season changes
  useEffect(() => {
    if (!player) return;
    fetchPlayerGameLogs(playerId, season)
      .then(setGameLogs)
      .catch((e) => setError(e.message));
  }, [season]);

  if (loading) {
    return <p className="px-6 py-8 text-slate-500">Loading...</p>;
  }
  if (error || !player) {
    return (
      <div className="px-6 py-8">
        <p className="text-red-400 mb-3">{error ?? "Player not found."}</p>
        <button
          onClick={() => navigate("/players")}
          className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Players
        </button>
      </div>
    );
  }

  const propsByBookmaker = groupPropsByBookmaker(props);
  const displayedLogs = lastN ? gameLogs.slice(0, lastN) : gameLogs;

  const highlightCol = (col: StatCategory): string =>
    statCategory !== "all" && statCategory === col
      ? "bg-blue-950/40 text-blue-300 font-semibold"
      : "";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back link */}
      <button
        onClick={() => navigate("/players")}
        className="text-sm text-slate-500 hover:text-slate-300 flex items-center gap-1 mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Players
      </button>

      {/* Player header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">{player.full_name}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {player.position ?? "—"} · {player.team_abbreviation ?? "—"}
        </p>
      </div>

      {/* Bookmaker prop cards */}
      <section className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 pb-2 mb-3 border-b border-slate-800">
          Lines by Bookmaker
        </p>
        {propsByBookmaker.size === 0 ? (
          <p className="text-sm text-slate-500">No props available.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {Array.from(propsByBookmaker.entries()).map(([bookmaker, bkProps]) => (
              <div
                key={bookmaker}
                className="bg-slate-900 border border-slate-800 rounded-lg p-4 min-w-[200px]"
              >
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-3">
                  {bookmaker}
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {["Prop", "Line", "Side", "Price"].map((h) => (
                        <th
                          key={h}
                          className="text-left pr-3 pb-1 text-[10px] uppercase tracking-wide text-slate-600"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bkProps.map((p, i) => (
                      <tr key={i} className="border-t border-slate-800">
                        <td className="pr-3 py-1.5 text-violet-400 font-semibold">
                          {p.prop_type?.replace("player_", "") ?? "—"}
                        </td>
                        <td className="pr-3 py-1.5 text-blue-400 font-semibold">
                          {p.point ?? "—"}
                        </td>
                        <td className="pr-3 py-1.5 text-slate-400">{p.outcome}</td>
                        <td
                          className={cn(
                            "py-1.5 font-semibold",
                            p.price !== null && p.price > 0
                              ? "text-green-400"
                              : "text-red-400"
                          )}
                        >
                          {formatPrice(p.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Stats section */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 pb-2 mb-3 border-b border-slate-800">
          Game Log
        </p>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          {/* Season selector */}
          <div className="flex gap-1">
            {SEASONS.map((s) => (
              <button
                key={s}
                onClick={() => setSeason(s)}
                className={cn(
                  "text-[10px] font-bold tracking-wide px-2 py-1 rounded cursor-pointer",
                  season === s
                    ? "bg-blue-950 text-blue-400"
                    : "bg-slate-800 text-slate-500 hover:text-slate-400"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Divider */}
          <span className="text-slate-700 text-xs">|</span>

          {/* Last N selector */}
          <div className="flex gap-1">
            <button
              onClick={() => setLastN(null)}
              className={cn(
                "text-[10px] font-bold tracking-wide px-2 py-1 rounded cursor-pointer",
                lastN === null
                  ? "bg-blue-950 text-blue-400"
                  : "bg-slate-800 text-slate-500 hover:text-slate-400"
              )}
            >
              All
            </button>
            {LAST_N_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setLastN(n)}
                className={cn(
                  "text-[10px] font-bold tracking-wide px-2 py-1 rounded cursor-pointer",
                  lastN === n
                    ? "bg-blue-950 text-blue-400"
                    : "bg-slate-800 text-slate-500 hover:text-slate-400"
                )}
              >
                L{n}
              </button>
            ))}
          </div>

          {/* Divider */}
          <span className="text-slate-700 text-xs">|</span>

          {/* Stat category */}
          <div className="flex gap-1">
            {(["all", "pts", "reb", "ast"] as StatCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setStatCategory(cat)}
                className={cn(
                  "text-[10px] font-bold tracking-wide px-2 py-1 rounded cursor-pointer",
                  statCategory === cat
                    ? "bg-blue-950 text-blue-400"
                    : "bg-slate-800 text-slate-500 hover:text-slate-400"
                )}
              >
                {STAT_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Stats table */}
        {displayedLogs.length === 0 ? (
          <p className="text-sm text-slate-500">No stats available for this season.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {[
                    { label: "Date", col: null },
                    { label: "Matchup", col: null },
                    { label: "W/L", col: null },
                    { label: "MIN", col: null },
                    { label: "PTS", col: "pts" as StatCategory },
                    { label: "REB", col: "reb" as StatCategory },
                    { label: "AST", col: "ast" as StatCategory },
                    { label: "BLK", col: null },
                    { label: "STL", col: null },
                    { label: "USG%", col: null },
                    { label: "+/-", col: null },
                  ].map(({ label, col }) => (
                    <th
                      key={label}
                      className={cn(
                        "text-left px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500",
                        col && statCategory === col ? "text-blue-400" : ""
                      )}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedLogs.map((log, i) => (
                  <tr key={i} className="border-t border-slate-800 hover:bg-slate-900/50">
                    <td className="px-2 py-1.5 text-slate-400">{log.game_date}</td>
                    <td className="px-2 py-1.5 text-slate-300">{log.matchup ?? "—"}</td>
                    <td
                      className={cn(
                        "px-2 py-1.5 font-semibold",
                        log.wl === "W" ? "text-green-400" : log.wl === "L" ? "text-red-400" : "text-slate-500"
                      )}
                    >
                      {log.wl ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 text-slate-400">{formatMin(log.min)}</td>
                    <td className={cn("px-2 py-1.5", highlightCol("pts"))}>{formatStat(log.pts)}</td>
                    <td className={cn("px-2 py-1.5", highlightCol("reb"))}>{formatStat(log.reb)}</td>
                    <td className={cn("px-2 py-1.5", highlightCol("ast"))}>{formatStat(log.ast)}</td>
                    <td className="px-2 py-1.5 text-slate-400">{formatStat(log.blk)}</td>
                    <td className="px-2 py-1.5 text-slate-400">{formatStat(log.stl)}</td>
                    <td className="px-2 py-1.5 text-slate-400">{formatUsg(log.usg_pct)}</td>
                    <td
                      className={cn(
                        "px-2 py-1.5 font-semibold",
                        log.plus_minus !== null && log.plus_minus > 0
                          ? "text-green-400"
                          : log.plus_minus !== null && log.plus_minus < 0
                          ? "text-red-400"
                          : "text-slate-400"
                      )}
                    >
                      {log.plus_minus !== null
                        ? log.plus_minus > 0
                          ? `+${log.plus_minus}`
                          : String(log.plus_minus)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/bryang/Dev_Space/python_projects/odds-admin/web
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Do a full build to confirm no issues**

```bash
npm run build
```

Expected: Build completes without errors.

- [ ] **Step 4: Commit**

```bash
cd /home/bryang/Dev_Space/python_projects/odds-admin
git add web/src/pages/PlayerDetailPage.tsx
git commit -m "feat: add PlayerDetailPage with bookmaker prop cards and filterable stats table"
```
