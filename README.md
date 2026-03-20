# Odds Admin

A local admin web app for viewing NBA game, odds, player prop, and score data populated by the [odds-pipeline](https://github.com/BryGo1995/odds-pipeline) service.

## Features

- **Games list** — all games grouped by date with relative labels (Today / Yesterday)
- **Live status badges** — LIVE / UPCOMING / FINAL derived from commence time and score data
- **Odds viewer** — per-game odds with market filter (H2H, Spreads, Totals); deduplicates to the latest fetch per bookmaker/market/outcome
- **Player props viewer** — per-game player props grouped by player with prop type filter (Points, Rebounds, Assists)
- **Score viewer** — scoreboard with winner highlight
- **Dark theme** — Tailwind-based dark UI throughout

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI 0.111, SQLAlchemy 2.0 (async), asyncpg |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Database | PostgreSQL (read-only, managed by odds-pipeline) |
| Packaging | Multi-stage Docker — Node build → Python serve |

## Running with odds-pipeline (recommended)

odds-admin is integrated into the odds-pipeline docker compose stack as the `odds-admin` service.

From the `odds-pipeline/` directory:

```bash
docker compose up odds-admin data-postgres --build
```

Open http://localhost:8001 — the React app will load and connect to the database automatically.

## Running locally (dev mode)

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL database from odds-pipeline running (exposed on `localhost:5433`)

### Backend

```bash
# Install dependencies
pip install -r requirements-dev.txt

# Copy and configure env
cp .env.example .env

# Start the API server
uvicorn api.main:app --reload --port 8000
```

### Frontend

```bash
cd web
npm install
npm run dev
```

The Vite dev server starts on http://localhost:5173 and proxies `/api` requests to the FastAPI server on port 8000.

### Tests

```bash
pytest -v
```

## Running with Docker (standalone)

```bash
docker build -t odds-admin:local .

docker run --rm -p 8000:8000 \
  -e DATA_DB_HOST=host.docker.internal \
  -e DATA_DB_PORT=5433 \
  -e DATA_DB_USER=odds \
  -e DATA_DB_PASSWORD=odds_password \
  -e DATA_DB_NAME=odds_db \
  odds-admin:local
```

Open http://localhost:8000.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATA_DB_HOST` | `localhost` | PostgreSQL host |
| `DATA_DB_PORT` | `5433` | PostgreSQL port |
| `DATA_DB_USER` | `odds` | Database user |
| `DATA_DB_PASSWORD` | `odds_password` | Database password |
| `DATA_DB_NAME` | `odds_db` | Database name |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/games` | List all games with embedded score |
| `GET` | `/api/games/{id}/odds` | Latest odds for a game |
| `GET` | `/api/games/{id}/props` | Player props for a game |
| `GET` | `/api/games/{id}/scores` | Score for a game |
