import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router'

import NavPlayerSearch from '../../features/search/NavPlayerSearch'
import * as mlbApi from '../../services/mlbApi'

vi.mock('../../services/mlbApi', () => ({ searchPlayers: vi.fn() }))

function LocationProbe() {
    const location = useLocation()
    return <div data-testid="location">{location.pathname}</div>
}

describe('NavPlayerSearch', () => {
    it("opens the player's page when a result is picked", async () => {
        const user = userEvent.setup()
        vi.mocked(mlbApi.searchPlayers).mockResolvedValue({
            query: 'judge',
            players: [
                {
                    id: 592450,
                    full_name: 'Aaron Judge',
                    position_abbreviation: 'RF',
                    position_type: 'Outfielder',
                    active: true,
                    debut_year: 2016,
                    last_played_year: null,
                },
            ],
        })
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        })
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={['/charts']}>
                    <NavPlayerSearch />
                    <LocationProbe />
                </MemoryRouter>
            </QueryClientProvider>
        )

        await user.type(screen.getByRole('combobox', { name: 'Search players' }), 'judge')
        await user.click(await screen.findByRole('option', { name: /^Aaron Judge/ }))

        expect(screen.getByTestId('location')).toHaveTextContent('/player/592450')
    })
})
