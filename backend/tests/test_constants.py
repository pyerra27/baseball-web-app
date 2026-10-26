"""
Tests for app.constants.

Coverage:
    * MLB_FIRST_SEASON value.
    * current_mlb_season() — returns the correct year based on date relative
      to the season-start threshold (March 20).
    * validate_season() — rejects seasons after the current one with HTTP 422.
"""

import datetime
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.constants import MLB_FIRST_SEASON, current_mlb_season, validate_season
from tests.helpers import mock_today


class TestMlbFirstSeason:

    def test_value_is_1900(self):
        """MLB_FIRST_SEASON should be 1900."""
        assert MLB_FIRST_SEASON == 1900


class TestCurrentMlbSeason:

    def _mock_today(self, year: int, month: int, day: int):
        """Return a context manager that patches datetime.date.today()."""
        return patch(
            "app.constants.datetime.date",
            **{"today.return_value": datetime.date(year, month, day)},
        )

    def test_returns_current_year_on_season_start_date(self):
        """Exactly March 20 should return the current calendar year."""
        with self._mock_today(2025, 3, 20):
            assert current_mlb_season() == 2025

    def test_returns_current_year_after_season_start(self):
        """Any date after March 20 should return the current calendar year."""
        with self._mock_today(2025, 4, 1):
            assert current_mlb_season() == 2025

    def test_returns_current_year_in_october(self):
        """Mid-season (October) should return the current calendar year."""
        with self._mock_today(2025, 10, 15):
            assert current_mlb_season() == 2025

    def test_returns_previous_year_on_march_19(self):
        """March 19 (one day before the threshold) should return the previous year."""
        with self._mock_today(2025, 3, 19):
            assert current_mlb_season() == 2024

    def test_returns_previous_year_in_january(self):
        """January (deep off-season) should return the previous year."""
        with self._mock_today(2025, 1, 1):
            assert current_mlb_season() == 2024

    def test_returns_previous_year_in_february(self):
        """February (spring training) should return the previous year."""
        with self._mock_today(2025, 2, 28):
            assert current_mlb_season() == 2024

    def test_returns_previous_year_on_march_1(self):
        """Early March should still return the previous year."""
        with self._mock_today(2025, 3, 1):
            assert current_mlb_season() == 2024

    def test_year_boundary_january_new_year(self):
        """New Year's Day should return the previous calendar year."""
        with self._mock_today(2026, 1, 1):
            assert current_mlb_season() == 2025


class TestValidateSeason:

    def test_accepts_current_season(self):
        """The current season should pass."""
        with mock_today(2026, 3, 19):
            validate_season(2025)

    def test_accepts_earlier_season(self):
        """A past season should pass."""
        with mock_today(2026, 3, 19):
            validate_season(1900)

    def test_rejects_season_after_current_with_422(self):
        """Before Opening Day, the new calendar year should be rejected with HTTP 422."""
        with mock_today(2026, 3, 19):
            with pytest.raises(HTTPException) as exc_info:
                validate_season(2026)
        assert exc_info.value.status_code == 422
        assert exc_info.value.detail == "season must be 2025 or earlier"