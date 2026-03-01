"""
Teams Router
============
Endpoints for retrieving MLB team data.
"""

from fastapi import APIRouter, HTTPException, Query
from baseball_api.client import MLBStatsAPIError

from app.models.responses import TeamResponse
from app.services.teams_service import fetch_teams

router = APIRouter(prefix="/teams", tags=["Teams"])

_CURRENT_YEAR = 2025
_MIN_YEAR = 1900


@router.get("", response_model=list[TeamResponse])
def get_teams(
    season: int = Query(
        ...,
        ge=_MIN_YEAR,
        le=_CURRENT_YEAR,
        description="The MLB season year (1900 – current).",
    ),
):
    """
    Return all active MLB teams for the specified season, sorted
    alphabetically by team name.
    """
    try:
        return fetch_teams(season=season)
    except MLBStatsAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
