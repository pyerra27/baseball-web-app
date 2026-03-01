"""
Tests for the Teams service and API router.

Coverage:
    * Service layer — transformation, sorting, empty responses.
    * Router layer  — HTTP status codes, response shape, query validation.
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from baseball_api.client import MLBStatsAPIError
from app.main import app
from app.services.teams_service import fetch_teams, _transform_team
from tests.conftest import make_mock_mlb_client, make_raw_team


client = TestClient(app)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

RAW_TEAMS = [
    make_raw_team(147, "New York Yankees", "NYY"),
    make_raw_team(111, "Boston Red Sox", "BOS"),
    make_raw_team(141, "Toronto Blue Jays", "TOR"),
]

MLB_API_RESPONSE = {"teams": RAW_TEAMS}


# ---------------------------------------------------------------------------
# Service — _transform_team
# ---------------------------------------------------------------------------

class TestTransformTeam:

    def test_maps_required_fields(self):
        """Core fields should be mapped correctly from the raw dict."""
        raw = make_raw_team(147, "New York Yankees", "NYY")
        result = _transform_team(raw)
        assert result.id == 147
        assert result.name == "New York Yankees"
        assert result.abbreviation == "NYY"

    def test_maps_league_fields(self):
        """League id and name should be extracted from the nested league dict."""
        raw = make_raw_team(147, "New York Yankees")
        result = _transform_team(raw)
        assert result.league_id == 103
        assert result.league_name == "American League"

    def test_maps_division_fields(self):
        """Division id and name should be extracted from the nested division dict."""
        raw = make_raw_team(147, "New York Yankees")
        result = _transform_team(raw)
        assert result.division_id == 201
        assert result.division_name == "AL East"

    def test_missing_league_defaults_to_none(self):
        """When league is absent the league fields should be None."""
        raw = make_raw_team(147, "New York Yankees")
        raw.pop("league")
        result = _transform_team(raw)
        assert result.league_id is None
        assert result.league_name is None


# ---------------------------------------------------------------------------
# Service — fetch_teams
# ---------------------------------------------------------------------------

class TestFetchTeams:

    def test_returns_list_of_team_responses(self):
        """fetch_teams should return a list of TeamResponse objects."""
        mock_client = make_mock_mlb_client(MLB_API_RESPONSE)
        with patch("app.services.teams_service.get_teams", return_value=RAW_TEAMS):
            result = fetch_teams(season=2024, client=mock_client)
        assert len(result) == 3

    def test_results_sorted_alphabetically(self):
        """Teams should be sorted alphabetically by full team name."""
        mock_client = make_mock_mlb_client(MLB_API_RESPONSE)
        with patch("app.services.teams_service.get_teams", return_value=RAW_TEAMS):
            result = fetch_teams(season=2024, client=mock_client)
        names = [t.name for t in result]
        assert names == sorted(names)

    def test_empty_response_returns_empty_list(self):
        """An empty API response should yield an empty list."""
        with patch("app.services.teams_service.get_teams", return_value=[]):
            result = fetch_teams(season=2024)
        assert result == []


# ---------------------------------------------------------------------------
# Router — GET /api/v1/teams
# ---------------------------------------------------------------------------

class TestTeamsRouter:

    def test_returns_200_with_valid_season(self):
        """A valid season should return HTTP 200."""
        with patch("app.services.teams_service.get_teams", return_value=RAW_TEAMS):
            response = client.get("/api/v1/teams?season=2024")
        assert response.status_code == 200

    def test_response_is_a_list(self):
        """The response body should be a JSON array."""
        with patch("app.services.teams_service.get_teams", return_value=RAW_TEAMS):
            response = client.get("/api/v1/teams?season=2024")
        assert isinstance(response.json(), list)

    def test_team_response_shape(self):
        """Each team object should contain the expected keys."""
        with patch("app.services.teams_service.get_teams", return_value=RAW_TEAMS):
            response = client.get("/api/v1/teams?season=2024")
        team = response.json()[0]
        for key in ("id", "name", "abbreviation", "team_name", "location_name"):
            assert key in team, f"Missing key: {key}"

    def test_missing_season_returns_422(self):
        """Omitting the required season param should return HTTP 422."""
        response = client.get("/api/v1/teams")
        assert response.status_code == 422

    def test_season_below_minimum_returns_422(self):
        """A season before 1900 should be rejected with HTTP 422."""
        response = client.get("/api/v1/teams?season=1899")
        assert response.status_code == 422

    def test_api_error_returns_correct_status(self):
        """An MLBStatsAPIError should be forwarded as the correct HTTP status."""
        with patch(
            "app.services.teams_service.get_teams",
            side_effect=MLBStatsAPIError(503, "Service Unavailable"),
        ):
            response = client.get("/api/v1/teams?season=2024")
        assert response.status_code == 503
