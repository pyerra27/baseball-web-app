"""
Tests for the Players service and API router.

Coverage:
    * Service layer — stat transformation, hitting/pitching field mapping,
                      career stats grouping by season and team, multi-team
                      aggregate row handling.
    * Router layer  — HTTP status codes, response shape, 404 on unknown player,
                      career-stats endpoint.
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from baseball_api_wrapper.client import MLBStatsAPIError
from app.main import app
from app.services.players_service import (
    fetch_player_stats,
    fetch_player_career_stats,
    _build_hitting,
    _build_pitching,
)


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
    "plateAppearances": 672,
    "atBats": 559,
    "runs": 102,
    "hits": 157,
    "doubles": 34,
    "triples": 2,
    "homeRuns": 41,
    "rbi": 109,
    "stolenBases": 13,
    "baseOnBalls": 99,
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

# Single-team career: one season, one team
CAREER_SINGLE_TEAM_HITTING = [
    {
        "season": "2024",
        "team": {"id": 121, "name": "New York Mets", "abbreviation": "NYM"},
        "stat": RAW_HITTING_STATS,
    }
]

# Multi-team career: one season, two teams + the API's aggregate row (id=0)
CAREER_MULTI_TEAM_HITTING = [
    {
        "season": "2023",
        "team": {"id": 147, "name": "New York Yankees", "abbreviation": "NYY"},
        "stat": {**RAW_HITTING_STATS, "gamesPlayed": 80},
    },
    {
        "season": "2023",
        "team": {"id": 135, "name": "San Diego Padres", "abbreviation": "SD"},
        "stat": {**RAW_HITTING_STATS, "gamesPlayed": 77},
    },
    {
        "season": "2023",
        "team": {"id": 0, "name": "2 Teams", "abbreviation": "2TM"},
        "stat": {**RAW_HITTING_STATS, "gamesPlayed": 157},
    },
]


# ---------------------------------------------------------------------------
# Service — _build_hitting
# ---------------------------------------------------------------------------

class TestBuildHitting:

    def test_maps_all_fields(self):
        """All hitting stat fields should be mapped from the raw dict."""
        result = _build_hitting(RAW_HITTING_STATS)
        assert result.games_played == 157
        assert result.plate_appearances == 672
        assert result.at_bats == 559
        assert result.runs == 102
        assert result.hits == 157
        assert result.doubles == 34
        assert result.triples == 2
        assert result.home_runs == 41
        assert result.rbi == 109
        assert result.stolen_bases == 13
        assert result.base_on_balls == 99
        assert result.avg == ".281"
        assert result.obp == ".419"
        assert result.slg == ".569"
        assert result.ops == ".989"

    def test_missing_fields_default_to_none(self):
        """Fields absent from the raw dict should default to None."""
        result = _build_hitting({})
        assert result.games_played is None
        assert result.plate_appearances is None
        assert result.base_on_balls is None
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
# Service — fetch_player_career_stats
# ---------------------------------------------------------------------------

class TestFetchPlayerCareerStats:

    def test_returns_player_name_and_position(self):
        """Response should include the player's full name and position type."""
        with patch("app.services.players_service.get_player_info", return_value=RAW_PLAYER_INFO), \
             patch("app.services.players_service.get_player_career_splits", return_value=CAREER_SINGLE_TEAM_HITTING):
            result = fetch_player_career_stats(player_id=660271)
        assert result.full_name == "Juan Soto"
        assert result.position_type == "Outfielder"

    def test_single_team_season_has_one_split_no_totals(self):
        """A single-team season should produce one split and no totals entry."""
        with patch("app.services.players_service.get_player_info", return_value=RAW_PLAYER_INFO), \
             patch("app.services.players_service.get_player_career_splits", return_value=CAREER_SINGLE_TEAM_HITTING):
            result = fetch_player_career_stats(player_id=660271)
        assert len(result.seasons) == 1
        yearly = result.seasons[0]
        assert yearly.season == 2024
        assert len(yearly.splits) == 1
        assert yearly.totals is None

    def test_single_team_split_has_correct_team_info(self):
        """Team abbreviation and id should be populated from the split."""
        with patch("app.services.players_service.get_player_info", return_value=RAW_PLAYER_INFO), \
             patch("app.services.players_service.get_player_career_splits", return_value=CAREER_SINGLE_TEAM_HITTING):
            result = fetch_player_career_stats(player_id=660271)
        split = result.seasons[0].splits[0]
        assert split.team_id == 121
        assert split.team_abbreviation == "NYM"

    def test_multi_team_season_has_two_splits(self):
        """A multi-team season should produce one split per real team (not the aggregate row)."""
        with patch("app.services.players_service.get_player_info", return_value=RAW_PLAYER_INFO), \
             patch("app.services.players_service.get_player_career_splits", return_value=CAREER_MULTI_TEAM_HITTING):
            result = fetch_player_career_stats(player_id=660271)
        yearly = result.seasons[0]
        assert len(yearly.splits) == 2

    def test_multi_team_season_totals_from_api_aggregate(self):
        """The API's aggregate row (team_id=0) should become the totals entry."""
        with patch("app.services.players_service.get_player_info", return_value=RAW_PLAYER_INFO), \
             patch("app.services.players_service.get_player_career_splits", return_value=CAREER_MULTI_TEAM_HITTING):
            result = fetch_player_career_stats(player_id=660271)
        totals = result.seasons[0].totals
        assert totals is not None
        assert totals.team_abbreviation == "TOT"
        assert totals.team_id is None

    def test_seasons_sorted_newest_first(self):
        """Seasons should be returned in descending order."""
        multi_season_splits = CAREER_SINGLE_TEAM_HITTING + [
            {
                "season": "2023",
                "team": {"id": 135, "name": "San Diego Padres", "abbreviation": "SD"},
                "stat": RAW_HITTING_STATS,
            }
        ]
        with patch("app.services.players_service.get_player_info", return_value=RAW_PLAYER_INFO), \
             patch("app.services.players_service.get_player_career_splits", return_value=multi_season_splits):
            result = fetch_player_career_stats(player_id=660271)
        assert result.seasons[0].season == 2024
        assert result.seasons[1].season == 2023

    def test_key_error_propagates_from_player_info(self):
        """KeyError from get_player_info should propagate to the caller."""
        with patch("app.services.players_service.get_player_info", side_effect=KeyError("No player")):
            with pytest.raises(KeyError):
                fetch_player_career_stats(player_id=99999)


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
        """Hitting stats object should contain expected stat keys including new fields."""
        with patch("app.services.players_service.get_player_info", return_value=RAW_PLAYER_INFO), \
             patch("app.services.players_service.get_player_stats", return_value=RAW_HITTING_STATS):
            response = client.get("/api/v1/players/660271/stats/2024")
        hitting = response.json()["hitting"]
        assert hitting is not None
        for key in ("games_played", "plate_appearances", "base_on_balls", "home_runs", "avg", "ops"):
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


