"""
Tests for the Roster service and API router.

Coverage:
    * Service layer — pitcher/position player classification, sorting,
                      transformation, empty responses.
    * Router layer  — HTTP status codes, response shape, path validation.
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from baseball_api_wrapper.client import MLBStatsAPIError
from app.main import app
from app.services.roster_service import fetch_roster, _transform_entry
from tests.conftest import make_raw_player


client = TestClient(app)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

RAW_PITCHER = make_raw_player(
    592450, "Gerrit Cole",
    position_type="Pitcher", position_name="Starting Pitcher",
    position_code="1", position_abbreviation="SP", jersey_number="45",
)
RAW_RELIEVER = make_raw_player(
    656756, "Clay Holmes",
    position_type="Pitcher", position_name="Relief Pitcher",
    position_code="1", position_abbreviation="RP", jersey_number="35",
)
RAW_OUTFIELDER = make_raw_player(
    592450, "Aaron Judge",
    position_type="Outfielder", position_name="Outfielder",
    position_code="8", position_abbreviation="CF", jersey_number="99",
)
RAW_CATCHER = make_raw_player(
    663728, "Jose Trevino",
    position_type="Catcher", position_name="Catcher",
    position_code="2", position_abbreviation="C", jersey_number="39",
)

ALL_RAW = [RAW_PITCHER, RAW_RELIEVER, RAW_OUTFIELDER, RAW_CATCHER]


# ---------------------------------------------------------------------------
# Service — _transform_entry
# ---------------------------------------------------------------------------

class TestTransformEntry:

    def test_maps_person_fields(self):
        """Player id and full name should be extracted from the person dict."""
        result = _transform_entry(RAW_PITCHER)
        assert result.id == 592450
        assert result.full_name == "Gerrit Cole"

    def test_maps_position_fields(self):
        """Position type, name, and abbreviation should be mapped correctly."""
        result = _transform_entry(RAW_PITCHER)
        assert result.position_type == "Pitcher"
        assert result.position_abbreviation == "SP"

    def test_maps_jersey_number(self):
        """The jersey number should be preserved as a string."""
        result = _transform_entry(RAW_PITCHER)
        assert result.jersey_number == "45"

    def test_missing_person_defaults_gracefully(self):
        """A roster entry with no person dict should not raise."""
        entry = {**RAW_PITCHER, "person": {}}
        result = _transform_entry(entry)
        assert result.full_name == "Unknown"
        assert result.id == 0


# ---------------------------------------------------------------------------
# Service — fetch_roster (classification & sorting)
# ---------------------------------------------------------------------------

class TestFetchRoster:

    def test_pitchers_classified_correctly(self):
        """Players with position_type 'Pitcher' should end up in pitchers list."""
        with patch("app.services.roster_service.get_roster", return_value=ALL_RAW):
            result = fetch_roster(team_id=147, season=2024)
        assert len(result.pitchers) == 2

    def test_position_players_classified_correctly(self):
        """Non-pitchers should end up in the position_players list."""
        with patch("app.services.roster_service.get_roster", return_value=ALL_RAW):
            result = fetch_roster(team_id=147, season=2024)
        assert len(result.position_players) == 2

    def test_pitchers_sorted_alphabetically(self):
        """Pitchers list should be sorted alphabetically by full name."""
        with patch("app.services.roster_service.get_roster", return_value=ALL_RAW):
            result = fetch_roster(team_id=147, season=2024)
        names = [p.full_name for p in result.pitchers]
        assert names == sorted(names)

    def test_position_players_sorted_alphabetically(self):
        """Position players list should be sorted alphabetically by full name."""
        with patch("app.services.roster_service.get_roster", return_value=ALL_RAW):
            result = fetch_roster(team_id=147, season=2024)
        names = [p.full_name for p in result.position_players]
        assert names == sorted(names)

    def test_metadata_fields_set_correctly(self):
        """team_id and season should be echoed back on the response."""
        with patch("app.services.roster_service.get_roster", return_value=ALL_RAW):
            result = fetch_roster(team_id=147, season=2024)
        assert result.team_id == 147
        assert result.season == 2024

    def test_empty_roster_returns_empty_lists(self):
        """An empty roster should yield empty pitchers and position_players."""
        with patch("app.services.roster_service.get_roster", return_value=[]):
            result = fetch_roster(team_id=147, season=2024)
        assert result.pitchers == []
        assert result.position_players == []

    def test_all_pitchers_roster(self):
        """A roster of only pitchers should leave position_players empty."""
        only_pitchers = [RAW_PITCHER, RAW_RELIEVER]
        with patch("app.services.roster_service.get_roster", return_value=only_pitchers):
            result = fetch_roster(team_id=147, season=2024)
        assert len(result.pitchers) == 2
        assert result.position_players == []


# ---------------------------------------------------------------------------
# Router — GET /api/v1/roster/{team_id}/{season}
# ---------------------------------------------------------------------------

class TestRosterRouter:

    def test_returns_200_for_valid_request(self):
        """A valid team_id and season should return HTTP 200."""
        with patch("app.services.roster_service.get_roster", return_value=ALL_RAW):
            response = client.get("/api/v1/roster/147/2024")
        assert response.status_code == 200

    def test_response_contains_expected_keys(self):
        """Response body should contain team_id, season, pitchers, position_players."""
        with patch("app.services.roster_service.get_roster", return_value=ALL_RAW):
            response = client.get("/api/v1/roster/147/2024")
        body = response.json()
        for key in ("team_id", "season", "pitchers", "position_players"):
            assert key in body, f"Missing key: {key}"

    def test_pitcher_objects_have_expected_keys(self):
        """Each pitcher entry should contain at minimum id, full_name, position_abbreviation."""
        with patch("app.services.roster_service.get_roster", return_value=ALL_RAW):
            response = client.get("/api/v1/roster/147/2024")
        pitcher = response.json()["pitchers"][0]
        for key in ("id", "full_name", "jersey_number", "position_abbreviation"):
            assert key in pitcher, f"Missing key: {key}"

    def test_api_error_forwarded_as_http_error(self):
        """An MLBStatsAPIError should be forwarded as the correct HTTP status."""
        with patch(
            "app.services.roster_service.get_roster",
            side_effect=MLBStatsAPIError(404, "Team not found"),
        ):
            response = client.get("/api/v1/roster/99999/2024")
        assert response.status_code == 404
