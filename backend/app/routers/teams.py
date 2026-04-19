"""
Teams Router
============
Endpoints for retrieving MLB team data.
"""

from fastapi import APIRouter, HTTPException, Query
from baseball_api_wrapper.client import MLBStatsAPIError

from app.constants import MLB_FIRST_SEASON, current_mlb_season
from app.models.responses import TeamResponse
from app.services.teams_service import fetch_teams

router = APIRouter(prefix="/teams", tags=["Teams"])


@router.get("", response_model=list[TeamResponse])
def get_teams(
    season: int = Query(
        ...,
        ge=MLB_FIRST_SEASON,
        le=current_mlb_season(),
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
