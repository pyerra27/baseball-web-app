"""
Utilities
=========
General-purpose helpers shared across the application.
"""

from typing import Dict, Optional

from baseball_api_wrapper import MLBStatsClient, get_teams


def build_team_abbreviation_lookup(
    season: int,
    client: Optional[MLBStatsClient] = None,
) -> Dict[int, str]:
    """Return a mapping of team_id → abbreviation for the given season."""
    raw_teams = get_teams(season=season, client=client)
    return {t["id"]: t.get("abbreviation", "") for t in raw_teams}
