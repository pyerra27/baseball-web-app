"""
Response Models
===============
Pydantic models that define the shape of data returned by the API.
These act as a stable contract between the backend and frontend,
insulating the frontend from raw MLB Stats API response shapes.
"""

from pydantic import BaseModel
from typing import Optional


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


# ---------------------------------------------------------------------------
# Player Stats
# ---------------------------------------------------------------------------

class HittingStats(BaseModel):
    """Season hitting statistics for a position player."""
    games_played: Optional[int] = None
    plate_appearances: Optional[int] = None
    at_bats: Optional[int] = None
    runs: Optional[int] = None
    hits: Optional[int] = None
    doubles: Optional[int] = None
    triples: Optional[int] = None
    home_runs: Optional[int] = None
    rbi: Optional[int] = None
    stolen_bases: Optional[int] = None
    base_on_balls: Optional[int] = None
    avg: Optional[str] = None
    obp: Optional[str] = None
    slg: Optional[str] = None
    ops: Optional[str] = None


class PitchingStats(BaseModel):
    """Season pitching statistics for a pitcher."""
    games_played: Optional[int] = None
    games_started: Optional[int] = None
    wins: Optional[int] = None
    losses: Optional[int] = None
    saves: Optional[int] = None
    innings_pitched: Optional[str] = None
    hits: Optional[int] = None
    earned_runs: Optional[int] = None
    base_on_balls: Optional[int] = None
    strike_outs: Optional[int] = None
    era: Optional[str] = None
    whip: Optional[str] = None


class PlayerStatsResponse(BaseModel):
    """Season statistics for a single player."""
    player_id: int
    full_name: str
    position_type: str
    season: int
    hitting: Optional[HittingStats] = None
    pitching: Optional[PitchingStats] = None


class TeamSplit(BaseModel):
    """Stats for a player with a specific team (or combined totals) in a season."""
    team_id: Optional[int] = None
    team_abbreviation: Optional[str] = None
    hitting: Optional[HittingStats] = None
    pitching: Optional[PitchingStats] = None


class YearlyStats(BaseModel):
    """
    Stats for a player in a single season.

    ``splits`` contains one entry per team played for that season.
    ``totals`` is populated only when the player appeared for more than one
    team and holds the computed cumulative stats for the full season.
    """
    season: int
    splits: list[TeamSplit]
    totals: Optional[TeamSplit] = None


class PlayerCareerStatsResponse(BaseModel):
    """Year-by-year career statistics for a single player."""
    player_id: int
    full_name: str
    position_type: str
    seasons: list[YearlyStats]