# ---------------------------------------------------------------------------
# Router — GET /api/v1/players/{player_id}/career-stats
# ---------------------------------------------------------------------------

class TestCareerStatsRouter:

    def test_returns_200_for_valid_request(self):
        """A valid player_id should return HTTP 200."""
        with patch("app.services.players_service.get_player_info", return_value=RAW_PLAYER_INFO), \
             patch("app.services.players_service.get_player_career_splits", return_value=CAREER_SINGLE_TEAM_HITTING):
            response = client.get("/api/v1/players/660271/career-stats")
        assert response.status_code == 200

    def test_response_contains_expected_keys(self):
        """Response body should contain player_id, full_name, position_type, seasons."""
        with patch("app.services.players_service.get_player_info", return_value=RAW_PLAYER_INFO), \
             patch("app.services.players_service.get_player_career_splits", return_value=CAREER_SINGLE_TEAM_HITTING):
            response = client.get("/api/v1/players/660271/career-stats")
        body = response.json()
        for key in ("player_id", "full_name", "position_type", "seasons"):
            assert key in body, f"Missing key: {key}"

    def test_season_shape_contains_splits_and_totals(self):
        """Each season entry should have 'season', 'splits', and 'totals' keys."""
        with patch("app.services.players_service.get_player_info", return_value=RAW_PLAYER_INFO), \
             patch("app.services.players_service.get_player_career_splits", return_value=CAREER_SINGLE_TEAM_HITTING):
            response = client.get("/api/v1/players/660271/career-stats")
        season = response.json()["seasons"][0]
        assert "season" in season
        assert "splits" in season
        assert "totals" in season

    def test_multi_team_season_has_totals(self):
        """A multi-team season should include a totals entry with 'TOT' abbreviation."""
        with patch("app.services.players_service.get_player_info", return_value=RAW_PLAYER_INFO), \
             patch("app.services.players_service.get_player_career_splits", return_value=CAREER_MULTI_TEAM_HITTING):
            response = client.get("/api/v1/players/660271/career-stats")
        season = response.json()["seasons"][0]
        assert season["totals"] is not None
        assert season["totals"]["team_abbreviation"] == "TOT"

    def test_returns_404_when_player_not_found(self):
        """A KeyError from the service should result in HTTP 404."""
        with patch("app.services.players_service.get_player_info", side_effect=KeyError("No player")):
            response = client.get("/api/v1/players/99999/career-stats")
        assert response.status_code == 404

    def test_api_error_forwarded_as_http_error(self):
        """An MLBStatsAPIError should be forwarded as the correct HTTP status."""
        with patch(
            "app.services.players_service.get_player_info",
            side_effect=MLBStatsAPIError(503, "Service Unavailable"),
        ):
            response = client.get("/api/v1/players/660271/career-stats")
        assert response.status_code == 503
