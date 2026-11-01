import PlayerSearch from '../search/PlayerSearch'

interface PlayerPickerProps {
    /** Players already on the chart. They can't be added again. */
    addedPlayerIds: number[]
    /** False once the chart is full. */
    canAdd: boolean
    onAdd: (playerId: number) => void
}

/**
 * Name search for adding players to the chart. The box clears after each
 * pick, ready for the next.
 */
export default function PlayerPicker({ addedPlayerIds, canAdd, onAdd }: PlayerPickerProps) {
    return (
        <div className="filter-row">
            <PlayerSearch
                label="Add player"
                placeholder={canAdd ? 'Search by name…' : 'Remove a player to add another'}
                disabled={!canAdd}
                disabledIds={addedPlayerIds}
                onSelect={player => onAdd(player.id)}
            />
        </div>
    )
}
