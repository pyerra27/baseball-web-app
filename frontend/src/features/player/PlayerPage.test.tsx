import '@testing-library/jest-dom'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PlayerPage from './PlayerPage'
import * as mlbApi from '../../services/mlbApi'
import type { PlayerStatsResponse } from '../../models/mlb.models'

vi.mock('../../services/mlbApi', () => ({
    fetchPlayerStats: vi.fn(),
    fetchTeams: vi.fn(),
    fetchRoster: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const HITTING_PLAYER: PlayerStatsResponse = {
    player_id: 660271,
    full_name: 'Juan Soto',
    position_type: 'Outfielder',
    season: 2024,
    hitting: {
        games_played: 157,
        at_bats: 559,
        runs: 102,
        hits: 157,
        doubles: 34,
        triples: 2,
        home_runs: 41,
        rbi: 109,
        stolen_bases: 13,
        avg: '.281',
        obp: '.419',
        slg: '.569',
        ops: '.989',
    },
    pitching: null,
}

const PITCHING_PLAYER: PlayerStatsResponse = {
    player_id: 592450,
    full_name: 'Gerrit Cole',
    position_type: 'Pitcher',
    season: 2024,
    hitting: null,
    pitching: {
        games_played: 33,
        games_started: 33,
        wins: 15,
        losses: 6,
        saves: 0,
        innings_pitched: '209.0',
        hits: 167,
        earned_runs: 72,
        base_on_balls: 41,
        strike_outs: 243,
        era: '3.10',
        whip: '1.00',
    },
}

const NO_STATS_PLAYER: PlayerStatsResponse = {
    player_id: 999,
    full_name: 'Unknown Player',
    position_type: 'Outfielder',
    season: 2024,
    hitting: null,
    pitching: null,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPlayerPage(playerId = '660271', season = '2024') {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    })
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/player/${playerId}?season=${season}`]}>
                <Routes>
                    <Route path="/player/:playerId" element={<PlayerPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlayerPage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('shows a loading spinner while the query is in flight', () => {
        vi.mocked(mlbApi.fetchPlayerStats).mockReturnValue(new Promise(() => {}))
        renderPlayerPage()
        expect(screen.getByText(/loading stats/i)).toBeInTheDocument()
    })

    it('renders the player name and position after data loads', async () => {
        vi.mocked(mlbApi.fetchPlayerStats).mockResolvedValue(HITTING_PLAYER)
        renderPlayerPage()
        await waitFor(() => {
            expect(screen.getByText('Juan Soto')).toBeInTheDocument()
        })
        expect(screen.getByText(/Outfielder/)).toBeInTheDocument()
    })

    it('renders the season in the subtitle', async () => {
        vi.mocked(mlbApi.fetchPlayerStats).mockResolvedValue(HITTING_PLAYER)
        renderPlayerPage('660271', '2024')
        await waitFor(() => {
            expect(screen.getByText(/2024 Season/i)).toBeInTheDocument()
        })
    })

    it('renders the hitting stats table for a position player', async () => {
        vi.mocked(mlbApi.fetchPlayerStats).mockResolvedValue(HITTING_PLAYER)
        renderPlayerPage()
        await waitFor(() => {
            expect(screen.getByText('Hitting')).toBeInTheDocument()
        })
        expect(screen.getByText('AVG')).toBeInTheDocument()
        expect(screen.getByText('OPS')).toBeInTheDocument()
        expect(screen.getByText('.281')).toBeInTheDocument()
        expect(screen.getByText('.989')).toBeInTheDocument()
    })

    it('does not render the pitching table when pitching is null', async () => {
        vi.mocked(mlbApi.fetchPlayerStats).mockResolvedValue(HITTING_PLAYER)
        renderPlayerPage()
        await waitFor(() => {
            expect(screen.getByText('Hitting')).toBeInTheDocument()
        })
        expect(screen.queryByText('Pitching')).not.toBeInTheDocument()
    })

    it('renders the pitching stats table for a pitcher', async () => {
        vi.mocked(mlbApi.fetchPlayerStats).mockResolvedValue(PITCHING_PLAYER)
        renderPlayerPage('592450')
        await waitFor(() => {
            expect(screen.getByText('Pitching')).toBeInTheDocument()
        })
        expect(screen.getByText('ERA')).toBeInTheDocument()
        expect(screen.getByText('WHIP')).toBeInTheDocument()
        expect(screen.getByText('3.10')).toBeInTheDocument()
    })

    it('does not render the hitting table when hitting is null', async () => {
        vi.mocked(mlbApi.fetchPlayerStats).mockResolvedValue(PITCHING_PLAYER)
        renderPlayerPage('592450')
        await waitFor(() => {
            expect(screen.getByText('Pitching')).toBeInTheDocument()
        })
        expect(screen.queryByText('Hitting')).not.toBeInTheDocument()
    })

    it('shows a no-stats message when both hitting and pitching are null', async () => {
        vi.mocked(mlbApi.fetchPlayerStats).mockResolvedValue(NO_STATS_PLAYER)
        renderPlayerPage('999')
        await waitFor(() => {
            expect(screen.getByText(/no statistics available/i)).toBeInTheDocument()
        })
    })

    it('shows an error banner when the fetch fails', async () => {
        vi.mocked(mlbApi.fetchPlayerStats).mockRejectedValue(new Error('Not Found'))
        renderPlayerPage('99999')
        await waitFor(() => {
            expect(screen.getByText(/failed to load player stats/i)).toBeInTheDocument()
        })
    })

    it('renders the back button', async () => {
        vi.mocked(mlbApi.fetchPlayerStats).mockResolvedValue(HITTING_PLAYER)
        renderPlayerPage()
        await waitFor(() => {
            expect(screen.getByText('Juan Soto')).toBeInTheDocument()
        })
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })

    it('calls fetchPlayerStats with the correct player id and season', async () => {
        vi.mocked(mlbApi.fetchPlayerStats).mockResolvedValue(HITTING_PLAYER)
        renderPlayerPage('660271', '2024')
        await waitFor(() => {
            expect(mlbApi.fetchPlayerStats).toHaveBeenCalledWith(660271, 2024)
        })
    })
})
