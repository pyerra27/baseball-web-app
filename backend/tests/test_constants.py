"""
Tests for app.constants.

Coverage:
    * MLB_FIRST_SEASON value.
    * current_mlb_season() — returns the correct year based on date relative
      to the season-start threshold (March 20).
"""

import datetime
import pytest
from unittest.mock import patch

from app.constants import MLB_FIRST_SEASON, current_mlb_season


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