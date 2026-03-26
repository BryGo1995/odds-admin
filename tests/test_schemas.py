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


from datetime import date
from api.schemas import PlayerListItem, PlayerGameLogItem


def test_player_list_item():
    item = PlayerListItem(
        player_id=2544,
        full_name="LeBron James",
        position="F",
        team_abbreviation="LAL",
    )
    assert item.player_id == 2544
    assert item.full_name == "LeBron James"
    assert item.position == "F"
    assert item.team_abbreviation == "LAL"


def test_player_list_item_nullable_fields():
    item = PlayerListItem(
        player_id=1234,
        full_name="Mystery Player",
        position=None,
        team_abbreviation=None,
    )
    assert item.position is None


def test_player_game_log_item():
    item = PlayerGameLogItem(
        game_date=date(2026, 3, 20),
        matchup="LAL vs. GSW",
        wl="W",
        min=34.5,
        fga=14,
        fta=6,
        usg_pct=0.285,
        pts=28,
        reb=8,
        ast=7,
        blk=1,
        stl=2,
        plus_minus=12,
    )
    assert item.pts == 28
    assert item.game_date == date(2026, 3, 20)
    assert item.wl == "W"


def test_player_game_log_item_nullable_stats():
    item = PlayerGameLogItem(
        game_date=date(2026, 3, 20),
        matchup=None,
        wl=None,
        min=None,
        fga=None,
        fta=None,
        usg_pct=None,
        pts=None,
        reb=None,
        ast=None,
        blk=None,
        stl=None,
        plus_minus=None,
    )
    assert item.pts is None
