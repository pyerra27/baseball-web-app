import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTeams, fetchRoster } from '../../services/mlbApi'
import type { Player } from '../../models/mlb.models'
import './RosterPage.css'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1899 }, (_, i) => CURRENT_YEAR - i)

function PlayerTable({ players, isPitcher }: { players: Player[]; isPitcher: boolean }) {
    if (players.length === 0) {
        return (
            <div className="empty-section">
                No {isPitcher ? 'pitchers' : 'position players'} found.
            </div>
        )
    }
    return (
        <table className="player-table">
            <thead>
                <tr>
                    <th className="col-jersey">#</th>
                    <th className="col-name">Name</th>
                    <th className="col-pos">{isPitcher ? 'Role' : 'Pos'}</th>
                </tr>
            </thead>
            <tbody>
                {players.map((player) => (
                    <tr key={player.id} className="player-row">
                        <td className="col-jersey">{player.jersey_number}</td>
                        <td className="col-name">{player.full_name}</td>
                        <td className="col-pos">
                            <span className={`pos-badge ${isPitcher ? 'pos-badge--pitcher' : 'pos-badge--field'}`}>
                                {player.position_abbreviation}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

export default function RosterPage() {
    const [season, setSeason] = useState(CURRENT_YEAR)
    const [teamId, setTeamId] = useState<number | null>(null)

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
        <div className="roster-page">
            <div className="page-header">
                <h1 className="page-title">Team Roster</h1>
                <p className="page-subtitle">Select a team and season to view the full roster.</p>
            </div>

            <div className="selectors">
                <div className="selector-group">
                    <label className="selector-label" htmlFor="season-select">Season</label>
                    <select
                        id="season-select"
                        className="selector-input"
                        value={season}
                        onChange={handleSeasonChange}
                        disabled={teamsQuery.isFetching}
                    >
                        {YEARS.map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                <div className="selector-group">
                    <label className="selector-label" htmlFor="team-select">Team</label>
                    <select
                        id="team-select"
                        className="selector-input"
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
                <div className="error-banner">
                    Failed to load teams: {(teamsQuery.error as Error).message}
                </div>
            )}

            {rosterQuery.isFetching && (
                <div className="loading-state">
                    <span className="loading-spinner" />
                    Loading roster…
                </div>
            )}

            {rosterQuery.isError && (
                <div className="error-banner">
                    Failed to load roster: {(rosterQuery.error as Error).message}
                </div>
            )}

            {rosterQuery.data && !rosterQuery.isFetching && (
                <div className="roster-content">
                    <div className="roster-summary">
                        <span className="summary-chip">
                            <strong>{rosterQuery.data.position_players.length}</strong> Position Players
                        </span>
                        <span className="summary-divider">·</span>
                        <span className="summary-chip">
                            <strong>{rosterQuery.data.pitchers.length}</strong> Pitchers
                        </span>
                        <span className="summary-divider">·</span>
                        <span className="summary-chip">
                            <strong>{totalPlayers}</strong> Total
                        </span>
                    </div>

                    <div className="roster-columns">
                        <section className="roster-section">
                            <h2 className="section-title">
                                <span className="section-icon">🧢</span>
                                Position Players
                            </h2>
                            <PlayerTable players={rosterQuery.data.position_players} isPitcher={false} />
                        </section>

                        <section className="roster-section">
                            <h2 className="section-title">
                                <span className="section-icon">⚾</span>
                                Pitchers
                            </h2>
                            <PlayerTable players={rosterQuery.data.pitchers} isPitcher={true} />
                        </section>
                    </div>
                </div>
            )}

            {!rosterQuery.data && !rosterQuery.isFetching && !rosterQuery.isError && teamId === null && (
                <div className="empty-prompt">
                    Select a season and team above to load the roster.
                </div>
            )}
        </div>
    )
}
