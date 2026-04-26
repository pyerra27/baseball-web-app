"""
Games Router
============
Endpoints for retrieving MLB game scores.
"""

import datetime
import re

from fastapi import APIRouter, HTTPException, Path, Query
from baseball_api_wrapper.client import MLBStatsAPIError

from app.models.responses import BoxScoreResponse, ScoresResponse
from app.services.games_service import fetch_boxscore, fetch_scores

router = APIRouter(prefix="/games", tags=["Games"])

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

_yesterday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat


@router.get("/scores", response_model=ScoresResponse)
def get_scores(
    date: str = Query(
        default_factory=lambda: (datetime.date.today() - datetime.timedelta(days=1)).isoformat(),
        description="Date in YYYY-MM-DD format.  Defaults to yesterday.",
    ),
):
    """
    Return game results for the specified date.  Defaults to yesterday when
    no date is provided.
    """
    if not _DATE_RE.match(date):
        raise HTTPException(status_code=422, detail="date must be in YYYY-MM-DD format")
    try:
        datetime.date.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=422, detail="date is not a valid calendar date")

    try:
        return fetch_scores(date=date)
    except MLBStatsAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{game_pk}/boxscore", response_model=BoxScoreResponse)
def get_boxscore(
    game_pk: int = Path(..., description="The unique game identifier (gamePk)."),
):
    """Return the full box score for a single game."""
    try:
        return fetch_boxscore(game_pk=game_pk)
    except MLBStatsAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
