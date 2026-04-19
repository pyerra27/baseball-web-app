"""
Roster Service
==============
Business logic for retrieving and transforming roster data from the
baseball-api-wrapper into the application's response models.

Pitcher Classification
----------------------
Any player whose ``position.type`` is ``"Pitcher"`` is classified as a
pitcher.  This covers starting pitchers (SP), relief pitchers (RP), and
closers (CL).  All other players are classified as position players.
"""

from baseball_api_wrapper import MLBStatsClient, get_roster
from baseball_api_wrapper.modules.roster import RosterType

from app.models.responses import PlayerResponse, RosterResponse

# The position type string used by the MLB Stats API for all pitchers.
_PITCHER_POSITION_TYPE = "Pitcher"


def fetch_roster(
    team_id: int,
    season: int,
    client: MLBStatsClient | None = None,
) -> RosterResponse:
    """
    Return the full-season roster for a team split into pitchers and
    position players.

    Uses ``RosterType.FULL_SEASON`` so that players who were on the roster
    at any point during the season are included, not just the current
    active 26-man roster.

    Args:
        team_id: The MLB team identifier, e.g. 147 for the Yankees.
        season:  The MLB season year, e.g. 2024.
        client:  Optional pre-configured MLBStatsClient.  Useful for testing.

    Returns:
        A RosterResponse with pitchers and position_players lists, each
        sorted alphabetically by full name.
    """
    raw_entries = get_roster(
        team_id=team_id,
        season=season,
        roster_type=RosterType.FULL_SEASON,
        client=client,
    )

    pitchers: list[PlayerResponse] = []
    position_players: list[PlayerResponse] = []

    for entry in raw_entries:
        player = _transform_entry(entry)
        if player.position_type == _PITCHER_POSITION_TYPE:
            pitchers.append(player)
        else:
            position_players.append(player)

    pitchers.sort(key=lambda p: p.full_name)
    position_players.sort(key=lambda p: p.full_name)

    return RosterResponse(
        team_id=team_id,
        season=season,
        pitchers=pitchers,
        position_players=position_players,
    )


def _transform_entry(entry: dict) -> PlayerResponse:
    """Map a raw MLB Stats API roster entry dict to a PlayerResponse model."""
    person = entry.get("person") or {}
    position = entry.get("position") or {}

    return PlayerResponse(
        id=person.get("id", 0),
        full_name=person.get("fullName", "Unknown"),
        jersey_number=entry.get("jerseyNumber", ""),
        position_code=position.get("code", ""),
        position_name=position.get("name", ""),
        position_abbreviation=position.get("abbreviation", ""),
        position_type=position.get("type", ""),
    )
