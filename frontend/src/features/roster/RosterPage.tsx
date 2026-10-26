import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { fetchTeams, fetchRoster } from '../../services/mlbApi'
import type { Player } from '../../models/mlb.models'
import clsx from 'clsx'
import ScoresTicker from '../scores/ScoreCard'
import { CURRENT_YEAR, SEASON_YEARS } from '../../utils/seasons'
import styles from './RosterPage.module.css'

function PosBadge({ isPitcher, abbr }: { isPitcher: boolean; abbr: string }) {
    return (
        <span className={clsx(styles.badge, isPitcher ? styles.pitcherBadge : styles.fielderBadge)}>
            {abbr}
        </span>
    )
}

function PlayerTable({ players, isPitcher, season }: { players: Player[]; isPitcher: boolean; season: number }) {
    if (players.length === 0) {
        return (
            <div className={styles.noPlayers}>
                No {isPitcher ? 'pitchers' : 'position players'} found.
            </div>
        )
    }
    return (
        <table className={clsx('data-table', styles.playerTable)}>
            <thead>
                <tr>
                    <th className={styles.numberHeader}>#</th>
                    <th>Name</th>
                    <th className={styles.positionHeader}>
                        {isPitcher ? 'Role' : 'Pos'}
                    </th>
                </tr>
            </thead>
            <tbody>
                {players.map((player) => (
                    <tr key={player.id}>
                        <td className={styles.jerseyNumber}>
                            {player.jersey_number}
                        </td>
                        <td>
                            <Link
                                to={`/player/${player.id}?season=${season}`}
                                className={clsx('app-link', styles.playerLink)}
                            >
                                {player.full_name}
                            </Link>
                        </td>
                        <td className={styles.positionCell}>
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

            <div className="filter-row">
                <div className="form-field">
                    <label htmlFor="season-select" className="field-label">Season</label>
                    <select
                        id="season-select"
                        className="form-select"
                        value={season}
                        onChange={handleSeasonChange}
                        disabled={teamsQuery.isFetching}
                    >
                        {SEASON_YEARS.map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                <div className="form-field">
                    <label htmlFor="team-select" className="field-label">Team</label>
                    <select
                        id="team-select"
                        className="form-select"
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
                    <Loader2 size={16} className="spinner" />
                    Loading roster…
                </div>
            )}

            {rosterQuery.isError && (
                <div className="error-box">
                    Failed to load roster: {(rosterQuery.error as Error).message}
                </div>
            )}

            {rosterQuery.data && !rosterQuery.isFetching && (
                <div className={styles.roster}>
                    <div className={styles.summary}>
                        <span><strong>{rosterQuery.data.position_players.length}</strong> Position Players</span>
                        <span className={styles.separator}>·</span>
                        <span><strong>{rosterQuery.data.pitchers.length}</strong> Pitchers</span>
                        <span className={styles.separator}>·</span>
                        <span><strong>{totalPlayers}</strong> Total</span>
                    </div>

                    <div className={styles.columns}>
                        <section>
                            <h2 className={clsx('section-heading', styles.columnHeading)}>
                                <span>🧢</span> Position Players
                            </h2>
                            <PlayerTable players={rosterQuery.data.position_players} isPitcher={false} season={season} />
                        </section>

                        <section>
                            <h2 className={clsx('section-heading', styles.columnHeading)}>
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
