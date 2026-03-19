# Odds Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local admin web app (FastAPI + React) that reads game, odds, player prop, and score data from the odds-pipeline PostgreSQL database and displays it in a dark-themed UI with date-grouped games and expandable market tabs.

**Architecture:** Monorepo with `api/` (FastAPI, SQLAlchemy async, asyncpg) and `web/` (React + TypeScript, Vite, Tailwind, shadcn/ui). A multi-stage Dockerfile builds the React app then serves it as static files from the FastAPI process on port 8000 (exposed as 8001 in docker-compose). No schema migrations — this app is read-only against odds-pipeline's database.

**Tech Stack:** Python 3.11, FastAPI 0.111, SQLAlchemy 2.0 (async), asyncpg, React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Table, pytest + pytest-asyncio + httpx + aiosqlite

---

## File Map

```
odds-admin/
├── api/
│   ├── __init__.py              # empty
│   ├── main.py                  # FastAPI app: routers first, then StaticFiles mount
│   ├── database.py              # async engine, session factory, Base, get_db
│   ├── models.py                # SQLAlchemy ORM: Game, Odds, PlayerProp, Score
│   ├── schemas.py               # Pydantic: GameListItem, OddsItem, PlayerPropItem, ScoreItem, ScoreEmbed
│   └── routers/
│       ├── __init__.py          # empty
│       ├── games.py             # GET /api/games (LEFT JOIN scores)
│       ├── odds.py              # GET /api/games/{id}/odds (dedup by latest fetched_at)
│       ├── props.py             # GET /api/games/{id}/props
│       └── scores.py            # GET /api/games/{id}/scores
├── tests/
│   ├── __init__.py              # empty
│   ├── conftest.py              # SQLite in-memory DB, async test client fixtures
│   ├── test_games.py            # games endpoint tests
│   ├── test_odds.py             # odds deduplication tests
│   ├── test_props.py            # props grouping tests
│   └── test_scores.py           # scores 200 and 404 tests
├── web/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts        # typed fetch wrappers for all 4 endpoints + TS interfaces
│   │   ├── components/
│   │   │   ├── StatusBadge.tsx  # LIVE / UPCOMING / FINAL badge
│   │   │   ├── GameCard.tsx     # collapsed row + expand/collapse + tab container
│   │   │   ├── OddsTab.tsx      # market filter chips + odds table
│   │   │   ├── PlayerPropsTab.tsx # prop type filter + player-grouped table
│   │   │   └── ScoreTab.tsx     # scoreboard with winner highlight
│   │   ├── pages/
│   │   │   └── GamesPage.tsx    # fetches games, groups by date, renders GameCard list
│   │   ├── lib/
│   │   │   └── utils.ts         # cn() utility (from shadcn)
│   │   ├── App.tsx              # root: dark background, nav bar, GamesPage
│   │   └── main.tsx             # React DOM entry
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts           # includes /api proxy to localhost:8000 for local dev
│   ├── tailwind.config.js       # darkMode: 'class', content paths
│   └── postcss.config.js
├── .env.example
├── Dockerfile                   # multi-stage: node build → python serve
├── requirements.txt             # runtime deps
├── requirements-dev.txt         # test deps
└── pyproject.toml               # pytest config: asyncio_mode = "auto"
```

---

## Task 1: Python project scaffolding

**Files:**
- Create: `requirements.txt`
- Create: `requirements-dev.txt`
- Create: `pyproject.toml`
- Create: `.env.example`
- Create: `api/__init__.py`
- Create: `api/routers/__init__.py`
- Create: `tests/__init__.py`

- [ ] **Step 1: Create `requirements.txt`**

```
fastapi==0.111.0
uvicorn[standard]==0.30.0
sqlalchemy[asyncio]==2.0.30
asyncpg==0.29.0
pydantic==2.7.1
python-dotenv==1.0.1
```

- [ ] **Step 2: Create `requirements-dev.txt`**

```
-r requirements.txt
pytest==8.2.0
pytest-asyncio==0.23.6
httpx==0.27.0
aiosqlite==0.20.0
```

- [ ] **Step 3: Create `pyproject.toml`**

```toml
[build-system]
requires = ["setuptools"]
build-backend = "setuptools.backends.legacy:build"

[project]
name = "odds-admin"
version = "0.1.0"
requires-python = ">=3.11"

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

- [ ] **Step 4: Create `.env.example`**

```
# Local dev (running uvicorn outside Docker, connecting to data-postgres on the host)
# data-postgres is exposed on host port 5433 (see odds-pipeline docker-compose.yml)
DATA_DB_HOST=localhost
DATA_DB_PORT=5433
DATA_DB_USER=odds
DATA_DB_PASSWORD=odds_password
DATA_DB_NAME=odds_db

# When running inside Docker (docker-compose), DATA_DB_HOST=data-postgres and DATA_DB_PORT=5432
# — these are set via environment: in docker-compose, so this .env.example is for local dev only.
```

- [ ] **Step 5: Create empty init files**

```bash
touch api/__init__.py api/routers/__init__.py tests/__init__.py
```

- [ ] **Step 6: Commit**

```bash
git add requirements.txt requirements-dev.txt pyproject.toml .env.example api/__init__.py api/routers/__init__.py tests/__init__.py
git commit -m "chore: python project scaffolding"
```

---

## Task 2: Database layer

**Files:**
- Create: `api/database.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_database.py`:

```python
import pytest
from sqlalchemy.ext.asyncio import AsyncSession


async def test_get_db_yields_session(db):
    assert isinstance(db, AsyncSession)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pip install -r requirements-dev.txt
pytest tests/test_database.py -v
```

Expected: FAIL — `db` fixture not defined yet (no conftest.py).

- [ ] **Step 3: Create `api/database.py`**

```python
import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = (
    f"postgresql+asyncpg://"
    f"{os.getenv('DATA_DB_USER', 'odds')}:"
    f"{os.getenv('DATA_DB_PASSWORD', 'odds_password')}@"
    f"{os.getenv('DATA_DB_HOST', 'localhost')}:"
    f"{os.getenv('DATA_DB_PORT', '5433')}/"
    f"{os.getenv('DATA_DB_NAME', 'odds_db')}"
)

engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

- [ ] **Step 4: Create `tests/conftest.py`**

```python
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import StaticPool

from api.database import Base, get_db

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db():
    engine = create_async_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db):
    from api.main import app

    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()
```

Note: `client` fixture imports `api.main` — that file doesn't exist yet. The fixture will work once Task 9 creates it. For now the `db` fixture alone is testable.

- [ ] **Step 5: Run database test**

```bash
pytest tests/test_database.py -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add api/database.py tests/conftest.py tests/test_database.py
git commit -m "feat: async database layer and test fixtures"
```

---

## Task 3: SQLAlchemy models

**Files:**
- Create: `api/models.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_models.py`:

```python
from api.models import Game, Odds, PlayerProp, Score


def test_model_tablenames():
    assert Game.__tablename__ == "games"
    assert Odds.__tablename__ == "odds"
    assert PlayerProp.__tablename__ == "player_props"
    assert Score.__tablename__ == "scores"


def test_game_has_score_relationship():
    assert hasattr(Game, "score")


def test_score_has_game_relationship():
    assert hasattr(Score, "game")
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_models.py -v
```

Expected: FAIL — `api.models` not found.

- [ ] **Step 3: Create `api/models.py`**

```python
from decimal import Decimal
from datetime import datetime
from sqlalchemy import String, Integer, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from api.database import Base


class Game(Base):
    __tablename__ = "games"

    game_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    home_team: Mapped[str | None] = mapped_column(String(100))
    away_team: Mapped[str | None] = mapped_column(String(100))
    commence_time: Mapped[datetime | None] = mapped_column(DateTime)
    season: Mapped[str | None] = mapped_column(String(20))
    sport: Mapped[str | None] = mapped_column(String(50))

    score: Mapped["Score | None"] = relationship(
        "Score", back_populates="game", uselist=False
    )


class Odds(Base):
    __tablename__ = "odds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[str | None] = mapped_column(
        String(100), ForeignKey("games.game_id")
    )
    bookmaker: Mapped[str | None] = mapped_column(String(50))
    market_type: Mapped[str | None] = mapped_column(String(50))
    outcome_name: Mapped[str | None] = mapped_column(String(100))
    price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    point: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    last_update: Mapped[datetime | None] = mapped_column(DateTime)
    fetched_at: Mapped[datetime] = mapped_column(DateTime)


class PlayerProp(Base):
    __tablename__ = "player_props"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[str | None] = mapped_column(
        String(100), ForeignKey("games.game_id")
    )
    bookmaker: Mapped[str | None] = mapped_column(String(50))
    player_name: Mapped[str | None] = mapped_column(String(100))
    prop_type: Mapped[str | None] = mapped_column(String(100))
    outcome: Mapped[str | None] = mapped_column(String(20))
    price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    point: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    last_update: Mapped[datetime | None] = mapped_column(DateTime)
    fetched_at: Mapped[datetime] = mapped_column(DateTime)


class Score(Base):
    __tablename__ = "scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[str | None] = mapped_column(
        String(100), ForeignKey("games.game_id"), unique=True
    )
    home_score: Mapped[int | None] = mapped_column(Integer)
    away_score: Mapped[int | None] = mapped_column(Integer)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    last_update: Mapped[datetime | None] = mapped_column(DateTime)
    fetched_at: Mapped[datetime] = mapped_column(DateTime)

    game: Mapped["Game"] = relationship("Game", back_populates="score")
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_models.py -v
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add api/models.py tests/test_models.py
git commit -m "feat: SQLAlchemy ORM models"
```

---

## Task 4: Pydantic schemas

**Files:**
- Create: `api/schemas.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_schemas.py`:

```python
from datetime import datetime
from decimal import Decimal
from api.schemas import GameListItem, ScoreEmbed, OddsItem, PlayerPropItem, ScoreItem


def test_game_list_item_no_score():
    item = GameListItem(
        game_id="g1",
        home_team="Lakers",
        away_team="Celtics",
        commence_time=datetime(2026, 3, 19, 19, 0),
        season="2025-26",
        sport="basketball_nba",
        score=None,
    )
    assert item.score is None


def test_game_list_item_with_score():
    item = GameListItem(
        game_id="g1",
        home_team="Lakers",
        away_team="Celtics",
        commence_time=None,
        season=None,
        sport=None,
        score=ScoreEmbed(home_score=110, away_score=105, completed=True),
    )
    assert item.score.completed is True


def test_odds_item():
    item = OddsItem(
        bookmaker="DraftKings",
        market_type="h2h",
        outcome_name="Lakers",
        price=Decimal("-150"),
        point=None,
        last_update=None,
    )
    assert item.bookmaker == "DraftKings"


def test_score_item_serializes():
    item = ScoreItem(
        game_id="g1",
        home_score=110,
        away_score=105,
        completed=True,
        last_update=None,
        fetched_at=datetime(2026, 3, 19, 22, 0),
    )
    assert item.completed is True
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_schemas.py -v
```

Expected: FAIL — `api.schemas` not found.

- [ ] **Step 3: Create `api/schemas.py`**

