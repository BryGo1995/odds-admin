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
