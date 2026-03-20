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
