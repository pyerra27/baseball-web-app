"""
Roster Router
=============
Endpoints for retrieving team roster data.
"""

from fastapi import APIRouter, HTTPException, Path, Query
from baseball_api_wrapper.client import MLBStatsAPIError

from app.constants import MLB_FIRST_SEASON, current_mlb_season
from app.models.responses import RosterResponse
from app.services.roster_service import fetch_roster

router = APIRouter(prefix="/roster", tags=["Roster"])


@router.get("/{team_id}/{season}", response_model=RosterResponse)
def get_roster(
    team_id: int = Path(..., description="The MLB team ID, e.g. 147 for the Yankees."),
    season: int = Path(
        ...,
        ge=MLB_FIRST_SEASON,
        le=current_mlb_season(),
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
