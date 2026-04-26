import { API_BASE_URL } from '../config'
import type { Team, RosterResponse, PlayerStatsResponse, PlayerCareerStatsResponse, ScoresResponse, BoxScoreResponse } from '../models/mlb.models'

async function apiFetch<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`)
    if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail ?? `HTTP ${res.status}`)
    }
    return res.json() as Promise<T>
}

export function fetchTeams(season: number): Promise<Team[]> {
    return apiFetch<Team[]>(`/teams?season=${season}`)
}

export function fetchRoster(teamId: number, season: number): Promise<RosterResponse> {
    return apiFetch<RosterResponse>(`/roster/${teamId}/${season}`)
}

export function fetchPlayerStats(playerId: number, season: number): Promise<PlayerStatsResponse> {
    return apiFetch<PlayerStatsResponse>(`/players/${playerId}/stats/${season}`)
}

export function fetchPlayerCareerStats(playerId: number): Promise<PlayerCareerStatsResponse> {
    return apiFetch<PlayerCareerStatsResponse>(`/players/${playerId}/career-stats`)
}

export function fetchScores(date?: string): Promise<ScoresResponse> {
    const query = date ? `?date=${date}` : ''
    return apiFetch<ScoresResponse>(`/games/scores${query}`)
}

export function fetchBoxScore(gamePk: number): Promise<BoxScoreResponse> {
    return apiFetch<BoxScoreResponse>(`/games/${gamePk}/boxscore`)
}
