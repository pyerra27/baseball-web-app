import { API_BASE_URL } from '../config'
import type { CurrentSeasonResponse, Team, RosterResponse, PlayerStatsResponse, PlayerCareerStatsResponse, ScoresResponse, BoxScoreResponse } from '../models/mlb.models'

/**
 * FastAPI sends `detail` as a string, or as a list of validation errors
 * such as `{ loc: ['query', 'season'], msg: 'Input should be …' }`.
 */
function errorMessage(detail: unknown, status: number): string {
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
        const messages = detail
            .filter(error => typeof error?.msg === 'string')
            .map(error => {
                const field = Array.isArray(error.loc) ? error.loc[error.loc.length - 1] : undefined
                return field === undefined ? error.msg : `${field}: ${error.msg}`
            })
        if (messages.length > 0) return messages.join('; ')
    }
    return `HTTP ${status}`
}

async function apiFetch<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`)
    if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(errorMessage(body?.detail, res.status))
    }
    return res.json() as Promise<T>
}

export function fetchCurrentSeason(): Promise<CurrentSeasonResponse> {
    return apiFetch<CurrentSeasonResponse>('/seasons/current')
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
