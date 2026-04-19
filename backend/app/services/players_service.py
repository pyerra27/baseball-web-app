"""
Players Service
===============
Business logic for retrieving and transforming player data from the
baseball-api-wrapper into the application's response models.
"""

from baseball_api_wrapper import MLBStatsClient, get_player_info, get_player_stats

from app.models.responses import (
    HittingStats,
    PitchingStats,
    PlayerStatsResponse,
)

_PITCHER_POSITION_TYPE = "Pitcher"


def fetch_player_stats(
    player_id: int,
    season: int,
    client: MLBStatsClient | None = None,
) -> PlayerStatsResponse:
    """
    Return season statistics for a single player.

    Fetches player biographical info to get the full name and position type,
    then fetches hitting and pitching stats. Only the stat group relevant to
    the player's primary position is guaranteed to be populated, but both are
    attempted so two-way players are handled correctly.

    Args:
        player_id: The MLB player identifier.
        season:    The MLB season year, e.g. 2024.
        client:    Optional pre-configured MLBStatsClient. Useful for testing.

    Returns:
        A PlayerStatsResponse containing whatever hitting/pitching stats are
        available for the player in the given season.
    """
    info = get_player_info(player_id, client=client)

    primary_position = info.get("primaryPosition") or {}
    position_type = primary_position.get("type", "")

    raw_hitting = get_player_stats(player_id, season, group="hitting", client=client)
    raw_pitching = get_player_stats(player_id, season, group="pitching", client=client)

    return PlayerStatsResponse(
        player_id=player_id,
        full_name=info.get("fullName", "Unknown"),
        position_type=position_type,
        season=season,
        hitting=_build_hitting(raw_hitting) if raw_hitting else None,
        pitching=_build_pitching(raw_pitching) if raw_pitching else None,
    )


def _build_hitting(raw: dict) -> HittingStats:
    """Map raw MLB Stats API hitting stat fields to HittingStats."""
    return HittingStats(
        games_played=raw.get("gamesPlayed"),
        at_bats=raw.get("atBats"),
        runs=raw.get("runs"),
        hits=raw.get("hits"),
        doubles=raw.get("doubles"),
        triples=raw.get("triples"),
        home_runs=raw.get("homeRuns"),
        rbi=raw.get("rbi"),
        stolen_bases=raw.get("stolenBases"),
        avg=raw.get("avg"),
        obp=raw.get("obp"),
        slg=raw.get("slg"),
        ops=raw.get("ops"),
    )


def _build_pitching(raw: dict) -> PitchingStats:
    """Map raw MLB Stats API pitching stat fields to PitchingStats."""
    return PitchingStats(
        games_played=raw.get("gamesPlayed"),
        games_started=raw.get("gamesStarted"),
        wins=raw.get("wins"),
        losses=raw.get("losses"),
        saves=raw.get("saves"),
        innings_pitched=raw.get("inningsPitched"),
        hits=raw.get("hits"),
        earned_runs=raw.get("earnedRuns"),
        base_on_balls=raw.get("baseOnBalls"),
        strike_outs=raw.get("strikeOuts"),
        era=raw.get("era"),
        whip=raw.get("whip"),
    )
