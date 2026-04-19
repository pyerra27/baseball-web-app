"""
MLB Season Constants
====================
Shared constants and helpers for MLB season year validation.
"""

import datetime

# The first year for which the MLB Stats API has reliable data.
MLB_FIRST_SEASON = 1900

# Opening Day typically falls in late March. This threshold marks the point
# after which the new calendar year's season is considered to have started.
# Any date on or after March 20 uses the current calendar year; before that
# it falls back to the previous year, matching pre-season expectations.
_SEASON_START_MONTH = 3
_SEASON_START_DAY = 20


def current_mlb_season() -> int:
    """
    Return the current MLB season year.

    Returns the current calendar year if today is on or after March 20
    (roughly when Opening Day occurs), otherwise returns the previous year.
    This prevents the API from advertising a season that hasn't started yet
    during the off-season and early spring training period.
    """
    today = datetime.date.today()
    season_has_started = (today.month, today.day) >= (_SEASON_START_MONTH, _SEASON_START_DAY)
    return today.year if season_has_started else today.year - 1