```python
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel


class ScoreEmbed(BaseModel):
    home_score: int | None
    away_score: int | None
    completed: bool

    model_config = {"from_attributes": True}


class GameListItem(BaseModel):
    game_id: str
    home_team: str | None
    away_team: str | None
    commence_time: datetime | None
    season: str | None
    sport: str | None
    score: ScoreEmbed | None

    model_config = {"from_attributes": True}


class OddsItem(BaseModel):
    bookmaker: str | None
    market_type: str | None
    outcome_name: str | None
    price: Decimal | None
    point: Decimal | None
    last_update: datetime | None

    model_config = {"from_attributes": True}


class PlayerPropItem(BaseModel):
    bookmaker: str | None
    player_name: str | None
    prop_type: str | None
    outcome: str | None
    price: Decimal | None
    point: Decimal | None

    model_config = {"from_attributes": True}


class ScoreItem(BaseModel):
    game_id: str | None
    home_score: int | None
    away_score: int | None
    completed: bool
    last_update: datetime | None
    fetched_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_schemas.py -v
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add api/schemas.py tests/test_schemas.py
git commit -m "feat: Pydantic response schemas"
```

---

## Task 5: Games router

**Files:**
- Create: `api/routers/games.py`
- Create: `tests/test_games.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_games.py`:

```python
from datetime import datetime
from api.models import Game, Score


async def test_list_games_empty(client):
    response = await client.get("/api/games")
    assert response.status_code == 200
    assert response.json() == []


async def test_list_games_without_score(client, db):
    db.add(Game(
        game_id="g1",
        home_team="Lakers",
        away_team="Celtics",
        commence_time=datetime(2026, 3, 19, 19, 0),
        season="2025-26",
        sport="basketball_nba",
    ))
    await db.commit()

    response = await client.get("/api/games")
    data = response.json()
    assert len(data) == 1
    assert data[0]["game_id"] == "g1"
    assert data[0]["score"] is None


async def test_list_games_with_score(client, db):
    db.add(Game(
        game_id="g2",
        home_team="Warriors",
        away_team="Bulls",
        commence_time=datetime(2026, 3, 18, 20, 0),
        season="2025-26",
        sport="basketball_nba",
    ))
    db.add(Score(
        game_id="g2",
        home_score=112,
        away_score=98,
        completed=True,
        fetched_at=datetime(2026, 3, 18, 22, 30),
    ))
    await db.commit()

    response = await client.get("/api/games")
    data = response.json()
    assert len(data) == 1
    assert data[0]["score"]["home_score"] == 112
    assert data[0]["score"]["completed"] is True


async def test_list_games_ordered_by_commence_time_desc(client, db):
    db.add(Game(
        game_id="early",
        home_team="A",
        away_team="B",
        commence_time=datetime(2026, 3, 17, 18, 0),
        season="2025-26",
        sport="basketball_nba",
    ))
    db.add(Game(
        game_id="late",
        home_team="C",
        away_team="D",
        commence_time=datetime(2026, 3, 19, 20, 0),
        season="2025-26",
        sport="basketball_nba",
    ))
    await db.commit()

    response = await client.get("/api/games")
    data = response.json()
    assert data[0]["game_id"] == "late"
    assert data[1]["game_id"] == "early"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_games.py -v
```

Expected: FAIL — `api.main` not importable yet (client fixture needs it).

- [ ] **Step 3: Create `api/routers/games.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from api.database import get_db
from api.models import Game
from api.schemas import GameListItem, ScoreEmbed

router = APIRouter()


@router.get("/games", response_model=list[GameListItem])
async def list_games(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Game)
        .options(selectinload(Game.score))
        .order_by(Game.commence_time.desc())
    )
    games = result.scalars().all()

    items = []
    for g in games:
        score_embed = None
        if g.score is not None:
            score_embed = ScoreEmbed(
                home_score=g.score.home_score,
                away_score=g.score.away_score,
                completed=g.score.completed or False,
            )
        items.append(
            GameListItem(
                game_id=g.game_id,
                home_team=g.home_team,
                away_team=g.away_team,
                commence_time=g.commence_time,
                season=g.season,
                sport=g.sport,
                score=score_embed,
            )
        )
    return items
```

- [ ] **Step 4: Create minimal `api/main.py` (enough to satisfy the `client` fixture)**

```python
from fastapi import FastAPI

app = FastAPI(title="Odds Admin")

from api.routers import games
app.include_router(games.router, prefix="/api")
```

Note: This is a minimal version to unblock testing. Task 9 completes it.

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_games.py -v
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add api/routers/games.py api/main.py tests/test_games.py
git commit -m "feat: GET /api/games with score join"
```

---

## Task 6: Odds router

**Files:**
- Create: `api/routers/odds.py`
- Create: `tests/test_odds.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_odds.py`:

```python
from datetime import datetime
from api.models import Game, Odds


async def test_get_odds_empty(client, db):
    db.add(Game(
        game_id="g1", home_team="A", away_team="B",
        commence_time=datetime(2026, 3, 19, 19, 0),
        season="2025-26", sport="basketball_nba",
    ))
    await db.commit()

    response = await client.get("/api/games/g1/odds")
    assert response.status_code == 200
    assert response.json() == []


async def test_get_odds_returns_latest_by_dedup_key(client, db):
    """Only the most recent fetched_at per (bookmaker, market_type, outcome_name) is returned."""
    db.add(Game(
        game_id="g1", home_team="A", away_team="B",
        commence_time=datetime(2026, 3, 19, 19, 0),
        season="2025-26", sport="basketball_nba",
    ))
    # Two entries for same dedup key — only the newer one (price=-160) should be returned
    db.add(Odds(
        game_id="g1", bookmaker="DraftKings", market_type="h2h",
        outcome_name="Lakers", price=-150, point=None,
        last_update=datetime(2026, 3, 19, 10, 0),
        fetched_at=datetime(2026, 3, 19, 10, 0),
    ))
    db.add(Odds(
        game_id="g1", bookmaker="DraftKings", market_type="h2h",
        outcome_name="Lakers", price=-160, point=None,
        last_update=datetime(2026, 3, 19, 11, 0),
        fetched_at=datetime(2026, 3, 19, 11, 0),
    ))
    await db.commit()

    response = await client.get("/api/games/g1/odds")
    data = response.json()
    assert len(data) == 1
    assert float(data[0]["price"]) == -160.0


