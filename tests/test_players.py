from datetime import datetime, date
from api.models import Player, PlayerProp, PlayerGameLog, MlbPlayer, MlbPlayerGameLog


# ── helpers ──────────────────────────────────────────────────────────────────

def _player(player_id: int, full_name: str, is_active: bool, **kwargs) -> Player:
    return Player(
        player_id=player_id,
        full_name=full_name,
        is_active=is_active,
        fetched_at=datetime(2026, 3, 25, 6, 0),
        **kwargs,
    )


def _mlb_player(player_id: int, full_name: str, is_active: bool, **kwargs) -> MlbPlayer:
    return MlbPlayer(
        player_id=player_id,
        full_name=full_name,
        is_active=is_active,
        fetched_at=datetime(2026, 5, 14, 6, 0),
        **kwargs,
    )


def _game_log(player_id: int, season: str, game_date: date) -> PlayerGameLog:
    return PlayerGameLog(
        player_id=player_id,
        nba_game_id=f"nba_{player_id}_{game_date}",
        season=season,
        game_date=game_date,
        matchup="LAL vs. GSW",
        wl="W",
        min=32.0,
        pts=22,
        reb=5,
        ast=8,
        blk=1,
        stl=1,
        fga=12,
        fta=4,
        usg_pct=0.28,
        plus_minus=10,
        fetched_at=datetime(2026, 3, 25, 6, 0),
    )


def _prop(player_id: int, bookmaker: str, prop_type: str, outcome: str,
          point: float, price: float, fetched_at: datetime) -> PlayerProp:
    return PlayerProp(
        game_id="g1",
        bookmaker=bookmaker,
        player_name="Test Player",
        prop_type=prop_type,
        outcome=outcome,
        price=price,
        point=point,
        nba_player_id=player_id,
        fetched_at=fetched_at,
    )


# ── GET /api/players ──────────────────────────────────────────────────────────

async def test_list_players_empty(client):
    response = await client.get("/api/players")
    assert response.status_code == 200
    assert response.json() == []


async def test_list_players_includes_active_player(client, db):
    db.add(_player(1, "LeBron James", is_active=True, team_abbreviation="LAL", position="F"))
    await db.commit()

    response = await client.get("/api/players")
    data = response.json()
    assert len(data) == 1
    assert data[0]["full_name"] == "LeBron James"
    assert data[0]["player_id"] == 1


async def test_list_players_includes_inactive_player_with_current_season_log(client, db):
    db.add(_player(2, "Retired Star", is_active=False))
    await db.flush()
    db.add(_game_log(2, "2025-26", date(2026, 3, 1)))
    await db.commit()

    response = await client.get("/api/players")
    data = response.json()
    assert len(data) == 1
    assert data[0]["full_name"] == "Retired Star"


async def test_list_players_excludes_inactive_player_with_no_current_season_log(client, db):
    db.add(_player(3, "Old Timer", is_active=False))
    await db.flush()
    db.add(_game_log(3, "2023-24", date(2024, 3, 1)))
    await db.commit()

    response = await client.get("/api/players")
    assert response.json() == []


async def test_list_players_ordered_by_name(client, db):
    db.add(_player(10, "Zach Collins", is_active=True))
    db.add(_player(11, "Anthony Davis", is_active=True))
    await db.commit()

    response = await client.get("/api/players")
    data = response.json()
    assert data[0]["full_name"] == "Anthony Davis"
    assert data[1]["full_name"] == "Zach Collins"


# ── GET /api/players/{player_id} ──────────────────────────────────────────────

async def test_get_player_found(client, db):
    db.add(_player(5, "Stephen Curry", is_active=True, team_abbreviation="GSW", position="G"))
    await db.commit()

    response = await client.get("/api/players/5")
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Stephen Curry"
    assert data["team_abbreviation"] == "GSW"


async def test_get_player_not_found(client):
    response = await client.get("/api/players/9999")
    assert response.status_code == 404


# ── GET /api/players/{player_id}/props ───────────────────────────────────────

async def test_get_player_props_empty(client, db):
    db.add(_player(6, "Kevin Durant", is_active=True))
    await db.commit()

    response = await client.get("/api/players/6/props")
    assert response.status_code == 200
    assert response.json() == []


