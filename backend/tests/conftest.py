"""
Shared test fixtures and factory helpers for the backend test suite.
"""

from unittest.mock import MagicMock
from baseball_api_wrapper.client import MLBStatsClient


def make_mock_mlb_client(return_value: dict) -> MLBStatsClient:
    """Return a MagicMock MLBStatsClient whose .get() returns return_value."""
    client = MagicMock(spec=MLBStatsClient)
    client.get.return_value = return_value
    return client


def make_raw_team(team_id: int, name: str, abbreviation: str = "") -> dict:
    """Return a minimal team dict mirroring the MLB Stats API response shape."""
    return {
        "id": team_id,
        "name": name,
        "abbreviation": abbreviation,
        "teamName": name.split()[-1],
        "locationName": name.split()[0],
        "league": {"id": 103, "name": "American League"},
        "division": {"id": 201, "name": "AL East"},
    }


def make_raw_player(
    player_id: int,
    full_name: str,
    position_type: str = "Outfielder",
    position_name: str = "Outfielder",
    position_code: str = "8",
    position_abbreviation: str = "CF",
    jersey_number: str = "0",
) -> dict:
    """Return a minimal roster-entry dict mirroring the MLB Stats API response shape."""
    return {
        "person": {
            "id": player_id,
            "fullName": full_name,
            "link": f"/api/v1/people/{player_id}",
        },
        "jerseyNumber": jersey_number,
        "position": {
            "code": position_code,
            "name": position_name,
            "type": position_type,
            "abbreviation": position_abbreviation,
        },
        "status": {"code": "A", "description": "Active"},
        "parentTeamId": 147,
    }
