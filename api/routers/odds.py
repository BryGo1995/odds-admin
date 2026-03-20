from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from api.database import get_db
from api.models import Odds
from api.schemas import OddsItem

router = APIRouter()


@router.get("/games/{game_id}/odds", response_model=list[OddsItem])
async def get_odds(game_id: str, db: AsyncSession = Depends(get_db)):
    subq = (
        select(
            Odds.bookmaker,
            Odds.market_type,
            Odds.outcome_name,
            func.max(Odds.fetched_at).label("max_fetched_at"),
        )
        .where(Odds.game_id == game_id)
        .group_by(Odds.bookmaker, Odds.market_type, Odds.outcome_name)
        .subquery()
    )

    result = await db.execute(
        select(Odds)
        .join(
            subq,
            and_(
                Odds.bookmaker == subq.c.bookmaker,
                Odds.market_type == subq.c.market_type,
                Odds.outcome_name == subq.c.outcome_name,
                Odds.fetched_at == subq.c.max_fetched_at,
            ),
        )
        .where(Odds.game_id == game_id)
        .order_by(Odds.bookmaker, Odds.market_type, Odds.outcome_name)
    )
    return result.scalars().all()
