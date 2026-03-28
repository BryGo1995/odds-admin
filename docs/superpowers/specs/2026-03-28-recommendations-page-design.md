# Recommendations Page Design

**Date:** 2026-03-28
**Project:** odds-admin

## Overview

Add a `/recommendations` page to odds-admin that surfaces daily player prop recommendations produced by the ML scoring pipeline. The page has two stacked sections: a top 5 picks module and a full filterable/sortable recommendations table.

---

## Architecture

### Backend

**New SQLAlchemy model** in `api/models.py` — `PropRecommendation` mapped to the existing `recommendations` table (read-only, no migrations):

| Column | Type |
|---|---|
| id | Integer (PK) |
| player_name | String |
| prop_type | String |
| bookmaker | String |
| line | Numeric |
| outcome | String |
| model_prob | Numeric |
| implied_prob | Numeric |
| edge | Numeric |
| rank | Integer |
| model_version | String |
| game_date | Date |

**New Pydantic schema** in `api/schemas.py` — `PropRecommendationItem` exposing all fields above.

**New router** `api/routers/recommendations.py` with two endpoints:

- `GET /recommendations?date=YYYY-MM-DD` — returns all rows for the given date, ordered by rank ascending
- `GET /recommendations/top?date=YYYY-MM-DD&limit=5` — returns top N rows by rank for the given date

Both endpoints default `date` to today if not provided.

Router registered in `api/main.py`.

### Frontend

- New page: `web/src/pages/RecommendationsPage.tsx`
- Two new fetch functions in `web/src/api/client.ts`: `fetchRecommendations(date)` and `fetchTopRecommendations(date)`
- New `PropRecommendationItem` interface in `web/src/api/client.ts`
- Nav link "Recommendations" added to `App.tsx` at route `/recommendations`
- Route added to the `<Routes>` block in `App.tsx`

---

## Page Layout

```
[ ← prev day ]  [ 2026-03-28 ]  [ next day → ]    (next day disabled when on today)

TOP PICKS
┌──────────────────────────────────────────────────────────────────────────────┐
│  #1              #2              #3              #4              #5           │
│  LeBron James    ...             ...             ...             ...          │
│  Points          ...             ...             ...             ...          │
│  Over 24.5       ...             ...             ...             ...          │
│  DraftKings      ...             ...             ...             ...          │
│  +13.2%          ...             ...             ...             ...          │
│  Model v3        ...             ...             ...             ...          │
└──────────────────────────────────────────────────────────────────────────────┘

ALL RECOMMENDATIONS
[ Prop Type ▾ ]  [ Bookmaker ▾ ]

┌──────┬─────────────┬───────────┬──────┬─────────┬────────────┬───────┬────────────┬────────────┬───────────────┐
│ Rank │ Player      │ Prop Type │ Line │ Outcome │ Bookmaker  │ Edge  │ Model Prob │ Impl. Prob │ Model Version │
├──────┼─────────────┼───────────┼──────┼─────────┼────────────┼───────┼────────────┼────────────┼───────────────┤
│  1   │ LeBron...   │ Points    │ 24.5 │ Over    │ DraftKings │+13.2% │   65.0%    │   51.8%    │ v3            │
└──────┴─────────────┴───────────┴──────┴─────────┴────────────┴───────┴────────────┴────────────┴───────────────┘
```

---

## Component Breakdown

### `RecommendationsPage`

- Owns `date` state (defaults to today's ISO date string)
- Fetches top recommendations and all recommendations in parallel on mount and on date change
- Passes data down to `TopPicksModule` and `RecommendationsTable`
- Renders date navigation bar above both modules

**Date navigation:** prev/next day arrows update date state. The next arrow is disabled when `date === today`.

### `TopPicksModule`

Props: `picks: PropRecommendationItem[]`, `loading: boolean`

- Renders 5 cards in a horizontal grid (CSS grid, 5 columns)
- Each card displays: rank (large), player name, prop type, `Over {line}`, bookmaker, edge as `+X.X%` (green text), model version as small subtitle
- If fewer than 5 picks are returned, remaining slots render a placeholder card with `—`
- Loading state: 5 skeleton placeholder cards

### `RecommendationsTable`

Props: `rows: PropRecommendationItem[]`, `loading: boolean`

- Filter bar with two `<select>` dropdowns: prop type and bookmaker, populated from unique values in `rows`
- Default filter option is "All" for both
- Column headers are clickable to sort; clicking the active column toggles asc/desc
- Sort and filter are local state — no server requests
- All columns shown: rank, player name, prop type, line, outcome, bookmaker, edge (%), model prob (%), implied prob (%), model version
- `model_prob`, `implied_prob`, and `edge` are stored as raw 0–1 floats (e.g. `0.132`); multiply by 100 for display (e.g. `+13.2%`)
- Loading state: simple "Loading..." text consistent with other pages

---

## Error Handling & Edge Cases

- **No data for date:** both sections show a neutral empty state message ("No recommendations for this date") — not an error
- **API error:** red error message rendered at the top of the page (same pattern as `PlayersPage`)
- **Loading:** spinner/skeleton in each section while fetching
- **Fewer than 5 top picks:** remaining card slots show `—` placeholder

---

## What Is Not In Scope

- Writing or editing recommendations (read-only view)
- Pagination (volume per day is small enough for a single fetch)
- External-facing visibility controls (future feature)
