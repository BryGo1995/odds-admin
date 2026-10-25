# Recommendations Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/recommendations` page to odds-admin showing ML-generated player prop picks for the day, with a top 5 module and a full filterable/sortable table.

**Architecture:** New read-only `PropRecommendation` SQLAlchemy model maps to the existing `recommendations` table. A new FastAPI router exposes two endpoints (`GET /recommendations` and `GET /recommendations/top`). The React frontend adds a `RecommendationsPage` with two sub-components: `TopPicksModule` (5-card grid) and `RecommendationsTable` (filterable, sortable). Date navigation lives in the page and triggers re-fetches.

**Tech Stack:** Python/FastAPI/SQLAlchemy (async), pytest-asyncio + httpx for backend tests, React/TypeScript/Tailwind for frontend.

---

## File Map

**Create:**
- `api/routers/recommendations.py` — two GET endpoints for recommendations data
- `tests/test_recommendations.py` — backend API tests
- `web/src/pages/RecommendationsPage.tsx` — full page with `TopPicksModule` and `RecommendationsTable` inline components

**Modify:**
- `api/models.py` — add `PropRecommendation` model
- `api/schemas.py` — add `PropRecommendationItem` schema
- `api/main.py` — register recommendations router
- `web/src/api/client.ts` — add `PropRecommendationItem` interface + two fetch functions
- `web/src/App.tsx` — add nav link and route

---

## Task 1: Add PropRecommendation model and schema

**Files:**
- Modify: `api/models.py`
- Modify: `api/schemas.py`

- [ ] **Step 1: Add `PropRecommendation` to `api/models.py`**

Add after the `PlayerGameLog` class:

```python
class PropRecommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    player_name: Mapped[str | None] = mapped_column(String(100))
    prop_type: Mapped[str | None] = mapped_column(String(100))
    bookmaker: Mapped[str | None] = mapped_column(String(50))
    line: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    outcome: Mapped[str | None] = mapped_column(String(20))
    model_prob: Mapped[Decimal | None] = mapped_column(Numeric(10, 6))
    implied_prob: Mapped[Decimal | None] = mapped_column(Numeric(10, 6))
    edge: Mapped[Decimal | None] = mapped_column(Numeric(10, 6))
    rank: Mapped[int | None] = mapped_column(Integer)
    model_version: Mapped[str | None] = mapped_column(String(50))
    game_date: Mapped[date | None] = mapped_column(Date)
```

- [ ] **Step 2: Add `PropRecommendationItem` to `api/schemas.py`**

Add after `PlayerGameLogItem`:

```python
class PropRecommendationItem(_Base):
    id: int
    player_name: str | None
    prop_type: str | None
    bookmaker: str | None
    line: Decimal | None
    outcome: str | None
    model_prob: Decimal | None
    implied_prob: Decimal | None
    edge: Decimal | None
    rank: int | None
    model_version: str | None
    game_date: date | None
```

- [ ] **Step 3: Commit**

```bash
git add api/models.py api/schemas.py
git commit -m "feat: add PropRecommendation model and schema"
```

---

## Task 2: Write failing tests for the recommendations router

**Files:**
- Create: `tests/test_recommendations.py`

- [ ] **Step 1: Create `tests/test_recommendations.py` with helpers and failing tests**

