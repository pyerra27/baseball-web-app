import type { ComponentProps } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import PlayerSearch from '../../features/search/PlayerSearch'
import * as mlbApi from '../../services/mlbApi'
import type { PlayerSearchResponse, PlayerSearchResult } from '../../models/mlb.models'

vi.mock('../../services/mlbApi', () => ({ searchPlayers: vi.fn() }))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AARON_JUDGE: PlayerSearchResult = {
    id: 592450,
    full_name: 'Aaron Judge',
    position_abbreviation: 'RF',
    position_type: 'Outfielder',
    active: true,
    debut_year: 2016,
    last_played_year: null,
}

const JOE_JUDGE: PlayerSearchResult = {
    id: 116786,
    full_name: 'Joe Judge',
    position_abbreviation: '1B',
    position_type: 'Infielder',
    active: false,
    debut_year: 1915,
    last_played_year: 1934,
}

const JUDGE_NAGLE: PlayerSearchResult = {
    id: 119639,
    full_name: 'Judge Nagle',
    position_abbreviation: 'P',
    position_type: 'Pitcher',
    active: false,
    debut_year: 1911,
    last_played_year: 1911,
}

const RESULTS = [AARON_JUDGE, JOE_JUDGE, JUDGE_NAGLE]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSearch(props: Partial<ComponentProps<typeof PlayerSearch>> = {}) {
    const onSelect = vi.fn()
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    })
    render(
        <QueryClientProvider client={queryClient}>
            <PlayerSearch label="Add player" onSelect={onSelect} {...props} />
        </QueryClientProvider>
    )
    return { onSelect, input: screen.getByRole('combobox') }
}

/** Leave the answer to one search hanging until the test resolves it. */
function holdSearch(heldQuery: string) {
    let resolve!: (response: PlayerSearchResponse) => void
    vi.mocked(mlbApi.searchPlayers).mockImplementation(query => (
        query === heldQuery
            ? new Promise(res => { resolve = res })
            : Promise.resolve({ query, players: RESULTS })
    ))
    return (response: PlayerSearchResponse) => resolve(response)
}

function optionNames() {
    return screen.getAllByRole('option').map(option => option.getAttribute('aria-label'))
}

beforeEach(() => {
    vi.mocked(mlbApi.searchPlayers).mockReset().mockImplementation(async query => ({ query, players: RESULTS }))
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlayerSearch searching', () => {
    it('waits for two characters before searching', async () => {
        const user = userEvent.setup()
        const { input } = renderSearch()

        await user.type(input, 'j')
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
        await user.type(input, 'u')
        await screen.findByRole('option', { name: /^Aaron Judge/ })

        expect(mlbApi.searchPlayers).toHaveBeenCalledTimes(1)
        expect(mlbApi.searchPlayers).toHaveBeenCalledWith('ju')
    })

    it('makes one request for text typed quickly', async () => {
        const user = userEvent.setup()
        const { input } = renderSearch()

        await user.type(input, 'judge')
        await screen.findByRole('option', { name: /^Aaron Judge/ })

        expect(mlbApi.searchPlayers).toHaveBeenCalledTimes(1)
        expect(mlbApi.searchPlayers).toHaveBeenCalledWith('judge')
    })

    it('trims and lowercases the text', async () => {
        const user = userEvent.setup()
        const { input } = renderSearch()

        await user.type(input, '  JUDGE ')
        await screen.findByRole('option', { name: /^Aaron Judge/ })

        expect(mlbApi.searchPlayers).toHaveBeenCalledWith('judge')
    })

    it('shows each player with their position and career years', async () => {
        const user = userEvent.setup()
        const { input } = renderSearch()

        await user.type(input, 'judge')
        const aaron = await screen.findByRole('option', { name: /^Aaron Judge/ })

        expect(optionNames()).toEqual([
            'Aaron Judge, RF, 2016–present',
            'Joe Judge, 1B, 1915–1934',
            'Judge Nagle, P, 1911',
        ])
        expect(within(aaron).getByText('Aaron Judge')).toBeInTheDocument()
        expect(within(aaron).getByText('RF')).toBeInTheDocument()
        expect(within(aaron).getByText('2016–present')).toBeInTheDocument()
    })

    it('shows a message while searching', async () => {
        const user = userEvent.setup()
        holdSearch('judge')
        const { input } = renderSearch()

        await user.type(input, 'judge')

        expect(screen.getByRole('status')).toHaveTextContent('Searching…')
    })

    it('says so when nothing matches', async () => {
        const user = userEvent.setup()
        vi.mocked(mlbApi.searchPlayers).mockResolvedValue({ query: 'zzqxv', players: [] })
        const { input } = renderSearch()

        await user.type(input, 'zzqxv')

        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No players found'))
    })

    it('shows an error when the search fails', async () => {
        const user = userEvent.setup()
        vi.mocked(mlbApi.searchPlayers).mockRejectedValue(new Error('Service Unavailable'))
        const { input } = renderSearch()

        await user.type(input, 'judge')

        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Search failed: Service Unavailable'))
        expect(mlbApi.searchPlayers).toHaveBeenCalledTimes(1)
    })

    it("doesn't show an unrelated search's players while the new one loads", async () => {
        const user = userEvent.setup()
        holdSearch('mart')
        const { input } = renderSearch()

        await user.type(input, 'judge')
        await screen.findByRole('option', { name: /^Aaron Judge/ })
        await user.clear(input)
        await user.type(input, 'mart')

        expect(screen.queryByRole('option')).not.toBeInTheDocument()
        await waitFor(() => expect(mlbApi.searchPlayers).toHaveBeenCalledWith('mart'))
        expect(screen.queryByRole('option')).not.toBeInTheDocument()
        expect(screen.getByRole('status')).toHaveTextContent('Searching…')
    })

    it('keeps the rows up while the text is extended', async () => {
        const user = userEvent.setup()
        holdSearch('judge')
        const { input } = renderSearch()

        await user.type(input, 'ju')
        await screen.findByRole('option', { name: /^Aaron Judge/ })
        await user.type(input, 'dge')
        await waitFor(() => expect(mlbApi.searchPlayers).toHaveBeenCalledWith('judge'))

        expect(screen.getByRole('option', { name: /^Aaron Judge/ })).toBeInTheDocument()
        expect(screen.getByRole('status')).toBeEmptyDOMElement()
    })
})

