from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from api.database import get_db
from api.models import Game
from api.schemas import GameListItem, ScoreEmbed
from api.sport import Sport, sport_dep, GAMES_SPORT_TO_LONG

router = APIRouter()


@router.get("/games", response_model=list[GameListItem])
async def list_games(
    sport: Sport = Depends(sport_dep),
    db: AsyncSession = Depends(get_db),
):
    long_sport = GAMES_SPORT_TO_LONG[sport]
    result = await db.execute(
        select(Game)
        .where(Game.sport == long_sport)
        .options(selectinload(Game.score))
        .order_by(Game.commence_time.desc())
    )
    games = result.scalars().all()

    items = []
    for g in games:
        score_embed = None
        if g.score is not None:
            score_embed = ScoreEmbed(
                home_score=g.score.home_score,
                away_score=g.score.away_score,
                completed=g.score.completed or False,
            )
        items.append(
            GameListItem(
                game_id=g.game_id,
                home_team=g.home_team,
                away_team=g.away_team,
                commence_time=g.commence_time,
                season=g.season,
                sport=g.sport,
                score=score_embed,
            )
        )
    return items