```python
from datetime import date, datetime
from decimal import Decimal
from api.models import PropRecommendation


# ── helpers ──────────────────────────────────────────────────────────────────

def _rec(
    player_name: str,
    prop_type: str,
    bookmaker: str,
    rank: int,
    game_date: date,
    edge: float = 0.10,
    model_prob: float = 0.60,
    implied_prob: float = 0.50,
    line: float = 24.5,
    outcome: str = "Over",
    model_version: str = "v3",
) -> PropRecommendation:
    return PropRecommendation(
        player_name=player_name,
        prop_type=prop_type,
        bookmaker=bookmaker,
        line=Decimal(str(line)),
        outcome=outcome,
        model_prob=Decimal(str(model_prob)),
        implied_prob=Decimal(str(implied_prob)),
        edge=Decimal(str(edge)),
        rank=rank,
        model_version=model_version,
        game_date=game_date,
    )


# ── GET /api/recommendations ──────────────────────────────────────────────────

async def test_list_recommendations_empty(client):
    response = await client.get("/api/recommendations?date=2026-03-28")
    assert response.status_code == 200
    assert response.json() == []


async def test_list_recommendations_returns_all_for_date(client, db):
    today = date(2026, 3, 28)
    db.add(_rec("LeBron James", "player_points", "DraftKings", 1, today, edge=0.13))
    db.add(_rec("Stephen Curry", "player_assists", "FanDuel", 2, today, edge=0.09))
    db.add(_rec("Nikola Jokic", "player_rebounds", "BetMGM", 3, date(2026, 3, 27), edge=0.08))
    await db.commit()

    response = await client.get("/api/recommendations?date=2026-03-28")
    data = response.json()
    assert len(data) == 2
    assert data[0]["player_name"] == "LeBron James"
    assert data[1]["player_name"] == "Stephen Curry"


async def test_list_recommendations_ordered_by_rank(client, db):
    today = date(2026, 3, 28)
    db.add(_rec("C Player", "player_points", "DraftKings", 3, today))
    db.add(_rec("A Player", "player_points", "DraftKings", 1, today))
    db.add(_rec("B Player", "player_points", "DraftKings", 2, today))
    await db.commit()

    response = await client.get("/api/recommendations?date=2026-03-28")
    data = response.json()
    ranks = [r["rank"] for r in data]
    assert ranks == [1, 2, 3]


async def test_list_recommendations_defaults_to_today(client, db):
    import datetime as dt
    today = dt.date.today()
    db.add(_rec("Today Player", "player_points", "DraftKings", 1, today))
    await db.commit()

    response = await client.get("/api/recommendations")
    data = response.json()
    assert len(data) == 1
    assert data[0]["player_name"] == "Today Player"


# ── GET /api/recommendations/top ─────────────────────────────────────────────

async def test_top_recommendations_returns_top_5_by_default(client, db):
    today = date(2026, 3, 28)
    for i in range(1, 8):
        db.add(_rec(f"Player {i}", "player_points", "DraftKings", i, today))
    await db.commit()

    response = await client.get("/api/recommendations/top?date=2026-03-28")
    data = response.json()
    assert len(data) == 5
    assert data[0]["rank"] == 1
    assert data[4]["rank"] == 5


async def test_top_recommendations_respects_limit(client, db):
    today = date(2026, 3, 28)
    for i in range(1, 8):
        db.add(_rec(f"Player {i}", "player_points", "DraftKings", i, today))
    await db.commit()

    response = await client.get("/api/recommendations/top?date=2026-03-28&limit=3")
    data = response.json()
    assert len(data) == 3


async def test_top_recommendations_empty(client):
    response = await client.get("/api/recommendations/top?date=2026-03-28")
    assert response.status_code == 200
    assert response.json() == []


async def test_top_recommendations_includes_all_fields(client, db):
    today = date(2026, 3, 28)
    db.add(_rec(
        "LeBron James", "player_points", "DraftKings", 1, today,
        edge=0.132, model_prob=0.65, implied_prob=0.518, line=24.5,
        outcome="Over", model_version="v3",
    ))
    await db.commit()

    response = await client.get("/api/recommendations/top?date=2026-03-28")
    data = response.json()
    assert len(data) == 1
    r = data[0]
    assert r["player_name"] == "LeBron James"
    assert r["prop_type"] == "player_points"
    assert r["bookmaker"] == "DraftKings"
    assert float(r["line"]) == 24.5
    assert r["outcome"] == "Over"
    assert float(r["model_prob"]) == pytest.approx(0.65, abs=1e-4)
    assert float(r["implied_prob"]) == pytest.approx(0.518, abs=1e-4)
    assert float(r["edge"]) == pytest.approx(0.132, abs=1e-4)
    assert r["rank"] == 1
    assert r["model_version"] == "v3"
```

Add `import pytest` to the top of the file (needed for `pytest.approx`):

```python
import pytest
from datetime import date, datetime
from decimal import Decimal
from api.models import PropRecommendation
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_recommendations.py -v
```

