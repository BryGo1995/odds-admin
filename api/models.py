from decimal import Decimal
from datetime import datetime, date
from sqlalchemy import String, Integer, Numeric, Boolean, DateTime, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from api.database import Base


class Game(Base):
    __tablename__ = "games"

    game_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    home_team: Mapped[str | None] = mapped_column(String(100))
    away_team: Mapped[str | None] = mapped_column(String(100))
    commence_time: Mapped[datetime | None] = mapped_column(DateTime)
    season: Mapped[str | None] = mapped_column(String(20))
    sport: Mapped[str | None] = mapped_column(String(50))

    score: Mapped["Score | None"] = relationship(
        "Score", back_populates="game", uselist=False
    )


class Odds(Base):
    __tablename__ = "odds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[str | None] = mapped_column(
        String(100), ForeignKey("games.game_id")
    )
    bookmaker: Mapped[str | None] = mapped_column(String(50))
    market_type: Mapped[str | None] = mapped_column(String(50))
    outcome_name: Mapped[str | None] = mapped_column(String(100))
    price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    point: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    last_update: Mapped[datetime | None] = mapped_column(DateTime)
    fetched_at: Mapped[datetime] = mapped_column(DateTime)


class PlayerProp(Base):
    __tablename__ = "player_props"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[str | None] = mapped_column(
        String(100), ForeignKey("games.game_id")
    )
    bookmaker: Mapped[str | None] = mapped_column(String(50))
    player_name: Mapped[str | None] = mapped_column(String(100))
    prop_type: Mapped[str | None] = mapped_column(String(100))
    outcome: Mapped[str | None] = mapped_column(String(20))
    price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    point: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    last_update: Mapped[datetime | None] = mapped_column(DateTime)
    fetched_at: Mapped[datetime] = mapped_column(DateTime)
    nba_player_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("players.player_id")
    )


class Score(Base):
    __tablename__ = "scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[str | None] = mapped_column(
        String(100), ForeignKey("games.game_id"), unique=True
    )
    home_score: Mapped[int | None] = mapped_column(Integer)
    away_score: Mapped[int | None] = mapped_column(Integer)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    last_update: Mapped[datetime | None] = mapped_column(DateTime)
    fetched_at: Mapped[datetime] = mapped_column(DateTime)

    game: Mapped["Game"] = relationship("Game", back_populates="score")


class Player(Base):
    __tablename__ = "players"

    player_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200))
    position: Mapped[str | None] = mapped_column(String(10))
    team_id: Mapped[int | None] = mapped_column(Integer)
    team_abbreviation: Mapped[str | None] = mapped_column(String(10))
    is_active: Mapped[bool | None] = mapped_column(Boolean)
    fetched_at: Mapped[datetime] = mapped_column(DateTime)


class PlayerGameLog(Base):
    __tablename__ = "player_game_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    player_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("players.player_id")
    )
    nba_game_id: Mapped[str] = mapped_column(String(50))
    season: Mapped[str] = mapped_column(String(20))
    game_date: Mapped[date] = mapped_column(Date)
    matchup: Mapped[str | None] = mapped_column(String(50))
    wl: Mapped[str | None] = mapped_column(String(1))
    min: Mapped[float | None] = mapped_column(Numeric(6, 2))
    fga: Mapped[int | None] = mapped_column(Integer)
    fta: Mapped[int | None] = mapped_column(Integer)
    usg_pct: Mapped[float | None] = mapped_column(Numeric(6, 3))
    pts: Mapped[int | None] = mapped_column(Integer)
    reb: Mapped[int | None] = mapped_column(Integer)
    ast: Mapped[int | None] = mapped_column(Integer)
    blk: Mapped[int | None] = mapped_column(Integer)
    stl: Mapped[int | None] = mapped_column(Integer)
    plus_minus: Mapped[int | None] = mapped_column(Integer)
    fetched_at: Mapped[datetime] = mapped_column(DateTime)
