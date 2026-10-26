import '@testing-library/jest-dom'

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import * as htmlToImage from 'html-to-image'
import ChartsPage from '../../features/charts/ChartsPage'
import * as mlbApi from '../../services/mlbApi'
import { CURRENT_YEAR } from '../../utils/seasons'
import type {
    HittingStats,
    PitchingStats,
    PlayerCareerStatsResponse,
    RosterResponse,
    Team,
} from '../../models/mlb.models'

vi.mock('../../services/mlbApi', () => ({
    fetchPlayerCareerStats: vi.fn(),
    fetchTeams: vi.fn(),
    fetchRoster: vi.fn(),
}))

vi.mock('html-to-image', () => ({ toPng: vi.fn() }))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function hitting(overrides: Partial<HittingStats> = {}): HittingStats {
    return {
        games_played: 150,
        plate_appearances: 640,
        at_bats: 560,
        runs: 95,
        hits: 160,
        doubles: 32,
        triples: 3,
        home_runs: 30,
        rbi: 98,
        stolen_bases: 12,
        base_on_balls: 70,
        avg: '.286',
        obp: '.370',
        slg: '.520',
        ops: '.890',
        ...overrides,
    }
}

function pitching(overrides: Partial<PitchingStats> = {}): PitchingStats {
    return {
        games_played: 32,
        games_started: 32,
        wins: 14,
        losses: 8,
        saves: 0,
        innings_pitched: '200.1',
        hits: 170,
        earned_runs: 70,
        base_on_balls: 50,
        strike_outs: 220,
        era: '3.15',
        whip: '1.10',
        ...overrides,
    }
}

// Newest first, as the API returns them. 2020 is a season with no stats.
const TROUT: PlayerCareerStatsResponse = {
    player_id: 545361,
    full_name: 'Mike Trout',
    position_type: 'Outfielder',
    seasons: [
        {
            season: 2022,
            splits: [{ team_id: 108, team_abbreviation: 'LAA', hitting: hitting({ home_runs: 40, avg: '.283' }), pitching: null }],
            totals: null,
        },
        {
            season: 2021,
            splits: [{ team_id: 108, team_abbreviation: 'LAA', hitting: hitting({ home_runs: 8, avg: '.333' }), pitching: null }],
            totals: null,
        },
        {
            season: 2019,
            splits: [{ team_id: 108, team_abbreviation: 'LAA', hitting: hitting({ home_runs: 45, avg: '.291' }), pitching: null }],
            totals: null,
        },
    ],
}

const TRADED_PLAYER: PlayerCareerStatsResponse = {
    player_id: 665742,
    full_name: 'Juan Soto',
    position_type: 'Outfielder',
    seasons: [
        {
            season: 2022,
            splits: [
                { team_id: 120, team_abbreviation: 'WSH', hitting: hitting({ home_runs: 21 }), pitching: null },
                { team_id: 135, team_abbreviation: 'SD', hitting: hitting({ home_runs: 6 }), pitching: null },
            ],
            totals: { team_id: null, team_abbreviation: 'TOT', hitting: hitting({ home_runs: 27 }), pitching: null },
        },
    ],
}

const PITCHER: PlayerCareerStatsResponse = {
    player_id: 543037,
    full_name: 'Gerrit Cole',
    position_type: 'Pitcher',
    seasons: [
        {
            season: 2024,
            splits: [{ team_id: 147, team_abbreviation: 'NYY', hitting: null, pitching: pitching({ strike_outs: 99 }) }],
            totals: null,
        },
        {
            season: 2019,
            splits: [{ team_id: 117, team_abbreviation: 'HOU', hitting: hitting({ home_runs: 0 }), pitching: pitching({ strike_outs: 326 }) }],
            totals: null,
        },
    ],
}

const NO_STATS_PLAYER: PlayerCareerStatsResponse = {
    player_id: 999,
    full_name: 'Unknown Player',
    position_type: 'Outfielder',
    seasons: [],
}

// Debuted before Trout's first season here, so a comparison spans 2017–2022.
const JUDGE: PlayerCareerStatsResponse = {
    player_id: 592450,
    full_name: 'Aaron Judge',
    position_type: 'Outfielder',
    seasons: [
        {
            season: 2022,
            splits: [{ team_id: 147, team_abbreviation: 'NYY', hitting: hitting({ home_runs: 62 }), pitching: null }],
            totals: null,
        },
        {
            season: 2017,
            splits: [{ team_id: 147, team_abbreviation: 'NYY', hitting: hitting({ home_runs: 52 }), pitching: null }],
            totals: null,
        },
    ],
}