async def test_get_odds_different_dedup_keys_both_returned(client, db):
    db.add(Game(
        game_id="g1", home_team="A", away_team="B",
        commence_time=datetime(2026, 3, 19, 19, 0),
        season="2025-26", sport="basketball_nba",
    ))
    db.add(Odds(
        game_id="g1", bookmaker="DraftKings", market_type="h2h",
        outcome_name="Lakers", price=-165, point=None,
        last_update=datetime(2026, 3, 19, 11, 0),
        fetched_at=datetime(2026, 3, 19, 11, 0),
    ))
    db.add(Odds(
        game_id="g1", bookmaker="DraftKings", market_type="h2h",
        outcome_name="Celtics", price=140, point=None,
        last_update=datetime(2026, 3, 19, 11, 0),
        fetched_at=datetime(2026, 3, 19, 11, 0),
    ))
    await db.commit()

    response = await client.get("/api/games/g1/odds")
    assert len(response.json()) == 2
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_odds.py -v
```

Expected: FAIL — router not registered.

- [ ] **Step 3: Create `api/routers/odds.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from api.database import get_db
from api.models import Odds
from api.schemas import OddsItem

router = APIRouter()


@router.get("/games/{game_id}/odds", response_model=list[OddsItem])
async def get_odds(game_id: str, db: AsyncSession = Depends(get_db)):
    subq = (
        select(
            Odds.bookmaker,
            Odds.market_type,
            Odds.outcome_name,
            func.max(Odds.fetched_at).label("max_fetched_at"),
        )
        .where(Odds.game_id == game_id)
        .group_by(Odds.bookmaker, Odds.market_type, Odds.outcome_name)
        .subquery()
    )

    result = await db.execute(
        select(Odds)
        .join(
            subq,
            and_(
                Odds.bookmaker == subq.c.bookmaker,
                Odds.market_type == subq.c.market_type,
                Odds.outcome_name == subq.c.outcome_name,
                Odds.fetched_at == subq.c.max_fetched_at,
            ),
        )
        .where(Odds.game_id == game_id)
        .order_by(Odds.bookmaker, Odds.market_type, Odds.outcome_name)
    )
    return result.scalars().all()
```

- [ ] **Step 4: Register the router in `api/main.py`**

Add below the games include:

```python
from api.routers import odds
app.include_router(odds.router, prefix="/api")
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_odds.py -v
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add api/routers/odds.py api/main.py tests/test_odds.py
git commit -m "feat: GET /api/games/{id}/odds with latest-only deduplication"
```

---

## Task 7: Player props router

**Files:**
- Create: `api/routers/props.py`
- Create: `tests/test_props.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_props.py`:

```python
from datetime import datetime
from api.models import Game, PlayerProp


async def test_get_props_empty(client, db):
    db.add(Game(
        game_id="g1", home_team="A", away_team="B",
        commence_time=datetime(2026, 3, 19, 19, 0),
        season="2025-26", sport="basketball_nba",
    ))
    await db.commit()

    response = await client.get("/api/games/g1/props")
    assert response.status_code == 200
    assert response.json() == []


async def test_get_props_returns_all_for_game(client, db):
    db.add(Game(
        game_id="g1", home_team="A", away_team="B",
        commence_time=datetime(2026, 3, 19, 19, 0),
        season="2025-26", sport="basketball_nba",
    ))
    db.add(PlayerProp(
        game_id="g1", bookmaker="DraftKings", player_name="Tatum",
        prop_type="player_points", outcome="Over", price=-110, point=27.5,
        fetched_at=datetime(2026, 3, 19, 10, 0),
    ))
    db.add(PlayerProp(
        game_id="g1", bookmaker="DraftKings", player_name="Brown",
        prop_type="player_points", outcome="Over", price=-110, point=22.5,
        fetched_at=datetime(2026, 3, 19, 10, 0),
    ))
    await db.commit()

    response = await client.get("/api/games/g1/props")
    data = response.json()
    assert len(data) == 2
    players = {p["player_name"] for p in data}
    assert players == {"Tatum", "Brown"}


async def test_get_props_ordered_by_player_then_prop_type(client, db):
    db.add(Game(
        game_id="g1", home_team="A", away_team="B",
        commence_time=datetime(2026, 3, 19, 19, 0),
        season="2025-26", sport="basketball_nba",
    ))
    db.add(PlayerProp(
        game_id="g1", bookmaker="DraftKings", player_name="Tatum",
        prop_type="player_rebounds", outcome="Over", price=-115, point=8.5,
        fetched_at=datetime(2026, 3, 19, 10, 0),
    ))
    db.add(PlayerProp(
        game_id="g1", bookmaker="DraftKings", player_name="Brown",
        prop_type="player_points", outcome="Over", price=-110, point=22.5,
        fetched_at=datetime(2026, 3, 19, 10, 0),
    ))
    db.add(PlayerProp(
        game_id="g1", bookmaker="DraftKings", player_name="Tatum",
        prop_type="player_points", outcome="Over", price=-110, point=27.5,
        fetched_at=datetime(2026, 3, 19, 10, 0),
    ))
    await db.commit()

    response = await client.get("/api/games/g1/props")
    data = response.json()
    # Brown before Tatum (alphabetical), Tatum's points before rebounds
    assert data[0]["player_name"] == "Brown"
    assert data[1]["player_name"] == "Tatum"
    assert data[1]["prop_type"] == "player_points"
    assert data[2]["player_name"] == "Tatum"
    assert data[2]["prop_type"] == "player_rebounds"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_props.py -v
```

Expected: FAIL — router not registered.

- [ ] **Step 3: Create `api/routers/props.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.database import get_db
from api.models import PlayerProp
from api.schemas import PlayerPropItem

router = APIRouter()


@router.get("/games/{game_id}/props", response_model=list[PlayerPropItem])
async def get_props(game_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlayerProp)
        .where(PlayerProp.game_id == game_id)
        .order_by(PlayerProp.player_name, PlayerProp.prop_type)
    )
    return result.scalars().all()
