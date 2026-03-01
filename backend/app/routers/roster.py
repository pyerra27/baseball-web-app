"""
Roster Router
=============
Endpoints for retrieving team roster data.
"""

from fastapi import APIRouter, HTTPException, Path, Query
from baseball_api.client import MLBStatsAPIError

from app.models.responses import RosterResponse
from app.services.roster_service import fetch_roster

router = APIRouter(prefix="/roster", tags=["Roster"])

_CURRENT_YEAR = 2025
_MIN_YEAR = 1900


@router.get("/{team_id}/{season}", response_model=RosterResponse)
def get_roster(
    team_id: int = Path(..., description="The MLB team ID, e.g. 147 for the Yankees."),
    season: int = Path(
        ...,
        ge=_MIN_YEAR,
        le=_CURRENT_YEAR,
        description="The MLB season year (1900 – current).",
    ),
):
    """
    Return the full-season roster for a team split into pitchers and
    position players, both sorted alphabetically by player name.
    """
    try:
        return fetch_roster(team_id=team_id, season=season)
    except MLBStatsAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
