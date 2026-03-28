import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.database import get_db
from api.models import PropRecommendation
from api.schemas import PropRecommendationItem

router = APIRouter()


@router.get("/recommendations", response_model=list[PropRecommendationItem])
async def list_recommendations(
    date: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    game_date = (
        datetime.date.fromisoformat(date)
        if date
        else datetime.date.today()
    )
    result = await db.execute(
        select(PropRecommendation)
        .where(PropRecommendation.game_date == game_date)
        .order_by(PropRecommendation.rank)
    )
    return result.scalars().all()


@router.get("/recommendations/top", response_model=list[PropRecommendationItem])
async def top_recommendations(
    date: str = Query(default=None),
    limit: int = Query(default=5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    game_date = (
        datetime.date.fromisoformat(date)
        if date
        else datetime.date.today()
    )
    result = await db.execute(
        select(PropRecommendation)
        .where(PropRecommendation.game_date == game_date)
        .order_by(PropRecommendation.rank)
        .limit(limit)
    )
    return result.scalars().all()