```

- [ ] **Step 4: Register the router in `api/main.py`**

```python
from api.routers import props
app.include_router(props.router, prefix="/api")
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_props.py -v
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add api/routers/props.py api/main.py tests/test_props.py
git commit -m "feat: GET /api/games/{id}/props"
```

---

## Task 8: Scores router

**Files:**
- Create: `api/routers/scores.py`
- Create: `tests/test_scores.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_scores.py`:

```python
from datetime import datetime
from api.models import Game, Score


async def test_get_score_404_when_missing(client, db):
    db.add(Game(
        game_id="g1", home_team="A", away_team="B",
        commence_time=datetime(2026, 3, 19, 19, 0),
        season="2025-26", sport="basketball_nba",
    ))
    await db.commit()

    response = await client.get("/api/games/g1/scores")
    assert response.status_code == 404


async def test_get_score_returns_score(client, db):
    db.add(Game(
        game_id="g1", home_team="Lakers", away_team="Celtics",
        commence_time=datetime(2026, 3, 18, 20, 0),
        season="2025-26", sport="basketball_nba",
    ))
    db.add(Score(
        game_id="g1",
        home_score=110,
        away_score=105,
        completed=True,
        last_update=datetime(2026, 3, 18, 22, 0),
        fetched_at=datetime(2026, 3, 18, 22, 30),
    ))
    await db.commit()

    response = await client.get("/api/games/g1/scores")
    assert response.status_code == 200
    data = response.json()
    assert data["home_score"] == 110
    assert data["away_score"] == 105
    assert data["completed"] is True
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_scores.py -v
```

Expected: FAIL — router not registered.

- [ ] **Step 3: Create `api/routers/scores.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.database import get_db
from api.models import Score
from api.schemas import ScoreItem

router = APIRouter()


@router.get("/games/{game_id}/scores", response_model=ScoreItem)
async def get_score(game_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Score).where(Score.game_id == game_id)
    )
    score = result.scalar_one_or_none()
    if score is None:
        raise HTTPException(status_code=404, detail="Score not found")
    return score
```

- [ ] **Step 4: Register the router in `api/main.py`**

```python
from api.routers import scores
app.include_router(scores.router, prefix="/api")
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_scores.py -v
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add api/routers/scores.py api/main.py tests/test_scores.py
git commit -m "feat: GET /api/games/{id}/scores"
```

---

## Task 9: Finalize FastAPI main app

**Files:**
- Modify: `api/main.py`

- [ ] **Step 1: Run full test suite to confirm baseline**

```bash
pytest -v
```

Expected: all existing tests PASS.

- [ ] **Step 2: Replace `api/main.py` with the final version**

```python
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from api.routers import games, odds, props, scores

app = FastAPI(title="Odds Admin")

# Routers registered first — StaticFiles mount must come last
app.include_router(games.router, prefix="/api")
app.include_router(odds.router, prefix="/api")
app.include_router(props.router, prefix="/api")
app.include_router(scores.router, prefix="/api")

# Serve React SPA for all non-API routes (only when static dir is present)
static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
```

- [ ] **Step 3: Run full test suite again**

```bash
pytest -v
```

Expected: all PASS (no regression).

- [ ] **Step 4: Commit**

```bash
git add api/main.py
git commit -m "feat: finalize FastAPI app with static SPA mount"
```

---

## Task 10: React + Vite + Tailwind scaffold

**Files:**
- Create: `web/` directory tree

Prerequisites: Node.js 20+ installed. Run `node --version` to confirm.

- [ ] **Step 1: Scaffold Vite + React + TypeScript project**

```bash
npm create vite@latest web -- --template react-ts
cd web
npm install
```

- [ ] **Step 2: Install Tailwind CSS**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 3: Install shadcn/ui dependencies**

```bash
npm install class-variance-authority clsx tailwind-merge lucide-react
```

- [ ] **Step 4: Replace `web/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 5: Replace `web/src/index.css`** (Tailwind directives + dark theme base)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    color-scheme: dark;
  }
  body {
    @apply bg-slate-950 text-slate-300 min-h-screen;
  }
}
```

- [ ] **Step 6: Create `web/src/lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 7: Update `web/vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 8: Update `web/tsconfig.json`** to add path alias

Add under `compilerOptions`:
```json
"baseUrl": ".",
"paths": {
  "@/*": ["./src/*"]
}
```

- [ ] **Step 9: Install `@types/node` for path resolution in vite config**

```bash
npm install -D @types/node
```

- [ ] **Step 10: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts on http://localhost:5173. Stop with Ctrl+C.

- [ ] **Step 11: Commit**

```bash
cd ..
git add web/
git commit -m "chore: React + Vite + Tailwind + shadcn deps scaffold"
```

---

## Task 11: Typed API client

**Files:**
- Create: `web/src/api/client.ts`

- [ ] **Step 1: Create `web/src/api/client.ts`**

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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ..
git add web/src/api/client.ts
git commit -m "feat: typed API client functions"
```

---

## Task 12: StatusBadge component

**Files:**
- Create: `web/src/components/StatusBadge.tsx`

- [ ] **Step 1: Create `web/src/components/StatusBadge.tsx`**

```tsx
import { cn } from "@/lib/utils";

export type GameStatus = "LIVE" | "UPCOMING" | "FINAL";

export function deriveStatus(
  commenceTime: string | null,
  completed: boolean | undefined
): GameStatus {
  if (completed) return "FINAL";
  if (!commenceTime) return "UPCOMING";
  return new Date(commenceTime) <= new Date() ? "LIVE" : "UPCOMING";
}

interface StatusBadgeProps {
  status: GameStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "text-[10px] font-bold tracking-wide px-2 py-0.5 rounded",
        status === "LIVE" && "bg-red-900 text-red-400",
        status === "UPCOMING" && "bg-blue-950 text-blue-400",
        status === "FINAL" && "bg-green-950 text-green-400"
      )}
    >
      {status}
    </span>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ..
git add web/src/components/StatusBadge.tsx
git commit -m "feat: StatusBadge component"
```

