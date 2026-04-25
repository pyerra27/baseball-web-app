"""
Players Router
==============
Endpoints for retrieving individual player statistics.
"""

from fastapi import APIRouter, HTTPException, Path

from baseball_api_wrapper.client import MLBStatsAPIError

from app.constants import MLB_FIRST_SEASON, current_mlb_season
from app.models.responses import PlayerStatsResponse, PlayerCareerStatsResponse
from app.services.players_service import fetch_player_stats, fetch_player_career_stats

router = APIRouter(prefix="/players", tags=["Players"])


@router.get("/{player_id}/stats/{season}", response_model=PlayerStatsResponse)
def get_player_stats(
    player_id: int = Path(..., description="The MLB player ID."),
    season: int = Path(
        ...,
        ge=MLB_FIRST_SEASON,
        le=current_mlb_season(),
        description="The MLB season year (1900 – current).",
    ),
):
    """
    Return season hitting and/or pitching statistics for a single player.

    Both stat groups are attempted; the response will only populate the
    groups for which data is available.
    """
    try:
        return fetch_player_stats(player_id=player_id, season=season)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except MLBStatsAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{player_id}/career-stats", response_model=PlayerCareerStatsResponse)
def get_player_career_stats(
    player_id: int = Path(..., description="The MLB player ID."),
):
    """Return year-by-year career hitting and/or pitching statistics for a single player."""
    try:
        return fetch_player_career_stats(player_id=player_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except MLBStatsAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
