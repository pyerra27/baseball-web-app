import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { fetchPlayerCareerStats } from '../../services/mlbApi'
import type { PlayerCareerStatsResponse } from '../../models/mlb.models'
import PlayerPicker from './PlayerPicker'
import ChartCard from './ChartCard'
import SeasonLineChart from './SeasonLineChart'
import {
    DEFAULT_STAT_KEY,
    GROUP_LABELS,
    STATS,
    availableGroups,
    bestSeason,
    defaultGroup,
    fillMissingSeasons,
    findStat,
    parseGroup,
    resolveRange,
    seasonValues,
} from './playerSeries'
import { slugify } from './download'
import styles from './ChartsPage.module.css'

type ParamChanges = Record<string, string | number | null>
type UpdateParams = (changes: ParamChanges, options?: { push?: boolean }) => void

function parseInteger(value: string | null): number | null {
    if (value === null || value.trim() === '') return null
    const number = Number(value)
    return Number.isInteger(number) ? number : null
}

/**
 * Charts one player's stat across a range of seasons.
 *
 * Everything that defines the chart lives in the URL, so a chart can be
 * shared or bookmarked: /charts?playerId=&group=&stat=&from=&to=
 */
export default function ChartsPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const playerId = parseInteger(searchParams.get('playerId'))

    const careerQuery = useQuery({
        queryKey: ['player-career-stats', playerId],
        queryFn: () => fetchPlayerCareerStats(playerId!),
        enabled: playerId !== null,
        // While a new player loads, keep showing the previous chart.
        placeholderData: keepPreviousData,
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

    function selectPlayer(id: number) {
        // Keep the chosen stat. The new player's career sets a new range.
        updateParams({ playerId: id, from: null, to: null }, { push: true })
    }

    return (
        <div className="page">
            <div className="accent-bar">
                <h1 className="page-title">Charts</h1>
                <p className="page-sub">Plot a player's stats season by season.</p>
            </div>

            <PlayerPicker selectedPlayerId={playerId} onSelect={selectPlayer} />

            {playerId === null && (
                <div className="empty-state">
                    Choose a season, team, and player to chart their stats.
                </div>
            )}

            {playerId !== null && careerQuery.isError && (
                <div className="error-box">
                    Failed to load player stats: {(careerQuery.error as Error).message}
                </div>
            )}

            {playerId !== null && careerQuery.isPending && (
                <div className="loading">
                    <Loader2 size={16} className="spinner" />
                    Loading stats…
                </div>
            )}

            {playerId !== null && careerQuery.data && !careerQuery.isError && (
                <PlayerChart
                    career={careerQuery.data}
                    searchParams={searchParams}
                    updateParams={updateParams}
                    stale={careerQuery.isPlaceholderData}
                />
            )}
        </div>
    )
}

interface PlayerChartProps {
    career: PlayerCareerStatsResponse
    searchParams: URLSearchParams
    updateParams: UpdateParams
    /** True while a different player's data is loading. */
    stale: boolean
}

function PlayerChart({ career, searchParams, updateParams, stale }: PlayerChartProps) {
    const groups = availableGroups(career)
    const workspaceClass = clsx(styles.workspace, stale && styles.stale)

    const header = (
        <div className={styles.playerHeader}>
            <h2 className={styles.playerName}>{career.full_name}</h2>
            {career.position_type && <span className={styles.position}>{career.position_type}</span>}
            <Link to={`/player/${career.player_id}`} className={styles.careerLink}>
                View career stats
            </Link>
        </div>
    )

    if (groups.length === 0) {
        return (
            <div className={workspaceClass}>
                {header}
                <div className="empty-state">No career statistics available.</div>
            </div>
        )
    }

    // Fall back to defaults when the URL names a group or stat this player doesn't have.
    const requestedGroup = parseGroup(searchParams.get('group'))
    const group = requestedGroup && groups.includes(requestedGroup) ? requestedGroup : defaultGroup(career, groups)
    const stat = findStat(group, searchParams.get('stat')) ?? findStat(group, DEFAULT_STAT_KEY[group])!

    const careerValues = seasonValues(career, stat)
    const seasons = careerValues.map(entry => entry.season)
    const [from, to] = resolveRange(
        seasons,
        parseInteger(searchParams.get('from')),
        parseInteger(searchParams.get('to')),
    )
    const inRange = careerValues.filter(entry => entry.season >= from && entry.season <= to)
    const range = from === to ? String(from) : `${from}–${to}`

    return (
        <div className={workspaceClass} aria-busy={stale}>
            {header}

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
                    <label htmlFor="chart-from-select" className="field-label">From</label>
                    <select
                        id="chart-from-select"
                        className={clsx('form-select', styles.yearSelect)}
                        value={from}
                        onChange={e => updateParams({ from: Number(e.target.value) })}
                    >
                        {seasons.filter(season => season <= to).map(season => (
                            <option key={season} value={season}>{season}</option>
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
                        {seasons.filter(season => season >= from).map(season => (
                            <option key={season} value={season}>{season}</option>
                        ))}
                    </select>
                </div>
            </div>

            <ChartCard
                title={stat.label}
                subtitle={`${career.full_name} · ${range}`}
                fileName={slugify(career.full_name, stat.label, range)}
                chart={
                    <SeasonLineChart
                        rows={fillMissingSeasons(inRange, from, to)}
                        stat={stat}
                        best={bestSeason(inRange, stat)}
                        title={`${stat.label} for ${career.full_name}, ${range}`}
                    />
                }
                columns={['Season', 'Team', stat.abbr]}
                rows={inRange.map(entry => [entry.season, entry.teams || '—', entry.display])}
                csvRows={[
                    ['Player', 'Season', 'Team', stat.abbr],
                    ...inRange.map(entry => [
                        career.full_name,
                        entry.season,
                        entry.teams,
                        entry.value === null ? '' : entry.display,
                    ]),
                ]}
            />
        </div>
    )
}
