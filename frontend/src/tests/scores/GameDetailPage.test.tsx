import '@testing-library/jest-dom'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import GameDetailPage from '../../features/scores/GameDetailPage'
import * as mlbApi from '../../services/mlbApi'
import type { BoxScoreResponse } from '../../models/mlb.models'

vi.mock('../../services/mlbApi', () => ({
    fetchBoxScore: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BATTER = {
    player_id: 660271,
    full_name: 'Juan Soto',
    position_abbreviation: 'LF',
    batting_order: 3,
    hitting: {
        at_bats: 4, runs: 1, hits: 2, doubles: 0, triples: 0,
        home_runs: 1, rbi: 2, base_on_balls: 1, strike_outs: 1, left_on_base: 2,
        avg: '.281',
    },
    pitching: null,
}

const PITCHER = {
    player_id: 592450,
    full_name: 'Gerrit Cole',
    position_abbreviation: 'SP',
    batting_order: null,
    hitting: null,
    pitching: {
        innings_pitched: '7.0', hits: 3, runs: 1, earned_runs: 1,
        base_on_balls: 1, strike_outs: 9, home_runs: 0, era: '2.50',
    },
}

const BOX_SCORE: BoxScoreResponse = {
    game_pk: 717465,
    game_date: '2024-04-15T20:05:00Z',
    status: 'Final',
    away: {
        team_id: 147,
        team_name: 'New York Yankees',
        abbreviation: 'NYY',
        score: 5,
        batters: [BATTER],
        pitchers: [PITCHER],
    },
    home: {
        team_id: 111,
        team_name: 'Boston Red Sox',
        abbreviation: 'BOS',
        score: 3,
        batters: [],
        pitchers: [],
    },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderGameDetailPage(gamePk = '717465') {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    })
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/game/${gamePk}`]}>
                <Routes>
                    <Route path="/game/:gamePk" element={<GameDetailPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GameDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('shows a loading spinner while the query is in flight', () => {
        vi.mocked(mlbApi.fetchBoxScore).mockReturnValue(new Promise(() => {}))
        renderGameDetailPage()
        expect(screen.getByText(/loading box score/i)).toBeInTheDocument()
    })

    it('renders a back button immediately', () => {
        vi.mocked(mlbApi.fetchBoxScore).mockReturnValue(new Promise(() => {}))
        renderGameDetailPage()
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })

    it('shows an error banner when the fetch fails', async () => {
        vi.mocked(mlbApi.fetchBoxScore).mockRejectedValue(new Error('Not Found'))
        renderGameDetailPage()
        await waitFor(() => expect(screen.getByText(/failed to load box score/i)).toBeInTheDocument())
    })

    it('renders the matchup header after data loads', async () => {
        vi.mocked(mlbApi.fetchBoxScore).mockResolvedValue(BOX_SCORE)
        renderGameDetailPage()
        await waitFor(() => expect(screen.getByText(/NYY/)).toBeInTheDocument())
        expect(screen.getByText(/BOS/)).toBeInTheDocument()
    })

    it('renders the game status', async () => {
        vi.mocked(mlbApi.fetchBoxScore).mockResolvedValue(BOX_SCORE)
        renderGameDetailPage()
        await waitFor(() => expect(screen.getByText('Final')).toBeInTheDocument())
    })

    it('renders both team names', async () => {
        vi.mocked(mlbApi.fetchBoxScore).mockResolvedValue(BOX_SCORE)
        renderGameDetailPage()
        await waitFor(() => expect(screen.getByText('New York Yankees')).toBeInTheDocument())
        expect(screen.getByText('Boston Red Sox')).toBeInTheDocument()
    })

    it('renders batter names in the batting table', async () => {
        vi.mocked(mlbApi.fetchBoxScore).mockResolvedValue(BOX_SCORE)
        renderGameDetailPage()
        await waitFor(() => expect(screen.getByText('Juan Soto')).toBeInTheDocument())
    })

    it('renders pitcher names in the pitching table', async () => {
        vi.mocked(mlbApi.fetchBoxScore).mockResolvedValue(BOX_SCORE)
        renderGameDetailPage()
        await waitFor(() => expect(screen.getByText('Gerrit Cole')).toBeInTheDocument())
    })

    it('batter name links to the player page with the correct season', async () => {
        vi.mocked(mlbApi.fetchBoxScore).mockResolvedValue(BOX_SCORE)
        renderGameDetailPage()
        await waitFor(() => expect(screen.getByText('Juan Soto')).toBeInTheDocument())
        const link = screen.getByRole('link', { name: 'Juan Soto' })
        expect(link).toHaveAttribute('href', '/player/660271?season=2024')
    })

    it('pitcher name links to the player page with the correct season', async () => {
        vi.mocked(mlbApi.fetchBoxScore).mockResolvedValue(BOX_SCORE)
        renderGameDetailPage()
        await waitFor(() => expect(screen.getByText('Gerrit Cole')).toBeInTheDocument())
        const link = screen.getByRole('link', { name: 'Gerrit Cole' })
        expect(link).toHaveAttribute('href', '/player/592450?season=2024')
    })

    it('renders batting stat column headers', async () => {
        vi.mocked(mlbApi.fetchBoxScore).mockResolvedValue(BOX_SCORE)
        renderGameDetailPage()
        await waitFor(() => expect(screen.getByText('Juan Soto')).toBeInTheDocument())
        expect(screen.getByText('AB')).toBeInTheDocument()
        expect(screen.getByText('RBI')).toBeInTheDocument()
        expect(screen.getByText('AVG')).toBeInTheDocument()
        expect(screen.getByText('LOB')).toBeInTheDocument()
    })

    it('renders pitching stat column headers', async () => {
        vi.mocked(mlbApi.fetchBoxScore).mockResolvedValue(BOX_SCORE)
        renderGameDetailPage()
        await waitFor(() => expect(screen.getByText('Gerrit Cole')).toBeInTheDocument())
        expect(screen.getByText('IP')).toBeInTheDocument()
        expect(screen.getByText('ERA')).toBeInTheDocument()
        expect(screen.getByText('ER')).toBeInTheDocument()
    })

    it('calls fetchBoxScore with the numeric gamePk from the URL', async () => {
        vi.mocked(mlbApi.fetchBoxScore).mockResolvedValue(BOX_SCORE)
        renderGameDetailPage('717465')
        await waitFor(() => expect(mlbApi.fetchBoxScore).toHaveBeenCalledWith(717465))
    })

    it('season in player links is derived from game_date year', async () => {
        const score2023 = { ...BOX_SCORE, game_date: '2023-09-01T20:05:00Z' }
        vi.mocked(mlbApi.fetchBoxScore).mockResolvedValue(score2023)
        renderGameDetailPage()
        await waitFor(() => expect(screen.getByText('Juan Soto')).toBeInTheDocument())
        const link = screen.getByRole('link', { name: 'Juan Soto' })
        expect(link).toHaveAttribute('href', '/player/660271?season=2023')
    })
})
