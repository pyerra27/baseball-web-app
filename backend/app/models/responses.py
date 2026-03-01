"""
Response Models
===============
Pydantic models that define the shape of data returned by the API.
These act as a stable contract between the backend and frontend,
insulating the frontend from raw MLB Stats API response shapes.
"""

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Teams
# ---------------------------------------------------------------------------

class TeamResponse(BaseModel):
    """A single MLB team."""
    id: int
    name: str
    abbreviation: str
    team_name: str
    location_name: str
    league_id: int | None = None
    league_name: str | None = None
    division_id: int | None = None
    division_name: str | None = None


# ---------------------------------------------------------------------------
# Roster
# ---------------------------------------------------------------------------

class PlayerResponse(BaseModel):
    """A single player on a roster."""
    id: int
    full_name: str
    jersey_number: str
    position_code: str
    position_name: str
    position_abbreviation: str
    position_type: str


class RosterResponse(BaseModel):
    """
    A team roster split into position players and pitchers.

    Pitchers include all players whose position type is 'Pitcher'
    (starting pitchers, relief pitchers, and closers).
    Position players are everyone else.
    """
    team_id: int
    season: int
    pitchers: list[PlayerResponse]
    position_players: list[PlayerResponse]
