from fastapi import FastAPI

app = FastAPI(title="Odds Admin")

from api.routers import games
app.include_router(games.router, prefix="/api")

from api.routers import odds
app.include_router(odds.router, prefix="/api")

from api.routers import props
app.include_router(props.router, prefix="/api")

from api.routers import scores
app.include_router(scores.router, prefix="/api")