describe('PlayerSearch picking', () => {
    it('picks the top match with Enter', async () => {
        const user = userEvent.setup()
        const { input, onSelect } = renderSearch()

        await user.type(input, 'judge')
        await screen.findByRole('option', { name: /^Aaron Judge/ })
        await user.keyboard('{Enter}')

        expect(onSelect).toHaveBeenCalledExactlyOnceWith(AARON_JUDGE)
        expect(input).toHaveValue('')
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('moves the highlight with the arrow keys, wrapping at the ends', async () => {
        const user = userEvent.setup()
        const { input } = renderSearch()

        await user.type(input, 'judge')
        const aaron = await screen.findByRole('option', { name: /^Aaron Judge/ })
        const joe = screen.getByRole('option', { name: /^Joe Judge/ })
        const nagle = screen.getByRole('option', { name: /^Judge Nagle/ })
        expect(aaron).toHaveAttribute('aria-selected', 'true')
        expect(input).toHaveAttribute('aria-activedescendant', aaron.id)

        await user.keyboard('{ArrowDown}')
        expect(joe).toHaveAttribute('aria-selected', 'true')
        expect(aaron).toHaveAttribute('aria-selected', 'false')
        expect(input).toHaveAttribute('aria-activedescendant', joe.id)

        await user.keyboard('{ArrowUp}{ArrowUp}')
        expect(nagle).toHaveAttribute('aria-selected', 'true')

        await user.keyboard('{ArrowDown}')
        expect(aaron).toHaveAttribute('aria-selected', 'true')
    })

    it('picks the highlighted row with Enter', async () => {
        const user = userEvent.setup()
        const { input, onSelect } = renderSearch()

        await user.type(input, 'judge')
        await screen.findByRole('option', { name: /^Aaron Judge/ })
        await user.keyboard('{ArrowDown}{Enter}')

        expect(onSelect).toHaveBeenCalledExactlyOnceWith(JOE_JUDGE)
    })

    it('picks a row with a click and keeps focus in the input', async () => {
        const user = userEvent.setup()
        const { input, onSelect } = renderSearch()

        await user.type(input, 'judge')
        await user.click(await screen.findByRole('option', { name: /^Joe Judge/ }))

        expect(onSelect).toHaveBeenCalledExactlyOnceWith(JOE_JUDGE)
        expect(input).toHaveValue('')
        expect(input).toHaveFocus()
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it("doesn't let Enter pick from older rows until the new ones arrive", async () => {
        const user = userEvent.setup()
        const resolveSearch = holdSearch('judge')
        const { input, onSelect } = renderSearch()

        await user.type(input, 'ju')
        const aaron = await screen.findByRole('option', { name: /^Aaron Judge/ })
        await user.type(input, 'dge')
        await user.keyboard('{Enter}')
        expect(onSelect).not.toHaveBeenCalled()
        expect(aaron).toHaveAttribute('aria-selected', 'false')

        await waitFor(() => expect(mlbApi.searchPlayers).toHaveBeenCalledWith('judge'))
        resolveSearch({ query: 'judge', players: [JOE_JUDGE] })
        const joe = await screen.findByRole('option', { name: /^Joe Judge/ })
        await waitFor(() => expect(joe).toHaveAttribute('aria-selected', 'true'))
        await user.keyboard('{Enter}')

        expect(onSelect).toHaveBeenCalledExactlyOnceWith(JOE_JUDGE)
    })
})

describe('PlayerSearch disabled players', () => {
    it("marks a disabled player and doesn't let them be clicked", async () => {
        const user = userEvent.setup()
        const { input, onSelect } = renderSearch({ disabledIds: [AARON_JUDGE.id] })

        await user.type(input, 'judge')
        const aaron = await screen.findByRole('option', { name: /^Aaron Judge/ })
        expect(aaron).toHaveAttribute('aria-disabled', 'true')
        await user.click(aaron)

        expect(onSelect).not.toHaveBeenCalled()
        expect(input).toHaveValue('judge')
    })

    it('skips disabled players with the highlight', async () => {
        const user = userEvent.setup()
        const { input, onSelect } = renderSearch({ disabledIds: [AARON_JUDGE.id, JOE_JUDGE.id] })

        await user.type(input, 'judge')
        const nagle = await screen.findByRole('option', { name: /^Judge Nagle/ })
        expect(nagle).toHaveAttribute('aria-selected', 'true')
        await user.keyboard('{ArrowDown}{Enter}')

        expect(onSelect).toHaveBeenCalledExactlyOnceWith(JUDGE_NAGLE)
    })

    it('disables the input', () => {
        const { input } = renderSearch({ disabled: true, placeholder: 'Remove a player to add another' })
        expect(input).toBeDisabled()
        expect(input).toHaveAttribute('placeholder', 'Remove a player to add another')
    })
})

describe('PlayerSearch closing', () => {
    it('closes on Escape, then clears the text on a second Escape', async () => {
        const user = userEvent.setup()
        const { input } = renderSearch()

        await user.type(input, 'judge')
        await screen.findByRole('option', { name: /^Aaron Judge/ })

        await user.keyboard('{Escape}')
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
        expect(input).toHaveAttribute('aria-expanded', 'false')
        expect(input).toHaveValue('judge')

        await user.keyboard('{Escape}')
        expect(input).toHaveValue('')
    })

    it('reopens with an arrow key after Escape', async () => {
        const user = userEvent.setup()
        const { input } = renderSearch()

        await user.type(input, 'judge')
        await screen.findByRole('option', { name: /^Aaron Judge/ })
        await user.keyboard('{Escape}{ArrowDown}')

        expect(screen.getByRole('listbox')).toBeInTheDocument()
        expect(input).toHaveAttribute('aria-expanded', 'true')
    })

    it('closes when focus leaves the input', async () => {
        const user = userEvent.setup()
        const { input } = renderSearch()

        await user.type(input, 'judge')
        await screen.findByRole('option', { name: /^Aaron Judge/ })
        await user.tab()

        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
        expect(input).toHaveValue('judge')
    })
})

describe('PlayerSearch label', () => {
    it('shows the label by default', () => {
        renderSearch()
        expect(screen.getByText('Add player')).toBeInTheDocument()
        expect(screen.getByLabelText('Add player')).toBe(screen.getByRole('combobox'))
    })

    it('keeps a hidden label for screen readers only', () => {
        renderSearch({ label: 'Search players', hideLabel: true })
        expect(screen.queryByText('Search players')).not.toBeInTheDocument()
        expect(screen.getByRole('combobox', { name: 'Search players' })).toBeInTheDocument()
    })
})
