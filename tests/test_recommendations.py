import pytest
from datetime import date
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
    sport: str = "NBA",
) -> PropRecommendation:
    rec = PropRecommendation(
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
    rec.sport = sport
    return rec


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


# ── Outcome fields on existing endpoints ─────────────────────────────────────

async def test_list_recommendations_includes_outcome_fields(client, db):
    today = date(2026, 3, 28)
    rec = _rec("LeBron James", "player_points", "DraftKings", 1, today)
    rec.actual_result = True
    rec.actual_stat_value = Decimal("27.0")
    from datetime import datetime, timezone
    rec.settled_at = datetime(2026, 3, 29, 12, 0, tzinfo=timezone.utc)
    db.add(rec)
    await db.commit()

    response = await client.get("/api/recommendations?date=2026-03-28")
    data = response.json()
    assert len(data) == 1
    assert data[0]["actual_result"] is True
    assert float(data[0]["actual_stat_value"]) == 27.0
    assert data[0]["settled_at"] is not None


async def test_list_recommendations_outcome_null_when_unsettled(client, db):
    today = date(2026, 3, 28)
    db.add(_rec("Player A", "player_points", "DraftKings", 1, today))
    await db.commit()

    response = await client.get("/api/recommendations?date=2026-03-28")
    data = response.json()
    assert data[0]["actual_result"] is None
    assert data[0]["actual_stat_value"] is None
    assert data[0]["settled_at"] is None


# ── GET /api/recommendations/accuracy ────────────────────────────────────────

async def test_accuracy_returns_zeros_when_no_recs(client):
    response = await client.get("/api/recommendations/accuracy?date=2026-03-28")
    assert response.status_code == 200
    data = response.json()
    assert data["top_10_hits"] == 0
    assert data["top_10_total"] == 0
    assert data["top_10_hit_rate"] is None
    assert data["total"] == 0


async def test_accuracy_counts_hits_and_misses(client, db):
    game_date = date(2026, 3, 28)
    for i, (result, edge) in enumerate([(True, 0.10), (True, 0.08), (False, 0.06)], start=1):
        r = _rec(f"Player {i}", "player_points", "DraftKings", i, game_date, edge=edge)
        r.actual_result = result
        r.actual_stat_value = Decimal("25.0")
        from datetime import datetime, timezone
        r.settled_at = datetime(2026, 3, 29, 12, 0, tzinfo=timezone.utc)
        db.add(r)
    await db.commit()

    response = await client.get("/api/recommendations/accuracy?date=2026-03-28")
    data = response.json()
    assert data["top_10_hits"] == 2
    assert data["top_10_total"] == 3
    assert abs(data["top_10_hit_rate"] - 2/3) < 0.01
    assert data["settled"] == 3
    assert data["total"] == 3


async def test_accuracy_avg_edge_split(client, db):
    game_date = date(2026, 3, 28)
    # 2 hits with edge 0.10 and 0.08; 1 miss with edge 0.06
    for i, (result, edge) in enumerate([(True, 0.10), (True, 0.08), (False, 0.06)], start=1):
        r = _rec(f"Player {i}", "player_points", "DraftKings", i, game_date, edge=edge)
        r.actual_result = result
        r.actual_stat_value = Decimal("25.0")
        from datetime import datetime, timezone
        r.settled_at = datetime(2026, 3, 29, 12, 0, tzinfo=timezone.utc)
        db.add(r)
    await db.commit()

    response = await client.get("/api/recommendations/accuracy?date=2026-03-28")
    data = response.json()
    assert abs(data["avg_edge_hits"] - 0.09) < 0.001    # (0.10 + 0.08) / 2
    assert abs(data["avg_edge_misses"] - 0.06) < 0.001


async def test_accuracy_excludes_ranks_above_10(client, db):
    game_date = date(2026, 3, 28)
    # Rank 1-10: mix of hits/misses; rank 11: hit that should NOT count
    for i in range(1, 12):
        r = _rec(f"Player {i}", "player_points", "DraftKings", i, game_date)
        r.actual_result = True
        r.actual_stat_value = Decimal("25.0")
        from datetime import datetime, timezone
        r.settled_at = datetime(2026, 3, 29, 12, 0, tzinfo=timezone.utc)
        db.add(r)
    await db.commit()

    response = await client.get("/api/recommendations/accuracy?date=2026-03-28")
    data = response.json()
    assert data["top_10_total"] == 10
    assert data["total"] == 11


async def test_accuracy_defaults_to_today(client, db):
    import datetime as dt
    today = dt.date.today()
    r = _rec("Today Player", "player_points", "DraftKings", 1, today)
    r.actual_result = True
    r.actual_stat_value = Decimal("25.0")
    from datetime import datetime, timezone
    r.settled_at = datetime.now(tz=timezone.utc)
    db.add(r)
    await db.commit()

    response = await client.get("/api/recommendations/accuracy")
    data = response.json()
    assert data["top_10_hits"] == 1


async def test_list_recommendations_response_includes_sport(client, db):
    from datetime import date
    today = date(2026, 3, 28)
    rec = _rec("LeBron James", "player_points", "DraftKings", 1, today, edge=0.13)
    rec.sport = "NBA"
    db.add(rec)
    await db.commit()

    response = await client.get("/api/recommendations?date=2026-03-28")
    data = response.json()
    assert data[0]["sport"] == "NBA"