---

## Task 13: OddsTab component

**Files:**
- Create: `web/src/components/OddsTab.tsx`

- [ ] **Step 1: Create `web/src/components/OddsTab.tsx`**

```tsx
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { OddsItem } from "@/api/client";

type MarketFilter = "h2h" | "spreads" | "totals";

const MARKET_LABELS: Record<MarketFilter, string> = {
  h2h: "H2H",
  spreads: "Spreads",
  totals: "Totals",
};

function formatPrice(price: number | null): string {
  if (price === null) return "—";
  return price > 0 ? `+${price}` : String(price);
}

function formatLastUpdate(ts: string | null): string {
  if (!ts) return "—";
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return new Date(ts).toLocaleTimeString();
}

interface OddsTabProps {
  odds: OddsItem[];
}

export function OddsTab({ odds }: OddsTabProps) {
  const [filter, setFilter] = useState<MarketFilter>("h2h");

  const filtered = odds.filter((o) => o.market_type === filter);

  return (
    <div className="py-2">
      <div className="flex gap-2 px-4 pb-3">
        {(["h2h", "spreads", "totals"] as MarketFilter[]).map((m) => (
          <button
            key={m}
            onClick={() => setFilter(m)}
            className={cn(
              "text-[10px] font-bold tracking-wide px-2 py-1 rounded cursor-pointer",
              filter === m
                ? "bg-blue-950 text-blue-400"
                : "bg-slate-800 text-slate-500 hover:text-slate-400"
            )}
          >
            {MARKET_LABELS[m]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-3 text-sm text-slate-500">No odds available.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr>
              {["Bookmaker", "Outcome", "Price", "Last Update"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => (
              <tr key={i} className="border-t border-slate-900 hover:bg-slate-900/50">
                <td className="px-4 py-2 text-slate-200 font-medium">{o.bookmaker}</td>
                <td className="px-4 py-2 text-slate-400">{o.outcome_name}</td>
                <td
                  className={cn(
                    "px-4 py-2 font-semibold",
                    o.price !== null && o.price > 0 ? "text-green-400" : "text-red-400"
                  )}
                >
                  {formatPrice(o.price)}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {formatLastUpdate(o.last_update)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ..
git add web/src/components/OddsTab.tsx
git commit -m "feat: OddsTab component with market filter"
```

---

## Task 14: PlayerPropsTab component

**Files:**
- Create: `web/src/components/PlayerPropsTab.tsx`

- [ ] **Step 1: Create `web/src/components/PlayerPropsTab.tsx`**

```tsx
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { PlayerPropItem } from "@/api/client";

type PropFilter = "all" | "player_points" | "player_rebounds" | "player_assists";

const FILTER_LABELS: Record<PropFilter, string> = {
  all: "All",
  player_points: "Points",
  player_rebounds: "Rebounds",
  player_assists: "Assists",
};

function groupByPlayer(props: PlayerPropItem[]): Map<string, PlayerPropItem[]> {
  const map = new Map<string, PlayerPropItem[]>();
  for (const p of props) {
    const name = p.player_name ?? "Unknown";
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(p);
  }
  return map;
}

interface PlayerPropsTabProps {
  props: PlayerPropItem[];
}

export function PlayerPropsTab({ props }: PlayerPropsTabProps) {
  const [filter, setFilter] = useState<PropFilter>("all");

  const filtered =
    filter === "all" ? props : props.filter((p) => p.prop_type === filter);

  const grouped = groupByPlayer(filtered);

  return (
    <div className="py-2">
      <div className="flex gap-2 px-4 pb-3">
        {(["all", "player_points", "player_rebounds", "player_assists"] as PropFilter[]).map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "text-[10px] font-bold tracking-wide px-2 py-1 rounded cursor-pointer",
                filter === f
                  ? "bg-blue-950 text-blue-400"
                  : "bg-slate-800 text-slate-500 hover:text-slate-400"
              )}
            >
              {FILTER_LABELS[f]}
            </button>
          )
        )}
      </div>

      {grouped.size === 0 ? (
        <p className="px-4 py-3 text-sm text-slate-500">No player props available.</p>
      ) : (
        <div className="flex flex-col gap-3 px-4 pb-3">
          {Array.from(grouped.entries()).map(([player, playerProps]) => (
            <div key={player}>
              <p className="text-[13px] font-bold text-slate-200 mb-2 pb-1 border-b border-slate-800">
                {player}
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {["Bookmaker", "Prop", "Line", "Outcome", "Price"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {playerProps.map((p, i) => (
                    <tr key={i} className="border-t border-slate-900">
                      <td className="px-2 py-1.5 text-slate-300 font-medium">{p.bookmaker}</td>
                      <td className="px-2 py-1.5 text-violet-400 font-semibold">
                        {p.prop_type?.replace("player_", "") ?? "—"}
                      </td>
                      <td className="px-2 py-1.5 text-blue-400 font-semibold">
                        {p.point ?? "—"}
                      </td>
                      <td className="px-2 py-1.5 text-slate-400">{p.outcome}</td>
                      <td
                        className={cn(
                          "px-2 py-1.5 font-semibold",
                          p.price !== null && p.price > 0
                            ? "text-green-400"
                            : "text-red-400"
                        )}
                      >
                        {p.price !== null
                          ? p.price > 0
                            ? `+${p.price}`
                            : String(p.price)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ..
git add web/src/components/PlayerPropsTab.tsx
git commit -m "feat: PlayerPropsTab with player grouping and prop type filter"
```

---

## Task 15: ScoreTab component

**Files:**
- Create: `web/src/components/ScoreTab.tsx`

- [ ] **Step 1: Create `web/src/components/ScoreTab.tsx`**

