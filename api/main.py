from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from api.routers import games, odds, props, scores, players

app = FastAPI(title="Odds Admin")

# Routers registered first — StaticFiles mount must come last
app.include_router(games.router, prefix="/api")
app.include_router(odds.router, prefix="/api")
app.include_router(props.router, prefix="/api")
app.include_router(scores.router, prefix="/api")
app.include_router(players.router, prefix="/api")

# Serve React SPA for all non-API routes (only when static dir is present)
static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
