from typing import Union

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, exists, and_, func

from api.database import get_db
from api.models import Player, PlayerGameLog, PlayerProp, MlbPlayer, MlbPlayerGameLog
from api.schemas import (
    PlayerListItem,
    PlayerGameLogItem,
    PlayerPropItem,
    MlbPlayerListItem,
    MlbPlayerGameLogItem,
)
from api.sport import Sport, sport_dep

router = APIRouter()


@router.get(
    "/players",
    response_model=Union[list[PlayerListItem], list[MlbPlayerListItem]],
)
async def list_players(
    sport: Sport = Depends(sport_dep),
    db: AsyncSession = Depends(get_db),
):
    if sport == Sport.NBA:
        current_season_log = select(PlayerGameLog.id).where(
            and_(
                PlayerGameLog.player_id == Player.player_id,
                PlayerGameLog.season == "2025-26",
            )
        )
        result = await db.execute(
            select(Player)
            .where(or_(Player.is_active == True, exists(current_season_log)))
            .order_by(Player.full_name)
        )
        return result.scalars().all()
    else:
        result = await db.execute(
            select(MlbPlayer)
            .where(MlbPlayer.is_active == True)
            .order_by(MlbPlayer.full_name)
        )
        return result.scalars().all()


@router.get(
    "/players/{player_id}",
    response_model=Union[PlayerListItem, MlbPlayerListItem],
)
async def get_player(
    player_id: int,
    sport: Sport = Depends(sport_dep),
    db: AsyncSession = Depends(get_db),
):
    if sport == Sport.NBA:
        result = await db.execute(
            select(Player).where(Player.player_id == player_id)
        )
    else:
        result = await db.execute(
            select(MlbPlayer).where(MlbPlayer.player_id == player_id)
        )
    player = result.scalar_one_or_none()
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.get("/players/{player_id}/props", response_model=list[PlayerPropItem])
async def get_player_props(player_id: int, db: AsyncSession = Depends(get_db)):
    subq = (
        select(
            PlayerProp.bookmaker,
            PlayerProp.prop_type,
            PlayerProp.outcome,
            func.max(PlayerProp.fetched_at).label("max_fetched_at"),
        )
        .where(PlayerProp.nba_player_id == player_id)
        .group_by(PlayerProp.bookmaker, PlayerProp.prop_type, PlayerProp.outcome)
        .subquery()
    )
    result = await db.execute(
        select(PlayerProp)
        .join(
            subq,
            and_(
                PlayerProp.bookmaker == subq.c.bookmaker,
                PlayerProp.prop_type == subq.c.prop_type,
                PlayerProp.outcome == subq.c.outcome,
                PlayerProp.fetched_at == subq.c.max_fetched_at,
            ),
        )
        .where(PlayerProp.nba_player_id == player_id)
        .order_by(PlayerProp.bookmaker, PlayerProp.prop_type, PlayerProp.outcome)
    )
    return result.scalars().all()


@router.get("/players/{player_id}/game-logs", response_model=list[PlayerGameLogItem])
async def get_player_game_logs(
    player_id: int,
    season: str = "2025-26",
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PlayerGameLog)
        .where(
            and_(
                PlayerGameLog.player_id == player_id,
                PlayerGameLog.season == season,
            )
        )
        .order_by(PlayerGameLog.game_date.desc())
    )
    return result.scalars().all()
