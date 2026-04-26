/**
 * Core domain models.
 * These interfaces mirror the backend's Pydantic response models exactly,
 * including snake_case field names as returned by the FastAPI JSON serializer.
 */

export interface Team {
    id: number
    name: string
    abbreviation: string
    team_name: string
    location_name: string
    league_id: number | null
    league_name: string | null
    division_id: number | null
    division_name: string | null
}

export interface Player {
    id: number
    full_name: string
    jersey_number: string
    position_code: string
    position_name: string
    position_abbreviation: string
    position_type: string
}

export interface RosterResponse {
    team_id: number
    season: number
    pitchers: Player[]
    position_players: Player[]
}

export interface HittingStats {
    games_played: number | null
    plate_appearances: number | null
    at_bats: number | null
    runs: number | null
    hits: number | null
    doubles: number | null
    triples: number | null
    home_runs: number | null
    rbi: number | null
    stolen_bases: number | null
    base_on_balls: number | null
    avg: string | null
    obp: string | null
    slg: string | null
    ops: string | null
}

export interface PitchingStats {
    games_played: number | null
    games_started: number | null
    wins: number | null
    losses: number | null
    saves: number | null
    innings_pitched: string | null
    hits: number | null
    earned_runs: number | null
    base_on_balls: number | null
    strike_outs: number | null
    era: string | null
    whip: string | null
}

export interface PlayerStatsResponse {
    player_id: number
    full_name: string
    position_type: string
    season: number
    hitting: HittingStats | null
    pitching: PitchingStats | null
}

export interface TeamSplit {
    team_id: number | null
    team_abbreviation: string | null
    hitting: HittingStats | null
    pitching: PitchingStats | null
}

export interface YearlyStats {
    season: number
    splits: TeamSplit[]
    totals: TeamSplit | null
}

export interface PlayerCareerStatsResponse {
    player_id: number
    full_name: string
    position_type: string
    seasons: YearlyStats[]
}

export interface GameTeamInfo {
    team_id: number
    team_name: string
    abbreviation: string
    score: number | null
    is_winner: boolean | null
}

export interface GameResult {
    game_pk: number
    game_date: string
    status: string
    away: GameTeamInfo
    home: GameTeamInfo
}

export interface ScoresResponse {
    date: string
    games: GameResult[]
}

export interface PlayerGameHittingStats {
    at_bats: number | null
    runs: number | null
    hits: number | null
    doubles: number | null
    triples: number | null
    home_runs: number | null
    rbi: number | null
    base_on_balls: number | null
    strike_outs: number | null
    left_on_base: number | null
    avg: string | null
}

export interface PlayerGamePitchingStats {
    innings_pitched: string | null
    hits: number | null
    runs: number | null
    earned_runs: number | null
    base_on_balls: number | null
    strike_outs: number | null
    home_runs: number | null
    era: string | null
}

export interface PlayerBoxScoreStats {
    player_id: number
    full_name: string
    position_abbreviation: string
    batting_order: number | null
    hitting: PlayerGameHittingStats | null
    pitching: PlayerGamePitchingStats | null
}

export interface TeamBoxScore {
    team_id: number
    team_name: string
    abbreviation: string
    score: number | null
    batters: PlayerBoxScoreStats[]
    pitchers: PlayerBoxScoreStats[]
}

export interface BoxScoreResponse {
    game_pk: number
    game_date: string
    status: string
    away: TeamBoxScore
    home: TeamBoxScore
}
