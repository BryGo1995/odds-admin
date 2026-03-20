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
