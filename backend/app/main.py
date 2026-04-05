"""
MLB App — FastAPI Backend
=========================
Entry point for the FastAPI application.  Mounts all routers and configures
CORS so the Angular dev server (localhost:4200) can reach the API.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import teams, roster

app = FastAPI(
    title="MLB App API",
    description="Backend API for viewing historical and current MLB data.",
    version="0.1.0",
)

# ---------------------------------------------------------------------------
# CORS — allow the Angular dev server and any production origin as needed
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(teams.router, prefix="/api/v1")
app.include_router(roster.router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
def health_check():
    """Simple liveness probe."""
    return {"status": "ok"}
