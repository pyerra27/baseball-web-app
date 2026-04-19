"""
Tests for the Players service and API router.

Coverage:
    * Service layer — stat transformation, handling of missing hitting/pitching
                      stats, player info mapping.
    * Router layer  — HTTP status codes, response shape, 404 on unknown player.
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from baseball_api_wrapper.client import MLBStatsAPIError
from app.main import app
from app.services.players_service import fetch_player_stats, _build_hitting, _build_pitching


client = TestClient(app)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

RAW_PLAYER_INFO = {
    "id": 660271,
    "fullName": "Juan Soto",
    "primaryPosition": {
        "code": "9",
        "name": "Outfielder",
        "type": "Outfielder",
        "abbreviation": "LF",
    },
    "active": True,
}

RAW_PITCHER_INFO = {
    "id": 592450,
    "fullName": "Gerrit Cole",
    "primaryPosition": {
        "code": "1",
        "name": "Pitcher",
        "type": "Pitcher",
        "abbreviation": "SP",
    },
    "active": True,
}

RAW_HITTING_STATS = {
    "gamesPlayed": 157,
    "atBats": 559,
    "runs": 102,
    "hits": 157,
    "doubles": 34,
    "triples": 2,
    "homeRuns": 41,
    "rbi": 109,
    "stolenBases": 13,
    "avg": ".281",
    "obp": ".419",
    "slg": ".569",
    "ops": ".989",
}

RAW_PITCHING_STATS = {
    "gamesPlayed": 33,
    "gamesStarted": 33,
    "wins": 15,
    "losses": 6,
    "saves": 0,
    "inningsPitched": "209.0",
    "hits": 167,
    "earnedRuns": 72,
    "baseOnBalls": 41,
    "strikeOuts": 243,
    "era": "3.10",
    "whip": "1.00",
}


# ---------------------------------------------------------------------------
# Service — _build_hitting
# ---------------------------------------------------------------------------

class TestBuildHitting:

    def test_maps_all_fields(self):
        """All hitting stat fields should be mapped from the raw dict."""
        result = _build_hitting(RAW_HITTING_STATS)
        assert result.games_played == 157
        assert result.at_bats == 559
        assert result.runs == 102
        assert result.hits == 157
        assert result.doubles == 34
        assert result.triples == 2
        assert result.home_runs == 41
        assert result.rbi == 109
        assert result.stolen_bases == 13
        assert result.avg == ".281"
        assert result.obp == ".419"
        assert result.slg == ".569"
        assert result.ops == ".989"

    def test_missing_fields_default_to_none(self):
        """Fields absent from the raw dict should default to None."""
        result = _build_hitting({})
        assert result.games_played is None
        assert result.avg is None
        assert result.ops is None


# ---------------------------------------------------------------------------
# Service — _build_pitching
# ---------------------------------------------------------------------------

class TestBuildPitching:

    def test_maps_all_fields(self):
        """All pitching stat fields should be mapped from the raw dict."""
        result = _build_pitching(RAW_PITCHING_STATS)
        assert result.games_played == 33
        assert result.games_started == 33
        assert result.wins == 15
        assert result.losses == 6
        assert result.saves == 0
        assert result.innings_pitched == "209.0"
        assert result.hits == 167
        assert result.earned_runs == 72
        assert result.base_on_balls == 41
        assert result.strike_outs == 243
        assert result.era == "3.10"
        assert result.whip == "1.00"

    def test_missing_fields_default_to_none(self):
        """Fields absent from the raw dict should default to None."""
        result = _build_pitching({})
        assert result.era is None
        assert result.whip is None
        assert result.wins is None


# ---------------------------------------------------------------------------
# Service — fetch_player_stats
# ---------------------------------------------------------------------------

class TestFetchPlayerStats:

    def test_returns_player_name_and_position(self):
        """Response should include the player's full name and position type."""
        with patch("app.services.players_service.get_player_info", return_value=RAW_PLAYER_INFO), \
             patch("app.services.players_service.get_player_stats", return_value=RAW_HITTING_STATS):
            result = fetch_player_stats(player_id=660271, season=2024)
        assert result.full_name == "Juan Soto"
        assert result.position_type == "Outfielder"

    def test_hitting_stats_populated_for_position_player(self):
        """Hitting stats should be populated when the API returns hitting data."""
        with patch("app.services.players_service.get_player_info", return_value=RAW_PLAYER_INFO), \
             patch("app.services.players_service.get_player_stats", return_value=RAW_HITTING_STATS):
            result = fetch_player_stats(player_id=660271, season=2024)
        assert result.hitting is not None
        assert result.hitting.home_runs == 41

    def test_pitching_stats_populated_for_pitcher(self):
        """Pitching stats should be populated when the API returns pitching data."""
        with patch("app.services.players_service.get_player_info", return_value=RAW_PITCHER_INFO), \
             patch("app.services.players_service.get_player_stats", return_value=RAW_PITCHING_STATS):
            result = fetch_player_stats(player_id=592450, season=2024)
        assert result.pitching is not None
        assert result.pitching.era == "3.10"

    def test_hitting_is_none_when_api_returns_none(self):
        """hitting should be None when get_player_stats returns None."""
        with patch("app.services.players_service.get_player_info", return_value=RAW_PITCHER_INFO), \
             patch("app.services.players_service.get_player_stats", return_value=None):
            result = fetch_player_stats(player_id=592450, season=2024)
        assert result.hitting is None
        assert result.pitching is None

    def test_season_echoed_on_response(self):
        """The season passed in should be echoed back on the response."""
        with patch("app.services.players_service.get_player_info", return_value=RAW_PLAYER_INFO), \
             patch("app.services.players_service.get_player_stats", return_value=None):
            result = fetch_player_stats(player_id=660271, season=2022)
        assert result.season == 2022

    def test_key_error_propagates_from_player_info(self):
        """KeyError from get_player_info should propagate to the caller."""
        with patch("app.services.players_service.get_player_info", side_effect=KeyError("No player")):
            with pytest.raises(KeyError):
                fetch_player_stats(player_id=99999, season=2024)


