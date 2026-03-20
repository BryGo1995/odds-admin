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
