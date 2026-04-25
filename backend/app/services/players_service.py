"""
Players Service
===============
Business logic for retrieving and transforming player data from the
baseball-api-wrapper into the application's response models.
"""

from collections import defaultdict

from baseball_api_wrapper import MLBStatsClient, get_player_info, get_player_stats, get_player_career_splits

from app.models.responses import (
    HittingStats,
    PitchingStats,
    PlayerStatsResponse,
    PlayerCareerStatsResponse,
    TeamSplit,
    YearlyStats,
)


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


def fetch_player_career_stats(
    player_id: int,
    client: MLBStatsClient | None = None,
) -> PlayerCareerStatsResponse:
    """
    Return year-by-year career statistics for a single player.

    Fetches hitting and pitching splits across the player's career and groups
    them by season. For seasons where the player appeared for multiple teams,
    the MLB API provides an aggregate entry (team_id = 0) which is surfaced
    as the totals row — no manual computation needed.
    """
    info = get_player_info(player_id, client=client)
    primary_position = info.get("primaryPosition") or {}
    position_type = primary_position.get("type", "")

    hitting_splits = get_player_career_splits(player_id, group="hitting", client=client)
    pitching_splits = get_player_career_splits(player_id, group="pitching", client=client)

    # season → {team_id → {"team": {...}, "hitting": raw, "pitching": raw}}
    # team_id 0 is used by the MLB API for multi-team aggregate rows
    season_map: dict[int, dict] = defaultdict(dict)

    for split in hitting_splits:
        raw_season = split.get("season")
        raw = split.get("stat")
        if not raw_season or not raw:
            continue
        team = split.get("team") or {}
        team_id = team.get("id") or 0
        season = int(raw_season)
        if team_id not in season_map[season]:
            season_map[season][team_id] = {"team": team}
        season_map[season][team_id]["hitting"] = raw

    for split in pitching_splits:
        raw_season = split.get("season")
        raw = split.get("stat")
        if not raw_season or not raw:
            continue
        team = split.get("team") or {}
        team_id = team.get("id") or 0
        season = int(raw_season)
        if team_id not in season_map[season]:
            season_map[season][team_id] = {"team": team}
        season_map[season][team_id]["pitching"] = raw

    yearly_list = []
    for season in sorted(season_map.keys(), reverse=True):
        splits = []
        totals = None

        for team_id, data in season_map[season].items():
            team = data.get("team", {})
            team_split = TeamSplit(
                team_id=team_id if team_id != 0 else None,
                team_abbreviation="TOT" if team_id == 0 else team.get("abbreviation"),
                hitting=_build_hitting(data["hitting"]) if "hitting" in data else None,
                pitching=_build_pitching(data["pitching"]) if "pitching" in data else None,
            )
            if team_id == 0:
                totals = team_split
            else:
                splits.append(team_split)

        yearly_list.append(YearlyStats(season=season, splits=splits, totals=totals))

    return PlayerCareerStatsResponse(
        player_id=player_id,
        full_name=info.get("fullName", "Unknown"),
        position_type=position_type,
        seasons=yearly_list,
    )


# ---------------------------------------------------------------------------
# Raw API → model mappers
# ---------------------------------------------------------------------------

def _build_hitting(raw: dict) -> HittingStats:
    """Map raw MLB Stats API hitting stat fields to HittingStats."""
    return HittingStats(
        games_played=raw.get("gamesPlayed"),
        plate_appearances=raw.get("plateAppearances"),
        at_bats=raw.get("atBats"),
        runs=raw.get("runs"),
        hits=raw.get("hits"),
        doubles=raw.get("doubles"),
        triples=raw.get("triples"),
        home_runs=raw.get("homeRuns"),
        rbi=raw.get("rbi"),
        stolen_bases=raw.get("stolenBases"),
        base_on_balls=raw.get("baseOnBalls"),
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
