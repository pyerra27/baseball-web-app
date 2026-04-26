"""
Tests for the Games service and API router.

Coverage:
    * Service layer  — _transform_game, _transform_team_info,
                       _transform_team_boxscore, _transform_player_stats,
                       fetch_scores, fetch_boxscore.
    * Router layer   — HTTP status codes, response shape, date validation.
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from baseball_api_wrapper.client import MLBStatsAPIError
from app.main import app
from app.services.games_service import (
    fetch_boxscore,
    fetch_scores,
    _transform_game,
    _transform_player_stats,
    _transform_team_boxscore,
    _transform_team_info,
)
from tests.conftest import (
    make_raw_boxscore_player,
    make_raw_boxscore_team,
    make_raw_schedule_game,
)


http_client = TestClient(app)

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

ABBREV_BY_ID = {147: "NYY", 111: "BOS"}

RAW_GAME = make_raw_schedule_game(717465, away_id=147, home_id=111, away_score=5, home_score=3)

RAW_BATTER = make_raw_boxscore_player(
    660271, "Juan Soto", "LF",
    hitting={"atBats": 4, "runs": 1, "hits": 2, "doubles": 0, "triples": 0,
             "homeRuns": 1, "rbi": 2, "baseOnBalls": 1, "strikeOuts": 1, "leftOnBase": 2},
    season_batting_avg=".281",
)

RAW_PITCHER = make_raw_boxscore_player(
    592450, "Gerrit Cole", "SP",
    pitching={"inningsPitched": "7.0", "hits": 3, "runs": 1, "earnedRuns": 1,
              "baseOnBalls": 1, "strikeOuts": 9, "homeRuns": 0},
    season_pitching_era="2.50",
)

RAW_AWAY_TEAM = make_raw_boxscore_team(
    147, "New York Yankees", "NYY", runs=5,
    players={"ID660271": RAW_BATTER, "ID592450": RAW_PITCHER},
    batters=[660271],
    pitchers=[592450],
)

RAW_HOME_TEAM = make_raw_boxscore_team(111, "Boston Red Sox", "BOS", runs=3)

RAW_BOXSCORE = {"teams": {"away": RAW_AWAY_TEAM, "home": RAW_HOME_TEAM}}

RAW_GAME_META = {
    "gamePk": 717465,
    "gameDate": "2024-04-15T20:05:00Z",
    "status": {"detailedState": "Final"},
}


# ---------------------------------------------------------------------------
# Service — _transform_team_info
# ---------------------------------------------------------------------------

class TestTransformTeamInfo:

    def test_maps_team_id_and_name(self):
        raw = RAW_GAME["teams"]["away"]
        result = _transform_team_info(raw, ABBREV_BY_ID)
        assert result.team_id == 147
        assert result.team_name == "New York Yankees"

    def test_abbreviation_comes_from_lookup(self):
        raw = RAW_GAME["teams"]["away"]
        result = _transform_team_info(raw, ABBREV_BY_ID)
        assert result.abbreviation == "NYY"

    def test_abbreviation_empty_when_not_in_lookup(self):
        raw = RAW_GAME["teams"]["away"]
        result = _transform_team_info(raw, {})
        assert result.abbreviation == ""

    def test_maps_score(self):
        raw = RAW_GAME["teams"]["away"]
        result = _transform_team_info(raw, ABBREV_BY_ID)
        assert result.score == 5

    def test_maps_is_winner(self):
        away = _transform_team_info(RAW_GAME["teams"]["away"], ABBREV_BY_ID)
        home = _transform_team_info(RAW_GAME["teams"]["home"], ABBREV_BY_ID)
        assert away.is_winner is True
        assert home.is_winner is False


# ---------------------------------------------------------------------------
# Service — _transform_game
# ---------------------------------------------------------------------------

class TestTransformGame:

    def test_maps_game_pk(self):
        result = _transform_game(RAW_GAME, ABBREV_BY_ID)
        assert result.game_pk == 717465

    def test_maps_status(self):
        result = _transform_game(RAW_GAME, ABBREV_BY_ID)
        assert result.status == "Final"

    def test_maps_game_date(self):
        result = _transform_game(RAW_GAME, ABBREV_BY_ID)
        assert result.game_date == "2024-04-15T20:05:00Z"

    def test_maps_away_and_home_teams(self):
        result = _transform_game(RAW_GAME, ABBREV_BY_ID)
        assert result.away.team_id == 147
        assert result.home.team_id == 111

    def test_missing_status_defaults_to_unknown(self):
        raw = {**RAW_GAME, "status": {}}
        result = _transform_game(raw, ABBREV_BY_ID)
        assert result.status == "Unknown"


# ---------------------------------------------------------------------------
# Service — _transform_player_stats
# ---------------------------------------------------------------------------

class TestTransformPlayerStats:

    def test_maps_player_id_and_name(self):
        result = _transform_player_stats(RAW_BATTER)
        assert result.player_id == 660271
        assert result.full_name == "Juan Soto"

    def test_maps_position_abbreviation(self):
        result = _transform_player_stats(RAW_BATTER)
        assert result.position_abbreviation == "LF"

    def test_maps_batting_order(self):
        result = _transform_player_stats(RAW_BATTER, batting_order=3)
        assert result.batting_order == 3

    def test_batting_order_none_by_default(self):
        result = _transform_player_stats(RAW_BATTER)
        assert result.batting_order is None

    def test_maps_hitting_stats(self):
        result = _transform_player_stats(RAW_BATTER)
        assert result.hitting is not None
        assert result.hitting.at_bats == 4
        assert result.hitting.hits == 2
        assert result.hitting.home_runs == 1
        assert result.hitting.rbi == 2

    def test_avg_comes_from_season_stats(self):
        result = _transform_player_stats(RAW_BATTER)
        assert result.hitting.avg == ".281"

    def test_pitcher_has_no_hitting(self):
        result = _transform_player_stats(RAW_PITCHER)
        assert result.hitting is None

    def test_maps_pitching_stats(self):
        result = _transform_player_stats(RAW_PITCHER)
        assert result.pitching is not None
        assert result.pitching.innings_pitched == "7.0"
        assert result.pitching.strike_outs == 9

    def test_era_comes_from_season_stats(self):
        result = _transform_player_stats(RAW_PITCHER)
        assert result.pitching.era == "2.50"

    def test_batter_has_no_pitching(self):
        result = _transform_player_stats(RAW_BATTER)
        assert result.pitching is None

    def test_missing_season_stats_yields_none_avg(self):
        raw = make_raw_boxscore_player(1, "Test Player", hitting={"atBats": 3})
        result = _transform_player_stats(raw)
        assert result.hitting.avg is None


# ---------------------------------------------------------------------------
# Service — _transform_team_boxscore
# ---------------------------------------------------------------------------

class TestTransformTeamBoxscore:

    def test_maps_team_id_name_abbreviation(self):
        result = _transform_team_boxscore(RAW_AWAY_TEAM)
        assert result.team_id == 147
        assert result.team_name == "New York Yankees"
        assert result.abbreviation == "NYY"

    def test_maps_score_from_team_stats(self):
        result = _transform_team_boxscore(RAW_AWAY_TEAM)
        assert result.score == 5

    def test_batters_ordered_correctly(self):
        result = _transform_team_boxscore(RAW_AWAY_TEAM)
        assert len(result.batters) == 1
        assert result.batters[0].player_id == 660271
        assert result.batters[0].batting_order == 1

    def test_pitchers_populated(self):
        result = _transform_team_boxscore(RAW_AWAY_TEAM)
        assert len(result.pitchers) == 1
        assert result.pitchers[0].player_id == 592450

    def test_missing_player_id_skipped_gracefully(self):
        team = make_raw_boxscore_team(
            147, "New York Yankees", "NYY",
            players={"ID660271": RAW_BATTER},
            batters=[660271, 999999],  # 999999 not in players dict
        )
        result = _transform_team_boxscore(team)
        assert len(result.batters) == 1

    def test_empty_team_has_no_batters_or_pitchers(self):
        result = _transform_team_boxscore(RAW_HOME_TEAM)
        assert result.batters == []
        assert result.pitchers == []


# ---------------------------------------------------------------------------
# Service — fetch_scores
# ---------------------------------------------------------------------------

class TestFetchScores:

    def test_returns_scores_response(self):
        with patch("app.services.games_service.build_team_abbreviation_lookup", return_value=ABBREV_BY_ID), \
             patch("app.services.games_service.get_schedule", return_value=[RAW_GAME]):
            result = fetch_scores(date="2024-04-15")
        assert result.date == "2024-04-15"
        assert len(result.games) == 1

    def test_game_abbreviations_populated(self):
        with patch("app.services.games_service.build_team_abbreviation_lookup", return_value=ABBREV_BY_ID), \
             patch("app.services.games_service.get_schedule", return_value=[RAW_GAME]):
            result = fetch_scores(date="2024-04-15")
        assert result.games[0].away.abbreviation == "NYY"
        assert result.games[0].home.abbreviation == "BOS"

    def test_empty_schedule_returns_empty_games(self):
        with patch("app.services.games_service.build_team_abbreviation_lookup", return_value={}), \
             patch("app.services.games_service.get_schedule", return_value=[]):
            result = fetch_scores(date="2024-04-15")
        assert result.games == []

    def test_defaults_to_yesterday_when_no_date_given(self):
        import datetime
        yesterday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
        with patch("app.services.games_service.build_team_abbreviation_lookup", return_value={}), \
             patch("app.services.games_service.get_schedule", return_value=[]) as mock_sched:
            fetch_scores()
        mock_sched.assert_called_once_with(date=yesterday, client=None)


# ---------------------------------------------------------------------------
# Service — fetch_boxscore
# ---------------------------------------------------------------------------

class TestFetchBoxscore:

    def test_returns_box_score_response(self):
        with patch("app.services.games_service.get_boxscore", return_value=RAW_BOXSCORE), \
             patch("app.services.games_service.get_game_by_pk", return_value=RAW_GAME_META):
            result = fetch_boxscore(717465)
        assert result.game_pk == 717465

    def test_status_from_game_meta(self):
        with patch("app.services.games_service.get_boxscore", return_value=RAW_BOXSCORE), \
             patch("app.services.games_service.get_game_by_pk", return_value=RAW_GAME_META):
            result = fetch_boxscore(717465)
        assert result.status == "Final"

    def test_missing_status_defaults_to_unknown(self):
        meta = {**RAW_GAME_META, "status": {}}
        with patch("app.services.games_service.get_boxscore", return_value=RAW_BOXSCORE), \
             patch("app.services.games_service.get_game_by_pk", return_value=meta):
            result = fetch_boxscore(717465)
        assert result.status == "Unknown"

    def test_game_date_from_game_meta(self):
        with patch("app.services.games_service.get_boxscore", return_value=RAW_BOXSCORE), \
             patch("app.services.games_service.get_game_by_pk", return_value=RAW_GAME_META):
            result = fetch_boxscore(717465)
        assert result.game_date == "2024-04-15T20:05:00Z"

    def test_away_team_populated(self):
        with patch("app.services.games_service.get_boxscore", return_value=RAW_BOXSCORE), \
             patch("app.services.games_service.get_game_by_pk", return_value=RAW_GAME_META):
            result = fetch_boxscore(717465)
        assert result.away.team_id == 147
        assert result.away.abbreviation == "NYY"
        assert len(result.away.batters) == 1
        assert len(result.away.pitchers) == 1

    def test_home_team_populated(self):
        with patch("app.services.games_service.get_boxscore", return_value=RAW_BOXSCORE), \
             patch("app.services.games_service.get_game_by_pk", return_value=RAW_GAME_META):
            result = fetch_boxscore(717465)
        assert result.home.team_id == 111
        assert result.home.abbreviation == "BOS"


# ---------------------------------------------------------------------------
# Router — GET /api/v1/games/scores
# ---------------------------------------------------------------------------

SCORES_RESPONSE_FIXTURE = {
    "date": "2024-04-15",
    "games": [
        {
            "game_pk": 717465,
            "game_date": "2024-04-15T20:05:00Z",
            "status": "Final",
            "away": {"team_id": 147, "team_name": "New York Yankees", "abbreviation": "NYY", "score": 5, "is_winner": True},
            "home": {"team_id": 111, "team_name": "Boston Red Sox", "abbreviation": "BOS", "score": 3, "is_winner": False},
        }
    ],
}


class TestScoresRouter:

    def test_returns_200_with_valid_date(self):
        with patch("app.routers.games.fetch_scores") as mock:
            mock.return_value = _parse_scores_response(SCORES_RESPONSE_FIXTURE)
            response = http_client.get("/api/v1/games/scores?date=2024-04-15")
        assert response.status_code == 200

    def test_response_contains_date_and_games(self):
        with patch("app.routers.games.fetch_scores") as mock:
            mock.return_value = _parse_scores_response(SCORES_RESPONSE_FIXTURE)
            response = http_client.get("/api/v1/games/scores?date=2024-04-15")
        body = response.json()
        assert "date" in body
        assert "games" in body

    def test_game_shape_contains_expected_keys(self):
        with patch("app.routers.games.fetch_scores") as mock:
            mock.return_value = _parse_scores_response(SCORES_RESPONSE_FIXTURE)
            response = http_client.get("/api/v1/games/scores?date=2024-04-15")
        game = response.json()["games"][0]
        for key in ("game_pk", "status", "away", "home"):
            assert key in game

    def test_invalid_date_format_returns_422(self):
        response = http_client.get("/api/v1/games/scores?date=04-15-2024")
        assert response.status_code == 422

    def test_impossible_date_returns_422(self):
        response = http_client.get("/api/v1/games/scores?date=2024-13-99")
        assert response.status_code == 422

    def test_api_error_returns_correct_status(self):
        with patch("app.routers.games.fetch_scores", side_effect=MLBStatsAPIError(503, "Unavailable")):
            response = http_client.get("/api/v1/games/scores?date=2024-04-15")
        assert response.status_code == 503


# ---------------------------------------------------------------------------
# Router — GET /api/v1/games/{game_pk}/boxscore
# ---------------------------------------------------------------------------

BOXSCORE_RESPONSE_FIXTURE = {
    "game_pk": 717465,
    "game_date": "2024-04-15T20:05:00Z",
    "status": "Final",
    "away": {"team_id": 147, "team_name": "New York Yankees", "abbreviation": "NYY", "score": 5, "batters": [], "pitchers": []},
    "home": {"team_id": 111, "team_name": "Boston Red Sox", "abbreviation": "BOS", "score": 3, "batters": [], "pitchers": []},
}


class TestBoxscoreRouter:

    def test_returns_200_for_valid_game_pk(self):
        with patch("app.routers.games.fetch_boxscore") as mock:
            mock.return_value = _parse_boxscore_response(BOXSCORE_RESPONSE_FIXTURE)
            response = http_client.get("/api/v1/games/717465/boxscore")
        assert response.status_code == 200

    def test_response_shape_contains_expected_keys(self):
        with patch("app.routers.games.fetch_boxscore") as mock:
            mock.return_value = _parse_boxscore_response(BOXSCORE_RESPONSE_FIXTURE)
            response = http_client.get("/api/v1/games/717465/boxscore")
        body = response.json()
        for key in ("game_pk", "status", "away", "home"):
            assert key in body

    def test_team_shape_contains_batters_and_pitchers(self):
        with patch("app.routers.games.fetch_boxscore") as mock:
            mock.return_value = _parse_boxscore_response(BOXSCORE_RESPONSE_FIXTURE)
            response = http_client.get("/api/v1/games/717465/boxscore")
        away = response.json()["away"]
        assert "batters" in away
        assert "pitchers" in away

    def test_non_integer_game_pk_returns_422(self):
        response = http_client.get("/api/v1/games/abc/boxscore")
        assert response.status_code == 422

    def test_api_error_returns_correct_status(self):
        with patch("app.routers.games.fetch_boxscore", side_effect=MLBStatsAPIError(404, "Not Found")):
            response = http_client.get("/api/v1/games/717465/boxscore")
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Helpers — parse raw dicts into response model instances for mock returns
# ---------------------------------------------------------------------------

def _parse_scores_response(data: dict):
    from app.models.responses import ScoresResponse
    return ScoresResponse.model_validate(data)


def _parse_boxscore_response(data: dict):
    from app.models.responses import BoxScoreResponse
    return BoxScoreResponse.model_validate(data)
