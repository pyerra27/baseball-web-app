"""
Teams Service
=============
Business logic for retrieving and transforming team data from the
baseball-api-wrapper into the application's response models.
"""

from baseball_api_wrapper import MLBStatsClient, get_teams

from app.models.responses import TeamResponse


def fetch_teams(season: int, client: MLBStatsClient | None = None) -> list[TeamResponse]:
    """
    Return all active MLB teams for the given season, sorted alphabetically
    by team name.

    Args:
        season: The MLB season year, e.g. 2024.
        client: Optional pre-configured MLBStatsClient.  Useful for testing.

    Returns:
        A sorted list of TeamResponse objects.
    """
    raw_teams = get_teams(season=season, client=client)
    teams = [_transform_team(t) for t in raw_teams]
    return sorted(teams, key=lambda t: t.name)


def _transform_team(raw: dict) -> TeamResponse:
    """Map a raw MLB Stats API team dict to a TeamResponse model."""
    league = raw.get("league") or {}
    division = raw.get("division") or {}

    return TeamResponse(
        id=raw["id"],
        name=raw["name"],
        abbreviation=raw.get("abbreviation", ""),
        team_name=raw.get("teamName", ""),
        location_name=raw.get("locationName", ""),
        league_id=league.get("id"),
        league_name=league.get("name"),
        division_id=division.get("id"),
        division_name=division.get("name"),
    )
