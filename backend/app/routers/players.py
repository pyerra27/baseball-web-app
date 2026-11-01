"""
Players Router
==============
Endpoints for retrieving individual player statistics.
"""

from baseball_api_wrapper import MLBStatsAPIError
from fastapi import APIRouter, HTTPException, Path, Query

from app.constants import MLB_FIRST_SEASON, validate_season
from app.models.responses import (
    PlayerCareerStatsResponse,
    PlayerSearchResponse,
    PlayerStatsResponse,
)
from app.services.players_service import (
    fetch_player_career_stats,
    fetch_player_search,
    fetch_player_stats,
)

router = APIRouter(prefix="/players", tags=["Players"])


@router.get("/search", response_model=PlayerSearchResponse)
def get_player_search(
    q: str = Query(
        ...,
        max_length=50,
        description="All or part of a player's name, e.g. \"aaron jud\".",
    ),
    limit: int = Query(
        10,
        ge=1,
        le=25,
        description="The maximum number of players to return.",
    ),
):
    """
    Return the MLB players whose names match the search text, active players first.

    The text needs at least 2 characters once surrounding spaces are removed.
    """
    query = q.strip()
    if len(query) < 2:
        raise HTTPException(
            status_code=422,
            detail="Search text must be at least 2 characters.",
        )
    try:
        return fetch_player_search(query=query, limit=limit)
    except MLBStatsAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{player_id}/stats/{season}", response_model=PlayerStatsResponse)
def get_player_stats(
    player_id: int = Path(..., description="The MLB player ID."),
    season: int = Path(
        ...,
        ge=MLB_FIRST_SEASON,
        description="The MLB season year (1900 – current).",
    ),
):
    """
    Return season hitting and/or pitching statistics for a single player.

    Both stat groups are attempted; the response will only populate the
    groups for which data is available.
    """
    validate_season(season)
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
