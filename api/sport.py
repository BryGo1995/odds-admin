# api/sport.py
"""Sport enum and FastAPI dependency for sport-aware endpoints."""
from enum import Enum

from fastapi import Query


class Sport(str, Enum):
    NBA = "NBA"
    MLB = "MLB"


# Map the short API code to the long form stored in games.sport
# (Odds-API style: "basketball_nba", "baseball_mlb").
GAMES_SPORT_TO_LONG: dict[Sport, str] = {
    Sport.NBA: "basketball_nba",
    Sport.MLB: "baseball_mlb",
}


def sport_dep(sport: Sport = Query(default=Sport.NBA)) -> Sport:
    """FastAPI dependency: read ?sport= from query, default NBA."""
    return sport