# ---------------------------------------------------------------------------
# Router — GET /api/v1/players/{player_id}/stats/{season}
# ---------------------------------------------------------------------------

class TestPlayersRouter:

    def test_returns_200_for_valid_request(self):
        """A valid player_id and season should return HTTP 200."""
        with patch("app.services.players_service.get_player_info", return_value=RAW_PLAYER_INFO), \
             patch("app.services.players_service.get_player_stats", return_value=RAW_HITTING_STATS):
            response = client.get("/api/v1/players/660271/stats/2024")
        assert response.status_code == 200

    def test_response_contains_expected_keys(self):
        """Response body should contain player_id, full_name, season, hitting, pitching."""
        with patch("app.services.players_service.get_player_info", return_value=RAW_PLAYER_INFO), \
             patch("app.services.players_service.get_player_stats", return_value=RAW_HITTING_STATS):
            response = client.get("/api/v1/players/660271/stats/2024")
        body = response.json()
        for key in ("player_id", "full_name", "position_type", "season", "hitting", "pitching"):
            assert key in body, f"Missing key: {key}"

    def test_hitting_stats_shape(self):
        """Hitting stats object should contain expected stat keys."""
        with patch("app.services.players_service.get_player_info", return_value=RAW_PLAYER_INFO), \
             patch("app.services.players_service.get_player_stats", return_value=RAW_HITTING_STATS):
            response = client.get("/api/v1/players/660271/stats/2024")
        hitting = response.json()["hitting"]
        assert hitting is not None
        for key in ("games_played", "home_runs", "avg", "ops"):
            assert key in hitting, f"Missing hitting key: {key}"

    def test_returns_404_when_player_not_found(self):
        """A KeyError from the service should result in HTTP 404."""
        with patch("app.services.players_service.get_player_info", side_effect=KeyError("No player")):
            response = client.get("/api/v1/players/99999/stats/2024")
        assert response.status_code == 404

    def test_api_error_forwarded_as_http_error(self):
        """An MLBStatsAPIError should be forwarded as the correct HTTP status."""
        with patch(
            "app.services.players_service.get_player_info",
            side_effect=MLBStatsAPIError(503, "Service Unavailable"),
        ):
            response = client.get("/api/v1/players/660271/stats/2024")
        assert response.status_code == 503
