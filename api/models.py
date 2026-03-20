from decimal import Decimal
from datetime import datetime
from sqlalchemy import String, Integer, Numeric, Boolean, DateTime, ForeignKey
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