```tsx
import { cn } from "@/lib/utils";
import type { ScoreItem } from "@/api/client";
import type { Game } from "@/api/client";

interface ScoreTabProps {
  score: ScoreItem | null;
  game: Game;
}

export function ScoreTab({ score, game }: ScoreTabProps) {
  if (!score) {
    return (
      <p className="px-4 py-6 text-sm text-slate-500">No score available yet.</p>
    );
  }

  const awayWon =
    score.away_score !== null &&
    score.home_score !== null &&
    score.away_score > score.home_score;
  const homeWon =
    score.home_score !== null &&
    score.away_score !== null &&
    score.home_score > score.away_score;

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-8 justify-center mb-4">
        <div className="flex-1 text-center">
          <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Away</p>
          <p className="text-sm font-semibold text-slate-300 mb-3">{game.away_team}</p>
          <p className={cn("text-5xl font-extrabold", awayWon ? "text-green-400" : "text-slate-200")}>
            {score.away_score ?? "—"}
          </p>
        </div>

        <div className="text-2xl text-slate-700 mt-6">—</div>

        <div className="flex-1 text-center">
          <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Home</p>
          <p className="text-sm font-semibold text-slate-300 mb-3">{game.home_team}</p>
          <p className={cn("text-5xl font-extrabold", homeWon ? "text-green-400" : "text-slate-200")}>
            {score.home_score ?? "—"}
          </p>
        </div>
      </div>

      <div className="text-center">
        <span className="inline-block bg-green-950 text-green-400 text-[10px] font-bold tracking-widest px-3 py-1 rounded mb-2">
          {score.completed ? "FINAL" : "IN PROGRESS"}
        </span>
        {score.last_update && (
          <p className="text-[11px] text-slate-600">
            Last updated: {new Date(score.last_update).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ..
git add web/src/components/ScoreTab.tsx
git commit -m "feat: ScoreTab scoreboard component"
```

---

## Task 16: GameCard component

**Files:**
- Create: `web/src/components/GameCard.tsx`

- [ ] **Step 1: Create `web/src/components/GameCard.tsx`**

```tsx
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge, deriveStatus } from "./StatusBadge";
import { OddsTab } from "./OddsTab";
import { PlayerPropsTab } from "./PlayerPropsTab";
import { ScoreTab } from "./ScoreTab";
import { fetchOdds, fetchProps, fetchScore } from "@/api/client";
import type { Game, OddsItem, PlayerPropItem, ScoreItem } from "@/api/client";

type Tab = "odds" | "props" | "score";

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("odds");
  const [odds, setOdds] = useState<OddsItem[] | null>(null);
  const [props, setProps] = useState<PlayerPropItem[] | null>(null);
  const [score, setScore] = useState<ScoreItem | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const status = deriveStatus(
    game.commence_time,
    game.score?.completed
  );

  async function handleExpand() {
    if (!expanded && odds === null) {
      setLoading(true);
      const [oddsData, propsData, scoreData] = await Promise.all([
        fetchOdds(game.game_id),
        fetchProps(game.game_id),
        fetchScore(game.game_id),
      ]);
      setOdds(oddsData);
      setProps(propsData);
      setScore(scoreData);
      setLoading(false);
    }
    setExpanded((v) => !v);
  }

  const scoreDisplay =
    game.score?.home_score != null && game.score?.away_score != null
      ? `${game.score.away_score} – ${game.score.home_score}`
      : "– – –";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden mb-2">
      {/* Collapsed row */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={handleExpand}
      >
        <span className="text-[11px] text-slate-500 min-w-[52px]">
          {game.commence_time
            ? new Date(game.commence_time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </span>

        <div className="flex-1">
          <p className="text-sm font-medium text-slate-100">
            {game.away_team} vs {game.home_team}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {game.sport} · {game.season}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <span
            className={cn(
              "text-[13px] font-semibold min-w-[52px] text-right",
              game.score ? "text-slate-300" : "text-slate-700"
            )}
          >
            {scoreDisplay}
          </span>
        </div>

        <ChevronRight
          className={cn(
            "w-4 h-4 text-slate-500 transition-transform",
            expanded && "rotate-90"
          )}
        />
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-slate-800 bg-slate-950">
          {/* Tab bar */}
          <div className="flex border-b border-slate-800 px-4">
            {(["odds", "props", "score"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "text-xs px-3 py-2.5 border-b-2 transition-colors capitalize",
                  activeTab === tab
                    ? "border-blue-400 text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-400"
                )}
              >
                {tab === "props" ? "Player Props" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="px-4 py-4 text-sm text-slate-500">Loading...</p>
          ) : (
            <>
              {activeTab === "odds" && <OddsTab odds={odds ?? []} />}
              {activeTab === "props" && <PlayerPropsTab props={props ?? []} />}
              {activeTab === "score" && (
                <ScoreTab score={score ?? null} game={game} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ..
git add web/src/components/GameCard.tsx
git commit -m "feat: GameCard with expand/collapse and tabbed detail panel"
```

---

## Task 17: GamesPage with date grouping

**Files:**
- Create: `web/src/pages/GamesPage.tsx`

- [ ] **Step 1: Create `web/src/pages/GamesPage.tsx`**

