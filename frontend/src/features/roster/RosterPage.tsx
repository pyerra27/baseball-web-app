import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { fetchTeams, fetchRoster } from '../../services/mlbApi'
import type { Player } from '../../models/mlb.models'
import { cn } from '@/lib/utils'
import ScoresTicker from '../scores/ScoreCard'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1899 }, (_, i) => CURRENT_YEAR - i)

const SELECT_ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`
const selectStyle = { backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }

function PosBadge({ isPitcher, abbr }: { isPitcher: boolean; abbr: string }) {
    return (
        <span className={cn(
            'inline-block px-2 py-0.5 rounded text-xs font-bold tracking-wider',
            isPitcher
                ? 'bg-app-badge-pitcher-bg text-app-badge-pitcher'
                : 'bg-app-badge-field-bg text-app-badge-field'
        )}>
            {abbr}
        </span>
    )
}

function PlayerTable({ players, isPitcher, season }: { players: Player[]; isPitcher: boolean; season: number }) {
    if (players.length === 0) {
        return (
            <div className="text-app-muted text-sm py-4">
                No {isPitcher ? 'pitchers' : 'position players'} found.
            </div>
        )
    }
    return (
        <table className="data-table">
            <thead>
                <tr>
                    <th className="th w-12">#</th>
                    <th className="th">Name</th>
                    <th className="th w-[4.5rem] text-right">
                        {isPitcher ? 'Role' : 'Pos'}
                    </th>
                </tr>
            </thead>
            <tbody>
                {players.map((player) => (
                    <tr key={player.id} className="group border-b border-app-border-subtle last:border-0">
                        <td className="roster-td tabular-nums text-app-muted">
                            {player.jersey_number}
                        </td>
                        <td className="roster-td">
                            <Link
                                to={`/player/${player.id}?season=${season}`}
                                className="app-link no-underline"
                            >
                                {player.full_name}
                            </Link>
                        </td>
                        <td className="roster-td text-right">
                            <PosBadge isPitcher={isPitcher} abbr={player.position_abbreviation} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

export default function RosterPage() {
    const [searchParams] = useSearchParams()
    const [season, setSeason] = useState(() => Number(searchParams.get('season')) || CURRENT_YEAR)
    const [teamId, setTeamId] = useState<number | null>(() => {
        const id = searchParams.get('teamId')
        return id ? Number(id) : null
    })

    const teamsQuery = useQuery({
        queryKey: ['teams', season],
        queryFn: () => fetchTeams(season),
    })

    const rosterQuery = useQuery({
        queryKey: ['roster', teamId, season],
        queryFn: () => fetchRoster(teamId!, season),
        enabled: teamId !== null,
    })

    const totalPlayers = useMemo(() => {
        if (!rosterQuery.data) return 0
        return rosterQuery.data.pitchers.length + rosterQuery.data.position_players.length
    }, [rosterQuery.data])

    function handleSeasonChange(e: React.ChangeEvent<HTMLSelectElement>) {
        setSeason(Number(e.target.value))
        setTeamId(null)
    }

    function handleTeamChange(e: React.ChangeEvent<HTMLSelectElement>) {
        setTeamId(Number(e.target.value))
    }

    return (
        <div className="page">

            <div className="accent-bar">
                <h1 className="page-title">Team Roster</h1>
                <p className="page-sub">Select a team and season to view the full roster.</p>
            </div>

            <ScoresTicker />

            <div className="flex flex-wrap gap-6">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="season-select" className="field-label">Season</label>
                    <select
                        id="season-select"
                        className="app-select"
                        style={selectStyle}
                        value={season}
                        onChange={handleSeasonChange}
                        disabled={teamsQuery.isFetching}
                    >
                        {YEARS.map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="team-select" className="field-label">Team</label>
                    <select
                        id="team-select"
                        className="app-select"
                        style={selectStyle}
                        value={teamId ?? ''}
                        onChange={handleTeamChange}
                        disabled={teamsQuery.isFetching || !teamsQuery.data?.length}
                    >
                        <option value="" disabled>
                            {teamsQuery.isFetching ? 'Loading teams…' : 'Select a team'}
                        </option>
                        {teamsQuery.data?.map((team) => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {teamsQuery.isError && (
                <div className="error-box">
                    Failed to load teams: {(teamsQuery.error as Error).message}
                </div>
            )}

            {rosterQuery.isFetching && (
                <div className="loading">
                    <Loader2 className="size-4 animate-spin text-app-accent" />
                    Loading roster…
                </div>
            )}

            {rosterQuery.isError && (
                <div className="error-box">
                    Failed to load roster: {(rosterQuery.error as Error).message}
                </div>
            )}

            {rosterQuery.data && !rosterQuery.isFetching && (
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3 flex-wrap text-sm text-app-muted pb-4 border-b border-app-border">
                        <span><strong className="text-app-text font-bold">{rosterQuery.data.position_players.length}</strong> Position Players</span>
                        <span className="text-app-border">·</span>
                        <span><strong className="text-app-text font-bold">{rosterQuery.data.pitchers.length}</strong> Pitchers</span>
                        <span className="text-app-border">·</span>
                        <span><strong className="text-app-text font-bold">{totalPlayers}</strong> Total</span>
                    </div>

                    <div className="grid grid-cols-2 gap-10 max-md:grid-cols-1">
                        <section>
                            <h2 className="section-heading flex items-center gap-2 mb-4">
                                <span>🧢</span> Position Players
                            </h2>
                            <PlayerTable players={rosterQuery.data.position_players} isPitcher={false} season={season} />
                        </section>

                        <section>
                            <h2 className="section-heading flex items-center gap-2 mb-4">
                                <span>⚾</span> Pitchers
                            </h2>
                            <PlayerTable players={rosterQuery.data.pitchers} isPitcher={true} season={season} />
                        </section>
                    </div>
                </div>
            )}

            {!rosterQuery.data && !rosterQuery.isFetching && !rosterQuery.isError && teamId === null && (
                <div className="empty-state">
                    Select a season and team above to load the roster.
                </div>
            )}

        </div>
    )
}
