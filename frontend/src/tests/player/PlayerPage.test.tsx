import '@testing-library/jest-dom'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PlayerPage from '../../features/player/PlayerPage'
import * as mlbApi from '../../services/mlbApi'
import type { PlayerCareerStatsResponse } from '../../models/mlb.models'

vi.mock('../../services/mlbApi', () => ({
    fetchPlayerCareerStats: vi.fn(),
    fetchTeams: vi.fn(),
    fetchRoster: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const HITTING_STATS = {
    games_played: 157,
    plate_appearances: 672,
    at_bats: 559,
    runs: 102,
    hits: 157,
    doubles: 34,
    triples: 2,
    home_runs: 41,
    rbi: 109,
    stolen_bases: 13,
    base_on_balls: 99,
    avg: '.281',
    obp: '.419',
    slg: '.569',
    ops: '.989',
}

const PITCHING_STATS = {
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
}

const HITTING_PLAYER: PlayerCareerStatsResponse = {
    player_id: 660271,
    full_name: 'Juan Soto',
    position_type: 'Outfielder',
    seasons: [
        {
            season: 2024,
            splits: [{ team_id: 121, team_abbreviation: 'NYM', hitting: HITTING_STATS, pitching: null }],
            totals: null,
        },
        {
            season: 2023,
            splits: [{ team_id: 135, team_abbreviation: 'SD', hitting: HITTING_STATS, pitching: null }],
            totals: null,
        },
    ],
}

const PITCHING_PLAYER: PlayerCareerStatsResponse = {
    player_id: 592450,
    full_name: 'Gerrit Cole',
    position_type: 'Pitcher',
    seasons: [
        {
            season: 2024,
            splits: [{ team_id: 147, team_abbreviation: 'NYY', hitting: null, pitching: PITCHING_STATS }],
            totals: null,
        },
    ],
}

const MULTI_TEAM_PLAYER: PlayerCareerStatsResponse = {
    player_id: 660271,
    full_name: 'Juan Soto',
    position_type: 'Outfielder',
    seasons: [
        {
            season: 2023,
            splits: [
                { team_id: 147, team_abbreviation: 'NYY', hitting: HITTING_STATS, pitching: null },
                { team_id: 135, team_abbreviation: 'SD', hitting: HITTING_STATS, pitching: null },
            ],
            totals: { team_id: null, team_abbreviation: 'TOT', hitting: HITTING_STATS, pitching: null },
        },
    ],
}

const NO_STATS_PLAYER: PlayerCareerStatsResponse = {
    player_id: 999,
    full_name: 'Unknown Player',
    position_type: 'Outfielder',
    seasons: [],
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
        vi.mocked(mlbApi.fetchPlayerCareerStats).mockReturnValue(new Promise(() => {}))
        renderPlayerPage()
        expect(screen.getByText(/loading stats/i)).toBeInTheDocument()
    })

    it('renders the player name and position after data loads', async () => {
        vi.mocked(mlbApi.fetchPlayerCareerStats).mockResolvedValue(HITTING_PLAYER)
        renderPlayerPage()
        await waitFor(() => {
            expect(screen.getByText('Juan Soto')).toBeInTheDocument()
        })
        expect(screen.getByText(/Outfielder/)).toBeInTheDocument()
    })

    it('shows "Career Statistics" in the subtitle', async () => {
        vi.mocked(mlbApi.fetchPlayerCareerStats).mockResolvedValue(HITTING_PLAYER)
        renderPlayerPage()
        await waitFor(() => {
            expect(screen.getByText(/Career Statistics/i)).toBeInTheDocument()
        })
    })

    it('renders a row for each season', async () => {
        vi.mocked(mlbApi.fetchPlayerCareerStats).mockResolvedValue(HITTING_PLAYER)
        renderPlayerPage()
        await waitFor(() => {
            expect(screen.getByText('Juan Soto')).toBeInTheDocument()
        })
        expect(screen.getByText('2024')).toBeInTheDocument()
        expect(screen.getByText('2023')).toBeInTheDocument()
    })

    it('renders the hitting stats table for a position player', async () => {
        vi.mocked(mlbApi.fetchPlayerCareerStats).mockResolvedValue(HITTING_PLAYER)
        renderPlayerPage()
        await waitFor(() => {
            expect(screen.getByText('Hitting')).toBeInTheDocument()
        })
        expect(screen.getByText('AVG')).toBeInTheDocument()
        expect(screen.getByText('OPS')).toBeInTheDocument()
        expect(screen.getByText('PA')).toBeInTheDocument()
        expect(screen.getByText('BB')).toBeInTheDocument()
    })

    it('does not render the pitching table when no season has pitching', async () => {
        vi.mocked(mlbApi.fetchPlayerCareerStats).mockResolvedValue(HITTING_PLAYER)
        renderPlayerPage()
        await waitFor(() => {
            expect(screen.getByText('Hitting')).toBeInTheDocument()
        })
        expect(screen.queryByText('Pitching')).not.toBeInTheDocument()
    })

    it('renders the pitching stats table for a pitcher', async () => {
        vi.mocked(mlbApi.fetchPlayerCareerStats).mockResolvedValue(PITCHING_PLAYER)
        renderPlayerPage('592450')
        await waitFor(() => {
            expect(screen.getByText('Pitching')).toBeInTheDocument()
        })
        expect(screen.getByText('ERA')).toBeInTheDocument()
        expect(screen.getByText('WHIP')).toBeInTheDocument()
        expect(screen.getByText('3.10')).toBeInTheDocument()
    })

    it('does not render the hitting table when no season has hitting', async () => {
        vi.mocked(mlbApi.fetchPlayerCareerStats).mockResolvedValue(PITCHING_PLAYER)
        renderPlayerPage('592450')
        await waitFor(() => {
            expect(screen.getByText('Pitching')).toBeInTheDocument()
        })
        expect(screen.queryByText('Hitting')).not.toBeInTheDocument()
    })

    it('shows a no-stats message when seasons is empty', async () => {
        vi.mocked(mlbApi.fetchPlayerCareerStats).mockResolvedValue(NO_STATS_PLAYER)
        renderPlayerPage('999')
        await waitFor(() => {
            expect(screen.getByText(/no career statistics available/i)).toBeInTheDocument()
        })
    })

    it('shows an error banner when the fetch fails', async () => {
        vi.mocked(mlbApi.fetchPlayerCareerStats).mockRejectedValue(new Error('Not Found'))
        renderPlayerPage('99999')
        await waitFor(() => {
            expect(screen.getByText(/failed to load player stats/i)).toBeInTheDocument()
        })
    })

    it('renders the back button', async () => {
        vi.mocked(mlbApi.fetchPlayerCareerStats).mockResolvedValue(HITTING_PLAYER)
        renderPlayerPage()
        await waitFor(() => {
            expect(screen.getByText('Juan Soto')).toBeInTheDocument()
        })
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })

    it('calls fetchPlayerCareerStats with the correct player id', async () => {
        vi.mocked(mlbApi.fetchPlayerCareerStats).mockResolvedValue(HITTING_PLAYER)
        renderPlayerPage('660271', '2024')
        await waitFor(() => {
            expect(mlbApi.fetchPlayerCareerStats).toHaveBeenCalledWith(660271)
        })
    })

    it('renders team abbreviations as links to the roster page', async () => {
        vi.mocked(mlbApi.fetchPlayerCareerStats).mockResolvedValue(HITTING_PLAYER)
        renderPlayerPage()
        await waitFor(() => {
            expect(screen.getByText('Juan Soto')).toBeInTheDocument()
        })
        const nymLink = screen.getByRole('link', { name: 'NYM' })
        expect(nymLink).toHaveAttribute('href', '/roster?teamId=121&season=2024')
    })

    it('renders TOT row for multi-team seasons', async () => {
        vi.mocked(mlbApi.fetchPlayerCareerStats).mockResolvedValue(MULTI_TEAM_PLAYER)
        renderPlayerPage()
        await waitFor(() => {
            expect(screen.getByText('Juan Soto')).toBeInTheDocument()
        })
        expect(screen.getByText('TOT')).toBeInTheDocument()
        expect(screen.getByText('NYY')).toBeInTheDocument()
        expect(screen.getByText('SD')).toBeInTheDocument()
    })

    it('renders individual team splits as links in multi-team seasons', async () => {
        vi.mocked(mlbApi.fetchPlayerCareerStats).mockResolvedValue(MULTI_TEAM_PLAYER)
        renderPlayerPage()
        await waitFor(() => {
            expect(screen.getByText('Juan Soto')).toBeInTheDocument()
        })
        const nyyLink = screen.getByRole('link', { name: 'NYY' })
        expect(nyyLink).toHaveAttribute('href', '/roster?teamId=147&season=2023')
        const sdLink = screen.getByRole('link', { name: 'SD' })
        expect(sdLink).toHaveAttribute('href', '/roster?teamId=135&season=2023')
    })

    it('TOT is not a link', async () => {
        vi.mocked(mlbApi.fetchPlayerCareerStats).mockResolvedValue(MULTI_TEAM_PLAYER)
        renderPlayerPage()
        await waitFor(() => {
            expect(screen.getByText('TOT')).toBeInTheDocument()
        })
        expect(screen.queryByRole('link', { name: 'TOT' })).not.toBeInTheDocument()
    })
})
