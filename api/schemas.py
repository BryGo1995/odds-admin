from decimal import Decimal
from datetime import datetime, date
from pydantic import BaseModel


class ScoreEmbed(BaseModel):
    home_score: int | None
    away_score: int | None
    completed: bool

    model_config = {"from_attributes": True}


class GameListItem(BaseModel):
    game_id: str
    home_team: str | None
    away_team: str | None
    commence_time: datetime | None
    season: str | None
    sport: str | None
    score: ScoreEmbed | None

    model_config = {"from_attributes": True}


class OddsItem(BaseModel):
    bookmaker: str | None
    market_type: str | None
    outcome_name: str | None
    price: Decimal | None
    point: Decimal | None
    last_update: datetime | None

    model_config = {"from_attributes": True}


class PlayerPropItem(BaseModel):
    bookmaker: str | None
    player_name: str | None
    prop_type: str | None
    outcome: str | None
    price: Decimal | None
    point: Decimal | None

    model_config = {"from_attributes": True}


class ScoreItem(BaseModel):
    game_id: str | None
    home_score: int | None
    away_score: int | None
    completed: bool
    last_update: datetime | None
    fetched_at: datetime

    model_config = {"from_attributes": True}


class PlayerListItem(BaseModel):
    player_id: int
    full_name: str
    position: str | None
    team_abbreviation: str | None

    model_config = {"from_attributes": True}


class PlayerGameLogItem(BaseModel):
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

    model_config = {"from_attributes": True}
