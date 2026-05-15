import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from api.database import get_db
from api.models import PropRecommendation
from api.schemas import PropRecommendationItem, AccuracySummaryItem
from api.sport import Sport, sport_dep

router = APIRouter()


@router.get("/recommendations", response_model=list[PropRecommendationItem])
async def list_recommendations(
    date: str = Query(default=None),
    sport: Sport = Depends(sport_dep),
    db: AsyncSession = Depends(get_db),
):
    game_date = (
        datetime.date.fromisoformat(date)
        if date
        else datetime.date.today()
    )
    result = await db.execute(
        select(PropRecommendation)
        .where(
            PropRecommendation.game_date == game_date,
            PropRecommendation.sport == sport.value,
        )
        .order_by(PropRecommendation.rank)
    )
    return result.scalars().all()


@router.get("/recommendations/accuracy", response_model=AccuracySummaryItem)
async def recommendations_accuracy(
    date: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    game_date = (
        datetime.date.fromisoformat(date)
        if date
        else datetime.date.today()
    )

    top10_q = (
        select(PropRecommendation)
        .where(
            PropRecommendation.game_date == game_date,
            PropRecommendation.rank <= 10,
        )
    )
    top10_result = await db.execute(top10_q)
    top10_recs = top10_result.scalars().all()

    all_q = select(func.count()).where(PropRecommendation.game_date == game_date)
    total = (await db.execute(all_q)).scalar_one()

    settled_top10 = [r for r in top10_recs if r.actual_result is not None]
    hits = [r for r in settled_top10 if r.actual_result is True]
    misses = [r for r in settled_top10 if r.actual_result is False]

    top_10_total = len(settled_top10)
    top_10_hits = len(hits)
    top_10_hit_rate = (top_10_hits / top_10_total) if top_10_total > 0 else None

    def _avg_edge(recs):
        edges = [float(r.edge) for r in recs if r.edge is not None]
        return sum(edges) / len(edges) if edges else None

    settled_all_q = (
        select(func.count())
        .where(
            PropRecommendation.game_date == game_date,
            PropRecommendation.settled_at.isnot(None),
        )
    )
    settled = (await db.execute(settled_all_q)).scalar_one()

    return AccuracySummaryItem(
        game_date=game_date,
        top_10_hits=top_10_hits,
        top_10_total=top_10_total,
        top_10_hit_rate=top_10_hit_rate,
        avg_edge_hits=_avg_edge(hits),
        avg_edge_misses=_avg_edge(misses),
        settled=settled,
        total=total,
    )


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
