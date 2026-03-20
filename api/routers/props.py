from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.database import get_db
from api.models import PlayerProp
from api.schemas import PlayerPropItem

router = APIRouter()


@router.get("/games/{game_id}/props", response_model=list[PlayerPropItem])
async def get_props(game_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlayerProp)
        .where(PlayerProp.game_id == game_id)
        .order_by(PlayerProp.player_name, PlayerProp.prop_type)
    )
    return result.scalars().all()
