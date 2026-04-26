"""
MLB App — FastAPI Backend
=========================
Entry point for the FastAPI application.  Mounts all routers and configures
CORS so the React dev server and production frontend can reach the API.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import teams, roster, players, games

app = FastAPI(
    title="MLB App API",
    description="Backend API for viewing historical and current MLB data.",
    version="0.1.0",
)

# ---------------------------------------------------------------------------
# CORS — origins are controlled via CORS_ORIGINS env var (comma-separated).
# Falls back to localhost dev server when the env var is not set.
# ---------------------------------------------------------------------------
_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173")
origins = [o.strip() for o in _raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
API_PREFIX = "/api/v1"

app.include_router(teams.router, prefix=API_PREFIX)
app.include_router(roster.router, prefix=API_PREFIX)
app.include_router(players.router, prefix=API_PREFIX)
app.include_router(games.router, prefix=API_PREFIX)


@app.get("/health", tags=["Health"])
def health_check():
    """Simple liveness probe."""
    return {"status": "ok"}