Expected: All tests FAIL with `404 Not Found` or import errors since the router doesn't exist yet.

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/test_recommendations.py
git commit -m "test: add failing tests for recommendations endpoints"
```

---

## Task 3: Implement the recommendations router

**Files:**
- Create: `api/routers/recommendations.py`
- Modify: `api/main.py`

- [ ] **Step 1: Create `api/routers/recommendations.py`**

```python
import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.database import get_db
from api.models import PropRecommendation
from api.schemas import PropRecommendationItem

router = APIRouter()


@router.get("/recommendations", response_model=list[PropRecommendationItem])
async def list_recommendations(
    date: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    game_date = (
        datetime.date.fromisoformat(date)
        if date
        else datetime.date.today()
    )
    result = await db.execute(
        select(PropRecommendation)
        .where(PropRecommendation.game_date == game_date)
        .order_by(PropRecommendation.rank)
    )
    return result.scalars().all()


@router.get("/recommendations/top", response_model=list[PropRecommendationItem])
async def top_recommendations(
    date: str = Query(default=None),
    limit: int = Query(default=5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    game_date = (
        datetime.date.fromisoformat(date)
        if date
        else datetime.date.today()
    )
    result = await db.execute(
        select(PropRecommendation)
        .where(PropRecommendation.game_date == game_date)
        .order_by(PropRecommendation.rank)
        .limit(limit)
    )
    return result.scalars().all()
```

- [ ] **Step 2: Register the router in `api/main.py`**

Change the imports line from:
```python
from api.routers import games, odds, props, scores, players
```
to:
```python
from api.routers import games, odds, props, scores, players, recommendations
```

And add after `app.include_router(players.router, prefix="/api")`:
```python
app.include_router(recommendations.router, prefix="/api")
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
pytest tests/test_recommendations.py -v
```

Expected: All tests PASS.

- [ ] **Step 4: Run the full test suite to ensure no regressions**

```bash
pytest -v
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add api/routers/recommendations.py api/main.py
git commit -m "feat: add recommendations API endpoints"
```

---

## Task 4: Add frontend API client types and fetch functions

**Files:**
- Modify: `web/src/api/client.ts`

- [ ] **Step 1: Add `PropRecommendationItem` interface to `web/src/api/client.ts`**

Add after the `PlayerGameLogItem` interface:

```typescript
export interface PropRecommendationItem {
  id: number;
  player_name: string | null;
  prop_type: string | null;
  bookmaker: string | null;
  line: number | null;
  outcome: string | null;
  model_prob: number | null;
  implied_prob: number | null;
  edge: number | null;
  rank: number | null;
  model_version: string | null;
  game_date: string | null;
}
```

- [ ] **Step 2: Add fetch functions to `web/src/api/client.ts`**

Add at the bottom of the file:

```typescript
export async function fetchRecommendations(date: string): Promise<PropRecommendationItem[]> {
  const res = await fetch(`${BASE}/recommendations?date=${date}`);
  if (!res.ok) throw new Error("Failed to fetch recommendations");
  return res.json();
}

export async function fetchTopRecommendations(date: string, limit = 5): Promise<PropRecommendationItem[]> {
  const res = await fetch(`${BASE}/recommendations/top?date=${date}&limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch top recommendations");
  return res.json();
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/api/client.ts
git commit -m "feat: add PropRecommendationItem type and fetch functions"
```

---

## Task 5: Build the RecommendationsPage

**Files:**
- Create: `web/src/pages/RecommendationsPage.tsx`

- [ ] **Step 1: Create `web/src/pages/RecommendationsPage.tsx`**

```tsx
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchRecommendations, fetchTopRecommendations } from "@/api/client";
import type { PropRecommendationItem } from "@/api/client";

// ── helpers ───────────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatPct(val: number | null): string {
  if (val === null) return "—";
  const sign = val >= 0 ? "+" : "";
  return `${sign}${(val * 100).toFixed(1)}%`;
}

function formatProb(val: number | null): string {
  if (val === null) return "—";
  return `${(val * 100).toFixed(1)}%`;
}

// ── TopPicksModule ────────────────────────────────────────────────────────────

function TopPicksModule({
  picks,
  loading,
}: {
  picks: PropRecommendationItem[];
  loading: boolean;
}) {
  const slots = Array.from({ length: 5 }, (_, i) => picks[i] ?? null);

  return (
    <section className="mb-8">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 pb-2 mb-3 border-b border-slate-800">
        Top Picks
      </p>
      {loading ? (
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-36 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3">
          {slots.map((pick, i) =>
            pick ? (
              <div
                key={pick.id}
                className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col gap-1"
              >
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                  #{pick.rank}
                </span>
                <p className="text-sm font-semibold text-slate-100 leading-tight">
                  {pick.player_name ?? "—"}
                </p>
                <p className="text-xs text-violet-400">
                  {pick.prop_type?.replace("player_", "") ?? "—"}
                </p>
                <p className="text-xs text-blue-400 font-semibold">
                  {pick.outcome} {pick.line ?? "—"}
                </p>
                <p className="text-xs text-slate-500">{pick.bookmaker ?? "—"}</p>
                <p className="text-sm font-bold text-green-400 mt-1">
                  {formatPct(pick.edge)}
                </p>
                <p className="text-[10px] text-slate-600">
                  {pick.model_version ?? ""}
                </p>
              </div>
            ) : (
              <div
                key={`empty-${i}`}
                className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-4 flex items-center justify-center"
              >
                <span className="text-slate-700 text-sm">—</span>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}

// ── RecommendationsTable ──────────────────────────────────────────────────────

type SortKey = keyof PropRecommendationItem;
type SortDir = "asc" | "desc";

function RecommendationsTable({
  rows,
  loading,
}: {
  rows: PropRecommendationItem[];
  loading: boolean;
}) {
  const [propTypeFilter, setPropTypeFilter] = useState("all");
  const [bookmakerFilter, setBookmakerFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const propTypes = ["all", ...Array.from(new Set(rows.map((r) => r.prop_type ?? ""))).sort()];
  const bookmakers = ["all", ...Array.from(new Set(rows.map((r) => r.bookmaker ?? ""))).sort()];

  const filtered = rows.filter((r) => {
    if (propTypeFilter !== "all" && r.prop_type !== propTypeFilter) return false;
    if (bookmakerFilter !== "all" && r.bookmaker !== bookmakerFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIndicator({ col }: { col: SortKey }) {
    if (col !== sortKey) return <span className="text-slate-700 ml-1">↕</span>;
    return <span className="text-blue-400 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const cols: { label: string; key: SortKey; fmt?: (v: PropRecommendationItem) => string }[] = [
    { label: "Rank", key: "rank" },
    { label: "Player", key: "player_name" },
    { label: "Prop Type", key: "prop_type", fmt: (r) => r.prop_type?.replace("player_", "") ?? "—" },
    { label: "Line", key: "line" },
    { label: "Outcome", key: "outcome" },
    { label: "Bookmaker", key: "bookmaker" },
    { label: "Edge", key: "edge", fmt: (r) => formatPct(r.edge) },
    { label: "Model Prob", key: "model_prob", fmt: (r) => formatProb(r.model_prob) },
    { label: "Impl. Prob", key: "implied_prob", fmt: (r) => formatProb(r.implied_prob) },
    { label: "Model Ver.", key: "model_version" },
  ];

  return (
    <section>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 pb-2 mb-3 border-b border-slate-800">
        All Recommendations
      </p>

      <div className="flex gap-3 mb-4">
        <select
          value={propTypeFilter}
          onChange={(e) => setPropTypeFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 focus:outline-none focus:border-blue-400"
        >
          {propTypes.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All Prop Types" : t.replace("player_", "")}
            </option>
          ))}
        </select>

        <select
          value={bookmakerFilter}
          onChange={(e) => setBookmakerFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 focus:outline-none focus:border-blue-400"
        >
          {bookmakers.map((b) => (
            <option key={b} value={b}>
              {b === "all" ? "All Bookmakers" : b}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : sorted.length === 0 ? (
        <p className="text-slate-500 text-sm">No recommendations for this date.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                {cols.map(({ label, key }) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="text-left px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 cursor-pointer hover:text-slate-300 select-none whitespace-nowrap"
                  >
                    {label}
                    <SortIndicator col={key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id} className="border-t border-slate-800 hover:bg-slate-900/50">
                  <td className="px-2 py-1.5 text-slate-400">{row.rank ?? "—"}</td>
                  <td className="px-2 py-1.5 text-slate-100 font-medium whitespace-nowrap">{row.player_name ?? "—"}</td>
                  <td className="px-2 py-1.5 text-violet-400">{row.prop_type?.replace("player_", "") ?? "—"}</td>
                  <td className="px-2 py-1.5 text-blue-400 font-semibold">{row.line ?? "—"}</td>
                  <td className="px-2 py-1.5 text-slate-400">{row.outcome ?? "—"}</td>
                  <td className="px-2 py-1.5 text-slate-300">{row.bookmaker ?? "—"}</td>
                  <td className="px-2 py-1.5 font-semibold text-green-400">{formatPct(row.edge)}</td>
                  <td className="px-2 py-1.5 text-slate-400">{formatProb(row.model_prob)}</td>
                  <td className="px-2 py-1.5 text-slate-400">{formatProb(row.implied_prob)}</td>
                  <td className="px-2 py-1.5 text-slate-600">{row.model_version ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── RecommendationsPage ───────────────────────────────────────────────────────

export function RecommendationsPage() {
  const today = toDateString(new Date());
  const [date, setDate] = useState(today);
  const [topPicks, setTopPicks] = useState<PropRecommendationItem[]>([]);
  const [allRecs, setAllRecs] = useState<PropRecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchTopRecommendations(date),
      fetchRecommendations(date),
    ])
      .then(([top, all]) => {
        setTopPicks(top);
        setAllRecs(all);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [date]);

  function prevDay() {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() - 1);
    setDate(toDateString(d));
  }

  function nextDay() {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + 1);
    setDate(toDateString(d));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Date navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={prevDay}
          className="p-1 text-slate-400 hover:text-slate-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-slate-100 font-semibold text-sm tabular-nums">{date}</span>
        <button
          onClick={nextDay}
          disabled={date >= today}
          className={cn(
            "p-1 transition-colors",
            date >= today
              ? "text-slate-700 cursor-not-allowed"
              : "text-slate-400 hover:text-slate-100"
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm mb-6">Failed to load recommendations: {error}</p>
      )}

      <TopPicksModule picks={topPicks} loading={loading} />
      <RecommendationsTable rows={allRecs} loading={loading} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/pages/RecommendationsPage.tsx
git commit -m "feat: add RecommendationsPage with TopPicksModule and RecommendationsTable"
```

---

## Task 6: Wire up the route and nav link

**Files:**
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Add import and route to `web/src/App.tsx`**

Add to the imports at the top:
```tsx
import { RecommendationsPage } from "./pages/RecommendationsPage";
```

In the `<Routes>` block, add after the `/players/:id` route:
```tsx
<Route path="/recommendations" element={<RecommendationsPage />} />
```

In the nav, replace the `"Raw Data"` placeholder span with a `NavLink`:
```tsx
<NavLink to="/recommendations">Recommendations</NavLink>
```

Remove the old placeholder:
```tsx
<span className="text-slate-500 cursor-not-allowed text-sm" title="Coming soon">
  Raw Data
</span>
```

- [ ] **Step 2: Commit**

```bash
git add web/src/App.tsx
git commit -m "feat: add Recommendations nav link and route"
```

---

## Self-Review Notes

- All spec requirements covered: top 5 module, full table, date navigation, filter by prop type and bookmaker, sortable columns, all fields shown, probabilities as percentages, edge as `+X.X%`, model version on cards, empty states, error handling, loading states.
- `PropRecommendation` model uses read-only mapping — no `alembic` or migration step needed since the table is owned by the pipeline.
- `GET /recommendations/top` is registered before `GET /recommendations` in the router file to avoid FastAPI matching `/top` as a `{id}` path param (not applicable here since both are at the same prefix level, but worth noting).
- Percentage formatting: `model_prob`, `implied_prob`, and `edge` are multiplied by 100 for display since they are stored as 0–1 floats.
