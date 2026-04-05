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
