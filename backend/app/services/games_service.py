"""
Games Service
=============
Business logic for retrieving and transforming game score data from the
baseball-api-wrapper into the application's response models.
"""

import datetime
from typing import Dict, Optional

from baseball_api_wrapper import MLBStatsClient, get_boxscore, get_game_by_pk, get_schedule

from app.models.responses import (
    BoxScoreResponse,
    GameResult,
    GameTeamInfo,
    PlayerBoxScoreStats,
    PlayerGameHittingStats,
    PlayerGamePitchingStats,
    ScoresResponse,
    TeamBoxScore,
)
from app.utils import build_team_abbreviation_lookup


def fetch_scores(
    date: Optional[str] = None,
    client: Optional[MLBStatsClient] = None,
) -> ScoresResponse:
    """
    Return game results for the given date (defaults to yesterday).

    Args:
        date: Date string in YYYY-MM-DD format.  Defaults to yesterday.
        client: Optional pre-configured MLBStatsClient.  Useful for testing.

    Returns:
        A ScoresResponse containing all games for the date.
    """
    if date is None:
        date = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()

    season = int(date[:4])
    abbrev_by_id = build_team_abbreviation_lookup(season=season, client=client)

    raw_games = get_schedule(date=date, client=client)
    games = [_transform_game(g, abbrev_by_id) for g in raw_games]
    return ScoresResponse(date=date, games=games)


def _transform_game(raw: dict, abbrev_by_id: Dict[int, str]) -> GameResult:
    teams = raw.get("teams", {})
    return GameResult(
        game_pk=raw["gamePk"],
        game_date=raw.get("gameDate", ""),
        status=raw.get("status", {}).get("detailedState", "Unknown"),
        away=_transform_team_info(teams.get("away", {}), abbrev_by_id),
        home=_transform_team_info(teams.get("home", {}), abbrev_by_id),
    )


def _transform_team_info(raw: dict, abbrev_by_id: Dict[int, str]) -> GameTeamInfo:
    team = raw.get("team", {})
    team_id = team.get("id", 0)
    return GameTeamInfo(
        team_id=team_id,
        team_name=team.get("name", ""),
        abbreviation=abbrev_by_id.get(team_id, ""),
        score=raw.get("score"),
        is_winner=raw.get("isWinner"),
    )


def fetch_boxscore(
    game_pk: int,
    client: Optional[MLBStatsClient] = None,
) -> BoxScoreResponse:
    """
    Return the full box score for a single game.

    Args:
        game_pk: The unique game identifier.
        client: Optional pre-configured MLBStatsClient.

    Returns:
        A BoxScoreResponse with per-player hitting and pitching stats.
    """
    raw = get_boxscore(game_pk=game_pk, client=client)
    game_meta = get_game_by_pk(game_pk=game_pk, client=client)

    teams_raw = raw.get("teams", {})
    away_raw = teams_raw.get("away", {})
    home_raw = teams_raw.get("home", {})

    status = game_meta.get("status", {}).get("detailedState", "Unknown")
    game_date = game_meta.get("gameDate", "")

    return BoxScoreResponse(
        game_pk=game_pk,
        game_date=game_date,
        status=status,
        away=_transform_team_boxscore(away_raw),
        home=_transform_team_boxscore(home_raw),
    )


def _transform_team_boxscore(raw: dict) -> TeamBoxScore:
    team = raw.get("team", {})
    team_runs = raw.get("teamStats", {}).get("batting", {}).get("runs")

    players: Dict[int, dict] = raw.get("players", {})
    batters_order: list[int] = raw.get("batters", [])
    pitchers_order: list[int] = raw.get("pitchers", [])

    batters = [
        _transform_player_stats(players[f"ID{pid}"], batting_order=idx + 1)
        for idx, pid in enumerate(batters_order)
        if f"ID{pid}" in players
    ]
    pitchers = [
        _transform_player_stats(players[f"ID{pid}"])
        for pid in pitchers_order
        if f"ID{pid}" in players
    ]

    return TeamBoxScore(
        team_id=team.get("id", 0),
        team_name=team.get("name", ""),
        abbreviation=team.get("abbreviation", ""),
        score=team_runs,
        batters=batters,
        pitchers=pitchers,
    )


def _transform_player_stats(
    raw: dict,
    batting_order: Optional[int] = None,
) -> PlayerBoxScoreStats:
    person = raw.get("person", {})
    position = raw.get("position", {})
    stats = raw.get("stats", {})

    hitting_raw = stats.get("batting", {})
    pitching_raw = stats.get("pitching", {})
    season_stats = raw.get("seasonStats", {})

    hitting = PlayerGameHittingStats(
        at_bats=hitting_raw.get("atBats"),
        runs=hitting_raw.get("runs"),
        hits=hitting_raw.get("hits"),
        doubles=hitting_raw.get("doubles"),
        triples=hitting_raw.get("triples"),
        home_runs=hitting_raw.get("homeRuns"),
        rbi=hitting_raw.get("rbi"),
        base_on_balls=hitting_raw.get("baseOnBalls"),
        strike_outs=hitting_raw.get("strikeOuts"),
        left_on_base=hitting_raw.get("leftOnBase"),
        avg=season_stats.get("batting", {}).get("avg"),
    ) if hitting_raw else None

    pitching = PlayerGamePitchingStats(
        innings_pitched=pitching_raw.get("inningsPitched"),
        hits=pitching_raw.get("hits"),
        runs=pitching_raw.get("runs"),
        earned_runs=pitching_raw.get("earnedRuns"),
        base_on_balls=pitching_raw.get("baseOnBalls"),
        strike_outs=pitching_raw.get("strikeOuts"),
        home_runs=pitching_raw.get("homeRuns"),
        era=season_stats.get("pitching", {}).get("era"),
    ) if pitching_raw else None

    return PlayerBoxScoreStats(
        player_id=person.get("id", 0),
        full_name=person.get("fullName", ""),
        position_abbreviation=position.get("abbreviation", ""),
        batting_order=batting_order,
        hitting=hitting,
        pitching=pitching,
    )
