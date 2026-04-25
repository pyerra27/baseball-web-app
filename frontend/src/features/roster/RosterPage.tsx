import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { fetchTeams, fetchRoster } from '../../services/mlbApi'
import type { Player } from '../../models/mlb.models'
import { cn } from '@/lib/utils'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1899 }, (_, i) => CURRENT_YEAR - i)

const SELECT_ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`
const selectStyle = { backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }

const selectClass = [
    'appearance-none min-w-[220px] px-3 py-2 pr-10 rounded-md text-[0.95rem] font-[inherit] cursor-pointer',
    'bg-app-surface border border-app-border text-app-text',
    'transition-[border-color,box-shadow] duration-150',
    'focus:outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent-muted',
    'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ')

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
        <table className="w-full border-collapse text-sm">
            <thead>
                <tr>
                    <th className="w-12 text-left text-xs font-semibold tracking-[0.08em] uppercase text-app-muted px-3 pb-2.5 border-b border-app-border">#</th>
                    <th className="text-left text-xs font-semibold tracking-[0.08em] uppercase text-app-muted px-3 pb-2.5 border-b border-app-border">Name</th>
                    <th className="w-[4.5rem] text-right text-xs font-semibold tracking-[0.08em] uppercase text-app-muted px-3 pb-2.5 border-b border-app-border">
                        {isPitcher ? 'Role' : 'Pos'}
                    </th>
                </tr>
            </thead>
            <tbody>
                {players.map((player) => (
                    <tr key={player.id} className="group border-b border-app-border-subtle last:border-0">
                        <td className="px-3 py-2.5 align-middle tabular-nums text-app-muted group-hover:bg-app-surface-hover">
                            {player.jersey_number}
                        </td>
                        <td className="px-3 py-2.5 align-middle group-hover:bg-app-surface-hover">
                            <Link
                                to={`/player/${player.id}?season=${season}`}
                                className="text-app-text no-underline hover:text-app-accent hover:underline transition-colors duration-150"
                            >
                                {player.full_name}
                            </Link>
                        </td>
                        <td className="px-3 py-2.5 align-middle text-right group-hover:bg-app-surface-hover">
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
        <div className="flex flex-col gap-8 max-w-[1100px] mx-auto p-8">

            <div className="border-l-4 border-app-accent pl-4">
                <h1 className="font-display text-[2rem] font-extrabold tracking-[-0.02em] text-app-text mb-1">
                    Team Roster
                </h1>
                <p className="text-app-muted text-[0.95rem] m-0">
                    Select a team and season to view the full roster.
                </p>
            </div>

            <div className="flex flex-wrap gap-6">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="season-select" className="text-xs font-semibold tracking-[0.08em] uppercase text-app-muted">
                        Season
                    </label>
                    <select
                        id="season-select"
                        className={selectClass}
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
                    <label htmlFor="team-select" className="text-xs font-semibold tracking-[0.08em] uppercase text-app-muted">
                        Team
                    </label>
                    <select
                        id="team-select"
                        className={selectClass}
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
                <div className="bg-app-error-bg border border-app-error-border rounded-md text-red-400 px-4 py-3 text-sm">
                    Failed to load teams: {(teamsQuery.error as Error).message}
                </div>
            )}

            {rosterQuery.isFetching && (
                <div className="flex items-center gap-3 text-app-muted text-[0.95rem] py-8">
                    <Loader2 className="size-4 animate-spin text-app-accent" />
                    Loading roster…
                </div>
            )}

            {rosterQuery.isError && (
                <div className="bg-app-error-bg border border-app-error-border rounded-md text-red-400 px-4 py-3 text-sm">
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
                            <h2 className="flex items-center gap-2 font-display text-[1.1rem] font-bold tracking-[0.03em] uppercase mb-4 text-app-text">
                                <span>🧢</span> Position Players
                            </h2>
                            <PlayerTable players={rosterQuery.data.position_players} isPitcher={false} season={season} />
                        </section>

                        <section>
                            <h2 className="flex items-center gap-2 font-display text-[1.1rem] font-bold tracking-[0.03em] uppercase mb-4 text-app-text">
                                <span>⚾</span> Pitchers
                            </h2>
                            <PlayerTable players={rosterQuery.data.pitchers} isPitcher={true} season={season} />
                        </section>
                    </div>
                </div>
            )}

            {!rosterQuery.data && !rosterQuery.isFetching && !rosterQuery.isError && teamId === null && (
                <div className="text-center py-16 px-8 text-app-muted text-base border-2 border-dashed border-app-border rounded-xl">
                    Select a season and team above to load the roster.
                </div>
            )}

        </div>
    )
}
