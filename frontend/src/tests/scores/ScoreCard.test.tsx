import '@testing-library/jest-dom'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ScoresTicker from '../../features/scores/ScoreCard'
import * as mlbApi from '../../services/mlbApi'
import type { ScoresResponse } from '../../models/mlb.models'

vi.mock('../../services/mlbApi', () => ({
    fetchScores: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SCORES_RESPONSE: ScoresResponse = {
    date: '2024-04-14',
    games: [
        {
            game_pk: 717465,
            game_date: '2024-04-14T20:05:00Z',
            status: 'Final',
            away: { team_id: 147, team_name: 'New York Yankees', abbreviation: 'NYY', score: 5, is_winner: true },
            home: { team_id: 111, team_name: 'Boston Red Sox', abbreviation: 'BOS', score: 3, is_winner: false },
        },
        {
            game_pk: 717466,
            game_date: '2024-04-14T23:05:00Z',
            status: 'Final',
            away: { team_id: 119, team_name: 'Los Angeles Dodgers', abbreviation: 'LAD', score: 4, is_winner: true },
            home: { team_id: 137, team_name: 'San Francisco Giants', abbreviation: 'SF', score: 2, is_winner: false },
        },
    ],
}

const EMPTY_RESPONSE: ScoresResponse = { date: '2024-04-14', games: [] }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderScoresTicker() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    })
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <ScoresTicker />
            </MemoryRouter>
        </QueryClientProvider>
    )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ScoresTicker', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the section heading immediately', () => {
        vi.mocked(mlbApi.fetchScores).mockReturnValue(new Promise(() => {}))
        renderScoresTicker()
        expect(screen.getByText(/yesterday's scores/i)).toBeInTheDocument()
    })

    it('renders a card for each game after data loads', async () => {
        vi.mocked(mlbApi.fetchScores).mockResolvedValue(SCORES_RESPONSE)
        renderScoresTicker()
        await waitFor(() => expect(screen.getByText('NYY')).toBeInTheDocument())
        expect(screen.getByText('BOS')).toBeInTheDocument()
        expect(screen.getByText('LAD')).toBeInTheDocument()
        expect(screen.getByText('SF')).toBeInTheDocument()
    })

    it('renders scores for each team', async () => {
        vi.mocked(mlbApi.fetchScores).mockResolvedValue(SCORES_RESPONSE)
        renderScoresTicker()
        await waitFor(() => expect(screen.getByText('NYY')).toBeInTheDocument())
        expect(screen.getAllByText('5').length).toBeGreaterThan(0)
        expect(screen.getAllByText('3').length).toBeGreaterThan(0)
    })

    it('renders the game status on each card', async () => {
        vi.mocked(mlbApi.fetchScores).mockResolvedValue(SCORES_RESPONSE)
        renderScoresTicker()
        await waitFor(() => expect(screen.getByText('NYY')).toBeInTheDocument())
        expect(screen.getAllByText('Final').length).toBe(2)
    })

    it('shows "No games played" when the games list is empty', async () => {
        vi.mocked(mlbApi.fetchScores).mockResolvedValue(EMPTY_RESPONSE)
        renderScoresTicker()
        await waitFor(() => expect(screen.getByText(/no games played/i)).toBeInTheDocument())
    })

    it('shows an error banner when the fetch fails', async () => {
        vi.mocked(mlbApi.fetchScores).mockRejectedValue(new Error('Network Error'))
        renderScoresTicker()
        await waitFor(() => expect(screen.getByText(/failed to load scores/i)).toBeInTheDocument())
    })

    it('each game card links to the game detail page', async () => {
        vi.mocked(mlbApi.fetchScores).mockResolvedValue(SCORES_RESPONSE)
        renderScoresTicker()
        await waitFor(() => expect(screen.getByText('NYY')).toBeInTheDocument())
        const hrefs = screen.getAllByRole('link').map(l => l.getAttribute('href'))
        expect(hrefs).toContain('/game/717465')
        expect(hrefs).toContain('/game/717466')
    })

    it('calls fetchScores without arguments to default to yesterday', async () => {
        vi.mocked(mlbApi.fetchScores).mockResolvedValue(SCORES_RESPONSE)
        renderScoresTicker()
        await waitFor(() => expect(mlbApi.fetchScores).toHaveBeenCalledWith())
    })
})
