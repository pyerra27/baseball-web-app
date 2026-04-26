"""
Shared test fixtures and factory helpers for the backend test suite.
"""

from typing import Optional
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


def make_raw_schedule_game(
    game_pk: int,
    away_id: int = 147,
    home_id: int = 111,
    away_score: int = 5,
    home_score: int = 3,
    status: str = "Final",
    game_date: str = "2024-04-15T20:05:00Z",
) -> dict:
    """Return a minimal game dict mirroring the MLB Stats API schedule response shape."""
    return {
        "gamePk": game_pk,
        "gameDate": game_date,
        "status": {"detailedState": status},
        "teams": {
            "away": {
                "team": {"id": away_id, "name": "New York Yankees"},
                "score": away_score,
                "isWinner": away_score > home_score,
            },
            "home": {
                "team": {"id": home_id, "name": "Boston Red Sox"},
                "score": home_score,
                "isWinner": home_score > away_score,
            },
        },
    }


def make_raw_boxscore_player(
    player_id: int,
    full_name: str,
    position_abbreviation: str = "CF",
    hitting: Optional[dict] = None,
    pitching: Optional[dict] = None,
    season_batting_avg: Optional[str] = None,
    season_pitching_era: Optional[str] = None,
) -> dict:
    """Return a minimal player dict mirroring the MLB Stats API boxscore response shape."""
    return {
        "person": {"id": player_id, "fullName": full_name},
        "position": {"abbreviation": position_abbreviation},
        "stats": {
            "batting": hitting or {},
            "pitching": pitching or {},
        },
        "seasonStats": {
            "batting": {"avg": season_batting_avg} if season_batting_avg else {},
            "pitching": {"era": season_pitching_era} if season_pitching_era else {},
        },
    }


def make_raw_boxscore_team(
    team_id: int,
    team_name: str,
    abbreviation: str,
    runs: int = 0,
    players: Optional[dict] = None,
    batters: Optional[list] = None,
    pitchers: Optional[list] = None,
) -> dict:
    """Return a minimal team dict mirroring the MLB Stats API boxscore response shape."""
    return {
        "team": {"id": team_id, "name": team_name, "abbreviation": abbreviation},
        "teamStats": {"batting": {"runs": runs}},
        "players": players or {},
        "batters": batters or [],
        "pitchers": pitchers or [],
    }
