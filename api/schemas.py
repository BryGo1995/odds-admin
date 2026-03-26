from decimal import Decimal
from datetime import datetime, timezone, date
from pydantic import BaseModel


def _as_utc(v: datetime) -> str:
    """Serialize a naive datetime as UTC ISO-8601 (appends Z if no tzinfo)."""
    if v.tzinfo is None:
        v = v.replace(tzinfo=timezone.utc)
    return v.isoformat()


class _Base(BaseModel):
    model_config = {
        "from_attributes": True,
        "json_encoders": {datetime: _as_utc},
    }


class ScoreEmbed(_Base):
    home_score: int | None
    away_score: int | None
    completed: bool


class GameListItem(_Base):
    game_id: str
    home_team: str | None
    away_team: str | None
    commence_time: datetime | None
    season: str | None
    sport: str | None
    score: ScoreEmbed | None


class OddsItem(_Base):
    bookmaker: str | None
    market_type: str | None
    outcome_name: str | None
    price: Decimal | None
    point: Decimal | None
    last_update: datetime | None


class PlayerPropItem(_Base):
    bookmaker: str | None
    player_name: str | None
    prop_type: str | None
    outcome: str | None
    price: Decimal | None
    point: Decimal | None


class ScoreItem(_Base):
    game_id: str | None
    home_score: int | None
    away_score: int | None
    completed: bool
    last_update: datetime | None
    fetched_at: datetime


class PlayerListItem(_Base):
    player_id: int
    full_name: str
    position: str | None
    team_abbreviation: str | None


class PlayerGameLogItem(_Base):
    game_date: date
    matchup: str | None
    wl: str | None
    min: float | None
    fga: int | None
    fta: int | None
    usg_pct: float | None
    pts: int | None
    reb: int | None
    ast: int | None
    blk: int | None
    stl: int | None
    plus_minus: int | None
