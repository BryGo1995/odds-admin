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
