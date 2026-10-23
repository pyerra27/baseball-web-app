import { useSearchParams } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { fetchPlayerCareerStats } from '../../services/mlbApi'
import type { PlayerCareerStatsResponse } from '../../models/mlb.models'
import PlayerPicker from './PlayerPicker'
import PlayerChips from './PlayerChips'
import type { ChipPlayer } from './PlayerChips'
import ChartCard from './ChartCard'
import SeasonChart from './SeasonChart'
import type { ChartKind, ChartSeries } from './SeasonChart'
import {
    DEFAULT_STAT_KEY,
    GROUPS,
    GROUP_LABELS,
    STATS,
    alignValues,
    availableGroups,
    defaultGroup,
    findStat,
    isCountingStat,
    parseAlign,
    parseGroup,
    resolveRange,
    runningTotals,
    seasonValues,
} from './playerSeries'
import { MAX_PLAYERS, addPlayer, formatPlayerSlots, parsePlayerSlots, removePlayer, seriesColor } from './playerSlots'
import { slugify } from './download'
import styles from './ChartsPage.module.css'

type ParamChanges = Record<string, string | number | null>
type UpdateParams = (changes: ParamChanges, options?: { push?: boolean }) => void

function parseInteger(value: string | null): number | null {
    if (value === null || value.trim() === '') return null
    const number = Number(value)
    return Number.isInteger(number) ? number : null
}

/** A player whose stats have loaded, with the color of their slot. */
interface LoadedPlayer {
    career: PlayerCareerStatsResponse
    color: string
}

/**
 * Charts one player's stat across a range of seasons, or compares up to
 * three players.
 *
 * Everything that defines the chart lives in the URL, so a chart can be
 * shared or bookmarked: /charts?players=&group=&stat=&show=&align=&from=&to=&chart=
 * `players` lists player ids by color slot; see playerSlots.
 */
export default function ChartsPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const slots = parsePlayerSlots(searchParams.get('players'))
    const entries = slots.flatMap((playerId, slot) => (playerId === null ? [] : [{ playerId, color: seriesColor(slot) }]))

    const queries = useQueries({
        queries: entries.map(({ playerId }) => ({
            queryKey: ['player-career-stats', playerId],
            queryFn: () => fetchPlayerCareerStats(playerId),
        })),
    })

    const updateParams: UpdateParams = (changes, options = {}) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev)
            for (const [key, value] of Object.entries(changes)) {
                if (value === null) next.delete(key)
                else next.set(key, String(value))
            }
            return next
        }, { replace: !options.push })
    }

    // Keep the chosen stat. A new set of players sets a new range.
    function addToChart(playerId: number) {
        updateParams({ players: formatPlayerSlots(addPlayer(slots, playerId)), from: null, to: null }, { push: true })
    }

    function removeFromChart(playerId: number) {
        updateParams({ players: formatPlayerSlots(removePlayer(slots, playerId)), from: null, to: null }, { push: true })
    }

    const chips: ChipPlayer[] = entries.map(({ playerId, color }, index) => {
        const { data, isError } = queries[index]
        if (data) return { status: 'ready', playerId, color, name: data.full_name, position: data.position_type }
        if (isError) return { status: 'error', playerId, color }
        return { status: 'loading', playerId, color }
    })
    const loaded: LoadedPlayer[] = entries.flatMap(({ color }, index) => {
        const career = queries[index].data
        return career ? [{ career, color }] : []
    })
    const failures = entries.flatMap(({ playerId }, index) => {
        const { data, isError, error } = queries[index]
        return isError && !data ? [{ playerId, message: (error as Error).message }] : []
    })
    const loading = queries.some(query => query.isPending)

    return (
        <div className="page">
            <div className="accent-bar">
                <h1 className="page-title">Charts</h1>
                <p className="page-sub">Plot a player's stats season by season, or compare up to three players.</p>
            </div>

            <PlayerPicker
                addedPlayerIds={entries.map(entry => entry.playerId)}
                canAdd={entries.length < MAX_PLAYERS}
                onAdd={addToChart}
            />

            {entries.length === 0 && (
                <div className="empty-state">
                    Choose a season, team, and player to chart their stats. Add up to three players to compare them.
                </div>
            )}

            {chips.length > 0 && <PlayerChips players={chips} onRemove={removeFromChart} />}

            {failures.map(failure => (
                <div key={failure.playerId} className="error-box">
                    Failed to load player stats: {failure.message}
                </div>
            ))}

            {loaded.length === 0 && loading && (
                <div className="loading">
                    <Loader2 size={16} className="spinner" />
                    Loading stats…
                </div>
            )}

            {loaded.length > 0 && (
                <PlayerChart
                    players={loaded}
                    searchParams={searchParams}
                    updateParams={updateParams}
                    stale={loading}
                />
            )}
        </div>
    )
}