async def test_get_player_props_returns_data(client, db):
    db.add(_player(7, "Nikola Jokic", is_active=True))
    await db.flush()
    db.add(_prop(7, "DraftKings", "player_points", "Over", 25.5, -115,
                 datetime(2026, 3, 25, 10, 0)))
    db.add(_prop(7, "DraftKings", "player_rebounds", "Over", 11.5, -110,
                 datetime(2026, 3, 25, 10, 0)))
    await db.commit()

    response = await client.get("/api/players/7/props")
    data = response.json()
    assert len(data) == 2
    bookmakers = {r["bookmaker"] for r in data}
    assert bookmakers == {"DraftKings"}


async def test_get_player_props_returns_most_recent_per_bookmaker_prop_outcome(client, db):
    db.add(_player(8, "Giannis Antetokounmpo", is_active=True))
    await db.flush()
    # Two rows for same bookmaker/prop/outcome — only the latest fetched_at should appear
    db.add(_prop(8, "FanDuel", "player_points", "Over", 30.5, -120,
                 datetime(2026, 3, 25, 8, 0)))   # older
    db.add(_prop(8, "FanDuel", "player_points", "Over", 31.5, -115,
                 datetime(2026, 3, 25, 10, 0)))  # newer
    await db.commit()

    response = await client.get("/api/players/8/props")
    data = response.json()
    assert len(data) == 1
    assert float(data[0]["point"]) == 31.5


# ── GET /api/players/{player_id}/game-logs ───────────────────────────────────

async def test_get_player_game_logs_empty(client, db):
    db.add(_player(20, "Bench Warmer", is_active=True))
    await db.commit()

    response = await client.get("/api/players/20/game-logs")
    assert response.status_code == 200
    assert response.json() == []


async def test_get_player_game_logs_defaults_to_current_season(client, db):
    db.add(_player(21, "Current Star", is_active=True))
    await db.flush()
    db.add(_game_log(21, "2025-26", date(2026, 3, 20)))
    db.add(_game_log(21, "2024-25", date(2025, 3, 20)))
    await db.commit()

    response = await client.get("/api/players/21/game-logs")
    data = response.json()
    assert len(data) == 1
    assert data[0]["matchup"] == "LAL vs. GSW"


async def test_get_player_game_logs_explicit_season(client, db):
    db.add(_player(22, "Veteran", is_active=True))
    await db.flush()
    db.add(_game_log(22, "2025-26", date(2026, 3, 20)))
    db.add(_game_log(22, "2024-25", date(2025, 3, 20)))
    await db.commit()

    response = await client.get("/api/players/22/game-logs?season=2024-25")
    data = response.json()
    assert len(data) == 1
    assert data[0]["wl"] == "W"


async def test_get_player_game_logs_ordered_by_date_desc(client, db):
    db.add(_player(23, "Consistent", is_active=True))
    await db.flush()
    db.add(_game_log(23, "2025-26", date(2026, 3, 10)))
    db.add(_game_log(23, "2025-26", date(2026, 3, 20)))
    db.add(_game_log(23, "2025-26", date(2026, 3, 15)))
    await db.commit()

    response = await client.get("/api/players/23/game-logs")
    data = response.json()
    dates = [r["game_date"] for r in data]
    assert dates == ["2026-03-20", "2026-03-15", "2026-03-10"]


# ── GET /api/players?sport=MLB ────────────────────────────────────────────────

async def test_list_players_returns_mlb_players_when_sport_mlb(client, db):
    db.add(_player(1, "LeBron James", is_active=True, team_abbreviation="LAL"))
    db.add(_mlb_player(660271, "Juan Soto", is_active=True, team_abbreviation="NYM"))
    await db.commit()

    response = await client.get("/api/players?sport=MLB")
    data = response.json()
    assert len(data) == 1
    assert data[0]["full_name"] == "Juan Soto"
    assert data[0]["player_id"] == 660271


async def test_list_players_defaults_to_nba(client, db):
    db.add(_player(1, "LeBron James", is_active=True))
    db.add(_mlb_player(660271, "Juan Soto", is_active=True))
    await db.commit()

    response = await client.get("/api/players")
    data = response.json()
    assert len(data) == 1
    assert data[0]["full_name"] == "LeBron James"
