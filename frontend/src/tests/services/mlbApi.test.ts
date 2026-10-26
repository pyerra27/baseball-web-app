import { describe, it, expect, vi, afterEach } from 'vitest'

import { API_BASE_URL } from '../../config'
import { fetchCurrentSeason, fetchRoster, fetchTeams } from '../../services/mlbApi'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Answer every fetch with this status and JSON body, or with no body. */
function respondWith(status: number, body?: unknown) {
    const response = body === undefined
        ? new Response(null, { status })
        : new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
    const fetchMock = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
}

afterEach(() => {
    vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('API errors', () => {
    it('uses a string detail as the message', async () => {
        respondWith(422, { detail: 'season must be 2025 or earlier' })
        await expect(fetchTeams(2026)).rejects.toThrow('season must be 2025 or earlier')
    })

    it('turns a validation error into readable text', async () => {
        respondWith(422, {
            detail: [
                { type: 'greater_than_equal', loc: ['query', 'season'], msg: 'Input should be greater than or equal to 1900', input: '1899' },
            ],
        })
        await expect(fetchTeams(1899)).rejects.toThrow('season: Input should be greater than or equal to 1900')
    })

    it('joins several validation errors', async () => {
        respondWith(422, {
            detail: [
                { type: 'int_parsing', loc: ['path', 'team_id'], msg: 'Input should be a valid integer', input: 'abc' },
                { type: 'greater_than_equal', loc: ['path', 'season'], msg: 'Input should be greater than or equal to 1900', input: '1899' },
            ],
        })
        await expect(fetchRoster(Number.NaN, 1899)).rejects.toThrow(
            'team_id: Input should be a valid integer; season: Input should be greater than or equal to 1900',
        )
    })

    it('falls back to the status when there is no body', async () => {
        respondWith(500)
        await expect(fetchTeams(2024)).rejects.toThrow('HTTP 500')
    })
})

describe('fetchCurrentSeason', () => {
    it('requests the current season', async () => {
        const fetchMock = respondWith(200, { season: 2025 })
        await expect(fetchCurrentSeason()).resolves.toEqual({ season: 2025 })
        expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/seasons/current`)
    })
})
