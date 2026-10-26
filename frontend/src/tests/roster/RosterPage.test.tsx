import '@testing-library/jest-dom'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import RosterPage from '../../features/roster/RosterPage'
import * as mlbApi from '../../services/mlbApi'
import type { Team } from '../../models/mlb.models'

vi.mock('../../services/mlbApi', () => ({
    fetchCurrentSeason: vi.fn(),
    fetchTeams: vi.fn(),
    fetchRoster: vi.fn(),
    fetchScores: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// The newest season the API accepts. Before Opening Day 2026, still 2025.
const CURRENT_SEASON = 2025

const YANKEES: Team = {
    id: 147,
    name: 'New York Yankees',
    abbreviation: 'NYY',
    team_name: 'Yankees',
    location_name: 'Bronx',
    league_id: 103,
    league_name: 'American League',
    division_id: 201,
    division_name: 'American League East',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderRosterPage(search = '') {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    })
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/roster${search}`]}>
                <Routes>
                    <Route path="/roster" element={<RosterPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RosterPage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(mlbApi.fetchCurrentSeason).mockResolvedValue({ season: CURRENT_SEASON })
        vi.mocked(mlbApi.fetchTeams).mockResolvedValue([YANKEES])
        // Keep the scores ticker loading; these tests are about the pickers.
        vi.mocked(mlbApi.fetchScores).mockReturnValue(new Promise(() => {}))
    })

    it('defaults to the newest season the API accepts', async () => {
        renderRosterPage()
        await screen.findByRole('option', { name: 'New York Yankees' })
        expect(vi.mocked(mlbApi.fetchTeams).mock.calls).toEqual([[CURRENT_SEASON]])
        expect(screen.getByLabelText('Season')).toHaveValue(String(CURRENT_SEASON))
        expect(screen.queryByRole('option', { name: String(CURRENT_SEASON + 1) })).not.toBeInTheDocument()
    })

    it('waits for the current season before loading teams', () => {
        vi.mocked(mlbApi.fetchCurrentSeason).mockReturnValue(new Promise(() => {}))
        renderRosterPage()
        expect(screen.getByLabelText('Season')).toBeDisabled()
        expect(mlbApi.fetchTeams).not.toHaveBeenCalled()
    })

    it('uses the season from the URL', async () => {
        renderRosterPage('?season=2010')
        await screen.findByRole('option', { name: 'New York Yankees' })
        await screen.findByRole('option', { name: '2010' })
        expect(mlbApi.fetchTeams).toHaveBeenCalledWith(2010)
        expect(screen.getByLabelText('Season')).toHaveValue('2010')
    })

    it('shows why the teams failed to load', async () => {
        vi.mocked(mlbApi.fetchTeams).mockRejectedValue(new Error('season must be 2025 or earlier'))
        renderRosterPage('?season=2026')
        expect(await screen.findByText(/failed to load teams: season must be 2025 or earlier/i)).toBeInTheDocument()
    })

    it('shows an error when the current season fails to load', async () => {
        vi.mocked(mlbApi.fetchCurrentSeason).mockRejectedValue(new Error('HTTP 503'))
        renderRosterPage()
        expect(await screen.findByText(/failed to load seasons: http 503/i)).toBeInTheDocument()
        expect(mlbApi.fetchTeams).not.toHaveBeenCalled()
    })
})
