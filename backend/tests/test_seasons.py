"""
Tests for the Seasons API router.

Coverage:
    * Router layer — GET /api/v1/seasons/current follows the season-start
                     threshold (March 20) on each request.
"""

from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import mock_today


client = TestClient(app)


# ---------------------------------------------------------------------------
# Router — GET /api/v1/seasons/current
# ---------------------------------------------------------------------------

class TestCurrentSeasonRouter:

    def test_returns_previous_year_before_opening_day(self):
        """On March 19 the current season should still be the previous year."""
        with mock_today(2026, 3, 19):
            response = client.get("/api/v1/seasons/current")
        assert response.status_code == 200
        assert response.json() == {"season": 2025}

    def test_returns_new_year_from_opening_day(self):
        """From March 20 the current season should be the calendar year."""
        with mock_today(2026, 3, 20):
            response = client.get("/api/v1/seasons/current")
        assert response.status_code == 200
        assert response.json() == {"season": 2026}