/** Ways to draw the chart, offered beside Table on the chart card. */
const CHART_CHOICES: { value: ChartKind; label: string }[] = [
    { value: 'line', label: 'Line' },
    { value: 'bar', label: 'Bar' },
]

interface PlayerChartProps {
    /** Players whose stats have loaded, in slot order. */
    players: LoadedPlayer[]
    searchParams: URLSearchParams
    updateParams: UpdateParams
    /** True while another player's stats are still loading. */
    stale: boolean
}

/** The stat and range controls, and the chart card, for the loaded players. */
function PlayerChart({ players, searchParams, updateParams, stale }: PlayerChartProps) {
    const groups = GROUPS.filter(group => players.some(player => availableGroups(player.career).includes(group)))
    const workspaceClass = clsx(styles.workspace, stale && styles.stale)

    if (groups.length === 0) {
        return (
            <div className={workspaceClass} aria-busy={stale}>
                <div className="empty-state">No career statistics available.</div>
            </div>
        )
    }

    // Fall back to defaults when the URL names a group or stat no player has.
    // The first player with stats picks the default group.
    const lead = players.find(player => availableGroups(player.career).length > 0)!.career
    const requestedGroup = parseGroup(searchParams.get('group'))
    const group = requestedGroup && groups.includes(requestedGroup) ? requestedGroup : defaultGroup(lead, availableGroups(lead))
    const stat = findStat(group, searchParams.get('stat')) ?? findStat(group, DEFAULT_STAT_KEY[group])!
    const counting = isCountingStat(stat)
    const running = counting && searchParams.get('show') === 'total'
    const align = parseAlign(searchParams.get('align'))
    const byCareer = align === 'career'
    const kind: ChartKind = searchParams.get('chart') === 'bar' ? 'bar' : 'line'

    // A player with no seasons in the stat's group is left off the chart.
    const withValues = players.map(player => ({ ...player, values: seasonValues(player.career, stat) }))
    const charted = withValues.filter(player => player.values.length > 0)
    const missing = withValues.filter(player => player.values.length === 0)

    // The range covers every charted player's seasons, or career years.
    const xs = [...new Set(charted.flatMap(player => alignValues(player.values, align).map(point => point.x)))]
        .sort((a, b) => a - b)
    const [from, to] = resolveRange(xs, parseInteger(searchParams.get('from')), parseInteger(searchParams.get('to')))

    const series: ChartSeries[] = charted.map(({ career, color, values }) => ({
        id: career.player_id,
        name: career.full_name,
        color,
        points: alignValues(running ? runningTotals(values, stat) : values, align)
            .filter(point => point.x >= from && point.x <= to),
    }))

    const names = series.map(line => line.name).join(' vs. ')
    const span = from === to ? String(from) : `${from}–${to}`
    const range = byCareer ? `Career Year${from === to ? '' : 's'} ${span}` : span
    const xName = (x: number) => (byCareer ? `Year ${x}` : String(x))
    const title = running ? `Career ${stat.label}` : stat.label
    const valueHeader = running ? `Career ${stat.abbr}` : stat.abbr
    const table = chartTable(series, byCareer, valueHeader)

    return (
        <div className={workspaceClass} aria-busy={stale}>
            <div className="filter-row">
                <div className="form-field">
                    <label htmlFor="chart-stat-select" className="field-label">Stat</label>
                    <select
                        id="chart-stat-select"
                        className="form-select"
                        value={`${group}:${stat.key}`}
                        onChange={e => {
                            const [nextGroup, nextStat] = e.target.value.split(':')
                            updateParams({ group: nextGroup, stat: nextStat })
                        }}
                    >
                        {groups.map(option => (
                            <optgroup key={option} label={GROUP_LABELS[option]}>
                                {STATS[option].map(choice => (
                                    <option key={choice.key} value={`${option}:${choice.key}`}>
                                        {choice.label} ({choice.abbr})
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                <div className="form-field">
                    <label htmlFor="chart-show-select" className="field-label">Show</label>
                    {/* Rates such as AVG and ERA don't add up across seasons. */}
                    <select
                        id="chart-show-select"
                        className={clsx('form-select', styles.optionSelect)}
                        value={running ? 'total' : 'season'}
                        onChange={e => updateParams({ show: e.target.value === 'total' ? 'total' : null })}
                    >
                        <option value="season">Per season</option>
                        <option value="total" disabled={!counting}>Running total</option>
                    </select>
                </div>

                <div className="form-field">
                    <label htmlFor="chart-align-select" className="field-label">Align by</label>
                    {/* Seasons and career years are different units, so the range resets. */}
                    <select
                        id="chart-align-select"
                        className={clsx('form-select', styles.optionSelect)}
                        value={align}
                        onChange={e => updateParams({ align: e.target.value === 'career' ? 'career' : null, from: null, to: null })}
                    >
                        <option value="season">Season</option>
                        <option value="career">Career Year</option>
                    </select>
                </div>

                <div className="form-field">
                    <label htmlFor="chart-from-select" className="field-label">From</label>
                    <select
                        id="chart-from-select"
                        className={clsx('form-select', styles.yearSelect)}
                        value={from}
                        onChange={e => updateParams({ from: Number(e.target.value) })}
                    >
                        {xs.filter(x => x <= to).map(x => (
                            <option key={x} value={x}>{xName(x)}</option>
                        ))}
                    </select>
                </div>

                <div className="form-field">
                    <label htmlFor="chart-to-select" className="field-label">To</label>
                    <select
                        id="chart-to-select"
                        className={clsx('form-select', styles.yearSelect)}
                        value={to}
                        onChange={e => updateParams({ to: Number(e.target.value) })}
                    >
                        {xs.filter(x => x >= from).map(x => (
                            <option key={x} value={x}>{xName(x)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {missing.length > 0 && (
                <p className={styles.note}>
                    {missing
                        .map(player => `${player.career.full_name} has no ${GROUP_LABELS[group].toLowerCase()} stats.`)
                        .join(' ')}
                </p>
            )}

            <ChartCard
                title={title}
                subtitle={`${names} · ${range}`}
                fileName={slugify(names, title, range)}
                chart={
                    <SeasonChart
                        kind={kind}
                        series={series}
                        from={from}
                        to={to}
                        align={align}
                        stat={stat}
                        title={`${title} for ${names}, ${range}`}
                    />
                }
                chartChoices={{
                    options: CHART_CHOICES,
                    value: kind,
                    onChange: next => updateParams({ chart: next === 'bar' ? 'bar' : null }),
                }}
                columns={table.columns}
                rows={table.rows}
                valueColumns={series.length}
                csvRows={chartCsv(series, byCareer, valueHeader)}
            />
        </div>
    )
}

type Cell = string | number

/**
 * The table view. One player gets a row per season with the team. Two or
 * more get a row per season, or career year, with a column each.
 */
function chartTable(series: ChartSeries[], byCareer: boolean, valueHeader: string): { columns: string[]; rows: Cell[][] } {
    if (series.length === 1) {
        return {
            columns: [...(byCareer ? ['Year'] : []), 'Season', 'Team', valueHeader],
            rows: series[0].points.map(point => [
                ...(byCareer ? [point.x] : []),
                point.season,
                point.teams || '—',
                point.display,
            ]),
        }
    }

    const lookups = series.map(line => new Map(line.points.map(point => [point.x, point])))
    const xs = [...new Set(series.flatMap(line => line.points.map(point => point.x)))].sort((a, b) => a - b)
    return {
        columns: [byCareer ? 'Year' : 'Season', ...series.map(line => line.name)],
        rows: xs.map(x => [x, ...lookups.map(lookup => lookup.get(x)?.display ?? '—')]),
    }
}

/** The CSV download: one row per player and season, however many players there are. */
function chartCsv(series: ChartSeries[], byCareer: boolean, valueHeader: string): Cell[][] {
    return [
        ['Player', ...(byCareer ? ['Year'] : []), 'Season', 'Team', valueHeader],
        ...series.flatMap(line => line.points.map(point => [
            line.name,
            ...(byCareer ? [point.x] : []),
            point.season,
            point.teams,
            point.value === null ? '' : point.display,
        ])),
    ]
}
