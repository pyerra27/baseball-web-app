import { API_BASE_URL } from '../config'
import type { Team, RosterResponse } from '../models/mlb.models'

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
