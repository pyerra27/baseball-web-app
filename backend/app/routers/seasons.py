"""
Seasons Router
==============
Endpoints for MLB season information.
"""

from fastapi import APIRouter

from app.constants import current_mlb_season
from app.models.responses import CurrentSeasonResponse

router = APIRouter(prefix="/seasons", tags=["Seasons"])


@router.get("/current", response_model=CurrentSeasonResponse)
def get_current_season():
    """
    Return the newest season the API accepts. Season pickers default to it
    and offer no season after it.
    """
    return CurrentSeasonResponse(season=current_mlb_season())
