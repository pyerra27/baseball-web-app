import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchRoster, fetchTeams } from '../../services/mlbApi'
import type { Player } from '../../models/mlb.models'
import { useSeasons } from '../../utils/seasons'

function byName(a: Player, b: Player): number {
    return a.full_name.localeCompare(b.full_name)
}

interface PlayerPickerProps {
    /** Players already on the chart. They can't be added again. */
    addedPlayerIds: number[]
    /** False once the chart is full. */
    canAdd: boolean
    onAdd: (playerId: number) => void
}

/**
 * Season, team, and player selects for adding players to the chart. Uses
 * the roster page's query keys, so teams and rosters come from the same
 * cache. The player select resets after each pick, ready for the next.
 */
export default function PlayerPicker({ addedPlayerIds, canAdd, onAdd }: PlayerPickerProps) {
    const seasons = useSeasons()
    const [pickedSeason, setPickedSeason] = useState<number | null>(null)
    const [teamId, setTeamId] = useState<number | null>(null)

    // Until a season is picked, show the newest one the API accepts.
    const season = pickedSeason ?? seasons.current

    const teamsQuery = useQuery({
        queryKey: ['teams', season],
        queryFn: () => fetchTeams(season!),
        enabled: season !== undefined,
    })

    const rosterQuery = useQuery({
        queryKey: ['roster', teamId, season],
        queryFn: () => fetchRoster(teamId!, season!),
        enabled: teamId !== null && season !== undefined,
    })

    const roster = rosterQuery.data
    const positionPlayers = roster ? [...roster.position_players].sort(byName) : []
    const pitchers = roster ? [...roster.pitchers].sort(byName) : []

    let playerPrompt = 'Select a player'
    if (!canAdd) playerPrompt = 'Remove a player to add another'
    else if (teamId === null) playerPrompt = 'Select a team first'
    else if (rosterQuery.isFetching) playerPrompt = 'Loading roster…'

    function handleSeasonChange(e: ChangeEvent<HTMLSelectElement>) {
        setPickedSeason(Number(e.target.value))
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
                        value={season ?? ''}
                        onChange={handleSeasonChange}
                        disabled={seasons.isLoading || teamsQuery.isFetching}
                    >
                        {seasons.isLoading && <option value="">Loading…</option>}
                        {seasons.years.map(year => (
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
                    <label htmlFor="chart-player-select" className="field-label">Add player</label>
                    <select
                        id="chart-player-select"
                        className="form-select"
                        value=""
                        onChange={e => onAdd(Number(e.target.value))}
                        disabled={!canAdd || !roster || rosterQuery.isFetching}
                    >
                        <option value="" disabled>{playerPrompt}</option>
                        {positionPlayers.length > 0 && (
                            <optgroup label="Position Players">
                                {positionPlayers.map(player => (
                                    <option key={player.id} value={player.id} disabled={addedPlayerIds.includes(player.id)}>
                                        {player.full_name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                        {pitchers.length > 0 && (
                            <optgroup label="Pitchers">
                                {pitchers.map(player => (
                                    <option key={player.id} value={player.id} disabled={addedPlayerIds.includes(player.id)}>
                                        {player.full_name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                </div>
            </div>

            {seasons.error && (
                <div className="error-box">
                    Failed to load seasons: {seasons.error.message}
                </div>
            )}

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
