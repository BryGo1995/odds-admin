from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.database import get_db
from api.models import Score
from api.schemas import ScoreItem

router = APIRouter()


@router.get("/games/{game_id}/scores", response_model=ScoreItem)
async def get_score(game_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Score).where(Score.game_id == game_id)
    )
    score = result.scalar_one_or_none()
    if score is None:
        raise HTTPException(status_code=404, detail="Score not found")
    return score
