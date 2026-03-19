# Odds Admin — Design Spec
**Date:** 2026-03-19
**Status:** Approved

---

## Overview

A local admin web application for viewing NBA game, odds, player prop, and score data populated by the odds-pipeline service. Built as a monorepo with a FastAPI backend and React frontend, deployed as a single service added to the odds-pipeline docker-compose stack.

---

## Architecture

**Pattern:** Monorepo — single repository containing both the FastAPI backend (`api/`) and React frontend (`web/`). A multi-stage Dockerfile builds the React app and copies the static output into the Python image. FastAPI serves the React SPA as static files alongside the REST API. No CORS configuration required.

**Deployment:** A new `odds-admin` service is added to `odds-pipeline/docker-compose.yml`. It connects to the existing `data-postgres` service on the internal Docker network using existing credentials. Exposed on port 8000.

### Repo Structure

```
odds-admin/
├── api/
│   ├── main.py          # FastAPI app, mounts static files, includes routers
│   ├── database.py      # SQLAlchemy engine and session factory
│   ├── models.py        # SQLAlchemy ORM models (Game, Odds, PlayerProp, Score)
│   ├── schemas.py       # Pydantic response schemas
│   └── routers/
│       ├── games.py     # GET /api/games
│       ├── odds.py      # GET /api/games/{id}/odds
│       ├── props.py     # GET /api/games/{id}/props
│       └── scores.py    # GET /api/games/{id}/scores
├── web/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page-level components
│   │   └── api/         # Typed API client functions
│   ├── package.json
│   └── vite.config.ts
├── Dockerfile           # Multi-stage: Node build → Python serve
├── requirements.txt
└── pyproject.toml
```

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Backend framework | FastAPI | Async-first, auto OpenAPI docs, Pydantic integration, scales to customer app |
| Database ORM | SQLAlchemy (async) | Clean Python models for read-heavy admin queries, mirrors existing schema |
| DB driver | asyncpg | Required for async SQLAlchemy; odds-pipeline uses psycopg2 for its own sync ETL but this app uses asyncpg independently |
| Frontend framework | React + TypeScript | Widest ecosystem, reusable across admin and future customer app |
| Build tool | Vite | Fast local dev, simple static build output |
| UI components | shadcn/ui + Tailwind CSS | Dark theme, composable, no opinionated lock-in, scales to customer app branding |
| Table | TanStack Table | Powers expandable rows in the games list |

---

## Data Layer

SQLAlchemy ORM models mirror the existing `odds_db` schema created by odds-pipeline. No migrations are run by this app — the schema is owned by odds-pipeline.

**Models:**
- `Game` — maps to `games` table (`game_id`, `home_team`, `away_team`, `commence_time`, `season`, `sport`)
- `Odds` — maps to `odds` table. PK: `id` (SERIAL). Columns: `game_id`, `bookmaker`, `market_type`, `outcome_name`, `price`, `point`, `last_update`, `fetched_at`.
- `PlayerProp` — maps to `player_props` table. PK: `id` (SERIAL). Columns: `game_id`, `bookmaker`, `player_name`, `prop_type`, `outcome`, `price`, `point`, `last_update`, `fetched_at`.
- No ORM model for `raw_api_responses` — that table is fully out of scope for v1.
- `Score` — maps to `scores` table (`game_id`, `home_score`, `away_score`, `completed`, `last_update`, `fetched_at`)

---

## API Endpoints

All endpoints are read-only (GET). No write operations.

| Endpoint | Description |
|---|---|
| `GET /api/games` | List all games ordered by `commence_time` desc. Each item includes game fields plus a nullable `score` sub-object: `{ home_score, away_score, completed }`. Implemented as a LEFT JOIN on `scores`. |
| `GET /api/games/{game_id}/odds` | Latest odds for a game. Deduped to most recent `fetched_at` per `(bookmaker, market_type, outcome_name)` — this is the authoritative deduplication key used everywhere in this spec. |
| `GET /api/games/{game_id}/props` | All player props for a game, grouped by player name. |
| `GET /api/games/{game_id}/scores` | Score record for a game. |

---

## UI Design

### Theme
Dark theme throughout. Color palette: slate-900 backgrounds, slate-700 borders, slate-400 body text, blue-400 accents, green-400 for positive prices / winners, red-400 for negative prices / losers.

### Games Page (main view)

Games are grouped by date with relative labels (Today, Yesterday, then absolute dates for older games). Within each date group, games are ordered by `commence_time`.

Each game renders as a collapsed card showing:
- Commence time
- Matchup (away team vs home team)
- Sport / season label
- Status badge: `LIVE` (red), `UPCOMING` (blue), `FINAL` (green)
- Score (if available), placeholder dashes if not

Clicking a game card expands it inline to reveal three tabs:

**Odds tab**
- Market type filter chips: H2H · Spreads · Totals
- Table columns: Bookmaker · Outcome · Price · Last Update
- Shows latest odds only (most recent `fetched_at` per `(bookmaker, market_type, outcome_name)` — consistent with the API deduplication key)

**Player Props tab**
- Prop type filter chips: All · Points · Rebounds · Assists
- Grouped by player name
- Table columns: Bookmaker · Prop Type · Line · Outcome · Price

**Score tab**
- Scoreboard layout: away team score vs home team score
- Winner score highlighted in green
- Game status badge and last updated timestamp

---

## Docker Integration

Add to `odds-pipeline/docker-compose.yml`:

```yaml
odds-admin:
  build:
    context: ../odds-admin
    dockerfile: Dockerfile
  ports:
    - "8080:8000"  # Host port 8080 avoids conflict with common local dev servers on 8000
  environment:
    - DATA_DB_HOST=data-postgres
    - DATA_DB_PORT=5432
    - DATA_DB_USER=odds
    - DATA_DB_PASSWORD=odds_password
    - DATA_DB_NAME=odds_db
  depends_on:
    - data-postgres
  networks:
    - odds_network
```

**Multi-stage Dockerfile:**
- Stage 1 (node): `npm ci && npm run build` — outputs to `web/dist/`
- Stage 2 (python): copies `web/dist/` to `/app/static/`, installs Python deps, runs `uvicorn api.main:app`

**Mount order in `main.py`:** API routers are registered first (`app.include_router(...)`). After all routers, `StaticFiles` is mounted with `html=True` to serve `index.html` as the SPA fallback for any path not matched by an API route. This ensures `/api/*` routes are never intercepted by the static file handler.

---

## Out of Scope (v1)

- Authentication / access control (local only)
- Write operations (create, update, delete)
- Historical line movement charts
- Real-time auto-refresh
- Raw API response viewer (nav item present but not implemented)
- Filtering or search on the games list