const ANGELS: Team = {
    id: 108,
    name: 'Los Angeles Angels',
    abbreviation: 'LAA',
    team_name: 'Angels',
    location_name: 'Anaheim',
    league_id: 103,
    league_name: 'American League',
    division_id: 200,
    division_name: 'American League West',
}

const ANGELS_ROSTER: RosterResponse = {
    team_id: 108,
    season: CURRENT_YEAR,
    pitchers: [],
    position_players: [
        {
            id: 545361,
            full_name: 'Mike Trout',
            jersey_number: '27',
            position_code: '8',
            position_name: 'Outfielder',
            position_abbreviation: 'CF',
            position_type: 'Outfielder',
        },
    ],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Renders the current query string so tests can check what the page wrote
 * to the URL. Decoded, so the players list reads "1,2" rather than "1%2C2".
 */
function LocationProbe() {
    const location = useLocation()
    return <div data-testid="location">{decodeURIComponent(location.search)}</div>
}

function renderChartsPage(search = '') {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    })
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/charts${search}`]}>
                <Routes>
                    <Route
                        path="/charts"
                        element={
                            <>
                                <ChartsPage />
                                <LocationProbe />
                            </>
                        }
                    />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    )
}

/** Serve these careers by id. Any other id fails as Not Found. */
function serveCareers(careers: PlayerCareerStatsResponse[]) {
    vi.mocked(mlbApi.fetchPlayerCareerStats).mockImplementation(async id => {
        const career = careers.find(entry => entry.player_id === id)
        if (!career) throw new Error('Not Found')
        return career
    })
}

/** Put players on the chart through the URL, in slot order, and wait for their chips. */
async function renderPlayers(careers: PlayerCareerStatsResponse[], extraSearch = '') {
    serveCareers(careers)
    renderChartsPage(`?players=${careers.map(career => career.player_id).join(',')}${extraSearch}`)
    for (const career of careers) {
        await screen.findByRole('button', { name: `Remove ${career.full_name}` })
    }
}

async function renderPlayer(career: PlayerCareerStatsResponse, extraSearch = '') {
    await renderPlayers([career], extraSearch)
}

function readBlobText(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsText(blob)
    })
}

function tableRows(): (string | null)[][] {
    return screen
        .getAllByRole('row')
        .slice(1)
        .map(row => within(row).getAllByRole('cell').map(cell => cell.textContent))
}

function optionLabels(select: HTMLElement): (string | null)[] {
    return within(select).getAllByRole('option').map(option => option.textContent)
}

const objectUrlBlobs: Blob[] = []
const anchorClicks: { href: string; download: string }[] = []

beforeAll(() => {
    // jsdom has no object URLs. These stay defined for the whole file
    // because CSV downloads revoke their URL on a timer.
    Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: (blob: Blob) => {
            objectUrlBlobs.push(blob)
            return 'blob:mock'
        },
    })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => {} })
    // Record download clicks instead of letting jsdom try to navigate.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        anchorClicks.push({ href: this.getAttribute('href') ?? '', download: this.download })
    })
})

beforeEach(() => {
    vi.mocked(mlbApi.fetchPlayerCareerStats).mockReset()
    vi.mocked(mlbApi.fetchTeams).mockReset().mockResolvedValue([ANGELS])
    vi.mocked(mlbApi.fetchRoster).mockReset().mockResolvedValue(ANGELS_ROSTER)
    vi.mocked(htmlToImage.toPng).mockReset()
    objectUrlBlobs.length = 0
    anchorClicks.length = 0
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChartsPage', () => {
    it('asks for a player when none is selected', async () => {
        renderChartsPage()
        expect(screen.getByText(/choose a season, team, and player/i)).toBeInTheDocument()
        await screen.findByRole('option', { name: 'Los Angeles Angels' })
        expect(mlbApi.fetchPlayerCareerStats).not.toHaveBeenCalled()
    })

    it('charts home runs over the whole career for a hitter in the URL', async () => {
        await renderPlayer(TROUT)
        expect(mlbApi.fetchPlayerCareerStats).toHaveBeenCalledWith(545361)
        expect(screen.getByRole('heading', { name: 'Home Runs' })).toBeInTheDocument()
        expect(screen.getByText('Mike Trout · 2019–2022')).toBeInTheDocument()
    })

    it('opens pitchers on strikeouts', async () => {
        await renderPlayer(PITCHER)
        expect(screen.getByRole('heading', { name: 'Strikeouts' })).toBeInTheDocument()
    })

    it('offers pitching and hitting stats to a pitcher who batted', async () => {
        await renderPlayer(PITCHER)
        const stat = screen.getByLabelText('Stat')
        expect(within(stat).getByRole('group', { name: 'Hitting' })).toBeInTheDocument()
        expect(within(stat).getByRole('group', { name: 'Pitching' })).toBeInTheDocument()
    })

    it('falls back to the default stat when the URL names one the player lacks', async () => {
        await renderPlayer(TROUT, '&group=pitching&stat=era')
        expect(screen.getByRole('heading', { name: 'Home Runs' })).toBeInTheDocument()
    })

    it('switches stats and records the choice in the URL', async () => {
        const user = userEvent.setup()
        await renderPlayer(TROUT)

        await user.selectOptions(screen.getByLabelText('Stat'), 'hitting:avg')

        expect(screen.getByRole('heading', { name: 'Batting Average' })).toBeInTheDocument()
        expect(screen.getByTestId('location')).toHaveTextContent('group=hitting&stat=avg')
    })

    it('offers only seasons with stats and narrows the range', async () => {
        const user = userEvent.setup()
        await renderPlayer(TROUT)

        const from = screen.getByLabelText('From')
        expect(optionLabels(from)).toEqual(['2019', '2021', '2022'])

        await user.selectOptions(from, '2021')

        expect(screen.getByText('Mike Trout · 2021–2022')).toBeInTheDocument()
        expect(optionLabels(screen.getByLabelText('To'))).toEqual(['2021', '2022'])
        expect(screen.getByTestId('location')).toHaveTextContent('from=2021')
    })

    it('shows the seasons in range as a table', async () => {
        const user = userEvent.setup()
        await renderPlayer(TROUT)

        await user.click(screen.getByRole('button', { name: 'Table' }))

        expect(tableRows()).toEqual([
            ['2019', 'LAA', '45'],
            ['2021', 'LAA', '8'],
            ['2022', 'LAA', '40'],
        ])
    })

    it('uses the combined line for a season split between teams', async () => {
        const user = userEvent.setup()
        await renderPlayer(TRADED_PLAYER)

        await user.click(screen.getByRole('button', { name: 'Table' }))

        expect(tableRows()).toEqual([['2022', 'WSH / SD', '27']])
    })

    it('picks a player with the season, team, and player selects', async () => {
        const user = userEvent.setup()
        vi.mocked(mlbApi.fetchPlayerCareerStats).mockResolvedValue(TROUT)
        renderChartsPage()

        await screen.findByRole('option', { name: 'Los Angeles Angels' })
        await user.selectOptions(screen.getByLabelText('Team'), '108')
        await waitFor(() => expect(screen.getByLabelText('Add player')).toBeEnabled())
        await user.selectOptions(screen.getByLabelText('Add player'), '545361')

        expect(await screen.findByRole('heading', { name: 'Home Runs' })).toBeInTheDocument()
        expect(mlbApi.fetchRoster).toHaveBeenCalledWith(108, CURRENT_YEAR)
        expect(mlbApi.fetchPlayerCareerStats).toHaveBeenCalledWith(545361)
        expect(screen.getByTestId('location')).toHaveTextContent('players=545361')
    })

    it('shows an error when the stats fail to load', async () => {
        vi.mocked(mlbApi.fetchPlayerCareerStats).mockRejectedValue(new Error('Not Found'))
        renderChartsPage('?players=1')
        expect(await screen.findByText(/failed to load player stats: not found/i)).toBeInTheDocument()
    })

    it('says so when the player has no stats', async () => {
        await renderPlayer(NO_STATS_PLAYER)
        expect(screen.getByText(/no career statistics available/i)).toBeInTheDocument()
    })

    it('downloads the seasons in range as CSV', async () => {
        const user = userEvent.setup()
        await renderPlayer(TROUT)

        await user.click(screen.getByRole('button', { name: 'Download CSV' }))

        expect(anchorClicks).toEqual([{ href: 'blob:mock', download: 'mike-trout-home-runs-2019-2022.csv' }])
        expect(await readBlobText(objectUrlBlobs[0])).toBe(
            'Player,Season,Team,HR\r\n' +
            'Mike Trout,2019,LAA,45\r\n' +
            'Mike Trout,2021,LAA,8\r\n' +
            'Mike Trout,2022,LAA,40\r\n',
        )
    })

    it('downloads the chart card as a PNG', async () => {
        const user = userEvent.setup()
        vi.mocked(htmlToImage.toPng).mockResolvedValue('data:image/png;base64,AAAA')
        await renderPlayer(TROUT)

        await user.click(screen.getByRole('button', { name: 'Download PNG' }))

        await waitFor(() => expect(anchorClicks).toHaveLength(1))
        expect(anchorClicks[0]).toEqual({
            href: 'data:image/png;base64,AAAA',
            download: 'mike-trout-home-runs-2019-2022.png',
        })
        const card = screen.getByRole('region', { name: 'Home Runs' })
        expect(htmlToImage.toPng).toHaveBeenCalledWith(card, expect.objectContaining({ pixelRatio: 2 }))
    })

    it('shows an error when the image cannot be saved', async () => {
        const user = userEvent.setup()
        vi.mocked(htmlToImage.toPng).mockRejectedValue(new Error('canvas failed'))
        await renderPlayer(TROUT)

        await user.click(screen.getByRole('button', { name: 'Download PNG' }))

        expect(await screen.findByRole('alert')).toHaveTextContent(/could not save the image/i)
        expect(anchorClicks).toHaveLength(0)
    })
})

describe('ChartsPage comparing players', () => {
    it('charts two players from the URL with a legend', async () => {
        await renderPlayers([TROUT, JUDGE])
        const legend = screen.getByRole('list', { name: 'Legend' })
        expect(within(legend).getAllByRole('listitem').map(item => item.textContent)).toEqual(['Mike Trout', 'Aaron Judge'])
        expect(screen.getByText('Mike Trout vs. Aaron Judge · 2017–2022')).toBeInTheDocument()
    })

    it('adds a player with the picker', async () => {
        const user = userEvent.setup()
        serveCareers([JUDGE, TROUT])
        renderChartsPage('?players=592450')
        await screen.findByRole('button', { name: 'Remove Aaron Judge' })

        await screen.findByRole('option', { name: 'Los Angeles Angels' })
        await user.selectOptions(screen.getByLabelText('Team'), '108')
        await waitFor(() => expect(screen.getByLabelText('Add player')).toBeEnabled())
        await user.selectOptions(screen.getByLabelText('Add player'), '545361')

        expect(await screen.findByRole('button', { name: 'Remove Mike Trout' })).toBeInTheDocument()
        expect(screen.getByTestId('location')).toHaveTextContent('players=592450,545361')
    })

    it("doesn't offer a player who is already on the chart", async () => {
        const user = userEvent.setup()
        await renderPlayer(TROUT)

        await screen.findByRole('option', { name: 'Los Angeles Angels' })
        await user.selectOptions(screen.getByLabelText('Team'), '108')
        await waitFor(() => expect(screen.getByLabelText('Add player')).toBeEnabled())

        expect(screen.getByRole('option', { name: 'Mike Trout' })).toBeDisabled()
    })

    it('keeps the other players in their slots, and colors, when one is removed', async () => {
        const user = userEvent.setup()
        await renderPlayers([TROUT, JUDGE])

        await user.click(screen.getByRole('button', { name: 'Remove Mike Trout' }))

        expect(screen.getByTestId('location')).toHaveTextContent('players=,592450')
        expect(screen.queryByRole('button', { name: 'Remove Mike Trout' })).not.toBeInTheDocument()
        expect(screen.getByText('Aaron Judge · 2017–2022')).toBeInTheDocument()
        expect(document.querySelector('.recharts-line-dot')).toHaveAttribute('fill', 'var(--chart-series-2)')
    })

    it('stops adding players at three', async () => {
        await renderPlayers([TROUT, JUDGE, PITCHER])
        expect(screen.getByLabelText('Add player')).toBeDisabled()
        expect(screen.getByRole('option', { name: 'Remove a player to add another' })).toBeInTheDocument()
    })

    it('compares players in a table with a column each', async () => {
        const user = userEvent.setup()
        await renderPlayers([TROUT, JUDGE])

        await user.click(screen.getByRole('button', { name: 'Table' }))

        expect(screen.getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Season', 'Mike Trout', 'Aaron Judge'])
        expect(tableRows()).toEqual([
            ['2017', '—', '52'],
            ['2019', '45', '—'],
            ['2021', '8', '—'],
            ['2022', '40', '62'],
        ])
    })

    it('downloads every player-season as CSV', async () => {
        const user = userEvent.setup()
        await renderPlayers([TROUT, JUDGE])

        await user.click(screen.getByRole('button', { name: 'Download CSV' }))

        expect(anchorClicks).toEqual([{ href: 'blob:mock', download: 'mike-trout-vs-aaron-judge-home-runs-2017-2022.csv' }])
        expect(await readBlobText(objectUrlBlobs[0])).toBe(
            'Player,Season,Team,HR\r\n' +
            'Mike Trout,2019,LAA,45\r\n' +
            'Mike Trout,2021,LAA,8\r\n' +
            'Mike Trout,2022,LAA,40\r\n' +
            'Aaron Judge,2017,NYY,52\r\n' +
            'Aaron Judge,2022,NYY,62\r\n',
        )
    })

    it('lines players up by career year', async () => {
        const user = userEvent.setup()
        await renderPlayers([TROUT, JUDGE])

        await user.selectOptions(screen.getByLabelText('Align by'), 'career')

        expect(screen.getByTestId('location')).toHaveTextContent('align=career')
        expect(optionLabels(screen.getByLabelText('From'))).toEqual(['Year 1', 'Year 3', 'Year 4', 'Year 6'])
        expect(screen.getByText('Mike Trout vs. Aaron Judge · Career Years 1–6')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Table' }))

        expect(screen.getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Year', 'Mike Trout', 'Aaron Judge'])
        expect(tableRows()).toEqual([
            ['1', '45', '52'],
            ['3', '8', '—'],
            ['4', '40', '—'],
            ['6', '—', '62'],
        ])
    })

    it('shows career running totals for counting stats', async () => {
        const user = userEvent.setup()
        await renderPlayer(TROUT)

        await user.selectOptions(screen.getByLabelText('Show'), 'total')

        expect(screen.getByRole('heading', { name: 'Career Home Runs' })).toBeInTheDocument()
        expect(screen.getByTestId('location')).toHaveTextContent('show=total')

        await user.click(screen.getByRole('button', { name: 'Table' }))

        expect(screen.getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Season', 'Team', 'Career HR'])
        // Trout missed 2020, so his total carries through it.
        expect(tableRows()).toEqual([
            ['2019', 'LAA', '45'],
            ['2020', '—', '45'],
            ['2021', 'LAA', '53'],
            ['2022', 'LAA', '93'],
        ])
    })

    it('offers running totals only for counting stats', async () => {
        await renderPlayer(TROUT, '&group=hitting&stat=avg&show=total')
        expect(screen.getByRole('heading', { name: 'Batting Average' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Running total' })).toBeDisabled()
    })

    it('notes a player with no stats in the chosen group', async () => {
        await renderPlayers([TROUT, PITCHER], '&group=pitching&stat=strike_outs')
        expect(screen.getByText('Mike Trout has no pitching stats.')).toBeInTheDocument()
        expect(screen.getByText('Gerrit Cole · 2019–2024')).toBeInTheDocument()
    })

    it('still charts the other players when one fails to load', async () => {
        serveCareers([TROUT])
        renderChartsPage('?players=545361,1')

        expect(await screen.findByText(/failed to load player stats: not found/i)).toBeInTheDocument()
        expect(await screen.findByRole('heading', { name: 'Home Runs' })).toBeInTheDocument()
        expect(screen.getByText("Couldn't load player")).toBeInTheDocument()
    })
})

describe('ChartsPage line and bar charts', () => {
    function viewButtons() {
        return within(screen.getByRole('group', { name: 'View' })).getAllByRole('button')
    }

    function drawnBars() {
        return document.querySelectorAll('.recharts-bar-rectangle')
    }

    it('offers Line, Bar, and Table, starting on Line', async () => {
        await renderPlayer(TROUT)
        expect(viewButtons().map(button => button.textContent)).toEqual(['Line', 'Bar', 'Table'])
        expect(screen.getByRole('button', { name: 'Line' })).toHaveAttribute('aria-pressed', 'true')
        expect(drawnBars()).toHaveLength(0)
    })

    it('draws bars and records the choice in the URL', async () => {
        const user = userEvent.setup()
        await renderPlayer(TROUT)

        await user.click(screen.getByRole('button', { name: 'Bar' }))

        expect(screen.getByTestId('location')).toHaveTextContent('chart=bar')
        expect(screen.getByRole('button', { name: 'Bar' })).toHaveAttribute('aria-pressed', 'true')
        expect(drawnBars()).toHaveLength(3)
    })

    it('goes from the table back to the chart when Bar is picked', async () => {
        const user = userEvent.setup()
        await renderPlayer(TROUT)

        await user.click(screen.getByRole('button', { name: 'Table' }))
        expect(screen.getByRole('table')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Bar' }))

        expect(screen.queryByRole('table')).not.toBeInTheDocument()
        expect(drawnBars()).toHaveLength(3)
    })

    it('opens on bars when the URL asks for them', async () => {
        await renderPlayers([TROUT, JUDGE], '&chart=bar')
        expect(screen.getByRole('button', { name: 'Bar' })).toHaveAttribute('aria-pressed', 'true')
        expect(drawnBars()).toHaveLength(5)
    })
})
