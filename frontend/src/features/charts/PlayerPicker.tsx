import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchRoster, fetchTeams } from '../../services/mlbApi'
import type { Player } from '../../models/mlb.models'
import { CURRENT_YEAR, SEASON_YEARS } from '../../utils/seasons'

function byName(a: Player, b: Player): number {
    return a.full_name.localeCompare(b.full_name)
}

interface PlayerPickerProps {
    selectedPlayerId: number | null
    onSelect: (playerId: number) => void
}

/**
 * Season, team, and player selects for choosing who to chart. Uses the
 * roster page's query keys, so teams and rosters come from the same cache.
 */
export default function PlayerPicker({ selectedPlayerId, onSelect }: PlayerPickerProps) {
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

    const roster = rosterQuery.data
    const positionPlayers = roster ? [...roster.position_players].sort(byName) : []
    const pitchers = roster ? [...roster.pitchers].sort(byName) : []
    const selectedIsListed = [...positionPlayers, ...pitchers].some(player => player.id === selectedPlayerId)

    let playerPrompt = 'Select a player'
    if (teamId === null) playerPrompt = 'Select a team first'
    else if (rosterQuery.isFetching) playerPrompt = 'Loading roster…'

    function handleSeasonChange(e: ChangeEvent<HTMLSelectElement>) {
        setSeason(Number(e.target.value))
        setTeamId(null)
    }

    return (
        <>
            <div className="filter-row">
                <div className="form-field">
                    <label htmlFor="chart-season-select" className="field-label">Season</label>
                    <select
                        id="chart-season-select"
                        className="form-select"
                        value={season}
                        onChange={handleSeasonChange}
                        disabled={teamsQuery.isFetching}
                    >
                        {SEASON_YEARS.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                <div className="form-field">
                    <label htmlFor="chart-team-select" className="field-label">Team</label>
                    <select
                        id="chart-team-select"
                        className="form-select"
                        value={teamId ?? ''}
                        onChange={e => setTeamId(Number(e.target.value))}
                        disabled={teamsQuery.isFetching || !teamsQuery.data?.length}
                    >
                        <option value="" disabled>
                            {teamsQuery.isFetching ? 'Loading teams…' : 'Select a team'}
                        </option>
                        {teamsQuery.data?.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-field">
                    <label htmlFor="chart-player-select" className="field-label">Player</label>
                    <select
                        id="chart-player-select"
                        className="form-select"
                        value={selectedIsListed ? String(selectedPlayerId) : ''}
                        onChange={e => onSelect(Number(e.target.value))}
                        disabled={!roster || rosterQuery.isFetching}
                    >
                        <option value="" disabled>{playerPrompt}</option>
                        {positionPlayers.length > 0 && (
                            <optgroup label="Position Players">
                                {positionPlayers.map(player => (
                                    <option key={player.id} value={player.id}>{player.full_name}</option>
                                ))}
                            </optgroup>
                        )}
                        {pitchers.length > 0 && (
                            <optgroup label="Pitchers">
                                {pitchers.map(player => (
                                    <option key={player.id} value={player.id}>{player.full_name}</option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                </div>
            </div>

            {teamsQuery.isError && (
                <div className="error-box">
                    Failed to load teams: {(teamsQuery.error as Error).message}
                </div>
            )}

            {rosterQuery.isError && (
                <div className="error-box">
                    Failed to load roster: {(rosterQuery.error as Error).message}
                </div>
            )}
        </>
    )
}