```tsx
import { useEffect, useState } from "react";
import { fetchGames } from "@/api/client";
import { GameCard } from "@/components/GameCard";
import type { Game } from "@/api/client";

function toLocalDateString(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function groupGamesByDate(games: Game[]): [string, Game[]][] {
  const map = new Map<string, Game[]>();
  for (const game of games) {
    const label = game.commence_time
      ? toLocalDateString(game.commence_time)
      : "Unknown Date";
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(game);
  }
  return Array.from(map.entries());
}

function getRelativeLabel(dateLabel: string): string {
  const today = toLocalDateString(new Date().toISOString());
  const yesterday = toLocalDateString(
    new Date(Date.now() - 86400000).toISOString()
  );
  if (dateLabel === today) return `Today — ${dateLabel}`;
  if (dateLabel === yesterday) return `Yesterday — ${dateLabel}`;
  return dateLabel;
}

export function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGames()
      .then(setGames)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="px-6 py-8 text-slate-500">Loading games...</p>;
  }
  if (error) {
    return (
      <p className="px-6 py-8 text-red-400">
        Failed to load games: {error}
      </p>
    );
  }
  if (games.length === 0) {
    return (
      <p className="px-6 py-8 text-slate-500">No games found in the database.</p>
    );
  }

  const grouped = groupGamesByDate(games);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {grouped.map(([dateLabel, dateGames]) => (
        <div key={dateLabel} className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 pb-2 mb-3 border-b border-slate-800">
            {getRelativeLabel(dateLabel)}
          </p>
          {dateGames.map((game) => (
            <GameCard key={game.game_id} game={game} />
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ..
git add web/src/pages/GamesPage.tsx
git commit -m "feat: GamesPage with date grouping and relative labels"
```

---

## Task 18: App.tsx, main.tsx, and frontend wiring

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/main.tsx`
- Modify: `web/index.html`

- [ ] **Step 1: Replace `web/src/App.tsx`**

```tsx
import { GamesPage } from "./pages/GamesPage";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Nav bar */}
      <nav className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <span className="text-slate-100 font-bold text-base tracking-wide">
          Odds Admin
        </span>
        <div className="flex gap-4 text-sm">
          <span className="text-slate-100 border-b-2 border-blue-400 pb-0.5">
            Games
          </span>
          <span className="text-slate-500 cursor-not-allowed" title="Coming soon">
            Raw Data
          </span>
        </div>
      </nav>

      <GamesPage />
    </div>
  );
}
```

- [ ] **Step 2: Replace `web/src/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 3: Update `web/index.html` title**

Change `<title>Vite + React + TS</title>` to `<title>Odds Admin</title>`.

- [ ] **Step 4: Remove boilerplate files from git tracking**

```bash
cd web && git rm src/App.css src/assets/react.svg && cd ..
```

- [ ] **Step 5: Verify build succeeds**

```bash
cd web && npm run build
```

Expected: `dist/` created with no errors. Stop after confirming.

- [ ] **Step 6: Commit**

```bash
cd ..
git add web/src/App.tsx web/src/main.tsx web/index.html
git commit -m "feat: wire up App and GamesPage, clean boilerplate"
```

---

## Task 19: Multi-stage Dockerfile

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
# Stage 1: Build React app
FROM node:20-alpine AS frontend-builder
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Python API server
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY api/ ./api/
COPY --from=frontend-builder /web/dist ./static
EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Verify Docker build succeeds**

Prerequisites: Docker daemon running. Run from the `odds-admin/` directory:

```bash
docker build -t odds-admin:local .
```

Expected: build completes, two stages, image tagged `odds-admin:local`.

- [ ] **Step 3: Smoke-test the image locally**

```bash
docker run --rm -p 8000:8000 \
  -e DATA_DB_HOST=host.docker.internal \
  -e DATA_DB_PORT=5433 \
  -e DATA_DB_USER=odds \
  -e DATA_DB_PASSWORD=odds_password \
  -e DATA_DB_NAME=odds_db \
  odds-admin:local
```

Open http://localhost:8000 — should show the React app. Open http://localhost:8000/api/games — should return JSON (empty list if DB has no data, or actual games if odds-pipeline is running).

Stop the container with Ctrl+C.

- [ ] **Step 4: Create `.dockerignore`**

```
.git
.superpowers
docs
tests
web/node_modules
web/dist
__pycache__
*.pyc
.env
```

- [ ] **Step 5: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "feat: multi-stage Dockerfile"
```

---

## Task 20: Add odds-admin to odds-pipeline docker-compose

**Files:**
- Modify: `../odds-pipeline/docker-compose.yml`

- [ ] **Step 1: Add the `odds-admin` service to `odds-pipeline/docker-compose.yml`**

Add this block to the `services:` section (after the `pgadmin` service, before `postgres_exporter_data`):

```yaml
  odds-admin:
    build:
      context: ../odds-admin
      dockerfile: Dockerfile
    ports:
      - "8001:8000"
    environment:
      - DATA_DB_HOST=data-postgres
      - DATA_DB_PORT=5432
      - DATA_DB_USER=${DATA_DB_USER:-odds}
      - DATA_DB_PASSWORD=${DATA_DB_PASSWORD:-odds_password}
      - DATA_DB_NAME=${DATA_DB_NAME:-odds_db}
    depends_on:
      data-postgres:
        condition: service_healthy
```

Note: No explicit `networks:` entry needed. The `data-postgres`, `pgadmin`, and Airflow services in `odds-pipeline/docker-compose.yml` all use the implicit default network (no `networks:` key). Only the Prometheus exporters opt into the external `monitoring` network. `odds-admin` joining the default network is sufficient to resolve `data-postgres` by hostname.

- [ ] **Step 2: Verify docker-compose config is valid**

```bash
cd ../odds-pipeline && docker-compose config --quiet
```

Expected: no errors.

- [ ] **Step 3: Start the full stack and verify**

```bash
docker-compose up odds-admin data-postgres --build
```

Open http://localhost:8001 — React app should load. Open http://localhost:8001/api/games — should return game data if the pipeline has been run.

- [ ] **Step 4: Commit changes to both repos**

```bash
# In odds-pipeline/
git add docker-compose.yml
git commit -m "feat: add odds-admin service to docker-compose"

# In odds-admin/
cd ../odds-admin
git add .
git commit -m "chore: final integration complete"
```

---

## Full test suite

After all tasks are complete, run the full Python test suite from the `odds-admin/` directory:

```bash
pytest -v
```

Expected output: all tests in `test_database`, `test_models`, `test_schemas`, `test_games`, `test_odds`, `test_props`, `test_scores` pass.
